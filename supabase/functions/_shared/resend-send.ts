/** Envío HTTP (TLS) — funciona desde Supabase Edge sin abrir SMTP del hosting. */

export function resendConfigured(): boolean {
  return Boolean(Deno.env.get('RESEND_API_KEY')?.trim());
}

export function getEmailFromAddress(): string {
  return (
    Deno.env.get('EMAIL_FROM')?.trim() ||
    Deno.env.get('SMTP_FROM')?.trim() ||
    'ArcusX <notificaciones@arcusx.pro>'
  );
}

export async function sendResendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  if (!apiKey) throw new Error('RESEND_API_KEY no configurado (Edge Secrets)');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body.slice(0, 400)}`);
  }
}
