/**
 * Dispatcher Transactional Outbox WhatsApp (P5).
 *
 * Prinsip:
 * - Baris outbox dibuat DALAM transaksi update status (bareng notifikasi),
 *   tetapi pengiriman berlangsung DI LUAR transaksi → kegagalan WhatsApp
 *   tidak pernah merusak pesanan/notifikasi.
 * - Idempotensi: klaim atomik `status: pending → processing` per baris
 *   (updateMany bersyarat) — proses paralel tidak bisa memproses baris yang
 *   sama; pengulangan tidak menggandakan kiriman (timeout = TIDAK di-retry).
 * - SIMULATION: tanpa HTTP apa pun; mencatat riwayat `mode=simulation,
 *   status=simulated` (TIDAK pernah `sent`) — preview internal admin.
 * - LIVE: butuh saklar ON + kredensial provider valid (registry getProvider:
 *   'meta' default / 'fonnte') + OPT-IN customer
 *   (notification_preferences.channel='whatsapp') + nomor valid; pesan Meta
 *   memakai template resmi (harus APPROVED, 3 parameter), Fonnte memakai teks.
 * - Retry terbatas (3 percobaan, backoff 30s/2m/5m) hanya untuk galat jaringan.
 *
 * Dispatcher dipicu: (1) fire-and-forget setelah commit update status,
 * (2) throttle dari polling GET /api/notifications (menangkap baris tertinggal).
 */
import prisma from '@/lib/prisma';
import { getLiveConfig, getWhatsappConfig, normalizePhone, type WhatsappConfig } from './env';
import { buildOrderStatusMessage } from './templates';
import { getProvider } from './providers';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [30_000, 120_000, 300_000];

interface OutboxRow {
  id: string;
  eventType: string;
  payload: string;
  attempts: number;
}

let running: Promise<{ processed: number }> | null = null;
let lastKickAt = 0;

/** Picu proses outbox (single-flight + throttle 3 detik). Tidak pernah melempar. */
export function kickWhatsappOutbox(): void {
  const now = Date.now();
  if (running || now - lastKickAt < 3000) return;
  lastKickAt = now;
  running = processOutbox()
    .catch((e) => {
      console.error('[wa-outbox] proses gagal:', e instanceof Error ? e.message : 'unknown');
      return { processed: 0 };
    })
    .finally(() => {
      running = null;
    });
}

/** Proses baris outbox yang jatuh tempo. Aman dipanggil berulang. */
export async function processOutbox(): Promise<{ processed: number }> {
  const cfg = getWhatsappConfig();
  const now = new Date();
  // Baris 'processing' yang tua (>5 menit, attempts < MAX) dianggap yatim
  // (proses mati di tengah jalan — mis. server restart) dan diambil kembali.
  const staleBefore = new Date(now.getTime() - 5 * 60_000);
  const due = await prisma.notificationOutbox.findMany({
    where: {
      OR: [
        { status: 'pending', nextAttemptAt: { lte: now } },
        { status: 'processing', updatedAt: { lt: staleBefore }, attempts: { lt: MAX_ATTEMPTS } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  let processed = 0;
  for (const row of due) {
    // Klaim atomik: hanya satu pemproses yang boleh mengambil baris.
    const claim = await prisma.notificationOutbox.updateMany({
      where: {
        id: row.id,
        OR: [
          { status: 'pending' },
          { status: 'processing', updatedAt: { lt: staleBefore } },
        ],
      },
      data: { status: 'processing', attempts: { increment: 1 } },
    });
    if (claim.count !== 1) continue;
    // Jangan pernah tinggalkan baris 'processing' — galat tak terduga → status terminal.
    try {
      await handleRow(row, row.attempts + 1, cfg);
    } catch (e) {
      const msg = (e instanceof Error ? e.message : 'galat tidak dikenal').slice(0, 300);
      await prisma.notificationOutbox
        .update({ where: { id: row.id }, data: { status: 'failed', lastError: `Gagal memproses outbox: ${msg}` } })
        .catch(() => undefined);
    }
    processed++;
  }
  return { processed };
}

async function finish(row: OutboxRow, status: 'done' | 'failed', lastError: string | null): Promise<void> {
  await prisma.notificationOutbox.update({
    where: { id: row.id },
    data: { status, lastError },
  });
}

async function retryLater(row: OutboxRow, attemptNo: number, error: string): Promise<void> {
  const backoff = BACKOFF_MS[Math.min(attemptNo - 1, BACKOFF_MS.length - 1)];
  await prisma.notificationOutbox.update({
    where: { id: row.id },
    data: {
      status: 'pending',
      nextAttemptAt: new Date(Date.now() + backoff),
      lastError: error.slice(0, 500),
    },
  });
}

async function handleRow(row: OutboxRow, attemptNo: number, cfg: WhatsappConfig): Promise<void> {
  if (row.eventType !== 'order_status_whatsapp') {
    await finish(row, 'failed', `eventType tidak dikenal: ${row.eventType}`);
    return;
  }

  let payload: {
    orderId?: string;
    userId?: string;
    ticketNumber?: string;
    customerName?: string;
    phone?: string | null;
    status?: string;
  };
  try {
    payload = JSON.parse(row.payload);
  } catch {
    await finish(row, 'failed', 'Payload outbox bukan JSON valid.');
    return;
  }

  const message = buildOrderStatusMessage({
    templateName: cfg.templateName,
    customerName: payload.customerName || 'Pelanggan',
    ticketNumber: payload.ticketNumber || '-',
    status: payload.status || 'CREATED',
  });

  if (!payload.userId || !payload.orderId) {
    await finish(row, 'failed', 'Payload outbox tidak memiliki orderId/userId.');
    return;
  }

  // Subjek event wajib ada: akun bisa terhapus (cascade uji) → batal dengan jujur.
  const owner = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
  if (!owner) {
    await finish(row, 'failed', 'Akun asal event sudah tidak ada (terhapus) — kiriman dibatalkan.');
    return;
  }
  // Order bisa terhapus (cleanup uji) → preview tetap dicatat tanpa rujukan order.
  const orderAlive = await prisma.serviceOrder.findUnique({ where: { id: payload.orderId }, select: { id: true } });
  const orderId = orderAlive ? payload.orderId : null;

  // ---------- SIMULATION (default) — tanpa HTTP, tanpa klaim terkirim ----------
  if (!cfg.enabled || cfg.mode === 'simulation') {
    const to = normalizePhone(payload.phone) || '';
    await prisma.whatsAppDelivery.create({
      data: {
        orderId,
        userId: payload.userId!,
        toPhone: to || '-',
        templateName: message.templateName,
        mode: 'simulation',
        status: 'simulated',
        error: to ? null : 'Nomor belum tersedia — preview simulasi (tanpa kiriman).',
        attempts: attemptNo,
      },
    });
    await finish(row, 'done', null);
    return;
  }

  // ---------- LIVE — wajib persetujuan customer ----------
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_channel: { userId: payload.userId!, channel: 'whatsapp' } },
  });
  if (!pref?.enabled) {
    // Tanpa opt-in: TIDAK ada kiriman & TIDAK ada baris delivery (in-app tetap tampil).
    await finish(row, 'done', null);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId! },
    select: { phone: true },
  });
  const to = normalizePhone(payload.phone || user?.phone);
  if (!to) {
    // Nomor hilang/tidak valid → kegagalan permanen, dicatat jujur (bukan "sent").
    await prisma.whatsAppDelivery.create({
      data: {
        orderId,
        userId: payload.userId!,
        toPhone: '-',
        templateName: message.templateName,
        mode: 'live',
        status: 'failed',
        error: 'Nomor WhatsApp tidak valid atau belum diisi pelanggan.',
        attempts: attemptNo,
      },
    });
    await finish(row, 'failed', 'Nomor WhatsApp tidak valid/tidak diisi.');
    return;
  }

  const live = getLiveConfig();
  if (!live.ok) {
    // Kredensial/template belum siap → jangan coba-coba; admin perbaiki env dulu.
    await finish(row, 'failed', `LIVE ditolak: ${live.reason}`);
    return;
  }

  // Pemilihan provider lewat registry (default 'meta' = integrasi Cloud API
  // lama; 'fonnte' bila WHATSAPP_PROVIDER=fonnte). Kontrak send() identik —
  // opt-in, normalisasi, pencatatan delivery, dan retry TIDAK berubah.
  const provider = getProvider(cfg.provider);
  const res = await provider.send({
    to,
    text: message.previewText,
    templateName: message.templateName,
    params: message.params, // Meta: 3 parameter positional [nama, tiket, status]
  });
  await prisma.whatsAppDelivery.create({
    data: {
      orderId: payload.orderId,
      userId: payload.userId!,
      toPhone: to,
      templateName: message.templateName,
      mode: 'live',
      status: res.ok ? 'sent' : 'failed',
      providerMessageId: res.messageId,
      error: res.error,
      attempts: attemptNo,
    },
  });

  if (res.ok) {
    await finish(row, 'done', null);
  } else if (res.retryable && attemptNo < MAX_ATTEMPTS) {
    await retryLater(row, attemptNo, res.error || 'galat jaringan');
  } else {
    await finish(row, 'failed', res.error || 'Pengiriman gagal.');
  }
}
