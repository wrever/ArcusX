/** @deprecated Usar security.ts — re-export por compatibilidad. */
export {
  corsHeadersForRequest as corsHeaders,
  handleSecureOptions as handleOptions,
  secureJsonResponse as jsonResponse,
  secureErrorResponse as errorResponse,
} from './security.ts';
