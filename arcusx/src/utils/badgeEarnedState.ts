import type { BadgeEarnedMap } from '../config/badgeCatalog';
import type { ArcusxBadgeKey } from '../config/arcusxBadges';
import type { KycStatus, VerificationStatusResponse } from '../services/kycService';

/** Fallback local si la API de badges no responde (solo badges básicos). */
export function computeEarnedBadgesLocal(input: {
  verification: VerificationStatusResponse | null;
  enterpriseMode: boolean;
  walletRegistered: boolean;
  tasksCompleted: number;
  tasksCreated: number;
}): BadgeEarnedMap {
  const { verification, enterpriseMode, walletRegistered, tasksCompleted, tasksCreated } = input;
  const status = (verification?.kyc_status ?? 'not_required') as KycStatus;
  const inReview = status === 'under_review' || status === 'pending';

  const earned: BadgeEarnedMap = {};

  if (status === 'approved' && verification?.can_show_verified_badge) {
    if (enterpriseMode) {
      earned.arcusxVerificadoEmpresa = true;
    } else {
      earned.arcusxVerificado = true;
    }
  }

  if (enterpriseMode && inReview) {
    earned.clienteEmpresa = true;
  }

  if (walletRegistered) {
    earned.wallet = true;
  }

  if (tasksCompleted >= 1 || tasksCreated >= 1) {
    earned.primerTrabajo = true;
  }

  return earned;
}

export function mergeEarnedFromApi(
  apiBadgeIds: string[] | undefined,
  localFallback: BadgeEarnedMap,
): BadgeEarnedMap {
  if (!apiBadgeIds?.length) return localFallback;
  const earned: BadgeEarnedMap = {};
  for (const id of apiBadgeIds) {
    earned[id as ArcusxBadgeKey] = true;
  }
  return earned;
}

export function countEarnedLiveBadges(
  earned: BadgeEarnedMap,
  liveIds: ArcusxBadgeKey[],
): number {
  return liveIds.filter((id) => earned[id]).length;
}
