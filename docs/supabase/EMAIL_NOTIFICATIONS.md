# Notificaciones — email vs app

Todas las acciones crean fila en `arcusx_notifications` (campana + Realtime).

El **correo** solo se encola si el handler pasa `email: true` en `insertArcusxNotification`.

## Email sí (acción o “ya te pagaron”)

| Evento | Destinatario | Asunto típico |
|--------|--------------|---------------|
| **Pago liberado** (tarea + escrow) | Freelancer | Ya liberaron tu pago |
| **Deal liberado** (`markDealReleased`) | Beneficiario (`beneficiary_wallet`) | Ya liberaron tus fondos |
| Nueva propuesta | Cliente | Nueva propuesta |
| Invitación oferta privada | Freelancer invitado | Invitación a oferta privada |
| Oferta privada fondeada | Freelancer | Nueva oferta privada |
| Entrega notificada | Cliente | Entrega notificada |
| Invitación a acuerdo (wallet) | Usuario registrado | Invitación a un acuerdo |
| Admin → usuario (manual) | Usuario indicado | (custom) |

### Pago liberado (tareas)

- Título email: **Ya liberaron tu pago**.
- Si el cliente ya valoró en la misma tarea, el cuerpo incluye estrellas y comentario (lee `arcusx_ratings` al liberar).
- **No** hay email aparte por valoración (`createRating` no notifica).

### Deal completado

- Quien cobra (`beneficiary_wallet`) recibe email de liberación.
- La otra parte solo ve notificación in-app “Deal completado”.

## Solo app (sin email)

| Evento |
|--------|
| Propuesta aceptada |
| Escrow fondeado (tarea normal) |
| Entrega rechazada / reembolso en curso |
| Tarea cancelada |
| Disputa abierta / resuelta |
| Deal aceptado / escrow deal fondeado |
| Broadcast admin (`user_id` null) |

## Requisitos técnicos

- `RESEND_API_KEY`, `EMAIL_FROM`, usuario con `email` en `arcusx_users`.
- Ver `EMAIL_SETUP.md`.

## Deploy

```bash
node scripts/bundle-edge-fn.mjs arcusx-api
node scripts/deploy-management-multipart.mjs supabase/.deploy/arcusx-api.json
node scripts/bundle-edge-fn.mjs arcusx-admin
node scripts/deploy-management-multipart.mjs supabase/.deploy/arcusx-admin.json
```
