/**
 * Router escrow: Trustless Work (default) vs WASM ArcusX (prep, sin lanzar).
 *
 * Variables:
 *   ESCROW_BACKEND=tw | native_wasm  (default: tw)
 *   ESCROW_NATIVE_ENABLED=true       (Edge, opcional)
 *   ARCUSX_ESCROW_WASM_HASH          (requerido si native_wasm)
 *   VITE_ESCROW_NATIVE_ENABLED         (frontend, false en prod)
 */

export type EscrowBackendId = 'tw' | 'native_wasm';

export interface EscrowBackendStatus {
  backend: EscrowBackendId;
  /** true si el router elegiría native_wasm en una petición */
  nativeWasmReady: boolean;
  reasons: string[];
}

function envTruthy(key: string): boolean {
  const v = (Deno.env.get(key) ?? '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** Backend solicitado por operaciones (no implica que esté listo). */
export function getRequestedEscrowBackend(): EscrowBackendId {
  const raw = (Deno.env.get('ESCROW_BACKEND') ?? 'tw').trim().toLowerCase();
  if (raw === 'native_wasm' || raw === 'native' || raw === 'wasm') {
    return 'native_wasm';
  }
  return 'tw';
}

/** ¿Puede usarse WASM ArcusX en Edge? Requiere los tres switches. */
export function isNativeWasmConfigured(): boolean {
  if (getRequestedEscrowBackend() !== 'native_wasm') return false;
  const wasm = (Deno.env.get('ARCUSX_ESCROW_WASM_HASH') ?? '').trim();
  if (!wasm || wasm.length < 32) return false;
  return envTruthy('ESCROW_NATIVE_ENABLED');
}

export function getEscrowBackendStatus(): EscrowBackendStatus {
  const requested = getRequestedEscrowBackend();
  const reasons: string[] = [];
  const wasm = (Deno.env.get('ARCUSX_ESCROW_WASM_HASH') ?? '').trim();
  const flag = envTruthy('ESCROW_NATIVE_ENABLED');

  if (requested === 'tw') {
    reasons.push('ESCROW_BACKEND=tw (default producción)');
    return { backend: 'tw', nativeWasmReady: false, reasons };
  }

  if (!wasm) reasons.push('falta ARCUSX_ESCROW_WASM_HASH');
  if (!flag) reasons.push('ESCROW_NATIVE_ENABLED no está en true');

  const ready = wasm.length >= 32 && flag;
  return {
    backend: ready ? 'native_wasm' : 'tw',
    nativeWasmReady: ready,
    reasons: ready
      ? ['native_wasm listo (solo testnet hasta aviso de switch)']
      : ['native_wasm solicitado pero inactivo:', ...reasons],
  };
}

/** Backend efectivo para preparar XDR. Nunca lanza native sin config completa. */
export function getEffectiveEscrowBackend(): EscrowBackendId {
  const status = getEscrowBackendStatus();
  if (getRequestedEscrowBackend() === 'native_wasm' && !status.nativeWasmReady) {
    throw new Error(
      `ESCROW_BACKEND=native_wasm pero no está listo: ${status.reasons.join('; ')}`,
    );
  }
  return status.backend;
}

export function assertEscrowBackendForNative(): void {
  if (getEffectiveEscrowBackend() !== 'native_wasm') {
    throw new Error(
      'Operación WASM solicitada pero ESCROW_BACKEND efectivo es tw — revisa secretos',
    );
  }
}
