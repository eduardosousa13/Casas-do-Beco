import { betterAuth } from 'better-auth';
import { twoFactor } from 'better-auth/plugins';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { database, transaction } from './db';
import { queueRecoveryEmail, completePasswordRecovery, recoveryMailConfigured } from './auth-email';
import type { Sql } from './core';

function trustedOrigins(baseURL: string) {
  const url = new URL(baseURL);
  const origins = [url.origin];
  if (['localhost', '127.0.0.1'].includes(url.hostname)) {
    url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    origins.push(url.origin);
  }
  return origins;
}

export function authOptions(bootstrap = false) {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.PUBLIC_SITE_URL;
  if (!secret || secret.length < 32 || !baseURL) throw new Error('Admin authentication is not configured');
  const url = new URL(baseURL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol !== 'https:') {
    throw new Error('Admin authentication requires HTTPS');
  }
  return {
    appName: 'Casas do Beco', baseURL: url.origin, secret, database: database(),
    trustedOrigins: trustedOrigins(baseURL),
    emailAndPassword: { enabled: true, disableSignUp: !bootstrap, minPasswordLength: 12, maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 15*60, revokeSessionsOnPasswordReset:true,
      sendResetPassword: async ({user,token}: {user:{id:string;email?:string};token:string}) => { if (user.email) await queueRecoveryEmail(database(),{id:user.id,email:user.email},token); },
      onPasswordReset: async ({user}: {user:{id:string}}) => { await transaction(db=>completePasswordRecovery(db,user.id)); },
    },
    user: { modelName: 'pms_auth_user' },
    session: { modelName: 'pms_auth_session', expiresIn: 60 * 60 * 8, updateAge: 60 * 30, cookieCache: { enabled: false } },
    account: { modelName: 'pms_auth_account' },
    verification: { modelName: 'pms_auth_verification' },
    rateLimit: { enabled: true, storage: 'database' as const, modelName: 'pms_auth_rate_limit', window: 60, max: 30 },
    advanced: { ipAddress: { ipAddressHeaders: ['x-forwarded-for'] } },
    hooks: { before: createAuthMiddleware(async context => {
      if (context.path === '/request-password-reset' && !recoveryMailConfigured()) throw new APIError('SERVICE_UNAVAILABLE',{message:'A recuperação por email está temporariamente indisponível.'});
    }), after: createAuthMiddleware(async context => {
      const current = context.context.newSession;
      if (!current) return;
      const previousUser = context.context.session?.user as { twoFactorEnabled?: boolean } | undefined;
      const enrollment = context.path === '/two-factor/verify-totp' && previousUser && previousUser.twoFactorEnabled !== true;
      if (context.path !== '/two-factor/disable' && !enrollment) return;
      // Enforce revocation on the server, including sessions opened during enrollment.
      await database().query('DELETE FROM pms_auth_session WHERE "userId" = $1 AND token <> $2', [current.user.id, current.session.token]);
      await database().query("DELETE FROM pms_auth_verification WHERE value = $1 AND (identifier LIKE 'trust-device-%' OR identifier LIKE '2fa-%')", [current.user.id]);
      await database().query("INSERT INTO audit_log(actor, action, entity_type, entity_id) VALUES ($1,$2,'staff',$1)", [current.user.id, enrollment ? 'mfa.enrolled' : 'mfa.replacement_started']);
    }) },
    plugins: [twoFactor({ issuer: 'Casas do Beco', schema: { twoFactor: { modelName: 'pms_auth_two_factor' } } })] as [ReturnType<typeof twoFactor>],
  };
}

const createAuthentication = () => betterAuth(authOptions());
let instance: ReturnType<typeof createAuthentication> | undefined;
export function authentication() {
  return instance ??= createAuthentication();
}

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function checkOrigin(request: Request) {
  if (!trustedOrigins(process.env.PUBLIC_SITE_URL!).includes(request.headers.get('origin') ?? '')) {
    throw new AccessError(403, 'Origem do pedido inválida.');
  }
}

export async function staffSession(request: Request, requireMfa = true) {
  const session = await authentication().api.getSession({ headers: request.headers });
  const actor = await authorizeStaff(database(), session, requireMfa);
  return { ...actor, sessionId: session!.session.id };
}

export async function authorizeStaff(db: Sql, session: { user: { id: string; name: string; twoFactorEnabled?: boolean } } | null, requireMfa = true) {
  if (!session) throw new AccessError(401, 'Inicie sessão para continuar.');
  const result = await db.query('SELECT role, enabled FROM pms_staff WHERE user_id = $1', [session.user.id]);
  const staff = result.rows[0];
  if (!staff?.enabled || staff.role !== 'owner') {
    throw new AccessError(403, 'Não tem permissão para gerir alojamentos.');
  }
  if (requireMfa && !session.user.twoFactorEnabled) throw new AccessError(403, 'Configure o segundo fator para continuar.');
  return { user: session.user, role: String(staff.role) };
}
