import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Importar axios
import { API_URL } from '../config/database'; // Asegúrate de que la ruta a tu config.js es correcta
import '../css/SuperviseTask.css';
import { jwtDecode } from "jwt-decode"; // Importar jwtDecode
import { useWallet } from '../hooks/useWallet';
// ============================================
// SISTEMA TRUSTLESS WORK - ÚNICO SISTEMA
// ============================================
import { 
  useChangeMilestoneStatus,
  useApproveMilestone,
  useReleaseFunds,
  useSendTransaction,
  useGetEscrowFromIndexerByContractIds,
  useStartDispute
} from '@trustless-work/escrow/hooks';
import {
  changeMilestoneStatusTrustlessEscrow,
  approveMilestoneTrustlessEscrow,
  releaseFundsTrustlessEscrow,
  startDisputeTrustlessEscrow
} from '../services/trustlessWorkEscrowService';
// ============================================
import { calculateNetAmountSync } from '../config/commission';
import { usePlatformFee } from '../hooks/usePlatformFee';
import { useScheduledTaskDeletion } from '../hooks/useScheduledTaskDeletion';
import FileExchange from './FileExchange';
import WalletButton from './WalletButton';
import ConfirmDialog from './ConfirmDialog';
import RatingSystem from './RatingSystem';
import { FaExclamationTriangle, FaTimes, FaFlag } from 'react-icons/fa';
import '../css/ConfirmDialog.css';

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
    accepted_applicant_id?: string; // ID del trabajador asignado
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

const SuperviseTask = () => {
    const { taskId, acceptedApplicantId } = useParams<{ taskId: string, acceptedApplicantId: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<TaskDetails | null>(null);
    const [withdrawingFunds, setWithdrawingFunds] = useState(false);
    const [worker, setWorker] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados para popups de éxito
    const [showPaymentSuccessPopup, setShowPaymentSuccessPopup] = useState(false);
    const [showClientPaymentPopup, setShowClientPaymentPopup] = useState(false);
    
    // Estados para sistema de ratings
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [hasRated, setHasRated] = useState(false);
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
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Estado para el usuario actual logueado (usamos la nueva interfaz CurrentUser)
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    // Estados para wallet y blockchain (Stellar/Freighter)
    const { address, isConnected, kit } = useWallet();

    // Hooks de Trustless Work
    const { changeMilestoneStatus } = useChangeMilestoneStatus();
    const { approveMilestone } = useApproveMilestone();
    const { releaseFunds } = useReleaseFunds();
    const { sendTransaction } = useSendTransaction();
    const { getEscrowByContractIds } = useGetEscrowFromIndexerByContractIds();
    const { startDispute } = useStartDispute();
    
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
    const [acceptingWork, setAcceptingWork] = useState(false);
    const [rejectingWork, setRejectingWork] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState<{
        hasPending: boolean;
        signedBy?: string;
        waitingFor?: string;
    } | null>(null);
    
    // Estados para disputa
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    
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
                const taskResponse = await axios.get(`${API_URL}/auth/get_task_details.php?task_id=${taskId}`);
                
                if (taskResponse.data) {
                    if (taskResponse.data.user_id === undefined || taskResponse.data.user_id === null || typeof taskResponse.data.user_id !== 'string') {
                         setError('Error: Los detalles de la tarea no incluyen un ID de usuario creador válido.');
                         setLoading(false);
                         return;
                    }
                    if (taskResponse.data.client_accepted_completion === undefined || typeof taskResponse.data.client_accepted_completion !== 'number' ||
                        taskResponse.data.worker_accepted_completion === undefined || typeof taskResponse.data.worker_accepted_completion !== 'number') {
                        setError('Error: Los detalles de la tarea no incluyen los campos de aceptación de finalización.');
                        setLoading(false);
                        return;
                    }

                    setTask(taskResponse.data);
                } else {
                    setError('No se pudieron cargar los detalles de la tarea.');
                    setLoading(false);
                    return;
                }

                const workerIdToFetch = taskResponse.data.accepted_applicant_id || acceptedApplicantId;
                
                if (!workerIdToFetch) {
                    setLoading(false);
                    return;
                }
                
                const workerResponse = await axios.get(`${API_URL}/auth/get_user_details.php?user_id=${workerIdToFetch}`);
                
                if (workerResponse.data) {
                    if (workerResponse.data.id === undefined || workerResponse.data.id === null) {
                         setError('Error: Los detalles del trabajador no incluyen un ID válido.');
                         setLoading(false);
                         return;
                    }
                     const workerDetails: UserDetails = {
                         ...workerResponse.data,
                         id: String(workerResponse.data.id)
                     };
                    setWorker(workerDetails);
                } else {
                    setError('No se pudieron cargar los detalles del trabajador.');
                    setLoading(false);
                    return;
                }

            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message;
                setError('Error al cargar los detalles: ' + errorMessage);
                
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
            setError('IDs de tarea o trabajador faltantes en la URL.');
            setLoading(false);
        }
    }, [taskId, acceptedApplicantId]); // Dependencias del useEffect

    // Función para cargar mensajes
    const fetchMessages = async () => {
        if (!taskId) {
             return;
        }

        setLoadingMessages(true);
        try {
            const response = await axios.get(`${API_URL}/auth/get_messages.php?task_id=${taskId}`);
            
            if (response.data && Array.isArray(response.data)) {
                const formattedMessages: Message[] = response.data.map(msg => ({
                    ...msg,
                    id: String(msg.id),
                    task_id: String(msg.task_id),
                    sender_id: String(msg.sender_id),
                    receiver_id: String(msg.receiver_id)
                }));
                setMessages(formattedMessages);
            } else {
                 setMessages([]);
            }
        } catch (error) {
             setError('Error al cargar mensajes.');
        } finally {
            setLoadingMessages(false);
        }
    };

    // Cargar mensajes al obtener los detalles de la tarea, trabajador y usuario actual
    useEffect(() => {
        if (task && worker && currentUser) {
            fetchMessages();
            // Opcional: Implementar polling para nuevos mensajes
            const interval = setInterval(fetchMessages, 5000); // Cargar mensajes cada 5 segundos
            return () => clearInterval(interval); // Limpiar el intervalo al desmontar
        }
    }, [task, worker, currentUser, taskId]); // Depende de que task, worker y currentUser estén cargados, y taskId (aunque taskId no cambiará)

    // Scroll al último mensaje solo cuando hay mensajes nuevos
    useEffect(() => {
        if (messages.length > 0) {
            const timeoutId = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [messages.length]); // Solo cuando cambia la cantidad de mensajes

    // Verificar si el cliente ha firmado (para habilitar botón del trabajador)
    // Esto se verifica incluso antes de que ambos acepten
    useEffect(() => {
        const checkClientSignature = async () => {
            if (!task || !taskId || !task.escrow_id) return;
            // Verificar si el cliente ya aceptó (client_accepted_completion === 1)
            if (task.client_accepted_completion !== 1) return;

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await axios.get(`${API_URL}/auth/get_pending_transaction.php?task_id=${taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Si hay una transacción firmada por el cliente, actualizar estado
                if (response.data?.success && 
                    response.data.signed_tx_xdr && 
                    !response.data.complete_tx_xdr &&
                    response.data.signed_by === 'client') {
                    setPendingTransaction({
                        hasPending: true,
                        signedBy: 'client',
                        waitingFor: 'worker'
                    });
                } else if (response.data?.success && response.data.complete_tx_xdr) {
                    // Transacción completamente firmada
                    setPendingTransaction({
                        hasPending: true,
                        signedBy: 'both',
                        waitingFor: undefined
                    });
                } else {
                    setPendingTransaction({ hasPending: false });
                }
            } catch (error) {
                // Si no hay transacción pendiente, está bien
                setPendingTransaction({ hasPending: false });
            }
        };

        checkClientSignature();
        // Verificar cada 10 segundos si el cliente firmó
        const interval = setInterval(checkClientSignature, 10000);
        return () => clearInterval(interval);
    }, [task, taskId]);

    // Verificar si hay transacción pendiente cuando ambos aceptaron
    useEffect(() => {
        const checkPendingTransaction = async () => {
            if (!task || !taskId || !currentUser) return;
            // Cambiar condición: verificar si ambos aceptaron, no solo si status es 'completed'
            if (task.client_accepted_completion !== 1 || task.worker_accepted_completion !== 1) return;
            if (!task.escrow_id) return;

            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await axios.get(`${API_URL}/auth/get_pending_transaction.php?task_id=${taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                // Verificar si la transacción está completamente firmada (signer_role = 'both')
                if (response.data?.success && response.data.complete_tx_xdr) {
                    setPendingTransaction({
                        hasPending: true,
                        signedBy: 'both', // Indica que ambas firmas están completas
                        waitingFor: undefined
                    });
                } else if (response.data?.success && response.data.signed_tx_xdr && !response.data.complete_tx_xdr) {
                    // Transacción parcialmente firmada
                    const signedBy = response.data.signed_by;
                    const needsSignatureFrom = response.data.needs_signature_from;
                    
                    setPendingTransaction({
                        hasPending: true,
                        signedBy: signedBy,
                        waitingFor: needsSignatureFrom
                    });
                } else if (response.data?.has_pending === false) {
                    setPendingTransaction({ hasPending: false });
                } else {
                    setPendingTransaction({ hasPending: false });
                }
            } catch (error) {
                // Si no hay transacción pendiente, está bien
                setPendingTransaction({ hasPending: false });
            }
        };

        checkPendingTransaction();
        // Verificar cada 10 segundos si hay transacción pendiente
        const interval = setInterval(checkPendingTransaction, 10000);
        return () => clearInterval(interval);
    }, [task, taskId, currentUser, isConnected]);



    // Función para enviar mensaje
    const sendMessage = async () => {
        // Asegurarse de que newMessage no está vacío
        if (!newMessage.trim()) {
             return;
        }

        // Validar que tenemos toda la información necesaria
        if (!currentUser || !task || !worker || !taskId || !acceptedApplicantId) {
            setError('Error: Faltan datos necesarios para enviar el mensaje.');
            return;
        }

        setSendingMessage(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró el token de autenticación.');
                setSendingMessage(false);
                return;
            }

            // Asegurarse de que los IDs son números para el backend
            const senderIdNum = parseInt(currentUser.id, 10);
            const taskIdNum = parseInt(taskId, 10); // Asegurarse de que el taskId es un número

            // Determinar el receiver_id dinámicamente
            // Si el current user es el creador de la tarea, el receptor es el trabajador
            // Si el current user es el trabajador, el receptor es el creador
            let actualReceiverId = 0;
            if (currentUser.id === task.user_id) { // Si el usuario actual es el creador de la tarea
                actualReceiverId = parseInt(acceptedApplicantId, 10); // El receptor es el trabajador aceptado
            } else if (currentUser.id === worker.id) { // Si el usuario actual es el trabajador
                actualReceiverId = parseInt(task.user_id, 10); // El receptor es el creador de la tarea
            } else {
                setError('No autorizado para enviar mensajes en esta tarea.');
                setSendingMessage(false);
                return;
            }
            
            const response = await axios.post(`${API_URL}/auth/send_message.php`, 
                {
                    task_id: taskIdNum,
                    sender_id: senderIdNum,
                    receiver_id: actualReceiverId,
                message: newMessage.trim()
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (response.data.success) {
                setNewMessage('');
                fetchMessages();
            } else {
                setError('Error: ' + (response.data.message || 'Mensaje no enviado.'));
            }
        } catch (err: any) {
            setError('Error al enviar mensaje: ' + (err.response?.data?.message || err.message));
        } finally {
            setSendingMessage(false);
        }
    };


    // Función para aceptar trabajo (cliente) - Actualiza BD y firma transacción
    /* ============================================
     * SISTEMA ANTIGUO: MULTISIG 2-DE-2 (RESTAURADO)
     * ============================================
     * Función para aceptar trabajo (cliente) - actualiza BD y firma transacción
     * Sistema restaurado: 2025-11-22
     * ============================================ */
    const handleAcceptWork = async () => {
        if (!task || !isConnected || !address) {
            setError('Debes conectar tu wallet Freighter para aceptar el trabajo');
            return;
        }

        if (!task.escrow_id) {
            setError('Error: No hay escrow configurado para esta tarea.');
            return;
        }

        // Mostrar popup de confirmación en lugar de confirm()
        setConfirmDialogConfig({
            title: 'Confirmar Aceptación',
            message: '¿Estás seguro de que quieres aceptar este trabajo? Deberás firmar la transacción para liberar los fondos.',
            type: 'warning',
            onConfirm: () => {
                setShowConfirmDialog(false);
                executeAcceptWork();
            }
        });
        setShowConfirmDialog(true);
    };

    const executeAcceptWork = async () => {
        if (!task || !isConnected || !address) {
            setError('Debes conectar tu wallet Freighter para aceptar el trabajo');
            return;
        }

        if (!task.escrow_id) {
            setError('Error: No hay escrow configurado para esta tarea.');
            return;
        }

        setAcceptingWork(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            
            // FLUJO TRUSTLESS WORK: Aprobar milestone y liberar fondos
                if (!kit) {
                    throw new Error('Kit de wallets no inicializado');
                }
                
            if (!task.escrow_id) {
                throw new Error('No hay escrow configurado para esta tarea');
            }

            // Paso 1: Aprobar milestone
            const approveResult = await approveMilestoneTrustlessEscrow(
                task.escrow_id,
                '0', // Solo un milestone
                address, // approver (cliente)
                kit,
                approveMilestone,
                sendTransaction
            );

            if (!approveResult.success) {
                throw new Error(approveResult.error || 'Error al aprobar milestone');
            }

            // Paso 2: Liberar fondos automáticamente después de aprobar
            const releaseResult = await releaseFundsTrustlessEscrow(
                task.escrow_id,
                address, // releaseSigner (cliente)
                kit,
                releaseFunds,
                sendTransaction
            );

            if (!releaseResult.success) {
                throw new Error(releaseResult.error || 'Error al liberar fondos');
            }

            // Paso 2.5: Verificar que el escrow esté completado (balance = 0)
            // Verificar que el escrow esté completado
            let escrowCompleted = false;
            let attempts = 0;
            const maxAttempts = 12; // 12 intentos = 1 minuto (5 segundos cada uno)
            
            while (!escrowCompleted && attempts < maxAttempts) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
                    const escrowResult = await getEscrowByContractIds({ 
                        contractIds: [task.escrow_id],
                        validateOnChain: true 
                    });
                    const escrows = Array.isArray(escrowResult) ? escrowResult : (escrowResult as any)?.escrows || [];
                    
                    if (escrows && escrows.length > 0) {
                        const escrow = escrows[0];
                        const balance = parseFloat(escrow.balance || '0');
                        
                        if (balance === 0 || escrow.status === 'released' || escrow.status === 'completed') {
                            escrowCompleted = true;
                        }
                    }
                } catch (err) {
                    // Error al verificar escrow, continuar
                }
                attempts++;
            }

            // Calcular monto neto para el trabajador
            const netAmount = calculateNetAmountSync(parseFloat(task.price), platformFee);

            // Paso 3: Actualizar BD y programar eliminación después de 24 horas
            const response = await axios.post(`${API_URL}/auth/complete_task.php`, {
                    task_id: parseInt(taskId!, 10),
                action: 'accept',
                escrow_completed: escrowCompleted,
                tx_hash: releaseResult.txHash
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Error al actualizar estado en BD');
            }

            // Mostrar popup para CLIENTE (quien paga)
            setPaymentSuccessData({
                amount: task.price,
                txHash: releaseResult.txHash || 'N/A',
                netAmount: netAmount.toFixed(7)
            });
            setShowClientPaymentPopup(true);

            // Si el trabajador está viendo la página, mostrar popup para él también después de un delay
            if (isWorker) {
                setTimeout(() => {
                    setShowPaymentSuccessPopup(true);
                }, 2000); // Mostrar después de 2 segundos
            }
            
            // Verificar si se debe mostrar el modal de rating después de 3 segundos
            setTimeout(() => {
                checkAndShowRatingModal();
            }, 3000);

            // Actualizar estado local
            setTask(prev => prev ? {
                ...prev,
                client_accepted_completion: 1,
                status: response.data.status || prev.status
            } : null);

            // Recargar datos para actualizar la UI
            setTimeout(() => {
                fetchData();
            }, 500);
        } catch (err: any) {
            setError('Error al aceptar trabajo: ' + (err.response?.data?.message || err.message));
        } finally {
            setAcceptingWork(false);
        }
    };

    // Función para rechazar trabajo - En Trustless Work se usa startDispute
    // Por ahora, solo actualizamos el estado en el backend
    const handleRejectWork = async () => {
        if (!task || !task.escrow_id || !isConnected || !address || !kit) {
            setError('Debes conectar tu wallet Freighter para rechazar el trabajo');
            return;
        }

        // Mostrar popup de confirmación
        setConfirmDialogConfig({
            title: 'Confirmar Rechazo',
            message: '¿Estás seguro de que quieres rechazar este trabajo? Esto iniciará una disputa.',
            type: 'danger',
            onConfirm: () => {
                setShowConfirmDialog(false);
                executeRejectWork();
            }
        });
        setShowConfirmDialog(true);
    };

    const executeRejectWork = async () => {
        if (!task || !isConnected || !address) {
            setError('Debes conectar tu wallet Freighter para rechazar el trabajo');
            return;
        }

        setRejectingWork(true);
        setError(null);

        try {
            // En Trustless Work, el rechazo se maneja mediante disputas
            // Por ahora, solo actualizamos el estado en el backend
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/auth/complete_task.php`, {
                task_id: parseInt(taskId!, 10),
                action: 'reject'
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setTask(prev => prev ? {
                    ...prev,
                    status: 'rejected'
                } : null);
            } else {
                throw new Error(response.data.message || 'Error al rechazar trabajo');
            }

        } catch (err: any) {
            setError('Error al rechazar trabajo: ' + (err.response?.data?.message || err.message));
        } finally {
            setRejectingWork(false);
        }
    };

    // En Trustless Work, el trabajador NO retira fondos directamente
    // El cliente debe aprobar y liberar los fondos
    const handleWithdrawFunds = async () => {
        if (!task || !task.escrow_id) {
            setError('Error: No hay escrow configurado para esta tarea.');
            return;
        }

        // Verificar que es el trabajador
    const isWorker = currentUser?.id === worker?.id;
        if (!isWorker) {
            setError('Error: Solo el trabajador puede retirar los fondos.');
            return;
        }

        if (!isConnected || !address || !kit) {
            setError('Error: Debes conectar tu wallet Freighter para retirar fondos.');
            return;
        }

        const bothAccepted = task.client_accepted_completion === 1 && 
                            task.worker_accepted_completion === 1;
        
        if (!bothAccepted) {
            setError('Error: Ambos participantes deben aceptar antes de retirar fondos.');
            return;
        }

        setWithdrawingFunds(true);
        setError(null);

        try {
            // En Trustless Work, el trabajador NO libera fondos directamente
            // El cliente debe aprobar el milestone primero y luego liberar los fondos
            throw new Error('En Trustless Work, el cliente debe aprobar y liberar los fondos. El trabajador no puede retirar fondos directamente.');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
            
            setError('Error al retirar fondos: ' + errorMessage);
        } finally {
            setWithdrawingFunds(false);
        }
    };

    // submitCompleteTransaction eliminada - No se usa en Trustless Work
    // getWorkerWalletAddress eliminada - No se usa en Trustless Work

    // Trabajador marca tarea como completada usando Trustless Work
    const handleCompleteTask = async () => {
        if (!taskId) {
            setError('Error: ID de tarea no disponible.');
            return;
        }

        // Mostrar popup de confirmación en lugar de confirm()
        setConfirmDialogConfig({
            title: 'Confirmar Completado',
            message: '¿Estás seguro de que quieres marcar este trabajo como completado?',
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
            setError('Error: ID de tarea no disponible.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró el token de autenticación.');
                setLoading(false);
                return;
            }

            // FLUJO TRUSTLESS WORK: Cambiar estado del milestone a "completed"
            if (!task || !task.escrow_id || !address || !kit) {
                throw new Error('Faltan datos necesarios para completar la tarea');
            }

            const result = await changeMilestoneStatusTrustlessEscrow(
                task.escrow_id,
                '0', // Solo un milestone
                address, // serviceProvider (trabajador)
                'completed',
                'Tarea completada', // newEvidence
                kit,
                changeMilestoneStatus,
                sendTransaction
            );

            if (!result.success) {
                throw new Error(result.error || 'Error al cambiar estado del milestone');
            }

            // Actualizar BD
            const response = await axios.post(`${API_URL}/auth/complete_task.php`, 
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

            // Actualizar estado local
            setTask(prevTask => {
                if (!prevTask) return null;
                return { 
                    ...prevTask, 
                    status: response.data.status || prevTask.status,
                    worker_accepted_completion: 1
                };
            });
              
            // Recargar datos para actualizar la UI
            setTimeout(() => {
                fetchData();
            }, 500);

            setError(null);
        } catch (err: any) {
            setError('Error al aceptar trabajo: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // SISTEMA TRUSTLESS WORK - ELIMINADO
    // ============================================
    // Todo el código de Trustless Work ha sido eliminado
    // Sistema restaurado: Multisig 2-de-2 (sistema antiguo)
    // ============================================
    
    // ============================================
    // SISTEMA TRUSTLESS WORK - ELIMINADO
    // ============================================
    // Las funciones de Trustless Work han sido eliminadas
    // Sistema restaurado: Multisig 2-de-2 (sistema antiguo)
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
                console.error('Error al verificar disputa existente:', error);
            }
        };
        
        checkExistingDispute();
    }, [taskId, task?.status]);
    
    // Función para verificar si se debe mostrar el modal de rating
    const checkAndShowRatingModal = async () => {
        if (!task || !currentUser || !worker) return;
        
        // Solo mostrar si la tarea está completada y pagada
        if (task.status !== 'completed' || task.escrow_status !== 'completed') {
            return;
        }
        
        // Verificar si ya se calificó
        try {
            const { getRatings } = await import('../services/ratingService');
            const data = await getRatings(undefined, parseInt(taskId!, 10));
            const existingRating = data.ratings.find(
                (r) => r.rater_id === parseInt(currentUser.id, 10)
            );
            
            if (!existingRating) {
                setShowRatingModal(true);
            } else {
                setHasRated(true);
            }
        } catch (error) {
            console.error('Error al verificar rating existente:', error);
        }
    };
    
    // Verificar rating cuando la tarea se completa
    useEffect(() => {
        if (task?.status === 'completed' && task?.escrow_status === 'completed') {
            checkAndShowRatingModal();
        }
    }, [task?.status, task?.escrow_status]);
    
    // Función para crear una disputa
    const handleCreateDispute = async () => {
        if (!taskId || !disputeReason.trim()) {
            setError('Por favor, ingresa una razón para la disputa (mínimo 10 caracteres).');
            return;
        }
        
        if (disputeReason.trim().length < 10) {
            setError('La razón de la disputa debe tener al menos 10 caracteres.');
            return;
        }
        
        if (!task || !task.escrow_id) {
            setError('Error: No hay escrow configurado para esta tarea.');
            return;
        }

        if (!isConnected || !address || !kit) {
            setError('Debes conectar tu wallet Freighter para iniciar una disputa.');
            return;
        }
        
        setCreatingDispute(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró el token de autenticación.');
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
                throw new Error(trustlessResult.error || 'Error al iniciar disputa en Trustless Work');
            }

            
            // Paso 2: Crear registro en la base de datos
            const response = await axios.post(
                `${API_URL}/auth/create_dispute.php`,
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
                
                // Actualizar el estado de la tarea
                setTask(prevTask => {
                    if (!prevTask) return null;
                    return { 
                        ...prevTask, 
                        status: 'disputed'
                    };
                });
              
                // Mostrar mensaje de éxito
                alert('✅ Disputa iniciada exitosamente en Trustless Work. Un administrador revisará tu caso.');
                
                // Recargar datos
                setTimeout(() => {
                    fetchData();
                }, 500);
            } else {
                throw new Error(response.data.message || 'Error al crear la disputa en la base de datos');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            setError('Error al crear la disputa: ' + errorMessage);
            console.error('Error al crear disputa:', err);
            
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
    if (loading) return <div className="supervise-task-container"><p>Cargando detalles de la tarea...</p></div>;
    // No hacer return temprano si el error es de retiro de fondos - se mostrará en la sección de acciones
    if (error && !error.includes('retirar fondos')) {
        return <div className="supervise-task-container"><p className="error-message">Error: {error}</p></div>;
    }
    if (!task || !worker || !currentUser) return <div className="supervise-task-container"><p>No se encontraron los detalles de la tarea o del trabajador.</p></div>;

    // Determinar si el usuario actual es el cliente o el trabajador
    const isClient = String(currentUser?.id) === String(task?.user_id);
    const isWorker = String(currentUser?.id) === String(worker?.id);

    // Lógica para mostrar los nombres según el rol. Ahora es seguro acceder a task y worker.
    const chatPartnerName = isClient ? worker.username : task.creator_username;
    
    // Calcular condiciones individuales para el botón de disputa
    const condition1 = (isClient || isWorker);
    const condition2 = !!task?.escrow_id;
    // Permitir disputa si el escrow está activo O si está completado (caso de error al retirar)
    const condition3 = task?.escrow_status === 'active' || task?.escrow_status === 'completed';
    // Permitir disputa en más estados: assigned, in_progress, y también si el escrow está completado
    const condition4 = (task?.status === 'assigned' || 
                        task?.status === 'in_progress' || 
                        (task?.escrow_status === 'completed' && task?.status === 'completed'));
    const condition5 = !hasExistingDispute;
    const condition6 = task?.status !== 'disputed';
    
    // Determinar si se puede mostrar el botón de disputa
    const canShowDisputeButton = condition1 && condition2 && condition3 && condition4 && condition5 && condition6;

    // Determinar el mensaje del botón y si está deshabilitado
    let buttonText = 'Marcar como Completada';
    let isButtonDisabled: boolean = loading;

    if (task.status === 'completed') {
        buttonText = 'Tarea Completada';
        isButtonDisabled = true;
    } else if (isClient && task.client_accepted_completion === 1) {
        buttonText = 'Esperando confirmación del trabajador';
        isButtonDisabled = true;
    } else if (isWorker && task.worker_accepted_completion === 1) {
        buttonText = 'Esperando confirmación del cliente';
        isButtonDisabled = true;
    } else if (isWorker && task.client_accepted_completion === 0) {
        // Trabajador no puede marcar completado hasta que el cliente lo haga primero
        buttonText = 'Esperando que el cliente marque completado';
        isButtonDisabled = true;
    }

    return (
        <div className="supervise-task-container">
            {/* Encabezado restaurado a la estructura original */}
            <div className="supervise-task-header">
                <div className="header-content">
                    <div className="header-text">
                <h1>{isClient ? 'Supervisar Tarea' : 'Progresando Tarea'}: {task.title}</h1>
                <p className="assigned-worker-info">{isClient ? 'Trabajador Asignado' : 'Creador de Tarea'}: {worker.username}</p>
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
                <h2>Detalles de la Tarea</h2>
                <p><span className="detail-label">Descripción:</span> {task.description}</p>
                <p><span className="detail-label">Recompensa:</span> {calculateNetAmountSync(parseFloat(task.price), platformFee).toFixed(7)} {task.currency}</p>
                <p><span className="detail-label">Categoría:</span> {task.category}</p>
                <p><span className="detail-label">Dificultad:</span> {task.difficulty}</p>
            </div>

                {/* Columna derecha: Estado de Blockchain */}
                {task.escrow_id && (
                    <div className="blockchain-status">
                        <h3>Estado de Blockchain</h3>
                        
                        {/* Estado de Wallet */}
                        <div className="wallet-status">
                            <div className="wallet-status-item">
                                <div className="blockchain-info-label">
                                    Wallet
                                </div>
                                <div className="blockchain-info-value">
                                    {isConnected ? (
                                        <span className="status-badge active">
                                            Conectada ({address?.slice(0, 6)}...{address?.slice(-4)})
                                        </span>
                                    ) : (
                                        <span className="status-badge pending">
                                            Desconectada
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="wallet-status-item">
                                <div className="blockchain-info-label">
                                    Red
                                </div>
                                <div className="blockchain-info-value">
                                        <span className="status-badge active">
                                        Stellar Testnet
                                        </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="blockchain-info-grid">
                            <div className="blockchain-info-item">
                                <div className="blockchain-info-label">
                                    Escrow ID
                                </div>
                                <div className="blockchain-info-value escrow-id">
                                    {task.escrow_id}
                                </div>
                            </div>
                            
                            <div className="blockchain-info-item">
                                <div className="blockchain-info-label">
                                    Estado
                                </div>
                                <div className="blockchain-info-value">
                                    <span className={`status-badge ${task.escrow_status}`}>
                                        {task.escrow_status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            
                            {task.escrow_created_at && (
                                <div className="blockchain-info-item">
                                    <div className="blockchain-info-label">
                                        Creado
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
                                        Completado
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
                        
                    </div>
                )}
            </div>

            {/* Sección de Chat - Restaurado a las clases definidas en CSS */}
            <div className="chat-section">
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{ margin: 0 }}>Chat con {chatPartnerName}</h2>
                    {/* Botón Denuncia - Solo visible si se puede disputar */}
                    {canShowDisputeButton && (
                        <button
                            onClick={() => setShowDisputeModal(true)}
                            style={{
                                backgroundColor: '#dc2626',
                                color: '#fff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#b91c1c';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc2626';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.3)';
                            }}
                        >
                            <FaFlag />
                            Denuncia
                        </button>
                    )}
                </div>
                <div className="messages-area">
                    {loadingMessages ? (
                        <p className="loading-message">Cargando mensajes...</p>
                    ) : messages.length === 0 ? (
                        <p className="loading-message">Aún no hay mensajes. ¡Sé el primero en escribir!</p>
                    ) : (
                        <>
                            {messages.map(msg => {
                                const isMyMessage = msg.sender_id === currentUser.id;
                                const senderName = isMyMessage ? currentUser.username : (isClient ? worker.username : task.creator_username);
                                return (
                            <div 
                                key={msg.id} 
                                        className={`message-container ${isMyMessage ? 'my-message' : 'other-message'}`}
                                    >
                                        {!isMyMessage && (
                                            <div className="message-avatar">
                                                {senderName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="message-content">
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
                                        {isMyMessage && (
                                            <div className="message-avatar my-avatar">
                                                {currentUser.username.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {isTyping && !isClient && (
                                <div className="message-container other-message typing-indicator">
                                    <div className="message-avatar">
                                        {worker?.username.charAt(0).toUpperCase() || 'W'}
                                    </div>
                                    <div className="message-content">
                                        <div className="message-bubble typing-bubble">
                                            <span className="typing-dots">
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="message-input-area">
                    {/* Restaurado a input type="text" para coincidir con el CSS */}
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            // Indicador de escribiendo
                            setIsTyping(true);
                            if (typingTimeoutRef.current) {
                                clearTimeout(typingTimeoutRef.current);
                            }
                            typingTimeoutRef.current = setTimeout(() => {
                                setIsTyping(false);
                            }, 2000);
                        }}
                        placeholder="Escribe un mensaje..."
                        disabled={sendingMessage}
                         onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                setIsTyping(false);
                                if (typingTimeoutRef.current) {
                                    clearTimeout(typingTimeoutRef.current);
                                }
                                sendMessage();
                            }
                         }}
                    />
                    <button
                        onClick={sendMessage}
                         disabled={sendingMessage || !newMessage.trim()}
                    >
                        {sendingMessage ? 'Enviando...' : 'Enviar'}
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
            {/* Mostrar sección si hay escrow y la tarea está asignada O si ambos han aceptado (para permitir retiro de fondos) */}
            {task.escrow_id && (task.status === 'assigned' || (Number(task.client_accepted_completion) === 1 && Number(task.worker_accepted_completion) === 1)) && (
                <div className="work-actions-section">
                    <h3>Acciones de Trabajo</h3>
                    
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
                                ❌ {error}
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
                            <strong>⏳ Transacción pendiente de firma</strong>
                            <p style={{ margin: '5px 0 0 0' }}>
                                {pendingTransaction.signedBy === 'client' 
                                    ? `Has firmado la transacción. Esperando que el trabajador complete la firma para liberar los fondos.`
                                    : `El trabajador ya firmó. Debes conectar tu wallet y firmar la transacción para completar y liberar los fondos.`
                                }
                            </p>
                        </div>
                    )}
                    
                    {isClient && (
                        <div className="client-actions">
                            {task.client_accepted_completion === 0 && (
                                <>
                                    <button 
                                        className="btn-success"
                                        onClick={handleAcceptWork}
                                        disabled={acceptingWork || !isConnected}
                                    >
                                        {acceptingWork ? 'Procesando...' : '✅ Aceptar Trabajo (Liberar Fondos)'}
                                    </button>
                                    <button 
                                        className="btn-danger"
                                        onClick={handleRejectWork}
                                        disabled={rejectingWork || !isConnected}
                                    >
                                        {rejectingWork ? 'Procesando...' : '❌ Rechazar Trabajo (Reembolsar)'}
                                    </button>
                                </>
                            )}
                            {task.client_accepted_completion === 1 && task.worker_accepted_completion === 1 && (
                                <>
                                    <p className="info-message" style={{ marginBottom: '10px' }}>✅ Ambos han aceptado la finalización.</p>
                                    {/* Si hay transacción pendiente firmada por el trabajador, el cliente puede completarla */}
                                    {pendingTransaction?.hasPending && pendingTransaction.signedBy === 'worker' && (
                                        <>
                                            <p className="info-message" style={{ marginBottom: '10px', color: '#856404' }}>
                                                El trabajador ya firmó la transacción. Conecta tu wallet y completa la firma para liberar los fondos.
                                            </p>
                                            <button 
                                                className="btn-success"
                                                onClick={handleWithdrawFunds}
                                                disabled={withdrawingFunds || !isConnected || !address}
                                                style={{
                                                    fontSize: '16px',
                                                    padding: '12px 24px',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {withdrawingFunds ? '⏳ Procesando...' : '✅ Completar Firma y Liberar Fondos'}
                                            </button>
                                        </>
                                    )}
                                    {pendingTransaction?.hasPending && pendingTransaction.signedBy === 'client' && (
                                        <p className="info-message">Ya firmaste la transacción. Esperando que el trabajador complete la firma para liberar los fondos.</p>
                                    )}
                                    {(!pendingTransaction?.hasPending) && (
                                        <p className="info-message">Esperando que el trabajador inicie el retiro de fondos.</p>
                                    )}
                                </>
                            )}
                            {task.client_accepted_completion === 1 && task.worker_accepted_completion === 0 && (
                                <p className="info-message">✅ Has aceptado este trabajo. Esperando confirmación del trabajador.</p>
                            )}
                        </div>
                    )}

                    {isWorker && (
                        <div className="worker-actions">
                            {/* Botón "Retirar Dinero" - SOLO para trabajador cuando ambas partes aceptaron */}
                            {isWorker &&
                             Number(task.client_accepted_completion) === 1 && 
                             Number(task.worker_accepted_completion) === 1 && 
                             task.escrow_id && task.escrow_id.trim() !== '' && (
                                <div className="withdraw-funds-section" style={{
                                    marginBottom: '20px',
                                    padding: '15px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px',
                                    border: '2px solid #28a745'
                                }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#28a745', fontSize: '18px' }}>💰 Retirar Fondos</h3>
                                    <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                                        Ambos participantes han aceptado y firmado. Haz clic para retirar los fondos.
                                    </p>
                                    <button 
                                        className="btn-success"
                                        onClick={handleWithdrawFunds}
                                        disabled={withdrawingFunds || !isConnected || !address}
                                        style={{
                                            fontSize: '16px',
                                            padding: '12px 24px',
                                            fontWeight: 'bold',
                                            width: '100%',
                                            maxWidth: '400px'
                                        }}
                                    >
                                        {withdrawingFunds ? '⏳ Procesando...' : '💰 Retirar Dinero'}
                                    </button>
                                    {!isConnected && (
                                        <p style={{ marginTop: '10px', color: '#dc3545', fontSize: '14px' }}>
                                            ⚠️ Debes conectar tu wallet Freighter para retirar fondos.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {/* Mensajes de estado para mostrar el progreso - SOLO para trabajador */}
                            {isWorker && Number(task.client_accepted_completion) === 1 && 
                             Number(task.worker_accepted_completion) === 1 && 
                             task.escrow_id && task.escrow_id.trim() !== '' && (
                                <>
                                    {pendingTransaction?.hasPending && pendingTransaction.signedBy !== 'both' && (
                                        <div style={{
                                            marginBottom: '20px',
                                            padding: '15px',
                                            backgroundColor: '#fff3cd',
                                            borderRadius: '8px',
                                            border: '2px solid #ffc107'
                                        }}>
                                            {pendingTransaction.signedBy === 'client' && (
                                                <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                                                    ✅ El cliente ya firmó la transacción. Haz clic en "Retirar Dinero" para completar tu firma y liberar los fondos.
                                                </p>
                                            )}
                                            {pendingTransaction.signedBy === 'worker' && (
                                                <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                                                    ⏳ Ya firmaste. Esperando que el cliente complete la firma para liberar los fondos.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {!pendingTransaction?.hasPending && (
                                        <div style={{
                                            marginBottom: '20px',
                                            padding: '15px',
                                            backgroundColor: '#d1ecf1',
                                            borderRadius: '8px',
                                            border: '2px solid #0c5460'
                                        }}>
                                            <p style={{ margin: 0, color: '#0c5460', fontSize: '14px' }}>
                                                ✅ Ambos han aceptado. Haz clic en "Retirar Dinero" para iniciar el proceso de firmas.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {/* Botón de completado - SOLO visible si el cliente ya marcó completado Y firmó */}
                            {task.worker_accepted_completion === 0 && (
                                <>
                                    {task.client_accepted_completion === 0 ? (
                                        <p className="info-message" style={{ color: '#856404' }}>
                                            ⏳ Esperando que el cliente marque el trabajo como completado primero.
                                        </p>
                                    ) : !pendingTransaction?.hasPending || pendingTransaction.signedBy !== 'client' ? (
                                        <p className="info-message" style={{ color: '#856404' }}>
                                            ⏳ Esperando que el cliente firme la transacción primero.
                                        </p>
                                    ) : (
                                        <button 
                                            className="btn-primary"
                                            onClick={handleCompleteTask}
                                            disabled={isButtonDisabled || task.client_accepted_completion === 0 || !pendingTransaction?.hasPending || pendingTransaction.signedBy !== 'client'}
                                        >
                                            {buttonText}
                                        </button>
                                    )}
                                </>
                            )}
                            {task.worker_accepted_completion === 1 && task.client_accepted_completion === 0 && (
                                <p className="info-message">✅ Has marcado el trabajo como completado. Esperando confirmación del cliente.</p>
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
                                ⚠️ Esta tarea tiene una disputa activa. Un administrador la revisará pronto.
                            </p>
                        </div>
                    )}
                </div>
            )}


            {/* Botón para marcar tarea como completada (visible para AMBOS roles si no está completada) */}
            {(!task.escrow_id || task.status !== 'assigned') && (isWorker || isClient) && (
                <div className="completion-buttons">
                    <button 
                        className="btn-success"
                        onClick={handleCompleteTask}
                        disabled={isButtonDisabled} 
                    >
                        {buttonText}
                    </button>
                    {error && <p className="error-message">{error}</p>}
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
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
                        backgroundColor: 'rgba(7, 35, 60, 0.98)',
                        borderRadius: '20px',
                        padding: '32px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        border: '2px solid rgba(40, 192, 240, 0.3)',
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
                                color: '#fff',
                                fontSize: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <FaExclamationTriangle style={{ color: '#dc2626' }} />
                                Denuncia
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
                                    color: '#fff',
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
                                color: '#fff',
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
                                color: 'rgba(255, 255, 255, 0.9)',
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
                                color: '#fff',
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
                                placeholder="Ej: El trabajador no cumplió con los requisitos acordados..."
                                disabled={creatingDispute}
                                style={{
                                    width: '100%',
                                    minHeight: '150px',
                                    padding: '12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    border: '2px solid rgba(40, 192, 240, 0.3)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    outline: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = '#28c0f0';
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(40, 192, 240, 0.3)';
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                }}
                            />
                            <p style={{
                                marginTop: '8px',
                                color: 'rgba(255, 255, 255, 0.6)',
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
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: creatingDispute ? 'not-allowed' : 'pointer',
                                    opacity: creatingDispute ? 0.5 : 1,
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (!creatingDispute) {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                    }
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateDispute}
                                disabled={creatingDispute || disputeReason.trim().length < 10}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: creatingDispute || disputeReason.trim().length < 10 ? 'rgba(255, 152, 0, 0.5)' : '#ff9800',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
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
                                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <FaExclamationTriangle />
                                        Iniciar Disputa
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
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        padding: '40px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        animation: 'scaleIn 0.5s ease-out'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px'
                        }}>
                            ✅
                        </div>
                        <h3 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#28a745',
                            marginBottom: '20px',
                            marginTop: 0
                        }}>
                            ¡Pago Realizado Exitosamente!
                        </h3>
                        <div style={{
                            marginBottom: '30px',
                            color: '#333',
                            lineHeight: '1.6'
                        }}>
                            <p style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '600' }}>
                                Has pagado al trabajador y todo está bien
                            </p>
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '20px',
                                borderRadius: '8px',
                                marginTop: '15px',
                                textAlign: 'left'
                            }}>
                                <p style={{ margin: '8px 0', fontSize: '16px' }}>
                                    <strong>💰 Monto pagado:</strong> {paymentSuccessData.amount} USDC
                                </p>
                                <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                                    <strong>💵 Trabajador recibirá:</strong> {paymentSuccessData.netAmount} USDC (neto)
                                </p>
                                <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                                    <strong>🔗 Hash de transacción:</strong>
                                </p>
                                <code style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    color: '#28a745',
                                    backgroundColor: '#e8f5e9',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    wordBreak: 'break-all',
                                    marginTop: '5px'
                                }}>
                                    {paymentSuccessData.txHash}
                                </code>
                                <p style={{ margin: '15px 0 0 0', fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                                    ⏰ Esta tarea será eliminada automáticamente en 24 horas
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button 
                                onClick={() => {
                                    setShowClientPaymentPopup(false);
                                    navigate('/dashboard');
                                }}
                                style={{
                                    backgroundColor: '#28a745',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#218838';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#28a745';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup de Éxito - Pago Recibido (SOLO para trabajador) */}
            {showPaymentSuccessPopup && paymentSuccessData && isWorker && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        borderRadius: '16px',
                        padding: '40px',
                        maxWidth: '500px',
                        width: '90%',
                        textAlign: 'center',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        animation: 'scaleIn 0.5s ease-out'
                    }}>
                        <div style={{
                            fontSize: '80px',
                            marginBottom: '20px'
                        }}>
                            💰
                        </div>
                        <h3 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#28a745',
                            marginBottom: '20px',
                            marginTop: 0
                        }}>
                            ¡Pago Recibido Exitosamente!
                        </h3>
                        <div style={{
                            marginBottom: '30px',
                            color: '#333',
                            lineHeight: '1.6'
                        }}>
                            <p style={{ fontSize: '18px', marginBottom: '15px', fontWeight: '600' }}>
                                ¡Has recibido tu pago correctamente!
                            </p>
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '20px',
                                borderRadius: '8px',
                                marginTop: '15px',
                                textAlign: 'left'
                            }}>
                                <p style={{ margin: '8px 0', fontSize: '16px' }}>
                                    <strong>💰 Monto recibido:</strong> {paymentSuccessData.netAmount || paymentSuccessData.amount} USDC
                                </p>
                                {paymentSuccessData.netAmount && (
                                    <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                                        <strong>📊 Monto total:</strong> {paymentSuccessData.amount} USDC (después de comisión)
                                    </p>
                                )}
                                <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                                    <strong>🔗 Hash de transacción:</strong>
                                </p>
                                <code style={{
                                    display: 'block',
                                    fontSize: '12px',
                                    color: '#28a745',
                                    backgroundColor: '#e8f5e9',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    wordBreak: 'break-all',
                                    marginTop: '5px'
                                }}>
                                    {paymentSuccessData.txHash}
                                </code>
                                <p style={{ margin: '15px 0 0 0', fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                                    ⏰ Esta tarea será eliminada automáticamente en 24 horas
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button 
                                onClick={() => {
                                    setShowPaymentSuccessPopup(false);
                                    navigate('/dashboard');
                                }}
                                style={{
                                    backgroundColor: '#28a745',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '14px 32px',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minWidth: '200px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#218838';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#28a745';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                🏠 Ir al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de Rating */}
            {showRatingModal && task && worker && currentUser && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(10px)'
                }} onClick={() => {
                    // No cerrar al hacer clic fuera si no se ha calificado
                    if (hasRated) {
                        setShowRatingModal(false);
                    }
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '20px',
                        padding: '32px',
                        maxWidth: '700px',
                        width: '90%',
                        maxHeight: '90vh',
                        overflowY: 'auto',
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
                                color: '#333',
                                fontSize: '24px'
                            }}>
                                Calificar Experiencia
                            </h2>
                            {hasRated && (
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#666',
                                        fontSize: '28px',
                                        cursor: 'pointer',
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
                            )}
                        </div>
                        
                        <RatingSystem
                            userId={parseInt(currentUser.id, 10)}
                            taskId={parseInt(taskId!, 10)}
                            showForm={!hasRated}
                            ratedUserId={isClient ? parseInt(worker.id, 10) : parseInt(task.user_id, 10)}
                            ratedUserName={isClient ? worker.username : task.creator_username}
                            onRatingSubmitted={() => {
                                setHasRated(true);
                                setShowRatingModal(false);
                            }}
                            compact={false}
                        />
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
                    confirmText="Confirmar"
                    cancelText="Cancelar"
                    onConfirm={confirmDialogConfig.onConfirm}
                    onCancel={() => {
                        setShowConfirmDialog(false);
                        setConfirmDialogConfig(null);
                    }}
                />
            )}
        </div>
    );
};

export default SuperviseTask;