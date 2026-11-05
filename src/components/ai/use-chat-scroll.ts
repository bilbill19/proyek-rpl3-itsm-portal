'use client';

import { useEffect, useRef } from 'react';

/**
 * ============================================================================
 * useChatScroll — auto-scroll percakapan yang konsisten untuk Mimo & Miko
 * ============================================================================
 *
 * Perilaku:
 *  1. Pesan USER baru  → geser container ke bawah agar pesan user terlihat.
 *  2. Pesan AI baru    → tampilkan BAGIAN AWAL pesan AI (bukan akhir jawaban)
 *                        sehingga jawaban panjang dibaca dari kalimat pertama.
 *  3. Pengguna yang sedang membaca (scroll menjauh dari bawah > 120px) TIDAK
 *     diganggu — tanpa auto-scroll sama sekali sampai ia kembali ke bawah.
 *  4. Hanya container chat yang digeser lewat `scrollTop` — halaman utama
 *     (window) tidak pernah ikut bergeser.
 *  5. Efek bergantung pada JUMLAH pesan saja — muncul/hilangnya indikator
 *     loading, percobaan ulang, atau pembaruan state lain TIDAK memicu
 *     lompatan scroll berulang.
 *  6. Scroll bersifat instan (tanpa animasi smooth) agar jawaban panjang
 *     langsung terlihat awalnya tanpa jeda animasi.
 *
 * Cara pakai: pasang `containerRef` pada div scrollable area percakapan,
 * dan beri atribut `data-chat-item` pada wrapper setiap bubble pesan.
 */

export function useChatScroll<T extends { role: string }>(
  messages: T[],
  /** Bila berubah (mis. activeConvId / ganti percakapan), posisi baca lama di-reset. */
  resetKey?: unknown
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(messages.length);
  const userReadingRef = useRef(false);
  /** Abaikan event scroll yang dipicu oleh scroll program milik hook ini. */
  const ignoreScrollUntilRef = useRef(0);

  // Ganti percakapan → lupakan kebiasaan "sedang membaca" dari percakapan lama.
  useEffect(() => {
    userReadingRef.current = false;
  }, [resetKey]);

  // Pantau niat pengguna: menjauhi dasar container = sedang membaca riwayat.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      // Scroll buatan hook sendiri tidak boleh dianggap "user membaca".
      if (Date.now() < ignoreScrollUntilRef.current) return;
      userReadingRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    // Elemen container wajib ada DAHULU; lastCountRef hanya dicatat bila kita
    // benar-benar memproses, agar komit tanpa container tidak "menelan" event.
    if (!el) return;
    const prev = lastCountRef.current;
    lastCountRef.current = messages.length;
    // Sama banyak (bukan penambahan) → tidak ada yang perlu digeser.
    if (messages.length === prev) return;
    // Percakapan diganti/dibersihkan (ganti percakapan, mulai ulang, hapus
    // pesan error) → lupakan kebiasaan "sedang membaca" dari posisi lama.
    if (messages.length < prev) userReadingRef.current = false;
    // Percakapan kosong (percakapan baru/dihapus) → tidak ada target.
    if (messages.length === 0) return;

    const lastRole = (messages[messages.length - 1]?.role || '').toUpperCase();
    const isUser = lastRole === 'USER';

    // AI menjawab sedangkan pengguna membaca ke atas → jangan pindahkan tampilan.
    if (!isUser && userReadingRef.current) return;

    ignoreScrollUntilRef.current = Date.now() + 250;

    if (isUser) {
      // Pesan user baru: pastikan pesan user terlihat (posisi terbawah).
      el.scrollTop = el.scrollHeight;
      return;
    }

    // Jawaban AI baru: tampilkan AWAL bubble AI (sedikit di bawah tepi atas).
    const items = el.querySelectorAll<HTMLElement>('[data-chat-item]');
    const target = items[items.length - 1];
    if (!target) return;
    const delta = target.getBoundingClientRect().top - el.getBoundingClientRect().top;
    el.scrollTop = Math.max(0, el.scrollTop + delta - 8);
  }, [messages]);

  return { containerRef };
}
