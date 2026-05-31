import axios from '../config/axios';
import { arcusxApiUrl, arcusxApiHeaders } from '../config/arcusxApi';
import { supabase, hasSupabase } from '../config/supabase';
import { isValidStellarGAddress } from '../utils/stellarAddress';
import { ensureArcusxSupabaseUserLink } from './arcusxMessagingSupabase';
import {
  buildAuthCallbackUrl,
  captureRefFromSearch,
  clearStoredRefCode,
  getOrCreateDeviceFingerprint,
  persistRefBeforeOAuth,
  resolveRefCodeForSync,
} from '../utils/referralCapture';

// Función para verificar si un token JWT ha expirado
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true; // Si hay error al decodificar, considerar como expirado
  }
};

export const authService = {
  async logout() {
    try {
      if (hasSupabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignorar errores de Supabase (ej. sin red o no configurado)
    } finally {
      // Siempre limpiar todo para que la sesión quede cerrada
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase.auth.token');
    }
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }
    
    // Verificar si el token ha expirado
    if (isTokenExpired(token)) {
      // Si el token ha expirado, limpiar localStorage
      this.logout();
      return false;
    }
    
    return true;
  },

  getToken() {
    const token = localStorage.getItem('token');
    if (token && isTokenExpired(token)) {
      this.logout();
      return null;
    }
    return token;
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Funciones para autenticación con Supabase OAuth
  async signInWithGoogle() {
    if (!hasSupabase) {
      throw new Error('Login con Google no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
    }
    try {
      persistRefBeforeOAuth();
      const redirectUrl = buildAuthCallbackUrl();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async signInWithGitHub() {
    if (!hasSupabase) {
      throw new Error('Login con GitHub no está configurado. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
    }
    try {
      persistRefBeforeOAuth();
      const redirectUrl = buildAuthCallbackUrl();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.url) {
        window.location.href = data.url;
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  async handleSupabaseCallback() {
    if (!hasSupabase) return null;
    try {
      captureRefFromSearch(window.location.search);

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        throw error;
      }
      
      if (!session?.user) {
        return null;
      }

      const identity = session.user.identities?.find((i) => i.provider) ??
        session.user.identities?.[0];
      const refCode = resolveRefCodeForSync();
      const oauthSubject =
        (identity as { identity_id?: string } | undefined)?.identity_id ??
        identity?.id ??
        session.user.id;

      const sessionEmail =
        session.user.email ??
        (session.user.user_metadata?.email as string | undefined) ??
        '';

      const syncPayload = {
        supabase_user_id: session.user.id,
        email: sessionEmail,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || sessionEmail.split('@')[0],
        avatar_url: session.user.user_metadata?.avatar_url || null,
        ref_code: refCode || undefined,
        device_fp: getOrCreateDeviceFingerprint(),
        oauth_provider: identity?.provider ?? '',
        oauth_subject: oauthSubject,
        supabase_access_token: session.access_token,
      };

      const syncResponse = await axios.post(
        arcusxApiUrl('sync_supabase_user'),
        syncPayload,
        {
          timeout: 20000,
          withCredentials: true,
          headers: Object.fromEntries(arcusxApiHeaders().entries()),
        },
      );

      let referralMeta = syncResponse.data.referral as Record<string, unknown> | null | undefined;

      const shouldAttribute =
        Boolean(refCode) ||
        Boolean(syncPayload.device_fp) ||
        referralMeta?.skipped === true;

      if (shouldAttribute) {
        try {
          const { data: attrData, error: attrErr } = await supabase.functions.invoke(
            'referral-attribute-signup',
            {
              body: {
                ref_code: refCode || '',
                supabase_user_id: session.user.id,
                mysql_user_id: syncResponse.data.user?.id ?? null,
                email: sessionEmail,
                is_new_user: syncResponse.data.is_new_user !== false,
                device_fp: syncPayload.device_fp,
                user_agent: navigator.userAgent,
                oauth_provider: syncPayload.oauth_provider,
                oauth_subject: syncPayload.oauth_subject,
              },
              headers: { Authorization: `Bearer ${session.access_token}` },
            },
          );
          if (!attrErr && attrData && typeof attrData === 'object') {
            referralMeta = attrData as Record<string, unknown>;
            syncResponse.data.referral = referralMeta;
          }
        } catch {
          /* PHP + pending en servidor; reintento con JWT del usuario */
        }
      }

      if (syncResponse.data.success && syncResponse.data.token) {
        localStorage.setItem('token', syncResponse.data.token);
        localStorage.setItem('user', JSON.stringify(syncResponse.data.user));
        localStorage.setItem('supabase_access_token', session.access_token);
        const attributed = referralMeta?.attributed === true;
        const rejected =
          referralMeta?.status === 'rejected' ||
          referralMeta?.fraud_detected === true;
        if (refCode && (attributed || rejected)) {
          clearStoredRefCode();
        }
        if (hasSupabase && syncResponse.data.user?.id != null) {
          void ensureArcusxSupabaseUserLink(Number(syncResponse.data.user.id));
        }
        return syncResponse.data;
      }
      
      throw new Error(syncResponse.data.message || 'Error al sincronizar usuario');
    } catch (error: any) {
      if (error.response) {
      }
      throw error;
    }
  },

  async getSupabaseSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      return null;
    }
  },

  async registerWallet(walletAddress: string): Promise<{
    success: boolean;
    wallet_address?: string;
    private_payout_wallet?: string;
    already_registered?: boolean;
    changed?: boolean;
    message?: string;
  }> {
    const trimmed = walletAddress.trim();
    const response = await axios.post(
      arcusxApiUrl('register_wallet'),
      { wallet_address: trimmed, private_payout_wallet: trimmed },
      { headers: Object.fromEntries(arcusxApiHeaders().entries()) },
    );
    const data = response.data as {
      success?: boolean;
      wallet_address?: string;
      private_payout_wallet?: string;
      message?: string;
    };
    return {
      success: data.success !== false,
      wallet_address: data.private_payout_wallet ?? data.wallet_address ?? trimmed,
      private_payout_wallet: data.private_payout_wallet ?? data.wallet_address ?? trimmed,
      already_registered: (data as { already_registered?: boolean }).already_registered,
      changed: (data as { changed?: boolean }).changed,
      message: data.message,
    };
  },

  async verifyWallet(): Promise<{
    success: boolean;
    has_wallet: boolean;
    wallet_address?: string | null;
    private_payout_wallet?: string | null;
  }> {
    const response = await axios.get(arcusxApiUrl('verify_wallet'), {
      headers: Object.fromEntries(arcusxApiHeaders().entries()),
    });
    const data = response.data as {
      success?: boolean;
      has_wallet?: boolean;
      wallet_address?: string | null;
      private_payout_wallet?: string | null;
    };
    const payoutExplicit = data.private_payout_wallet?.trim() || null;
    const legacyAddress = data.wallet_address?.trim() || null;
    const payout =
      payoutExplicit && isValidStellarGAddress(payoutExplicit)
        ? payoutExplicit
        : data.has_wallet && legacyAddress && isValidStellarGAddress(legacyAddress)
          ? legacyAddress
          : null;
    return {
      success: data.success !== false,
      has_wallet: Boolean(payout),
      wallet_address: payout,
      private_payout_wallet: payoutExplicit && isValidStellarGAddress(payoutExplicit) ? payoutExplicit : payout,
    };
  }
}; 