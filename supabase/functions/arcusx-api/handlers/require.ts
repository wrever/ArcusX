import {
  requireUser as authRequireUser,
  requireAdmin as authRequireAdmin,
  type AuthContext,
} from '../../_shared/arcusx-auth.ts';

export async function requireUser(ctx: { req: Request }): Promise<AuthContext> {
  return authRequireUser(ctx.req);
}

export async function requireAdmin(ctx: { req: Request }): Promise<AuthContext> {
  return authRequireAdmin(ctx.req);
}
