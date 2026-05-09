/**
 * Hook personalizado para debouncing de valores
 * Útil para búsquedas y filtros que no deben ejecutarse en cada keystroke
 */

import { useState, useEffect } from 'react';

/**
 * Hook que retorna un valor debounced
 * @param value - El valor a debounce
 * @param delay - Tiempo de espera en milisegundos (default: 500ms)
 * @returns El valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    // Crear un timer que actualizará el valor después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Limpiar el timer si el valor cambia antes del delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
