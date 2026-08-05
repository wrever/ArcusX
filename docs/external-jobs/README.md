# External Web3 jobs board

ArcusX muestra **tareas de la plataforma primero** (badge `testnet` / `mainnet`) y debajo **trabajos Web3 externos** (badge `externa`).

Filtros UI: origen + roles + remote + categoría/precio **en un solo panel**, chips activos con **×**.

## Fuentes activas (APIs públicas / token)

| Fuente | Cómo (estilo [wwshemi](https://wwshemi.com/jobs)) | Auth |
|--------|--------------------------------------------------|------|
| [Jobicy](https://jobicy.com) | Feed remoto crypto/blockchain | — |
| [RemoteOK](https://remoteok.com) | Tags web3/crypto/defi | — |
| [Remotive](https://remotive.com/api/remote-jobs) | Search blockchain/crypto/web3 | — |
| [Himalayas](https://himalayas.app/jobs/api) | Search web3/solidity/blockchain | — |
| [web3.career](https://web3.career/) | API agregada | `WEB3_CAREER_API_TOKEN` |

wwshemi agrega career pages + boards remotos; nosotros usamos los **JSON públicos** equivalentes (sin scrape Cloudflare de CJL/LaborX).

### web3.career — términos

1. `apply_url` sin modificar  
2. Link follow (`rel="noopener"`, nunca `nofollow`)  
3. Mencionar fuente en UI  
4. Token solo server-side  

## Sync 24/7

```bash
# Manual
set -a && source arcusx/.env && set +a
node scripts/sync-external-jobs.mjs

# Cron (cada 30 min)
bash scripts/sync-external-jobs.sh

# Edge (si EXTERNAL_JOBS_SYNC_SECRET / CRON_SECRET está seteado)
# POST .../arcusx-api?action=sync_external_jobs
# Header: x-arcusx-sync-secret: …
```

Sin cache (&lt; 8 jobs), el frontend hace live fetch Jobicy/RemoteOK.
