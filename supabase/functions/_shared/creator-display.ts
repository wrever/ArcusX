export type CreatorUserRow = {
  id?: number;
  username?: string;
  account_type?: string;
  kyc_status?: string;
};

export type EnterpriseProfileRow = {
  user_id?: number;
  legal_name?: string;
  trade_name?: string;
};

export type IndividualProfileRow = {
  user_id?: number;
  full_name?: string;
};

export function creatorDisplayFields(
  user: CreatorUserRow | null | undefined,
  enterpriseProfile: EnterpriseProfileRow | null | undefined,
  individualProfile?: IndividualProfileRow | null | undefined,
): {
  creator_username: string;
  creator_display_name: string;
  creator_verified_enterprise: boolean;
  creator_verified_individual: boolean;
  creator_verified: boolean;
} {
  const username = String(user?.username ?? '').trim();
  const legal = String(enterpriseProfile?.legal_name ?? enterpriseProfile?.trade_name ?? '').trim();
  const fullName = String(individualProfile?.full_name ?? '').trim();
  const approved = user?.kyc_status === 'approved';

  const verifiedEnterprise =
    user?.account_type === 'enterprise' && approved && legal.length > 0;
  const verifiedIndividual =
    user?.account_type === 'individual' && approved && fullName.length > 0;

  const displayName = verifiedEnterprise
    ? legal
    : verifiedIndividual
      ? fullName
      : username;

  return {
    creator_username: username,
    creator_display_name: displayName || username,
    creator_verified_enterprise: verifiedEnterprise,
    creator_verified_individual: verifiedIndividual,
    creator_verified: verifiedEnterprise || verifiedIndividual,
  };
}
