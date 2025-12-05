# Plan de Integración: Trustless Work con ArcusX

## 📋 Resumen Ejecutivo

Este documento detalla el plan paso a paso para integrar **Trustless Work** como sistema de escrow en ArcusX, reemplazando el sistema actual de multisig 2-de-2 en Stellar.

**⚠️ IMPORTANTE: El sistema usa USDC como moneda única para todos los pagos. XLM solo se usa para fees de transacción de Stellar.**

### Ventajas de Trustless Work
- ✅ **Ahorro de costos**: No requiere crear cuenta Stellar por tarea
- ✅ **Milestones integrados**: Soporte nativo para pagos por etapas
- ✅ **Resolución de disputas**: Sistema automatizado de disputas
- ✅ **USDC nativo**: Usa USDC (USD Coin) como moneda principal
- ✅ **API simplificada**: Menos complejidad en el código
- ✅ **Mejor UX**: Menos pasos para el usuario

### Desventajas a considerar
- ⚠️ **Dependencia externa**: Requiere servicio de Trustless Work activo
- ⚠️ **API Key**: Necesita configuración de credenciales
- ⚠️ **Fees**: Puede tener comisiones adicionales del servicio

---

## 🎯 Fase 1: Preparación y Configuración

### 1.1 Configurar API Key de Trustless Work

**Objetivo**: Obtener y configurar las credenciales necesarias.

**Pasos**:
1. Registrarse en Trustless Work (https://trustlesswork.com)
2. Obtener API Key del dashboard
3. Decidir entorno: `development` o `mainnet`
4. Crear archivo `.env` con la API key:
   ```env
   VITE_TRUSTLESS_WORK_API_KEY=tu_api_key_aqui
   VITE_TRUSTLESS_WORK_BASE_URL=https://dev.api.trustlesswork.com
   ```

**Archivos a modificar**:
- `.env` (nuevo)
- `.env.example` (agregar variables)

**Tiempo estimado**: 15 minutos

---

### 1.2 Instalar y Configurar Trustless Work SDK

**Objetivo**: Configurar el SDK de Trustless Work en la aplicación.

**Pasos**:
1. Verificar que `@trustless-work/escrow` esté instalado (ya está en package.json)
2. Crear servicio de configuración: `src/services/trustlessWorkService.ts`
3. Configurar provider en `App.tsx`

**Código a crear**:

```typescript
// src/services/trustlessWorkService.ts
import { TrustlessWorkConfig, development, mainNet } from '@trustless-work/escrow';

const API_KEY = import.meta.env.VITE_TRUSTLESS_WORK_API_KEY || '';
const BASE_URL = import.meta.env.VITE_TRUSTLESS_WORK_BASE_URL === 'mainnet' 
  ? mainNet 
  : development;

export { TrustlessWorkConfig, BASE_URL, API_KEY };
```

**Archivos a crear**:
- `src/services/trustlessWorkService.ts`

**Archivos a modificar**:
- `src/App.tsx` (agregar TrustlessWorkConfig provider)

**Tiempo estimado**: 30 minutos

---

## 🏗️ Fase 2: Crear Servicio de Integración

### 2.1 Crear Servicio Base de Trustless Work

**Objetivo**: Crear funciones wrapper para las operaciones de escrow.

**Pasos**:
1. Crear `src/services/trustlessWorkEscrowService.ts`
2. Implementar funciones para:
   - Crear escrow (single-release)
   - Fondeo de escrow
   - Aprobar milestone
   - Liberar fondos
   - Iniciar disputa
   - Resolver disputa
   - Obtener estado del escrow

**Estructura del servicio**:

```typescript
// src/services/trustlessWorkEscrowService.ts
import { 
  useInitializeEscrow,
  useFundEscrow,
  useApproveMilestone,
  useReleaseFunds,
  useStartDispute,
  useResolveDispute,
  useGetEscrowFromIndexerByContractIds
} from '@trustless-work/escrow';

// Funciones helper para usar los hooks fuera de componentes React
// (Necesitaremos crear un cliente directo o usar los hooks en componentes)
```

**Nota**: Los hooks de Trustless Work solo funcionan dentro de componentes React. Necesitaremos crear un cliente HTTP directo o usar los hooks en los componentes.

**IMPORTANTE - USDC**: Todo el sistema usará **USDC** como moneda única. No se usará XLM para pagos, solo para fees de transacción de Stellar.

**Archivos a crear**:
- `src/services/trustlessWorkEscrowService.ts`

**Tiempo estimado**: 1 hora

---

### 2.2 Crear Cliente HTTP Directo (Alternativa)

**Objetivo**: Crear cliente HTTP para usar Trustless Work sin hooks de React.

**Pasos**:
1. Investigar API REST de Trustless Work
2. Crear cliente HTTP con axios
3. Implementar métodos para todas las operaciones

**Archivos a crear**:
- `src/services/trustlessWorkHttpClient.ts`

**Tiempo estimado**: 2 horas

---

## 🔄 Fase 3: Adaptar Backend

### 3.1 Modificar Tabla de Tareas

**Objetivo**: Agregar campos necesarios para Trustless Work.

**Pasos**:
1. Agregar columna `trustless_contract_id` (VARCHAR 255)
2. Agregar columna `trustless_engagement_id` (VARCHAR 255)
3. Agregar columna `escrow_type` (ENUM: 'multisig', 'trustless') DEFAULT 'multisig'
4. Mantener compatibilidad con sistema actual

**SQL Migration**:
```sql
ALTER TABLE tasks 
ADD COLUMN trustless_contract_id VARCHAR(255) NULL,
ADD COLUMN trustless_engagement_id VARCHAR(255) NULL,
ADD COLUMN escrow_type ENUM('multisig', 'trustless') DEFAULT 'multisig';
```

**Archivos a modificar**:
- Base de datos (migration SQL)

**Tiempo estimado**: 15 minutos

---

### 3.2 Modificar Endpoint de Creación de Escrow

**Objetivo**: Adaptar `create_escrow.php` para soportar Trustless Work.

**Pasos**:
1. Agregar lógica para detectar tipo de escrow
2. Si es Trustless Work:
   - No crear cuenta Stellar
   - Guardar `contract_id` y `engagement_id`
   - Estado: `pending_funding`
3. Mantener compatibilidad con multisig

**Archivos a modificar**:
- `backend_externo/create_escrow.php`

**Tiempo estimado**: 1 hora

---

### 3.3 Crear Endpoint para Sincronizar Estado

**Objetivo**: Crear endpoint para obtener estado del escrow desde Trustless Work.

**Pasos**:
1. Crear `backend_externo/get_trustless_escrow_status.php`
2. Consultar API de Trustless Work (o usar indexer)
3. Retornar estado sincronizado

**Archivos a crear**:
- `backend_externo/get_trustless_escrow_status.php`

**Tiempo estimado**: 1 hora

---

## 🎨 Fase 4: Adaptar Frontend - Creación de Escrow

### 4.1 Modificar ProposalReview.tsx

**Objetivo**: Adaptar el flujo de creación de escrow para usar Trustless Work.

**Pasos**:
1. Agregar opción para elegir tipo de escrow (multisig o trustless)
2. Si es Trustless Work:
   - Usar `useInitializeEscrow` hook
   - Configurar roles:
     - `approver`: Cliente
     - `serviceProvider`: Trabajador
     - `platformAddress`: Wallet de ArcusX
     - `releaseSigner`: Cliente (o trabajador según flujo)
     - `disputeResolver`: Wallet de ArcusX (admin)
     - `receiver`: Trabajador
   - Configurar milestones (1 milestone para single-release)
   - Configurar `platformFee`: 0.3% (3 basis points)
3. Guardar `contract_id` en backend
4. Mostrar estado del proceso

**Código ejemplo**:

```typescript
// En ProposalReview.tsx
import { useInitializeEscrow } from '@trustless-work/escrow';

const { mutate: initializeEscrow, isLoading: isInitializing } = useInitializeEscrow();

const handleCreateTrustlessEscrow = async () => {
  const engagementId = `arcusx-${taskId}-${Date.now()}`;
  
  initializeEscrow({
    escrowType: 'single-release',
    signer: clientWalletAddress,
    engagementId,
    title: task.title,
    roles: {
      approver: clientWalletAddress,
      serviceProvider: workerWalletAddress,
      platformAddress: ARCUSX_PLATFORM_WALLET,
      releaseSigner: clientWalletAddress,
      disputeResolver: ARCUSX_ADMIN_WALLET,
      receiver: workerWalletAddress
    },
    description: task.description,
    amount: parseFloat(task.price), // Monto en USDC
    platformFee: 3, // 0.3% = 3 basis points
    milestones: [{
      description: `Completar tarea: ${task.title}`
    }],
    trustline: {
      address: workerWalletAddress // Trustline para USDC
    },
    receiverMemo: 0
  }, {
    onSuccess: (response) => {
      if (response.status === 'SUCCESS' && response.contractId) {
        // Guardar contract_id en backend
        saveEscrowToBackend(response.contractId, engagementId);
}
    }
  });
};
```

**Archivos a modificar**:
- `src/components/ProposalReview.tsx`

**Tiempo estimado**: 2 horas

---

### 4.2 Modificar Flujo de Fondeo

**Objetivo**: Adaptar el fondeo para usar Trustless Work.

**Pasos**:
1. Usar `useFundEscrow` hook
2. Obtener transacción XDR no firmada
3. Firmar con Freighter
4. Enviar transacción firmada con `useSendTransaction`
5. Actualizar estado en backend

**Código ejemplo**:

```typescript
import { useFundEscrow, useSendTransaction } from '@trustless-work/escrow';

const { mutate: fundEscrow } = useFundEscrow();
const { mutate: sendTransaction } = useSendTransaction();

const handleFundTrustlessEscrow = async () => {
  fundEscrow({
    escrowType: 'single-release',
    contractId: contractId,
    amount: parseFloat(task.price),
    signer: clientWalletAddress
  }, {
    onSuccess: async (response) => {
      if (response.status === 'SUCCESS' && response.unsignedTransaction) {
        // Firmar con Freighter
        const signedXdr = await signWithFreighter(response.unsignedTransaction);
        
        // Enviar transacción
        sendTransaction({
          signedXdr
        }, {
          onSuccess: () => {
            // Actualizar estado en backend
            updateEscrowStatus('active');
          }
        });
      }
    }
  });
};
```

**Archivos a modificar**:
- `src/components/ProposalReview.tsx`

**Tiempo estimado**: 1.5 horas

---

## ✅ Fase 5: Adaptar Frontend - Supervisión y Completado

### 5.1 Modificar SuperviseTask.tsx - Aprobación

**Objetivo**: Adaptar la aprobación de trabajo para Trustless Work.

**Pasos**:
1. Usar `useApproveMilestone` hook
2. Aprobar milestone cuando cliente acepta
3. Actualizar UI según estado

**Código ejemplo**:

```typescript
import { useApproveMilestone } from '@trustless-work/escrow';

const { mutate: approveMilestone } = useApproveMilestone();

const handleApproveWork = async () => {
  approveMilestone({
    escrowType: 'single-release',
    contractId: contractId,
    milestoneIndex: '0', // Primer milestone
    approver: clientWalletAddress
  }, {
    onSuccess: (response) => {
      if (response.status === 'SUCCESS') {
        // Actualizar estado en backend
        updateTaskStatus('approved');
      }
    }
  });
};
```

**Archivos a modificar**:
- `src/components/SuperviseTask.tsx`

**Tiempo estimado**: 1 hora

---

### 5.2 Modificar SuperviseTask.tsx - Liberación de Fondos

**Objetivo**: Adaptar la liberación de fondos para Trustless Work.

**Pasos**:
1. Usar `useReleaseFunds` hook
2. Obtener transacción XDR no firmada
3. Firmar con Freighter (releaseSigner)
4. Enviar transacción
5. Actualizar estado

**Código ejemplo**:

```typescript
import { useReleaseFunds, useSendTransaction } from '@trustless-work/escrow';

const { mutate: releaseFunds } = useReleaseFunds();

const handleReleaseFunds = async () => {
  releaseFunds({
    contractId: contractId,
    releaseSigner: clientWalletAddress
  }, {
    onSuccess: async (response) => {
      if (response.status === 'SUCCESS' && response.unsignedTransaction) {
        // Firmar y enviar
        const signedXdr = await signWithFreighter(response.unsignedTransaction);
        await sendTransaction({ signedXdr });
      }
    }
  });
};
```

**Archivos a modificar**:
- `src/components/SuperviseTask.tsx`

**Tiempo estimado**: 1.5 horas

---

## 🚨 Fase 6: Sistema de Disputas

### 6.1 Implementar Inicio de Disputa

**Objetivo**: Permitir que cliente o trabajador inicien disputa.

**Pasos**:
1. Agregar botón "Iniciar Disputa" en SuperviseTask
2. Usar `useStartDispute` hook
3. Guardar evidencia en backend
4. Notificar a admin

**Código ejemplo**:

```typescript
import { useStartDispute } from '@trustless-work/escrow';

const { mutate: startDispute } = useStartDispute();

const handleStartDispute = async (reason: string, evidence: string) => {
  startDispute({
    escrowType: 'single-release',
    contractId: contractId,
    signer: currentUserWalletAddress
  }, {
    onSuccess: async (response) => {
      if (response.status === 'SUCCESS' && response.unsignedTransaction) {
        // Firmar y enviar
        const signedXdr = await signWithFreighter(response.unsignedTransaction);
        await sendTransaction({ signedXdr });
        
        // Guardar disputa en backend
        await saveDisputeToBackend({
          taskId,
          contractId,
          reason,
          evidence
        });
      }
    }
  });
};
```

**Archivos a modificar**:
- `src/components/SuperviseTask.tsx`
- `backend_externo/create_dispute.php` (nuevo o modificar existente)

**Tiempo estimado**: 2 horas

---

### 6.2 Implementar Resolución de Disputa (Admin)

**Objetivo**: Permitir que admin resuelva disputas.

**Pasos**:
1. Modificar `DisputeManagement.tsx`
2. Usar `useResolveDispute` hook
3. Configurar decisión (cliente, trabajador, o split)
4. Enviar transacción

**Código ejemplo**:

```typescript
import { useResolveDispute } from '@trustless-work/escrow';

const { mutate: resolveDispute } = useResolveDispute();

const handleResolveDispute = async (decision: 'client' | 'worker' | 'split') => {
  const receiver = decision === 'worker' 
    ? workerWalletAddress 
    : clientWalletAddress;
  
  resolveDispute({
    escrowType: 'single-release',
    contractId: contractId,
    disputeResolver: adminWalletAddress,
    receiver: receiver
  }, {
    onSuccess: async (response) => {
      if (response.status === 'SUCCESS' && response.unsignedTransaction) {
        // Firmar y enviar
        const signedXdr = await signWithFreighter(response.unsignedTransaction);
        await sendTransaction({ signedXdr });
        
        // Actualizar disputa en backend
        await updateDisputeStatus('resolved', decision);
      }
    }
  });
};
```

**Archivos a modificar**:
- `src/components/DisputeManagement.tsx`

**Tiempo estimado**: 2 horas

---

## 🔍 Fase 7: Sincronización y Estado

### 7.1 Crear Hook para Estado del Escrow

**Objetivo**: Crear hook personalizado para obtener y sincronizar estado.

**Pasos**:
1. Crear `src/hooks/useTrustlessEscrow.ts`
2. Usar `useGetEscrowFromIndexerByContractIds`
3. Sincronizar con backend
4. Actualizar UI automáticamente

**Código ejemplo**:

```typescript
// src/hooks/useTrustlessEscrow.ts
import { useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow';
import { useEffect } from 'react';

export const useTrustlessEscrow = (contractId: string | null) => {
  const { data, isLoading, refetch } = useGetEscrowFromIndexerByContractIds({
    contractIds: contractId ? [contractId] : [],
    validateOnChain: true
  });

  useEffect(() => {
    if (data && contractId) {
      // Sincronizar con backend
      syncEscrowStatusToBackend(contractId, data);
    }
  }, [data, contractId]);

  return {
    escrow: data?.[0] || null,
    isLoading,
    refetch
  };
};
```

**Archivos a crear**:
- `src/hooks/useTrustlessEscrow.ts`

**Tiempo estimado**: 1 hora

---

### 7.2 Agregar Polling de Estado

**Objetivo**: Actualizar estado del escrow automáticamente.

**Pasos**:
1. Usar `setInterval` o `react-query` para polling
2. Consultar estado cada 30 segundos
3. Actualizar UI cuando cambie

**Archivos a modificar**:
- `src/components/SuperviseTask.tsx`
- `src/components/ProposalReview.tsx`

**Tiempo estimado**: 1 hora

---

## 🧪 Fase 8: Testing y Validación

### 8.1 Testing en Desarrollo

**Objetivo**: Probar flujo completo en testnet.

**Pasos**:
1. Crear tarea de prueba
2. Crear escrow con Trustless Work
3. Fondeo
4. Aprobar trabajo
5. Liberar fondos
6. Probar disputa
7. Verificar balances

**Checklist**:
- [ ] Creación de escrow funciona
- [ ] Fondeo funciona
- [ ] Aprobación funciona
- [ ] Liberación funciona
- [ ] Disputa funciona
- [ ] Resolución funciona
- [ ] Estados se sincronizan correctamente

**Tiempo estimado**: 3 horas

---

### 8.2 Testing de Compatibilidad

**Objetivo**: Asegurar que sistema multisig sigue funcionando.

**Pasos**:
1. Probar flujo multisig completo
2. Verificar que no hay conflictos
3. Probar migración de datos

**Tiempo estimado**: 1 hora

---

## 🚀 Fase 9: Migración y Despliegue

### 9.1 Estrategia de Migración

**Objetivo**: Planificar migración sin interrumpir servicio.

**Opciones**:
1. **Coexistencia**: Mantener ambos sistemas, elegir por tarea
2. **Migración gradual**: Nuevas tareas usan Trustless Work, antiguas multisig
3. **Migración completa**: Migrar todas las tareas activas

**Recomendación**: Opción 2 (Migración gradual)

**Pasos**:
1. Deployar código con ambos sistemas
2. Configurar flag para elegir sistema por defecto
3. Migrar tareas activas manualmente si es necesario
4. Monitorear por 1 semana
5. Desactivar multisig si todo funciona bien

**Tiempo estimado**: 2 horas (planificación)

---

### 9.2 Configurar Wallets de ArcusX

**Objetivo**: Configurar wallets para roles de plataforma.

**Pasos**:
1. Crear wallet para `platformAddress`
2. Crear wallet para `disputeResolver` (admin)
3. Fondeo inicial de wallets
4. Guardar secretos de forma segura (no en código)

**Archivos a crear**:
- `.env.production` (con wallets, NO commitear)
- Documentación de wallets

**Tiempo estimado**: 30 minutos

---

### 9.3 Deploy a Producción

**Objetivo**: Desplegar cambios a producción.

**Pasos**:
1. Build de producción
2. Configurar variables de entorno
3. Deploy frontend
4. Deploy backend
5. Ejecutar migrations SQL
6. Verificar funcionamiento

**Tiempo estimado**: 1 hora

---

## 📊 Fase 10: Monitoreo y Optimización

### 10.1 Agregar Logging

**Objetivo**: Monitorear operaciones de Trustless Work.

**Pasos**:
1. Agregar logs en backend para todas las operaciones
2. Agregar logs en frontend para errores
3. Monitorear tasa de éxito

**Archivos a modificar**:
- Todos los archivos que usan Trustless Work

**Tiempo estimado**: 1 hora

---

### 10.2 Optimizaciones

**Objetivo**: Mejorar rendimiento y UX.

**Mejoras posibles**:
- Cache de estados de escrow
- Reducir polling frequency
- Mejorar manejo de errores
- Agregar retry logic
- Mejorar mensajes de error

**Tiempo estimado**: 2 horas

---

## 📝 Resumen de Archivos

### Archivos Nuevos a Crear
1. `src/services/trustlessWorkService.ts`
2. `src/services/trustlessWorkEscrowService.ts` (o `trustlessWorkHttpClient.ts`)
3. `src/hooks/useTrustlessEscrow.ts`
4. `backend_externo/get_trustless_escrow_status.php`
5. `.env.example` (actualizar)

### Archivos a Modificar
1. `src/App.tsx`
2. `src/components/ProposalReview.tsx`
3. `src/components/SuperviseTask.tsx`
4. `src/components/DisputeManagement.tsx`
5. `backend_externo/create_escrow.php`
6. Base de datos (migration SQL)

### Archivos de Configuración
1. `.env` (nuevo, no commitear)
2. `package.json` (verificar dependencias)

---

## ⏱️ Estimación Total de Tiempo

| Fase | Tiempo Estimado |
|------|----------------|
| Fase 1: Preparación | 45 minutos |
| Fase 2: Servicio de Integración | 3 horas |
| Fase 3: Backend | 2.25 horas |
| Fase 4: Frontend - Creación | 3.5 horas |
| Fase 5: Frontend - Supervisión | 2.5 horas |
| Fase 6: Disputas | 4 horas |
| Fase 7: Sincronización | 2 horas |
| Fase 8: Testing | 4 horas |
| Fase 9: Migración | 3.5 horas |
| Fase 10: Monitoreo | 3 horas |
| **TOTAL** | **~29 horas** |

---

## 🎯 Próximos Pasos Inmediatos

1. **Obtener API Key de Trustless Work** (15 min)
2. **Configurar variables de entorno** (15 min)
3. **Crear servicio base** (1 hora)
4. **Probar creación de escrow en testnet** (1 hora)

---

## ⚠️ Consideraciones Importantes

1. **Wallets de Plataforma**: Necesitas crear y fondear wallets para `platformAddress` y `disputeResolver`
2. **API Key**: Mantener segura, no commitear en código
3. **Comisiones**: Verificar fees de Trustless Work
4. **Límites**: Verificar límites de API de Trustless Work
5. **Soporte**: Tener contacto con soporte de Trustless Work por si hay problemas

---

## 📚 Recursos

- [Documentación Trustless Work](https://docs.trustlesswork.com)
- [SDK NPM](https://www.npmjs.com/package/@trustless-work/escrow)
- [API Reference](https://api.trustlesswork.com/docs)

---

**Última actualización**: 2025-01-23
**Versión**: 1.0

