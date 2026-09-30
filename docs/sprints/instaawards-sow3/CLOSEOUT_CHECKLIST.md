# SOW 3 · Week 4 — Closeout checklist (hoy)

Usar esta lista para cerrar el Instaward **hoy**. Marcar en orden.

## A. Repo / Edge (ya listo o casi)

- [x] Edge `arcusx-api` **v133** (sequential approve → release)
- [x] Edge **v132** confirmDeploy (hash / contract_id)
- [x] SDK `releaseSubjob` loop ×2
- [ ] Commit + push código Edge/SDK/local-test pendiente en working tree
- [ ] Packet Week 4 + changelog + fresh-clone en `docs/sprints/instaawards-sow3/`

## B. Dry verification (sin secretos)

```bash
cd packages/arcusx-sdk && npm run build
SMOKE_STRICT=1 npm run smoke:sow3:week1
SMOKE_STRICT=1 npm run smoke:sow3:week2
npm run smoke:sow3:week3
npm run smoke:sow3:week4
npm run demo:sow3:week4
```

- [ ] Smokes verdes
- [ ] Copiar outputs frescos a `evidence/SMOKE_WEEK{1,2,3,4}.txt` si cambió algo

## C. Live evidence (bloquea el cierre SOW)

Elegir **una** ruta:

1. `PAYER_SECRET_KEY` + `AGENTIC_EXECUTOR_USER_ID` → `npm run demo:sow3:week3`
2. `local-test` Freighter → fund + release (cliente ×2)

Luego editar [`evidence/LIVE_E2E.md`](./evidence/LIVE_E2E.md):

- [ ] `contract_id` (C…)
- [ ] fund tx → https://stellar.expert/explorer/testnet/tx/…
- [ ] release tx → https://stellar.expert/explorer/testnet/tx/…
- [ ] fecha / network = testnet / Edge v133

## D. Release público

- [ ] Bump root `CHANGELOG.md` entrada **v3.8.3**
- [ ] Actualizar SDK `CHANGELOG.md` (Week 4 shipped)
- [ ] Tag + GitHub release **v3.8.3** con body apuntando a Week 4 changelog
- [ ] README SOW3: Week 4 **Complete** + link release

## E. Ambassador pack (copiar/pegar)

- [ ] Link release v3.8.3
- [ ] Link `AGENTIC_QUICKSTART.md`
- [ ] Link `evidence/LIVE_E2E.md`
- [ ] Confirmar: Testnet only · no mainnet claim · no secrets in git

---

**Definition of done:** A+B verdes · C rellenado · D publicado · E listo para Chapter Lead.
