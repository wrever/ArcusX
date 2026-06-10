const BRAND = {
  name: 'ArcusX',
  tagline: 'The future of work.',
  /** Must live at site root (public_html). Copy from arcusx/public/arcusxmail.jpg. Override: ARCUSX_EMAIL_LOGO_URL */
  logoUrl: 'https://arcusx.pro/arcusxmail.jpg',
  /** Circular avatar diameter (px) in HTML emails */
  logoSize: 96,
  siteUrl: 'https://arcusx.pro',
  dashboardUrl: 'https://arcusx.pro/dashboard',
  supportEmail: 'notificaciones@arcusx.pro',
  accent: '#10dd88',
  bg: '#0a0f14',
  card: '#111820',
  border: 'rgba(16, 221, 136, 0.35)',
  text: '#e5e7eb',
  muted: '#9ca3af',
  faint: '#6b7280',
} as const;

export type NotificationEmailOpts = {
  title: string;
  message: string;
};

export function emailLogoUrl(): string {
  return Deno.env.get('ARCUSX_EMAIL_LOGO_URL')?.trim() || BRAND.logoUrl;
}

export function notificationEmailPlain(opts: NotificationEmailOpts): string {
  return [
    opts.title,
    '',
    opts.message,
    '',
    `Ir al panel: ${BRAND.dashboardUrl}`,
    '',
    '---',
    'Este es un mensaje automático de ArcusX.',
    'No respondas a este correo; esta bandeja no está monitoreada.',
    `Consultas: ${BRAND.supportEmail}`,
    'Puedes desactivar estos avisos en tu perfil de ArcusX.',
  ].join('\n');
}

export function notificationEmailHtml(opts: NotificationEmailOpts): string {
  const logo = emailLogoUrl();
  const safeTitle = escapeHtml(opts.title);
  const safeMsg = escapeHtml(opts.message).replace(/\n/g, '<br/>');
  const year = new Date().getUTCFullYear();

  return `<!DOCTYPE html>
<html lang="es-CL">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <title>${safeTitle} · ArcusX</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${safeTitle} — ${escapeHtml(BRAND.tagline)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden">
        <tr>
          <td align="center" style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
              <tr>
                <td align="center" width="${BRAND.logoSize}" height="${BRAND.logoSize}" style="width:${BRAND.logoSize}px;height:${BRAND.logoSize}px;border-radius:50%;overflow:hidden;background:#0d1218;line-height:0;mso-line-height-rule:exactly">
                  <img src="${logo}" alt="ArcusX" width="${BRAND.logoSize}" height="${BRAND.logoSize}" style="display:block;width:${BRAND.logoSize}px;height:${BRAND.logoSize}px;max-width:${BRAND.logoSize}px;border:0;outline:none;object-fit:cover;object-position:center center;border-radius:50%"/>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-size:13px;line-height:1.4;color:${BRAND.muted};text-align:center;letter-spacing:0.04em">${escapeHtml(BRAND.tagline)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 12px">
            <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.accent}">Notificación</p>
            <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;font-weight:700;color:#ffffff">${safeTitle}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px">
            <p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.text}">${safeMsg}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px">
            <a href="${BRAND.dashboardUrl}" style="display:inline-block;padding:12px 22px;background:${BRAND.accent};color:#0a0f14;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700">Ir al panel</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;background:#0d1218;border-top:1px solid rgba(255,255,255,0.06)">
            <p style="margin:0 0 10px;font-size:12px;line-height:1.55;color:${BRAND.faint}">
              <strong style="color:${BRAND.muted}">No respondas a este correo.</strong>
              Es un aviso automático; esta bandeja no está monitoreada.
            </p>
            <p style="margin:0 0 10px;font-size:12px;line-height:1.55;color:${BRAND.faint}">
              Enviado por <span style="color:${BRAND.muted}">${BRAND.supportEmail}</span> ·
              <a href="${BRAND.siteUrl}" style="color:${BRAND.accent};text-decoration:none">arcusx.pro</a>
            </p>
            <p style="margin:0;font-size:11px;color:${BRAND.faint}">
              Puedes desactivar los correos transaccionales desde la configuración de tu perfil.
              © ${year} ArcusX.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
