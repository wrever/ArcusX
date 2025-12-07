// Para desarrollo: usar HTTP si hay problemas con SSL
// Para producción: usar HTTPS
// Usar variables de entorno si están disponibles, sino usar valores por defecto
export const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV 
  ? 'http://arcusx.pro/api'  // HTTP para desarrollo local
    : 'https://arcusx.pro/api' // HTTPS para producción
); 