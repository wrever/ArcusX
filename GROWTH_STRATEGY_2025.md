# ArcusX — Growth Strategy 2025
### De marketplace de freelancers → infraestructura de ejecución de tareas técnicas

---

## 1. El mercado que nos respalda (datos reales, 2025)

| Mercado | Tamaño 2024 | Proyección | CAGR |
|---------|-------------|-----------|------|
| Freelancing marketplaces | $6.37B | $24B (2032) | 18.6% |
| AI Agents marketplaces | $5.25B | $52.62B (2030) | **46.3%** |
| e-KYC / verificación de identidad | $832M | $10B (2034) | **31.86%** |
| Crypto compliance + KYC | $3.14B | $9.09B (2032) | 14.4% |

**Conclusión:** No estamos en un solo mercado de $6B. Estamos en la intersección de tres mercados que suman >$85B al 2030, todos en hipercrecimiento.

### Por qué no hay un ganador Web3 nativo todavía
- Las plataformas Web3-only han fallado porque exigen demasiado conocimiento cripto al usuario
- Los freelancers exitosos usan 60-80% plataformas tradicionales + 20-40% DAOs/bounties
- **Oportunidad:** quien resuelva la fricción de UX gana todo. ArcusX ya lo está resolviendo.
- Toptal levantó $175M en Oct 2024 (BlackRock) → capital institucional entrando al sector

---

## 2. El pivot estratégico: de marketplace a infraestructura

### Visión actual (Testnet)
```
Cliente publica tarea → Freelancer aplica → Escrow → Pago
```

### Visión 2026
```
Humano / AI Agent publica tarea → Ejecutor verificado (humano o agente) → 
Escrow automatizado → Pago instantáneo → Reputación on-chain
```

**ArcusX no es Upwork. ArcusX es la capa de ejecución + pago para trabajo técnico — humano o automatizado.**

Los AI Agents necesitan:
1. Una forma de recibir tareas con specs claras → ArcusX Task Protocol
2. Un mecanismo de pago trustless → Trustless Work escrow (ya lo tenemos)
3. Verificación de que el trabajo fue completado → CertiX + aprobación on-chain (ya lo tenemos)

**Somos la única plataforma en Stellar con estas 3 piezas integradas.**

---

## 3. Cambios de producto a hacer AHORA (en Testnet)

### 3.1 Fee: subir de 0.3% a 1%

**Razonamiento:**
- Stablecoins en el mercado cobran ~2% flat. Nosotros al 1% seguimos siendo 80% más baratos que Upwork (20%)
- A 0.3% el break-even requiere $10M GMV/mes. A 1% lo logramos con $300K GMV/mes
- Los usuarios que se van por 0.7% de diferencia no son los usuarios que queremos
- **Recomendación:** 1% estándar, con opción de bajar a 0.5% para clientes enterprise con volumen

```
Impacto en GMV $100K/mes:
  0.3% → $300/mes
  1.0% → $1,000/mes  ← 3.3x más ingresos, sin cambios de producto
```

### 3.2 CertiX como KYC de pago — "ArcusX Verified"

**El mercado de e-KYC crece al 31.86% anual. Podemos capturar una parte desde el día 1.**

**Modelo propuesto:**

| Tier | Nombre | Precio | Qué incluye |
|------|--------|--------|-------------|
| Free | Basic | $0 | Email verificado, wallet conectada |
| Paid | **ArcusX Verified** | $19 one-time | CertiX badge on-chain + verificación de identidad básica (documento) |
| Premium | **ArcusX Pro** | $49/año | Verified + skills certificados on-chain + prioridad en búsqueda + 0.5% fee |
| Enterprise | **ArcusX Trust** | Custom | KYC institucional + SLA + API access |

**Por qué funciona:**
- Freelancers verificados ganan más → incentivo real para pagar
- Clientes prefieren contratar freelancers verificados → genera presión social de convertirse
- CertiX ya existe como infraestructura — solo hay que conectarlo al flujo de ArcusX

### 3.3 Task Bounties públicos (sin aplicación)

Actualmente: Cliente → espera aplicaciones → selecciona → escrow
Nuevo modelo adicional: Cliente publica bounty con precio fijo → primero en completar se lleva el pago

- Ideal para tareas pequeñas y bien definidas ($5-$100)
- Reduce fricción del proceso de selección
- Atrae a la comunidad de desarrolladores que hace bounties en Gitcoin/Dework
- Compatible con AI Agents en el futuro (el primer agente que resuelve el bounty, cobra)

### 3.4 Reputación on-chain portable

- Cada tarea completada genera un NFT de reputación en Stellar
- El historial es tuyo — no de ArcusX — lo llevas a cualquier plataforma
- **Diferenciador radical vs Upwork**: tu reputación no desaparece si te banean o la plataforma cierra
- CertiX emite el certificado de completación; ArcusX registra el historial

### 3.5 Categorías a enfocar primero (donde hay más dolor)

| Categoría | Por qué |
|-----------|---------|
| Desarrollo Blockchain / Stellar | Comunidad existente, alto ticket ($500-$5000/tarea) |
| Diseño UI/UX Web3 | Escasez de talento, clientes dispuestos a pagar en cripto |
| Smart Contract Audits | Mercado enorme, CertiX puede certificar auditores |
| AI / ML Engineering | El mercado de AI agents necesita ejecutores humanos de respaldo |
| Traducción técnica | LATAM → inglés, bajo costo para el cliente, buen ingreso para el freelancer |

---

## 4. Roadmap de producto (Testnet → Mainnet)

### Ahora mismo (Testnet — próximas 4 semanas)
- [x] Week 1: Security + EvidenceUpload (completado)
- [ ] Week 2: CORS unificado, JWT centralizado, wallet adicional (Albedo)
- [ ] Subir fee de 0.3% → 1% en `trustlessWork.ts` (1 línea de código)
- [ ] Diseñar flujo de CertiX Verified dentro del perfil de usuario
- [ ] Agregar categorías de tareas (actualmente no hay filtro por tipo)

### Mes 2-3 (post-Mainnet)
- [ ] Launch de "ArcusX Verified" con CertiX ($19 one-time)
- [ ] Bounties públicos (precio fijo, primero en completar cobra)
- [ ] App móvil PWA optimizada (ya tienen vite-plugin-pwa)
- [ ] Programa de referidos on-chain ($5 USDC por freelancer referido)

### Mes 4-6
- [ ] API pública de escrow (B2B — empresas que quieren pagar freelancers en cripto)
- [ ] AI Agent task runner: permitir que agentes automáticos postulen a bounties simples
- [ ] Dashboard analytics para clientes (cuánto gastaron, qué categorías, tiempo promedio)

---

## 5. Cambio de posicionamiento

### Antes
> "Plataforma de freelancing descentralizada en Stellar"

### Ahora
> **"La infraestructura de ejecución de trabajo técnico en Stellar — para humanos y agentes"**

### Por qué importa el lenguaje
- "Infraestructura" atrae inversores institucionales (no solo usuarios)
- "Agentes" nos posiciona en el mercado de AI de $52B al 2030
- "Trabajo técnico" diferencia de Fiverr (logos, copys) → ticket promedio más alto
- Stellar como red específica → nicho claro, comunidad existente, grants disponibles

---

## 6. Acción inmediata (esta semana)

| # | Acción | Responsable | Impacto |
|---|--------|------------|---------|
| 1 | Cambiar `PLATFORM_FEE_BPS` de 0.3 a 1.0 en `trustlessWork.ts` | CTO | +233% revenue por GMV |
| 2 | Aplicar grant Stellar Development Foundation (hasta $200K) | CEO | Runway |
| 3 | Crear página de "ArcusX Verified" (diseño, no código aún) | CPO | Valida demanda |
| 4 | Publicar en Twitter: comparativa fees ArcusX vs Upwork vs Fiverr | CMO | SEO + awareness |
| 5 | Contactar 3 bootcamps LATAM para partnership | COO | Early freelancer base |
| 6 | Agregar campo "categoría" a las tareas en DB + frontend | CTO | UX + datos de mercado |

---

## 7. La pregunta que define todo

> **¿Somos el lugar donde los humanos trabajan, o somos el protocolo donde el trabajo sucede?**

La respuesta correcta en 2025 es: **los dos**. Empezamos con humanos porque es el camino a la adopción. Construimos el protocolo porque es el camino al moat. Cuando los AI agents necesiten ejecutar trabajo técnico en blockchain, ArcusX ya estará ahí con escrow, reputación y verificación de identidad listos.

---

*Mercado de freelancing: $24B al 2032. AI agents: $52B al 2030. KYC cripto: $9B al 2032. Total addressable: >$85B. ArcusX, hoy en Testnet, es la única plataforma con las 3 capas integradas en Stellar.*
