# Modelo de seguridad — Escrow y agentes IA

Respuesta formal a: *¿Si el agente puede reembolsar, nos drenan todos los escrows?*

**Respuesta corta:** solo si diseñamos mal. La IA **no firma**; las wallets autorizadas **sí**, con roles fijos en el contrato.

---

## 1. Superficie de ataque

| Vector | Impacto | Mitigación |
|--------|---------|------------|
| API key robada llama “refund all” | Crítico | No existe endpoint que mueva fondos sin XDR firmado |
| Prompt injection al Resolve Agent | Alto en BD, no on-chain | IA sin rol `dispute_resolver`; dual agree + humano firma |
| Compromiso Edge con service role | Alto | Secrets mínimos; `resolve` XDR solo tras checks; audit log |
| Bug en `releaseOnCallback` auto-submit | Crítico | **No auto-submit** en v1; siempre unsigned XDR |
| Wallet admin ArcusX robada | Crítico | Hardware / multisig futuro; límites diarios off-chain |
| Contrato WASM exploit | Crítico | Auditoría; pause factory; upgrade policy |

---

## 2. Roles on-chain (v1 actual)

| Rol | Quién en producción | ¿Puede drenar? |
|-----|---------------------|----------------|
| `approver` | Cliente / inquilino / comprador | Solo tras `approve` + `release` path o fund |
| `release_signer` | Quien libera (puede ≠ approver) | Solo `release` si milestone approved |
| `service_provider` | Freelancer / vendedor | No drena escrow; recibe en `receiver` |
| `dispute_resolver` | **Solo ADMIN_WALLET plataforma** | `resolve` reparte balance — **máximo poder** |
| `receiver` | Beneficiario | Solo recibe transferencias entrantes |
| `platform` | PLATFORM_WALLET | Solo fee en release |

**Regla:** el Resolve Agent **nunca** es `dispute_resolver` on-chain.

---

## 3. Separación IA vs firma

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Resolve AI  │────▶│ BD: verdict  │────▶│ Humano admin    │
│ (sin clave) │     │ flags        │     │ firma resolve   │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                                   ▼
                                          Stellar require_auth()
```

| Capa | Puede mover USDC |
|------|------------------|
| ArcusX Guard IA | No |
| Edge Function | No (solo unsigned XDR) |
| Cliente Freighter | Sí, su rol |
| Admin wallet | Sí, `dispute_resolver` |

---

## 4. Reembolso / cancel (futuro v2.1)

Diseño obligatorio en [V2_REFUND.md](./V2_REFUND.md):

1. `refund_*` con `require_auth()` de **una** de: `approver`, `dispute_resolver`.
2. Estados permitidos: `Funded` (y opcional `Disputed` solo resolver).
3. Monto máximo = balance (no más).
4. Evento `refunded` con `engagement_id`.
5. Edge: función **prepare_refund_xdr** — nunca `submit` con clave servidor salvo enterprise KYB.

**Ataque “reembolso masivo”:** imposible on-chain sin N firmas de admin o N clientes.

---

## 5. Agente con “su propia wallet”

| Uso | Wallet del agente / orquestador |
|-----|--------------------------------|
| Recibir pago por subjob | ✅ `receiver` |
| Pagar subjob (orquestador) | ✅ `approver` / fund |
| Resolver disputas globales | ❌ |
| Ser `dispute_resolver` | ❌ |

Custodial “ArcusX firma por el agente”: solo Enterprise + límites + KYB + colateral.

---

## 6. Checklist pre-mainnet

- [ ] `dispute_resolver` = cold wallet / multisig roadmap
- [ ] Resolve Agent sin acceso a Stellar SDK sign en servidor
- [ ] Pen test API `release-on-callback` (idempotencia, no replay)
- [ ] Admin panel: confirmación explícita antes de broadcast resolve
- [ ] Alertas: `resolve` &gt; X USDC/h

---

*Roadmap ejecución:* [ROADMAP.md](./ROADMAP.md)
