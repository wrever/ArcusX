/**
 * Servicio de cache centralizado para API requests
 * Implementa request deduplication y caching agresivo
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  /**
   * Obtener datos del cache o hacer request
   * @param key - Clave única para el cache
   * @param fetcher - Función que hace el request
   * @param ttl - Tiempo de vida del cache en milisegundos (default: 60 segundos)
   * @returns Promise con los datos
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl: number = 60000
  ): Promise<T> {
    const now = Date.now();
    
    // Si hay un request pendiente para esta clave, esperar a que termine
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }
    
    // Si hay cache válido, retornar
    const cached = this.cache.get(key);
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }
    
    // Hacer request y cachear
    const promise = fetcher()
      .then(data => {
        this.cache.set(key, { data, timestamp: Date.now() });
        this.pendingRequests.delete(key);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  /**
   * Invalidar una entrada del cache
   * @param key - Clave a invalidar
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Invalidar todas las entradas que coincidan con un patrón
   * @param pattern - Patrón regex o string
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Limpiar todo el cache
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
  
  /**
   * Obtener tamaño del cache
   */
  getSize(): number {
    return this.cache.size;
  }
}

// Instancia singleton
export const apiCache = new ApiCache();

// Helper para generar claves de cache consistentes
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}
