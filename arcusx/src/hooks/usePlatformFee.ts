/**
 * Hook para obtener el platform fee del backend
 * Este hook centraliza la obtención del fee y lo cachea para evitar múltiples llamadas
 */

import { useState, useEffect } from 'react';
import { getPlatformFee } from '../services/platformFeeService';
import { normalizePlatformFeeRate } from '../config/platformFee';
import { clientFeePercents, DEFAULT_TOTAL_CLIENT_FEE_PERCENT } from '../utils/escrowFeeDisplay';

/**
 * Hook para obtener el platform fee
 * @returns El platform fee como decimal (ej: 0.03 para 3%) y el porcentaje como string
 */
export function usePlatformFee() {
  const [platformFee, setPlatformFee] = useState<number>(0.037);
  const [platformFeePercent, setPlatformFeePercent] = useState<string>('3.7');
  const [totalClientFeePercent, setTotalClientFeePercent] = useState<string>(
    DEFAULT_TOTAL_CLIENT_FEE_PERCENT,
  );
  const [protocolFeePercent, setProtocolFeePercent] = useState<string>('0.3');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFee = async () => {
      try {
        const fee = normalizePlatformFeeRate(await getPlatformFee());
        const percents = clientFeePercents(fee);
        setPlatformFee(fee);
        setPlatformFeePercent(percents.platformPercent);
        setTotalClientFeePercent(percents.totalPercent);
        setProtocolFeePercent(percents.protocolPercent);
      } catch (error) {
        // Mantener valores por defecto si falla
      } finally {
        setLoading(false);
      }
    };

    loadFee();
    
    // Recargar cada 5 minutos para mantener actualizado
    const interval = setInterval(loadFee, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    platformFee,
    platformFeePercent,
    totalClientFeePercent,
    protocolFeePercent,
    loading,
  };
}

