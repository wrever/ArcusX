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
    platformFeeBps: 270, // 2.7% ArcusX (+ 0.3% TW = 3% total)
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
      // Obtener configuración real del backend
      const { getAdminConfig } = await import('../services/adminService');
      const configs = await getAdminConfig();
      
      const platformFeeConfig = configs.find(c => c.config_key === 'platform_fee');
      const referralFeeConfig = configs.find(c => c.config_key === 'referral_fee');
      const treasuryConfig = configs.find(c => c.config_key === 'treasury_address');
      
      const platformFeeValue = platformFeeConfig?.config_value;
      const platformFeeBps = typeof platformFeeValue === 'number' 
        ? platformFeeValue * 10000 
        : (typeof platformFeeValue === 'string' ? parseFloat(platformFeeValue) * 10000 : 270);
      
      const referralFeeValue = referralFeeConfig?.config_value;
      const referralFeeBps = typeof referralFeeValue === 'number' 
        ? referralFeeValue * 10000 
        : (typeof referralFeeValue === 'string' ? parseFloat(referralFeeValue) * 10000 : 0);
      
      const mockConfig: FeeConfig = {
        platformFeeBps: platformFeeBps,
        referralFeeBps: referralFeeBps,
        treasury: treasuryConfig?.config_value || ''
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
      // Validar dirección Stellar (debe empezar con G y tener 56 caracteres)
      if (!config.treasury || !config.treasury.startsWith('G') || config.treasury.length !== 56) {
        setError('La dirección del treasury debe ser una dirección Stellar válida (empieza con G y tiene 56 caracteres)');
        return;
      }

      // Guardar en backend
      const { updateAdminConfig } = await import('../services/adminService');
      await updateAdminConfig('platform_fee', config.platformFeeBps / 10000); // Convertir bps a decimal
      await updateAdminConfig('referral_fee', config.referralFeeBps / 10000); // Convertir bps a decimal
      await updateAdminConfig('treasury_address', config.treasury);
      
      // Limpiar cache del platform fee para que se recargue en toda la aplicación
      const { clearPlatformFeeCache } = await import('../services/platformFeeService');
      clearPlatformFeeCache();
      
      setMessage('Configuración de fees actualizada correctamente. El nuevo fee se aplicará en toda la plataforma.');
      onUpdate();
    } catch (err) {
      setError('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      platformFeeBps: 270,
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
              <span>
                ArcusX: {(config.platformFeeBps / 100).toFixed(1)}% + costo de operación 0.3% ={' '}
                {((config.platformFeeBps + 30) / 100).toFixed(1)}% total al cliente. Máx. 1000 bps (10% solo ArcusX).
              </span>
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
              placeholder="G..."
              maxLength={56}
            />
            <div className="input-info">
              <FaInfoCircle />
              <span>Dirección Stellar (G...) donde se envían las comisiones de plataforma</span>
            </div>
          </div>
        </div>

        {/* Fee Preview */}
        <div className="fee-preview">
          <h3>Vista Previa</h3>
          <div className="preview-cards">
            <div className="preview-card">
              <h4>Comisión total cliente</h4>
              <p className="preview-value">{((config.platformFeeBps + 30) / 100).toFixed(1)}%</p>
              <p className="preview-description">
                ArcusX {(config.platformFeeBps / 100).toFixed(1)}% + TW 0.3% al liberar
              </p>
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
