#!/usr/bin/env node
/** Genera JSON de preview para insertar en arcusx_email_outbox (misma lógica que email-templates.ts). */
import { writeFileSync } from 'fs';

const BRAND = {
  name: 'ArcusX',
  tagline: 'The future of work.',
  logoUrl: 'https://arcusx.pro/arcusx-email-logo.png',
  logoWidth: 80,
  dashboardUrl: 'https://arcusx.pro/dashboard',
  siteUrl: 'https://arcusx.pro',
  supportEmail: 'notificaciones@arcusx.pro',
  accent: '#10dd88',
  bg: '#0a0f14',
  card: '#111820',
  border: 'rgba(16, 221, 136, 0.35)',
  text: '#e5e7eb',
  muted: '#9ca3af',
  faint: '#6b7280',
};

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRef(id) {
  return id != null ? `ARC-NOTIF-${Math.floor(id)}` : null;
}

function notificationEmailHtml({ title, message, notificationId }) {
  const safeTitle = escapeHtml(title);
  const safeMsg = escapeHtml(message).replace(/\n/g, '<br/>');
  const ref = formatRef(notificationId);
  const refBlock = ref
    ? `<tr><td style="padding:0 32px 16px"><span style="display:inline-block;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.faint};background:#0d1218;border:1px solid ${BRAND.border};border-radius:6px;padding:6px 10px;font-family:ui-monospace,Menlo,monospace">${ref}</span></td></tr>`
    : '';
  const year = new Date().getUTCFullYear();
  return `<!DOCTYPE html><html lang="es-CL"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${safeTitle} · ArcusX</title></head><body style="margin:0;padding:0;background:${BRAND.bg};font-family:system-ui,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px"><tr><td style="padding:28px 32px 20px;border-bottom:1px solid rgba(255,255,255,0.06)"><table role="presentation" width="100%"><tr><td width="88" style="padding-right:16px"><img src="${BRAND.logoUrl}" alt="ArcusX" width="160" height="108" style="display:block;width:${BRAND.logoWidth}px;height:auto;max-width:${BRAND.logoWidth}px;border-radius:10px;border:0"/></td><td><p style="margin:0;font-size:18px;font-weight:700;color:#fff">${BRAND.name}</p><p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted}">${BRAND.tagline}</p></td></tr></table></td></tr>${refBlock}<tr><td style="padding:8px 32px 12px"><p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.accent}">Notificación</p><h1 style="margin:10px 0 0;font-size:22px;color:#fff">${safeTitle}</h1></td></tr><tr><td style="padding:0 32px 28px"><p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.text}">${safeMsg}</p></td></tr><tr><td style="padding:0 32px 32px"><a href="${BRAND.dashboardUrl}" style="display:inline-block;padding:12px 22px;background:${BRAND.accent};color:#0a0f14;text-decoration:none;border-radius:10px;font-weight:700">Ir al panel</a></td></tr><tr><td style="padding:20px 32px 28px;background:#0d1218"><p style="margin:0 0 10px;font-size:12px;color:${BRAND.faint}"><strong style="color:${BRAND.muted}">No respondas a este correo.</strong> Es un aviso automático; esta bandeja no está monitoreada.</p><p style="margin:0 0 10px;font-size:12px;color:${BRAND.faint}">Enviado por ${BRAND.supportEmail} · <a href="${BRAND.siteUrl}" style="color:${BRAND.accent}">arcusx.pro</a></p><p style="margin:0;font-size:11px;color:${BRAND.faint}">Puedes desactivar los correos transaccionales desde la configuración de tu perfil. © ${year} ArcusX.</p></td></tr></table></td></tr></table></body></html>`;
}

function notificationEmailPlain({ title, message, notificationId }) {
  const ref = formatRef(notificationId);
  const lines = [title, '', message, '', `Ir al panel: ${BRAND.dashboardUrl}`];
  if (ref) lines.push('', `Referencia: ${ref}`);
  lines.push('', '---', 'No respondas a este correo.', `Consultas: ${BRAND.supportEmail}`, 'Puedes desactivar estos avisos en tu perfil.');
  return lines.join('\n');
}

const opts = {
  title: 'Nueva oferta de trabajo privada',
  message:
    'Un cliente te envió una oferta privada para el proyecto "Landing Web3 — MVP dashboard".\n\nPresupuesto: 850 USDC\nPlazo: 14 días\n\nRevisa los detalles y responde desde ArcusX antes de que expire la invitación.',
  notificationId: 42001,
};

writeFileSync(
  '/tmp/arcusx-test-email.json',
  JSON.stringify({
    subject: '[ArcusX] Nueva oferta de trabajo privada',
    text: notificationEmailPlain(opts),
    html: notificationEmailHtml(opts),
  }),
);
console.log('written /tmp/arcusx-test-email.json');
