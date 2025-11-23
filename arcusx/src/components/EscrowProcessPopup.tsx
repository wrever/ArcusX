import React, { useState } from 'react';
import { FaWallet, FaFileContract, FaCoins, FaCheckCircle, FaSpinner, FaTimes } from 'react-icons/fa';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  buttonText?: string;
  onAction?: () => void;
}

interface EscrowProcessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  taskPrice: string;
  contributorAddress: string;
  contributorName: string;
  onCreateEscrow: () => Promise<{ success: boolean; escrowId?: string; error?: string }>;
  onFundEscrow: (escrowId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  onSelectWorker: (escrowId: string, txHash: string) => Promise<{ success: boolean; error?: string }>;
  onConnectWallet: () => Promise<{ success: boolean; error?: string }>;
}

const EscrowProcessPopup: React.FC<EscrowProcessPopupProps> = ({
  isOpen,
  onClose,
  onComplete,
  taskPrice,
  contributorAddress,
  contributorName,
  onCreateEscrow,
  onFundEscrow,
  onSelectWorker,
  onConnectWallet
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ProcessStep[]>([
    {
      id: 'connect',
      title: 'Conectar Wallet',
      description: 'Conecta tu wallet Freighter para continuar',
      icon: <FaWallet />,
      status: 'pending',
      buttonText: 'Conectar Wallet'
    },
    {
      id: 'create',
      title: 'Crear Contrato',
      description: 'Crea la cuenta escrow única en Stellar (costo: 2.5 XLM + fees)',
      icon: <FaFileContract />,
      status: 'pending',
      buttonText: 'Crear y Firmar Contrato'
    },
    {
      id: 'fund',
      title: 'Enviar Dinero',
      description: `Envía ${taskPrice} XLM al contrato escrow`,
      icon: <FaCoins />,
      status: 'pending',
      buttonText: 'Enviar Dinero'
    },
    {
      id: 'complete',
      title: 'Proceso Completado',
      description: 'El trabajador ha sido seleccionado exitosamente',
      icon: <FaCheckCircle />,
      status: 'pending',
      buttonText: 'Ir a Supervisar'
    }
  ]);

  const [escrowId, setEscrowId] = useState<string | null>(null);

  const updateStepStatus = (stepIndex: number, status: ProcessStep['status']) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    ));
  };

  const handleStepAction = async (stepIndex: number) => {
    const step = steps[stepIndex];
    
    if (step.id === 'connect') {
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onConnectWallet();
        if (result.success) {
          updateStepStatus(stepIndex, 'completed');
          setCurrentStep(1);
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'create') {
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onCreateEscrow();
        if (result.success && result.escrowId) {
          setEscrowId(result.escrowId);
          updateStepStatus(stepIndex, 'completed');
          setCurrentStep(2);
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'fund') {
      if (!escrowId) return;
      
      updateStepStatus(stepIndex, 'in_progress');
      try {
        const result = await onFundEscrow(escrowId);
        if (result.success && result.txHash) {
          updateStepStatus(stepIndex, 'completed');
          
          // Inmediatamente ejecutar la selección del trabajador en la base de datos
          updateStepStatus(3, 'in_progress'); // Marcar como en progreso
          
          try {
            const selectResult = await onSelectWorker(escrowId, result.txHash);
            if (selectResult.success) {
              updateStepStatus(3, 'completed');
              setCurrentStep(3); // Avanzar al último paso (índice 3, que es el paso 4)
            } else {
              updateStepStatus(3, 'error');
            }
          } catch (selectError) {
            updateStepStatus(3, 'error');
          }
        } else {
          updateStepStatus(stepIndex, 'error');
        }
      } catch (error) {
        updateStepStatus(stepIndex, 'error');
      }
    }
    
    else if (step.id === 'complete') {
      // El trabajador ya fue seleccionado automáticamente en el paso anterior
      // Solo ejecutar la función de completar el proceso
      updateStepStatus(stepIndex, 'completed');
      
      // Cerrar el popup de proceso y mostrar el popup de éxito
      setTimeout(() => {
        onComplete();
        onClose();
      }, 500);
    }
  };

  const getStepIcon = (step: ProcessStep) => {
    if (step.status === 'in_progress') {
      return <FaSpinner className="animate-spin" />;
    }
    if (step.status === 'completed') {
      return <FaCheckCircle className="text-green-500" />;
    }
    if (step.status === 'error') {
      return <FaTimes className="text-red-500" />;
    }
    return step.icon;
  };


  if (!isOpen) return null;

  return (
    <div className="escrow-process-popup">
      <div className="escrow-process-content">
        {/* Header */}
        <div className="escrow-process-header">
          <h2 className="escrow-process-title">
            Proceso de Selección de Trabajador
          </h2>
          <button
            onClick={onClose}
            className="escrow-process-close"
          >
            <FaTimes />
          </button>
        </div>

        {/* Task Info */}
        <div className="escrow-task-info">
          <h3>Detalles de la Tarea</h3>
          <div className="escrow-task-details">
            <p><strong>Trabajador:</strong> {contributorName}</p>
            <p><strong>Dirección:</strong> {contributorAddress.slice(0, 6)}...{contributorAddress.slice(-4)}</p>
            <p><strong>Monto de la tarea:</strong> {taskPrice} XLM</p>
            <p style={{ color: '#ffa500', marginTop: '0.5rem' }}>
              <strong>⚠️ Costo adicional:</strong> 2.5 XLM para crear la cuenta escrow + fees de transacción
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="escrow-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`escrow-step ${step.status}`}
            >
              <div className="escrow-step-content">
                <div className="escrow-step-info">
                  <div className="escrow-step-icon">
                    {getStepIcon(step)}
                  </div>
                  <div className="escrow-step-text">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
                
                <div className="escrow-step-action">
                  {step.buttonText && step.status === 'pending' && index === currentStep && (
                    <button
                      onClick={() => handleStepAction(index)}
                      className="escrow-step-button"
                    >
                      {step.buttonText}
                    </button>
                  )}
                  
                  {step.status === 'in_progress' && (
                    <div className="escrow-step-status">
                      Procesando...
                    </div>
                  )}
                  
                  {step.status === 'completed' && (
                    <div className="escrow-step-status">
                      ✓ Completado
                    </div>
                  )}
                  
                  {step.status === 'error' && (
                    <button
                      onClick={() => handleStepAction(index)}
                      className="escrow-step-button error"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="escrow-progress">
          <div className="escrow-progress-header">
            <span>Progreso</span>
            <span>
              {(() => {
                // Calcular pasos completados basado en el estado real, no en currentStep
                const completedSteps = steps.filter(step => step.status === 'completed').length;
                // Si todos están completados, mostrar el total
                const totalSteps = steps.length;
                const displayStep = completedSteps > 0 ? completedSteps : Math.min(currentStep + 1, totalSteps);
                return `${displayStep} de ${totalSteps}`;
              })()}
            </span>
          </div>
          <div className="escrow-progress-bar">
            <div
              className="escrow-progress-fill"
              style={{ 
                width: `${(() => {
                  // Calcular porcentaje basado en pasos completados
                  const completedSteps = steps.filter(step => step.status === 'completed').length;
                  const totalSteps = steps.length;
                  return completedSteps > 0 
                    ? (completedSteps / totalSteps) * 100 
                    : Math.min(((currentStep + 1) / totalSteps) * 100, 100);
                })()}%` 
              }}
            />
          </div>
        </div>

        {/* Info */}
        <div className="escrow-process-note">
          <p>💡 <strong>Nota:</strong> Este proceso requiere 2 transacciones:</p>
          <p>1. Crear el contrato escrow (costo: 2.5 XLM + fees)</p>
          <p>2. Enviar el dinero al contrato ({taskPrice} XLM)</p>
          <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
            💰 Total a pagar: {(parseFloat(taskPrice) + 2.5).toFixed(7)} XLM
          </p>
        </div>
      </div>
    </div>
  );
};

export default EscrowProcessPopup;
