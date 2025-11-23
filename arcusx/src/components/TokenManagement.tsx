import React, { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaCheck, FaTimes, FaShieldAlt } from 'react-icons/fa';
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
      // Mock data for development - no API calls
      const mockTokens: Token[] = [
        {
          address: '0xA0b86a33E6441b8C4C8C0C4C0C4C0C4C0C4C0C4C',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          allowed: true,
          addedAt: '2024-01-15T10:30:00Z'
        },
        {
          address: '0xB1c97a44F7551b9D5D1D5D1D5D1D5D1D5D1D5D1D5D',
          symbol: 'USDT',
          name: 'Tether USD',
          decimals: 6,
          allowed: true,
          addedAt: '2024-01-16T14:20:00Z'
        },
        {
          address: '0xC2d88b55G8662c0E6E2E6E2E6E2E6E2E6E2E6E2E6E',
          symbol: 'DAI',
          name: 'Dai Stablecoin',
          decimals: 18,
          allowed: false,
          addedAt: '2024-01-17T09:15:00Z'
        }
      ];
      
      setTokens(mockTokens);
    } catch (err) {
      setError('Error al cargar tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToken = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      // Validaciones
      if (!newToken.address || newToken.address.length !== 42) {
        setError('La dirección del token debe ser una dirección Ethereum válida');
        return;
      }
      if (!newToken.symbol || !newToken.name) {
        setError('El símbolo y nombre del token son obligatorios');
        return;
      }

      // Simular agregado - no API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setMessage('Token agregado correctamente (simulado)');
      setNewToken({ address: '', symbol: '', name: '', decimals: 18 });
      setShowAddForm(false);
      await fetchTokens();
      onUpdate();
    } catch (err) {
      setError('Error al agregar token');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleToken = async (_tokenAddress: string, allowed: boolean) => {
    setSaving(true);
    try {
      // Simular toggle - no API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setMessage(`Token ${allowed ? 'habilitado' : 'deshabilitado'} correctamente (simulado)`);
      await fetchTokens();
      onUpdate();
    } catch (err) {
      setError('Error al actualizar token');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveToken = async (_tokenAddress: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este token?')) {
      return;
    }

    setSaving(true);
    try {
      // Simular eliminación - no API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setMessage('Token eliminado correctamente (simulado)');
      await fetchTokens();
      onUpdate();
    } catch (err) {
      setError('Error al eliminar token');
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
        <p>Administra los tokens ERC-20 permitidos en la plataforma</p>
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
                placeholder="0x..."
                maxLength={42}
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
              Cancelar
            </button>
            <button 
              onClick={handleAddToken}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Agregando...' : 'Agregar Token'}
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
