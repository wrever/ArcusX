/** Mensajes al integrador — solo marca ArcusX (motor de escrow interno). */

export function escrowProviderUnavailable(): string {
  return 'Servicio de escrow ArcusX no disponible. Reintenta en unos minutos.';
}

export function escrowPrepareFailed(step: 'deploy' | 'fund' | 'release'): string {
  const labels = {
    deploy: 'despliegue',
    fund: 'fondeo',
    release: 'liberación',
  };
  return `No se pudo preparar el ${labels[step]} del escrow. Reintenta o contacta soporte ArcusX.`;
}
