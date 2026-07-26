import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../config/axios';
import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';
import { hasSupabase } from '../config/supabase';
import {
  fetchTaskMessagesSupabase,
  formatArcusxMessagingError,
  prepareSupabaseArcusxSession,
  sendTaskMessageSupabase,
} from '../services/arcusxMessagingSupabase';
import { useTaskMessagesRealtime } from '../hooks/useTaskMessagesRealtime';
import '../css/SuperviseTask.css';
import { jwtDecode } from "jwt-decode"; // Importar jwtDecode
import { useWallet } from '../hooks/useWallet';
// ============================================
// SISTEMA TRUSTLESS WORK - ÚNICO SISTEMA
// ============================================
import { 
  useApproveMilestone,
  useReleaseFunds,
  useSendTransaction,
  useGetEscrowFromIndexerByContractIds,
  useStartDispute,
  useResolveDispute
} from '@trustless-work/escrow/hooks';
import {
  approveMilestoneTrustlessEscrow,
  releaseFundsTrustlessEscrow,
  startDisputeTrustlessEscrow,
  cancelTaskTrustlessEscrow,
  signAndSendRefundTransaction
} from '../services/trustlessWorkEscrowService';
import {
  checkCancellationAllowed,
  cancelTask as cancelTaskService,
  confirmCancellation
} from '../services/cancelTaskService';
import { markWorkStarted } from '../services/taskEscrowService';
// ============================================
import { usePlatformFee } from '../hooks/usePlatformFee';
import { useScheduledTaskDeletion } from '../hooks/useScheduledTaskDeletion';
import FileExchange from './FileExchange';
import WalletButton from './WalletButton';
import ConfirmDialog from './ConfirmDialog';
import CompleteTaskPopup, { type TaskCompletionPayload } from './CompleteTaskPopup';
import TaskReleaseSummary from './TaskReleaseSummary';
import StellarTxHashLink from './StellarTxHashLink';
import TaskDeletionNotice from './TaskDeletionNotice';
import { FaExclamationTriangle, FaTimes, FaFlag, FaLock, FaHome, FaDollarSign, FaComments, FaMapMarkerAlt, FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import {
  assertClientCanSignEscrowAction,
  isDealMilestoneApproved,
  resolveEscrowApprover,
  resolveEscrowReleaseSigner,
  type DealEscrowIndexerRow,
} from '../utils/dealEscrowVerification';
import {
  canClientAcceptOrRejectWork,
  isEscrowFunded,
  isEscrowPending,
  isTaskSupervisionActive,
  mergeEscrowStatusFromIndexer,
} from '../utils/escrowStatus';
import { taskHasExchangeFiles } from '../utils/taskExchangeFiles';
import { isStellarTxHash } from '../utils/stellarNetwork';
import { quoteEscrowFundAmount } from '../utils/escrowFeeQuote';
import { workerNetFromTaskPrice, formatWorkerNetDisplay } from '../utils/bilateralFeeModel';
import { resolveSuperviseWorkerUserId } from '../utils/superviseWorkerId';
import '../css/ConfirmDialog.css';

function parseTaskDetailsPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const { success: _s, message: _m, ...rest } = raw;
  return rest;
}

/** Disputa real en Trustless Work (no usar solo escrow.status del indexer). */
function escrowIndexerIsDisputed(escrow: Record<string, unknown>): boolean {
  const flags = (escrow.flags ?? {}) as Record<string, unknown>;
  return (
    flags.disputed === true ||
    escrow.isDisputed === true ||
    escrow.disputed === true
  );
}

interface TaskDetails {
    id: string;
    title: string;
    description: string;
    price: string;
    currency: string;
    difficulty: string;
    category: string;
    creator_username: string;
    created_at: string;
    user_id: string; // Aseguramos que es string como en el backend
    status: string;
    client_accepted_completion: number; // Nueva columna: 0 o 1
    worker_accepted_completion: number;  // Nueva columna: 0 o 1
    files: any[]; // Array de archivos
    escrow_id?: string; // ID del escrow en blockchain
    escrow_status?: string; // Estado del escrow
    escrow_created_at?: string; // Fecha de creación del escrow
    escrow_completed_at?: string; // Fecha de finalización
    escrow_release_tx_hash?: string | null;
    scheduled_deletion_at?: string | null;
    completed_at?: string | null;
    dispute_resolved_at?: string | null;
    escrow_amount?: number | string; // Monto del escrow
    escrow_platform_fee?: number | string; // Fee decimal (0.03) al crear el escrow
    accepted_applicant_id?: string; // ID del trabajador asignado
    is_private_invite?: boolean;
    invited_user_id?: string | number | null;
    worker_started_at?: string | null; // Edge mark_work_started
    worker_wallet_address?: string; // Wallet del trabajador desde la aplicación
    worker_username?: string; // Username del trabajador
}

interface UserDetails {
    id: string; // Aseguramos que es string como en el backend
    username: string;
    // Agrega otros campos relevantes del trabajador que get_user_details.php devuelva
}

// Definir la interfaz Message - IDs como string para coincidir con el backend
interface Message {
    id: string;
    task_id: string;
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
    is_read: number; // O boolean si tu backend devuelve 0/1 o true/false
}

// Interfaz para el token JWT decodificado (refleja la estructura del payload)
interface DecodedToken {
    iat: number; // Issued at: time when the token was generated
    exp: number; // Expire
    iss: string; // Issuer
    data: { // Información del usuario
        id: number; // El ID del usuario en el payload (probablemente number)
        username: string; // El username
        // Agrega otros campos que tu token JWT contenga dentro de data
    };
    // Si hay otros campos fuera de data en tu payload, agrégalos aquí
}

// Interfaz para los detalles del usuario logueado (lo que almacenaremos en el estado currentUser)
interface CurrentUser {
    id: string; // ID del usuario logueado como string para comparación
    username: string;
    // Agrega otros campos del usuario si los necesitas frecuentemente en el frontend
}

// Componente para mostrar el estado de la disputa
const DisputeStatusNotificationComponent = ({ 
    task, 
    getEscrowByContractIds 
}: { 
    task: TaskDetails | null; 
    getEscrowByContractIds?: (params: { contractIds: string[]; validateOnChain?: boolean }) => Promise<any>;
}) => {
    const { t } = useI18n();
    const [escrowInfo, setEscrowInfo] = useState<{
        isDisputed: boolean;
        isResolved: boolean;
        isRefunded: boolean;
        balance: number;
    } | null>(null);
    const [loadingEscrowInfo, setLoadingEscrowInfo] = useState(false);

    useEffect(() => {
        const fetchEscrowInfo = async () => {
            if (!task?.escrow_id || !getEscrowByContractIds) return;
            
            setLoadingEscrowInfo(true);
            try {
                const escrowResult = await getEscrowByContractIds({ 
                    contractIds: [task.escrow_id],
                    validateOnChain: true 
                });
                
                const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
                
                if (escrows && escrows.length > 0) {
                    const escrow = escrows[0];
                    const flags = escrow.flags || {};
                    const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
                    
                    setEscrowInfo({
                        isDisputed: escrowIndexerIsDisputed(escrow as Record<string, unknown>),
                        isResolved: flags.resolved === true,
                        isRefunded: flags.resolved === true && balance === 0,
                        balance: balance
                    });
                }
            } catch (error: any) {
            } finally {
                setLoadingEscrowInfo(false);
            }
        };

        fetchEscrowInfo();
        // Actualizar cada 5 segundos
        const interval = setInterval(fetchEscrowInfo, 5000);
        return () => clearInterval(interval);
    }, [task?.escrow_id, getEscrowByContractIds]);

    if (loadingEscrowInfo) {
        return (
            <div className="arcusx-alert arcusx-alert--warning" style={{ marginBottom: '15px' }}>
                <strong> {t('supervise.escrow.dispute')}</strong>
                <p style={{ margin: '5px 0 0 0' }}>
                    {t('supervise.dispute.verifying')}
                </p>
            </div>
        );
    }

    const isRefunded = escrowInfo?.isRefunded || task?.escrow_status === 'refunded';
    const isResolved = escrowInfo?.isResolved || false;
    const isDisputed = escrowInfo?.isDisputed === true;

    if (!loadingEscrowInfo && !isDisputed && !isRefunded && !isResolved) {
        return null;
    }

    return (
        <div
            className={`arcusx-alert ${isRefunded ? 'arcusx-alert--success' : 'arcusx-alert--warning'}`}
            style={{ marginBottom: '15px' }}
        >
            <strong>{isRefunded ? '' : ''} {t('supervise.escrow.dispute')}</strong>
            <p style={{ margin: '5px 0 0 0' }}>
                {isRefunded 
                    ? t('supervise.dispute.resolved.refund')
                    : isResolved
                    ? t('supervise.dispute.resolved.processing')
                    : isDisputed
                    ? t('supervise.dispute.in.dispute')
                    : t('supervise.dispute.verifying')
                }
            </p>
            {escrowInfo && (
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontStyle: 'italic' }}>
                    {t('supervise.dispute.balance')} {escrowInfo.balance.toFixed(7)} USDC
                </p>
            )}
        </div>
    );
};

const SuperviseTask = () => {
    const { taskId, acceptedApplicantId } = useParams<{ taskId: string, acceptedApplicantId: string }>();
    const navigate = useNavigate();
    const { t } = useI18n();

    const messagingErrorLabel = useCallback(
        (code: string) => {
            if (code === 'link_required') return t('supervise.error.messaging.link');
            if (code === 'not_authenticated') return t('supervise.error.messaging.session');
            if (code === 'permission_denied') return t('supervise.error.messaging.permission');
            return code;
        },
        [t],
    );

    const [task, setTask] = useState<TaskDetails | null>(null);
    const [worker, setWorker] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifyingDelivery, setNotifyingDelivery] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para popups de éxito
    const [showPaymentSuccessPopup, setShowPaymentSuccessPopup] = useState(false);
    const [showClientPaymentPopup, setShowClientPaymentPopup] = useState(false);
    
    // Estados para sistema de ratings
    const [paymentSuccessData, setPaymentSuccessData] = useState<{
        amount: string;
        txHash: string;
        netAmount?: string;
    } | null>(null);
    
    
    // Estados para el chat
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const messagesAreaRef = useRef<HTMLDivElement>(null);
    const lastMessageIdRef = useRef<string | null>(null);
    
    // Estado para el usuario actual logueado (usamos la nueva interfaz CurrentUser)
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    // Estados para wallet y blockchain (Stellar/Freighter)
    const { address, isConnected, kit } = useWallet();

    // Hooks de Trustless Work
    const { approveMilestone } = useApproveMilestone();
    const { releaseFunds } = useReleaseFunds();
    const { sendTransaction } = useSendTransaction();
    const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
    const { startDispute } = useStartDispute();
    const { resolveDispute } = useResolveDispute();
    
    // Obtener platform fee del backend
    const { platformFee } = usePlatformFee();
    
    // Verificar y eliminar tareas programadas automáticamente
    useScheduledTaskDeletion();
    
    // Todos los escrows usan Trustless Work ahora
    
    // Verificar que kit esté inicializado
    useEffect(() => {
        // Kit initialization check
    }, [kit]);
    
    // Estados para acciones de trabajo
    const [acceptingWork] = useState(false);
    const [showCompleteTaskPopup, setShowCompleteTaskPopup] = useState(false);
    // Cache para escrow data y debouncing
    const [escrowCache, setEscrowCache] = useState<any>(null);
    const [lastEscrowFetch, setLastEscrowFetch] = useState<number>(0);
    const escrowFetchInProgress = useRef<boolean>(false);
    const escrowFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Estados para cancelación y reembolso
    const [cancellingTask, setCancellingTask] = useState(false);
    const [checkingCancellation, setCheckingCancellation] = useState(false);
    const [showRefundSignature, setShowRefundSignature] = useState(false);
    const [refundTransaction, setRefundTransaction] = useState<{
      unsignedXdr: string;
      refundAmount: number;
      contractId: string;
    } | null>(null);
    const [showRefundNotification, setShowRefundNotification] = useState(false);
    const [refundNotificationMessage, setRefundNotificationMessage] = useState<string>('');
    const [, setCancellationAllowed] = useState<{
      allowed: boolean;
      reason?: string;
      requiresDispute: boolean;
      refundAmount?: number;
    } | null>(null);
    const [pendingTransaction, setPendingTransaction] = useState<{
        hasPending: boolean;
        signedBy?: string;
        waitingFor?: string;
        escrowCompleted?: boolean; // Indica si el escrow está completado/liberado en Trustless Work
    } | null>(null);
    
    // Estados para disputa
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const [showDisputeSuccessPopup, setShowDisputeSuccessPopup] = useState(false);
    const [disputeTxHash, setDisputeTxHash] = useState<string | null>(null);
    
    // Estados para popup de confirmación
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'warning' | 'info' | 'danger';
    } | null>(null);
    const [creatingDispute, setCreatingDispute] = useState(false);
    const [hasExistingDispute, setHasExistingDispute] = useState(false);
    const [isRefunded, setIsRefunded] = useState(false);
    const [isResolved, setIsResolved] = useState(false);

    // Cargar usuario actual desde localStorage al montar el componente
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && typeof token === 'string' && token !== '') {
            try {
                const decodedToken = jwtDecode<DecodedToken>(token);
                setCurrentUser({
                    id: String(decodedToken.data.id),
                    username: decodedToken.data.username
                });
            } catch (err) {
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
        }
    }, []); // Se ejecuta solo una vez al montar


    // Función para cargar datos
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const taskResponse = await axios.get(arcusxApiUrl('get_task_details', { task_id: taskId }));
                let taskRow: TaskDetails | null = null;
                
                if (taskResponse.data) {
                    taskRow = parseTaskDetailsPayload(
                      taskResponse.data as Record<string, unknown>,
                    ) as unknown as TaskDetails;

                    const apiResolved =
                      taskRow.escrow_status === 'resolved' ||
                      taskRow.status === 'resolved' ||
                      Boolean(taskRow.dispute_resolved_at);
                    if (apiResolved) {
                      setIsResolved(true);
                      setHasExistingDispute(false);
                    }

                    if (taskRow.user_id === undefined || taskRow.user_id === null || typeof taskRow.user_id !== 'string') {
                         setError(t('supervise.error.detailsNoUserId'));
                         setLoading(false);
                         return;
                    }
                    if (taskRow.client_accepted_completion === undefined || typeof taskRow.client_accepted_completion !== 'number' ||
                        taskRow.worker_accepted_completion === undefined || typeof taskRow.worker_accepted_completion !== 'number') {
                        setError(t('supervise.error.detailsNoAcceptance'));
                        setLoading(false);
                        return;
                    }

                    // Verificar estado del escrow desde Trustless Work si hay escrow_id
                    let updatedTaskData = { ...taskRow };
                    if (taskRow.escrow_id && getEscrowByContractIds) {
                        try {
                            const escrowResult = await getEscrowByContractIds({ 
                                contractIds: [taskRow.escrow_id],
                                validateOnChain: true 
                            });
                            
                            const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
                            
                            if (escrows && escrows.length > 0) {
                                const escrow = escrows[0];
                                const flags = escrow.flags || {};
                                // Verificar disputa usando flags.disputed (método correcto según DisputeManagement)
                                const isDisputed = escrowIndexerIsDisputed(
                                  escrow as Record<string, unknown>,
                                );
                                
                                //  CRÍTICO: Verificar si el escrow está resuelto
                                const escrowIsResolved = flags.resolved === true || 
                                                         escrow.isResolved === true || 
                                                         escrow.resolved === true || 
                                                         escrow.status === 'resolved';
                                
                                // Actualizar estado local
                                setIsResolved(escrowIsResolved);
                                
                                // Actualizar escrow_status con el estado real de Trustless Work
                                if (escrowIsResolved) {
                                    updatedTaskData.escrow_status = 'resolved';
                                    updatedTaskData.status = 'resolved';
                                    setHasExistingDispute(false);
                                } else if (isDisputed) {
                                    updatedTaskData.escrow_status = 'disputed';
                                    updatedTaskData.status = 'disputed';
                                    setHasExistingDispute(true);
                                } else if (escrow.status) {
                                    updatedTaskData.escrow_status = mergeEscrowStatusFromIndexer(
                                      updatedTaskData.escrow_status,
                                      String(escrow.status),
                                    );
                                }
                            }
                        } catch (escrowError: any) {
                            // Continuar con los datos del backend
                        }
                    }

                    const onChainResolved =
                      updatedTaskData.escrow_status === 'resolved' ||
                      updatedTaskData.status === 'resolved';
                    if (onChainResolved && !updatedTaskData.scheduled_deletion_at) {
                      try {
                        const refresh = await axios.get(
                          arcusxApiUrl('get_task_details', { task_id: taskId }),
                        );
                        const refreshed = parseTaskDetailsPayload(
                          refresh.data as Record<string, unknown>,
                        ) as Partial<TaskDetails>;
                        updatedTaskData = {
                          ...updatedTaskData,
                          ...refreshed,
                          escrow_status: 'resolved',
                          status: refreshed.status === 'disputed'
                            ? 'resolved'
                            : (refreshed.status ?? updatedTaskData.status),
                        };
                      } catch {
                        /* keep indexer overlay */
                      }
                    }

                    setTask(updatedTaskData);
                } else {
                    setError(t('supervise.error.loadTaskFailed'));
                    setLoading(false);
                    return;
                }

                const workerIdToFetch = resolveSuperviseWorkerUserId({
                    taskOwnerUserId: taskRow.user_id,
                    acceptedApplicantId: taskRow.accepted_applicant_id,
                    invitedUserId: taskRow.invited_user_id,
                    urlApplicantId: acceptedApplicantId,
                });
                
                if (!workerIdToFetch) {
                    setError(t('supervise.error.missingIds'));
                    setLoading(false);
                    return;
                }
                
                const workerResponse = await axios.get(arcusxApiUrl('get_user_details', { user_id: workerIdToFetch }));
                
                if (workerResponse.data) {
                    if (workerResponse.data.id === undefined || workerResponse.data.id === null) {
                         setError(t('supervise.error.workerNoId'));
                         setLoading(false);
                         return;
                    }
                     const workerDetails: UserDetails = {
                         ...workerResponse.data,
                         id: String(workerResponse.data.id)
                     };
                    setWorker(workerDetails);
                } else {
                    setError(t('supervise.error.loadWorkerFailed'));
                    setLoading(false);
                    return;
                }

            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message;
                setError(t('supervise.error.loadDetails') + ' ' + errorMessage);
                
                // Si el error indica que la tarea no existe, redirigir al dashboard
                if (errorMessage && (
                    errorMessage.toLowerCase().includes('tarea no existe') ||
                    errorMessage.toLowerCase().includes('tarea no encontrada') ||
                    errorMessage.toLowerCase().includes('task not found') ||
                    err.response?.status === 404
                )) {
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 2000); // Esperar 2 segundos para que el usuario vea el mensaje de error
                }
            } finally {
                setLoading(false);
            }
        };

    // useEffect para cargar datos
    useEffect(() => {
        if (taskId && acceptedApplicantId) {
            fetchData();
        } else {
            setError(t('supervise.error.missingIds'));
            setLoading(false);
        }
    }, [taskId, acceptedApplicantId]); // Dependencias del useEffect

    const workStartMarkedRef = useRef(false);
    useEffect(() => {
        if (!taskId || !task || !currentUser || workStartMarkedRef.current) return;
        if (String(task.accepted_applicant_id) !== String(currentUser.id)) return;
        if (!task.escrow_id || task.escrow_status !== 'active') return;
        if (task.worker_started_at) return;

        workStartMarkedRef.current = true;
        markWorkStarted(parseInt(taskId, 10))
            .then((r) => {
                setTask((prev) =>
                    prev
                        ? {
                              ...prev,
                              worker_started_at: r.started_at ?? prev.worker_started_at,
                              status: prev.status === 'assigned' ? 'in_progress' : prev.status,
                          }
                        : prev,
                );
            })
            .catch(() => {
                workStartMarkedRef.current = false;
            });
    }, [
        taskId,
        task?.id,
        task?.worker_started_at,
        task?.escrow_status,
        task?.escrow_id,
        task?.accepted_applicant_id,
        currentUser?.id,
    ]);

    // Cargar mensajes: `silent` evita loading en pantalla (polling) para que no parpadee el chat
    const fetchMessages = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = opts?.silent === true;
        if (!taskId) {
             return;
        }

        if (!silent) {
        setLoadingMessages(true);
        }
        try {
            if (!hasSupabase) {
                if (!silent) {
                    setError(t('common.error.supabaseMessaging'));
                }
                setMessages([]);
            } else {
                const raw = localStorage.getItem('user');
                const u = raw ? JSON.parse(raw) : null;
                if (u?.id != null) {
                    await prepareSupabaseArcusxSession(Number(u.id));
                } else {
                    throw new Error('not_authenticated');
                }
                const tid = parseInt(String(taskId), 10);
                const rows = await fetchTaskMessagesSupabase(tid);
                const formattedMessages: Message[] = rows.map((msg) => ({
                    ...msg,
                    id: String(msg.id),
                    task_id: String(msg.task_id),
                    sender_id: String(msg.sender_id),
                    receiver_id: String(msg.receiver_id),
                    message: String((msg as { message?: string }).message ?? ''),
                    is_read: (msg as { is_read?: boolean | number }).is_read ? 1 : 0,
                    created_at: String((msg as { created_at?: string }).created_at ?? ''),
                }));
                setMessages((prev) => {
                    if (
                        prev.length === formattedMessages.length &&
                        formattedMessages.length > 0 &&
                        prev.every((m, i) => {
                            const n = formattedMessages[i];
                            return (
                                n &&
                                String(m.id) === String(n.id) &&
                                m.message === n.message &&
                                String(m.created_at) === String(n.created_at)
                            );
                        })
                    ) {
                        return prev;
                    }
                    return formattedMessages;
                });
            }
        } catch (error: unknown) {
             if (!silent) {
                 const raw = error instanceof Error ? error.message : String(error);
                 const code = formatArcusxMessagingError(raw);
                 setError(t('supervise.error.load.messages') + ' ' + messagingErrorLabel(code));
             }
        } finally {
            if (!silent) {
            setLoadingMessages(false);
        }
        }
    }, [taskId, t, messagingErrorLabel]);

    const taskIdNum = taskId ? parseInt(String(taskId), 10) : null;
    useTaskMessagesRealtime({
        taskId: Number.isFinite(taskIdNum) ? taskIdNum : null,
        enabled: Boolean(task && worker && currentUser),
        onChange: () => {
            void fetchMessages({ silent: true });
        },
    });

    useEffect(() => {
        if (task && worker && currentUser) {
            void fetchMessages();
            const interval = setInterval(() => {
                void fetchMessages({ silent: true });
            }, 120000);
            return () => clearInterval(interval);
        }
    }, [task, worker, currentUser, fetchMessages]);

    // Popup de pago al recargar supervisión tras liberar fondos (solo con hash real on-chain)
    useEffect(() => {
        if (!task || !currentUser || task.client_accepted_completion !== 1) return;

            const isClientUser = String(currentUser.id) === String(task.user_id);
        const releaseHash = task.escrow_release_tx_hash?.trim() ?? '';
        const fundsReleased =
            task.status === 'completed' ||
            task.escrow_status === 'completed' ||
            isStellarTxHash(releaseHash);

        if (
            isClientUser &&
            fundsReleased &&
            isStellarTxHash(releaseHash) &&
            !showClientPaymentPopup &&
            !paymentSuccessData
        ) {
                const workerAmount = workerNetFromTaskPrice(task.price);
            const fee =
                task.escrow_platform_fee != null
                    ? Number(task.escrow_platform_fee)
                    : platformFee;
            const escrowAmount =
                task.escrow_amount != null
                    ? Number(task.escrow_amount)
                    : quoteEscrowFundAmount(workerAmount, fee);

                setPaymentSuccessData({
                    amount: escrowAmount.toFixed(7),
                txHash: releaseHash,
                netAmount: workerAmount.toFixed(7),
            });

            const timer = window.setTimeout(() => setShowClientPaymentPopup(true), 300);
            return () => window.clearTimeout(timer);
        }
    }, [task, currentUser, showClientPaymentPopup, paymentSuccessData, platformFee]);

    // Solo hace scroll el panel del chat (no la página entera: scrollIntoView en el sentinel subía el window)
    useEffect(() => {
        if (messages.length === 0) {
            lastMessageIdRef.current = null;
            return;
        }
        const last = messages[messages.length - 1];
        const lastId = String(last.id);
        if (lastMessageIdRef.current === lastId) {
            return;
        }
        lastMessageIdRef.current = lastId;
        const t = window.setTimeout(() => {
            const el = messagesAreaRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }, 0);
        return () => clearTimeout(t);
    }, [messages]);

    // Función optimizada para obtener escrow con cache y debouncing (definida antes de los useEffect que la usan)
    const getEscrowDataOptimized = async (forceRefresh: boolean = false): Promise<any> => {
        if (!task || !task.escrow_id || !getEscrowByContractIds) {
            return null;
        }

        const now = Date.now();
        const CACHE_DURATION = 5000; // 5 segundos de cache
        const MIN_FETCH_INTERVAL = 3000; // Mínimo 3 segundos entre fetches

        // Si hay una petición en progreso, esperar
        if (escrowFetchInProgress.current && !forceRefresh) {
            return escrowCache;
        }

        // Si el cache es válido y no se fuerza refresh, usar cache
        if (!forceRefresh && escrowCache && (now - lastEscrowFetch) < CACHE_DURATION) {
            return escrowCache;
        }

        // Si la última petición fue hace menos de MIN_FETCH_INTERVAL, usar cache
        if (!forceRefresh && (now - lastEscrowFetch) < MIN_FETCH_INTERVAL) {
            return escrowCache;
        }

        // Limpiar timeout anterior si existe
        if (escrowFetchTimeoutRef.current) {
            clearTimeout(escrowFetchTimeoutRef.current);
        }

        // Usar debouncing: esperar 500ms antes de hacer la petición
        return new Promise((resolve) => {
            escrowFetchTimeoutRef.current = setTimeout(async () => {
                escrowFetchInProgress.current = true;
                try {
                    const escrowResult = await getEscrowByContractIds({ 
                        contractIds: [task.escrow_id!],
                        validateOnChain: true 
                    });
                    const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
                    
                    if (escrows && escrows.length > 0) {
                        setEscrowCache(escrows[0]);
                        setLastEscrowFetch(Date.now());
                        resolve(escrows[0]);
                    } else {
                        resolve(null);
                    }
                } catch (error: any) {
                    // Si es error 429, usar cache si existe
                    if (error.response?.status === 429 && escrowCache) {
                        resolve(escrowCache);
                    } else {
                        resolve(escrowCache); // Devolver cache en caso de error
                    }
                } finally {
                    escrowFetchInProgress.current = false;
                }
            }, forceRefresh ? 0 : 500);
        });
    };

    // Verificar estado del escrow en Trustless Work (reemplaza verificación de transacciones pendientes del sistema antiguo)
    useEffect(() => {
        const checkEscrowStatus = async () => {
            if (!task || !taskId || !task.escrow_id) return;
            
            // Si la tarea ya está completada, no necesitamos verificar
            if (task.status === 'completed' && task.escrow_status === 'completed') {
                setPendingTransaction({ hasPending: false, escrowCompleted: true });
                return;
            }

            try {
                // Usar función optimizada con cache
                const escrow = await getEscrowDataOptimized(false);
                
                if (escrow) {
                    const flags = escrow.flags || {};
                    const balance = parseFloat(escrow.balance || escrow.currentBalance || '0');
                    const isDisputed = flags.disputed === true || escrow.isDisputed === true || escrow.disputed === true;
                    const escrowIsResolved = flags.resolved === true || escrow.isResolved === true || escrow.resolved === true || escrow.status === 'resolved';
                    const isReleased = balance === 0 || escrow.status === 'released' || escrow.status === 'completed';
                    
                    //  CRÍTICO: Detectar si el escrow está resuelto (independientemente de si fue disputado)
                    setIsResolved(escrowIsResolved);
                    
                    //  MEJORA: Detectar si el escrow fue reembolsado (resuelto y balance = 0)
                    const wasRefunded = escrowIsResolved && balance === 0 && isDisputed;
                    setIsRefunded(wasRefunded);
                    
                    // Si está resuelto, no hay transacciones pendientes y los botones deben estar ocultos
                    if (escrowIsResolved) {
                        setPendingTransaction({ hasPending: false, escrowCompleted: false });
                        return;
                    }
                    
                    // Verificar si el cliente ya aceptó (client_accepted_completion === 1)
                    if (task.client_accepted_completion !== 1) return;
                    
                    if (isReleased) {
                        // Escrow completado - fondos liberados
                    setPendingTransaction({
                            hasPending: false, 
                            escrowCompleted: true 
                    });
                    } else {
                        // Escrow activo pero no liberado aún
                    setPendingTransaction({
                        hasPending: true,
                            signedBy: 'client',
                            waitingFor: 'worker',
                            escrowCompleted: false
                    });
                    }
                } else {
                    setPendingTransaction({ hasPending: false });
                }
            } catch (error: any) {
                // Si hay error, verificar si es porque el endpoint está deprecado (410)
                if (error.response?.status === 410) {
                    // El endpoint está deprecado, usar Trustless Work directamente
                    // Sistema antiguo deprecado, usando Trustless Work
                }
                // Si no hay escrow o hay error, asumir que no hay transacción pendiente
                setPendingTransaction({ hasPending: false });
            }
        };

        checkEscrowStatus();
        //  MEJORA: Reducir frecuencia de verificación para evitar error 429 (Too Many Requests)
        // Verificar cada 15 segundos en lugar de 5 segundos
        const interval = setInterval(checkEscrowStatus, 15000);
        return () => clearInterval(interval);
    }, [task, taskId]);

    // Verificar estado del escrow cuando ambos aceptaron (Trustless Work)
    useEffect(() => {
        const checkEscrowStatusWhenBothAccepted = async () => {
            if (!task || !taskId || !currentUser) return;
            // Verificar si ambos aceptaron
            if (task.client_accepted_completion !== 1 || task.worker_accepted_completion !== 1) return;
            if (!task.escrow_id) return;

            try {
                // Usar función optimizada con cache
                const escrow = await getEscrowDataOptimized(false);
                
                if (escrow) {
                    const balance = parseFloat(escrow.balance || '0');
                    const isReleased = balance === 0 || escrow.status === 'released' || escrow.status === 'completed';
                    
                    if (isReleased) {
                        // Escrow completado - fondos liberados
                    setPendingTransaction({
                            hasPending: false, 
                            escrowCompleted: true 
                        });
                    } else {
                        // Escrow activo pero no liberado aún
                    setPendingTransaction({
                        hasPending: true,
                            signedBy: 'both',
                            waitingFor: undefined,
                            escrowCompleted: false
                    });
                    }
                } else {
                    setPendingTransaction({ hasPending: false });
                }
            } catch (error: any) {
                // Si hay error, verificar si es porque el endpoint está deprecado (410)
                if (error.response?.status === 410) {
                    // El endpoint está deprecado, usar Trustless Work directamente
                    // Sistema antiguo deprecado, usando Trustless Work
                }
                // Si no hay escrow o hay error, asumir que no hay transacción pendiente
                setPendingTransaction({ hasPending: false });
            }
        };

        checkEscrowStatusWhenBothAccepted();
        // Verificar cada 5 segundos el estado del escrow (reducido para evitar rate limits)
        const interval = setInterval(checkEscrowStatusWhenBothAccepted, 5000);
        return () => clearInterval(interval);
    }, [task, taskId, currentUser, isConnected]);

    // Verificar estado del escrow periódicamente para detectar disputas
    useEffect(() => {
        const checkEscrowDisputeStatus = async () => {
            if (!task || !taskId || !task.escrow_id) return;
            
            // Solo verificar si la tarea no está completada
            if (task.status === 'completed' && task.escrow_status === 'completed') return;

            try {
                // Usar función optimizada con cache
                const escrow = await getEscrowDataOptimized(false);
                
                if (escrow) {
                    const flags = escrow.flags || {};
                    // Verificar disputa usando flags.disputed (método correcto según DisputeManagement)
                    const isDisputed = escrowIndexerIsDisputed(
                      escrow as Record<string, unknown>,
                    );
                    
                    //  CRÍTICO: Verificar si el escrow está resuelto
                    const escrowIsResolved = flags.resolved === true || 
                                             escrow.isResolved === true || 
                                             escrow.resolved === true || 
                                             escrow.status === 'resolved';
                    
                    if (escrowIsResolved) {
                        setIsResolved(true);
                        setHasExistingDispute(false);

                        const needsSchedule = !task.scheduled_deletion_at;
                        const needsStatusSync =
                          task.escrow_status !== 'resolved' || task.status !== 'resolved';

                        if (needsStatusSync) {
                          setTask((prevTask) =>
                            prevTask
                              ? {
                                  ...prevTask,
                                  status: 'resolved',
                                  escrow_status: 'resolved',
                                }
                              : prevTask,
                          );
                        }

                        if (needsSchedule) {
                          axios
                            .get(arcusxApiUrl('get_task_details', { task_id: taskId }))
                            .then((refresh) => {
                              const refreshed = parseTaskDetailsPayload(
                                refresh.data as Record<string, unknown>,
                              ) as Partial<TaskDetails>;
                              setTask((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      ...refreshed,
                                      escrow_status: 'resolved',
                                      status:
                                        refreshed.status === 'disputed'
                                          ? 'resolved'
                                          : (refreshed.status ?? prev.status),
                                    }
                                  : prev,
                              );
                            })
                            .catch(() => undefined);
                        }
                        return;
                    }
                    
                    // Si el escrow está en disputa pero el estado local no lo refleja, actualizar
                    if (isDisputed && task.escrow_status !== 'disputed' && task.status !== 'disputed' && !escrowIsResolved) {
                        setTask(prevTask => {
                            if (!prevTask) return null;
                            return { 
                                ...prevTask, 
                                status: 'disputed',
                                escrow_status: 'disputed'
                            };
                        });
                        setHasExistingDispute(true);
                    }
                }
            } catch (error: any) {
                // Silenciar errores de verificación periódica (solo log en desarrollo)
                if (process.env.NODE_ENV === 'development') {
                }
            }
        };

        // Verificar inmediatamente
        checkEscrowDisputeStatus();
        
        //  MEJORA: Reducir frecuencia de verificación para evitar error 429 (Too Many Requests)
        // Verificar cada 20 segundos en lugar de 8 segundos
        const interval = setInterval(checkEscrowDisputeStatus, 20000);
        return () => clearInterval(interval);
    }, [task, taskId]);



    // Función para enviar mensaje
    const sendMessage = async () => {
        // Asegurarse de que newMessage no está vacío
        if (!newMessage.trim()) {
             return;
        }

        // Validar que tenemos toda la información necesaria
        if (!currentUser || !task || !worker || !taskId || !acceptedApplicantId) {
            setError(t('supervise.error.sendMessageData'));
            return;
        }

        setSendingMessage(true);
        setError(null);
        try {
            if (!hasSupabase) {
                setError(t('common.error.supabaseMessaging'));
                return;
            }

            const raw = localStorage.getItem('user');
            const u = raw ? JSON.parse(raw) : null;
            if (u?.id == null) {
                setError(t('supervise.error.messaging.session'));
                return;
            }
            await prepareSupabaseArcusxSession(Number(u.id));

            const taskIdNum = parseInt(taskId, 10);

            let actualReceiverId = 0;
            if (currentUser.id === task.user_id) {
                actualReceiverId = parseInt(acceptedApplicantId, 10);
            } else if (currentUser.id === worker.id) {
                actualReceiverId = parseInt(task.user_id, 10);
            } else {
                setError(t('supervise.error.unauthorizedSend'));
                return;
            }
            
            const result = await sendTaskMessageSupabase({
                    task_id: taskIdNum,
                receiver_mysql_id: actualReceiverId,
                body: newMessage.trim(),
            });
            if (result.success) {
                setNewMessage('');
                void fetchMessages({ silent: true });
            } else {
                setError(t('supervise.error.messageNotSent') + ' ' + (result.message || t('supervise.error.sendMessage')));
            }
        } catch (err: unknown) {
            const raw =
                err instanceof Error
                    ? err.message
                    : String((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? err);
            const code = formatArcusxMessagingError(raw);
            setError(t('supervise.error.sendMessage') + ' ' + messagingErrorLabel(code));
        } finally {
            setSendingMessage(false);
        }
    };


    // Función para aceptar trabajo (cliente) - Actualiza BD y firma transacción
    /* Cliente: aprobar hito y liberar fondos (Trustless Work; firma del creador / cliente) */
    const handleAcceptWork = async () => {
        if (!task || !isConnected || !address) {
            setError(t('supervise.error.connectFreighterAccept'));
            return;
        }

        if (!task.escrow_id) {
            setError(t('supervise.error.noEscrow'));
            return;
        }

        // Mostrar popup de completar tarea con dos pasos
        setShowCompleteTaskPopup(true);
    };

    // Funciones para el popup de completar tarea
    const handleApproveMilestone = async (): Promise<{ success: boolean; txHash?: string; error?: string; alreadyApproved?: boolean }> => {
        if (!task || !task.escrow_id || !address || !kit) {
            throw new Error('Wallet no conectada o datos faltantes');
        }

        const indexerWrapper = async (_contractIds: string[]) => {
            const escrow = await getEscrowDataOptimized(true);
            return escrow ? [escrow] : [];
        };

        const escrowRow = (await getEscrowDataOptimized(false)) as DealEscrowIndexerRow | null;
        const approver = resolveEscrowApprover(escrowRow, address);
        assertClientCanSignEscrowAction(approver, address, 'aprobar milestone');

        const result = await approveMilestoneTrustlessEscrow(
                    task.escrow_id,
            '0',
                       approver,
            kit,
            approveMilestone,
            sendTransaction,
            indexerWrapper
        );

        // Si se aprobó exitosamente, actualizar cache inmediatamente con milestone aprobado
        if (result.success && escrowCache) {
            // Actualizar cache local para reflejar que el milestone está aprobado
            const updatedEscrow = {
                ...escrowCache,
                milestones: escrowCache.milestones?.map((m: any, idx: number) => 
                    idx === 0 ? { ...m, status: 'approved', approved: true } : m
                ) || [{ status: 'approved', approved: true }]
            };
            setEscrowCache(updatedEscrow);
            setLastEscrowFetch(Date.now());
        } else if (result.success) {
            // Si no hay cache, invalidar para forzar refresh
            setEscrowCache(null);
            setLastEscrowFetch(0);
        }

                    return result;
                };
                
    const handleReleaseFunds = async (): Promise<{ success: boolean; txHash?: string; error?: string; alreadyReleased?: boolean }> => {
        if (!task || !task.escrow_id || !address || !kit) {
            throw new Error('Wallet no conectada o datos faltantes');
        }

        const indexerWrapper = async (_contractIds: string[]) => {
            const escrow = await getEscrowDataOptimized(true);
            return escrow ? [escrow] : [];
        };

        const escrowRow = (await getEscrowDataOptimized(false)) as DealEscrowIndexerRow | null;
        const releaseSigner = resolveEscrowReleaseSigner(escrowRow, address);
        assertClientCanSignEscrowAction(releaseSigner, address, 'liberar fondos');

        const result = await releaseFundsTrustlessEscrow(
                    task.escrow_id,
            releaseSigner,
                    kit,
                    releaseFunds,
                    sendTransaction,
                    indexerWrapper
                );

        return result;
    };

    const handleVerifyMilestone = async (): Promise<boolean> => {
        if (!task || !task.escrow_id) {
            return false;
        }

        try {
            const escrow = (await getEscrowDataOptimized(false)) as DealEscrowIndexerRow | null;
            return isDealMilestoneApproved(escrow);
        } catch {
            return false;
        }
    };

    const handlePersistTaskRelease = async (payload: {
        releaseTxHash?: string;
        rating?: number;
        taskId?: number;
        workerId?: number;
    }): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch(arcusxApiUrl('complete_task'), {
                method: 'POST',
                headers: arcusxApiHeaders(),
                body: JSON.stringify({
                    task_id: payload.taskId ?? parseInt(taskId!, 10),
                    action: 'accept',
                    escrow_completed: true,
                    tx_hash: payload.releaseTxHash ?? null,
                    rating: payload.rating,
                    rated_user_id: payload.workerId,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data?.success === false) {
                return {
                    success: false,
                    error: data?.message || 'Error al actualizar estado en BD',
                };
            }
            return { success: true };
        } catch (err: unknown) {
            return {
                success: false,
                error: err instanceof Error ? err.message : 'Error al actualizar estado en BD',
            };
        }
    };

    const handleCompleteTaskPopupComplete = async (payload?: TaskCompletionPayload) => {
        const releaseTxHash = payload?.releaseTxHash;

        try {
            const completedAt = new Date().toISOString();
            const scheduledDeletionAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            setTask(prev => prev ? {
                ...prev,
                client_accepted_completion: 1,
                worker_accepted_completion: prev.worker_accepted_completion || 1,
                status: 'completed',
                escrow_status: 'completed',
                escrow_completed_at: completedAt,
                completed_at: completedAt,
                escrow_release_tx_hash: releaseTxHash ?? prev.escrow_release_tx_hash ?? null,
                scheduled_deletion_at: scheduledDeletionAt,
            } : null);
            if (releaseTxHash && task) {
                const workerAmount = workerNetFromTaskPrice(task.price);
                const fee =
                    task.escrow_platform_fee != null
                        ? Number(task.escrow_platform_fee)
                        : platformFee;
                const escrowAmount =
                    task.escrow_amount != null
                        ? Number(task.escrow_amount)
                        : quoteEscrowFundAmount(workerAmount, fee);
                setPaymentSuccessData({
                    amount: escrowAmount.toFixed(7),
                    txHash: releaseTxHash,
                    netAmount: workerAmount.toFixed(7),
                });
            }

            // Recargar datos
            setTimeout(() => {
                fetchData();
            }, 500);

        } catch (err: any) {
            setError(t('supervise.error.updateTask') + ' ' + (err.response?.data?.message || err.message));
        }
    };

    // Función para rechazar trabajo - En Trustless Work se usa startDispute
    // Por ahora, solo actualizamos el estado en el backend
    // Nueva función para cancelar tarea con reembolso
    const handleCancelTask = async () => {
        if (!task || !task.escrow_id || !isConnected || !address || !kit) {
            setError(t('supervise.error.connectFreighterCancel'));
            return;
        }

        if (taskHasExchangeFiles(task.files)) {
            setError(t('supervise.status.useDisputeForRefund'));
            return;
        }

        setCheckingCancellation(true);
        setError(null);

        try {
            // 1. Verificar si cancelación está permitida
            const checkResult = await checkCancellationAllowed(parseInt(taskId!, 10));
            setCancellationAllowed(checkResult);

            if (!checkResult.allowed) {
                // Si requiere disputa, mostrar opción de iniciar disputa
                if (checkResult.requiresDispute) {
        setConfirmDialogConfig({
                        title: t('supervise.confirm.cancelNotAllowed'),
                        message: checkResult.reason || t('supervise.confirm.cancelReason'),
                        type: 'warning',
            onConfirm: () => {
                setShowConfirmDialog(false);
                            // Iniciar disputa
                            handleCreateDispute();
            }
        });
        setShowConfirmDialog(true);
                } else {
                    setError(checkResult.reason || t('supervise.error.cannotCancel'));
                }
            return;
        }

            // 2. Si está permitida, mostrar popup de confirmación
            setConfirmDialogConfig({
                title: t('supervise.confirm.cancel.title'),
                message: t('supervise.confirm.cancel.message').replace(
                    '{{amount}}',
                    String(task.escrow_amount ?? task.price ?? '—'),
                ),
                type: 'warning',
                onConfirm: () => {
                    setShowConfirmDialog(false);
                    executeCancelTask();
                }
            });
            setShowConfirmDialog(true);

        } catch (err: any) {
            setError(t('supervise.error.verifyCancel') + ' ' + (err.response?.data?.message || err.message));
        } finally {
            setCheckingCancellation(false);
        }
    };

    const executeCancelTask = async () => {
        if (!task || !task.escrow_id || !isConnected || !address || !kit) {
            setError(t('supervise.error.connectFreighterCancel'));
            return;
        }

        setCancellingTask(true);
        setError(null);

        try {
            // 1. Validar cancelación en backend
            const cancelResult = await cancelTaskService(parseInt(taskId!, 10));
            
            if (!cancelResult.allowed || cancelResult.requiresDispute) {
                throw new Error(cancelResult.message || 'Cancelación no permitida');
            }

            // Normalizar campos (el servicio ya lo hace, pero verificamos por si acaso)
            const requiresSignature = cancelResult.requiresSignature ?? (cancelResult as any).requires_signature ?? false;
            const refundAmount = cancelResult.refundAmount ?? (cancelResult as any).refund_amount ?? 0;
            
            if (!requiresSignature || !refundAmount || refundAmount <= 0) {
                throw new Error(`No se puede procesar el reembolso. Información incompleta. requiresSignature: ${requiresSignature}, refundAmount: ${refundAmount}`);
            }

            // 2. Obtener transacción no firmada de Trustless Work
            // NOTA: cancelTaskTrustlessEscrow ahora maneja automáticamente:
            // - Iniciar disputa si el escrow no está en disputa
            // - NO intenta resolver la disputa (eso lo hace el ADMIN)
            const refundResult = await cancelTaskTrustlessEscrow(
                task.escrow_id,
                address, // Cliente (receiver del reembolso)
                refundAmount, // Usar el valor normalizado
                kit,
                startDispute, // Necesario para iniciar disputa si no está en disputa
                resolveDispute, // No se usa actualmente, pero se requiere en la firma
                sendTransaction, // Necesario para enviar la transacción de inicio de disputa
                getEscrowByContractIds // Necesario para verificar estado del escrow
            );

            // 3. Verificar si requiere resolución por ADMIN
            if (refundResult.requiresAdminResolution) {
                // El ADMIN debe procesar la resolución
                setCancellingTask(false);
                
                //  MEJORA: Crear registro en la tabla disputes para que aparezca en el dashboard de admin
                try {
                    const token = localStorage.getItem('token');
                    if (token) {
                        await axios.post(
                            `${arcusxApiUrl('create_dispute')}`,
                            {
                                task_id: parseInt(taskId!, 10),
                                reason: 'Cancelación de tarea - Reembolso solicitado',
                                tx_hash: refundResult.txHash ?? null
                            },
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        // Registro de disputa creado en BD
                    }
                } catch (disputeError: any) {
                    // Continuar de todas formas, la disputa ya está iniciada en Trustless Work
                }
                
                // Actualizar estado local inmediatamente
                setTask(prevTask => {
                    if (!prevTask) return null;
                    return { 
                        ...prevTask, 
                        status: 'disputed',
                        escrow_status: 'disputed'
                    };
                });
                setHasExistingDispute(true);
                
                // Verificar estado del escrow desde Trustless Work para confirmar
                if (task.escrow_id) {
                    try {
                        // Esperar un poco para que la disputa se procese en la blockchain
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        const escrowResult = await getEscrowByContractIds({ 
                            contractIds: [task.escrow_id],
                            validateOnChain: true 
                        });
                        
                        const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
                        
                        if (escrows && escrows.length > 0) {
                            const escrow = escrows[0];
                            const isDisputed = escrowIndexerIsDisputed(
                              escrow as Record<string, unknown>,
                            );
                            
                            // Actualizar estado local con el estado real del escrow
                            if (isDisputed) {
                                setTask(prevTask => {
                                    if (!prevTask) return null;
                                    return { 
                                        ...prevTask, 
                                        status: 'disputed',
                                        escrow_status: 'disputed'
                                    };
                                });
                            }
                        }
                    } catch (escrowError: any) {
                        // Continuar de todas formas, el estado local ya está actualizado
                    }
                }
                
                setRefundNotificationMessage(refundResult.message || t('supervise.refund.successMessage'));
                setShowRefundNotification(true);
                
                // Recargar datos del backend para sincronizar
                setTimeout(() => {
                    fetchData();
                }, 1000);
                
                // Cerrar automáticamente después de 8 segundos
                setTimeout(() => {
                    setShowRefundNotification(false);
                }, 8000);
                return;
            }

            // 4. Firma directa de reembolso (flujo legacy si TW devuelve XDR)
            if (!refundResult.unsignedTransaction) {
                throw new Error(
                    refundResult.message ||
                    'No se recibió transacción de reembolso. Si iniciaste disputa, espera resolución del admin.',
                );
            }

            // 5. Mostrar popup de firma (solo si hay transacción para firmar)
            // IMPORTANTE: Poner cancellingTask en false para que el usuario pueda hacer clic en el botón
            setCancellingTask(false);
            setRefundTransaction({
                unsignedXdr: refundResult.unsignedTransaction,
                refundAmount: refundAmount, // Usar el valor normalizado
                contractId: task.escrow_id
            });
            setShowRefundSignature(true);

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
            
            // Si el error indica que el ADMIN debe procesar la resolución
            if (errorMessage.includes('ADMIN') || errorMessage.includes('disputeResolver')) {
                setError(t('supervise.error.cancelStarted'));
                // Cerrar el popup de firma si está abierto
                setShowRefundSignature(false);
                setRefundTransaction(null);
            } else {
                setError(t('supervise.error.cancelTask') + ' ' + errorMessage);
            }
            setCancellingTask(false);
        }
    };

    // Función para firmar y enviar transacción de reembolso
    const handleSignRefundTransaction = async () => {
        if (!refundTransaction || !kit || !address) {
            setError(t('supervise.error.txInfoUnavailable'));
            return;
        }

        setCancellingTask(true);
        setError(null);

        try {
            // Firmar y enviar transacción
            const result = await signAndSendRefundTransaction(
                refundTransaction.unsignedXdr,
                address,
                kit,
                sendTransaction
            );

            if (!result.success || !result.txHash) {
                throw new Error(result.error || 'Error al procesar reembolso');
            }

            // Confirmar cancelación en backend con tx_hash
            const confirmResult = await confirmCancellation(
                parseInt(taskId!, 10),
                result.txHash
            );

            if (!confirmResult.success) {
                throw new Error(confirmResult.message || 'Error al confirmar cancelación');
            }

            // Cerrar popup de firma
            setShowRefundSignature(false);
            setRefundTransaction(null);

            // Actualizar estado de la tarea
            setTask(prev => prev ? {
                ...prev,
                status: 'cancelled',
                escrow_status: 'refunded'
            } : null);

            // Mostrar mensaje de éxito
            setError(null);
            alert(` Tarea cancelada exitosamente. Reembolso de ${refundTransaction.refundAmount} USDC procesado.\n\nTX Hash: ${result.txHash}\n\nLos fondos han sido transferidos a tu wallet.`);

        } catch (err: any) {
            setError(t('supervise.error.processRefund') + ' ' + (err.response?.data?.message || err.message));
        } finally {
            setCancellingTask(false);
        }
    };

    // handleRejectWork ahora es handleCancelTask (mantener compatibilidad con código existente)

    // submitCompleteTransaction eliminada - No se usa en Trustless Work
    // getWorkerWalletAddress eliminada - No se usa en Trustless Work

    // Trabajador marca tarea como completada usando Trustless Work
    const handleCompleteTask = async () => {
        if (!taskId) {
            setError(t('supervise.error.taskIdUnavailable'));
            return;
        }

        // Mostrar popup de confirmación en lugar de confirm()
        setConfirmDialogConfig({
            title: t('supervise.confirm.notify.title'),
            message: t('supervise.confirm.notify.message'),
            type: 'info',
            onConfirm: () => {
                setShowConfirmDialog(false);
                executeCompleteTask();
            }
        });
        setShowConfirmDialog(true);
    };

    const executeCompleteTask = async () => {
        if (!taskId) {
            setError(t('supervise.error.taskIdUnavailable'));
            return;
        }

        setNotifyingDelivery(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError(t('supervise.error.noToken'));
                return;
            }

            const isWorkerUser =
              String(currentUser?.id) !== String(task?.user_id) &&
              String(currentUser?.id) === String(worker?.id);
            if (!isWorkerUser) {
                throw new Error(t('supervise.error.clientUseReleaseFlow'));
            }

            const response = await axios.post(`${arcusxApiUrl('complete_task')}`, 
                    {
                        task_id: parseInt(taskId, 10),
                        action: 'accept'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                if (!response.data.success) {
                    throw new Error(response.data.message || 'Error al actualizar estado en BD');
                }

                setTask(prevTask => {
                    if (!prevTask) return null;
                    return { 
                        ...prevTask, 
                        status: response.data.status || prevTask.status,
                        worker_accepted_completion: 1
                    };
                });
              
            setTimeout(() => {
                fetchData();
            }, 500);

            setError(null);
        } catch (err: any) {
            setError(t('supervise.error.completeTask') + ' ' + (err.response?.data?.message || err.message));
        } finally {
            setNotifyingDelivery(false);
        }
    };

    // ============================================
    // SISTEMA TRUSTLESS WORK - ELIMINADO
    // ============================================
    // Todo el código de Trustless Work ha sido eliminado
    // Trustless Work: aprobación y liberación firmadas por el cliente (ver trustlessWorkEscrowService)
    // ============================================
    
    // ============================================
    // SISTEMA TRUSTLESS WORK - ELIMINADO
    // ============================================
    // Las funciones de Trustless Work han sido eliminadas
    // Trustless Work: aprobación y liberación firmadas por el cliente (ver trustlessWorkEscrowService)
    // ============================================

    // Función para verificar si ya existe una disputa
    useEffect(() => {
        const checkExistingDispute = async () => {
            if (!taskId || !task) return;
            
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                // Verificar si la tarea ya está en estado 'disputed'
                if (task.status === 'disputed') {
                    setHasExistingDispute(true);
                    return;
                }
                
                // También podríamos hacer una llamada al backend para verificar
                // Por ahora, solo verificamos el estado de la tarea
                setHasExistingDispute(false);
            } catch (error) {
            }
        };
        
        checkExistingDispute();
    }, [taskId, task?.status]);
    
    // Función para crear una disputa
    const handleCreateDispute = async () => {
        if (!taskId || !disputeReason.trim()) {
            setError(t('supervise.error.disputeReasonMin'));
            return;
        }
        
        if (disputeReason.trim().length < 10) {
            setError(t('supervise.error.disputeReasonLength'));
            return;
        }
        
        if (!task || !task.escrow_id) {
            setError(t('supervise.error.noEscrow'));
            return;
        }

        if (!isConnected || !address || !kit) {
            setError(t('supervise.error.connectFreighterDispute'));
            return;
        }
        
        //  MEJORA: Validar permisos antes de iniciar disputa
        if (!currentUser) {
            setError(t('supervise.error.verifyIdentity'));
            return;
        }
        
        const isClient = currentUser.id === task.user_id;
        const isWorker = task.accepted_applicant_id && currentUser.id === task.accepted_applicant_id;

        if (!isClient && !isWorker) {
            setError(t('supervise.error.noPermissionDispute'));
            return;
        }

        //  MEJORA: Verificar si ya existe una disputa activa
        if (hasExistingDispute || task.status === 'disputed' || task.escrow_status === 'disputed') {
            setError(t('supervise.error.existingDispute'));
            return;
        }
        
        setCreatingDispute(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError(t('supervise.error.noToken'));
                setCreatingDispute(false);
                return;
            }
            
            // Paso 1: Iniciar disputa en Trustless Work
            // Iniciar disputa en Trustless Work
            const trustlessResult = await startDisputeTrustlessEscrow(
                task.escrow_id,
                address, // signer (cliente o trabajador)
                kit,
                startDispute,
                sendTransaction
            );

            if (!trustlessResult.success) {
                throw new Error(trustlessResult.error || 'Error al iniciar disputa en el escrow');
            }

            
            // Paso 2: Crear registro en la base de datos
            const response = await axios.post(
                `${arcusxApiUrl('create_dispute')}`,
                {
                    task_id: parseInt(taskId, 10),
                    reason: disputeReason.trim(),
                    tx_hash: trustlessResult.txHash // Enviar hash de transacción
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.data.success) {
                // Cerrar el modal y limpiar el formulario
                setShowDisputeModal(false);
                setDisputeReason('');
                setHasExistingDispute(true);
                
                // Guardar el hash de transacción para mostrarlo en el popup
                setDisputeTxHash(trustlessResult.txHash || null);
                
                // Actualizar el estado de la tarea localmente
                setTask(prevTask => {
                    if (!prevTask) return null;
                    return { 
                        ...prevTask, 
                        status: 'disputed',
                        escrow_status: 'disputed'
                    };
                });
              
                // Verificar estado del escrow desde Trustless Work para actualizar el estado real
                if (task.escrow_id) {
                    try {
                        // Esperar un poco para que la disputa se procese en la blockchain
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        const escrowResult = await getEscrowByContractIds({ 
                            contractIds: [task.escrow_id],
                            validateOnChain: true 
                        });
                        
                        const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
                        
                        if (escrows && escrows.length > 0) {
                            const escrow = escrows[0];
                            const isDisputed = escrowIndexerIsDisputed(
                              escrow as Record<string, unknown>,
                            );
                            
                            // Actualizar estado local con el estado real del escrow
                            if (isDisputed) {
                                setTask(prevTask => {
                                    if (!prevTask) return null;
                                    return { 
                                        ...prevTask, 
                                        status: 'disputed',
                                        escrow_status: 'disputed'
                                    };
                                });
                            }
                        }
                    } catch (escrowError: any) {
                        // Continuar de todas formas, el estado local ya está actualizado
                    }
                }
              
                // Mostrar popup de éxito
                setShowDisputeSuccessPopup(true);
                
                // Recargar datos del backend
                setTimeout(() => {
                    fetchData();
                }, 1000);
            } else {
                throw new Error(response.data.message || 'Error al crear la disputa en la base de datos');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            setError(t('supervise.error.createDispute') + ' ' + errorMessage);
            
            // Si el error indica que la tarea no existe, redirigir al dashboard
            if (errorMessage && (
                errorMessage.toLowerCase().includes('tarea no existe') ||
                errorMessage.toLowerCase().includes('tarea no encontrada') ||
                errorMessage.toLowerCase().includes('task not found') ||
                err.response?.status === 404
            )) {
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000); // Esperar 2 segundos para que el usuario vea el mensaje de error
            }
        } finally {
            setCreatingDispute(false);
        }
    };

    // Componentes de carga/error (restaurados a p tags)
    if (loading) return <div className="supervise-task-container"><p>{t('supervise.loading.details')}</p></div>;
    // No hacer return temprano si el error es de retiro de fondos - se mostrará en la sección de acciones
    if (error && !(error.includes('retirar') || error.includes('withdraw'))) {
        return <div className="supervise-task-container"><p className="error-message">{t('common.error')}: {error}</p></div>;
    }
    if (!task || !worker || !currentUser) return <div className="supervise-task-container"><p>{t('supervise.no.task.details')}</p></div>;

    // Roles mutuamente excluyentes: el creador nunca es el trabajador en la UI
    const isClient = String(currentUser?.id) === String(task?.user_id);
    const assignedWorkerId =
      task.accepted_applicant_id ??
      task.invited_user_id ??
      worker?.id ??
      null;
    const isWorker =
      !isClient &&
      assignedWorkerId != null &&
      String(currentUser?.id) === String(assignedWorkerId);

    // Lógica para mostrar los nombres según el rol. Ahora es seguro acceder a task y worker.
    const chatPartnerName = isClient ? worker.username : task.creator_username;
    
    // Calcular condiciones individuales para el botón de disputa
    const condition1 = (isClient || isWorker);
    const condition2 = !!task?.escrow_id;
    // Permitir disputa si el escrow está activo O si está completado (caso de error al retirar)
    const condition3 = isEscrowFunded(task?.escrow_status);
    // Permitir disputa en más estados: assigned, in_progress, y también si el escrow está completado
    const condition4 = (task?.status === 'assigned' || 
                        task?.status === 'in_progress' || 
                        (task?.escrow_status === 'completed' && task?.status === 'completed'));
    const condition5 = !hasExistingDispute;
    const condition6 = task?.status !== 'disputed';
    
    // Determinar si se puede mostrar el botón de disputa
    const canShowDisputeButton = condition1 && condition2 && condition3 && condition4 && condition5 && condition6;

    const supervisionActive = isTaskSupervisionActive(task.status);
    const showWorkActionsSection =
      supervisionActive ||
      (Number(task.client_accepted_completion) === 1 && Number(task.worker_accepted_completion) === 1);
    const clientCanAcceptReject = canClientAcceptOrRejectWork(task.escrow_status);
    const hasExchangeFile = taskHasExchangeFiles(task.files);
    const taskIsResolved =
      isResolved ||
      task.status === 'resolved' ||
      task.escrow_status === 'resolved';

    const taskInDispute =
      !taskIsResolved &&
      (hasExistingDispute ||
        task.status === 'disputed' ||
        task.escrow_status === 'disputed');
    const clientCanReleaseOrRefund =
      clientCanAcceptReject &&
      task.status !== 'resolved' &&
      task.status !== 'cancelled' &&
      !taskInDispute &&
      !isRefunded &&
      !isResolved;

    const taskFundsReleased =
      task.status === 'completed' ||
      task.escrow_status === 'completed' ||
      Boolean(task.escrow_release_tx_hash);

    const releaseTxHash = [task.escrow_release_tx_hash, paymentSuccessData?.txHash]
      .find((h) => isStellarTxHash(h)) ?? null;

    const workerCanNotifyDelivery =
      isWorker &&
      task.worker_accepted_completion === 0 &&
      Boolean(task.escrow_id) &&
      isEscrowFunded(task.escrow_status) &&
      clientCanAcceptReject &&
      task.status !== 'completed' &&
      task.status !== 'cancelled' &&
      task.status !== 'disputed' &&
      task.status !== 'resolved' &&
      !taskInDispute &&
      !isResolved &&
      !isRefunded;

    let buttonText = t('supervise.button.notifyDelivery');
    let isButtonDisabled = false;

    if (notifyingDelivery) {
        buttonText = t('supervise.button.notifyingDelivery');
        isButtonDisabled = true;
    } else if (isWorker && task.worker_accepted_completion === 1) {
        buttonText = t('supervise.button.deliveryNotified');
        isButtonDisabled = true;
    } else if (isWorker && !workerCanNotifyDelivery) {
        buttonText = task.status === 'completed'
            ? t('supervise.button.taskCompleted')
            : t('supervise.button.taskResolved');
        isButtonDisabled = true;
    } else if (!isWorker) {
        isButtonDisabled = loading;
    }

    return (
        <div className="supervise-task-container">
            {/* Encabezado restaurado a la estructura original */}
            <div className="supervise-task-header">
                <div className="supervise-task-header__back">
                    <Link to="/dashboard" className="supervise-back-dashboard-btn">
                      <FaArrowLeft aria-hidden />
                      <span>{t('supervise.back.dashboard')}</span>
                    </Link>
                </div>
                <div className="header-content">
                    <div className="header-text">
                <h1>{isClient ? t('supervise.task.title.client') : t('supervise.task.title.worker')}: {task.title}</h1>
                <p className="assigned-worker-info">
                  {isClient ? t('supervise.task.assigned') : t('supervise.task.creator')}:{' '}
                  <Link 
                    to={`/profile/${isClient ? worker.id : task.user_id}`}
                    style={{
                      color: 'var(--primary-blue)',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {worker.username}
                  </Link>
                </p>
                    </div>
                    <div className="header-actions">
                        <WalletButton />
                    </div>
                </div>
            </div>

            {/* Layout de dos columnas: Detalles a la izquierda, Blockchain a la derecha */}
            <div className="task-details-layout">
                {/* Columna izquierda: Detalles de la tarea */}
            <div className="task-details-section">
                <h2>{t('supervise.task.details')}</h2>
                <p><span className="detail-label">{t('supervise.label.description')}</span> {task.description}</p>
                <p><span className="detail-label">{t('supervise.label.reward')}</span>{' '}
                  {isClient
                    ? `${parseFloat(task.price).toFixed(2)} ${task.currency}`
                    : `${formatWorkerNetDisplay(task.price)} ${task.currency}`}
                </p>
                <p><span className="detail-label">{t('supervise.label.category')}</span> {task.category}</p>
                <p><span className="detail-label">{t('supervise.label.difficulty')}</span> {task.difficulty}</p>
                <div className="task-details-section__deletion">
                  <TaskDeletionNotice
                    scheduledDeletionAt={task.scheduled_deletion_at}
                    completedAt={task.completed_at || task.escrow_completed_at}
                    escrowStatus={task.escrow_status}
                    status={task.status}
                    escrowReleaseTxHash={task.escrow_release_tx_hash}
                    clientAcceptedCompletion={task.client_accepted_completion}
                    disputeResolvedAt={task.dispute_resolved_at}
                    closureHints={{
                      taskFundsReleased,
                      isResolved: taskIsResolved,
                      isRefunded,
                      taskInDispute,
                    }}
                    variant="compact"
                  />
                </div>
            </div>

                {/* Columna derecha: Estado de Blockchain */}
                    <div className="blockchain-status">
                        <h3>{t('supervise.blockchain.status')}</h3>

                        {!task.escrow_id && (
                          <div className="supervise-escrow-setup-banner">
                            <p>{t('supervise.escrow.missing')}</p>
                            {isClient && (
                              <Link to={`/proposals/${task.id}`} className="btn-primary supervise-escrow-cta">
                                {t('supervise.escrow.gotoProposals')}
                              </Link>
                            )}
                          </div>
                        )}

                        {task.escrow_id && isEscrowPending(task.escrow_status) && (
                          <div className="supervise-escrow-setup-banner supervise-escrow-setup-banner--pending">
                            <p>{t('supervise.escrow.pendingFunding')}</p>
                            {isClient && (
                              <Link to={`/proposals/${task.id}`} className="btn-primary supervise-escrow-cta">
                                {t('supervise.escrow.completeFunding')}
                              </Link>
                            )}
                          </div>
                        )}
                        
                        {/* Estado de Wallet */}
                        <div className="wallet-status">
                            <div className="wallet-status-item">
                                <div className="blockchain-info-label">
                                    {t('supervise.wallet.label')}
                                </div>
                                <div className="blockchain-info-value">
                                    {isConnected ? (
                                        <span className="status-badge active">
                                            {t('supervise.wallet.connected')} ({address?.slice(0, 6)}...{address?.slice(-4)})
                                        </span>
                                    ) : (
                                        <span className="status-badge pending">
                                            {t('supervise.wallet.disconnected')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="wallet-status-item">
                                <div className="blockchain-info-label">
                                    {t('supervise.wallet.network')}
                                </div>
                                <div className="blockchain-info-value">
                                        <span className="status-badge active">
                                        {t('supervise.wallet.stellarTestnet')}
                                        </span>
                                </div>
                            </div>
                        </div>
                        
                        {task.escrow_id && (
                        <div className="blockchain-info-grid">
                            <div className="blockchain-info-item">
                                <div className="blockchain-info-label">
                                    {t('supervise.wallet.escrowId')}
                                </div>
                                <div className="blockchain-info-value escrow-id">
                                    {task.escrow_id}
                                </div>
                            </div>
                            
                            <div className="blockchain-info-item">
                                <div className="blockchain-info-label">
                                    {t('supervise.wallet.status')}
                                </div>
                                <div className="blockchain-info-value">
                                    <span className={`status-badge ${(() => {
                                        // Si está resuelto, usar clase 'resolved'
                                        if (isResolved || task.escrow_status === 'resolved' || task.status === 'resolved') {
                                            return 'resolved';
                                        }
                                        // Si está en disputa, usar clase 'disputed'
                                        if (taskInDispute) {
                                            return 'disputed';
                                        }
                                        return task.escrow_status || 'active';
                                    })()}`}>
                                        {(() => {
                                            // Si está resuelto, mostrar "RESOLVED"
                                            if (isResolved || task.escrow_status === 'resolved' || task.status === 'resolved') {
                                                return 'RESOLVED';
                                            }
                                            // Si está en disputa, mostrar "DISPUTED"
                                            if (taskInDispute) {
                                                return 'DISPUTED';
                                            }
                                            return task.escrow_status?.toUpperCase() || 'ACTIVE';
                                        })()}
                                    </span>
                                </div>
                            </div>
                            
                            {task.escrow_created_at && (
                                <div className="blockchain-info-item">
                                    <div className="blockchain-info-label">
                                        {t('supervise.wallet.created')}
                                    </div>
                                    <div className="blockchain-info-value">
                                        {new Date(task.escrow_created_at).toLocaleString('es-ES', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {task.escrow_completed_at && (
                                <div className="blockchain-info-item">
                                    <div className="blockchain-info-label">
                                        {t('supervise.wallet.completed')}
                                    </div>
                                    <div className="blockchain-info-value">
                                        {new Date(task.escrow_completed_at).toLocaleString('es-ES', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        )}
                        
                    </div>
            </div>

            {/* Chat Section */}
            <div className="chat-section">
                <div className="chat-header">
                    <h2 className="chat-header-title">
                        <FaComments aria-hidden="true" />
                        {t('supervise.chat.with')} {chatPartnerName}
                    </h2>
                    {canShowDisputeButton && (
                        <button
                            className="dispute-btn"
                            onClick={() => setShowDisputeModal(true)}
                        >
                            <FaFlag />
                            {t('supervise.dispute.button')}
                        </button>
                    )}
                </div>
                <div className="messages-area" ref={messagesAreaRef}>
                    {loadingMessages ? (
                        <p className="loading-message">{t('supervise.loading.messages')}</p>
                    ) : messages.length === 0 ? (
                        <p className="loading-message">{t('supervise.no.messages')}</p>
                    ) : (
                        <>
                            {messages.map(msg => {
                                const isMyMessage = String(msg.sender_id) === String(currentUser.id);
                                const senderName = isMyMessage ? currentUser.username : (isClient ? worker.username : task.creator_username);
                                return (
                            <div 
                                key={msg.id} 
                                        className={`chat-message-row ${isMyMessage ? 'chat-message-row--mine' : 'chat-message-row--theirs'}`}
                                    >
                                        {!isMyMessage && (
                                            <div className="message-avatar" aria-hidden>
                                                {senderName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="message-stack">
                                            {!isMyMessage && (
                                                <div className="message-sender-name">{senderName}</div>
                                            )}
                                <div className="message-bubble">
                                    {msg.message}
                                </div>
                                            <span className="message-time">
                                                {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                            </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
                <div className="message-input-area">
                    {/* Restaurado a input type="text" para coincidir con el CSS */}
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('supervise.message.placeholder')}
                        disabled={sendingMessage}
                         onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                         }}
                    />
                    <button
                        type="button"
                        className="chat-send-btn"
                        onClick={sendMessage}
                         disabled={sendingMessage || !newMessage.trim()}
                        title={t('supervise.send')}
                        aria-label={t('supervise.send')}
                    >
                        <FaPaperPlane className="chat-send-btn__icon" size={18} aria-hidden />
                    </button>
                </div>
            </div>

            {/* Sección de Intercambio de Archivos */}
            <FileExchange
                taskId={taskId!}
                currentUserId={currentUser.id}
                isClient={isClient}
                files={task?.files || []}
                onFilesChange={(files) => setTask(prev => prev ? {...prev, files} : null)}
            />

            {/* Sección de Acciones de Trabajo */}
            {showWorkActionsSection && (
                <div className="work-actions-section">
                    <h3>{t('supervise.work.actions')}</h3>

                    {isClient && !task.escrow_id && (
                      <div className="supervise-escrow-setup-banner">
                        <p>{t('supervise.escrow.missingActions')}</p>
                        <Link to={`/proposals/${task.id}`} className="btn-primary supervise-escrow-cta">
                          {t('supervise.escrow.gotoProposals')}
                        </Link>
                      </div>
                    )}

                    {isClient && task.escrow_id && isEscrowPending(task.escrow_status) && (
                      <div className="supervise-escrow-setup-banner supervise-escrow-setup-banner--pending">
                        <p>{t('supervise.escrow.pendingFundingActions')}</p>
                        <Link to={`/proposals/${task.id}`} className="btn-primary supervise-escrow-cta">
                          {t('supervise.escrow.completeFunding')}
                        </Link>
                      </div>
                    )}
                    
                    {/* Mostrar error si existe (especialmente errores de retiro de fondos) */}
                    {error && (
                        <div className="error-message" style={{
                            padding: '15px',
                            marginBottom: '15px',
                            backgroundColor: '#f8d7da',
                            border: '2px solid #dc3545',
                            borderRadius: '8px',
                            color: '#721c24'
                        }}>
                            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>
                                 {error}
                            </p>
                        </div>
                    )}
                    
                    {/* Mostrar mensaje si hay transacción pendiente esperando firma - SOLO para cliente */}
                    {isClient && pendingTransaction?.hasPending && task?.client_accepted_completion === 1 && task?.worker_accepted_completion === 1 && (
                        <div className="pending-transaction-alert" style={{
                            padding: '15px',
                            marginBottom: '15px',
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '5px',
                            color: '#856404'
                        }}>
                            <strong> {t('supervise.tx.pending.sign')}</strong>
                            <p style={{ margin: '5px 0 0 0' }}>
                                {pendingTransaction.signedBy === 'client' 
                                    ? t('supervise.status.signedWaitingWorker')
                                    : t('supervise.status.workerSignedConnectWallet')
                                }
                            </p>
                        </div>
                    )}
                    
                    {isClient && (
                        <div className="client-actions">
                            {task.client_accepted_completion === 0 &&
                             clientCanReleaseOrRefund &&
                             Number(task.worker_accepted_completion) === 1 && (
                                <p className="info-message" style={{ marginBottom: '12px' }}>
                                    {t('supervise.status.workerDeliveryNotified')}
                                </p>
                            )}
                            {task.client_accepted_completion === 0 && (
                                <>
                                    {clientCanReleaseOrRefund ? (
                                        <>
                                            <button 
                                                className="btn-success"
                                                onClick={handleAcceptWork}
                                                disabled={acceptingWork || !isConnected}
                                            >
                                        {acceptingWork ? t('supervise.accept.work.processing') : t('supervise.accept.work.button')}
                                            </button>
                                            {!hasExchangeFile && (
                                            <button 
                                                className="btn-danger"
                                                onClick={handleCancelTask}
                                                disabled={cancellingTask || checkingCancellation || !isConnected}
                                            >
                                                    {checkingCancellation ? t('supervise.verifying') : cancellingTask ? t('supervise.processing') : ' ' + t('supervise.cancel.task.refund')}
                                            </button>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <DisputeStatusNotificationComponent 
                                                task={task}
                                                getEscrowByContractIds={getEscrowByContractIds}
                                            />
                                            {(isResolved || task.escrow_status === 'resolved' || task.status === 'resolved') && (
                                                <div style={{
                                                    padding: '20px',
                                                    marginTop: '15px',
                                                    backgroundColor: 'rgba(16, 221, 136, 0.12)',
                                                    border: '2px solid rgba(16, 221, 136, 0.5)',
                                                    borderRadius: '8px',
                                                    color: '#10dd88',
                                                    textAlign: 'center'
                                                }}>
                                                    <strong style={{ fontSize: '18px', display: 'block', marginBottom: '10px' }}>
                                                         {t('supervise.status.moneyTransferred')}
                                                    </strong>
                                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                                                        {t('supervise.status.contractResolvedRefund')}
                                                        <br />
                                                        <strong>{t('supervise.status.verifyFreighter')}</strong>
                                                    </p>
                                                </div>
                                            )}
                                            {isRefunded && !isResolved && task.escrow_status !== 'resolved' && task.status !== 'resolved' && (
                                        <div style={{
                                            padding: '15px',
                                                    marginTop: '15px',
                                                    backgroundColor: '#d4edda',
                                                    border: '2px solid #10dd88',
                                                    borderRadius: '8px',
                                                    color: '#155724',
                                                    textAlign: 'center'
                                                }}>
                                                    <strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <FaLock /> {t('supervise.status.taskLocked')}
                                                    </strong>
                                                    <p style={{ margin: 0, fontSize: '14px' }}>
                                                        {t('supervise.status.taskRefundedDisabled')}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                                </>
                            )}
                            {task.client_accepted_completion === 1 && (
                                <>
                                    {!(taskInDispute || isRefunded) ? (
                                <>
                                    {taskFundsReleased ? (
                                        <TaskReleaseSummary
                                            variant="client"
                                            txHash={releaseTxHash}
                                        />
                                    ) : (
                                        <p className="info-message" style={{ marginBottom: '10px' }}>
                                            {t('supervise.status.clientReleaseInProgress')}
                                        </p>
                                    )}
                                </>
                                    ) : (
                                        <>
                                            <DisputeStatusNotificationComponent 
                                                task={task}
                                                getEscrowByContractIds={getEscrowByContractIds}
                                            />
                                            {(isResolved || task.escrow_status === 'resolved' || task.status === 'resolved') && (
                                                <div style={{
                                                    padding: '20px',
                                                    marginTop: '15px',
                                                    backgroundColor: 'rgba(16, 221, 136, 0.12)',
                                                    border: '2px solid rgba(16, 221, 136, 0.5)',
                                                    borderRadius: '8px',
                                                    color: '#10dd88',
                                                    textAlign: 'center'
                                                }}>
                                                    <strong style={{ fontSize: '18px', display: 'block', marginBottom: '10px' }}>
                                                         {t('supervise.status.moneyTransferred')}
                                                    </strong>
                                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                                                        {t('supervise.status.contractResolvedRefund')}
                                                        <br />
                                                        <strong>{t('supervise.status.verifyFreighter')}</strong>
                                                    </p>
                        </div>
                    )}
                                            {isRefunded && !isResolved && task.escrow_status !== 'resolved' && task.status !== 'resolved' && (
                                                <div style={{
                                    padding: '15px',
                                                    marginTop: '15px',
                                                    backgroundColor: '#d4edda',
                                                    border: '2px solid #10dd88',
                                    borderRadius: '8px',
                                                    color: '#155724',
                                                    textAlign: 'center'
                                                }}>
<strong style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                        <FaLock /> {t('supervise.status.taskLocked')}
                                                    </strong>
                                                    <p style={{ margin: 0, fontSize: '14px' }}>
                                                        {t('supervise.status.taskRefundedDisabled')}
                                            </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                                    )}
                                </div>
                            )}
                            
                    {isWorker && !isClient && (
                        <div className="worker-actions">
                            {/* Notificación para trabajador cuando el escrow está resuelto */}
                            {isResolved && (
                                        <div style={{
                                    padding: '20px',
                                            marginBottom: '20px',
                                    backgroundColor: '#f8d7da',
                                    border: '2px solid #dc3545',
                                            borderRadius: '8px',
                                    color: '#721c24',
                                    textAlign: 'center'
                                }}>
                                    <strong style={{ fontSize: '18px', display: 'block', marginBottom: '10px' }}>
                                         {t('supervise.status.taskCancelled')}
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                                        {t('supervise.status.taskCancelledRefund')}
                                    </p>
                                        </div>
                                    )}
                            
                            {isWorker && !isClient && taskFundsReleased && (
                                <TaskReleaseSummary
                                    variant="worker"
                                    txHash={releaseTxHash}
                                />
                            )}

                            {/* Notificación para trabajador cuando el escrow está resuelto */}
                            {(isResolved || task.escrow_status === 'resolved' || task.status === 'resolved') && (
                                        <div style={{
                                    padding: '20px',
                                            marginBottom: '20px',
                                    backgroundColor: '#f8d7da',
                                    border: '2px solid #dc3545',
                                            borderRadius: '8px',
                                    color: '#721c24',
                                    textAlign: 'center'
                                }}>
                                    <strong style={{ fontSize: '18px', display: 'block', marginBottom: '10px' }}>
                                         {t('supervise.status.taskCancelled')}
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                                        {t('supervise.status.taskCancelledRefund')}
                                            </p>
                                        </div>
                            )}
                            
                            {workerCanNotifyDelivery && (
                                        <div style={{ textAlign: 'center' }}>
                                            <button 
                                        className="btn-success"
                                                onClick={handleCompleteTask}
                                                disabled={isButtonDisabled}
                                                style={{ display: 'inline-block' }}
                                            >
                                                {buttonText}
                                            </button>
                                    {error && <p className="error-message">{error}</p>}
                                        </div>
                            )}
                            {isWorker && task.worker_accepted_completion === 1 && task.status !== 'completed' && (
                                        <div style={{
                                            marginBottom: '20px',
                                            padding: '15px',
                                    backgroundColor: 'rgba(16, 221, 136, 0.12)',
                                            borderRadius: '8px',
                                    border: '2px solid rgba(16, 221, 136, 0.5)',
                                    textAlign: 'center'
                                }}>
                                    <p style={{ margin: 0, color: '#10dd88', fontSize: '14px', fontWeight: 'bold' }}>
                                        {t('supervise.button.deliveryNotified')}
                                            </p>
                                        </div>
                            )}
                            {/* Mostrar notificación de disputa para trabajador si está en disputa */}
                            {task.worker_accepted_completion === 0 && 
                             (task.escrow_status === 'disputed' || task.status === 'disputed' || hasExistingDispute) && (
                                <DisputeStatusNotificationComponent 
                                    task={task}
                                    getEscrowByContractIds={getEscrowByContractIds}
                                />
                            )}
                        </div>
                    )}
                    
                    {/* Mensaje si ya existe una disputa */}
                    {(hasExistingDispute || task.status === 'disputed') && (
                        <div className="dispute-info" style={{
                            marginTop: '20px',
                            padding: '15px',
                            backgroundColor: 'rgba(255, 152, 0, 0.15)',
                            borderRadius: '8px',
                            border: '2px solid rgba(255, 152, 0, 0.5)'
                        }}>
                            <p style={{ margin: 0, color: '#ff9800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaExclamationTriangle />
                                 Esta tarea tiene una disputa activa. Un administrador la revisará pronto.
                            </p>
                        </div>
                    )}
                </div>
            )}


            {/* Modal de Disputa */}
            {showDisputeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'var(--overlay)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(10px)'
                }} onClick={() => {
                    if (!creatingDispute) {
                        setShowDisputeModal(false);
                        setDisputeReason('');
                        setError(null);
                    }
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        padding: '32px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '2px solid var(--border-color-active)',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px'
                        }}>
                            <h2 style={{
                                margin: 0,
                                color: 'var(--text-primary)',
                                fontSize: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <FaExclamationTriangle style={{ color: '#dc2626' }} />
                                {t('supervise.dispute.button')}
                            </h2>
                            <button
                                onClick={() => {
                                    if (!creatingDispute) {
                                        setShowDisputeModal(false);
                                        setDisputeReason('');
                                        setError(null);
                                    }
                                }}
                                disabled={creatingDispute}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '28px',
                                    cursor: creatingDispute ? 'not-allowed' : 'pointer',
                                    opacity: creatingDispute ? 0.5 : 1,
                                    padding: '0',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        {/* Mensaje informativo */}
                        <div style={{
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '24px'
                        }}>
                            <h3 style={{
                                color: 'var(--text-primary)',
                                fontSize: '18px',
                                fontWeight: '600',
                                marginTop: 0,
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <FaExclamationTriangle style={{ color: '#dc2626' }} />
                                ¿Tienes un problema con esta tarea?
                            </h3>
                            <p style={{
                                color: 'var(--text-secondary)',
                                marginBottom: 0,
                                lineHeight: '1.7',
                                fontSize: '15px'
                            }}>
                                Si hay algún problema con el trabajo o el pago, puedes iniciar una disputa. Un administrador revisará tu caso y tomará una decisión justa.
                            </p>
                        </div>
                        
                        {error && (
                            <div style={{
                                padding: '12px',
                                marginBottom: '20px',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                borderRadius: '8px',
                                color: '#ff6b6b'
                            }}>
                                {error}
                            </div>
                        )}
                        
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                color: 'var(--text-primary)',
                                marginBottom: '8px',
                                fontWeight: '600',
                                fontSize: '14px'
                            }}>
                                Razón de la Disputa *
                            </label>
                            <textarea
                                value={disputeReason}
                                onChange={(e) => {
                                    setDisputeReason(e.target.value);
                                    setError(null);
                                }}
                                placeholder={t('supervise.dispute.reason.placeholder')}
                                disabled={creatingDispute}
                                style={{
                                    width: '100%',
                                    minHeight: '150px',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    border: '2px solid var(--border-color-active)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    outline: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = '#10dd88';
                                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(16, 221, 136, 0.3)';
                                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                }}
                            />
                            <p style={{
                                marginTop: '8px',
                                color: 'var(--text-muted)',
                                fontSize: '12px'
                            }}>
                                Mínimo 10 caracteres. {disputeReason.length}/10
                            </p>
                        </div>
                        
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => {
                                    if (!creatingDispute) {
                                        setShowDisputeModal(false);
                                        setDisputeReason('');
                                        setError(null);
                                    }
                                }}
                                disabled={creatingDispute}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: creatingDispute ? 'not-allowed' : 'pointer',
                                    opacity: creatingDispute ? 0.5 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (!creatingDispute) {
                                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                }}
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleCreateDispute}
                                disabled={creatingDispute || disputeReason.trim().length < 10}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: creatingDispute || disputeReason.trim().length < 10 ? 'rgba(255, 152, 0, 0.5)' : '#ff9800',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: creatingDispute || disputeReason.trim().length < 10 ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseOver={(e) => {
                                    if (!creatingDispute && disputeReason.trim().length >= 10) {
                                        e.currentTarget.style.backgroundColor = '#f57c00';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = creatingDispute || disputeReason.trim().length < 10 ? 'rgba(255, 152, 0, 0.5)' : '#ff9800';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {creatingDispute ? (
                                    <>
                                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <FaExclamationTriangle />
                                        {t('supervise.dispute.start')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup de Éxito - Pago Realizado (SOLO para cliente) */}
            {showClientPaymentPopup && paymentSuccessData && isClient && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(10, 184, 106, 0.3) 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.95) 0%, rgba(36, 59, 85, 0.95) 100%)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '550px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(16, 221, 136, 0.3), 0 0 0 1px rgba(16, 221, 136, 0.1)',
                        animation: 'scaleIn 0.5s ease-out',
                        border: '1px solid rgba(16, 221, 136, 0.2)'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px',
                            filter: 'drop-shadow(0 0 10px rgba(16, 221, 136, 0.5))'
                        }}>
                            
                        </div>
                        <h3 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginBottom: '20px',
                            marginTop: 0
                        }}>
                            ¡Pago Realizado Exitosamente!
                        </h3>
                        <div style={{
                            marginBottom: '30px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6'
                        }}>
                            <p style={{ 
                                fontSize: '18px', 
                                marginBottom: '15px', 
                                fontWeight: '500',
                                color: 'var(--text-secondary)'
                            }}>
                                {t('supervise.popup.paidWorkerAllGood')}
                            </p>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(16, 221, 136, 0.1) 0%, rgba(10, 184, 106, 0.1) 100%)',
                                padding: '20px',
                                borderRadius: '12px',
                                marginTop: '15px',
                                textAlign: 'left',
                                border: '1px solid rgba(16, 221, 136, 0.2)'
                            }}>
                                <p style={{ margin: '8px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                                    <strong style={{ color: '#10dd88' }}> {t('supervise.popup.totalPaid')}</strong> {paymentSuccessData.amount} USDC
                                </p>
                                <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                                    <strong style={{ color: '#10dd88', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaDollarSign /> {t('supervise.popup.workerReceives')}</strong> {paymentSuccessData.netAmount} USDC
                                </p>
                                <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                                    <strong style={{ color: '#10dd88' }}> {t('supervise.popup.platformCommission')}</strong> {(parseFloat(paymentSuccessData.amount) - parseFloat(paymentSuccessData.netAmount || '0')).toFixed(7)} USDC
                                </p>
                                <StellarTxHashLink
                                    txHash={paymentSuccessData.txHash}
                                    label={t('supervise.popup.txHash')}
                                />
                                <TaskDeletionNotice
                                    scheduledDeletionAt={task?.scheduled_deletion_at}
                                    completedAt={task?.completed_at || task?.escrow_completed_at}
                                    escrowStatus={task?.escrow_status}
                                    disputeResolvedAt={task?.dispute_resolved_at}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => {
                                    setShowClientPaymentPopup(false);
                                    fetchData(); // Recargar datos para actualizar la UI
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px',
                                    boxShadow: '0 4px 12px rgba(16, 221, 136, 0.3)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #0ab86a, #10dd88)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 221, 136, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #10dd88, #0ab86a)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 221, 136, 0.3)';
                                }}
                            >
                                {t('supervise.popup.backToTask')}
                            </button>
                            <button 
                                onClick={() => {
                                    setShowClientPaymentPopup(false);
                                    navigate('/dashboard');
                                }}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-hover)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                {t('supervise.popup.goToDashboard')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup de Éxito - Pago Recibido (SOLO para trabajador) */}
            {showPaymentSuccessPopup && paymentSuccessData && isWorker && !isClient && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(10, 184, 106, 0.3) 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.95) 0%, rgba(36, 59, 85, 0.95) 100%)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '550px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(16, 221, 136, 0.3), 0 0 0 1px rgba(16, 221, 136, 0.1)',
                        animation: 'scaleIn 0.5s ease-out',
                        border: '1px solid rgba(16, 221, 136, 0.2)'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px',
                            filter: 'drop-shadow(0 0 10px rgba(16, 221, 136, 0.5))'
                        }}>
                            
                        </div>
                        <h3 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginBottom: '20px',
                            marginTop: 0
                        }}>
                            {t('supervise.popup.paymentReceivedTitle')}
                        </h3>
                        <div style={{
                            marginBottom: '30px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6'
                        }}>
                            <p style={{ 
                                fontSize: '18px', 
                                marginBottom: '15px', 
                                fontWeight: '500',
                                color: 'var(--text-secondary)'
                            }}>
                                {t('supervise.popup.receivedCorrectly')}
                            </p>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(16, 221, 136, 0.1) 0%, rgba(10, 184, 106, 0.1) 100%)',
                                padding: '20px',
                                borderRadius: '12px',
                                marginTop: '15px',
                                textAlign: 'left',
                                border: '1px solid rgba(16, 221, 136, 0.2)'
                            }}>
                                <p style={{ margin: '8px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                                    <strong style={{ color: '#10dd88' }}> {t('supervise.popup.amountReceived')}</strong> {paymentSuccessData.netAmount || paymentSuccessData.amount} USDC
                                </p>
                                {paymentSuccessData.netAmount && (
                                    <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                                        <strong style={{ color: '#10dd88' }}> {t('supervise.popup.totalAmountAfterCommission')}</strong> {paymentSuccessData.amount} USDC ({t('supervise.afterCommission')})
                                    </p>
                                )}
                                <StellarTxHashLink
                                    txHash={paymentSuccessData.txHash}
                                    label={t('supervise.popup.txHash')}
                                />
                                <TaskDeletionNotice
                                    scheduledDeletionAt={task?.scheduled_deletion_at}
                                    completedAt={task?.completed_at || task?.escrow_completed_at}
                                    escrowStatus={task?.escrow_status}
                                    disputeResolvedAt={task?.dispute_resolved_at}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => {
                                    setShowPaymentSuccessPopup(false);
                                    fetchData(); // Recargar datos para actualizar la UI
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px',
                                    boxShadow: '0 4px 12px rgba(16, 221, 136, 0.3)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #0ab86a, #10dd88)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 221, 136, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #10dd88, #0ab86a)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 221, 136, 0.3)';
                                }}
                            >
                                Volver a Tarea
                            </button>
                            <button 
                                onClick={() => {
                                    setShowPaymentSuccessPopup(false);
                                    navigate('/dashboard');
                                }}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-hover)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <FaHome style={{ marginRight: '8px' }} /> Ir al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup de Firma de Reembolso - CRÍTICO: Cliente debe firmar para recibir reembolso */}
            {showRefundSignature && refundTransaction && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(10, 184, 106, 0.3) 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10001
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.95) 0%, rgba(36, 59, 85, 0.95) 100%)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '550px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(16, 221, 136, 0.3), 0 0 0 1px rgba(16, 221, 136, 0.1)',
                        animation: 'scaleIn 0.5s ease-out',
                        border: '1px solid rgba(16, 221, 136, 0.2)'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px',
                            filter: 'drop-shadow(0 0 10px rgba(16, 221, 136, 0.5))'
                        }}>
                            
                        </div>
                        <h3 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginBottom: '20px',
                            marginTop: 0
                        }}>
                            Firma para Recibir Reembolso
                        </h3>
                        <div style={{
                            marginBottom: '30px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6'
                        }}>
                            <p style={{ 
                                fontSize: '18px', 
                                marginBottom: '15px', 
                                fontWeight: '500',
                                color: 'var(--text-secondary)'
                            }}>
                                Para recibir tu reembolso, debes firmar la transacción con tu wallet Stellar
                            </p>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(16, 221, 136, 0.1) 0%, rgba(10, 184, 106, 0.1) 100%)',
                                padding: '20px',
                                borderRadius: '12px',
                                marginTop: '15px',
                                textAlign: 'left',
                                border: '1px solid rgba(16, 221, 136, 0.2)'
                            }}>
                                <p style={{ margin: '8px 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                                    <strong style={{ color: '#10dd88' }}> {t('supervise.popup.refundAmount')}</strong> {refundTransaction.refundAmount.toFixed(7)} USDC
                                </p>
                                <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                                    <strong style={{ color: '#10dd88', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><FaMapMarkerAlt aria-hidden="true" /> {t('supervise.popup.yourAddress')}</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
                                </p>
                                <p style={{ margin: '8px 0', fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                     {t('supervise.popup.signRefundNote')}
                                </p>
                            </div>
                        </div>
                        {error && (
                            <div style={{
                                padding: '12px',
                                marginBottom: '20px',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                borderRadius: '8px',
                                color: '#ff6b6b'
                            }}>
                                {error}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => {
                                    setShowRefundSignature(false);
                                    setRefundTransaction(null);
                                    setCancellingTask(false);
                                    setError(null);
                                }}
                                disabled={cancellingTask}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: cancellingTask ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px',
                                    opacity: cancellingTask ? 0.5 : 1
                                }}
                            >
                                {t('supervise.popup.cancel')}
                            </button>
                            <button 
                                onClick={handleSignRefundTransaction}
                                disabled={cancellingTask || !isConnected || !kit}
                                style={{
                                    background: cancellingTask || !isConnected || !kit ? 'rgba(16, 221, 136, 0.5)' : 'linear-gradient(90deg, #10dd88, #0ab86a)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: cancellingTask || !isConnected || !kit ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px',
                                    boxShadow: cancellingTask || !isConnected || !kit ? 'none' : '0 4px 12px rgba(16, 221, 136, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                                onMouseOver={(e) => {
                                    if (!cancellingTask && isConnected && kit) {
                                        e.currentTarget.style.background = 'linear-gradient(90deg, #0ab86a, #10dd88)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 221, 136, 0.4)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!cancellingTask && isConnected && kit) {
                                        e.currentTarget.style.background = 'linear-gradient(90deg, #10dd88, #0ab86a)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 221, 136, 0.3)';
                                    }
                                }}
                            >
                                {cancellingTask ? (
                                    <>
                                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                                        {t('supervise.popup.signingAndSending')}
                                    </>
                                ) : (
                                    <>
                                         {t('supervise.popup.signWithFreighter')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup de Notificación - Reembolso en Proceso */}
            {showRefundNotification && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(10, 184, 106, 0.3) 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10002
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.95) 0%, rgba(36, 59, 85, 0.95) 100%)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '550px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(16, 221, 136, 0.3), 0 0 0 1px rgba(16, 221, 136, 0.1)',
                        animation: 'scaleIn 0.5s ease-out',
                        border: '1px solid rgba(16, 221, 136, 0.2)'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px',
                            filter: 'drop-shadow(0 0 10px rgba(16, 221, 136, 0.5))'
                        }}>
                            
                        </div>
                        <h3 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginBottom: '20px',
                            marginTop: 0
                        }}>
                            {t('supervise.popup.cancellationProcessed')}
                        </h3>
                        <div style={{
                            marginBottom: '30px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6'
                        }}>
                            <p style={{ 
                                fontSize: '18px', 
                                marginBottom: '15px', 
                                fontWeight: '500',
                                color: 'var(--text-secondary)'
                            }}>
                                {refundNotificationMessage}
                            </p>
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(16, 221, 136, 0.1) 0%, rgba(10, 184, 106, 0.1) 100%)',
                                padding: '20px',
                                borderRadius: '12px',
                                marginTop: '15px',
                                textAlign: 'left',
                                border: '1px solid rgba(16, 221, 136, 0.2)'
                            }}>
                                <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    <strong style={{ color: '#10dd88' }}> {t('supervise.popup.nextSteps')}</strong>
                                </p>
                                <ul style={{ 
                                    margin: '10px 0', 
                                    paddingLeft: '20px', 
                                    fontSize: '14px', 
                                    color: 'var(--text-muted)',
                                    lineHeight: '1.8'
                                }}>
                                    <li>{t('supervise.refund.bullet1')}</li>
                                    <li>{t('supervise.refund.bullet2')}</li>
                                    <li>{t('supervise.refund.bullet3')}</li>
                                </ul>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => {
                                    setShowRefundNotification(false);
                                    setRefundNotificationMessage('');
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px',
                                    boxShadow: '0 4px 12px rgba(16, 221, 136, 0.3)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #0ab86a, #10dd88)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 221, 136, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #10dd88, #0ab86a)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 221, 136, 0.3)';
                                }}
                            >
                                {t('supervise.popup.understood')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup de Éxito - Disputa Iniciada */}
            {showDisputeSuccessPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(10, 184, 106, 0.3) 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.95) 0%, rgba(36, 59, 85, 0.95) 100%)',
                        borderRadius: '20px',
                        padding: '40px',
                        maxWidth: '550px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(16, 221, 136, 0.3), 0 0 0 1px rgba(16, 221, 136, 0.1)',
                        animation: 'scaleIn 0.5s ease-out',
                        border: '1px solid rgba(16, 221, 136, 0.2)'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px',
                            filter: 'drop-shadow(0 0 10px rgba(16, 221, 136, 0.5))'
                        }}>
                            
                        </div>
                        <h3 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            marginBottom: '20px',
                            marginTop: 0
                        }}>
                            {t('supervise.popup.disputeStartedTitle')}
                        </h3>
                        <div style={{
                            marginBottom: '30px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.6'
                        }}>
                            <p style={{ 
                                fontSize: '18px', 
                                marginBottom: '15px', 
                                fontWeight: '500',
                                color: 'var(--text-secondary)'
                            }}>
                                {t('supervise.popup.disputeRegistered')}
                            </p>
                            {disputeTxHash && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(16, 221, 136, 0.1) 0%, rgba(10, 184, 106, 0.1) 100%)',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    marginTop: '15px',
                                    textAlign: 'left',
                                    border: '1px solid rgba(16, 221, 136, 0.2)'
                                }}>
                                    <p style={{ margin: '8px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                                        <strong style={{ color: '#10dd88' }}> {t('supervise.popup.txHash')}</strong>
                                    </p>
                                    <code style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        color: '#10dd88',
                                        background: 'rgba(16, 221, 136, 0.1)',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        wordBreak: 'break-all',
                                        marginTop: '5px',
                                        border: '1px solid rgba(16, 221, 136, 0.2)'
                                    }}>
                                        {disputeTxHash}
                                    </code>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                                onClick={() => {
                                    setShowDisputeSuccessPopup(false);
                                    setDisputeTxHash(null);
                                }}
                                style={{
                                    background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                                    color: 'var(--text-primary)',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px',
                                    boxShadow: '0 4px 12px rgba(16, 221, 136, 0.3)'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #0ab86a, #10dd88)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 221, 136, 0.4)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, #10dd88, #0ab86a)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 221, 136, 0.3)';
                                }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Popup de Confirmación */}
            {confirmDialogConfig && (
                <ConfirmDialog
                    isOpen={showConfirmDialog}
                    title={confirmDialogConfig.title}
                    message={confirmDialogConfig.message}
                    type={confirmDialogConfig.type || 'warning'}
                    confirmText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                    onConfirm={confirmDialogConfig.onConfirm}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogConfig(null);
                    }}
                />
            )}

            {/* Popup de Completar Tarea */}
            {task && task.escrow_id && (
                <CompleteTaskPopup
                    isOpen={showCompleteTaskPopup}
                    onClose={() => setShowCompleteTaskPopup(false)}
                    onComplete={handleCompleteTaskPopupComplete}
                    onStayOnSupervision={() => {
                        setTimeout(() => fetchData(), 500);
                    }}
                    onGoToDashboard={() => navigate('/dashboard')}
                    taskPrice={task.price}
                    escrowId={task.escrow_id}
                    clientAddress={address || ''}
                    taskId={task.id != null ? Number(task.id) : undefined}
                    workerId={task.accepted_applicant_id != null ? Number(task.accepted_applicant_id) : undefined}
                    workerName={task.worker_username}
                    onApproveMilestone={handleApproveMilestone}
                    onReleaseFunds={handleReleaseFunds}
                    onPersistRelease={handlePersistTaskRelease}
                    onVerifyMilestone={handleVerifyMilestone}
                />
            )}

        </div>
    );
};

export default SuperviseTask;