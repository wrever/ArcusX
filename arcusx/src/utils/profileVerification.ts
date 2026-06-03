/** Verificación visible en listados (API + badges públicos). */

export function hasArcusxVerifiedBadge(publicBadges?: string[] | null): boolean {
  return (publicBadges ?? []).includes('arcusxVerificado');
}

export function isProfileVerified(input: {
  public_badges?: string[] | null;
  kyc_verified?: boolean;
  creator_verified?: boolean;
}): boolean {
  return (
    hasArcusxVerifiedBadge(input.public_badges) ||
    Boolean(input.kyc_verified || input.creator_verified)
  );
}
