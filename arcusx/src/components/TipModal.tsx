import { useState } from 'react';
import { sendTip } from '../services/tipService';
import { Networks } from '@stellar/stellar-sdk';
import '../css/TipModal.css';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerAddress: string;
  workerUsername: string;
  clientAddress: string;
  kit: any;
  onSuccess: (txHash: string, amount: number) => void;
}

const TipModal = ({
  isOpen,
  onClose,
  workerAddress,
  workerUsername,
  clientAddress,
  kit,
  onSuccess
}: TipModalProps) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Montos predefinidos
  const quickAmounts = [1, 5, 10, 25, 50];

  const handleSendTip = async () => {
    setError(null);
    
    const tipAmount = parseFloat(amount);
    
    // Validaciones
    if (!amount || isNaN(tipAmount) || tipAmount <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    if (tipAmount < 0.0000001) {
      setError('El monto mínimo es 0.0000001 XLM');
      return;
    }

    if (!kit) {
      setError('Wallet no conectada');
      return;
    }

    setLoading(true);

    try {
      const result = await sendTip({
        fromAddress: clientAddress,
        toAddress: workerAddress,
        amount: tipAmount,
        kit,
        networkPassphrase: Networks.TESTNET
      });

      if (result.success && result.txHash) {
        onSuccess(result.txHash, tipAmount);
        setAmount('');
        onClose();
      } else {
        setError(result.error || 'Error al enviar el tip');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al enviar el tip');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tip-modal-overlay" onClick={onClose}>
      <div className="tip-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="tip-modal-header">
          <h2>💝 Enviar Gratificación</h2>
          <button className="tip-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="tip-modal-body">
          <p className="tip-modal-description">
            Recompensa a <strong>{workerUsername}</strong> por su excelente trabajo
          </p>

          <div className="tip-amount-section">
            <label htmlFor="tip-amount">Monto en XLM</label>
            <div className="tip-input-wrapper">
              <input
                id="tip-amount"
                type="number"
                step="0.0000001"
                min="0.0000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                disabled={loading}
                className="tip-amount-input"
              />
            </div>

            {/* Montos rápidos */}
            <div className="quick-amounts">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount(quickAmount.toString())}
                  disabled={loading}
                >
                  {quickAmount} XLM
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="tip-error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="tip-info-box">
            <p>📋 Esta es una transacción directa en Stellar</p>
            <p>⚡ Se procesará en 3-5 segundos</p>
            <p>🔒 Sin comisiones adicionales</p>
          </div>
        </div>

        <div className="tip-modal-footer">
          <button
            className="tip-cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="tip-send-btn"
            onClick={handleSendTip}
            disabled={loading || !amount}
          >
            {loading ? 'Enviando...' : '💝 Enviar Gratificación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TipModal;

