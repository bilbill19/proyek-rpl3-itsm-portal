/**
 * Registry provider WhatsApp — titik pemilihan tunggal di dispatcher.
 *
 * DEFAULT = 'meta' (integrasi Cloud API lama; sama persis dengan perilaku
 * sebelum adapter ada). Fonnte aktif hanya bila WHATSAPP_PROVIDER=fonnte
 * di env server. Nama provider tak dikenal DITOLAK (bukan jatuh diam-diam
 * ke provider lain) — dan pada jalur produksi kasus ini mustahil tercapai
 * karena getLiveConfig() sudah menolak provider tak dikenal lebih dulu.
 */
import type { WhatsAppProvider } from './types';
import { metaProvider } from './meta';
import { fonnteProvider } from './fonnte';

export type { WhatsAppProvider, ProviderSendInput } from './types';

export function getProvider(name?: string | null): WhatsAppProvider {
  const key = (name || 'meta').trim().toLowerCase();
  if (key === 'fonnte') return fonnteProvider;
  if (key === 'meta') return metaProvider;
  throw new Error(`Provider WhatsApp tidak didukung: ${key} (didukung: meta, fonnte)`);
}
