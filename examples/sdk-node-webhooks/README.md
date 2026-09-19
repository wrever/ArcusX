# SOW 2 Week 3 — Partner webhooks (`@arcusx/sdk`)

1. **Local HMAC** — `webhooks.verifySignature(secret, rawBody, header)` (no network)
2. **Optional** — `webhooks.listDeliveries()` with sandbox API key

Headers your endpoint receives:
- `X-ArcusX-Event: escrow.funded`
- `X-ArcusX-Signature: sha256=<hmac hex of raw body>`

```bash
cd packages/arcusx-sdk && npm run build
cd ../../examples/sdk-node-webhooks
cp .env.example .env
npm install && npm start
```
