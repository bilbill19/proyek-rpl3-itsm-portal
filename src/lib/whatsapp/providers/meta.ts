/**
 * Adapter provider META (WhatsApp Cloud API) — PEMBUNGKUS TIPIS.
 *
 * Seluruh logika lama (getLiveConfig, buildTemplateRequestBody 3 parameter,
 * klasifier error 131031, sanitasi token) tetap berada di meta.ts/env.ts
 * dan TIDAK diubah — provider default tetap Meta sehingga perilaku sistem
 * identik dengan sebelum adapter ada.
 */
import { sendTemplateMessage, type SendResult } from '../meta';
import type { ProviderSendInput, WhatsAppProvider } from './types';

export const metaProvider: WhatsAppProvider = {
  name: 'meta',
  async send(input: ProviderSendInput): Promise<SendResult> {
    // Validasi meta (token/phone-id/template) terjadi DI DALAM sendTemplateMessage
    // melalui getLiveConfig() — sama seperti sebelum adapter diperkenalkan.
    return sendTemplateMessage({ to: input.to, templateName: input.templateName, params: input.params });
  },
};
