/**
 * Utilidades para optimización de imágenes
 * Soporte para formatos modernos (WebP, AVIF) y responsive images
 */

/**
 * Obtener URL optimizada de imagen (WebP/AVIF)
 * Nota: Requiere conversión en servidor o CDN
 * @param url - URL original de la imagen
 * @param format - Formato deseado ('webp' | 'avif')
 * @returns URL con formato optimizado
 */
export function getOptimizedImageUrl(url: string, format: 'webp' | 'avif' = 'webp'): string {
  if (!url) return url;
  
  // Si ya tiene el formato, retornar tal cual
  if (url.endsWith(`.${format}`)) return url;
  
  // Reemplazar extensión por formato optimizado
  return url.replace(/\.(jpg|jpeg|png|gif)$/i, `.${format}`);
}

/**
 * Generar srcSet para imágenes responsive
 * @param baseUrl - URL base de la imagen
 * @param widths - Array de anchos en píxeles
 * @returns String srcSet
 */
export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths
    .map(width => `${baseUrl}?w=${width} ${width}w`)
    .join(', ');
}

/**
 * Verificar si el navegador soporta WebP
 * @returns Promise<boolean>
 */
export async function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Verificar si el navegador soporta AVIF
 * @returns Promise<boolean>
 */
export async function supportsAVIF(): Promise<boolean> {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
}

/**
 * Obtener mejor formato soportado por el navegador
 * @returns Promise<'avif' | 'webp' | 'original'>
 */
export async function getBestImageFormat(): Promise<'avif' | 'webp' | 'original'> {
  if (await supportsAVIF()) return 'avif';
  if (await supportsWebP()) return 'webp';
  return 'original';
}
