import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaCheck, FaTimes, FaShieldAlt } from 'react-icons/fa';
import { useI18n } from '../i18n/I18nProvider';
import { getUsdcIssuer } from '../config/usdc';
import '../css/TokenManagement.css';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  allowed: boolean;
  addedAt: string;
}

interface TokenManagementProps {
  onUpdate: () => void;
}

const TokenManagement: React.FC<TokenManagementProps> = ({ onUpdate }) => {
  const { t } = useI18n();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newToken, setNewToken] = useState({
    address: '',
    symbol: '',
    name: '',
    decimals: 18
  });

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      // TODO: Implementar endpoint en backend para obtener tokens
      // Por ahora usar datos mock adaptados a Stellar
      const mockTokens: Token[] = [
        {
          address: getUsdcIssuer(),
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 7,
          allowed: true,
          addedAt: new Date().toISOString()
        }
      ];
      
      setTokens(mockTokens);
    } catch (err) {
      setError(t('token.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToken = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      // Validaciones para Stellar
      if (!newToken.address || !newToken.address.startsWith('G') || newToken.address.length !== 56) {
        setError(t('token.addressInvalid'));
        return;
      }
      if (!newToken.symbol || !newToken.name) {
        setError(t('token.symbolRequired'));
        return;
      }

      // Simular agregado - no API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setMessage(t('token.addSuccess'));
      setNewToken({ address: '', symbol: '', name: '', decimals: 18 });
      setShowAddForm(false);
      await fetchTokens();
      onUpdate();
    } catch (err) {
      setError(t('token.addError'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleToken = async (_tokenAddress: string, allowed: boolean) => {
    setSaving(true);
    try {
      // Simular toggle - no API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setMessage(allowed ? t('token.enabledSuccess') : t('token.disabledSuccess'));
      await fetchTokens();
      onUpdate();
    } catch (err) {
      setError(t('token.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveToken = async (_tokenAddress: string) => {
    if (!window.confirm(t('token.delete.confirm'))) {
      return;
    }

    setSaving(true);
    try {
      // Simular eliminación - no API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setMessage(t('token.removedSuccess'));
      await fetchTokens();
      onUpdate();
    } catch (err) {
      setError(t('token.error.delete'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="token-management-loading">
        <div className="loading-spinner"></div>
        <p>Cargando tokens...</p>
      </div>
    );
  }

  return (
    <div className="token-management">
      <div className="token-header">
        <h2>Gestión de Tokens</h2>
        <p>Administra los tokens Stellar permitidos en la plataforma</p>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-token-button"
        >
          <FaPlus />
          <span>Agregar Token</span>
        </button>
      </div>

      {/* Add Token Form */}
      {showAddForm && (
        <div className="add-token-form">
          <h3>Agregar Nuevo Token</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tokenAddress">Dirección del Token</label>
              <input
                type="text"
                id="tokenAddress"
                value={newToken.address}
                onChange={(e) => setNewToken(prev => ({ ...prev, address: e.target.value }))}
              placeholder="G..."
              maxLength={56}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tokenSymbol">Símbolo</label>
              <input
                type="text"
                id="tokenSymbol"
                value={newToken.symbol}
                onChange={(e) => setNewToken(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                placeholder="USDC"
                maxLength={10}
              />
            </div>
            <div className="form-group">
              <label htmlFor="tokenName">Nombre</label>
              <input
                type="text"
                id="tokenName"
                value={newToken.name}
                onChange={(e) => setNewToken(prev => ({ ...prev, name: e.target.value }))}
                placeholder="USD Coin"
              />
            </div>
            <div className="form-group">
              <label htmlFor="tokenDecimals">Decimales</label>
              <input
                type="number"
                id="tokenDecimals"
                value={newToken.decimals}
                onChange={(e) => setNewToken(prev => ({ ...prev, decimals: parseInt(e.target.value) || 18 }))}
                min="0"
                max="18"
              />
            </div>
          </div>
          <div className="form-actions">
            <button 
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button 
              onClick={handleAddToken}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? t('token.adding') : t('token.addButton')}
            </button>
          </div>
        </div>
      )}

      {/* Tokens List */}
      <div className="tokens-list">
        <h3>Tokens Configurados ({tokens.length})</h3>
        {tokens.length === 0 ? (
          <div className="no-tokens">
            <FaShieldAlt className="no-tokens-icon" />
            <p>No hay tokens configurados</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
            >
              <FaPlus />
              <span>Agregar Primer Token</span>
            </button>
          </div>
        ) : (
          <div className="tokens-grid">
            {tokens.map((token) => (
              <div key={token.address} className="token-card">
                <div className="token-info">
                  <div className="token-symbol">
                    <h4>{token.symbol}</h4>
                    <span className="token-name">{token.name}</span>
                  </div>
                  <div className="token-address">
                    <span>{token.address.slice(0, 6)}...{token.address.slice(-4)}</span>
                  </div>
                  <div className="token-decimals">
                    <span>{token.decimals} decimales</span>
                  </div>
                </div>
                <div className="token-status">
                  <div className={`status-badge ${token.allowed ? 'allowed' : 'blocked'}`}>
                    {token.allowed ? (
                      <>
                        <FaCheck />
                        <span>Permitido</span>
                      </>
                    ) : (
                      <>
                        <FaTimes />
                        <span>Bloqueado</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="token-actions">
                  <button
                    onClick={() => handleToggleToken(token.address, !token.allowed)}
                    className={`toggle-button ${token.allowed ? 'block' : 'allow'}`}
                    disabled={saving}
                  >
                    {token.allowed ? 'Bloquear' : 'Permitir'}
                  </button>
                  <button
                    onClick={() => handleRemoveToken(token.address)}
                    className="remove-button"
                    disabled={saving}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className="success-message">
          <FaCheck />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="error-message">
          <FaTimes />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default TokenManagement;
