import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCalendarAlt, FaWallet, FaExternalLinkAlt, FaCheck, FaTimes, FaSpinner, FaEye, FaHome, FaFileAlt, FaCheckCircle, FaUserCircle } from 'react-icons/fa';
import axios from '../config/axios';
import { arcusxApiUrl } from '../config/arcusxApi';
import { useWallet } from '../hooks/useWallet';
// Escrow Trustless Work (cliente aprueba y firma liberación; ver trustlessWorkEscrowService)

// ============================================
// SISTEMA TRUSTLESS WORK - IMPLEMENTADO
// ============================================
import { 
  useInitializeEscrow, 
  useFundEscrow, 
  useSendTransaction,
  useGetEscrowFromIndexerByContractIds
} from '@trustless-work/escrow/hooks';
import { 
  createTrustlessEscrow, 
  fundTrustlessEscrow 
} from '../services/trustlessWorkEscrowService';
import { quoteEscrowCommission } from '../utils/escrowFeeQuote';
import {
  quoteBilateralFromNominal,
  workerNetFromTaskPrice,
  CLIENT_VISIBLE_FEE_PERCENT,
} from '../utils/bilateralFeeModel';
import { usePlatformFee } from '../hooks/usePlatformFee';
import EscrowProcessPopup from './EscrowProcessPopup';
import { useI18n } from '../i18n/I18nProvider';
import { devLog, devWarn, devError } from '../utils/logger';
import {
  canAccessTaskSupervision,
  isEscrowFunded,
  isEscrowPending,
} from '../utils/escrowStatus';
import '../css/ProposalReview.css';

interface TaskData {
    id: number;
    title: string;
    subtitle: string;
    description: string;
  price: string;
  currency: string;
  difficulty: string;
  category: string;
  created_at: string;
  contract_id?: string | null;
  escrow_id?: string | null;
  escrow_status?: string | null;
  escrow_fund_tx_hash?: string | null;
  escrow_pending_proposal_id?: number | null;
  accepted_applicant_id?: number | null;
  escrow_amount?: number | string | null;
  escrow_platform_fee?: number | string | null;
}

interface ProposalData {
  id: number;
  task_id: number;
  applicant_id: number;
  message: string;
  portfolio_url: string;
  worker_wallet_address: string;
  created_at: string;
  status: string;
  applicant_username: string;
  applicant_email: string;
}

const ProposalReview = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

    const [task, setTask] = useState<TaskData | null>(null);
    const [proposals, setProposals] = useState<ProposalData[]>([]);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);
  const [actionLoading] = useState(false);
  const [selectingProposal, setSelectingProposal] = useState(false);
  
  // Estados para popups
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Estados para el nuevo popup paso a paso
  const [showEscrowProcessPopup, setShowEscrowProcessPopup] = useState(false);
  const [resumeEscrowFromFund, setResumeEscrowFromFund] = useState(false);
  const [resettingPendingEscrow, setResettingPendingEscrow] = useState(false);
  const [resumingFunding, setResumingFunding] = useState(false);
  
  // Obtener platform fee del backend
  const { platformFee } = usePlatformFee();

  // Wallet (Freighter/Stellar)
  const {
    address,
    loading: walletLoading,
    isConnected,
    connectWallet,
    kit
  } = useWallet();

  // Hooks de Trustless Work
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();

  // Obtener usuario logeado
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // Función para cargar datos de la tarea y propuestas
  const fetchTaskAndProposals = async () => {
    if (!taskId) {
      setError(t('proposals.error.noTaskId'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cargar detalles de la tarea
      const taskResponse = await axios.get(arcusxApiUrl('get_task_details', { task_id: taskId }));
      if (taskResponse.data) {
        const taskData = taskResponse.data;
        setTask(taskData);

        const proposalsResponse = await axios.get(arcusxApiUrl('get_task_proposals', { task_id: taskId }));
        const proposalList: ProposalData[] = Array.isArray(proposalsResponse.data)
          ? proposalsResponse.data
          : [];
        setProposals(proposalList);

        const escrowFullyActive = canAccessTaskSupervision(
          taskData.escrow_id,
          taskData.escrow_status,
          taskData.escrow_fund_tx_hash,
        );

        if (escrowFullyActive && taskData.accepted_applicant_id) {
          devLog('Escrow fondeado y trabajador asignado.');
          const acceptedProposal = proposalList.find(
            (p: ProposalData) =>
              p.applicant_id === taskData.accepted_applicant_id || p.status === 'accepted',
          );
          if (acceptedProposal) {
            setSelectedProposal(acceptedProposal);
          }
          setTimeout(() => setShowSuccessPopup(true), 100);
        } else if (taskData.escrow_id && isEscrowPending(taskData.escrow_status)) {
          devLog('Escrow desplegado sin fondear — reanudar fondeo o reiniciar selección.');
          const linked =
            (taskData.escrow_pending_proposal_id
              ? proposalList.find((p) => Number(p.id) === Number(taskData.escrow_pending_proposal_id))
              : null) ??
            (taskData.accepted_applicant_id
              ? proposalList.find((p) => p.applicant_id === taskData.accepted_applicant_id)
              : null) ??
            proposalList.find((p) => p.status === 'accepted') ??
            (proposalList.length === 1 ? proposalList[0] : null);
          if (linked) {
            setSelectedProposal(linked);
          }
          setResumeEscrowFromFund(true);
          setShowSuccessPopup(false);
        } else {
          setResumeEscrowFromFund(false);
        }
      }

    } catch (err: any) {
      setError(t('proposals.error.load') + ' ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos de la tarea y propuestas
  useEffect(() => {
    fetchTaskAndProposals();
  }, [taskId]);

  // Función para seleccionar una propuesta
  const handleSelectProposal = (proposal: ProposalData) => {
    if (task?.escrow_id && isEscrowPending(task.escrow_status)) {
      setPopupMessage(t('proposals.escrow.pendingFunding.banner'));
      setShowErrorPopup(true);
      return;
    }
    setSelectedProposal(proposal);
    setSelectingProposal(true);
  };

  // Función para cancelar selección
  const handleCancelSelection = () => {
    setSelectedProposal(null);
    setSelectingProposal(false);
  };

  // Función para aceptar una propuesta - ahora abre el popup paso a paso
  const handleAcceptProposal = async () => {
    if (!selectedProposal) return;
    
    if (!user || !user.id) {
      setPopupMessage(t('proposals.error.loginRequired'));
      setShowErrorPopup(true);
      return;
    }

    // Verificar wallet Stellar
      if (!isConnected) {
        setPopupMessage(t('proposals.error.walletRequired'));
        setShowErrorPopup(true);
        return;
      }

    // Abrir el popup paso a paso
    setShowEscrowProcessPopup(true);
  };

  // Función para rechazar una propuesta (simplemente cancelar selección)
  const handleRejectProposal = () => {
    setSelectingProposal(false);
    setSelectedProposal(null);
  };

  /* ============================================
   * SISTEMA TRUSTLESS WORK - IMPLEMENTADO
   * ============================================
   * Función para crear el escrow (Paso 2 del popup)
   * Usa Trustless Work para crear el escrow
   * ============================================ */
  const handleCreateEscrow = async () => {
    try {
      if (!selectedProposal) {
        return { success: false, error: t('proposals.error.noProposal') };
      }

      if (!isConnected || !address) {
        return { success: false, error: t('proposals.error.walletConnectFirst') };
      }

      if (!kit) {
        return { success: false, error: t('proposals.error.walletKitNotReady') };
      }

      if (!task) {
        return { success: false, error: t('proposals.error.taskNotFound') };
      }

      // Validar direcciones Stellar
      const clientAddress = address;
      const workerAddress = selectedProposal.worker_wallet_address;

      if (!clientAddress || !clientAddress.startsWith('G') || clientAddress.length !== 56) {
        return { success: false, error: t('proposals.error.invalidClientAddress') };
        }

      if (!workerAddress || !workerAddress.startsWith('G') || workerAddress.length !== 56) {
        return { success: false, error: t('proposals.error.invalidWorkerAddress') };
      }
      
      // Crear escrow con Trustless Work
      const engagementId = `arcusx-${taskId}-${Date.now()}`;
      const workerAmount = workerNetFromTaskPrice(task.price);

      const quote = quoteEscrowCommission(workerAmount, platformFee);
      const amount = quote.fundAmount;
      const commission = quote.totalCommission;
      
      devLog('Cálculo del escrow:');
      devLog('  - Nominal referencia:', parseFloat(task.price));
      devLog('  - Worker net (hito escrow):', workerAmount);
      devLog('  - Platform fee:', platformFee, `(${(platformFee * 100).toFixed(2)}%)`);
      devLog('  - Escrow amount (calculado):', amount);
      devLog('  - Commission (que se deducirá):', commission.toFixed(7));
      devLog('  - Comisión plataforma (est.):', quote.platformCommission.toFixed(7));

      const result = await createTrustlessEscrow(
        {
          signer: clientAddress,
          engagementId,
          title: task.title,
          description: task.description,
          amount,
          approver: clientAddress,
          serviceProvider: workerAddress,
          receiver: workerAddress,
          milestoneDescription: `Completar tarea: ${task.title}`
        },
        kit,
        deployEscrow,
        sendTransaction
      );

      if (!result.success) {
        devError('Error al crear escrow:', result.error);
        return {
          success: false,
          error: result.error || t('proposals.error.createEscrow')
        };
      }

      if (!result.contractId) {
        devError('No se recibió contractId:', result);
        return {
          success: false,
          error: t('proposals.error.noContractId')
        };
      }


      const txHash = (result as any).txHash || '';

      // Obtener información completa del escrow desde Trustless Work para guardar platformFee y trustline
      let platformFeeToSave = platformFee;
      let trustlineAddress = null;
      
      try {
        // Esperar un poco para que el escrow se indexe
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Obtener datos del escrow desde el indexer
        const escrowData = await getEscrowByContractIds({
          contractIds: [result.contractId],
          validateOnChain: true
        });
        
        const escrows = Array.isArray(escrowData) ? escrowData : (escrowData as any)?.escrows || [];
        if (escrows && escrows.length > 0) {
          const escrow = escrows[0];
          // Obtener platformFee del escrow (si está disponible)
          if (escrow.platformFee !== undefined && escrow.platformFee !== null) {
            const { fromTrustlessWorkPlatformFee } = await import('../utils/escrowFeeQuote');
            const raw = typeof escrow.platformFee === 'number'
              ? escrow.platformFee
              : parseFloat(escrow.platformFee);
            platformFeeToSave = fromTrustlessWorkPlatformFee(raw);
          }
          // Obtener trustline address
          if (escrow.trustline?.address) {
            trustlineAddress = escrow.trustline.address;
          }
        }
      } catch (error: any) {
        devWarn('No se pudieron obtener datos completos del escrow:', error.message);
        // Continuar de todas formas - usaremos los valores por defecto
      }

      // Guardar escrow_id, amount, platformFee y trustline_address en el backend
      try {
        const token = localStorage.getItem('token');
        if (token && taskId && selectedProposal) {
          const payload: any = {
            task_id: parseInt(taskId, 10),
            proposal_id: selectedProposal.id,
            escrow_id: result.contractId,
            transaction_hash: txHash,
            client_wallet_address: clientAddress,
            escrow_amount: amount // Guardar el amount exacto usado al crear el escrow
          };
          
          // Agregar platformFee y trustline_address si están disponibles
          if (platformFeeToSave !== null && platformFeeToSave !== undefined) {
            payload.platform_fee = platformFeeToSave;
          }
          if (trustlineAddress) {
            payload.trustline_address = trustlineAddress;
          }

          await axios.post(`${arcusxApiUrl('create_escrow')}`, payload, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error: any) {
        devError('Error al guardar escrow en backend:', error);
        // Continuar de todas formas - el escrow ya se creó en Trustless Work
      }
      
      // NOTA: Ya no guardamos el amount en localStorage porque ahora calculamos totalToFund al fondear
      // El escrow tiene amount = workerAmount, pero al fondear usamos totalToFund = workerAmount + commission
      
      return {
        success: true,
        escrowId: result.contractId,
        txHash: txHash
      };
      
    } catch (error: any) {
      if (error.message?.includes('User declined')) {
        return { success: false, error: t('proposals.error.txCancelled') };
      }
      
      return { success: false, error: error.message || t('proposals.error.createEscrowGeneric') };
    }
  };

  /* ============================================
   * SISTEMA TRUSTLESS WORK - IMPLEMENTADO
   * ============================================
   * Función para enviar dinero al escrow (Paso 3 del popup)
   * Usa Trustless Work para fondear el escrow
   * ============================================ */
  const handleFundEscrow = async (escrowId: string) => {
    try {
      if (!selectedProposal) {
        return { success: false, error: t('proposals.error.noProposal') };
      }

      if (!isConnected || !address) {
        return { success: false, error: t('proposals.error.walletConnectFirst') };
      }
      
      if (!task) {
        return { success: false, error: t('proposals.error.taskNotFound') };
      }

      if (!kit) {
        return { success: false, error: t('proposals.error.walletKitNotReady') };
      }

      // Fondear el mismo monto que al crear: worker / (1 - platformFee)
      const workerAmount = workerNetFromTaskPrice(task.price);
      
      // CRÍTICO: Usar el mismo platformFee que al crear el escrow
      // Si el escrow tiene un platformFee guardado, usarlo; si no, usar el actual
      let feeToUse = platformFee;
      if (task.escrow_platform_fee !== undefined && task.escrow_platform_fee !== null) {
        feeToUse = typeof task.escrow_platform_fee === 'number' 
          ? task.escrow_platform_fee 
          : parseFloat(task.escrow_platform_fee);
        devLog('Usando platformFee del escrow guardado:', feeToUse);
      } else {
        devLog('Usando platformFee actual:', feeToUse);
      }
      
      const { quoteEscrowFundAmount } = await import('../utils/escrowFeeQuote');
      const amount = quoteEscrowFundAmount(workerAmount, feeToUse);
      const amountString = amount.toFixed(7);
      
      devLog('Cálculo del fondeo (DEBE SER IDÉNTICO AL CREAR):');
      devLog('  - Worker amount (lo que recibirá):', workerAmount);
      devLog('  - Platform fee usado:', feeToUse, `(${(feeToUse * 100).toFixed(2)}%)`);
      devLog('  - Escrow amount calculado:', amount);
      devLog('  - Amount string (7 decimales):', amountString);
      devLog('  - Amount final a fondear:', amount);
      devLog('  - Amount del escrow guardado (si existe):', task.escrow_amount);
      
      if (isNaN(amount) || amount <= 0) {
          return {
            success: false,
          error: `Amount inválido: ${amount}. Debe ser un número positivo.`
        };
      }
      
      // Validar que el monto a fondear sea al menos el monto del trabajador
      if (amount < workerAmount) {
        return {
          success: false,
          error: `El monto a fondear (${amount}) debe ser al menos el monto del trabajador (${workerAmount})`
        };
      }
      
      // Validar que el amount sea válido
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: `Amount inválido: ${amount}. Debe ser un número positivo.`
        };
      }

      // Intentar fondear el escrow con reintentos inteligentes
      // El detector de deploy en trustlessWorkEscrowService ya verifica que esté indexado
      let result: { success: boolean; txHash?: string; error?: string } | null = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          result = await fundTrustlessEscrow(
            escrowId,
            amount,
            address,
            kit,
            fundEscrow,
            sendTransaction,
            async (contractIds: string[] | { contractIds: string[]; validateOnChain?: boolean }) => {
              try {
                // Manejar caso donde se recibe un objeto en lugar de un array
                // waitForEscrowIndexing pasa un array, pero getEscrowFromIndexer puede pasar un objeto
                let contractIdsArray: string[];
                if (Array.isArray(contractIds)) {
                  // Caso normal: se recibe un array directamente
                  contractIdsArray = contractIds;
                } else if (contractIds && typeof contractIds === 'object' && 'contractIds' in contractIds) {
                  // Caso donde se recibe un objeto con la propiedad contractIds
                  contractIdsArray = contractIds.contractIds;
                } else {
                  devWarn('contractIds inválido en ProposalReview (tipo desconocido):', contractIds);
                  return [];
                }
                
                devLog('ProposalReview wrapper recibió contractIds:', contractIdsArray);
                
                // Validar que contractIds sea un array válido y no esté vacío
                if (!contractIdsArray || !Array.isArray(contractIdsArray) || contractIdsArray.length === 0) {
                  devWarn('contractIds inválido o vacío en ProposalReview:', contractIdsArray);
                  return [];
                }
                
                // Filtrar contractIds vacíos o inválidos
                const validContractIds = contractIdsArray.filter(id => id && typeof id === 'string' && id.trim() !== '');
                if (validContractIds.length === 0) {
                  devWarn('No hay contractIds válidos después de filtrar:', contractIdsArray);
                  return [];
                }
                
                // CRÍTICO: Usar validateOnChain: true para verificar que el escrow esté completamente disponible en la blockchain
                const result = await getEscrowByContractIds({ 
                  contractIds: validContractIds,
                  validateOnChain: true 
                });
                // El resultado puede tener diferentes estructuras, devolvemos el resultado completo
                return Array.isArray(result) ? result : (result as any)?.escrows || result || [];
              } catch (error: any) {
                devError('Error en wrapper de getEscrowByContractIds:', error.message);
                return [];
              }
            }
          );
          
          if (result.success) {
            break;
          } else if (attempt < maxRetries) {
            // Detectar si es el error "normalize" para usar tiempos más largos
            const isNormalizeError = result.error?.includes('normalize') || result.error?.includes('normalize');
            const delay = isNormalizeError 
              ? 120000 // 2 minutos si es error normalize
              : attempt === 1 ? 30000 : 60000; // 30s, 1min para otros errores
            
            devLog(`⏳ Reintentando en ${delay / 1000} segundos... (intento ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error: any) {
          if (attempt === maxRetries) {
            result = {
              success: false,
              error: error.message || t('proposals.error.fundEscrow')
            };
            break;
          }
          
          // Detectar si es el error "normalize" para usar tiempos más largos
          const isNormalizeError = error.message?.includes('normalize') || error.message?.includes('normalize');
          const delay = isNormalizeError 
            ? 120000 // 2 minutos si es error normalize
            : attempt === 1 ? 30000 : 60000; // 30s, 1min para otros errores
          
          devLog(`⏳ Reintentando en ${delay / 1000} segundos... (intento ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Si no hay resultado o falló, retornar error
      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error || t('proposals.error.fundEscrow')
        };
      }
      
      const fundTx = result.txHash?.trim();
      if (!fundTx) {
        return {
          success: false,
          error: t('proposals.error.fundEscrowNotConfirmed'),
        };
      }

      // Respaldo: registrar fondeo + asignar trabajador aunque falle select_proposal después
      try {
        const token = localStorage.getItem('token');
        if (token && taskId && selectedProposal) {
          const workerAmount = workerNetFromTaskPrice(task.price);
          let feeToUse = platformFee;
          if (task.escrow_platform_fee !== undefined && task.escrow_platform_fee !== null) {
            feeToUse = typeof task.escrow_platform_fee === 'number'
              ? task.escrow_platform_fee
              : parseFloat(task.escrow_platform_fee);
          }
          const { quoteEscrowFundAmount: quoteFund } = await import('../utils/escrowFeeQuote');
          const escrowAmount = quoteFund(workerAmount, feeToUse);
          await axios.post(
            `${arcusxApiUrl('create_escrow')}`,
            {
              task_id: parseInt(taskId, 10),
              proposal_id: selectedProposal.id,
              escrow_id: escrowId,
              transaction_hash: fundTx,
              funding_confirmed: true,
              escrow_status: 'active',
              escrow_amount: Math.round(escrowAmount * 10000000) / 10000000,
              platform_fee: feeToUse,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          );
        }
      } catch (fundRegisterErr: unknown) {
        devWarn('Registro de fondeo en API (respaldo):', fundRegisterErr);
      }

      return {
        success: true,
        txHash: fundTx,
      };
      
    } catch (error: any) {
      if (error.message?.includes('User declined')) {
        return { success: false, error: t('proposals.error.txCancelled') };
      }
      
      return { success: false, error: error.message || t('proposals.error.fundEscrowGeneric') };
    }
  };
  // ============================================
  // FIN SISTEMA TRUSTLESS WORK
  // ============================================

  // Función para seleccionar trabajador en la base de datos (Paso 4 del popup)
  const handleSelectWorker = async (escrowId: string, txHash: string) => {
    try {
      if (!selectedProposal) {
        return { success: false, error: t('proposals.error.noProposal') };
      }

      const fundTx = txHash?.trim();
      if (!fundTx) {
        return { success: false, error: t('proposals.error.fundEscrowNotConfirmed') };
      }

      const selectResponse = await axios.post(
        arcusxApiUrl('select_proposal'),
        {
          task_id: taskId,
          proposal_id: selectedProposal.id,
          transaction_hash: fundTx,
          escrow_id: escrowId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          validateStatus: (status) => status >= 200 && status < 600,
        },
      );

      if (selectResponse.status < 200 || selectResponse.status >= 300) {
        const errorMessage =
          selectResponse.data?.message ||
          `${t('proposals.error.selectWorker')} (${selectResponse.status})`;
        devError('Error al seleccionar propuesta:', errorMessage);
        return { success: false, error: errorMessage };
      }

      if (selectResponse.data?.success === false) {
        return {
          success: false,
          error: selectResponse.data?.message || t('proposals.error.selectWorker'),
        };
      }

      await fetchTaskAndProposals();
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t('proposals.error.selectWorker');
      return { success: false, error: msg };
    }
  };

  // Función para completar el proceso
  const handleResetPendingEscrow = async () => {
    if (!taskId) return;
    setResettingPendingEscrow(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        arcusxApiUrl('reset_pending_escrow'),
        { task_id: parseInt(taskId, 10) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (res.data?.success === false) {
        throw new Error(res.data?.message || t('proposals.error.resetPendingEscrow'));
      }
      setSelectedProposal(null);
      setResumeEscrowFromFund(false);
      setShowEscrowProcessPopup(false);
      setShowSuccessPopup(false);
      await fetchTaskAndProposals();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('proposals.error.resetPendingEscrow');
      setPopupMessage(msg);
      setShowErrorPopup(true);
    } finally {
      setResettingPendingEscrow(false);
    }
  };

  const resolveProposalForPendingEscrow = async (): Promise<ProposalData | null> => {
    if (selectedProposal) return selectedProposal;

    if (task?.escrow_pending_proposal_id) {
      const byPending = proposals.find(
        (p) => Number(p.id) === Number(task.escrow_pending_proposal_id),
      );
      if (byPending) return byPending;
    }

    if (task?.accepted_applicant_id) {
      const byApplicant = proposals.find((p) => p.applicant_id === task.accepted_applicant_id);
      if (byApplicant) return byApplicant;
    }

    const accepted = proposals.find((p) => p.status === 'accepted');
    if (accepted) return accepted;

    if (proposals.length === 1) return proposals[0];

    if (task?.escrow_id) {
      try {
        const data = await getEscrowByContractIds({
          contractIds: [task.escrow_id],
          validateOnChain: true,
        });
        const escrows = Array.isArray(data) ? data : (data as { escrows?: unknown[] })?.escrows ?? [];
        const esc = escrows[0] as {
          roles?: { serviceProvider?: string };
          serviceProvider?: string;
          receiver?: string;
        } | undefined;
        const wallet =
          esc?.roles?.serviceProvider ?? esc?.serviceProvider ?? esc?.receiver ?? '';
        if (wallet) {
          const byWallet = proposals.find((p) => p.worker_wallet_address === wallet);
          if (byWallet) return byWallet;
        }
      } catch (e: unknown) {
        devWarn('No se pudo resolver propuesta desde indexer:', e);
      }
    }

    return null;
  };

  const handleResumeFunding = async () => {
    if (!task?.escrow_id) return;
    setResumingFunding(true);
    try {
      const proposal = await resolveProposalForPendingEscrow();
      if (!proposal) {
        setPopupMessage(t('proposals.error.resumeFundingNoProposal'));
        setShowErrorPopup(true);
        return;
      }
      setSelectedProposal(proposal);
      setResumeEscrowFromFund(true);
      setShowEscrowProcessPopup(true);
    } finally {
      setResumingFunding(false);
    }
  };

  const handleProcessComplete = () => {
    if (!canAccessTaskSupervision(task?.escrow_id, task?.escrow_status, task?.escrow_fund_tx_hash)) {
      setPopupMessage(t('proposals.error.superviseRequiresFunding'));
      setShowErrorPopup(true);
      return;
    }
    // Calcular montos usando el nuevo modelo
    const nominal = task?.price ? parseFloat(task.price) : 0;
    const workerAmount = nominal > 0 ? workerNetFromTaskPrice(task!.price) : 0;
    const quote = workerAmount > 0 ? quoteEscrowCommission(workerAmount, platformFee) : null;
    const bilateral = nominal > 0 ? quoteBilateralFromNominal(nominal, platformFee) : null;
    const commission = bilateral?.clientVisibleFee ?? quote?.totalCommission ?? 0;
    const totalAmount = bilateral?.clientTotal ?? quote?.fundAmount ?? 0;
    const feePercent = CLIENT_VISIBLE_FEE_PERCENT;
    
    // Mostrar mensaje de éxito mejorado
    const currency = task?.currency || 'USDC';
    setPopupMessage(
      t('proposals.success.contractActivated')
        .replace('{{workerAmount}}', workerAmount.toFixed(2))
        .replace('{{feePercent}}', feePercent)
        .replace('{{commission}}', commission.toFixed(7))
        .replace('{{totalAmount}}', totalAmount.toFixed(7))
        .replace(/\{\{currency\}\}/g, currency)
        .replace('{{workerName}}', selectedProposal?.applicant_username ?? '')
    );
    
    // Cerrar el popup de proceso primero
    setShowEscrowProcessPopup(false);
    
    // Mostrar popup de éxito después de un pequeño delay
    setTimeout(() => {
      setShowSuccessPopup(true);
    }, 300);
    
    // Actualizar la lista de propuestas
    if (selectedProposal) {
      setProposals([{ ...selectedProposal, status: 'accepted' }]);
    }
    setSelectingProposal(false);
    setSelectedProposal(null);
    
    // Redirigir al dashboard (el EscrowProcessPopup ya esperó 2 segundos antes de llamar a onComplete)
    navigate('/dashboard');
  };

  // Función para conectar wallet (Paso 1 del popup)
  const handleConnectWallet = async () => {
    try {
      // Si ya está conectado, retornar éxito
      if (isConnected && address) {
            return { success: true };
      }

      await connectWallet();
      
      // Esperar a que se conecte
      let attempts = 0;
      let connectedAddress = null;
      
      while (!connectedAddress && attempts < 30) {
        const stellarWallet = localStorage.getItem('stellar_wallet');
        if (stellarWallet) {
          const walletData = JSON.parse(stellarWallet);
          if (walletData.address) {
            connectedAddress = walletData.address;
            break;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!connectedAddress) {
        return { success: false, error: t('proposals.error.walletConnectFailed') };
      }

      return { success: true };
      
    } catch (error: any) {
      return { success: false, error: error.message || t('proposals.error.walletConnectGeneric') };
    }
  };



  // Función para ir al dashboard desde el popup
  const handleGoToDashboard = () => {
    setShowSuccessPopup(false);
    navigate('/dashboard');
  };

  // Función para ir a supervisar la tarea desde el popup
  const handleGoToSupervise = () => {
    if (!canAccessTaskSupervision(task?.escrow_id, task?.escrow_status, task?.escrow_fund_tx_hash)) {
      setShowSuccessPopup(false);
      setPopupMessage(t('proposals.error.superviseRequiresFunding'));
      setShowErrorPopup(true);
      return;
    }
    setShowSuccessPopup(false);
    if (taskId && (task?.accepted_applicant_id || selectedProposal?.applicant_id)) {
      const applicantId = task?.accepted_applicant_id || selectedProposal?.applicant_id;
      navigate(`/supervise-task/${taskId}/${applicantId}`);
    } else {
      navigate('/dashboard');
    }
  };

  // Función para manejar el popup de error
  const handleErrorPopupClose = () => {
    setShowErrorPopup(false);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    if (loading) {
    return (
      <div className="proposal-review-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t('proposals.loading')}</p>
        </div>
      </div>
    );
    }

    if (error) {
    return (
      <div className="proposal-review-container">
        <div className="error-message">
          <h3>{t('common.error')}</h3>
          <p>{error}</p>
          <Link to="/dashboard" className="back-button">
            <FaArrowLeft />
            <span>{t('apply.back')}</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="proposal-review-container">
        <div className="error-message">
          <h3>{t('apply.error.not.found')}</h3>
          <p>{t('proposals.task.notFound')}</p>
          <Link to="/dashboard" className="back-button">
            <FaArrowLeft />
            <span>{t('apply.back')}</span>
          </Link>
        </div>
      </div>
    );
    }

    return (
        <div className="proposal-review-container">
      <Link to="/dashboard" className="back-button">
                <FaArrowLeft />
        <span>{t('apply.back')}</span>
            </Link>

      <div className="proposal-review-content">
        {/* Información de la tarea */}
        <div className="task-info-card">
          <div className="task-header">
            <h1>{task.title}</h1>
            {task.subtitle && <p className="task-subtitle">{task.subtitle}</p>}
            <div className="task-meta">
              <span className={`difficulty-tag ${task.difficulty.toLowerCase()}`}>
                {task.difficulty}
              </span>
              <span className="category-tag">{task.category}</span>
              <span className="price-tag">
                {parseFloat(task.price).toFixed(2)} {task.currency}
              </span>
            </div>
          </div>
          
          <div className="task-description">
            <h3>{t('common.project.description')}</h3>
                    <p>{task.description}</p>
          </div>

        </div>

        {task?.escrow_id && isEscrowPending(task.escrow_status) && (
          <div className="escrow-pending-banner" role="alert">
            <p>{t('proposals.escrow.pendingFunding.banner')}</p>
            <div className="escrow-pending-banner-actions">
              <button
                type="button"
                className="action-button select-button"
                onClick={() => void handleResumeFunding()}
                disabled={resumingFunding || proposals.length === 0}
              >
                {resumingFunding ? <FaSpinner className="animate-spin" /> : null}
                {t('proposals.escrow.resumeFunding')}
              </button>
              <button
                type="button"
                className="action-button secondary-button"
                onClick={handleResetPendingEscrow}
                disabled={resettingPendingEscrow}
              >
                {resettingPendingEscrow ? (
                  <FaSpinner className="animate-spin" />
                ) : null}
                {t('proposals.escrow.chooseAnotherWorker')}
              </button>
            </div>
          </div>
        )}

        {/* Lista de propuestas — ocultar solo cuando el escrow está fondeado y activo */}
        {!canAccessTaskSupervision(
          task?.escrow_id,
          task?.escrow_status,
          task?.escrow_fund_tx_hash,
        ) && (
        <div className="proposals-section">
          <div className="proposals-header">
            <h2>{t('proposals.title')} ({proposals.length})</h2>
            <p>{t('proposals.subtitle')}</p>
            <div className="cost-info-box">
              <p>
                <FaCheckCircle className="cost-info-icon" /> <strong>{t('proposals.escrow.trustless')}</strong>
              </p>
            </div>
          </div>

            {proposals.length === 0 ? (
            <div className="no-proposals">
              <div className="no-proposals-icon"><FaFileAlt /></div>
              <h3>{t('proposals.empty.title')}</h3>
              <p>{t('proposals.empty.desc')}</p>
            </div>
            ) : (
                <div className="proposals-list">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="proposal-list-item">
                <div className={`proposal-card ${proposal.status}`}>
                  <div className="proposal-header">
                    <div className="applicant-info">
                      <div className="applicant-avatar">
                        <FaUser />
                      </div>
                      <div className="applicant-details">
                        <h3>{proposal.applicant_username}</h3>
                        <p className="applicant-email">{proposal.applicant_email}</p>
                        <p className="proposal-date">
                          <FaCalendarAlt /> {formatDate(proposal.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="proposal-status">
                      {proposal.status === 'accepted' && (
                        <span className="status-badge accepted">{t('proposals.status.accepted')}</span>
                      )}
                      {proposal.status === 'rejected' && (
                        <span className="status-badge rejected">{t('proposals.status.rejected')}</span>
                      )}
                      {proposal.status === 'pending' && (
                        <span className="status-badge pending">{t('proposals.status.pending')}</span>
                      )}
                    </div>
                  </div>

                  <div className="proposal-content">
                    <div className="proposal-message">
                      <h4>{t('proposals.message.label')}</h4>
                            <p>{proposal.message}</p>
                    </div>

                            {proposal.portfolio_url && (
                      <div className="proposal-portfolio">
                        <h4>{t('proposals.view.portfolio')}</h4>
                        <a 
                          href={proposal.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="portfolio-link"
                        >
                          <FaExternalLinkAlt />
                          {t('proposals.view.portfolio')}
                        </a>
                      </div>
                    )}

                    <div className="proposal-wallet">
                      <h4>{t('proposals.wallet.address')}</h4>
                      <div className="wallet-info">
                        <FaWallet />
                        <span className="wallet-address">{proposal.worker_wallet_address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="proposal-footer">
                    <Link
                      to={`/profile/${proposal.applicant_id}`}
                      state={{ from: `/proposals/${taskId}` }}
                      className="view-profile-button"
                    >
                      <FaUserCircle />
                      {t('proposals.view.publicProfile')}
                    </Link>
                  </div>

                  {proposal.status === 'pending' && (
                    <div className="proposal-actions">
                                <button
                        className="action-button select-button"
                        onClick={() => handleSelectProposal(proposal)}
                        disabled={actionLoading}
                      >
                        <FaCheck />
                        {t('proposals.select.button')}
                                </button>
                    </div>
                            )}
                        </div>

          {!canAccessTaskSupervision(
            task?.escrow_id,
            task?.escrow_status,
            task?.escrow_fund_tx_hash,
          ) &&
            selectingProposal &&
            selectedProposal &&
            Number(selectedProposal.id) === Number(proposal.id) && (
            <div className="selection-confirmation selection-confirmation--below-card">
              <div className="confirmation-header">
                <h3>{t('proposals.confirm.selection')}</h3>
                <p>{t('proposals.confirm.selection.message')} <strong>{selectedProposal.applicant_username}</strong></p>
              </div>
              
              <div className="selected-proposal-summary">
                <div className="summary-item">
                  <strong>{t('proposals.label.message')}</strong>
                  <p>{selectedProposal.message}</p>
                </div>
                {selectedProposal.portfolio_url && (
                  <div className="summary-item">
                    <strong>{t('proposals.view.portfolio')}:</strong>
                    <a href={selectedProposal.portfolio_url} target="_blank" rel="noopener noreferrer">
                      <FaExternalLinkAlt /> {t('proposals.view.portfolio')}
                    </a>
                  </div>
                )}
                <div className="summary-item">
                  <strong>{t('proposals.label.wallet')}</strong>
                  <span className="wallet-address">{selectedProposal.worker_wallet_address}</span>
                </div>
              </div>

              <div className="confirmation-actions">
                <button
                  className="action-button accept-button"
                  onClick={handleAcceptProposal}
                  disabled={actionLoading || walletLoading}
                >
                  {actionLoading || walletLoading ? (
                    <FaSpinner className="spinning" />
                  ) : (
                    <FaCheck />
                  )}
                  {actionLoading ? t('proposals.accept.processing') : t('proposals.accept.button')}
                </button>
                <button
                  className="action-button reject-button"
                  onClick={handleRejectProposal}
                  disabled={actionLoading}
                >
                  <FaTimes />
                  {t('proposals.cancel.selection')}
                </button>
                <button
                  className="action-button cancel-button"
                  onClick={handleCancelSelection}
                  disabled={actionLoading}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
                </div>
                    ))}
                </div>
            )}

        </div>
        )}

      </div>

      {/* Popup de Éxito - Proceso Completado */}
      {showSuccessPopup && (
        <div className="escrow-success-overlay" role="dialog" aria-modal="true" aria-labelledby="escrow-success-title">
          <div className="escrow-success-modal">
            <div className="escrow-success-accent" aria-hidden />
            <div className="escrow-success-icon">
              <FaCheckCircle aria-hidden />
            </div>
            <h3 id="escrow-success-title" className="escrow-success-title">
              {t('escrow.success.title')}
            </h3>

            {(popupMessage.includes('CONTRATO ACTIVADO') ||
              canAccessTaskSupervision(
                task?.escrow_id,
                task?.escrow_status,
                task?.escrow_fund_tx_hash,
              )) ? (
              <>
                <p className="escrow-success-subtitle">{t('escrow.success.subtitle')}</p>
                <div className="escrow-success-panel">
                  <ul className="escrow-success-checklist">
                    <li>
                      <FaCheckCircle aria-hidden />
                      <span>{t('escrow.success.contract.created')}</span>
                    </li>
                    {isEscrowFunded(task?.escrow_status) && (
                      <li>
                        <FaCheckCircle aria-hidden />
                        <span>{t('escrow.success.funds.sent')}</span>
                      </li>
                    )}
                    <li>
                      <FaCheckCircle aria-hidden />
                      <span>
                        {t('escrow.success.worker.selected')}
                        {selectedProposal ? `: ${selectedProposal.applicant_username}` : ''}
                      </span>
                    </li>
                  </ul>
                  {selectedProposal?.worker_wallet_address && (
                    <div className="escrow-success-worker">
                      <span className="escrow-success-worker-label">
                        {t('escrow.success.wallet')}
                      </span>
                      <code className="escrow-success-wallet">
                        {selectedProposal.worker_wallet_address}
                      </code>
                      {selectedProposal.message && (
                        <p className="escrow-success-quote">
                          &ldquo;{selectedProposal.message.substring(0, 80)}
                          {selectedProposal.message.length > 80 ? '…' : ''}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                  {task?.escrow_id && (
                    <div className="escrow-success-contract">
                      <strong>{t('proposals.label.contractId')}</strong>
                      <code>{task.escrow_id}</code>
                    </div>
                  )}
                </div>
              </>
            ) : popupMessage.includes('Contrato escrow creado') ? (
              <div className="escrow-success-panel escrow-success-contract-block">
                <p className="escrow-success-subtitle" style={{ marginBottom: '0.75rem', textAlign: 'left' }}>
                  <strong>{t('escrow.success.contract.created')}</strong>
                </p>
                <p className="escrow-success-meta">
                  <strong>{t('proposals.label.contractAddress')}</strong>
                </p>
                <code className="escrow-success-wallet">
                  {popupMessage.split('Dirección del contrato: ')[1]?.split('\n')[0]}
                </code>
                <p className="escrow-success-meta">
                  <strong>{t('proposals.label.network')}</strong>{' '}
                  {popupMessage.split('Red: ')[1]?.split('\n')[0]}
                </p>
                <p className="escrow-success-meta">
                  <strong>{t('proposals.label.status')}</strong>{' '}
                  {popupMessage.split('Estado: ')[1]}
                </p>
              </div>
            ) : (
              <p className="escrow-success-subtitle">{popupMessage}</p>
            )}

            <div className="escrow-success-actions">
              <button
                type="button"
                onClick={handleGoToSupervise}
                className="escrow-success-btn escrow-success-btn--primary"
              >
                <FaEye aria-hidden /> {t('proposals.supervise.button')}
              </button>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="escrow-success-btn escrow-success-btn--secondary"
              >
                <FaHome aria-hidden /> {t('proposals.dashboard.button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de Error */}
      {showErrorPopup && (
        <div className="popup-overlay">
          <div className="popup error-popup">
            <div className="popup-icon" style={{ color: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '48px' }}>
              <FaTimes />
            </div>
            <h3>{t('common.error')}</h3>
            <p>{popupMessage}</p>
            <button onClick={handleErrorPopupClose} className="popup-button error-button">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Popup de Proceso Escrow Paso a Paso */}
      {showEscrowProcessPopup && selectedProposal && (
        <EscrowProcessPopup
          key={`escrow-${selectedProposal.id}-${taskId}`}
          isOpen={showEscrowProcessPopup}
          onClose={() => {
            setShowEscrowProcessPopup(false);
            setResumeEscrowFromFund(false);
          }}
          onComplete={handleProcessComplete}
          taskPrice={task?.price || '0'}
          contributorAddress={selectedProposal.worker_wallet_address}
          contributorName={selectedProposal.applicant_username}
          taskId={taskId}
          acceptedApplicantId={selectedProposal.applicant_id}
          initialEscrowId={resumeEscrowFromFund ? task?.escrow_id ?? null : null}
          resumeFromFundStep={resumeEscrowFromFund}
          onCreateEscrow={handleCreateEscrow}
          onFundEscrow={handleFundEscrow}
          onSelectWorker={handleSelectWorker}
          onConnectWallet={handleConnectWallet}
        />
      )}

        </div>
    );
};

export default ProposalReview;