import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCalendarAlt, FaWallet, FaExternalLinkAlt, FaCheck, FaTimes, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import { API_URL } from '../config/database';
import { useWallet } from '../hooks/useWallet';
// Sistema antiguo de multisig eliminado - ahora usamos Trustless Work

// ============================================
// SISTEMA NUEVO: SOROBAN - COMENTADO
// ============================================
// import { createAndFundEscrow } from '../services/sorobanEscrowService';
// import { SOROBAN_CONTRACT_ID } from '../config/contract';
// ============================================
// FIN SISTEMA SOROBAN - COMENTADO
// ============================================

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

// Importar funciones de comisión (se usan en ambos sistemas)
import { calculateCommission, calculateNetAmount } from '../config/commission';
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
  soroban_escrow_id?: number | null;
  contract_id?: string | null;
  escrow_id?: string | null;
  escrow_status?: string | null;
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
        setTask(taskResponse.data);
      }

      // Cargar propuestas de la tarea
      const proposalsResponse = await axios.get(`${API_URL}/auth/get_task_proposals.php?task_id=${taskId}`);
      if (Array.isArray(proposalsResponse.data)) {
        setProposals(proposalsResponse.data);
      } else {
        setProposals([]);
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
      // Asegurar precisión de USDC (7 decimales) - usar el mismo formato que al fondear
      // DEBE coincidir exactamente con el amount usado al fondear
      const rawAmount = parseFloat(task.price);
      const roundedAmount = Math.round(rawAmount * 10000000) / 10000000;
      const amountString = roundedAmount.toFixed(7);
      const amount = parseFloat(amountString); // Asegurar exactamente 7 decimales

      console.log('🔐 Creando escrow con Trustless Work...');

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
        console.error('❌ Error al crear escrow:', result.error);
        return {
          success: false,
          error: result.error || 'Error al crear el escrow'
        };
      }

      if (!result.contractId) {
        console.error('❌ No se recibió contractId:', result);
        return {
          success: false,
          error: 'No se pudo obtener el contractId del escrow creado'
        };
      }

      console.log('✅ Escrow creado:', result.contractId);

      const txHash = (result as any).txHash || '';

      // Guardar escrow_id y amount exacto en el backend
      try {
        const token = localStorage.getItem('token');
        if (token && taskId && selectedProposal) {
          const payload = {
            task_id: parseInt(taskId, 10),
            proposal_id: selectedProposal.id,
            escrow_id: result.contractId,
            transaction_hash: txHash,
            client_wallet_address: clientAddress,
            escrow_amount: amount // Guardar el amount exacto usado al crear el escrow
          };

          await axios.post(`${API_URL}/auth/create_escrow.php`, payload, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error: any) {
        console.error('❌ Error al guardar escrow en backend:', error);
        // Continuar de todas formas - el escrow ya se creó en Trustless Work
      }
      
      // Guardar el amount exacto en localStorage para usarlo al fondear
      localStorage.setItem(`escrow_amount_${result.contractId}`, amountString);
      
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

      // Obtener el amount exacto que se usó al crear el escrow
      // CRÍTICO: Debe ser EXACTAMENTE el mismo amount que se usó al crear el escrow
      // Obtener el amount exacto que se usó al crear el escrow
      // CRÍTICO: Debe ser EXACTAMENTE el mismo amount que se usó al crear el escrow
      let amount: number;
      const savedAmountString = localStorage.getItem(`escrow_amount_${escrowId}`);
      
      if (savedAmountString) {
        // Usar el amount exacto guardado al crear el escrow
        // Procesarlo de la misma manera que al crear para garantizar coincidencia exacta
        const savedAmount = parseFloat(savedAmountString);
        const amountAsInteger = Math.round(savedAmount * 10000000);
        amount = amountAsInteger / 10000000;
        console.log('✅ Usando amount exacto guardado al crear el escrow:', {
          savedString: savedAmountString,
          savedAmount: savedAmount,
          amountAsInteger: amountAsInteger,
          finalAmount: amount,
          finalAmountString: amount.toFixed(7)
        });
      } else {
        // Fallback: calcular desde task.price (debería coincidir)
        console.warn('⚠️ No se encontró amount guardado, calculando desde task.price');
        const rawAmount = parseFloat(task.price);
        
        if (isNaN(rawAmount) || rawAmount <= 0) {
          return {
            success: false,
            error: `Amount inválido: ${task.price}. Debe ser un número positivo.`
          };
        }

        // Usar el mismo método que al crear el escrow
        const amountAsInteger = Math.round(rawAmount * 10000000);
        amount = amountAsInteger / 10000000;
        console.log('⚠️ Amount calculado desde task.price:', {
          rawAmount: rawAmount,
          amountAsInteger: amountAsInteger,
          finalAmount: amount,
          finalAmountString: amount.toFixed(7)
        });
      }
      
      // Validar que el amount sea válido
      if (isNaN(amount) || amount <= 0) {
        return {
          success: false,
          error: `Amount inválido: ${amount}. Debe ser un número positivo.`
        };
      }

      // IMPORTANTE: Esperar antes del primer intento de fondeo
      // Trustless Work necesita tiempo para indexar el escrow en la blockchain
      // después de crearlo. Sin esta espera, el escrow no estará disponible para fondear.
      console.log('⏳ Esperando 120 segundos para que el escrow esté completamente indexado...');
      console.log('💡 Esto es necesario porque Trustless Work debe indexar el escrow en la blockchain antes de poder fondearlo');
      console.log('💡 Mientras tanto, verifica que:');
      console.log('   1. Tu wallet Freighter tiene trustline de USDC configurado');
      console.log('   2. Tu wallet tiene suficiente balance de USDC (al menos ' + amount + ' USDC + fees)');
      console.log('   3. El issuer de USDC es: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
      await new Promise(resolve => setTimeout(resolve, 120000)); // 120 segundos de espera inicial
      console.log('✅ Espera completada. Intentando fondear el escrow...');

      // Intentar fondear el escrow con reintentos
      // Si falla con error 400, puede ser que el escrow aún no esté completamente disponible
      let result: { success: boolean; txHash?: string; error?: string } | null = null;
      const maxRetries = 3;
      const retryDelays = [60000, 120000, 180000]; // 60s, 120s, 180s entre reintentos (ya esperamos 120s inicialmente)
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Intento ${attempt}/${maxRetries} de fondeo...`);
          result = await fundTrustlessEscrow(
            escrowId,
            amount,
            address,
            kit,
            fundEscrow,
            sendTransaction,
            async (contractIds: string[]) => {
              try {
                // CRÍTICO: Usar validateOnChain: true para verificar que el escrow esté completamente disponible en la blockchain
                const result = await getEscrowByContractIds({ 
                  contractIds,
                  validateOnChain: true 
                });
                // El resultado puede tener diferentes estructuras, devolvemos el resultado completo
                return Array.isArray(result) ? result : (result as any)?.escrows || result || [];
              } catch (error) {
                console.warn('Error al verificar indexación:', error);
                return [];
              }
            }
          );
          
          if (result.success) {
            console.log('✅ Escrow fondeado exitosamente');
            break;
          } else if (attempt < maxRetries) {
            const delay = retryDelays[attempt - 1];
            console.log(`⏳ Esperando ${delay / 1000} segundos antes del siguiente intento...`);
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
          
          const delay = retryDelays[attempt - 1];
          console.log(`⚠️ Intento ${attempt} falló: ${error.message}`);
          console.log(`⏳ Esperando ${delay / 1000} segundos antes del siguiente intento...`);
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

      console.log('📋 Datos a enviar a la base de datos:', {
        task_id: taskId,
        proposal_id: selectedProposal.id,
        transaction_hash: txHash,
        escrow_id: escrowId
      });
      
      // Seleccionar propuesta en el backend
      try {
        console.log(`💾 Seleccionando propuesta en backend...`);
        const selectResponse = await axios.post(
          `${API_URL}/auth/select_proposal.php`,
          {
            task_id: taskId,
            proposal_id: selectedProposal.id,
            transaction_hash: txHash,
            escrow_id: escrowId // Dirección Stellar de la cuenta escrow (multisig 2-de-2)
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
          console.error('❌ Error al seleccionar propuesta:', errorMessage);
          // Continuar de todas formas - la transacción de Stellar ya se completó
          console.warn('⚠️ Continuando sin guardar en backend. La transacción de Stellar ya se completó.');
        } else if (!selectResponse.data || selectResponse.data.success !== true) {
          const errorMessage = selectResponse.data?.message || 
                             'Error al seleccionar trabajador. La respuesta no indica éxito.';
          console.error('❌ Error al seleccionar propuesta:', errorMessage);
          // Continuar de todas formas
          console.warn('⚠️ Continuando sin guardar en backend. La transacción de Stellar ya se completó.');
        } else {
          console.log('✅ Propuesta seleccionada en backend:', selectResponse.data);
        }
      } catch (error: any) {
        console.error('❌ Error al seleccionar propuesta en backend:', error);
        console.error('   URL intentada:', `${API_URL}/auth/select_proposal.php`);
        console.error('   Status:', error.response?.status);
        console.error('   Mensaje:', error.response?.data || error.message);
        // Continuar de todas formas - la transacción de Stellar ya se completó
        console.warn('⚠️ Continuando sin guardar en backend. La transacción de Stellar ya se completó.');
      }

      console.log('📊 Datos del escrow creado:', {
        task_id: taskId,
        proposal_id: selectedProposal.id,
        transaction_hash: txHash,
        escrow_id: escrowId
      });

      return { success: true };
      
    } catch (error: any) {
      return { success: false, error: error.message || 'Error seleccionando trabajador' };
    }
  };

  // Función para completar el proceso
  const handleProcessComplete = () => {
    // Calcular monto neto y comisión
    const totalAmount = task?.price ? parseFloat(task.price) : 0;
    const netAmount = totalAmount > 0 ? calculateNetAmount(totalAmount) : 0;
    const commission = totalAmount > 0 ? calculateCommission(totalAmount) : 0;
    
    // Mostrar mensaje de éxito mejorado
    setPopupMessage(`✅ CONTRATO ACTIVADO EXITOSAMENTE!
        
💰 Monto total: ${task?.price || 'N/A'} ${task?.currency || 'USDC'}
💵 Recibirás: ${netAmount.toFixed(7)} USDC (neto)
📊 Comisión ArcusX (0.3%): ${commission.toFixed(7)} USDC
🌐 Red: Stellar Testnet
👤 Trabajador: ${selectedProposal?.applicant_username}

🎉 El proyecto está activo y el trabajador puede comenzar.`);
    
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
                {calculateNetAmount(parseFloat(task.price)).toFixed(7)} {task.currency}
              </span>
            </div>
          </div>
          
          <div className="task-description">
            <h3>Descripción del Proyecto</h3>
                    <p>{task.description}</p>
          </div>

        </div>

        {/* Lista de propuestas */}
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
              <p style={{ margin: 0, color: '#4ade80', fontSize: '0.9rem' }}>
                ✅ <strong>Sistema Multisig 2-de-2:</strong> Se crea una cuenta escrow única para cada tarea. Los fondos en USDC están seguros y requieren ambas firmas (cliente + trabajador) para liberar.
              </p>
            </div>
          </div>

            {proposals.length === 0 ? (
            <div className="no-proposals">
              <div className="no-proposals-icon">📝</div>
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

          {/* Panel de confirmación de selección */}
          {selectingProposal && selectedProposal && (
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
              background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
              borderRadius: '24px 24px 0 0'
            }}></div>

            {/* Icono de éxito con animación */}
            <div className="popup-icon" style={{
              fontSize: '72px',
              marginBottom: '24px',
              animation: 'scaleIn 0.5s ease-out',
              filter: 'drop-shadow(0 4px 12px rgba(40, 192, 240, 0.4))'
            }}>
              ✅
            </div>

            {/* Título */}
            <h3 style={{
              fontSize: '32px',
              fontWeight: '700',
              background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
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
              {popupMessage.includes('CONTRATO ACTIVADO') ? (
                <div className="escrow-info">
                  <p style={{ 
                    fontSize: '20px', 
                    marginBottom: '20px', 
                    fontWeight: '600',
                    color: '#28c0f0'
                  }}>
                    🎉 ¡Todo está listo!
                  </p>
                  <div className="contract-details" style={{
                    background: 'rgba(40, 192, 240, 0.1)',
                    border: '1px solid rgba(40, 192, 240, 0.3)',
                    padding: '24px',
                    borderRadius: '12px',
                    marginTop: '20px',
                    textAlign: 'left'
                  }}>
                    {popupMessage.split('\n').filter(line => line.trim()).map((line, index) => {
                      if (line.includes('💰')) {
                        return (
                          <p key={index} style={{ 
                            margin: '10px 0', 
                            fontSize: '17px',
                            color: '#fff',
                            fontWeight: '600'
                          }}>
                            <strong>{line}</strong>
                          </p>
                        );
                      }
                      if (line.includes('🌐') || line.includes('👤') || line.includes('🎉')) {
                        return (
                          <p key={index} style={{ 
                            margin: '8px 0', 
                            fontSize: '15px',
                            color: 'rgba(255, 255, 255, 0.8)'
                          }}>
                            {line}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : popupMessage.includes('Contrato escrow creado') ? (
                <div className="escrow-info">
                  <p style={{ 
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#28c0f0',
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
                      <strong style={{ color: '#28c0f0' }}>Dirección del contrato:</strong>
                    </p>
                    <code className="contract-address" style={{
                      display: 'block',
                      background: 'rgba(7, 35, 60, 0.5)',
                      padding: '12px',
                      borderRadius: '8px',
                      color: '#28c0f0',
                      fontSize: '14px',
                      wordBreak: 'break-all',
                      margin: '8px 0',
                      border: '1px solid rgba(40, 192, 240, 0.2)'
                    }}>
                      {popupMessage.split('Dirección del contrato: ')[1]?.split('\n')[0]}
                    </code>
                    <p style={{ margin: '8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                      <strong style={{ color: '#28c0f0' }}>Red:</strong> {popupMessage.split('Red: ')[1]?.split('\n')[0]}
                    </p>
                    <p style={{ margin: '8px 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                      <strong style={{ color: '#28c0f0' }}>Estado:</strong> {popupMessage.split('Estado: ')[1]}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '17px', color: 'rgba(255, 255, 255, 0.9)' }}>{popupMessage}</p>
              )}
            </div>

            {/* Botón de acción */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={handleGoToDashboard} 
                className="popup-button success-button"
                style={{
                  background: 'linear-gradient(90deg, #28c0f0, #1180b3)',
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
                🏠 Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup de Error */}
      {showErrorPopup && (
        <div className="popup-overlay">
          <div className="popup error-popup">
            <div className="popup-icon">❌</div>
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
          isOpen={showEscrowProcessPopup}
          onClose={() => setShowEscrowProcessPopup(false)}
          onComplete={handleProcessComplete}
          taskPrice={task?.price || '0'}
          contributorAddress={selectedProposal.worker_wallet_address}
          contributorName={selectedProposal.applicant_username}
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