# ArcusX SDK — local-test (partner path)

Harness en localhost para **probar el riel partner** como lo usa un integrador:

- Solo **API key** (`axk_test_…`)
- Suite PASS/FAIL + tabs **Partner escrow** y **Partner deals**
- Freighter Testnet para firmar deploy, fund, approve y release

## Arranque

```bash
cd packages/arcusx-sdk && npm run build
cd ../../local-test
npm install && npm run dev
```

→ http://localhost:5200

En **Partner deals**, el flujo de prueba es:

`create` → `prepareFund` → firmar deploy → `prepareFund` → firmar fund → `prepareRelease` (approve) → `prepareRelease` (release).

Docs del motor: [`docs/sdk/PARTNER_ESCROW.md`](../docs/sdk/PARTNER_ESCROW.md).
