/** ID del freelancer en supervisión — nunca el empleador (creador). */
export function resolveSuperviseWorkerUserId(input: {
  taskOwnerUserId?: string | number | null;
  acceptedApplicantId?: string | number | null;
  invitedUserId?: string | number | null;
  urlApplicantId?: string | number | null;
}): number | null {
  const ownerId = Number(input.taskOwnerUserId);
  const pick = (raw: string | number | null | undefined): number | null => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (Number.isFinite(ownerId) && ownerId > 0 && n === ownerId) return null;
    return n;
  };

  return (
    pick(input.acceptedApplicantId) ??
    pick(input.invitedUserId) ??
    pick(input.urlApplicantId)
  );
}
