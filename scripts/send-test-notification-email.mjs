#!/usr/bin/env node
/**
 * Encola un correo de prueba en arcusx_email_outbox y dispara arcusx-email-worker.
 * Uso: node scripts/send-test-notification-email.mjs [email]
 * Default: brunoandres205@gmail.com
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(resolve(root, 'arcusx/.env'));
loadEnvFile(resolve(root, '.env'));

const TO = (process.argv[2] || 'brunoandres205@gmail.com').trim().toLowerCase();
const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL ||
  process.env.ARCUSX_SUPABASE_URL ||
  ''
).replace(/\/$/, '');
const SERVICE_KEY =
  process.env.ARCUSX_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Falta VITE_SUPABASE_URL y ARCUSX_SUPABASE_SERVICE_ROLE_KEY en arcusx/.env');
  process.exit(1);
}

const BRAND = {
  logoUrl: process.env.ARCUSX_EMAIL_LOGO_URL?.trim() || 'https://arcusx.pro/arcusxmail.jpg',
  logoSize: 96,
  tagline: 'The future of work.',
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
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function notificationEmailHtml({ title, message }) {
  const logo = BRAND.logoUrl;
  const safeTitle = escapeHtml(title);
  const safeMsg = escapeHtml(message).replace(/\n/g, '<br/>');
  const year = new Date().getUTCFullYear();
  return `<!DOCTYPE html>
<html lang="es-CL">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${safeTitle} · ArcusX</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:system-ui,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden">
<tr><td align="center" style="padding:32px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
<td align="center" width="${BRAND.logoSize}" height="${BRAND.logoSize}" style="width:${BRAND.logoSize}px;height:${BRAND.logoSize}px;border-radius:50%;overflow:hidden;background:#0d1218;line-height:0">
<img src="${logo}" alt="ArcusX" width="${BRAND.logoSize}" height="${BRAND.logoSize}" style="display:block;width:${BRAND.logoSize}px;height:${BRAND.logoSize}px;border:0;object-fit:cover;object-position:center;border-radius:50%"/>
</td></tr></table>
<p style="margin:14px 0 0;font-size:13px;color:${BRAND.muted};text-align:center;letter-spacing:0.04em">${escapeHtml(BRAND.tagline)}</p>
</td></tr>
<tr><td style="padding:20px 32px 12px"><p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.accent}">Notificación</p>
<h1 style="margin:10px 0 0;font-size:22px;color:#fff">${safeTitle}</h1></td></tr>
<tr><td style="padding:0 32px 28px"><p style="margin:0;font-size:15px;line-height:1.65;color:${BRAND.text}">${safeMsg}</p></td></tr>
<tr><td style="padding:0 32px 32px"><a href="${BRAND.dashboardUrl}" style="display:inline-block;padding:12px 22px;background:${BRAND.accent};color:#0a0f14;text-decoration:none;border-radius:10px;font-weight:700">Ir al panel</a></td></tr>
<tr><td style="padding:20px 32px 28px;background:#0d1218"><p style="margin:0;font-size:12px;color:${BRAND.faint}">Prueba de plantilla · logo circular arcusxmail.jpg · © ${year} ArcusX</p></td></tr>
</table></td></tr></table></body></html>`;
}

function notificationEmailPlain({ title, message }) {
  return [title, '', message, '', `Ir al panel: ${BRAND.dashboardUrl}`, '', 'Prueba ArcusX — no responder.'].join('\n');
}

const opts = {
  title: 'Prueba — logo circular en correos',
  message:
    'Hola Bruno,\n\nEste es un envío de prueba con el nuevo logo arcusxmail (recorte circular centrado).\n\nSi ves el avatar redondo arriba, la plantilla quedó bien.',
};

const subject = `[ArcusX] ${opts.title}`;
const insertPayload = {
  user_id_mysql: 1,
  to_email: TO,
  subject,
  body_text: notificationEmailPlain(opts),
  body_html: notificationEmailHtml(opts),
  template_key: 'test',
  status: 'pending',
};

const insRes = await fetch(`${SUPABASE_URL}/rest/v1/arcusx_email_outbox`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify(insertPayload),
});

const insBody = await insRes.json();
if (!insRes.ok) {
  console.error('Insert outbox failed:', insRes.status, insBody);
  process.exit(1);
}

const row = Array.isArray(insBody) ? insBody[0] : insBody;
console.log('Outbox id:', row.id, '→', TO);

const workerRes = await fetch(`${SUPABASE_URL}/functions/v1/arcusx-email-worker`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
    'Content-Type': 'application/json',
  },
  body: '{}',
});

const workerText = await workerRes.text();
let workerJson;
try {
  workerJson = JSON.parse(workerText);
} catch {
  workerJson = { raw: workerText };
}

console.log('Worker status:', workerRes.status);
console.log(JSON.stringify(workerJson, null, 2));

const checkRes = await fetch(
  `${SUPABASE_URL}/rest/v1/arcusx_email_outbox?id=eq.${row.id}&select=status,error_message,sent_at`,
  {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  },
);
const updated = (await checkRes.json())[0];
console.log('Outbox final:', updated);

if (updated?.status !== 'sent') {
  process.exit(1);
}
