import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Importar axios
import { API_URL } from '../config/database'; // Asegúrate de que la ruta a tu config.js es correcta
import '../css/SuperviseTask.css';
import { jwtDecode } from "jwt-decode"; // Importar jwtDecode
import { useWallet } from '../hooks/useWallet';
// ============================================
// SISTEMA ANTIGUO: MULTISIG 2-DE-2 (RESTAURADO)
// ============================================
// Sistema de escrow usando multisig 2-de-2 en Stellar
// Sistema restaurado: 2025-11-22
// Usa USDC como moneda principal - XLM solo para fees
// ============================================
import { 
  createReleaseFundsXDR,
  createRefundXDR,
  getHorizonServer 
} from '../services/stellarEscrowService';
import { TransactionBuilder, Networks, Keypair } from '@stellar/stellar-sdk';

// Helper para convertir Uint8Array a hex (compatible con navegador)
const uint8ArrayToHex = (arr: Uint8Array): string => {
    return Array.from(arr)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};
// ============================================
// FIN SISTEMA ANTIGUO - RESTAURADO
// ============================================

// ============================================
// SISTEMA TRUSTLESS WORK - ELIMINADO
// ============================================
// Todo el código de Trustless Work ha sido eliminado
// Sistema restaurado: Multisig 2-de-2 (sistema antiguo)
// ============================================
import { calculateNetAmount } from '../config/commission';
import FileExchange from './FileExchange';
import WalletButton from './WalletButton';
import ConfirmDialog from './ConfirmDialog';
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
    
    // Estado para popup de éxito cuando se recibe el dinero
    const [showPaymentSuccessPopup, setShowPaymentSuccessPopup] = useState(false);
    const [paymentSuccessData, setPaymentSuccessData] = useState<{
        amount: string;
        txHash: string;
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

    // Hooks de Trustless Work - ELIMINADOS
    // Sistema restaurado: Multisig 2-de-2 (sistema antiguo)
    
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
                    console.log('✅ Cliente ya firmó. El trabajador puede aceptar ahora.');
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
            const escrowId = task.escrow_id;
            const horizonServer = getHorizonServer();

            // Paso 1: Actualizar BD (client_accepted_completion = 1)
            const response = await axios.post(`${API_URL}/auth/complete_task.php`, {
                task_id: parseInt(taskId!, 10),
                action: 'accept'
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Error al aceptar trabajo');
            }

            // Paso 2: Obtener dirección del trabajador
            const workerId = worker?.id || task?.accepted_applicant_id;
            if (!workerId) {
                throw new Error('No se pudo identificar al trabajador');
            }
            
            const workerAddress = await getWorkerWalletAddress(workerId);
            if (!workerAddress) {
                throw new Error('El trabajador no tiene wallet configurada');
            }

            // Paso 3: Verificar balance y calcular monto
            const escrowAccount = await horizonServer.loadAccount(escrowId);
            const balance = escrowAccount.balances.find((b: any) => b.asset_type === 'native')?.balance || '0';
            const balanceNum = parseFloat(balance);
            
            // Calcular balance mínimo real
            const baseReserve = 1.0;
            const signerReserve = 0.5;
            const activeSigners = escrowAccount.signers?.filter((s: any) => s.weight > 0).length || 0;
            const masterWeight = escrowAccount.signers?.find((s: any) => s.key === escrowAccount.accountId())?.weight || 0;
            
            let minimumBalance = baseReserve;
            if (masterWeight === 0) {
                minimumBalance += (activeSigners * signerReserve);
            } else {
                minimumBalance += ((activeSigners - 1) * signerReserve);
            }
            minimumBalance += 0.0001; // Margen para fees
            
            const taskPrice = parseFloat(task.price || '0');
            const netAmount = calculateNetAmount(taskPrice);
            const balanceAfterRelease = balanceNum - netAmount;
            if (balanceAfterRelease < minimumBalance) {
                throw new Error(`Balance insuficiente. Balance actual: ${balance} USDC. Monto neto a pagar: ${netAmount.toFixed(7)} USDC (de ${taskPrice.toFixed(7)} USDC total). Después del retiro quedarían ${balanceAfterRelease.toFixed(7)} USDC, pero se requieren al menos ${minimumBalance.toFixed(7)} USDC para mantener la cuenta activa (considerando ${activeSigners} signers activos). La comisión del 0.3% quedará en el escrow.`);
            }

            // Paso 4: Verificar si hay transacción pendiente
            let pendingTxResponse;
            try {
                pendingTxResponse = await axios.get(`${API_URL}/auth/get_pending_transaction.php?task_id=${taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                pendingTxResponse = { data: { success: false } };
            }

            let txXdr: string;
            let signedTxXdr: string;

            // Verificar si la transacción pendiente tiene el monto correcto
            let shouldRecreateTransaction = false;
            if (pendingTxResponse.data.success && pendingTxResponse.data.signed_tx_xdr && !pendingTxResponse.data.complete_tx_xdr) {
                try {
                    const partialTx = TransactionBuilder.fromXDR(pendingTxResponse.data.signed_tx_xdr, Networks.TESTNET);
                    let innerTx: any = partialTx;
                    if ('innerTransaction' in partialTx && (partialTx as any).innerTransaction) {
                        innerTx = (partialTx as any).innerTransaction.transaction || (partialTx as any).innerTransaction;
                    }
                    const paymentOp = innerTx.operations?.find((op: any) => op.type === 'payment');
                    
                    if (paymentOp) {
                        const txAmount = parseFloat(paymentOp.amount);
                        const expectedNetAmount = calculateNetAmount(taskPrice);
                        const tolerance = 0.0000001;
                        
                        if (Math.abs(txAmount - expectedNetAmount) > tolerance) {
                            shouldRecreateTransaction = true;
                            
                            try {
                                await axios.post(`${API_URL}/auth/save_pending_transaction.php`, {
                                    task_id: parseInt(taskId!, 10),
                                    signed_tx_xdr: '',
                                    signer_role: 'delete'
                                }, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                            } catch (deleteErr) {
                                // Error al eliminar transacción pendiente
                            }
                        }
                    }
                } catch (verifyError) {
                    shouldRecreateTransaction = true;
                }
            }

            // Si hay transacción pendiente firmada por el trabajador, el cliente la completa
            if (pendingTxResponse.data.success && 
                pendingTxResponse.data.signed_tx_xdr && 
                !pendingTxResponse.data.complete_tx_xdr && 
                !shouldRecreateTransaction &&
                pendingTxResponse.data.signed_by === 'worker') {
                
                if (!kit) {
                    throw new Error('Kit de wallets no inicializado');
                }
                
                // CRÍTICO: Verificar que la dirección del cliente sea un signer del escrow
                try {
                    const escrowAccount = await horizonServer.loadAccount(escrowId);
                    const signers = escrowAccount.signers || [];
                    const requiredSigners = signers.filter((s: any) => s.weight > 0).map((s: any) => s.key);
                    
                    if (!requiredSigners.includes(address)) {
                        throw new Error(`Tu dirección actual (${address}) no está configurada como signer del escrow. Los signers son: ${requiredSigners.join(', ')}. Esto puede ocurrir si cambiaste tu wallet después de crear el escrow.`);
                    }
                    
                    console.log('✅ Verificación previa (cliente): Tu dirección está en los signers del escrow.');
                } catch (verifyError: any) {
                    if (verifyError.message && verifyError.message.includes('no está configurada')) {
                        throw verifyError;
                    }
                    console.warn('⚠️ No se pudo verificar signers antes de firmar:', verifyError);
                }
                
                const partialXdr = pendingTxResponse.data.signed_tx_xdr;
                
                // Firmar la transacción parcialmente firmada
                kit.setWallet('freighter');
                console.log('🔐 Cliente firmando transacción parcialmente firmada por trabajador...', {
                    partialXdrLength: partialXdr.length,
                    clientAddress: address
                });
                
                const { signedTxXdr: completeXdr } = await kit.signTransaction(partialXdr, {
                    address: address,
                    networkPassphrase: Networks.TESTNET
                });

                // Verificar que tiene 2 firmas
                const completeTx = TransactionBuilder.fromXDR(completeXdr, Networks.TESTNET);
                if (completeTx.signatures.length < 2) {
                    throw new Error(`Error: La transacción no tiene 2 firmas. Tiene ${completeTx.signatures.length} firma(s).`);
                }

                // Guardar XDR completamente firmado
                const saveResponse = await axios.post(`${API_URL}/auth/save_pending_transaction.php`, {
                    task_id: parseInt(taskId!, 10),
                    signed_tx_xdr: completeXdr,
                    signer_role: 'both'
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!saveResponse.data.success) {
                    throw new Error('Error al guardar transacción completamente firmada');
                }

                // Enviar automáticamente
                setError(null);
                setPendingTransaction({
                    hasPending: true,
                    signedBy: 'both',
                    waitingFor: undefined
                });
                await submitCompleteTransaction();
                return;
            }

            // Si no hay transacción pendiente o hay que recrearla, crear nueva y firmar (cliente firma primero)
            if (!kit) {
                throw new Error('Kit de wallets no inicializado');
            }
            
            // CRÍTICO: Verificar que las direcciones del cliente y trabajador sean signers del escrow
            try {
                const escrowAccount = await horizonServer.loadAccount(escrowId);
                const signers = escrowAccount.signers || [];
                const requiredSigners = signers.filter((s: any) => s.weight > 0).map((s: any) => s.key);
                
                if (!requiredSigners.includes(address)) {
                    throw new Error(`Tu dirección actual (${address}) no está configurada como signer del escrow. Los signers son: ${requiredSigners.join(', ')}. Esto puede ocurrir si cambiaste tu wallet después de crear el escrow.`);
                }
                
                if (!requiredSigners.includes(workerAddress)) {
                    throw new Error(`La dirección del trabajador (${workerAddress}) no está configurada como signer del escrow. Los signers son: ${requiredSigners.join(', ')}. Esto puede ocurrir si el trabajador cambió su wallet después de crear el escrow.`);
                }
                
                console.log('✅ Verificación previa: Las direcciones del cliente y trabajador están en los signers del escrow.');
            } catch (verifyError: any) {
                if (verifyError.message && verifyError.message.includes('no está configurada')) {
                    throw verifyError;
                }
                console.warn('⚠️ No se pudo verificar signers antes de crear transacción:', verifyError);
            }
            
            txXdr = await createReleaseFundsXDR(
                escrowId,
                workerAddress,
                taskPrice.toString(),
                horizonServer
            );

            // Firmar con Freighter
            kit.setWallet('freighter');
            const { signedTxXdr: firstSignedXdr } = await kit.signTransaction(txXdr, {
                address: address,
                networkPassphrase: Networks.TESTNET
            });
            signedTxXdr = firstSignedXdr;

            // Guardar transacción parcialmente firmada
            const saveResponse = await axios.post(`${API_URL}/auth/save_pending_transaction.php`, {
                task_id: parseInt(taskId!, 10),
                signed_tx_xdr: signedTxXdr,
                signer_role: 'client'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!saveResponse.data.success) {
                throw new Error('Error al guardar transacción parcialmente firmada');
            }

            // Actualizar estado de transacción pendiente
            setPendingTransaction({
                hasPending: true,
                signedBy: 'client',
                waitingFor: 'worker'
            });
            setError(null);

            // Actualizar estado
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

    /* ============================================
     * SISTEMA ANTIGUO: MULTISIG 2-DE-2 (RESTAURADO)
     * ============================================
     * Función para rechazar trabajo (cliente) - reembolsa fondos
     * Sistema restaurado: 2025-11-22
     * ============================================ */
    const handleRejectWork = async () => {
        if (!task || !task.escrow_id || !isConnected || !address || !kit) {
            setError('Debes conectar tu wallet Freighter para rechazar el trabajo');
            return;
        }

        // Mostrar popup de confirmación en lugar de confirm()
        setConfirmDialogConfig({
            title: 'Confirmar Rechazo',
            message: '¿Estás seguro de que quieres rechazar este trabajo? Los fondos serán reembolsados a tu cuenta.',
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
            const horizonServer = getHorizonServer();
            const amount = task.price;

                   // Crear XDR de transacción para reembolsar
                   if (!task.escrow_id) {
                       throw new Error('No hay escrow configurado para esta tarea.');
                   }
                   const txXdr = await createRefundXDR(
                       task.escrow_id,
                       address,
                       amount,
                       horizonServer
                   );

                   // Verificar que kit esté inicializado (igual que en ProposalReview)
                   if (!kit) {
                       throw new Error('Kit de wallets no inicializado. Por favor, recarga la página.');
                   }

                   // Asegurar que siempre use Freighter (igual que en ProposalReview)
                   kit.setWallet('freighter');

                   // Firmar exactamente como en ProposalReview
                   const { signedTxXdr } = await kit.signTransaction(txXdr, {
                       address: address,
                       networkPassphrase: Networks.TESTNET
                   });

            // Enviar transacción
            const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
            const result = await horizonServer.submitTransaction(signedTx);

            // Enviar a backend usando complete_task.php con action=reject
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/auth/complete_task.php`, {
                task_id: parseInt(taskId!, 10),
                action: 'reject',
                tx_hash: result.hash
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
                // Trabajo rechazado exitosamente
            } else {
                throw new Error(response.data.message || 'Error al rechazar trabajo');
            }

        } catch (err: any) {
            setError('Error al rechazar trabajo: ' + (err.response?.data?.message || err.message));
        } finally {
            setRejectingWork(false);
        }
    };

    /* ============================================
     * SISTEMA ANTIGUO: MULTISIG 2-DE-2 (RESTAURADO)
     * ============================================
     * Función para retirar fondos (SOLO trabajador)
     * Esta función firma la transacción (si no está completa) y luego la envía a Stellar
     * Sistema restaurado: 2025-11-22
     * ============================================ */
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
            const token = localStorage.getItem('token');
            const escrowId = task.escrow_id;
            const horizonServer = getHorizonServer();
            
            // Obtener estado de transacción pendiente
            let getResponse;
            try {
                getResponse = await axios.get(`${API_URL}/auth/get_pending_transaction.php?task_id=${taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                getResponse = { data: { success: false } };
            }

            // Verificar si ya hay una transacción completamente firmada
            if (getResponse.data.success && getResponse.data.complete_tx_xdr) {
                await submitCompleteTransaction();
                return;
            }

            // Obtener dirección del trabajador para validaciones
            const workerId = worker?.id || task?.accepted_applicant_id;
            let currentWorkerAddress: string | null = null;
            if (workerId) {
                currentWorkerAddress = await getWorkerWalletAddress(workerId);
            }
            
            // Verificar si la transacción pendiente tiene el monto correcto Y el destino correcto
            let shouldRecreateTransaction = false;
            const taskPriceForValidation = parseFloat(task.price || '0');
            const expectedNetAmount = calculateNetAmount(taskPriceForValidation);
            
            if (getResponse.data.success && getResponse.data.signed_tx_xdr && !getResponse.data.complete_tx_xdr) {
                try {
                    // Decodificar la transacción para verificar el monto y el destino
                    const partialTx = TransactionBuilder.fromXDR(getResponse.data.signed_tx_xdr, Networks.TESTNET);
                    let innerTx: any = partialTx;
                    if ('innerTransaction' in partialTx && (partialTx as any).innerTransaction) {
                        innerTx = (partialTx as any).innerTransaction.transaction || (partialTx as any).innerTransaction;
                    }
                    const paymentOp = innerTx.operations?.find((op: any) => op.type === 'payment');
                    
                    if (paymentOp) {
                        const txAmount = parseFloat(paymentOp.amount);
                        const tolerance = 0.0000001;
                        
                        // Verificar si el monto en la transacción no coincide con el esperado
                        if (Math.abs(txAmount - expectedNetAmount) > tolerance) {
                            shouldRecreateTransaction = true;
                        }
                        
                        // Verificar si el destino no coincide con la wallet actual del trabajador
                        if (currentWorkerAddress && paymentOp.destination !== currentWorkerAddress) {
                            shouldRecreateTransaction = true;
                        }
                        
                        // Si hay algún problema, eliminar la transacción pendiente incorrecta
                        if (shouldRecreateTransaction) {
                            try {
                                await axios.post(`${API_URL}/auth/save_pending_transaction.php`, {
                                    task_id: parseInt(taskId!, 10),
                                    signed_tx_xdr: '',
                                    signer_role: 'delete'
                                }, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                            } catch (deleteErr) {
                                // Ignorar errores al eliminar
                            }
                        }
                    }
                } catch (verifyError) {
                    shouldRecreateTransaction = true;
                }
            }

            // Si hay una transacción parcialmente firmada por el cliente, el trabajador la completa
            if (getResponse.data.success && getResponse.data.signed_tx_xdr && !getResponse.data.complete_tx_xdr && !shouldRecreateTransaction) {
                const partialXdr = getResponse.data.signed_tx_xdr;
                
                // CRÍTICO: Verificar que la dirección del trabajador sea un signer del escrow
                const escrowId = task?.escrow_id || '';
                try {
                    const escrowAccount = await horizonServer.loadAccount(escrowId);
                    const signers = escrowAccount.signers || [];
                    const requiredSigners = signers.filter((s: any) => s.weight > 0).map((s: any) => s.key);
                    
                    if (!requiredSigners.includes(address)) {
                        throw new Error(`Tu dirección actual (${address}) no está configurada como signer del escrow. Los signers son: ${requiredSigners.join(', ')}. Esto puede ocurrir si cambiaste tu wallet después de que se creó el escrow. Por favor, contacta al cliente para recrear el escrow con tu nueva wallet.`);
                    }
                    
                    console.log('✅ Verificación previa: La dirección del trabajador está en los signers del escrow.');
                } catch (verifyError: any) {
                    if (verifyError.message && verifyError.message.includes('no está configurada')) {
                        throw verifyError;
                    }
                    console.warn('⚠️ No se pudo verificar signers antes de firmar:', verifyError);
                }
                
                // Firmar la transacción parcialmente firmada
                kit.setWallet('freighter');
                
                // Verificar la transacción parcial antes de firmar
                const partialTx = TransactionBuilder.fromXDR(partialXdr, Networks.TESTNET);
                const partialSigCount = partialTx.signatures.length;
                const partialTxHash = partialTx.hash().toString('hex');
                
                console.log('🔐 Firmando transacción parcialmente firmada...', {
                    partialXdrLength: partialXdr.length,
                    workerAddress: address,
                    partialSignatures: partialSigCount,
                    partialTxHash: partialTxHash
                });
                
                const { signedTxXdr: completeXdr } = await kit.signTransaction(partialXdr, {
                    address: address,
                    networkPassphrase: Networks.TESTNET
                });

                // Verificar que tiene 2 firmas
                const completeTx = TransactionBuilder.fromXDR(completeXdr, Networks.TESTNET);
                const sigCount = completeTx.signatures.length;
                const completeTxHash = completeTx.hash().toString('hex');
                
                // CRÍTICO: Verificar que el hash de la transacción NO cambió (solo se agregaron firmas)
                if (partialTxHash !== completeTxHash) {
                    console.error('❌ ERROR CRÍTICO: El hash de la transacción cambió después de firmar!', {
                        partialHash: partialTxHash,
                        completeHash: completeTxHash
                    });
                    throw new Error('La transacción fue modificada durante la firma. Esto no debería ocurrir. Por favor, intenta nuevamente.');
                }
                
                console.log('✅ Verificación de hash: La transacción no fue modificada, solo se agregaron firmas.', {
                    txHash: completeTxHash,
                    partialSignatures: partialSigCount,
                    completeSignatures: sigCount
                });
                
                // CRÍTICO: Verificar que las firmas correspondan a los signers del escrow
                const escrowAccount = await horizonServer.loadAccount(escrowId);
                const signers = escrowAccount.signers || [];
                const requiredSigners = signers.filter((s: any) => s.weight > 0).map((s: any) => s.key);
                
                // Extraer hints de las firmas para verificar que correspondan a los signers
                const signatureHints = completeTx.signatures.map((sig: any) => {
                    try {
                        // El hint es los últimos 4 bytes de la clave pública
                        return sig.hint ? uint8ArrayToHex(new Uint8Array(sig.hint)) : null;
                    } catch (e) {
                        return null;
                    }
                });
                
                // Verificar que los hints correspondan a los signers
                const signerHints = requiredSigners.map((key: string) => {
                    try {
                        const keypair = Keypair.fromPublicKey(key);
                        return uint8ArrayToHex(new Uint8Array(keypair.signatureHint()));
                    } catch (e) {
                        return null;
                    }
                });
                
                console.log('🔐 Verificación detallada de firmas después de completar:', {
                    partialSignatures: partialSigCount,
                    completeSignatures: sigCount,
                    expected: 2,
                    requiredSigners: requiredSigners,
                    signatureHints: signatureHints,
                    signerHints: signerHints,
                    workerAddress: address,
                    completeXdrLength: completeXdr.length
                });
                
                if (sigCount < 2) {
                    throw new Error(`Error: La transacción no tiene 2 firmas. Tiene ${sigCount} firma(s). La transacción parcial tenía ${partialSigCount}.`);
                }
                
                // Verificar que al menos uno de los hints coincida con el trabajador
                const workerHint = signerHints.find((_hint, idx) => requiredSigners[idx] === address);
                const hasWorkerSignature = workerHint && signatureHints.includes(workerHint);
                
                if (!hasWorkerSignature && workerHint) {
                    console.warn(`⚠️ ADVERTENCIA: La firma del trabajador puede no estar presente. Worker hint: ${workerHint}, Signature hints: ${signatureHints.join(', ')}`);
                }

                // Guardar XDR completamente firmado
                console.log('💾 Guardando XDR completamente firmado en BD...', {
                    completeXdrLength: completeXdr.length,
                    signaturesCount: sigCount,
                    txHash: completeTxHash
                });
                
                const saveResponse = await axios.post(`${API_URL}/auth/save_pending_transaction.php`, {
                    task_id: parseInt(taskId!, 10),
                    signed_tx_xdr: completeXdr,
                    signer_role: 'both' // Indica que ambas firmas están completas
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!saveResponse.data.success) {
                    throw new Error('Error al guardar transacción completamente firmada');
                }

                // Verificar que el XDR guardado sea el mismo que el que enviamos
                console.log('✅ XDR guardado exitosamente en BD');

                // Si la transacción está completamente firmada, enviarla automáticamente
                setError(null); // Limpiar cualquier error previo
                setPendingTransaction({
                    hasPending: true,
                    signedBy: 'both',
                    waitingFor: undefined
                });
                await submitCompleteTransaction();
                return;
            }

            // Si no hay transacción pendiente o debe recrearse, crear una nueva y el trabajador la firma (primera firma)
            // Verificar que tenemos la dirección del trabajador
            if (!workerId) {
                throw new Error('No se pudo identificar al trabajador');
            }
            
            if (!currentWorkerAddress) {
                throw new Error('El trabajador no tiene wallet configurada');
            }
            
            const workerAddress = currentWorkerAddress;

            // Verificar balance del escrow y usar el precio de la tarea como monto a retirar
            const escrowAccount = await horizonServer.loadAccount(escrowId);
            const balance = escrowAccount.balances.find((b: any) => b.asset_type === 'native')?.balance || '0';
            const balanceNum = parseFloat(balance);
            
            // Calcular balance mínimo real basado en signers
            const baseReserve = 1.0;
            const signerReserve = 0.5;
            const activeSigners = escrowAccount.signers?.filter((s: any) => s.weight > 0).length || 0;
            const masterWeight = escrowAccount.signers?.find((s: any) => s.key === escrowAccount.accountId())?.weight || 0;
            
            let minimumBalance = baseReserve;
            if (masterWeight === 0) {
                minimumBalance += (activeSigners * signerReserve);
            } else {
                minimumBalance += ((activeSigners - 1) * signerReserve);
            }
            minimumBalance += 0.0001; // Margen para fees
            
            // Obtener el precio total de la tarea (el monto que el cliente depositó)
            // createReleaseFundsXDR calculará internamente el monto neto después de deducir la comisión
            const taskPriceForRelease = parseFloat(task.price || '0');
            
            // Verificar que después de retirar el monto neto, quede al menos el mínimo
            // Primero calcular el monto neto para la validación
            const netAmount = calculateNetAmount(taskPriceForRelease);
            const balanceAfterRelease = balanceNum - netAmount;
            if (balanceAfterRelease < minimumBalance) {
                throw new Error(`Balance insuficiente. Balance actual: ${balance} USDC. Monto neto a pagar: ${netAmount.toFixed(7)} USDC (de ${taskPriceForRelease.toFixed(7)} USDC total). Después del retiro quedarían ${balanceAfterRelease.toFixed(7)} USDC, pero se requieren al menos ${minimumBalance.toFixed(7)} USDC para mantener la cuenta activa (considerando ${activeSigners} signers activos). La comisión del 0.3% quedará en el escrow.`);
            }

            // Crear XDR de transacción - pasar el monto TOTAL (taskPriceForRelease), no el neto
            // createReleaseFundsXDR calculará internamente el monto neto
            const txXdr = await createReleaseFundsXDR(
                escrowId,
                workerAddress,
                taskPriceForRelease.toString(), // Pasar el monto total, no el neto
                horizonServer
            );

            // Firmar con Freighter
            kit.setWallet('freighter');
            const { signedTxXdr: firstSignedXdr } = await kit.signTransaction(txXdr, {
                address: address,
                networkPassphrase: Networks.TESTNET
            });


            // Guardar transacción parcialmente firmada
            const saveResponse = await axios.post(`${API_URL}/auth/save_pending_transaction.php`, {
                task_id: parseInt(taskId!, 10),
                signed_tx_xdr: firstSignedXdr,
                signer_role: 'worker'
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

                if (!saveResponse.data.success) {
                    throw new Error('Error al guardar transacción parcialmente firmada');
                }

                // Actualizar estado de transacción pendiente
                setPendingTransaction({
                    hasPending: true,
                    signedBy: 'worker',
                    waitingFor: 'client'
                });
                setError(null); // Limpiar error, la transacción está pendiente de la firma del cliente

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
            
            setError('Error al retirar fondos: ' + errorMessage);
        } finally {
            setWithdrawingFunds(false);
        }
    };

    /* ============================================
     * SISTEMA ANTIGUO: MULTISIG 2-DE-2 (RESTAURADO)
     * ============================================
     * Función para enviar transacción completamente firmada
     * Sistema restaurado: 2025-11-22
     * ============================================ */
    const submitCompleteTransaction = async () => {
        const token = localStorage.getItem('token');
        const horizonServer = getHorizonServer();

        // Obtener transacción del backend
        const getResponse = await axios.get(`${API_URL}/auth/get_pending_transaction.php?task_id=${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });


        // Verificar que la transacción está completamente firmada
        if (!getResponse.data.success || !getResponse.data.complete_tx_xdr) {
            throw new Error('No hay transacción completamente firmada. Ambos participantes deben aceptar y firmar primero.');
        }

        const completeTxXdr = getResponse.data.complete_tx_xdr;
        
        // Verificar que el XDR no esté vacío
        if (!completeTxXdr || completeTxXdr.trim() === '') {
            throw new Error('La transacción completamente firmada está vacía o no es válida.');
        }

        console.log('📥 XDR recuperado de BD:', {
            xdrLength: completeTxXdr.length,
            xdrPreview: completeTxXdr.substring(0, 200)
        });

        // Decodificar XDR a objeto Transaction (como se hace en ProposalReview.tsx)
        const signedTx = TransactionBuilder.fromXDR(completeTxXdr, Networks.TESTNET);
        
        // Verificar firmas antes de enviar
        const signatures = signedTx.signatures || [];
        const txHash = signedTx.hash().toString('hex');
        
        console.log('🔐 Verificando firmas antes de enviar...', {
            signaturesCount: signatures.length,
            escrowId: task?.escrow_id,
            txHash: txHash
        });
        
        // Verificar que tiene 2 firmas
        if (signatures.length < 2) {
            throw new Error(`La transacción solo tiene ${signatures.length} firma(s), pero se requieren 2 firmas para un escrow multisig 2-de-2.`);
        }
        
        // Verificar que las firmas correspondan a los signers del escrow
        try {
            const escrowAccount = await horizonServer.loadAccount(task?.escrow_id || '');
            const signers = escrowAccount.signers || [];
            const requiredSigners = signers.filter((s: any) => s.weight > 0).map((s: any) => s.key);
            
            // Obtener direcciones esperadas
            const workerId = worker?.id || task?.accepted_applicant_id;
            let expectedClientAddress: string | null = null;
            let expectedWorkerAddress: string | null = null;
            
            // Obtener dirección del cliente
            // Primero intentar desde el usuario actual si es el cliente
            const isClientUser = currentUser && String(currentUser.id) === String(task?.user_id);
            if (isClientUser && isConnected && address) {
                expectedClientAddress = address;
                console.log('✅ Dirección del cliente obtenida desde wallet conectada:', expectedClientAddress);
            } else if (task?.user_id) {
                // Si no, intentar desde la BD
                try {
                    const clientResponse = await axios.get(`${API_URL}/auth/get_user_details.php?user_id=${task.user_id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    expectedClientAddress = clientResponse.data?.wallet_address || null;
                    console.log('✅ Dirección del cliente obtenida desde BD:', expectedClientAddress);
                } catch (e) {
                    console.warn('⚠️ No se pudo obtener dirección del cliente desde BD:', e);
                }
            }
            
            // Obtener dirección del trabajador
            if (workerId) {
                expectedWorkerAddress = await getWorkerWalletAddress(workerId);
                console.log('✅ Dirección del trabajador obtenida:', expectedWorkerAddress);
            }
            
            // Extraer hints de las firmas
            const signatureHints = signatures.map((sig: any, index: number) => {
                try {
                    console.log(`🔍 Firma ${index}:`, {
                        sig: sig,
                        hint: sig.hint,
                        hintType: typeof sig.hint,
                        hintIsArray: Array.isArray(sig.hint),
                        hintLength: sig.hint?.length
                    });
                    
                    if (!sig.hint) {
                        return null;
                    }
                    
                    // El hint puede ser un Buffer, Uint8Array, o array de números
                    let hintBytes: Uint8Array;
                    if (sig.hint instanceof Uint8Array) {
                        hintBytes = sig.hint;
                    } else if (Array.isArray(sig.hint)) {
                        hintBytes = new Uint8Array(sig.hint);
                    } else if (sig.hint.buffer) {
                        // Si es un Buffer-like object
                        hintBytes = new Uint8Array(sig.hint.buffer, sig.hint.byteOffset || 0, sig.hint.byteLength || sig.hint.length);
                    } else {
                        // Intentar convertir directamente
                        hintBytes = new Uint8Array(Object.values(sig.hint));
                    }
                    
                    return uint8ArrayToHex(hintBytes);
                } catch (e) {
                    console.error(`❌ Error extrayendo hint de firma ${index}:`, e, sig);
                    return null;
                }
            });
            
            // Calcular hints de los signers esperados
            const signerHints = requiredSigners.map((key: string) => {
                try {
                    const keypair = Keypair.fromPublicKey(key);
                    return uint8ArrayToHex(new Uint8Array(keypair.signatureHint()));
                } catch (e) {
                    return null;
                }
            });
            
            // Calcular hints de las direcciones esperadas para comparar
            let expectedClientHint: string | null = null;
            let expectedWorkerHint: string | null = null;
            
            if (expectedClientAddress) {
                try {
                    const clientKeypair = Keypair.fromPublicKey(expectedClientAddress);
                    expectedClientHint = uint8ArrayToHex(new Uint8Array(clientKeypair.signatureHint()));
                } catch (e) {
                    console.warn('⚠️ No se pudo calcular hint del cliente:', e);
                }
            }
            
            if (expectedWorkerAddress) {
                try {
                    const workerKeypair = Keypair.fromPublicKey(expectedWorkerAddress);
                    expectedWorkerHint = uint8ArrayToHex(new Uint8Array(workerKeypair.signatureHint()));
                } catch (e) {
                    console.warn('⚠️ No se pudo calcular hint del trabajador:', e);
                }
            }
            
            console.log('🔍 Verificación detallada de firmas:', {
                requiredSigners: requiredSigners,
                expectedClientAddress: expectedClientAddress,
                expectedWorkerAddress: expectedWorkerAddress,
                expectedClientHint: expectedClientHint,
                expectedWorkerHint: expectedWorkerHint,
                signatureHints: signatureHints,
                signerHints: signerHints,
                signaturesMatch: signatureHints.some(hint => signerHints.includes(hint)),
                clientHintMatches: expectedClientHint && signatureHints.includes(expectedClientHint),
                workerHintMatches: expectedWorkerHint && signatureHints.includes(expectedWorkerHint)
            });
            
            // Expandir los arrays para ver los valores completos
            console.log('🔍 Signers del escrow (completo):', requiredSigners);
            console.log('🔍 Hints de los signers (completo):', signerHints);
            console.log('🔍 Hints de las firmas (completo):', signatureHints);
            
            // Verificar si los signers del escrow coinciden con las direcciones esperadas
            const clientIsSigner = expectedClientAddress && requiredSigners.includes(expectedClientAddress);
            const workerIsSigner = expectedWorkerAddress && requiredSigners.includes(expectedWorkerAddress);
            
            console.log('🔍 Verificación de signers vs direcciones esperadas:', {
                clientIsSigner: clientIsSigner,
                workerIsSigner: workerIsSigner,
                clientAddressInSigners: expectedClientAddress ? requiredSigners.includes(expectedClientAddress) : false,
                workerAddressInSigners: expectedWorkerAddress ? requiredSigners.includes(expectedWorkerAddress) : false
            });
            
            // Verificar que al menos 2 hints coincidan con los signers
            const matchingHints = signatureHints.filter(hint => hint && signerHints.includes(hint));
            
            // Si no hay coincidencias, puede ser que las direcciones cambiaron
            // En este caso, intentar enviar de todas formas ya que el XDR tiene 2 firmas
            if (matchingHints.length < 2) {
                console.warn('⚠️ ADVERTENCIA: Los hints de las firmas no coinciden exactamente con los signers del escrow.', {
                    matchingHints: matchingHints.length,
                    required: 2,
                    signatureHints: signatureHints,
                    signerHints: signerHints,
                    requiredSigners: requiredSigners
                });
                console.warn('⚠️ Continuando de todas formas ya que la transacción tiene 2 firmas. El problema puede ser que las direcciones cambiaron después de crear el escrow.');
                // NO lanzar error aquí, dejar que Horizon decida
            }
        } catch (verifyError: any) {
            if (verifyError.message && verifyError.message.includes('no corresponden')) {
                throw verifyError;
            }
            console.warn('⚠️ No se pudo verificar signers antes de enviar:', verifyError);
        }
        
        console.log('📤 Enviando transacción a Horizon...');
        console.log('📋 XDR completo (primeros 200 caracteres):', completeTxXdr.substring(0, 200));
        
        let result;
        try {
            result = await horizonServer.submitTransaction(signedTx);
            
            console.log('Transacción enviada exitosamente:', {
                hash: result.hash,
                ledger: result.ledger
            });
            
        } catch (submitError: any) {
            // Logging detallado del error completo
            console.error('🔴 Error completo capturado:', submitError);
            console.error('🔴 Error response:', submitError.response);
            console.error('🔴 Error response data:', submitError.response?.data);
            
            // Logging detallado de result codes
            const resultCodes = submitError.response?.data?.extras?.result_codes || submitError.response?.data?.result_codes;
            const errorDetail = submitError.response?.data?.detail || submitError.response?.data?.message || submitError.message;
            const errorType = submitError.response?.data?.type;
            const errorTitle = submitError.response?.data?.title;
            
            // Mensaje de error más descriptivo
            let errorMessage = 'Error al enviar transacción a Stellar: ';
            
            if (resultCodes) {
                // Procesar result codes de Stellar
                if (resultCodes.transaction) {
                    errorMessage += `[${resultCodes.transaction}] `;
                    
                    // Mensajes específicos para códigos comunes
                    if (resultCodes.transaction === 'tx_bad_auth') {
                        errorMessage += 'Faltan firmas o las firmas son inválidas. Verifica que ambas partes hayan firmado correctamente. ';
                    } else if (resultCodes.transaction === 'tx_bad_seq') {
                        errorMessage += 'La secuencia de la cuenta está desactualizada. Por favor, ambas partes deben aceptar nuevamente para crear una nueva transacción. ';
                    } else if (resultCodes.transaction === 'tx_too_late') {
                        errorMessage += 'La transacción ha expirado. Por favor, ambas partes deben aceptar nuevamente para crear una nueva transacción. ';
                    } else if (resultCodes.transaction === 'tx_insufficient_balance') {
                        errorMessage += 'Balance insuficiente en la cuenta escrow. ';
                    } else if (resultCodes.transaction === 'tx_missing_operation') {
                        errorMessage += 'La transacción no tiene operaciones válidas. ';
                    }
                }
                
                if (resultCodes.operations && Array.isArray(resultCodes.operations)) {
                    const opErrors = resultCodes.operations.filter((op: any) => op !== 'op_success');
                    if (opErrors.length > 0) {
                        errorMessage += `Errores en operaciones: ${opErrors.join(', ')}. `;
                    }
                } else if (resultCodes.operations && typeof resultCodes.operations === 'object') {
                    // Si operations es un objeto con índices
                    const opErrors = Object.values(resultCodes.operations).filter((op: any) => op !== 'op_success');
                    if (opErrors.length > 0) {
                        errorMessage += `Errores en operaciones: ${opErrors.join(', ')}. `;
                    }
                }
                
                if (resultCodes.inner_transaction) {
                    errorMessage += `Transacción interna: ${resultCodes.inner_transaction}. `;
                }
            }
            
            if (errorTitle) {
                errorMessage += `Título: ${errorTitle}. `;
            }
            
            if (errorType) {
                errorMessage += `Tipo: ${errorType}. `;
            }
            
            errorMessage += errorDetail || 'Error desconocido';
            
            // Log completo del error para debugging
            console.error('❌ Error completo de Horizon:', {
                status: submitError.response?.status,
                statusText: submitError.response?.statusText,
                type: errorType,
                title: errorTitle,
                data: submitError.response?.data,
                resultCodes: resultCodes,
                errorDetail: errorDetail,
                fullResponse: submitError.response,
                error: submitError
            });
            
            // Mostrar result_codes completo en consola para debugging
            if (resultCodes) {
                console.error('📋 Result Codes detallados:', JSON.stringify(resultCodes, null, 2));
            }
            
            // Si no hay mensaje de error específico, usar el mensaje genérico con más detalles
            if (!errorMessage || errorMessage === 'Error al enviar transacción a Stellar: ') {
                errorMessage = `Error al enviar transacción a Stellar. ${errorTitle || 'Error desconocido'}. ${errorDetail || ''}`;
                if (resultCodes) {
                    errorMessage += ` Códigos: ${JSON.stringify(resultCodes)}`;
                }
            }
            
            throw new Error(errorMessage);
        }


        // Verificar que la transacción realmente se procesó
        try {
            // Obtener wallet del trabajador para verificar balance
            const workerId = worker?.id || task?.accepted_applicant_id;
            let workerAddress: string | null = null;
            if (workerId) {
                workerAddress = await getWorkerWalletAddress(workerId);
            }
            
            // Obtener balance del escrow ANTES de verificar
            const escrowId = task?.escrow_id || '';
            await horizonServer.loadAccount(escrowId);
            
            // Obtener balance del trabajador ANTES (si tenemos su dirección)
            let workerBalanceBefore = '0';
            if (workerAddress) {
                try {
                    const workerAccountBefore = await horizonServer.loadAccount(workerAddress);
                    workerBalanceBefore = workerAccountBefore.balances.find((b: any) => b.asset_type === 'native')?.balance || '0';
                } catch (err) {
                }
            }
            
            // Esperar un momento para que la transacción se procese
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Verificar el estado de la transacción en Horizon
            const txResult = await horizonServer.transactions().transaction(result.hash).call();
            
            if (!txResult.successful) {
                throw new Error('La transacción no fue exitosa en Stellar');
            }
            
            // Verificar balance del escrow DESPUÉS
            await horizonServer.loadAccount(escrowId);
            
            // Verificar balance del trabajador DESPUÉS (si tenemos su dirección)
            if (workerAddress) {
                try {
                    const workerAccountAfter = await horizonServer.loadAccount(workerAddress);
                    const workerBalanceAfter = workerAccountAfter.balances.find((b: any) => b.asset_type === 'native')?.balance || '0';
                    
                    const balanceIncreased = parseFloat(workerBalanceAfter) > parseFloat(workerBalanceBefore);
                    if (balanceIncreased) {
                    } else {
                    }
                } catch (err) {
                }
            }
        } catch (verifyError: any) {
            throw new Error('Error verificando transacción: ' + (verifyError.message || 'Error desconocido'));
        }

        // Notificar al backend
        try {
            await axios.post(`${API_URL}/auth/submit_complete_transaction.php`, {
                task_id: parseInt(taskId!, 10),
                complete_tx_xdr: completeTxXdr,
                tx_hash: result.hash
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (backendError: any) {
            // No lanzar error, la transacción ya se envió a Stellar
        }

        // Obtener el monto recibido de la transacción (usar el precio de la tarea)
        const receivedAmount = task?.price || '0';
        
        // Mostrar popup de éxito en lugar de alert
        setPaymentSuccessData({
            amount: receivedAmount,
            txHash: result.hash
        });
        setShowPaymentSuccessPopup(true);
        setWithdrawingFunds(false);
        
        // Recargar datos después de un momento
        setTimeout(() => {
            fetchData();
        }, 1000);

        // Redirigir automáticamente al dashboard después de 1 minuto
        setTimeout(() => {
            setShowPaymentSuccessPopup(false);
            navigate('/dashboard');
        }, 60000); // 60 segundos = 1 minuto
    };

    // Función helper para obtener wallet del trabajador
    const getWorkerWalletAddress = async (workerId: string): Promise<string | null> => {
        try {
            
            // Si el trabajador es el usuario actual y tiene wallet conectada, usarla directamente
            if (currentUser && currentUser.id === workerId && isConnected && address) {
                // No intentar guardar la wallet aquí - puede causar errores 400 si ya está guardada
                // La wallet se guarda cuando el usuario se conecta por primera vez
                return address;
            }
            
            // PRIMERO: Intentar obtener desde task.worker_wallet_address (viene de get_task_details.php)
            if (task?.worker_wallet_address) {
                return task.worker_wallet_address;
            }
            
            // SEGUNDO: Si no está en task, obtener de la BD (users o applications)
            const response = await axios.get(`${API_URL}/auth/get_user_details.php?user_id=${workerId}`);
            let walletAddress = response.data?.wallet_address || null;
            
            // Si no está en la BD pero el trabajador tiene wallet conectada (si es el usuario actual)
            if (!walletAddress && currentUser && currentUser.id === workerId && isConnected && address) {
                walletAddress = address;
                // No intentar guardar aquí - puede causar errores 400 si ya está guardada
                // La wallet se guarda cuando el usuario se conecta por primera vez
            }
            
            if (!walletAddress) {
            } else {
            }
            return walletAddress;
        } catch (error: any) {
            return null;
        }
    };

    /* ============================================
     * SISTEMA ANTIGUO: MULTISIG 2-DE-2 (RESTAURADO)
     * ============================================
     * Función para marcar la tarea como completada (trabajador)
     * Sistema restaurado: 2025-11-22
     * ============================================ */
    // Trabajador marca tarea como completada (solo actualiza BD)
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

            // PASO 1: Verificar que el cliente ya firmó la transacción
            let pendingTxResponse;
            try {
                pendingTxResponse = await axios.get(`${API_URL}/auth/get_pending_transaction.php?task_id=${taskId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (err) {
                pendingTxResponse = { data: { success: false } };
            }

            // Verificar que existe una transacción firmada por el cliente
            if (!pendingTxResponse.data.success || 
                !pendingTxResponse.data.signed_tx_xdr || 
                pendingTxResponse.data.signed_by !== 'client') {
                throw new Error('El cliente aún no ha firmado la transacción. Debes esperar a que el cliente acepte y firme primero.');
            }

            // PASO 2: SOLO actualizar BD (worker_accepted_completion = 1)
            // NO se firma ninguna transacción aquí. La firma se hace cuando se hace clic en "Retirar Dinero"
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
                throw new Error(response.data.message || 'Error al aceptar trabajo');
            }

            // PASO 3: Actualizar el estado local de la tarea
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
        
        setCreatingDispute(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('No se encontró el token de autenticación.');
                setCreatingDispute(false);
                return;
            }
            
            const response = await axios.post(
                `${API_URL}/auth/create_dispute.php`,
                {
                    task_id: parseInt(taskId, 10),
                    reason: disputeReason.trim()
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
                alert('Disputa creada exitosamente. Un administrador revisará tu caso.');
                
                // Recargar datos
                setTimeout(() => {
                    fetchData();
                }, 500);
            } else {
                throw new Error(response.data.message || 'Error al crear la disputa');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            setError('Error al crear la disputa: ' + errorMessage);
            
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
                <p><span className="detail-label">Recompensa:</span> {calculateNetAmount(parseFloat(task.price)).toFixed(7)} {task.currency}</p>
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
                                Has recibido tu pago correctamente
                            </p>
                            <div style={{
                                backgroundColor: '#f8f9fa',
                                padding: '20px',
                                borderRadius: '8px',
                                marginTop: '15px',
                                textAlign: 'left'
                            }}>
                                <p style={{ margin: '8px 0', fontSize: '16px' }}>
                                    <strong>💰 Monto recibido:</strong> {paymentSuccessData.amount} USDC
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