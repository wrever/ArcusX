import nodemailer from 'npm:nodemailer@6.9.16';

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

export function smtpConfigured(): boolean {
  return Boolean(
    Deno.env.get('SMTP_HOST')?.trim() &&
      Deno.env.get('SMTP_USER')?.trim() &&
      Deno.env.get('SMTP_PASS')?.trim() &&
      Deno.env.get('SMTP_FROM')?.trim(),
  );
}

export function getSmtpConfig(): SmtpConfig | null {
  if (!smtpConfigured()) return null;
  const port = parseInt(Deno.env.get('SMTP_PORT') ?? '587', 10);
  const secure = Deno.env.get('SMTP_SECURE') === 'true' || port === 465;
  return {
    host: Deno.env.get('SMTP_HOST')!.trim(),
    port: Number.isFinite(port) ? port : 587,
    user: Deno.env.get('SMTP_USER')!.trim(),
    pass: Deno.env.get('SMTP_PASS')!.trim(),
    from: Deno.env.get('SMTP_FROM')!.trim(),
    secure,
  };
}

export async function sendSmtpMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const cfg = getSmtpConfig();
  if (!cfg) throw new Error('SMTP no configurado (Secrets Edge)');

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 12_000,
  });

  await transport.sendMail({
    from: cfg.from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? opts.text,
  });
}
