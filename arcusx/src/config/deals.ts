/** ArcusX Deals — desactivar con VITE_DEALS_ENABLED=false */
export const dealsEnabled =
  String(import.meta.env.VITE_DEALS_ENABLED ?? 'true').toLowerCase() !== 'false';
