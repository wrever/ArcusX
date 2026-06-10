# Quickstart (placeholder) — Fase 1

> **Este documento se completará cuando exista la API MVP.**  
> Mientras tanto, el flujo de referencia es el E2E humano: [E2E_TESTNET.md](../demo/E2E_TESTNET.md).

## Objetivo del quickstart futuro

En menos de 15 minutos, un desarrollador debe:

1. Obtener API key testnet en dashboard ArcusX
2. Crear un `job` con un `subjob`
3. Fondear escrow (firmar XDR con wallet testnet)
4. Simular completado + attestation
5. Liberar USDC al wallet del ejecutor
6. Recibir webhook `subjob.released`

## Ejemplo curl (borrador — no operativo)

```bash
export ARCUSX_API_KEY="arcusx_test_..."
export BASE="https://api.arcusx.pro/v1"

curl -s -X POST "$BASE/jobs" \
  -H "Authorization: Bearer $ARCUSX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "external_ref": "demo-001",
    "title": "Agent subtask payment",
    "payer_wallet": "G..."
  }'
```

## Ejemplo Python (borrador)

```python
# pip install arcusx-agentic  # Fase 2
from arcusx_agentic import ArcusXAgentic

client = ArcusXAgentic(api_key="arcusx_test_...")
job = client.jobs.create(title="Demo", payer_wallet="G...")
# ...
```

---

*Spec completa:* [API_SPEC_DRAFT.md](./API_SPEC_DRAFT.md)
