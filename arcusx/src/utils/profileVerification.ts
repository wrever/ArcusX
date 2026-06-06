/** Verificación visible en listados (API + badges públicos). */

export function hasIndividualVerifiedBadge(publicBadges?: string[] | null): boolean {
  return (publicBadges ?? []).includes('arcusxVerificado');
}

export function hasEnterpriseVerifiedBadge(publicBadges?: string[] | null): boolean {
  return (publicBadges ?? []).includes('arcusxVerificadoEmpresa');
}

export function hasArcusxVerifiedBadge(publicBadges?: string[] | null): boolean {
  return hasIndividualVerifiedBadge(publicBadges) || hasEnterpriseVerifiedBadge(publicBadges);
}

export function isProfileVerified(input: {
  public_badges?: string[] | null;
  kyc_verified?: boolean;
  creator_verified?: boolean;
  creator_verified_enterprise?: boolean;
  creator_verified_individual?: boolean;
}): boolean {
  return (
    hasArcusxVerifiedBadge(input.public_badges) ||
    Boolean(input.creator_verified_enterprise || input.creator_verified_individual) ||
    Boolean(input.kyc_verified || input.creator_verified)
  );
}
