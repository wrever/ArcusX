import { sendResendMail, resendConfigured } from './resend-send.ts';
import { sendSmtpMail, smtpConfigured } from './smtp-send.ts';

export type ArcusxEmailProvider = 'resend' | 'smtp';

/**
 * Proveedor activo. Por defecto Resend si hay API key (SMTP desde Edge suele
 * fallar por firewall del hosting; desactivar SSL no lo arregla).
 */
export function getEmailProvider(): ArcusxEmailProvider | null {
  const forced = Deno.env.get('ARCUSX_EMAIL_PROVIDER')?.trim().toLowerCase();
  if (forced === 'resend' && resendConfigured()) return 'resend';
  if (forced === 'smtp' && smtpConfigured()) return 'smtp';
  if (resendConfigured()) return 'resend';
  if (smtpConfigured()) return 'smtp';
  return null;
}

export function emailConfigured(): boolean {
  return getEmailProvider() !== null;
}

export async function sendArcusxEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ provider: ArcusxEmailProvider }> {
  const provider = getEmailProvider();
  if (!provider) {
    throw new Error(
      'Email no configurado. Usá RESEND_API_KEY (recomendado) o SMTP_* en Edge Secrets.',
    );
  }
  if (provider === 'resend') {
    await sendResendMail(opts);
    return { provider: 'resend' };
  }
  await sendSmtpMail(opts);
  return { provider: 'smtp' };
}
