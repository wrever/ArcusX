import type { PollarClient, AuthState } from '@pollar/core';
import { POLLAR_WALLET_ID, isPollarEnabled } from '../config/pollar';

type PollarClientGetter = () => PollarClient;

let getClientFn: PollarClientGetter | null = null;

export type PollarLoginProvider = 'google' | 'github' | 'email';

export function registerPollarBridge(opts: { getClient: PollarClientGetter }): void {
  getClientFn = opts.getClient;
}

export function unregisterPollarBridge(): void {
  getClientFn = null;
}

export function isPollarWalletId(walletId: string | null | undefined): boolean {
  return walletId === POLLAR_WALLET_ID;
}

export function getStoredWalletId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('stellar_wallet');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { walletId?: string };
    return typeof parsed.walletId === 'string' ? parsed.walletId : null;
  } catch {
    return null;
  }
}

export function getPollarClientOrNull(): PollarClient | null {
  try {
    return getClientFn ? getClientFn() : null;
  } catch {
    return null;
  }
}

function requireClient(): PollarClient {
  if (!getClientFn) {
    throw new Error('Pollar no está inicializado. Recargá la página e intentá de nuevo.');
  }
  return getClientFn();
}

function resolveClassicAddress(client: PollarClient): string | null {
  const primary = client.getWallet()?.address?.trim() ?? '';
  if (primary.startsWith('G')) return primary;
  if (primary.startsWith('C')) {
    throw new Error(
      'Las smart wallets Pollar (C…) no son compatibles con escrow. Usá Google/email (G…) o Freighter/xBull.',
    );
  }

  try {
    const wallets = client.getWallets?.() ?? [];
    for (const w of wallets) {
      const addr = w.address?.trim() ?? '';
      if (addr.startsWith('G')) return addr;
      if (addr.startsWith('C')) {
        throw new Error(
          'Las smart wallets Pollar (C…) no son compatibles con escrow. Usá Google/email (G…) o Freighter/xBull.',
        );
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('smart wallets')) throw err;
  }

  return null;
}

async function waitForClassicAddress(client: PollarClient, timeoutMs = 20_000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const address = resolveClassicAddress(client);
    if (address) return address;
    await new Promise((r) => setTimeout(r, 250));
  }
  const address = resolveClassicAddress(client);
  if (!address) throw new Error('Pollar no devolvió una dirección de wallet G…');
  return address;
}

function authErrorMessage(state: AuthState): string {
  if (state.step !== 'error') return 'Error al autenticar con Pollar.';
  const raw = typeof state.message === 'string' ? state.message.trim() : '';
  const code = 'errorCode' in state ? String(state.errorCode ?? '') : '';

  if (
    code.includes('SESSION_CREATE') ||
    /failed to create session/i.test(raw) ||
    /origin not allowed/i.test(raw)
  ) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    return `Pollar rechazó el origen (${origin}). En dashboard.pollar.xyz → Build → Domains agregá exactamente: ${origin}`;
  }

  if (raw) return raw;
  return 'Error al autenticar con Pollar.';
}

function waitUntilAuthenticated(client: PollarClient, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (client.getAuthState().step === 'authenticated') {
      resolve();
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('Tiempo de espera agotado al conectar Pollar.')));
    }, timeoutMs);

    const unsub = client.onAuthStateChange((state) => {
      if (state.step === 'authenticated') {
        finish(() => resolve());
        return;
      }
      if (state.step === 'error') {
        finish(() => reject(new Error(authErrorMessage(state))));
      }
    });
  });
}

/** Si ya hay sesión Pollar activa, reutiliza la G… */
export async function reusePollarSessionIfAny(): Promise<{ address: string } | null> {
  if (!isPollarEnabled() || !getClientFn) return null;
  const client = getClientFn();
  if (client.getAuthState().step !== 'authenticated') return null;
  return { address: await waitForClassicAddress(client) };
}

/**
 * Login Pollar headless (sin su modal). Usar desde el popup ArcusX.
 * - google/github: abre OAuth
 * - email: envía OTP; luego llamar verifyPollarEmailCode()
 */
export async function startPollarLogin(
  provider: PollarLoginProvider,
  email?: string,
  timeoutMs = 180_000,
): Promise<{ address: string } | { needsEmailCode: true; email: string }> {
  if (!isPollarEnabled()) {
    throw new Error('Pollar no está configurado (falta VITE_POLLAR_PUBLISHABLE_KEY).');
  }

  const client = requireClient();

  if (client.getAuthState().step === 'authenticated') {
    return { address: await waitForClassicAddress(client) };
  }

  if (provider === 'email') {
    const trimmed = email?.trim() ?? '';
    if (!trimmed || !trimmed.includes('@')) {
      throw new Error('Ingresá un email válido.');
    }
    client.login({ provider: 'email', email: trimmed });
    await waitForAuthStep(client, 'entering_code', timeoutMs);
    return { needsEmailCode: true, email: trimmed };
  }

  client.login({ provider });
  await waitUntilAuthenticated(client, timeoutMs);
  return { address: await waitForClassicAddress(client) };
}

export async function verifyPollarEmailCode(
  code: string,
  timeoutMs = 120_000,
): Promise<{ address: string }> {
  const client = requireClient();
  const trimmed = code.trim();
  if (!trimmed) throw new Error('Ingresá el código OTP.');

  client.verifyEmailCode(trimmed);
  await waitUntilAuthenticated(client, timeoutMs);
  return { address: await waitForClassicAddress(client) };
}

export function cancelPollarLogin(): void {
  try {
    getClientFn?.().cancelLogin();
  } catch {
    /* ignore */
  }
}

function waitForAuthStep(
  client: PollarClient,
  step: AuthState['step'],
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (client.getAuthState().step === step) {
      resolve();
      return;
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsub();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('No llegó el código OTP. Revisá el email o el dominio en Pollar Dashboard.')));
    }, timeoutMs);

    const unsub = client.onAuthStateChange((state) => {
      if (state.step === step) {
        finish(() => resolve());
        return;
      }
      if (state.step === 'authenticated') {
        finish(() => resolve());
        return;
      }
      if (state.step === 'error') {
        finish(() => reject(new Error(authErrorMessage(state))));
      }
    });
  });
}

export async function disconnectPollarSession(): Promise<void> {
  try {
    if (!getClientFn) return;
    const client = getClientFn();
    if (client.getAuthState().step === 'authenticated') {
      client.logout();
    }
  } catch {
    /* ignore */
  }
}

/** Firma XDR unsigned (TW) con la wallet custodial Pollar; no envía a Horizon. */
export async function signWithPollar(unsignedXdr: string, expectedAddress: string): Promise<string> {
  if (!isPollarEnabled()) {
    throw new Error('Pollar no está configurado.');
  }

  const client = requireClient();
  if (client.getAuthState().step !== 'authenticated') {
    throw new Error('Sesión Pollar expirada. Volvé a conectar Pollar (Stellar).');
  }

  const address = await waitForClassicAddress(client);
  if (address !== expectedAddress) {
    throw new Error('La wallet Pollar no coincide con la dirección conectada en ArcusX.');
  }

  const outcome = await client.signTx(unsignedXdr);
  if (outcome.status !== 'signed' || !outcome.signedXdr) {
    const msg =
      (outcome.status === 'error' && (outcome.message || outcome.details)) ||
      'Error al firmar con Pollar.';
    throw new Error(msg);
  }
  return outcome.signedXdr;
}
