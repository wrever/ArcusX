import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCalendarAlt, FaWallet, FaExternalLinkAlt, FaCheck, FaTimes, FaSpinner, FaEye, FaHome, FaFileAlt, FaCheckCircle, FaUserCircle } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config/database';
import { useWallet } from '../hooks/useWallet';
// Sistema antiguo de multisig eliminado - ahora usamos Trustless Work

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
import { calculateCommissionFromWorkerAmount, calculateTotalWithCommission } from '../config/commission';
import { usePlatformFee } from '../hooks/usePlatformFee';
import EscrowProcessPopup from './EscrowProcessPopup';
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
  
  // Obtener platform fee del backend
  const { platformFee } = usePlatformFee();

  // Wallet (Freighter/Stellar)
  const {
    address,
    loading: walletLoading,
    isConnected,
    connectFreighter,
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
      setError('ID de tarea no proporcionado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cargar detalles de la tarea
      const taskResponse = await axios.get(`${API_URL}/auth/get_task_details.php?task_id=${taskId}`);
      if (taskResponse.data) {
        const taskData = taskResponse.data;
        setTask(taskData);

        // Verificar si ya hay un escrow creado y un trabajador aceptado
        if (taskData.escrow_id && taskData.accepted_applicant_id) {
          console.log('Tarea ya tiene escrow completado. Cargando propuesta aceptada...');
          // Cargar la propuesta aceptada para mostrar en el popup de éxito
      const proposalsResponse = await axios.get(`${API_URL}/auth/get_task_proposals.php?task_id=${taskId}`);
      if (Array.isArray(proposalsResponse.data)) {
            // Buscar la propuesta aceptada por applicant_id o por status
            const acceptedProposal = proposalsResponse.data.find(
              (p: ProposalData) => p.applicant_id === taskData.accepted_applicant_id || p.status === 'accepted'
            );
            if (acceptedProposal) {
              console.log('Propuesta aceptada encontrada:', acceptedProposal.applicant_username);
              setSelectedProposal(acceptedProposal);
              // Mostrar popup de éxito automáticamente después de un pequeño delay para asegurar que el estado se actualice
              setTimeout(() => {
                setShowSuccessPopup(true);
              }, 100);
            } else {
              console.warn('No se encontró la propuesta aceptada, pero hay escrow_id y accepted_applicant_id');
              // Aún así mostrar el popup si hay escrow_id
              setTimeout(() => {
                setShowSuccessPopup(true);
              }, 100);
            }
        setProposals(proposalsResponse.data);
      } else {
        setProposals([]);
            // Aún así mostrar el popup si hay escrow_id
            setTimeout(() => {
              setShowSuccessPopup(true);
            }, 100);
          }
        } else {
          // Cargar propuestas de la tarea normalmente
          const proposalsResponse = await axios.get(`${API_URL}/auth/get_task_proposals.php?task_id=${taskId}`);
          if (Array.isArray(proposalsResponse.data)) {
            setProposals(proposalsResponse.data);
          } else {
            setProposals([]);
          }
        }
      }

    } catch (err: any) {
      setError('Error al cargar los datos: ' + (err.response?.data?.message || err.message));
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
      setPopupMessage('Debes estar logeado para realizar esta acción.');
      setShowErrorPopup(true);
      return;
    }

    // Verificar wallet Stellar
      if (!isConnected) {
        setPopupMessage('Debes conectar tu wallet Freighter para continuar.');
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
        return { success: false, error: 'No hay propuesta seleccionada' };
      }

      if (!isConnected || !address) {
        return { success: false, error: 'Debes conectar tu wallet Freighter primero' };
      }

      if (!kit) {
        return { success: false, error: 'Kit de wallets no inicializado. Por favor reconecta tu wallet.' };
      }

      if (!task) {
        return { success: false, error: 'No se encontró información de la tarea' };
      }

      // Validar direcciones Stellar
      const clientAddress = address;
      const workerAddress = selectedProposal.worker_wallet_address;

      if (!clientAddress || !clientAddress.startsWith('G') || clientAddress.length !== 56) {
        return { success: false, error: 'Dirección del cliente no es válida' };
        }

      if (!workerAddress || !workerAddress.startsWith('G') || workerAddress.length !== 56) {
        return { success: false, error: 'Dirección del trabajador no es válida' };
      }
      
      // Crear escrow con Trustless Work
      const engagementId = `arcusx-${taskId}-${Date.now()}`;
      // El price es el workerAmount (lo que debe recibir el trabajador después de la comisión)
      const workerAmount = parseFloat(task.price);
      
      // IMPORTANTE: Trustless Work calcula la comisión sobre el amount del escrow al liberar
      // Si el escrow tiene X USDC y la comisión es R%, entonces:
      // - Comisión = X * R
      // - Trabajador recibe = X - (X * R) = X * (1 - R)
      // 
      // Para que el trabajador reciba exactamente workerAmount:
      // workerAmount = X * (1 - R)
      // X = workerAmount / (1 - R)
      //
      // Ejemplo: workerAmount = 1 USDC, R = 0.005 (0.5%)
      // X = 1 / (1 - 0.005) = 1 / 0.995 = 1.005025... USDC
      const escrowAmount = workerAmount / (1 - platformFee);
      
      // Asegurar precisión de USDC (7 decimales)
      const roundedAmount = Math.round(escrowAmount * 10000000) / 10000000;
      const amountString = roundedAmount.toFixed(7);
      const amount = parseFloat(amountString); // Monto del escrow calculado para que el trabajador reciba workerAmount
      
      const commission = escrowAmount - workerAmount; // Comisión que se deducirá
      
      console.log('Cálculo del escrow:');
      console.log('  - Worker amount (lo que recibirá):', workerAmount);
      console.log('  - Platform fee:', platformFee, `(${(platformFee * 100).toFixed(2)}%)`);
      console.log('  - Escrow amount (calculado):', amount);
      console.log('  - Commission (que se deducirá):', commission.toFixed(7));
      console.log('  - Verificación: workerAmount recibido =', (amount * (1 - platformFee)).toFixed(7));

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
        console.error('Error al crear escrow:', result.error);
        return {
          success: false,
          error: result.error || 'Error al crear el escrow'
        };
      }

      if (!result.contractId) {
        console.error('No se recibió contractId:', result);
        return {
          success: false,
          error: 'No se pudo obtener el contractId del escrow creado'
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
            platformFeeToSave = typeof escrow.platformFee === 'number' 
              ? escrow.platformFee 
              : parseFloat(escrow.platformFee);
          }
          // Obtener trustline address
          if (escrow.trustline?.address) {
            trustlineAddress = escrow.trustline.address;
          }
        }
      } catch (error: any) {
        console.warn('No se pudieron obtener datos completos del escrow:', error.message);
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

          await axios.post(`${API_URL}/auth/create_escrow.php`, payload, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error: any) {
        console.error('Error al guardar escrow en backend:', error);
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
        return { success: false, error: 'Transacción cancelada por el usuario' };
      }
      
      return { success: false, error: error.message || 'Error creando el escrow' };
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
        return { success: false, error: 'No hay propuesta seleccionada' };
      }

      if (!isConnected || !address) {
        return { success: false, error: 'Debes conectar tu wallet Freighter primero' };
      }
      
      if (!task) {
        return { success: false, error: 'No se encontró información de la tarea' };
      }

      if (!kit) {
        return { success: false, error: 'Kit de wallets no inicializado. Por favor reconecta tu wallet.' };
      }

      // IMPORTANTE: El escrow se creó con workerAmount / (1 - platformFee)
      // Por lo tanto, debemos fondear exactamente el mismo monto para que coincida
      const workerAmount = parseFloat(task.price);
      
      // CRÍTICO: Usar el mismo platformFee que al crear el escrow
      // Si el escrow tiene un platformFee guardado, usarlo; si no, usar el actual
      let feeToUse = platformFee;
      if (task.escrow_platform_fee !== undefined && task.escrow_platform_fee !== null) {
        feeToUse = typeof task.escrow_platform_fee === 'number' 
          ? task.escrow_platform_fee 
          : parseFloat(task.escrow_platform_fee);
        console.log('Usando platformFee del escrow guardado:', feeToUse);
      } else {
        console.log('Usando platformFee actual:', feeToUse);
      }
      
      // Usar la misma fórmula que al crear el escrow
      // X = workerAmount / (1 - platformFee)
      // Esto asegura que después de deducir la comisión, el trabajador reciba exactamente workerAmount
      const escrowAmount = workerAmount / (1 - feeToUse);
      
      // Asegurar precisión de USDC (7 decimales) - EXACTAMENTE igual que al crear
      const roundedAmount = Math.round(escrowAmount * 10000000) / 10000000;
      const amountString = roundedAmount.toFixed(7);
      const amount = parseFloat(amountString); // Monto a fondear (debe coincidir con el amount del escrow)
      
      console.log('Cálculo del fondeo (DEBE SER IDÉNTICO AL CREAR):');
      console.log('  - Worker amount (lo que recibirá):', workerAmount);
      console.log('  - Platform fee usado:', feeToUse, `(${(feeToUse * 100).toFixed(2)}%)`);
      console.log('  - Escrow amount calculado:', escrowAmount);
      console.log('  - Rounded amount:', roundedAmount);
      console.log('  - Amount string (7 decimales):', amountString);
      console.log('  - Amount final a fondear:', amount);
      console.log('  - Amount del escrow guardado (si existe):', task.escrow_amount);
      
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
                  console.warn('contractIds inválido en ProposalReview (tipo desconocido):', contractIds);
                  return [];
                }
                
                console.log('ProposalReview wrapper recibió contractIds:', contractIdsArray);
                
                // Validar que contractIds sea un array válido y no esté vacío
                if (!contractIdsArray || !Array.isArray(contractIdsArray) || contractIdsArray.length === 0) {
                  console.warn('contractIds inválido o vacío en ProposalReview:', contractIdsArray);
                  return [];
                }
                
                // Filtrar contractIds vacíos o inválidos
                const validContractIds = contractIdsArray.filter(id => id && typeof id === 'string' && id.trim() !== '');
                if (validContractIds.length === 0) {
                  console.warn('No hay contractIds válidos después de filtrar:', contractIdsArray);
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
                console.error('Error en wrapper de getEscrowByContractIds:', error.message);
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
            
            console.log(`⏳ Reintentando en ${delay / 1000} segundos... (intento ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error: any) {
          if (attempt === maxRetries) {
            result = {
              success: false,
              error: error.message || 'Error al fondear el escrow después de múltiples intentos'
            };
            break;
          }
          
          // Detectar si es el error "normalize" para usar tiempos más largos
          const isNormalizeError = error.message?.includes('normalize') || error.message?.includes('normalize');
          const delay = isNormalizeError 
            ? 120000 // 2 minutos si es error normalize
            : attempt === 1 ? 30000 : 60000; // 30s, 1min para otros errores
          
          console.log(`⏳ Reintentando en ${delay / 1000} segundos... (intento ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Si no hay resultado o falló, retornar error
      if (!result || !result.success) {
        return {
          success: false,
          error: result?.error || 'Error al fondear el escrow después de múltiples intentos'
        };
      }
      
      return {
        success: true,
        txHash: result.txHash || ''
      };
      
    } catch (error: any) {
      if (error.message?.includes('User declined')) {
        return { success: false, error: 'Transacción cancelada por el usuario' };
      }
      
      return { success: false, error: error.message || 'Error enviando dinero al escrow' };
    }
  };
  // ============================================
  // FIN SISTEMA TRUSTLESS WORK
  // ============================================

  // Función para seleccionar trabajador en la base de datos (Paso 4 del popup)
  const handleSelectWorker = async (escrowId: string, txHash: string) => {
    try {
      
      if (!selectedProposal) {
        return { success: false, error: 'No hay propuesta seleccionada' };
      }
      
      // Seleccionar propuesta en el backend
      try {
        const selectResponse = await axios.post(
          `${API_URL}/auth/select_proposal.php`,
          {
            task_id: taskId,
            proposal_id: selectedProposal.id,
            transaction_hash: txHash,
            escrow_id: escrowId // Contract ID de Trustless Work (empieza con 'C')
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            validateStatus: (status) => {
              // Aceptar todos los status codes para manejar errores manualmente
              return status >= 200 && status < 600;
            }
          }
        );

        // Verificar si la respuesta es exitosa (200-299)
        if (selectResponse.status < 200 || selectResponse.status >= 300) {
          const errorMessage = selectResponse.data?.message || 
                             `Error al seleccionar trabajador. Status: ${selectResponse.status}`;
          console.error('Error al seleccionar propuesta:', errorMessage);
          // Continuar de todas formas - la transacción de Stellar ya se completó
        } else if (!selectResponse.data || selectResponse.data.success !== true) {
          const errorMessage = selectResponse.data?.message || 
                             'Error al seleccionar trabajador. La respuesta no indica éxito.';
          console.error('Error al seleccionar propuesta:', errorMessage);
          // Continuar de todas formas
        }
      } catch (error: any) {
        console.error('Error al seleccionar propuesta en backend:', error);
        // Continuar de todas formas - la transacción de Stellar ya se completó
      }

      return { success: true };
      
    } catch (error: any) {
      return { success: false, error: error.message || 'Error seleccionando trabajador' };
    }
  };

  // Función para completar el proceso
  const handleProcessComplete = () => {
    // Calcular montos usando el nuevo modelo
    const workerAmount = task?.price ? parseFloat(task.price) : 0;
    const commission = workerAmount > 0 ? calculateCommissionFromWorkerAmount(workerAmount, platformFee) : 0;
    const totalAmount = workerAmount > 0 ? calculateTotalWithCommission(workerAmount, platformFee) : 0;
    const feePercent = (platformFee * 100).toFixed(2);
    
    // Mostrar mensaje de éxito mejorado
    setPopupMessage(`CONTRATO ACTIVADO EXITOSAMENTE!
        
Trabajador recibirá: ${workerAmount.toFixed(2)} ${task?.currency || 'USDC'}
Comisión de plataforma (${feePercent}%): ${commission.toFixed(7)} ${task?.currency || 'USDC'}
Total pagado: ${totalAmount.toFixed(7)} ${task?.currency || 'USDC'}
Red: Stellar Testnet
Trabajador: ${selectedProposal?.applicant_username}

El proyecto está activo y el trabajador puede comenzar.`);
    
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

      // Conectar Freighter
      await connectFreighter();
      
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
        return { success: false, error: 'No se pudo conectar con Freighter' };
      }

      return { success: true };
      
    } catch (error: any) {
      return { success: false, error: error.message || 'Error conectando wallet' };
    }
  };



  // Función para ir al dashboard desde el popup
  const handleGoToDashboard = () => {
    setShowSuccessPopup(false);
    navigate('/dashboard');
  };

  // Función para ir a supervisar la tarea desde el popup
  const handleGoToSupervise = () => {
    setShowSuccessPopup(false);
    if (taskId && (task?.accepted_applicant_id || selectedProposal?.applicant_id)) {
      const applicantId = task?.accepted_applicant_id || selectedProposal?.applicant_id;
      navigate(`/supervise-task/${taskId}/${applicantId}`);
    } else {
      // Si no hay applicant_id, ir al dashboard
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
          <p>Cargando propuestas...</p>
        </div>
      </div>
    );
    }

    if (error) {
    return (
      <div className="proposal-review-container">
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
          <Link to="/dashboard" className="back-button">
            <FaArrowLeft />
            <span>Volver al Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="proposal-review-container">
        <div className="error-message">
          <h3>Tarea no encontrada</h3>
          <p>La tarea solicitada no existe o no tienes permisos para verla.</p>
          <Link to="/dashboard" className="back-button">
            <FaArrowLeft />
            <span>Volver al Dashboard</span>
          </Link>
        </div>
      </div>
    );
    }

    return (
        <div className="proposal-review-container">
      <Link to="/dashboard" className="back-button">
                <FaArrowLeft />
        <span>Volver al Dashboard</span>
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
            <h3>Descripción del Proyecto</h3>
                    <p>{task.description}</p>
          </div>

        </div>

        {/* Lista de propuestas - Ocultar si ya hay escrow completado */}
        {!(task?.escrow_id && task?.accepted_applicant_id) && (
        <div className="proposals-section">
          <div className="proposals-header">
            <h2>Propuestas Recibidas ({proposals.length})</h2>
            <p>Revisa las propuestas de los trabajadores y selecciona al mejor candidato.</p>
            <div className="cost-info-box" style={{
              background: 'rgba(255, 165, 0, 0.1)',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <p style={{ margin: 0, color: '#4ade80', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCheckCircle style={{ fontSize: '14px' }} /> <strong>Sistema Multisig 2-de-2:</strong> Se crea una cuenta escrow única para cada tarea. Los fondos en USDC están seguros y requieren ambas firmas (cliente + trabajador) para liberar.
              </p>
            </div>
          </div>

            {proposals.length === 0 ? (
            <div className="no-proposals">
              <div className="no-proposals-icon"><FaFileAlt /></div>
              <h3>No hay propuestas aún</h3>
              <p>Los trabajadores aún no han enviado propuestas para esta tarea.</p>
            </div>
            ) : (
                <div className="proposals-list">
              {proposals.map((proposal) => (
                <div key={proposal.id} className={`proposal-card ${proposal.status}`}>
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
                        <span className="status-badge accepted">Aceptada</span>
                      )}
                      {proposal.status === 'rejected' && (
                        <span className="status-badge rejected">Rechazada</span>
                      )}
                      {proposal.status === 'pending' && (
                        <span className="status-badge pending">Pendiente</span>
                      )}
                    </div>
                  </div>

                  <div className="proposal-content">
                    <div className="proposal-message">
                      <h4>Mensaje del Trabajador</h4>
                            <p>{proposal.message}</p>
                    </div>

                            {proposal.portfolio_url && (
                      <div className="proposal-portfolio">
                        <h4>Portfolio</h4>
                        <a 
                          href={proposal.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="portfolio-link"
                        >
                          <FaExternalLinkAlt />
                          Ver Portfolio
                        </a>
                      </div>
                    )}

                    <div className="proposal-wallet">
                      <h4>Wallet Address</h4>
                      <div className="wallet-info">
                        <FaWallet />
                        <span className="wallet-address">{proposal.worker_wallet_address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="proposal-footer">
                    <Link 
                      to={`/profile/${proposal.applicant_id}`}
                      className="view-profile-button"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FaUserCircle />
                      Ver Perfil Público
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
                        Seleccionar
                                </button>
                    </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

          {/* Panel de confirmación de selección - Ocultar si ya hay escrow completado */}
          {!(task?.escrow_id && task?.accepted_applicant_id) && selectingProposal && selectedProposal && (
            <div className="selection-confirmation">
              <div className="confirmation-header">
                <h3>Confirmar Selección</h3>
                <p>Has seleccionado la propuesta de <strong>{selectedProposal.applicant_username}</strong></p>
              </div>
              
              <div className="selected-proposal-summary">
                <div className="summary-item">
                  <strong>Mensaje:</strong>
                  <p>{selectedProposal.message}</p>
                </div>
                {selectedProposal.portfolio_url && (
                  <div className="summary-item">
                    <strong>Portfolio:</strong>
                    <a href={selectedProposal.portfolio_url} target="_blank" rel="noopener noreferrer">
                      <FaExternalLinkAlt /> Ver Portfolio
                    </a>
                  </div>
                )}
                <div className="summary-item">
                  <strong>Wallet:</strong>
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
                  {actionLoading ? 'Procesando...' : 'Aceptar Propuesta'}
                </button>
                <button
                  className="action-button reject-button"
                  onClick={handleRejectProposal}
                  disabled={actionLoading}
                >
                  <FaTimes />
                  Cancelar Selección
                </button>
                <button
                  className="action-button cancel-button"
                  onClick={handleCancelSelection}
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
        )}

      </div>

      {/* Popup de Éxito - Proceso Completado */}
      {showSuccessPopup && (
        <div className="popup-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 35, 60, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div className="popup success-popup" style={{
            background: 'linear-gradient(135deg, rgba(7, 35, 60, 0.98) 0%, rgba(10, 45, 74, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '48px 40px',
            maxWidth: '560px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(40, 192, 240, 0.2)',
            border: '1px solid rgba(40, 192, 240, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Borde superior con gradiente */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
              borderRadius: '24px 24px 0 0'
            }}></div>

            {/* Icono de éxito con animación */}
            <div className="popup-icon" style={{
              fontSize: '72px',
              marginBottom: '24px',
              animation: 'scaleIn 0.5s ease-out',
              filter: 'drop-shadow(0 4px 12px rgba(40, 192, 240, 0.4))',
              color: '#4ade80',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <FaCheckCircle />
            </div>

            {/* Título */}
            <h3 style={{
              fontSize: '32px',
              fontWeight: '700',
              background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px',
              marginTop: 0,
              lineHeight: '1.2'
            }}>
              ¡Proceso Completado!
            </h3>

            {/* Contenido */}
            <div className="popup-content" style={{
              marginBottom: '32px',
              color: 'rgba(255, 255, 255, 0.9)',
              lineHeight: '1.7',
              fontSize: '16px'
            }}>
              {(popupMessage.includes('CONTRATO ACTIVADO') || (task?.escrow_id && task?.accepted_applicant_id)) ? (
                <div className="escrow-info">
                  <p style={{ 
                    fontSize: '20px', 
                    marginBottom: '20px', 
                    fontWeight: '600',
                    color: '#10dd88'
                  }}>
                    ¡Proceso Completado Exitosamente!
                  </p>
                  <p style={{ 
                    fontSize: '16px', 
                    marginBottom: '24px', 
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    El trabajador ha sido seleccionado y el escrow está configurado correctamente
                  </p>
                  <div className="contract-details" style={{
                    background: 'linear-gradient(135deg, rgba(40, 192, 240, 0.1) 0%, rgba(17, 128, 179, 0.1) 100%)',
                    border: '1px solid rgba(40, 192, 240, 0.3)',
                    padding: '24px',
                    borderRadius: '12px',
                    marginTop: '20px',
                    textAlign: 'left'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid rgba(40, 192, 240, 0.2)'
                    }}>
                      <FaCheckCircle style={{ fontSize: '18px', color: '#4ade80' }} />
                      <strong style={{ fontSize: '15px', color: '#fff' }}>
                        Contrato escrow creado
                      </strong>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid rgba(40, 192, 240, 0.2)'
                    }}>
                      <FaCheckCircle style={{ fontSize: '18px', color: '#4ade80' }} />
                      <strong style={{ fontSize: '15px', color: '#fff' }}>
                        Fondos enviados al escrow
                      </strong>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: selectedProposal || task?.escrow_id ? '1px solid rgba(40, 192, 240, 0.2)' : 'none'
                    }}>
                      <FaCheckCircle style={{ fontSize: '18px', color: '#4ade80' }} />
                      <strong style={{ fontSize: '15px', color: '#fff' }}>
                        Trabajador seleccionado{selectedProposal ? `: ${selectedProposal.applicant_username}` : ''}
                      </strong>
                    </div>
                    {selectedProposal && (
                      <div style={{ 
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(40, 192, 240, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(40, 192, 240, 0.15)'
                      }}>
                        <p style={{ 
                          fontSize: '13px', 
                          color: 'rgba(255, 255, 255, 0.8)',
                          margin: '4px 0'
                        }}>
                          <strong style={{ color: '#10dd88' }}>Wallet:</strong>{' '}
                          <code style={{ 
                            color: '#10dd88',
                            background: 'rgba(40, 192, 240, 0.1)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            {selectedProposal.worker_wallet_address}
                          </code>
                        </p>
                        {selectedProposal.message && (
                          <p style={{ 
                            fontSize: '12px', 
                            color: 'rgba(255, 255, 255, 0.7)',
                            margin: '8px 0 0 0',
                            fontStyle: 'italic'
                          }}>
                            "{selectedProposal.message.substring(0, 100)}{selectedProposal.message.length > 100 ? '...' : ''}"
                          </p>
                        )}
                      </div>
                    )}
                    {task?.escrow_id && (
                      <div style={{ 
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(40, 192, 240, 0.2)'
                      }}>
                        <p style={{ 
                          fontSize: '13px', 
                          color: 'rgba(255, 255, 255, 0.6)',
                          margin: 0
                        }}>
                          <strong style={{ color: '#10dd88' }}>Contract ID:</strong>{' '}
                          <code style={{ 
                            color: '#10dd88',
                            background: 'rgba(40, 192, 240, 0.1)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {task.escrow_id.slice(0, 8)}...{task.escrow_id.slice(-8)}
                          </code>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : popupMessage.includes('Contrato escrow creado') ? (
                <div className="escrow-info">
                  <p style={{ 
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#10dd88',
                    marginBottom: '16px'
                  }}>
                    <strong>¡Contrato escrow creado exitosamente!</strong>
                  </p>
                  <div className="contract-details" style={{
                    background: 'rgba(40, 192, 240, 0.1)',
                    border: '1px solid rgba(40, 192, 240, 0.3)',
                    padding: '20px',
                    borderRadius: '12px',
                    textAlign: 'left'
                  }}>
                    <p style={{ margin: '8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                      <strong style={{ color: '#10dd88' }}>Dirección del contrato:</strong>
                    </p>
                    <code className="contract-address" style={{
                      display: 'block',
                      background: 'rgba(7, 35, 60, 0.5)',
                      padding: '12px',
                      borderRadius: '8px',
                      color: '#10dd88',
                      fontSize: '14px',
                      wordBreak: 'break-all',
                      margin: '8px 0',
                      border: '1px solid rgba(40, 192, 240, 0.2)'
                    }}>
                      {popupMessage.split('Dirección del contrato: ')[1]?.split('\n')[0]}
                    </code>
                    <p style={{ margin: '8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                      <strong style={{ color: '#10dd88' }}>Red:</strong> {popupMessage.split('Red: ')[1]?.split('\n')[0]}
                    </p>
                    <p style={{ margin: '8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                      <strong style={{ color: '#10dd88' }}>Estado:</strong> {popupMessage.split('Estado: ')[1]}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '17px', color: 'rgba(255, 255, 255, 0.9)' }}>{popupMessage}</p>
              )}
            </div>

            {/* Botones de acción */}
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleGoToSupervise} 
                className="popup-button success-button"
                style={{
                  background: 'linear-gradient(90deg, #10dd88, #0ab86a)',
                  color: '#fff',
                  border: 'none',
                  padding: '16px 40px',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '220px',
                  boxShadow: '0 4px 16px rgba(40, 192, 240, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 192, 240, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(40, 192, 240, 0.4)';
                }}
              >
                <FaEye style={{ marginRight: '8px' }} /> Supervisar Tarea
              </button>
              <button 
                onClick={handleGoToDashboard} 
                className="popup-button secondary-button"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '16px 40px',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '220px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FaHome style={{ marginRight: '8px' }} /> Ir al Dashboard
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
            <h3>Error</h3>
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
          onClose={() => setShowEscrowProcessPopup(false)}
          onComplete={handleProcessComplete}
          taskPrice={task?.price || '0'}
          contributorAddress={selectedProposal.worker_wallet_address}
          contributorName={selectedProposal.applicant_username}
          taskId={taskId}
          acceptedApplicantId={selectedProposal.applicant_id}
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