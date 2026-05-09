/**
 * Logger que solo escribe en consola cuando import.meta.env.DEV es true.
 * Usar en lugar de console.log/console.warn para no ensuciar la consola en producción.
 */
export const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

export const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};
