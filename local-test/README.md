# ArcusX — local-test (agentic payments + partner)

App de prueba visual para el **recorrido de pagos agenticos** en Stellar Testnet, más el harness partner.

## Arranque

```bash
cd packages/arcusx-sdk && npm run build
cd ../../local-test
npm install && npm run dev
```

→ http://localhost:5200

| Vista | URL |
|-------|-----|
| **Recorrido agentico (default)** | `http://localhost:5200` |
| Demo SOW3 Week1 (create/status) | `?view=week1` |
| Harness técnico | `?view=harness` |

Pega `axk_test_…` o define `VITE_ARCUSX_API_KEY` en `local-test/.env`.

## Qué hace el recorrido en vivo

1. Partner auth  
2. `agent.create` (job)  
3. `agent.createSubjob` (work unit + USDC)  
4. `agent.quoteEscrow`  
5. Status job + subjob  

Fund escrow / release payout aparecen en el path como **próximo** (on-chain, siguiente hito).

Ideal para video a Stellar: un botón → estaciones se encienden → tarjetas Job / Subjob / Quote reales.
