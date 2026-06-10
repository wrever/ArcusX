import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FaGavel, FaEye, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaComments, FaFile, FaClock, FaBolt } from 'react-icons/fa';
import {
  getAdminDisputes,
  getAdminDisputeDetails,
  resolveAdminDispute,
  ensureAdminDispute,
} from '../services/adminService';
import { useWallet } from '../hooks/useWallet';
import { useResolveDispute, useSendTransaction, useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow/hooks';
import { resolveDisputeTrustlessEscrow } from '../services/trustlessWorkEscrowService';
import { USDC_ISSUER } from '../config/usdc';
import { PLATFORM_WALLET } from '../config/trustlessWork';
import {
  assertDisputePayoutsForDecision,
  allocateDisputeSplitAmounts,
  resolveClientRefundWallet,
  resolveDisputePayoutTargets,
  resolveWorkerPayoutWallet,
} from '../utils/disputePartyWallet';
import DisputeChatView from './DisputeChatView';
import DisputeFilesView from './DisputeFilesView';
import DisputeTimelineView from './DisputeTimelineView';
import DisputeCaseView from './DisputeCaseView';
import Popup from './Popup';
import WalletButton from './WalletButton';
import { useI18n } from '../i18n/I18nProvider';
import '../css/AdminPanel.css';

function dedupeAdminDisputes(disputes: any[]): any[] {
  const realByEscrow = new Set<string>();
  const realByTask = new Set<number>();
  for (const d of disputes) {
    if (typeof d.id !== 'number') continue;
    if (d.escrow_id) realByEscrow.add(String(d.escrow_id));
    if (d.task_id) realByTask.add(Number(d.task_id));
  }
  return disputes.filter((d) => {
    if (typeof d.id === 'number') return true;
    if (!String(d.id).startsWith('virtual-')) return true;
    if (d.escrow_id && realByEscrow.has(String(d.escrow_id))) return false;
    if (d.task_id && realByTask.has(Number(d.task_id))) return false;
    return true;
  });
}

function getDisputePanelIds(dispute: {
  id?: number | string;
  task_id?: number | null;
  agreement_id?: string | null;
}) {
  if (typeof dispute?.id === 'number') {
    return {
      disputeId: dispute.id,
      taskId: undefined as number | undefined,
      agreementId: undefined as string | undefined,
    };
  }
  const agreementId = dispute?.agreement_id ? String(dispute.agreement_id).trim() : '';
  if (agreementId) {
    return {
      disputeId: undefined as number | undefined,
      taskId: undefined as number | undefined,
      agreementId,
    };
  }
  const taskId = Number(dispute?.task_id);
  if (Number.isFinite(taskId) && taskId > 0) {
    return {
      disputeId: undefined as number | undefined,
      taskId,
      agreementId: undefined as string | undefined,
    };
  }
  return {
    disputeId: undefined as number | undefined,
    taskId: undefined as number | undefined,
    agreementId: undefined as string | undefined,
  };
}

interface DisputeManagementProps {
  onUpdate?: () => void;
}

function getDisputeEscrowId(dispute: {
  escrow_id?: string | null;
  task_escrow_id?: string | null;
  arcusx_tasks?: { escrow_id?: string | null } | null;
} | null): string | null {
  if (!dispute) return null;
  const raw =
    dispute.escrow_id ??
    dispute.task_escrow_id ??
    dispute.arcusx_tasks?.escrow_id;
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function normalizeDisputeRecord(dispute: any): any {
  if (!dispute) return dispute;
  const task = dispute.arcusx_tasks;
  const deal = dispute.arcusx_agreements;
  const escrowId = getDisputeEscrowId(dispute);
  let resolutionParsed: Record<string, unknown> | null = null;
  const rawResolution = dispute.resolution;
  if (rawResolution && typeof rawResolution === 'object') {
    resolutionParsed = rawResolution as Record<string, unknown>;
  } else if (typeof rawResolution === 'string' && rawResolution.trim()) {
    try {
      const parsed = JSON.parse(rawResolution);
      if (parsed && typeof parsed === 'object') {
        resolutionParsed = parsed as Record<string, unknown>;
      }
    } catch {
      resolutionParsed = { decision: rawResolution };
    }
  }
  return {
    ...dispute,
    escrow_id: escrowId,
    escrow_status: dispute.escrow_status ?? task?.escrow_status ?? null,
    task_title: dispute.task_title ?? task?.title ?? deal?.title ?? null,
    entity_type: dispute.entity_type ?? (dispute.agreement_id ? 'deal' : 'task'),
    resolution_decision:
      dispute.resolution_decision ?? resolutionParsed?.decision ?? null,
    resolution_reason: dispute.resolution_reason ?? resolutionParsed?.reason ?? null,
  };
}

function escrowNeedsOnChainRelease(dispute: any): boolean {
  if (!dispute) return false;
  if (dispute.fundsReleasePending === true) return true;
  if (dispute.funds_release_pending === true) return true;
  if (dispute.trustlessWorkIsDisputed === true && dispute.trustlessWorkIsResolved !== true) {
    return true;
  }
  const escrowSt = String(dispute.escrow_status ?? '').toLowerCase();
  if (
    (escrowSt === 'disputed' || escrowSt === 'pending_dispute_resolution') &&
    dispute.trustlessWorkIsResolved !== true
  ) {
    return true;
  }
  return false;
}

const DisputeManagement: React.FC<DisputeManagementProps> = () => {
  const { t } = useI18n();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupData, setSuccessPopupData] = useState<{ 
    txHash?: string; 
    amount?: number;
    alreadyResolved?: boolean;
    contractId?: string;
    clientWallet?: string;
    workerWallet?: string;
  } | null>(null);
  
  // Filtros y paginación
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'cancelled' | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Vista de detalles
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Resolución on-chain / BD
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState({
    decision: 'client' as 'client' | 'worker' | 'split',
    reason: '',
    refund_percentage: 50
  });

  // Wallet y hooks de Trustless Work
  const { kit, isConnected, address: walletAddress } = useWallet();
  const { resolveDispute } = useResolveDispute();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
  
  // Estado para información del escrow
  const [, setEscrowInfo] = useState<any | null>(null);
  const [, setLoadingEscrowInfo] = useState(false);
  
  // Estado para disputeResolver requerido (para mostrar en el formulario)
  const [requiredDisputeResolver, setRequiredDisputeResolver] = useState<string | null>(null);
  const [payoutWalletPreview, setPayoutWalletPreview] = useState<{
    client: { wallet: string; source: string; isTreasury: boolean } | null;
    worker: { wallet: string; source: string; isTreasury: boolean } | null;
  }>({ client: null, worker: null });
  
  // Estado para tabs del modal de detalles
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'files' | 'timeline'>('summary');

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter, page]);

  useEffect(() => {
    const loadRequiredDisputeResolver = async () => {
      const escrowId = getDisputeEscrowId(selectedDispute);
      if (
        showDetails &&
        activeTab === 'summary' &&
        escrowId?.startsWith('C')
      ) {
        try {
          const escrowData = await getEscrowByContractIds({
            contractIds: [escrowId],
            validateOnChain: true
          });
          const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
          if (escrow?.roles?.disputeResolver) {
            setRequiredDisputeResolver(escrow.roles.disputeResolver);
          } else {
            setRequiredDisputeResolver(null);
          }

          let dbClientWallet: string | null = null;
          let dbWorkerWallet: string | null = null;
          try {
            const { getAdminUserDetails } = await import('../services/adminService');
            if (selectedDispute?.client_id) {
              const clientDetails = await getAdminUserDetails(selectedDispute.client_id);
              dbClientWallet = clientDetails?.wallet_address ?? null;
            }
            if (selectedDispute?.worker_id) {
              const workerDetails = await getAdminUserDetails(selectedDispute.worker_id);
              dbWorkerWallet = workerDetails?.wallet_address ?? null;
            }
          } catch {
            /* optional */
          }

          const taskFunderWallet =
            selectedDispute?.client_funder_wallet ??
            selectedDispute?.arcusx_tasks?.client_funder_wallet ??
            null;
          const proposalWorkerWallet =
            selectedDispute?.worker_payout_wallet ?? null;

          const clientPick = resolveClientRefundWallet({
            escrow,
            taskFunderWallet,
            dbUserWallet: dbClientWallet,
            platformWallet: PLATFORM_WALLET,
          });
          const workerPick = resolveWorkerPayoutWallet({
            escrow,
            proposalWorkerWallet,
            dbUserWallet: dbWorkerWallet,
            platformWallet: PLATFORM_WALLET,
          });

          setPayoutWalletPreview({
            client: clientPick
              ? {
                  wallet: clientPick.wallet,
                  source: clientPick.source,
                  isTreasury: clientPick.isPlatformTreasury,
                }
              : null,
            worker: workerPick
              ? {
                  wallet: workerPick.wallet,
                  source: workerPick.source,
                  isTreasury: workerPick.isPlatformTreasury,
                }
              : null,
          });
        } catch {
          setRequiredDisputeResolver(null);
          setPayoutWalletPreview({ client: null, worker: null });
        }
      } else {
        setRequiredDisputeResolver(null);
        setPayoutWalletPreview({ client: null, worker: null });
      }
    };

    loadRequiredDisputeResolver();
  }, [showDetails, activeTab, selectedDispute?.escrow_id, getEscrowByContractIds]);

  const fetchDisputes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter) {
        params.status = statusFilter;
      }
      const data = await getAdminDisputes(params);
      
      //  MEJORA: Consultar Trustless Work para obtener estados reales de los contratos
      const enrichedDisputes = await enrichDisputesWithTrustlessWorkStatus(data.disputes);
      
      //  MEJORA CRÍTICA: Buscar escrows en disputa desde Trustless Work que NO tienen registro en disputes
      const missingDisputes = await findDisputedEscrowsWithoutDisputeRecord();
      
      // Combinar disputas de BD con disputas encontradas en Trustless Work (sin duplicar)
      const allDisputes = dedupeAdminDisputes([...enrichedDisputes, ...missingDisputes]);
      
      // Ordenar por fecha de creación (más recientes primero)
      allDisputes.sort((a, b) => {
        const dateA = new Date(a.created_at || a.dispute_created_at || 0).getTime();
        const dateB = new Date(b.created_at || b.dispute_created_at || 0).getTime();
        return dateB - dateA;
      });
      
      setDisputes(allDisputes);
      setTotalPages(data.pagination.total_pages);
      setTotal(allDisputes.length);
    } catch (err: any) {
      setError(err.message || t('admin.disputes.error.load'));
    } finally {
      setLoading(false);
    }
  };

  //  MEJORA CRÍTICA: Encontrar escrows en disputa desde Trustless Work que no tienen registro en disputes
  const findDisputedEscrowsWithoutDisputeRecord = async (): Promise<any[]> => {
    try {
      
      // Importar servicios necesarios
      const { getAdminEscrows } = await import('../services/adminService');
      
      // Obtener todos los escrows
      const escrowsData = await getAdminEscrows({ page: 1, limit: 1000 });
      const escrows = escrowsData.escrows || [];
      
      // Filtrar solo escrows de Trustless Work
      const trustlessEscrows = escrows.filter((e: any) => 
        e.escrow_id && typeof e.escrow_id === 'string' && e.escrow_id.startsWith('C')
      );
      
      if (trustlessEscrows.length === 0) {
        return [];
      }
      
      // Obtener escrow_ids únicos
      const escrowIds = trustlessEscrows.map((e: any) => e.escrow_id);
      
      // Consultar Trustless Work para verificar cuáles están en disputa
      const result = await getEscrowByContractIds({ 
        contractIds: escrowIds,
        validateOnChain: true 
      });
      
      const trustlessEscrowsData = Array.isArray(result) ? result : (result as any)?.escrows || [];
      
      // Obtener disputas existentes de BD para comparar
      const { getAdminDisputes } = await import('../services/adminService');
      const existingDisputesData = await getAdminDisputes({ status: undefined, limit: 1000 });
      const existingDisputes = existingDisputesData.disputes || [];
      const existingEscrowIds = new Set(
        existingDisputes
          .map((d: any) => d.escrow_id)
          .filter((id: any): id is string => id && typeof id === 'string'),
      );
      const existingTaskIds = new Set(
        existingDisputes
          .map((d: any) => Number(d.task_id))
          .filter((id: number) => Number.isFinite(id) && id > 0),
      );
      
      // Crear disputas virtuales para escrows en disputa sin registro en BD
      const missingDisputes: any[] = [];
      let disputedCount = 0;
      let noBalanceCount = 0;
      let alreadyInDbCount = 0;
      
      trustlessEscrowsData.forEach((escrow: any) => {
        const contractId = escrow.contractId || escrow.id;
        const flags = escrow.flags || {};
        const isDisputed = flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
        const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true;
        const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
        
        // Log para debug
        if (isDisputed) {
          disputedCount++;
        }
        
        //  CRÍTICO: Crear disputa virtual si:
        // 1. Está en disputa (o fue disputado)
        // 2. No tiene registro en BD
        // 3. Tiene balance > 0 O está resuelto pero sin registro en BD (para poder ver el historial)
        //  IMPORTANTE: Mostrar TODOS los escrows en disputa, incluso si están resueltos, para gestión manual
        // Solo excluir si ya tiene registro en BD
        const escrowInfo = trustlessEscrows.find((e: any) => e.escrow_id === contractId);
        const linkedTaskId = Number(escrowInfo?.task_id);
        const hasDbRecord =
          existingEscrowIds.has(contractId) ||
          (Number.isFinite(linkedTaskId) && linkedTaskId > 0 && existingTaskIds.has(linkedTaskId));

        if (isDisputed && contractId && !hasDbRecord) {
          // Si está resuelto pero sin balance, aún así crear la disputa virtual para que aparezca en gestión
          // Esto permite al admin ver y gestionar todos los escrows que estuvieron en disputa
          const shouldCreate = balance > 0 || isResolved;
          
          if (shouldCreate) {
            //  MEJORA: Incluir también escrows sin información en BD (pueden ser escrows creados directamente)
            // Si no hay escrowInfo, crear disputa virtual con información mínima del escrow desde Trustless Work
            if (escrowInfo || contractId) {
              // Crear disputa virtual con información del escrow y la tarea
              missingDisputes.push({
                id: `virtual-${contractId}`, // ID virtual
                task_id: escrowInfo?.task_id || null,
                task_title: escrowInfo?.task_title || escrow.title || 'Sin título',
                task_price: escrowInfo?.task_price || escrow.amount?.toString() || balance.toString(),
                task_status: escrowInfo?.task_status || 'disputed',
                escrow_id: contractId,
                escrow_status: isResolved ? 'resolved' : 'disputed',
                created_by: escrowInfo?.client_id || escrow.roles?.approver || null,
                created_by_id: escrowInfo?.client_id || null,
                created_by_username: escrowInfo?.client_username || 'Cliente',
                created_by_email: escrowInfo?.client_username ? `${escrowInfo.client_username}@arcusx.pro` : '',
                reason: escrowInfo?.task_id 
                  ? 'Disputa iniciada por cancelación de tarea - Reembolso solicitado'
                  : 'Disputa detectada en el escrow - Requiere resolución manual',
                status: isResolved ? 'resolved' : 'pending',
                created_at: escrowInfo?.escrow_created_at || escrowInfo?.task_created_at || escrow.createdAt || new Date().toISOString(),
                // Información de Trustless Work
                trustlessWorkStatus: isResolved ? 'resolved' : 'disputed',
                trustlessWorkIsDisputed: true,
                trustlessWorkIsResolved: isResolved,
                trustlessWorkBalance: balance,
                trustlessWorkFlags: flags,
                displayStatus: isResolved ? 'resolved' : 'pending',
                escrowRealStatus: isResolved ? 'resolved' : 'disputed',
              // Marcar como disputa virtual (no tiene registro en BD)
              isVirtualDispute: true,
              // Información adicional
              client_username: escrowInfo?.client_username,
              worker_username: escrowInfo?.worker_username,
              client_id: escrowInfo?.client_id,
              worker_id: escrowInfo?.worker_id,
              // Información del escrow desde Trustless Work
              escrowRoles: escrow.roles,
              escrowAmount: escrow.amount,
              escrowDescription: escrow.description
              });
            }
          } else {
            // Escrow en disputa pero sin balance y no resuelto (caso raro)
            noBalanceCount++;
          }
        } else if (isDisputed && hasDbRecord) {
          alreadyInDbCount++;
        }
      });
      
      
      return missingDisputes;
    } catch (err: any) {
      return [];
    }
  };

  //  MEJORA: Enriquecer disputas con estados reales desde Trustless Work
  const enrichDisputesWithTrustlessWorkStatus = async (disputes: any[]): Promise<any[]> => {
    if (!disputes || disputes.length === 0) {
      return disputes;
    }

    // Obtener todos los escrow_ids únicos de las disputas
    const escrowIds: string[] = [];
    const disputeEscrowMap = new Map<number, string>();
    
    disputes.forEach(dispute => {
      const escrowId = getDisputeEscrowId(dispute);
      
      if (escrowId && typeof escrowId === 'string' && escrowId.startsWith('C')) {
        if (!escrowIds.includes(escrowId)) {
          escrowIds.push(escrowId);
        }
        disputeEscrowMap.set(dispute.id, escrowId);
      }
    });

    if (escrowIds.length === 0) {
      // Si no hay escrow_ids, retornar disputas sin enriquecer
      return disputes;
    }

    try {
      // Consultar Trustless Work para obtener estados reales
      const result = await getEscrowByContractIds({ 
        contractIds: escrowIds,
        validateOnChain: true 
      });

      const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      
      // Crear un mapa de escrow_id -> estado real
      const escrowStatusMap = new Map<string, any>();
      escrows.forEach((escrow: any) => {
        const contractId = escrow.contractId || escrow.id;
        if (contractId) {
          const flags = escrow.flags || {};
          const isDisputed = flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
          const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true;
          const isReleased = flags.released === true || escrow.isReleased === true || escrow.released === true;
          const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
          
          escrowStatusMap.set(contractId, {
            isDisputed,
            isResolved,
            isReleased,
            balance,
            flags,
            escrowStatus: determineEscrowStatus(escrow),
            realStatus: isDisputed ? 'disputed' : (isResolved ? 'resolved' : (isReleased ? 'released' : 'active'))
          });
        }
      });

      // Enriquecer cada disputa con el estado real del escrow
      return disputes.map(dispute => {
        const escrowId = disputeEscrowMap.get(dispute.id) || dispute.escrow_id || dispute.task_escrow_id;
        if (escrowId && escrowStatusMap.has(escrowId)) {
          const realStatus = escrowStatusMap.get(escrowId)!;
          
          // Determinar el estado de visualización basado en Trustless Work
          let displayStatus = dispute.status;
          if (realStatus.isDisputed) {
            // Si está en disputa en Trustless Work, mostrar como "pending" (necesita resolución)
            displayStatus = 'pending';
          } else if (realStatus.isResolved) {
            // Si está resuelto en Trustless Work, mostrar como "resolved"
            displayStatus = 'resolved';
          }
          
          return {
            ...dispute,
            escrow_id: escrowId, // Asegurar que tenemos el escrow_id
            // Estado real desde Trustless Work
            trustlessWorkStatus: realStatus.realStatus,
            trustlessWorkIsDisputed: realStatus.isDisputed,
            trustlessWorkIsResolved: realStatus.isResolved,
            trustlessWorkBalance: realStatus.balance,
            trustlessWorkFlags: realStatus.flags,
            // Estado de visualización basado en Trustless Work
            displayStatus,
            // Información adicional
            escrowRealStatus: realStatus.escrowStatus
          };
        }
        // Si no se pudo obtener el estado de Trustless Work, usar el estado de la BD
        return {
          ...dispute,
          displayStatus: dispute.status
        };
      });
    } catch (err: any) {
      // Si falla, retornar disputas sin enriquecer
      return disputes;
    }
  };

  const fetchEscrowInfo = async (contractId: string) => {
    setLoadingEscrowInfo(true);
    try {
      const result = await getEscrowByContractIds({ 
        contractIds: [contractId],
        validateOnChain: true 
      });
      
      const escrows = Array.isArray(result) ? result : (result as any)?.escrows || [];
      if (escrows && escrows.length > 0) {
        const escrow = escrows[0];
        
        // Mapear y enriquecer la información del escrow
        const enrichedEscrow: any = {
          ...escrow,
          // Balance actual
          balance: escrow.balance || escrow.currentBalance || '0',
          // Monto total (amount del escrow)
          amount: escrow.amount || escrow.totalAmount || '0',
          // Milestones
          milestones: escrow.milestones || escrow.milestone || [],
          // Flags del escrow
          flags: escrow.flags || {},
          // Determinar estado real basándose en flags y otros campos
          status: determineEscrowStatus(escrow),
          // Determinar si está activo
          isActive: determineIsActive(escrow),
          // Información de roles
          roles: escrow.roles || {},
          // Información de trustline
          trustline: escrow.trustline || {},
          // Platform fee
          platformFee: escrow.platformFee || escrow.platform_fee,
          // Inconsistencias si existen
          inconsistencies: escrow.inconsistencies || null
        };
        
        setEscrowInfo(enrichedEscrow);
      } else {
        setEscrowInfo(null);
      }
    } catch (err: any) {
      setEscrowInfo(null);
    } finally {
      setLoadingEscrowInfo(false);
    }
  };

  // Función auxiliar para determinar el estado real del escrow
  const determineEscrowStatus = (escrow: any): string => {
    // Si ya tiene un status válido, usarlo
    if (escrow.status && escrow.status !== 'unknown') {
      return escrow.status;
    }
    
    // Determinar estado basándose en flags
    const flags = escrow.flags || {};
    
    if (flags.released === true) {
      return 'released';
    }
    if (flags.disputed === true) {
      return 'disputed';
    }
    if (flags.resolved === true) {
      return 'resolved';
    }
    if (flags.approved === true && flags.released === false) {
      return 'approved';
    }
    
    // Determinar basándose en balance
    const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
    if (balance === 0 && escrow.amount) {
      // Si el balance es 0 pero había un monto, probablemente fue liberado
      return 'released';
    }
    
    // Si tiene amount pero no balance, está activo pero no fondeado
    if (escrow.amount && balance === 0) {
      return 'active';
    }
    
    // Si tiene balance > 0, está activo y fondeado
    if (balance > 0) {
      return 'active';
    }
    
    return 'unknown';
  };

  // Función auxiliar para determinar si el escrow está activo
  const determineIsActive = (escrow: any): boolean => {
    if (escrow.isActive !== undefined) {
      return escrow.isActive !== false;
    }
    
    const flags = escrow.flags || {};
    const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
    
    // Está activo si no está liberado, resuelto o cancelado
    if (flags.released === true || flags.resolved === true) {
      return false;
    }
    
    // Si tiene balance o amount, está activo
    if (balance > 0 || escrow.amount) {
      return true;
    }
    
    return false;
  };

  const attachTrustlessWorkStatus = async (dispute: any): Promise<any> => {
    const normalized = normalizeDisputeRecord(dispute);
    const escrowId = getDisputeEscrowId(normalized);
    if (!escrowId?.startsWith('C')) return normalized;

    try {
      const result = await getEscrowByContractIds({
        contractIds: [escrowId],
        validateOnChain: true,
      });
      const escrow = Array.isArray(result) ? result[0] : (result as any)?.escrows?.[0];
      if (!escrow) return normalized;

      const flags = escrow.flags || {};
      const isDisputed =
        flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
      const isResolved =
        flags.resolved === true || escrow.isResolved === true || escrow.resolved === true;
      const isReleased =
        flags.released === true || escrow.isReleased === true || escrow.released === true;
      const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
      const onChainSettled = isResolved || isReleased;
      const fundsReleasePending = isDisputed && !onChainSettled && balance > 0;

      let displayStatus = normalized.status;
      if (fundsReleasePending || (isDisputed && !onChainSettled)) {
        displayStatus = 'pending';
      } else if (onChainSettled) {
        displayStatus = 'resolved';
      }

      return {
        ...normalized,
        trustlessWorkIsDisputed: isDisputed,
        trustlessWorkIsResolved: onChainSettled,
        trustlessWorkBalance: balance,
        displayStatus,
        fundsReleasePending,
      };
    } catch {
      return normalized;
    }
  };

  const handleViewDetails = async (disputeId: number | string) => {
    setLoadingDetails(true);
    setError(null);
    setEscrowInfo(null);
    try {
      //  MEJORA: Si es una disputa virtual (detectada desde Trustless Work), usar la disputa de la lista
      if (typeof disputeId === 'string' && disputeId.startsWith('virtual-')) {
        const dispute = disputes.find(d => d.id === disputeId);
        if (!dispute) {
          setError(t('admin.disputes.notFound'));
          return;
        }
      const enriched = await attachTrustlessWorkStatus(dispute);
      setSelectedDispute(enriched);
      setShowDetails(true);
        
        // Obtener información del escrow desde Trustless Work y el disputeResolver requerido
        const escrowId = getDisputeEscrowId(enriched);
        if (escrowId?.startsWith('C')) {
          fetchEscrowInfo(escrowId);
          
          // Obtener el disputeResolver requerido
          try {
            const escrowData = await getEscrowByContractIds({ 
              contractIds: [escrowId],
              validateOnChain: true 
            });
            const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
            if (escrow?.roles?.disputeResolver) {
              setRequiredDisputeResolver(escrow.roles.disputeResolver);
            }
          } catch (err) {
          }
        }
      } else {
        // Disputa normal de BD
        const dispute = await attachTrustlessWorkStatus(
          await getAdminDisputeDetails(disputeId as number),
        );
        setSelectedDispute(dispute);
        setShowDetails(true);
        
        const escrowId = getDisputeEscrowId(dispute);
        if (escrowId?.startsWith('C')) {
          fetchEscrowInfo(escrowId);
        }
      }
    } catch (err: any) {
      setError(err.message || t('admin.disputes.error.details'));
    } finally {
      setLoadingDetails(false);
    }
  };

  const persistResolvedDisputeToDb = async (
    txHash: string,
    refundPercentage?: number,
  ) => {
    if (!selectedDispute) return;
    let dbDisputeId: number | null =
      typeof selectedDispute.id === 'number' ? selectedDispute.id : null;
    if (!dbDisputeId && selectedDispute.task_id) {
      try {
        dbDisputeId = await ensureAdminDispute(Number(selectedDispute.task_id));
      } catch {
        /* on-chain ya resuelto; BD opcional */
      }
    }
    if (!dbDisputeId) return;
    try {
      await resolveAdminDispute(dbDisputeId, {
        decision: resolution.decision,
        reason: resolution.reason,
        refund_percentage:
          resolution.decision === 'split' ? refundPercentage ?? resolution.refund_percentage : undefined,
        funds_released_on_chain: true,
        tx_hash: txHash,
      });
    } catch {
      /* on-chain ya resuelto */
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) {
      return;
    }


    setResolving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!resolution.reason.trim()) {
        throw new Error('La razón de la resolución es requerida');
      }

      const resolutionData: any = {
        decision: resolution.decision,
        reason: resolution.reason
      };

      if (resolution.decision === 'split') {
        if (resolution.refund_percentage < 1 || resolution.refund_percentage > 99) {
          throw new Error(
            'El porcentaje al cliente debe estar entre 1 y 99. Para 0% o 100% usa Cliente o Trabajador.',
          );
        }
        resolutionData.refund_percentage = resolution.refund_percentage;
      }

      const contractId = getDisputeEscrowId(selectedDispute);
      //  CRÍTICO: TODAS las disputas con escrow_id de Trustless Work deben usar el flujo nuevo
      if (contractId?.startsWith('C')) {
        if (!isConnected || !walletAddress) {
          throw new Error('Debes conectar tu wallet (Freighter) para resolver disputas y liberar fondos. Por favor, conecta tu wallet e intenta nuevamente.');
        }
        if (!kit) {
          throw new Error('Kit de Stellar no está disponible. Por favor, recarga la página e intenta nuevamente.');
        }
        // Obtener información del escrow para calcular distribuciones y obtener el disputeResolver correcto
        const escrowData = await getEscrowByContractIds({ 
          contractIds: [contractId],
          validateOnChain: true 
        });
        
        const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
        if (!escrow) {
          throw new Error('No se pudo obtener información del escrow');
        }
        
        //  CRÍTICO: Verificar si el escrow ya está resuelto ANTES de intentar resolverlo
        const flags = escrow.flags || {};
        const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true;
        const isReleased = flags.released === true || escrow.isReleased === true || escrow.released === true;
        const isDisputed = flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
        
        //  MEJORA: Si ya está resuelta, mostrar popup de éxito con la información
        if (isResolved || isReleased) {
          const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
          const originalAmount = parseFloat(escrow.amount || '0');
          
          // Obtener información de distribución si está disponible
          let resolvedAmount = originalAmount;
          if (balance === 0 && originalAmount > 0) {
            resolvedAmount = originalAmount; // El monto original que fue distribuido
          }
          
          // Mostrar popup de éxito indicando que ya fue resuelta
          setSuccessPopupData({
            txHash: undefined, // No tenemos el hash de la transacción anterior
            amount: resolvedAmount,
            alreadyResolved: true,
            contractId: contractId
          });
          setShowSuccessPopup(true);
          
          setSuccess(
            ` Esta disputa ya ha sido resuelta anteriormente.\n\n` +
            `El escrow ${contractId} ya fue procesado y los fondos fueron distribuidos.\n` +
            `Estado: ${isResolved ? 'resuelto' : ''} ${isReleased ? 'liberado' : ''}\n` +
            `Monto original del escrow: ${resolvedAmount.toFixed(7)} USDC\n\n` +
            `La disputa fue resuelta exitosamente en una transacción anterior.`
          );
          
          fetchDisputes();
          setResolving(false);
          return; // Salir sin intentar resolver nuevamente
        }
        
        //  CRÍTICO: Verificar que el escrow esté en disputa
        if (!isDisputed) {
          throw new Error(
            ` El escrow no está en disputa.\n\n` +
            `El escrow ${contractId} no está en estado "disputed". ` +
            `Estado actual: ${escrow.status || 'unknown'}\n\n` +
            `Solo se pueden resolver escrows que están en disputa.`
          );
        }
        
        //  CRÍTICO: Usar el disputeResolver configurado en el escrow, NO la wallet conectada
        const escrowDisputeResolver = escrow.roles?.disputeResolver;
        if (!escrowDisputeResolver || !escrowDisputeResolver.startsWith('G')) {
          throw new Error(`No se pudo obtener un disputeResolver válido del escrow. DisputeResolver del escrow: ${escrowDisputeResolver || 'N/A'}`);
        }
        
        //  CRÍTICO: Verificar que la wallet conectada sea el disputeResolver del escrow
        if (walletAddress !== escrowDisputeResolver) {
          throw new Error(
            ` La wallet conectada (${walletAddress}) no es el disputeResolver configurado en el escrow (${escrowDisputeResolver}).\n\n` +
            `Para resolver esta disputa, debes conectar la wallet del disputeResolver: ${escrowDisputeResolver}\n\n` +
            `Por favor, desconecta la wallet actual y conecta la wallet del disputeResolver.`
          );
        }
        
        // Usar el disputeResolver del escrow (que ya verificamos que coincide con la wallet conectada)
        const disputeResolver = escrowDisputeResolver;
        
        const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
        
        //  MEJORA: Validar que el escrow tenga balance antes de continuar
        if (balance <= 0) {
          const flags = escrow.flags || {};
          const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true;
          const isReleased = flags.released === true || escrow.isReleased === true || escrow.released === true;
          
          if (isResolved || isReleased) {
            throw new Error(
              ` El escrow ya ha sido resuelto o los fondos ya han sido liberados.\n\n` +
              `No hay fondos disponibles para distribuir.\n` +
              `Estado del escrow: ${isResolved ? 'resuelto' : ''} ${isReleased ? 'liberado' : ''}\n` +
              `Balance actual: ${balance}`
            );
          } else {
            throw new Error(
              ` El escrow no tiene balance disponible (${balance}).\n\n` +
              `No se pueden distribuir fondos.\n` +
              `Balance del escrow: ${escrow.balance || escrow.currentBalance || '0'}\n\n` +
              `Posibles causas:\n` +
              `- El escrow nunca fue fondeado\n` +
              `- Los fondos ya fueron liberados previamente\n` +
              `- Hay un problema con la sincronización del indexer\n\n` +
              `Verifica el estado del escrow en cadena antes de resolver la disputa.`
            );
          }
        }
        
        let dbClientWallet: string | null = null;
        let dbWorkerWallet: string | null = null;
        try {
          const adminService = await import('../services/adminService');
          if (selectedDispute.client_id) {
            const clientDetails = await adminService.getAdminUserDetails(selectedDispute.client_id);
            dbClientWallet = clientDetails?.wallet_address ?? null;
          }
          if (selectedDispute.worker_id) {
            const workerDetails = await adminService.getAdminUserDetails(selectedDispute.worker_id);
            dbWorkerWallet = workerDetails?.wallet_address ?? null;
          }
        } catch {
          /* perfil opcional */
        }

        const taskFunderWallet =
          selectedDispute.client_funder_wallet ??
          selectedDispute.arcusx_tasks?.client_funder_wallet ??
          null;
        const proposalWorkerWallet =
          selectedDispute.worker_payout_wallet ?? null;

        let payoutTargets;
        try {
          payoutTargets = resolveDisputePayoutTargets({
            escrow,
            taskFunderWallet,
            proposalWorkerWallet,
            dbClientWallet,
            dbWorkerWallet,
            platformWallet: PLATFORM_WALLET,
          });
        } catch {
          throw new Error(
            'No se pudo determinar la wallet del empleador (cliente). ' +
              `Revisa roles del escrow: signer=${escrow.roles?.signer ?? '—'}, approver=${escrow.roles?.approver ?? '—'}`,
          );
        }

        let clientWallet: string;
        let workerWallet: string | null;
        try {
          ({ clientWallet, workerWallet } = assertDisputePayoutsForDecision(
            resolution.decision,
            payoutTargets,
          ));
        } catch (payoutErr: unknown) {
          const code = payoutErr instanceof Error ? payoutErr.message : '';
          if (code === 'CLIENT_TREASURY_BLOCKED') {
            throw new Error(
              t('admin.disputes.resolve.treasuryBlocked')
                .replace('{{wallet}}', payoutTargets.client.wallet)
                .replace('{{platform}}', PLATFORM_WALLET || payoutTargets.client.wallet),
            );
          }
          if (code === 'WORKER_TREASURY_BLOCKED') {
            throw new Error(
              t('admin.disputes.resolve.workerTreasuryBlocked')
                .replace('{{wallet}}', payoutTargets.worker?.wallet ?? '—')
                .replace('{{platform}}', PLATFORM_WALLET || '—'),
            );
          }
          if (code === 'WORKER_WALLET_UNRESOLVED') {
            throw new Error(t('admin.disputes.resolve.workerUnresolved'));
          }
          if (code === 'SAME_CLIENT_WORKER_WALLET') {
            throw new Error(t('admin.disputes.resolve.samePartyWallet'));
          }
          throw payoutErr;
        }
        
        // Calcular montos según la decisión
        let clientAmount = 0;
        let workerAmount = 0;
        
        if (resolution.decision === 'client') {
          clientAmount = balance;
        } else if (resolution.decision === 'worker') {
          workerAmount = balance;
        } else if (resolution.decision === 'split') {
          const refundPercentage = resolution.refund_percentage || 50;
          ({ clientAmount, workerAmount } = allocateDisputeSplitAmounts(
            balance,
            refundPercentage,
          ));
        }
        
        
        // Procesar según la decisión
        if (resolution.decision === 'client' && clientAmount > 0) {
          setSuccess('Preparando transacción de reembolso. Por favor, firma la transacción en Freighter...');
          
          const resolveResult = await resolveDisputeTrustlessEscrow(
            contractId,
            disputeResolver,
            {
              address: clientWallet,
              amount: clientAmount
            },
            kit,
            resolveDispute,
            sendTransaction,
            getEscrowByContractIds
          );
          
          if (resolveResult.success) {
            //  CRÍTICO: Verificar que el escrow realmente esté resuelto en la blockchain antes de actualizar BD
            setSuccess('Verificando que el escrow esté resuelto en la blockchain...');
            
            let escrowResolved = false;
            let verificationAttempts = 0;
            const maxVerificationAttempts = 10; // Intentar hasta 10 veces (30 segundos total)
            
            while (!escrowResolved && verificationAttempts < maxVerificationAttempts) {
              try {
                // Esperar un poco antes de verificar (la blockchain puede tardar en actualizar)
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const escrowData = await getEscrowByContractIds({
                  contractIds: [contractId],
                  validateOnChain: true
                });
                
                const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
                if (escrow) {
                  const flags = escrow.flags || {};
                  const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true || escrow.status === 'resolved';
                  
                  if (isResolved) {
                    escrowResolved = true;
                    break;
              } else {
                    verificationAttempts++;
                  }
                }
              } catch (verifyError: any) {
                verificationAttempts++;
              }
            }
            
            if (!escrowResolved) {
              throw new Error(
                ` ERROR CRÍTICO: La transacción fue enviada pero el escrow NO está resuelto en la blockchain después de ${maxVerificationAttempts} intentos.\n\n` +
                `Esto puede significar que:\n` +
                `1. La transacción no se procesó correctamente\n` +
                `2. Hay un problema con el indexer de escrow\n` +
                `3. La transacción necesita más tiempo para procesarse\n\n` +
                `NO se actualizará el estado en la base de datos hasta que el escrow esté resuelto en la blockchain.\n` +
                `Por favor, verifica manualmente el estado del escrow en cadena.\n\n` +
                `Hash de transacción: ${resolveResult.txHash}`
              );
            }
            
            //  Solo actualizar BD si el escrow está confirmado como resuelto en blockchain
            await persistResolvedDisputeToDb(String(resolveResult.txHash ?? ''));
            
            //  MEJORA CRÍTICA: Mostrar popup de éxito INMEDIATAMENTE cuando la transacción sea exitosa
            setSuccessPopupData({
              txHash: resolveResult.txHash,
              amount: clientAmount
            });
            setShowSuccessPopup(true);
            
            let successMessage = ` Disputa resuelta exitosamente!\n\n`;
            successMessage += ` Monto reembolsado: ${clientAmount.toFixed(7)} USDC\n`;
            successMessage += ` Cliente: ${clientWallet}\n`;
            successMessage += ` Hash de transacción: ${resolveResult.txHash}\n\n`;
            successMessage += ` CONFIRMADO: El escrow está resuelto en la blockchain.\n`;
            successMessage += ` CONFIRMADO: El estado ha sido actualizado en la base de datos.\n\n`;
            
            //  MEJORA: Mostrar información de verificación si está disponible
            if ((resolveResult as any).verificationResult) {
              const verification = (resolveResult as any).verificationResult;
              if (verification.transferFound) {
                successMessage += ` CONFIRMADO: Los fondos fueron transferidos exitosamente a la wallet del cliente.\n\n`;
                
                if (verification.currentBalance !== undefined) {
                  successMessage += ` Balance actual del cliente: ${verification.currentBalance.toFixed(7)} USDC\n`;
                }
                
                successMessage += ` Verificar transacción:\n`;
                if (verification.horizonUrl) {
                  successMessage += `   Horizon: ${verification.horizonUrl}\n`;
                }
                if (verification.stellarExpertUrl) {
                  successMessage += `   Stellar Expert: ${verification.stellarExpertUrl}\n`;
                }
                
                successMessage += `\n INFORMACIÓN IMPORTANTE:\n`;
                successMessage += `   1.  El dinero YA está en tu wallet Stellar (confirmado en blockchain)\n`;
                successMessage += `   2.  Balance actual en blockchain: ${verification.currentBalance?.toFixed(7) || clientAmount.toFixed(7)} USDC\n`;
                successMessage += `   3.  Trustline correcto configurado: USDC:${USDC_ISSUER}\n`;
                successMessage += `   4.  Si Freighter muestra un balance diferente (${verification.currentBalance ? (verification.currentBalance - clientAmount).toFixed(7) : 'N/A'} USDC menos):\n`;
                successMessage += `      - Esto es un problema de sincronización de Freighter\n`;
                successMessage += `      - El dinero ESTÁ en la blockchain, solo no se refleja en Freighter\n`;
                successMessage += `      - Puedes verificar el balance real en Horizon o Stellar Expert\n`;
                successMessage += `   5.  Para verificar el balance real:\n`;
                if (verification.horizonUrl) {
                  successMessage += `      - Horizon: ${verification.horizonUrl.replace('/transactions/', '/accounts/').replace(verification.txHash || '', clientWallet)}\n`;
                }
                if (verification.stellarExpertUrl) {
                  successMessage += `      - Stellar Expert: ${verification.stellarExpertUrl.replace('/tx/', '/account/').replace(verification.txHash || '', clientWallet)}\n`;
                }
                successMessage += `\n CONFIRMADO: La transacción fue exitosa.\n`;
                successMessage += `   El dinero está en la blockchain y puedes usarlo normalmente.\n`;
                successMessage += `   Si Freighter no lo muestra, es solo un problema de visualización.\n`;
                } else {
                successMessage += ` No se pudo verificar la transferencia automáticamente.\n`;
                successMessage += `   Por favor, verifica manualmente en Horizon o Stellar Expert.\n`;
              }
            }
            
            //  MEJORA: Agregar advertencia si el cliente necesita configurar trustline
            if ((resolveResult as any).warning || (resolveResult as any).requiresTrustline) {
              successMessage += `\n\n ADVERTENCIA IMPORTANTE: ${(resolveResult as any).warning || 'El cliente puede necesitar configurar un trustline para USDC'}`;
              successMessage += `\n\nPROBLEMA DETECTADO:`;
              successMessage += `\n   El cliente probablemente tiene un trustline de USDC de centre.io (Mainnet),`;
              successMessage += `\n   pero la transacción usa USDC de Testnet con un issuer diferente.`;
              successMessage += `\n\n SOLUCIÓN: El cliente debe configurar el trustline correcto para Testnet:`;
              successMessage += `\n   1. Abre Freighter y conecta tu wallet: ${clientWallet}`;
              successMessage += `\n   2. Asegúrate de estar en la red TESTNET (no Mainnet)`;
              successMessage += `\n   3. Configura un trustline para USDC con este issuer:`;
              successMessage += `\n      ${USDC_ISSUER}`;
              successMessage += `\n   4. Puedes usar Freighter o Stellar Laboratory para configurar el trustline`;
              successMessage += `\n   5. Una vez configurado, el dinero aparecerá en tu wallet`;
              successMessage += `\n\n Información del trustline requerido:`;
              successMessage += `\n   - Asset: USDC`;
              successMessage += `\n   - Issuer: ${USDC_ISSUER}`;
              successMessage += `\n   - Red: TESTNET (no Mainnet)`;
              successMessage += `\n   - Cliente: ${clientWallet}`;
              successMessage += `\n\n NOTA: Si tienes un trustline de USDC de centre.io (Mainnet),`;
              successMessage += `\n   necesitas configurar UNO NUEVO para Testnet con el issuer correcto.`;
            }
            
            setSuccess(successMessage);
            
            fetchDisputes();
          } else {
            let errorMessage = t('admin.disputes.error.resolve') + ': ' + resolveResult.error;
            if (resolveResult.error?.includes('trustline')) {
              errorMessage += `\n\n El cliente debe configurar un trustline para USDC antes de recibir el dinero.`;
              errorMessage += `\n   Issuer de USDC: ${USDC_ISSUER}`;
              errorMessage += `\n   Cliente: ${clientWallet}`;
            }
            setError(errorMessage);
          }
        } else if (resolution.decision === 'worker' && workerAmount > 0) {
          setSuccess('Preparando transacción de pago. Por favor, firma la transacción en Freighter...');
          
          const resolveResult = await resolveDisputeTrustlessEscrow(
            contractId,
            disputeResolver,
            {
              address: workerWallet!,
              amount: workerAmount
            },
            kit,
            resolveDispute,
            sendTransaction,
            getEscrowByContractIds
          );
          
          if (resolveResult.success) {
            //  CRÍTICO: Verificar que el escrow realmente esté resuelto en la blockchain antes de actualizar BD
            setSuccess('Verificando que el escrow esté resuelto en la blockchain...');
            
            let escrowResolved = false;
            let verificationAttempts = 0;
            const maxVerificationAttempts = 10; // Intentar hasta 10 veces (30 segundos total)
            
            while (!escrowResolved && verificationAttempts < maxVerificationAttempts) {
              try {
                // Esperar un poco antes de verificar (la blockchain puede tardar en actualizar)
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const escrowData = await getEscrowByContractIds({
                  contractIds: [contractId],
                  validateOnChain: true
                });
                
                const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
                if (escrow) {
                  const flags = escrow.flags || {};
                  const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true || escrow.status === 'resolved';
                  
                  if (isResolved) {
                    escrowResolved = true;
                    break;
              } else {
                    verificationAttempts++;
                  }
                }
              } catch (verifyError: any) {
                verificationAttempts++;
              }
            }
            
            if (!escrowResolved) {
              throw new Error(
                ` ERROR CRÍTICO: La transacción fue enviada pero el escrow NO está resuelto en la blockchain después de ${maxVerificationAttempts} intentos.\n\n` +
                `Esto puede significar que:\n` +
                `1. La transacción no se procesó correctamente\n` +
                `2. Hay un problema con el indexer de escrow\n` +
                `3. La transacción necesita más tiempo para procesarse\n\n` +
                `NO se actualizará el estado en la base de datos hasta que el escrow esté resuelto en la blockchain.\n` +
                `Por favor, verifica manualmente el estado del escrow en cadena.\n\n` +
                `Hash de transacción: ${resolveResult.txHash}`
              );
            }
            
            //  Solo actualizar BD si el escrow está confirmado como resuelto en blockchain
            await persistResolvedDisputeToDb(String(resolveResult.txHash ?? ''));
            
            //  MEJORA CRÍTICA: Mostrar popup de éxito INMEDIATAMENTE cuando la transacción sea exitosa
            setSuccessPopupData({
              txHash: resolveResult.txHash,
              amount: workerAmount
            });
            setShowSuccessPopup(true);
            
            const successMessage = ` Disputa resuelta y ${workerAmount.toFixed(7)} USDC pagados al trabajador.\n\n` +
              ` CONFIRMADO: El escrow está resuelto en la blockchain.\n` +
              ` CONFIRMADO: El estado ha sido actualizado en la base de datos.\n\n` +
              `Hash de transacción: ${resolveResult.txHash}`;
            setSuccess(successMessage);
            
            fetchDisputes();
          } else {
            let errorMessage = t('admin.disputes.error.resolve') + ': ' + resolveResult.error;
            if (resolveResult.error?.includes('trustline')) {
              errorMessage += `\n\n El trabajador debe configurar un trustline para USDC antes de recibir el dinero.`;
              errorMessage += `\n   Issuer de USDC: ${USDC_ISSUER}`;
            }
            setError(errorMessage);
          }
        } else if (resolution.decision === 'split') {
          if (!workerWallet) {
            throw new Error(t('admin.disputes.resolve.workerUnresolved'));
          }

          const splitDistributions: Array<{ address: string; amount: number }> = [];
          if (clientAmount > 0) {
            splitDistributions.push({ address: clientWallet, amount: clientAmount });
          }
          if (workerAmount > 0) {
            splitDistributions.push({ address: workerWallet, amount: workerAmount });
          }
          if (splitDistributions.length === 0) {
            throw new Error(t('admin.disputes.error.noFunds'));
          }

          setSuccess(
            `Preparando división (${clientAmount.toFixed(7)} USDC → empleador, ` +
              `${workerAmount.toFixed(7)} USDC → trabajador). ` +
              'Freighter debería pedirte firmar ahora…',
          );

          const splitResult = await resolveDisputeTrustlessEscrow(
            contractId,
            disputeResolver,
            splitDistributions,
            kit,
            resolveDispute,
            sendTransaction,
            getEscrowByContractIds,
          );

          const successMessages: string[] = [];
          const errorMessages: string[] = [];
          let lastTxHash: string | undefined;

          if (splitResult.success) {
            if (clientAmount > 0) {
              successMessages.push(
                `${clientAmount.toFixed(7)} USDC → empleador ${clientWallet.slice(0, 8)}…`,
              );
            }
            if (workerAmount > 0) {
              successMessages.push(
                `${workerAmount.toFixed(7)} USDC → trabajador ${workerWallet.slice(0, 8)}…`,
              );
            }
            lastTxHash = splitResult.txHash;
          } else {
            errorMessages.push(splitResult.error || 'Error al dividir fondos');
          }
          
          if (successMessages.length > 0) {
            //  CRÍTICO: Verificar que el escrow realmente esté resuelto en la blockchain antes de actualizar BD
            setSuccess('Verificando que el escrow esté resuelto en la blockchain...');
            
            let escrowResolved = false;
            let verificationAttempts = 0;
            const maxVerificationAttempts = 10; // Intentar hasta 10 veces (30 segundos total)
            
            while (!escrowResolved && verificationAttempts < maxVerificationAttempts) {
              try {
                // Esperar un poco antes de verificar (la blockchain puede tardar en actualizar)
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const escrowData = await getEscrowByContractIds({
                  contractIds: [contractId],
                  validateOnChain: true
                });
                
                const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
                if (escrow) {
                  const flags = escrow.flags || {};
                  const isResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true || escrow.status === 'resolved';
                  
                  if (isResolved) {
                    escrowResolved = true;
                    break;
                  } else {
                    verificationAttempts++;
                  }
                }
              } catch (verifyError: any) {
                verificationAttempts++;
              }
            }
            
            if (!escrowResolved) {
              throw new Error(
                ` ERROR CRÍTICO: La transacción fue enviada pero el escrow NO está resuelto en la blockchain después de ${maxVerificationAttempts} intentos.\n\n` +
                `Esto puede significar que:\n` +
                `1. La transacción no se procesó correctamente\n` +
                `2. Hay un problema con el indexer de escrow\n` +
                `3. La transacción necesita más tiempo para procesarse\n\n` +
                `NO se actualizará el estado en la base de datos hasta que el escrow esté resuelto en la blockchain.\n` +
                `Por favor, verifica manualmente el estado del escrow en cadena.\n\n` +
                `Hash de transacción: ${lastTxHash || 'N/A'}`
              );
            }
            
            //  Solo actualizar BD si el escrow está confirmado como resuelto en blockchain
            await persistResolvedDisputeToDb(lastTxHash ?? '');
            
            //  MEJORA CRÍTICA: Mostrar popup de éxito INMEDIATAMENTE cuando la transacción sea exitosa
            setSuccessPopupData({
              txHash: lastTxHash,
              amount: balance
            });
            setShowSuccessPopup(true);
            
            const successMessage = ` Disputa resuelta. ${successMessages.join('. ')}\n\n` +
              ` CONFIRMADO: El escrow está resuelto en la blockchain.\n` +
              ` CONFIRMADO: El estado ha sido actualizado en la base de datos.\n\n` +
              `Hash de transacción: ${lastTxHash || 'N/A'}`;
            setSuccess(successMessage);
            
      fetchDisputes();
          } else {
            setError(t('admin.disputes.error.resolve') + ': ' + errorMessages.join('. '));
          }
        } else {
          // Este caso no debería ocurrir si las validaciones anteriores funcionan correctamente
          // Pero si el balance es 0, deberíamos haberlo detectado antes
          if (balance <= 0) {
            throw new Error(
              `El escrow no tiene balance disponible (${balance}). ` +
              `No se pueden distribuir fondos. ` +
              `Balance del escrow: ${escrow.balance || escrow.currentBalance || '0'}. ` +
              `Verifica que el escrow tenga fondos antes de resolver la disputa.`
            );
          }
          throw new Error(
            `No se pudo procesar la resolución. ` +
            `Balance: ${balance}, ` +
            `Decisión: ${resolution.decision}, ` +
            `Monto cliente: ${clientAmount}, ` +
            `Monto trabajador: ${workerAmount}`
          );
        }
        
        return;
      }

      //  CRÍTICO: Si llegamos aquí, la disputa NO tiene escrow_id de Trustless Work
      // Esto significa que es una disputa del sistema antiguo (sin escrow en blockchain)
      // En este caso, solo actualizamos la BD (el sistema antiguo no usa blockchain)
      const legacyEscrowId = getDisputeEscrowId(selectedDispute);
      if (!legacyEscrowId?.startsWith('C')) {
        await resolveAdminDispute(selectedDispute.id, resolutionData);
        setSuccess('Disputa resuelta correctamente');
        fetchDisputes();
        setResolving(false);
        return;
      }

      //  Si llegamos aquí y tiene escrow_id, debería haber sido procesado arriba
      // Si no, hay un error en la lógica - esto NO debería pasar
      throw new Error('Error: La disputa tiene escrow_id pero no fue procesada correctamente. Por favor, recarga la página e intenta nuevamente.');
    } catch (err: any) {
      const raw = err?.message ?? '';
      let errorMessage = raw || t('admin.disputes.error.resolve');
      if (raw === 'SPLIT_PERCENT_INVALID' || raw === 'SPLIT_AMOUNT_TOO_SMALL') {
        errorMessage =
          'No se pudo calcular el split: usa un porcentaje entre 1 y 99 y verifica que el escrow tenga balance.';
      } else if (raw === 'SPLIT_BALANCE_ZERO') {
        errorMessage = 'El escrow no tiene balance para dividir.';
      }
      setError(errorMessage);

      if (
        errorMessage.includes('wallet') ||
        errorMessage.includes('firmar') ||
        errorMessage.includes('sign') ||
        errorMessage.includes('Freighter')
      ) {
        setError(errorMessage + '\n\n' + t('admin.disputes.error.walletHint'));
      }
      window.requestAnimationFrame(() => {
        document.querySelector('.admin-alert.error')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    } finally {
      setResolving(false);
    }
  };

  const resolveHandlerRef = useRef(handleResolve);
  resolveHandlerRef.current = handleResolve;

  const disputeIsPending = (d: any): boolean => {
    if (!d) return false;
    if (String(d.status || '').toLowerCase() === 'cancelled') return false;
    if (escrowNeedsOnChainRelease(d)) return true;
    const st = String(d.displayStatus || d.status || '').toLowerCase();
    if (st === 'cancelled') return false;
    if (st === 'resolved' && d.trustlessWorkIsResolved === true) return false;
    if (d.trustlessWorkIsResolved === true) return false;
    if (d.resolved_at && st === 'resolved') return false;
    return st === 'pending' || !d.resolved_at;
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: { class: 'warning', label: 'Pendiente', icon: <FaExclamationTriangle /> },
      resolved: { class: 'success', label: 'Resuelta', icon: <FaCheckCircle /> },
      cancelled: { class: 'error', label: 'Cancelada', icon: <FaTimesCircle /> }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`badge ${badge.class}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // Función para obtener etiqueta de decisión (reservada para uso futuro)
  // const getDecisionLabel = (decision: string) => {
  //   const labels: any = {
  //     client: { label: 'A favor del Cliente', icon: <FaUser />, color: 'primary' },
  //     worker: { label: 'A favor del Trabajador', icon: <FaUserTie />, color: 'success' },
  //     split: { label: 'División', icon: <FaBalanceScale />, color: 'warning' }
  //   };
  //   return labels[decision] || labels.client;
  // };

  return (
    <div className="admin-section">
      <div className="admin-section-header">
        <div style={{ flex: 1 }}>
        <h2>
          <FaGavel />
          {t('admin.disputes.title')}
        </h2>
        <p>{t('admin.disputes.subtitle')}</p>
          <div style={{
            marginTop: '12px',
            padding: '10px 15px',
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9em',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <FaExclamationTriangle style={{ color: '#ff9800', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#ff9800' }}>{t('common.nota')}</strong> {t('admin.disputes.note')}
            </div>
          </div>
        </div>
        <div style={{ marginLeft: '20px' }}>
          <WalletButton />
        </div>
      </div>

      {/* Filtros */}
      <div className="admin-filters">
        <div className="filter-group">
          <label>{t('admin.disputes.filter.label')}</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">{t('admin.disputes.filter.all')}</option>
            <option value="pending">{t('admin.disputes.filter.pending')}</option>
            <option value="resolved">{t('admin.disputes.filter.resolved')}</option>
            <option value="cancelled">{t('admin.disputes.filter.cancelled')}</option>
          </select>
        </div>
        <div className="filter-info">
          <span>{t('admin.disputes.total').replace('{{n}}', String(total))}</span>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="admin-alert error">
          <FaExclamationTriangle />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="admin-alert success">
          <FaCheckCircle />
          <span>{success}</span>
        </div>
      )}

      {/* Lista de disputas */}
      {loading ? (
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>{t('admin.disputes.loading')}</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="admin-empty">
          <FaGavel />
          <p>{t('admin.disputes.empty')}{statusFilter ? ` ${statusFilter}` : ''}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.disputes.th.id')}</th>
                  <th>{t('admin.disputes.th.task')}</th>
                  <th>{t('admin.disputes.th.createdBy')}</th>
                  <th>{t('admin.disputes.th.status')}</th>
                  <th>{t('admin.disputes.th.date')}</th>
                  <th>{t('admin.disputes.th.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {disputes
                  .filter(dispute => {
                    //  MEJORA: Filtrar basándose en el estado real de Trustless Work
                    if (!statusFilter) return true;
                    
                    //  CRÍTICO: Las disputas virtuales siempre deben aparecer si están pendientes
                    if (dispute.isVirtualDispute && statusFilter === 'pending') {
                      return true; // Siempre mostrar disputas virtuales cuando se filtran pendientes
                    }
                    
                    // Si tiene estado de Trustless Work, usar ese para filtrar
                    if (dispute.trustlessWorkIsDisputed !== undefined) {
                      if (statusFilter === 'pending') {
                        // Para pendientes, incluir si está en disputa Y no está resuelto
                        return dispute.trustlessWorkIsDisputed === true && dispute.trustlessWorkIsResolved !== true;
                      }
                      if (statusFilter === 'resolved') {
                        return dispute.trustlessWorkIsResolved === true;
                      }
                    }
                    
                    // Fallback al estado de la BD
                    return dispute.displayStatus === statusFilter || dispute.status === statusFilter;
                  })
                  .map((dispute) => (
                  <tr key={dispute.id}>
                    <td>
                      {dispute.isVirtualDispute ? (
                        <span style={{ fontSize: '0.85em', color: '#ff9800', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Disputa detectada desde el escrow en cadena">
                          <FaBolt /> {dispute.id.replace('virtual-', '').substring(0, 8)}...
                        </span>
                      ) : (
                        dispute.id
                      )}
                    </td>
                    <td>
                      <div>
                        <strong>
                          {dispute.agreement_id
                            ? `Deal ${String(dispute.agreement_id).slice(0, 8)}…`
                            : `#${dispute.task_id}`}
                        </strong>
                        {dispute.entity_type === 'deal' && (
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '0.75em',
                            padding: '2px 6px',
                            background: 'rgba(16, 221, 136, 0.15)',
                            borderRadius: '4px',
                            color: '#10dd88',
                          }}>
                            Deal
                          </span>
                        )}
                        {dispute.isVirtualDispute && (
                          <span style={{ 
                            marginLeft: '8px',
                            fontSize: '0.75em',
                            padding: '2px 6px',
                            background: 'rgba(255, 152, 0, 0.2)',
                            borderRadius: '4px',
                            color: '#ff9800'
                          }}>
                             {t('admin.disputes.fromTrustless')}
                          </span>
                        )}
                        <div className="text-muted">{dispute.task_title || t('admin.disputes.noTitle')}</div>
                        {dispute.task_price && (
                          <small>{parseFloat(dispute.task_price).toFixed(2)} USDC</small>
                        )}
                        {getDisputeEscrowId(dispute) && (
                          <div style={{ fontSize: '0.75em', color: '#666', marginTop: '2px' }}>
                            Escrow: {getDisputeEscrowId(dispute)!.substring(0, 8)}...
                          </div>
                        )}
                        {/*  MEJORA: Mensaje especial para disputas por cancelación */}
                        {((dispute.reason && (
                          dispute.reason.toLowerCase().includes('cancelación') || 
                          dispute.reason.toLowerCase().includes('cancelacion') ||
                          dispute.reason.toLowerCase().includes('reembolso solicitado')
                        )) || dispute.isVirtualDispute) && (
                          <div style={{ 
                            fontSize: '0.75em', 
                            color: '#ff9800', 
                            marginTop: '4px',
                            padding: '2px 6px',
                            background: 'rgba(255, 152, 0, 0.1)',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            <FaTimesCircle aria-hidden="true" /> {t('admin.disputes.cancellationDispute')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div>{dispute.created_by_username || t('admin.disputes.userId').replace('{{id}}', String(dispute.created_by))}</div>
                        <small className="text-muted">{dispute.created_by_email}</small>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(dispute.displayStatus || dispute.status)}
                      {dispute.trustlessWorkStatus && (
                        <div className="text-muted" style={{ fontSize: '0.85em', marginTop: '4px' }}>
                          <small>
                             On-chain: <strong>{dispute.trustlessWorkStatus}</strong>
                            {dispute.trustlessWorkBalance !== undefined && (
                              <> | {dispute.trustlessWorkBalance.toFixed(7)} USDC</>
                            )}
                          </small>
                        </div>
                      )}
                    </td>
                    <td>{new Date(dispute.created_at).toLocaleString('es-ES')}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(dispute.id)}
                        className="admin-button small"
                        title={t('admin.disputes.viewDetails')}
                      >
                        <FaEye />
                        {t('admin.disputes.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="admin-button secondary"
              >
                {t('freelancers.pagination.previous')}
              </button>
              <span>
                {t('admin.disputes.page').replace('{{page}}', String(page)).replace('{{total}}', String(totalPages))}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="admin-button secondary"
              >
                {t('freelancers.pagination.next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de detalles - Renderizado fuera del contenedor usando Portal */}
      {showDetails && selectedDispute && createPortal(
        <div className="admin-modal-overlay dispute-modal-overlay" onClick={() => {
          setShowDetails(false);
          setSelectedDispute(null);
          setEscrowInfo(null);
          setResolution({ decision: 'client', reason: '', refund_percentage: 50 });
          setActiveTab('summary');
        }}>
          <div className="admin-modal dispute-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                <FaGavel />
                Detalles de la Disputa #{selectedDispute.id}
              </h3>
              <button
                className="admin-modal-close"
                onClick={() => {
                  setShowDetails(false);
                  setSelectedDispute(null);
                  setEscrowInfo(null);
                  setResolution({ decision: 'client', reason: '', refund_percentage: 50 });
                  setActiveTab('summary');
                }}
              >
                ×
              </button>
            </div>

            {loadingDetails ? (
              <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Cargando detalles...</p>
              </div>
            ) : (
              <div className="admin-modal-content">
                {/* Sistema de Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '0 0 20px 0',
                  borderBottom: '2px solid rgba(16, 221, 136, 0.2)',
                  marginBottom: '20px'
                }}>
                  <button
                    onClick={() => setActiveTab('summary')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'summary' 
                        ? 'linear-gradient(90deg, #10dd88, #0ab86a)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'summary' ? 'transparent' : 'rgba(16, 221, 136, 0.3)'}`,
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'summary') {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'summary') {
                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                      }
                    }}
                  >
                    <FaGavel />
                    Resumen
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('chat')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'chat' 
                        ? 'linear-gradient(90deg, #10dd88, #0ab86a)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'chat' ? 'transparent' : 'rgba(16, 221, 136, 0.3)'}`,
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'chat') {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'chat') {
                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                      }
                    }}
                  >
                    <FaComments />
                    Chat
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('files')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'files' 
                        ? 'linear-gradient(90deg, #10dd88, #0ab86a)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'files' ? 'transparent' : 'rgba(16, 221, 136, 0.3)'}`,
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'files') {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'files') {
                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                      }
                    }}
                  >
                    <FaFile />
                    Archivos
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('timeline')}
                    style={{
                      padding: '12px 24px',
                      background: activeTab === 'timeline' 
                        ? 'linear-gradient(90deg, #10dd88, #0ab86a)'
                        : 'rgba(255, 255, 255, 0.1)',
                      border: `1px solid ${activeTab === 'timeline' ? 'transparent' : 'rgba(16, 221, 136, 0.3)'}`,
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      if (activeTab !== 'timeline') {
                        e.currentTarget.style.background = 'var(--bg-hover)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'timeline') {
                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                      }
                    }}
                  >
                    <FaClock />
                    Timeline
                  </button>
                </div>

                {/* Contenido de los tabs */}
                {activeTab === 'summary' && selectedDispute && (
                  <>
                    <DisputeCaseView dispute={selectedDispute} />
                    {!disputeIsPending(selectedDispute) ? (
                      <div className="dispute-resolve-panel dispute-resolve-panel--closed">
                        <h4 className="dispute-resolve-panel-title">{t('admin.disputes.resolve.closedTitle')}</h4>
                        <p className="dispute-resolve-intro">{t('admin.disputes.resolve.closedBody')}</p>
                      </div>
                    ) : (
                      <form
                        className="dispute-resolve-panel"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void resolveHandlerRef.current(e);
                        }}
                      >
                        <h4 className="dispute-resolve-panel-title">
                          <FaBolt aria-hidden /> {t('admin.disputes.resolve.title')}
                        </h4>
                        <p className="dispute-resolve-intro">{t('admin.disputes.resolve.intro')}</p>

                        {selectedDispute.resolved_at && escrowNeedsOnChainRelease(selectedDispute) && (
                          <div
                            className="admin-alert warning dispute-resolve-wallet-msg"
                            style={{ marginBottom: '16px' }}
                          >
                            <FaExclamationTriangle aria-hidden />
                            <span>{t('admin.disputes.resolve.onChainPending')}</span>
                          </div>
                        )}

                        {payoutWalletPreview.client &&
                          (resolution.decision === 'client' || resolution.decision === 'split') && (
                          <div
                            className={`admin-alert ${payoutWalletPreview.client.isTreasury ? 'error' : 'success'} dispute-resolve-wallet-msg`}
                            style={{ marginBottom: '12px' }}
                          >
                            {payoutWalletPreview.client.isTreasury ? (
                              <FaExclamationTriangle aria-hidden />
                            ) : (
                              <FaCheckCircle aria-hidden />
                            )}
                            <span>
                              {t('admin.disputes.resolve.refundDestination')
                                .replace('{{wallet}}', payoutWalletPreview.client.wallet)
                                .replace('{{source}}', payoutWalletPreview.client.source)}
                            </span>
                          </div>
                        )}

                        {payoutWalletPreview.worker &&
                          (resolution.decision === 'worker' || resolution.decision === 'split') && (
                          <div
                            className={`admin-alert ${payoutWalletPreview.worker.isTreasury ? 'error' : 'success'} dispute-resolve-wallet-msg`}
                            style={{ marginBottom: '12px' }}
                          >
                            {payoutWalletPreview.worker.isTreasury ? (
                              <FaExclamationTriangle aria-hidden />
                            ) : (
                              <FaCheckCircle aria-hidden />
                            )}
                            <span>
                              {t('admin.disputes.resolve.workerDestination')
                                .replace('{{wallet}}', payoutWalletPreview.worker.wallet)
                                .replace('{{source}}', payoutWalletPreview.worker.source)}
                            </span>
                          </div>
                        )}

                        {getDisputeEscrowId(selectedDispute)?.startsWith('C') && (
                          <>
                            <p className="dispute-resolve-wallet-line">{t('admin.disputes.resolve.walletRequired')}</p>
                            {requiredDisputeResolver &&
                              walletAddress &&
                              walletAddress === requiredDisputeResolver && (
                                <div className="admin-alert success dispute-resolve-wallet-msg">
                                  <FaCheckCircle aria-hidden />
                                  <span>{t('admin.disputes.resolve.walletMatch')}</span>
                                </div>
                              )}
                            {requiredDisputeResolver &&
                              walletAddress &&
                              walletAddress !== requiredDisputeResolver && (
                                <div className="admin-alert error dispute-resolve-wallet-msg">
                                  <FaExclamationTriangle aria-hidden />
                                  <span>
                                    {t('admin.disputes.resolve.walletMismatch')
                                      .replace('{{connected}}', walletAddress)
                                      .replace('{{required}}', requiredDisputeResolver)}
                                  </span>
                                </div>
                              )}
                          </>
                        )}

                        {!getDisputeEscrowId(selectedDispute)?.startsWith('C') && (
                          <div
                            className="dispute-resolve-legacy"
                            style={{
                              padding: '12px',
                              marginBottom: '16px',
                              borderRadius: '8px',
                              background: 'rgba(255, 152, 0, 0.12)',
                              border: '1px solid rgba(255, 152, 0, 0.35)',
                              fontSize: '0.9rem'
                            }}
                          >
                            {t('admin.disputes.resolve.legacyNote')}
                          </div>
                        )}

                        <div className="dispute-resolve-field">
                          <span className="dispute-resolve-label">{t('admin.disputes.resolve.decisionLabel')}</span>
                          <div className="dispute-resolve-options">
                            <label className={resolution.decision === 'client' ? 'is-active' : ''}>
                              <input
                                type="radio"
                                name="resolve-decision"
                                checked={resolution.decision === 'client'}
                                onChange={() =>
                                  setResolution((r) => ({ ...r, decision: 'client' }))
                                }
                              />
                              {t('admin.disputes.resolve.option.client')}
                            </label>
                            <label className={resolution.decision === 'worker' ? 'is-active' : ''}>
                              <input
                                type="radio"
                                name="resolve-decision"
                                checked={resolution.decision === 'worker'}
                                onChange={() =>
                                  setResolution((r) => ({ ...r, decision: 'worker' }))
                                }
                              />
                              {t('admin.disputes.resolve.option.worker')}
                            </label>
                            <label className={resolution.decision === 'split' ? 'is-active' : ''}>
                              <input
                                type="radio"
                                name="resolve-decision"
                                checked={resolution.decision === 'split'}
                                onChange={() =>
                                  setResolution((r) => ({ ...r, decision: 'split' }))
                                }
                              />
                              {t('admin.disputes.resolve.option.split')}
                            </label>
                          </div>
                        </div>

                        {resolution.decision === 'split' && (
                          <div className="dispute-resolve-field">
                            <label className="dispute-resolve-label" htmlFor="refund-pct">
                              {t('admin.disputes.resolve.refundPctLabel')}
                            </label>
                            <input
                              id="refund-pct"
                              type="number"
                              min={1}
                              max={99}
                              className="dispute-resolve-number"
                              value={resolution.refund_percentage}
                              onChange={(e) =>
                                setResolution((r) => ({
                                  ...r,
                                  refund_percentage: Math.min(
                                    99,
                                    Math.max(1, parseInt(e.target.value, 10) || 50)
                                  )
                                }))
                              }
                            />
                            <p className="dispute-resolve-hint">{t('admin.disputes.resolve.splitHint')}</p>
                          </div>
                        )}

                        <div className="dispute-resolve-field">
                          <label className="dispute-resolve-label" htmlFor="resolve-reason">
                            {t('admin.disputes.resolve.reasonLabel')}
                          </label>
                          <textarea
                            id="resolve-reason"
                            required
                            rows={4}
                            className="dispute-resolve-textarea"
                            value={resolution.reason}
                            placeholder={t('admin.disputes.resolve.reasonPlaceholder')}
                            onChange={(e) =>
                              setResolution((r) => ({ ...r, reason: e.target.value }))
                            }
                          />
                        </div>

                        <button
                          type="submit"
                          className="admin-button primary"
                          disabled={resolving}
                          style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                        >
                          {resolving ? t('admin.disputes.resolve.submitting') : t('admin.disputes.resolve.submit')}
                        </button>
                      </form>
                    )}
                  </>
                )}

                {activeTab === 'chat' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeChatView {...getDisputePanelIds(selectedDispute)} />
                  </div>
                )}

                {activeTab === 'files' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeFilesView {...getDisputePanelIds(selectedDispute)} />
                  </div>
                )}

                {activeTab === 'timeline' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeTimelineView {...getDisputePanelIds(selectedDispute)} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Popup de éxito al resolver disputa - Renderizado con Portal para aparecer sobre el modal */}
      {showSuccessPopup && createPortal(
        <Popup
          isOpen={showSuccessPopup}
          onClose={() => {
            setShowSuccessPopup(false);
            fetchDisputes();
            setShowDetails(false);
            setSelectedDispute(null);
          }}
          type="success"
          title={successPopupData?.alreadyResolved ? t('dispute.resolved.already') : t('dispute.resolved.success')}
          message={
            successPopupData
              ? successPopupData.alreadyResolved
                ? `Esta disputa ya fue resuelta anteriormente.\n\n` +
                  `El escrow ${successPopupData.contractId ? successPopupData.contractId.substring(0, 8) + '...' : 'N/A'} ya fue procesado y los fondos fueron distribuidos.\n` +
                  `Monto del escrow: ${successPopupData.amount?.toFixed(7) || '0'} USDC\n\n` +
                  `La disputa fue resuelta exitosamente en una transacción anterior.`
                : ` La disputa ha sido resuelta correctamente en la blockchain.\n\n` +
                  ` Monto reembolsado: ${successPopupData.amount?.toFixed(7) || '0'} USDC\n` +
                  ` Hash de transacción: ${successPopupData.txHash || 'N/A'}\n\n` +
                  ` CONFIRMADO: El escrow está resuelto en la blockchain.\n` +
                  ` CONFIRMADO: El estado ha sido actualizado en la base de datos.\n\n` +
                  `Los fondos han sido transferidos exitosamente.`
              : 'La disputa ha sido resuelta correctamente.'
          }
          buttonText="Volver"
          onButtonClick={() => {
            setShowSuccessPopup(false);
            fetchDisputes();
            setShowDetails(false);
            setSelectedDispute(null);
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default DisputeManagement;

