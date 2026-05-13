/**
 * Hook para obtener el platform fee del backend
 * Este hook centraliza la obtención del fee y lo cachea para evitar múltiples llamadas
 */

import { useState, useEffect } from 'react';
import { getPlatformFee } from '../services/platformFeeService';

/**
 * Hook para obtener el platform fee
 * @returns El platform fee como decimal (ej: 0.03 para 3%) y el porcentaje como string
 */
export function usePlatformFee() {
  const [platformFee, setPlatformFee] = useState<number>(0.03); // 3% por defecto
  const [platformFeePercent, setPlatformFeePercent] = useState<string>('3');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFee = async () => {
      try {
        const fee = await getPlatformFee();
        setPlatformFee(fee);
        setPlatformFeePercent((fee * 100).toFixed(2));
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

  return { platformFee, platformFeePercent, loading };
}

