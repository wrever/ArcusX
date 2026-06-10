/** Cuenta Stellar clásica (G…, 56 caracteres). */
export const STELLAR_G_ADDRESS = /^G[A-Z0-9]{55}$/;

export function isValidStellarGAddress(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return STELLAR_G_ADDRESS.test(value.trim());
}
