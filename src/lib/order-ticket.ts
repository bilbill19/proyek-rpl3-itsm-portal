/** Retry a DB unique collision; the unique index remains the concurrency authority. */
export async function retryTicketCreate<T>(ticket: string, sequence: number, year: number,
  create: (candidate: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try { return await create(ticket); }
    catch (error: any) {
      const target = error?.meta?.target;
      if (error?.code !== 'P2002' || !Array.isArray(target) || !target.includes('ticketNumber') || attempt === 7) throw error;
      sequence++;
      ticket = `SRV-${year}-${String(sequence).padStart(4, '0')}`;
    }
  }
  throw new Error('Nomor tiket belum tersedia. Silakan ulangi.');
}
