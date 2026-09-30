# local-test

Smoke UI for agentic + partner against testnet.

```bash
cd packages/arcusx-sdk && npm run build
cd ../../local-test && npm i && npm run dev
```

http://localhost:5200 — main flow  
`?view=week1` — create/status only  
`?view=harness` — partner suite

`.env`: `VITE_ARCUSX_API_KEY`, optional wallets + `VITE_AGENTIC_EXECUTOR_USER_ID`.

Checkbox = Freighter fund/release. Off = prepare only (400s are fine pre-deploy).
