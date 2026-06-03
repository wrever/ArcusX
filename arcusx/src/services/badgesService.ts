import { arcusxApiHeaders, arcusxApiUrl } from '../config/arcusxApi';
import type { ArcusxBadgeKey } from '../config/arcusxBadges';

export type MyBadgesResponse = {
  success: boolean;
  public_badges: string[];
  earned_count: number;
  message?: string;
};

export async function getMyBadges(): Promise<MyBadgesResponse> {
  const res = await fetch(arcusxApiUrl('get_my_badges'), {
    headers: arcusxApiHeaders(),
  });
  const data = (await res.json()) as MyBadgesResponse;
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'No se pudieron cargar los badges');
  }
  return data;
}

export function badgesToEarnedMap(badgeIds: string[]): Partial<Record<ArcusxBadgeKey, boolean>> {
  const earned: Partial<Record<ArcusxBadgeKey, boolean>> = {};
  for (const id of badgeIds) {
    earned[id as ArcusxBadgeKey] = true;
  }
  return earned;
}
