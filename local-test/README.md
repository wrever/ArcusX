# ArcusX SDK — local-test (partner path)

Harness en localhost para **probar que el riel funciona** como lo usa un integrador:

- Solo **API key** (`axk_test_…`)
- Suite PASS/FAIL + tab **Partner escrow** (wallets + monto, sin JWT)
- Sin Freighter embebido (firma = app del partner)

## Arranque

```bash
cd packages/arcusx-sdk && npm run build
cd ../../local-test
npm install && npm run dev
```

→ http://localhost:5200

Docs del motor: [`docs/sdk/PARTNER_ESCROW.md`](../docs/sdk/PARTNER_ESCROW.md).
