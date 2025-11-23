import React, { useState, useEffect } from 'react';
import { FaCoins, FaSave, FaUndo, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import '../css/FeeManagement.css';

interface FeeConfig {
  platformFeeBps: number;
  referralFeeBps: number;
  treasury: string;
}

interface FeeManagementProps {
  onUpdate: () => void;
}

const FeeManagement: React.FC<FeeManagementProps> = ({ onUpdate }) => {
  const [config, setConfig] = useState<FeeConfig>({
    platformFeeBps: 500, // 5%
    referralFeeBps: 100, // 1%
    treasury: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCurrentConfig();
  }, []);

  const fetchCurrentConfig = async () => {
    setLoading(true);
    try {
      // Mock data for development - no API calls
      const mockConfig: FeeConfig = {
        platformFeeBps: 500, // 5%
        referralFeeBps: 100, // 1%
        treasury: '0x1234567890123456789012345678901234567890'
      };
      
      setConfig(mockConfig);
    } catch (err) {
      setError('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      // Validaciones
      if (config.platformFeeBps > 1000) {
        setError('El fee de plataforma no puede ser mayor al 10%');
        return;
      }
      if (config.referralFeeBps > 500) {
        setError('El fee de referral no puede ser mayor al 5%');
        return;
      }
      if (!config.treasury || config.treasury.length !== 42) {
        setError('La dirección del treasury debe ser una dirección Ethereum válida');
        return;
      }

      // Simular guardado - no API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      setMessage('Configuración de fees actualizada correctamente (simulado)');
      onUpdate();
    } catch (err) {
      setError('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      platformFeeBps: 500,
      referralFeeBps: 100,
      treasury: ''
    });
    setMessage('');
    setError('');
  };

  const handleInputChange = (field: keyof FeeConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setMessage('');
    setError('');
  };

  if (loading) {
    return (
      <div className="fee-management-loading">
        <div className="loading-spinner"></div>
        <p>Cargando configuración de fees...</p>
      </div>
    );
  }

  return (
    <div className="fee-management">
      <div className="fee-header">
        <h2>Gestión de Fees</h2>
        <p>Configura las comisiones de la plataforma y el treasury</p>
      </div>

      {/* Fee Configuration Form */}
      <div className="fee-form">
        <div className="form-section">
          <h3>Configuración de Comisiones</h3>
          
          <div className="form-group">
            <label htmlFor="platformFee">
              <FaCoins />
              Fee de Plataforma (Basis Points)
            </label>
            <div className="input-group">
              <input
                type="number"
                id="platformFee"
                value={config.platformFeeBps}
                onChange={(e) => handleInputChange('platformFeeBps', parseInt(e.target.value) || 0)}
                min="0"
                max="1000"
                placeholder="500"
              />
              <span className="input-suffix">bps</span>
            </div>
            <div className="input-info">
              <FaInfoCircle />
              <span>Máximo: 1000 bps (10%). Actual: {(config.platformFeeBps / 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="referralFee">
              <FaCoins />
              Fee de Referral (Basis Points)
            </label>
            <div className="input-group">
              <input
                type="number"
                id="referralFee"
                value={config.referralFeeBps}
                onChange={(e) => handleInputChange('referralFeeBps', parseInt(e.target.value) || 0)}
                min="0"
                max="500"
                placeholder="100"
              />
              <span className="input-suffix">bps</span>
            </div>
            <div className="input-info">
              <FaInfoCircle />
              <span>Máximo: 500 bps (5%). Actual: {(config.referralFeeBps / 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="treasury">
              <FaCoins />
              Dirección del Treasury
            </label>
            <input
              type="text"
              id="treasury"
              value={config.treasury}
              onChange={(e) => handleInputChange('treasury', e.target.value)}
              placeholder="0x..."
              maxLength={42}
            />
            <div className="input-info">
              <FaInfoCircle />
              <span>Dirección Ethereum donde se envían las comisiones de plataforma</span>
            </div>
          </div>
        </div>

        {/* Fee Preview */}
        <div className="fee-preview">
          <h3>Vista Previa</h3>
          <div className="preview-cards">
            <div className="preview-card">
              <h4>Fee de Plataforma</h4>
              <p className="preview-value">{(config.platformFeeBps / 100).toFixed(1)}%</p>
              <p className="preview-description">Se cobra sobre cada milestone liberado</p>
            </div>
            <div className="preview-card">
              <h4>Fee de Referral</h4>
              <p className="preview-value">{(config.referralFeeBps / 100).toFixed(1)}%</p>
              <p className="preview-description">Se cobra si hay un referrer configurado</p>
            </div>
            <div className="preview-card">
              <h4>Treasury</h4>
              <p className="preview-value">{config.treasury ? `${config.treasury.slice(0, 6)}...${config.treasury.slice(-4)}` : 'No configurado'}</p>
              <p className="preview-description">Recibe las comisiones de plataforma</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button 
            onClick={handleReset}
            className="btn-secondary"
            disabled={saving}
          >
            <FaUndo />
            <span>Restablecer</span>
          </button>
          <button 
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            <FaSave />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="success-message">
            <FaCheckCircle />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="error-message">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeManagement;
