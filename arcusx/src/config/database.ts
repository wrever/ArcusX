import { supabaseUrl } from './supabase';

/**
 * @deprecated Usar `arcusxApiUrl('action')` para llamadas marketplace.
 * Se mantiene por compatibilidad con código legacy que importe API_URL.
 */
export const API_URL = supabaseUrl
  ? `${supabaseUrl}/functions/v1/arcusx-api`
  : '';
