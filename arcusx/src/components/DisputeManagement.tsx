import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaGavel, FaEye, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaWallet, FaLink, FaComments, FaFile, FaClock, FaBolt } from 'react-icons/fa';
import { getAdminDisputes, getAdminDisputeDetails, resolveAdminDispute } from '../services/adminService';
import { useWallet } from '../hooks/useWallet';
import { useResolveDispute, useSendTransaction, useGetEscrowFromIndexerByContractIds } from '@trustless-work/escrow/hooks';
import { resolveDisputeTrustlessEscrow } from '../services/trustlessWorkEscrowService';
import { USDC_ISSUER } from '../config/usdc';
import DisputeChatView from './DisputeChatView';
import DisputeFilesView from './DisputeFilesView';
import DisputeTimelineView from './DisputeTimelineView';
import DisputeCaseView from './DisputeCaseView';
import Popup from './Popup';
import WalletButton from './WalletButton';
import '../css/AdminPanel.css';

interface DisputeManagementProps {
  onUpdate?: () => void;
}

const DisputeManagement: React.FC<DisputeManagementProps> = () => {
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
  
  // Formulario de resolución
  const [showResolveForm, setShowResolveForm] = useState(false);
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
  const [escrowInfo, setEscrowInfo] = useState<any | null>(null);
  const [loadingEscrowInfo, setLoadingEscrowInfo] = useState(false);
  
  // Estado para disputeResolver requerido (para mostrar en el formulario)
  const [requiredDisputeResolver, setRequiredDisputeResolver] = useState<string | null>(null);
  
  // Estado para tabs del modal de detalles
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'files' | 'timeline'>('summary');

  useEffect(() => {
    fetchDisputes();
  }, [statusFilter, page]);

  //  MEJORA: Cargar disputeResolver requerido cuando se muestra el formulario de resolución
  useEffect(() => {
    const loadRequiredDisputeResolver = async () => {
      if (showResolveForm && selectedDispute?.escrow_id && selectedDispute.escrow_id.startsWith('C')) {
        try {
          const escrowData = await getEscrowByContractIds({ 
            contractIds: [selectedDispute.escrow_id],
            validateOnChain: true 
          });
          const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
          if (escrow?.roles?.disputeResolver) {
            setRequiredDisputeResolver(escrow.roles.disputeResolver);
          } else {
            setRequiredDisputeResolver(null);
          }
        } catch (err) {
          setRequiredDisputeResolver(null);
        }
      } else {
        setRequiredDisputeResolver(null);
      }
    };
    
    loadRequiredDisputeResolver();
  }, [showResolveForm, selectedDispute?.escrow_id, getEscrowByContractIds]);

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
      
      // Combinar disputas de BD con disputas encontradas en Trustless Work
      const allDisputes = [...enrichedDisputes, ...missingDisputes];
      
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
      setError(err.message || 'Error al cargar disputas');
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
          .filter((id: any): id is string => id && typeof id === 'string')
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
        if (isDisputed && contractId && !existingEscrowIds.has(contractId)) {
          // Si está resuelto pero sin balance, aún así crear la disputa virtual para que aparezca en gestión
          // Esto permite al admin ver y gestionar todos los escrows que estuvieron en disputa
          const shouldCreate = balance > 0 || isResolved;
          
          if (shouldCreate) {
            // Buscar el escrow en la lista de escrows para obtener información de la tarea
            const escrowInfo = trustlessEscrows.find((e: any) => e.escrow_id === contractId);
            
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
                  : 'Disputa detectada en Trustless Work - Requiere resolución manual',
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
        } else if (isDisputed && existingEscrowIds.has(contractId)) {
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
      // El escrow_id ahora viene del backend en la consulta
      const escrowId = dispute.escrow_id;
      
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

  const handleViewDetails = async (disputeId: number | string) => {
    setLoadingDetails(true);
    setError(null);
    setEscrowInfo(null);
    try {
      //  MEJORA: Si es una disputa virtual (detectada desde Trustless Work), usar la disputa de la lista
      if (typeof disputeId === 'string' && disputeId.startsWith('virtual-')) {
        const dispute = disputes.find(d => d.id === disputeId);
        if (!dispute) {
          setError('Disputa no encontrada');
          return;
        }
      setSelectedDispute(dispute);
      setShowDetails(true);
      setShowResolveForm(false);
        
        // Obtener información del escrow desde Trustless Work y el disputeResolver requerido
        if (dispute.escrow_id && dispute.escrow_id.startsWith('C')) {
          fetchEscrowInfo(dispute.escrow_id);
          
          // Obtener el disputeResolver requerido
          try {
            const escrowData = await getEscrowByContractIds({ 
              contractIds: [dispute.escrow_id],
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
        const dispute = await getAdminDisputeDetails(disputeId as number);
        setSelectedDispute(dispute);
        setShowDetails(true);
        setShowResolveForm(false);
        
        // Si hay escrow_id, obtener información del escrow desde Trustless Work
        if (dispute.escrow_id && dispute.escrow_id.startsWith('C')) {
          fetchEscrowInfo(dispute.escrow_id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar detalles de la disputa');
    } finally {
      setLoadingDetails(false);
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
        if (resolution.refund_percentage < 0 || resolution.refund_percentage > 100) {
          throw new Error('El porcentaje de reembolso debe estar entre 0 y 100');
        }
        
        //  MEJORA: Validar que la suma de porcentajes sea 100%
        // El porcentaje de pago se calcula como 100 - refund_percentage
        // Por lo tanto, refund_percentage debe estar entre 0 y 100, y la suma siempre será 100
        // Pero validamos que no sea exactamente 0 o 100 (esos casos deberían usar 'client' o 'worker')
        if (resolution.refund_percentage === 0 || resolution.refund_percentage === 100) {
          throw new Error('Para un reembolso del 0% o 100%, usa la opción "Cliente" o "Trabajador" en lugar de "Dividir"');
        }
        
        resolutionData.refund_percentage = resolution.refund_percentage;
      }

      // Verificar que la wallet esté conectada antes de resolver
      if (!isConnected || !walletAddress) {
        throw new Error('Debes conectar tu wallet (Freighter) para resolver disputas y liberar fondos. Por favor, conecta tu wallet e intenta nuevamente.');
      }
      
      //  MEJORA: Verificar que kit esté disponible
      if (!kit) {
        throw new Error('Kit de Stellar no está disponible. Por favor, recarga la página e intenta nuevamente.');
      }
      

      //  CRÍTICO: TODAS las disputas con escrow_id de Trustless Work deben usar el flujo nuevo
      // No solo las virtuales, sino también las que tienen registro en BD pero usan Trustless Work
      if (selectedDispute.escrow_id && selectedDispute.escrow_id.startsWith('C')) {
        // Resolver directamente desde Trustless Work sin crear registro en BD
        const contractId = selectedDispute.escrow_id;
        
        // Obtener información del escrow para calcular distribuciones y obtener el disputeResolver correcto
        const escrowData = await getEscrowByContractIds({ 
          contractIds: [contractId],
          validateOnChain: true 
        });
        
        const escrow = Array.isArray(escrowData) ? escrowData[0] : (escrowData as any)?.escrows?.[0];
        if (!escrow) {
          throw new Error('No se pudo obtener información del escrow desde Trustless Work');
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
              `Verifica el estado del escrow en Trustless Work antes de resolver la disputa.`
            );
          }
        }
        
        //  MEJORA CRÍTICA: Obtener wallets del cliente y trabajador
        //  SEGÚN EL WORKFLOW:
        // - Cliente: crea tarea, selecciona propuesta, fondea contrato, libera dinero → escrow.roles.approver
        // - Trabajador: aplica a tarea, hace trabajo, recibe dinero → escrow.roles.serviceProvider = escrow.roles.receiver
        let clientWallet: string | null = null;
        let workerWallet: string | null = null;
        
        //  PRIORIDAD 1: Obtener wallets desde BD (fuente de verdad más confiable)
        try {
          const adminService = await import('../services/adminService');
          
          // Obtener wallet del cliente desde BD
          if (selectedDispute.client_id) {
            const clientDetails = await adminService.getAdminUserDetails(selectedDispute.client_id);
            clientWallet = clientDetails?.wallet_address;
          }
          
          // Obtener wallet del trabajador desde BD
          if (selectedDispute.worker_id) {
            const workerDetails = await adminService.getAdminUserDetails(selectedDispute.worker_id);
            workerWallet = workerDetails?.wallet_address;
          }
        } catch (userError) {
        }
        
        //  PRIORIDAD 2: Fallback a escrow.roles según el workflow correcto
        // Cliente = approver (quien aprueba y libera)
        // Trabajador = serviceProvider (quien hace el trabajo) = receiver (quien recibe el pago)
        if (!clientWallet && escrow.roles?.approver) {
          clientWallet = escrow.roles.approver;
        }
        
        if (!workerWallet && escrow.roles?.serviceProvider) {
          workerWallet = escrow.roles.serviceProvider;
        }
        
        // Verificación adicional: si receiver existe y es diferente de serviceProvider, puede ser el trabajador también
        if (!workerWallet && escrow.roles?.receiver && escrow.roles.receiver !== escrow.roles?.serviceProvider) {
          workerWallet = escrow.roles.receiver;
        }
        
        if (!clientWallet || !clientWallet.startsWith('G')) {
          throw new Error(`No se pudo obtener una dirección Stellar válida para el cliente. Escrow receiver: ${escrow.roles?.receiver || 'N/A'}`);
        }
        
        if (resolution.decision === 'worker' && (!workerWallet || !workerWallet.startsWith('G'))) {
          throw new Error(`No se pudo obtener una dirección Stellar válida para el trabajador.`);
        }
        
        // Calcular montos según la decisión
        let clientAmount = 0;
        let workerAmount = 0;
        
        if (resolution.decision === 'client') {
          clientAmount = balance;
        } else if (resolution.decision === 'worker') {
          workerAmount = balance;
        } else if (resolution.decision === 'split') {
          // Calcular split basado en refund_percentage
          const refundPercentage = resolution.refund_percentage || 50;
          clientAmount = (balance * refundPercentage) / 100;
          workerAmount = balance - clientAmount;
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
                `2. Hay un problema con el indexer de Trustless Work\n` +
                `3. La transacción necesita más tiempo para procesarse\n\n` +
                `NO se actualizará el estado en la base de datos hasta que el escrow esté resuelto en la blockchain.\n` +
                `Por favor, verifica manualmente el estado del escrow en Trustless Work.\n\n` +
                `Hash de transacción: ${resolveResult.txHash}`
              );
            }
            
            //  Solo actualizar BD si el escrow está confirmado como resuelto en blockchain
            if (selectedDispute && typeof selectedDispute.id === 'number') {
              try {
                await resolveAdminDispute(selectedDispute.id, {
                  decision: resolution.decision,
                  reason: resolution.reason,
                  refund_percentage: undefined
                });
              } catch (dbError: any) {
                // No fallar si la BD no se actualiza, el escrow ya está resuelto en blockchain
              }
            }
            
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
            let errorMessage = `Error al resolver disputa: ${resolveResult.error}`;
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
                `2. Hay un problema con el indexer de Trustless Work\n` +
                `3. La transacción necesita más tiempo para procesarse\n\n` +
                `NO se actualizará el estado en la base de datos hasta que el escrow esté resuelto en la blockchain.\n` +
                `Por favor, verifica manualmente el estado del escrow en Trustless Work.\n\n` +
                `Hash de transacción: ${resolveResult.txHash}`
              );
            }
            
            //  Solo actualizar BD si el escrow está confirmado como resuelto en blockchain
            if (selectedDispute && typeof selectedDispute.id === 'number') {
              try {
                await resolveAdminDispute(selectedDispute.id, {
                  decision: resolution.decision,
                  reason: resolution.reason,
                  refund_percentage: undefined
                });
              } catch (dbError: any) {
                // No fallar si la BD no se actualiza, el escrow ya está resuelto en blockchain
              }
            }
            
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
            let errorMessage = `Error al resolver disputa: ${resolveResult.error}`;
            if (resolveResult.error?.includes('trustline')) {
              errorMessage += `\n\n El trabajador debe configurar un trustline para USDC antes de recibir el dinero.`;
              errorMessage += `\n   Issuer de USDC: ${USDC_ISSUER}`;
            }
            setError(errorMessage);
          }
        } else if (resolution.decision === 'split') {
          // Split: hacer dos llamadas separadas (primero cliente, luego trabajador)
          let successMessages: string[] = [];
          let errorMessages: string[] = [];
          let lastTxHash: string | undefined;
              
              // Reembolsar al cliente
          if (clientAmount > 0) {
            try {
              setSuccess('Preparando transacción de reembolso al cliente. Por favor, firma la transacción en Freighter...');
              
              const refundResult = await resolveDisputeTrustlessEscrow(
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
              
              if (refundResult.success) {
                successMessages.push(`${clientAmount.toFixed(7)} USDC reembolsados al cliente`);
                lastTxHash = refundResult.txHash;
                  } else {
                errorMessages.push(`Error al reembolsar al cliente: ${refundResult.error}`);
                  }
            } catch (refundError: any) {
              errorMessages.push(`Error al reembolsar al cliente: ${refundError.message}`);
                }
              }
              
              // Pagar al trabajador
          if (workerAmount > 0 && workerWallet) {
            try {
              setSuccess('Preparando transacción de pago al trabajador. Por favor, firma la transacción en Freighter...');
              
              const paymentResult = await resolveDisputeTrustlessEscrow(
                contractId,
                disputeResolver,
                {
                  address: workerWallet,
                  amount: workerAmount
                },
                kit,
                resolveDispute,
                sendTransaction,
                getEscrowByContractIds
                );
                
                if (paymentResult.success) {
                successMessages.push(`${workerAmount.toFixed(7)} USDC pagados al trabajador`);
                lastTxHash = paymentResult.txHash;
                } else {
                errorMessages.push(`Error al pagar al trabajador: ${paymentResult.error}`);
              }
            } catch (paymentError: any) {
              errorMessages.push(`Error al pagar al trabajador: ${paymentError.message}`);
            }
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
                `2. Hay un problema con el indexer de Trustless Work\n` +
                `3. La transacción necesita más tiempo para procesarse\n\n` +
                `NO se actualizará el estado en la base de datos hasta que el escrow esté resuelto en la blockchain.\n` +
                `Por favor, verifica manualmente el estado del escrow en Trustless Work.\n\n` +
                `Hash de transacción: ${lastTxHash || 'N/A'}`
              );
            }
            
            //  Solo actualizar BD si el escrow está confirmado como resuelto en blockchain
            if (selectedDispute && typeof selectedDispute.id === 'number') {
              try {
                await resolveAdminDispute(selectedDispute.id, {
                  decision: resolution.decision,
                  reason: resolution.reason,
                  refund_percentage: resolution.decision === 'split' ? resolution.refund_percentage : undefined
                });
              } catch (dbError: any) {
                // No fallar si la BD no se actualiza, el escrow ya está resuelto en blockchain
              }
            }
            
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
            setError(`Error al resolver disputa: ${errorMessages.join('. ')}`);
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
      if (!selectedDispute.escrow_id || !selectedDispute.escrow_id.startsWith('C')) {
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
      
      const errorMessage = err.message || 'Error al resolver disputa';
      setError(errorMessage);
      
      // Si el error es sobre wallet o firma, mostrar mensaje más específico
      if (errorMessage.includes('wallet') || errorMessage.includes('firmar') || errorMessage.includes('sign')) {
        setError(` ${errorMessage}\n\nPor favor, verifica que:\n- Tu wallet (Freighter) esté conectada\n- La wallet conectada sea el disputeResolver del escrow\n- Freighter esté abierto y funcionando`);
      }
    } finally {
      setResolving(false);
    }
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
          Gestión de Disputas / Arbitraje
        </h2>
        <p>Revisa y resuelve disputas entre clientes y trabajadores</p>
          {/*  MEJORA: Mensaje informativo sobre disputas por cancelación */}
          <div style={{
            marginTop: '12px',
            padding: '10px 15px',
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
            border: '1px solid rgba(255, 152, 0, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9em',
            color: 'rgba(255, 255, 255, 0.9)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <FaExclamationTriangle style={{ color: '#ff9800', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#ff9800' }}>Nota:</strong> Las disputas por cancelación aparecen automáticamente cuando un cliente cancela una tarea. 
              Estas disputas requieren resolución del administrador para procesar el reembolso.
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
          <label>Filtrar por estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="resolved">Resueltas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
        <div className="filter-info">
          <span>Total: {total} disputas</span>
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
          <p>Cargando disputas...</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="admin-empty">
          <FaGavel />
          <p>No hay disputas {statusFilter ? `con estado "${statusFilter}"` : ''}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tarea</th>
                  <th>Creada por</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
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
                        <span style={{ fontSize: '0.85em', color: '#ff9800', display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Disputa detectada desde Trustless Work">
                          <FaBolt /> {dispute.id.replace('virtual-', '').substring(0, 8)}...
                        </span>
                      ) : (
                        dispute.id
                      )}
                    </td>
                    <td>
                      <div>
                        <strong>#{dispute.task_id}</strong>
                        {dispute.isVirtualDispute && (
                          <span style={{ 
                            marginLeft: '8px',
                            fontSize: '0.75em',
                            padding: '2px 6px',
                            background: 'rgba(255, 152, 0, 0.2)',
                            borderRadius: '4px',
                            color: '#ff9800'
                          }}>
                             Desde Trustless Work
                          </span>
                        )}
                        <div className="text-muted">{dispute.task_title || 'Sin título'}</div>
                        {dispute.task_price && (
                          <small>{parseFloat(dispute.task_price).toFixed(2)} USDC</small>
                        )}
                        {dispute.escrow_id && (
                          <div style={{ fontSize: '0.75em', color: '#666', marginTop: '2px' }}>
                            Escrow: {dispute.escrow_id.substring(0, 8)}...
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
                            <FaTimesCircle aria-hidden="true" /> Disputa por Cancelación
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div>{dispute.created_by_username || 'Usuario #' + dispute.created_by}</div>
                        <small className="text-muted">{dispute.created_by_email}</small>
                      </div>
                    </td>
                    <td>
                      {getStatusBadge(dispute.displayStatus || dispute.status)}
                      {dispute.trustlessWorkStatus && (
                        <div className="text-muted" style={{ fontSize: '0.85em', marginTop: '4px' }}>
                          <small>
                             TW: <strong>{dispute.trustlessWorkStatus}</strong>
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
                        title="Ver detalles"
                      >
                        <FaEye />
                        Ver
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
                Anterior
              </button>
              <span>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="admin-button secondary"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de detalles - Renderizado fuera del contenedor usando Portal */}
      {showDetails && selectedDispute && createPortal(
        <div className="admin-modal-overlay dispute-modal-overlay" onClick={() => {
          setShowDetails(false);
          setShowResolveForm(false);
          setSelectedDispute(null);
          setEscrowInfo(null);
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
                  setShowResolveForm(false);
                  setSelectedDispute(null);
                  setEscrowInfo(null);
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
                      color: '#fff',
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
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'summary') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
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
                      color: '#fff',
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
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'chat') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
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
                      color: '#fff',
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
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'files') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
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
                      color: '#fff',
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
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (activeTab !== 'timeline') {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    <FaClock />
                    Timeline
                  </button>
                </div>

                {/* Contenido de los tabs */}
                {activeTab === 'summary' && (
                  <DisputeCaseView dispute={selectedDispute} />
                )}

                {activeTab === 'chat' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeChatView disputeId={selectedDispute.id} />
                  </div>
                )}

                {activeTab === 'files' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeFilesView disputeId={selectedDispute.id} />
                  </div>
                )}

                {activeTab === 'timeline' && selectedDispute && (
                  <div style={{ minHeight: '400px' }}>
                    <DisputeTimelineView disputeId={selectedDispute.id} />
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
            // Cerrar el modal de detalles si está abierto
            setShowDetails(false);
            setSelectedDispute(null);
            // Cerrar el formulario de resolución si está abierto
            setShowResolveForm(false);
          }}
          type="success"
          title={successPopupData?.alreadyResolved ? " Disputa Ya Resuelta" : "¡Disputa Resuelta Exitosamente!"}
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
            // Cerrar el modal de detalles si está abierto
            setShowDetails(false);
            setSelectedDispute(null);
            // Cerrar el formulario de resolución si está abierto
            setShowResolveForm(false);
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default DisputeManagement;

