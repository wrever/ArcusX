import type { ArcusXClient } from '../client.js';
import { httpPost } from '../http.js';
import { LEGACY_ACTIONS, REST_PATHS } from '../rest/paths.js';
import type { RegisterWalletInput, RequestOptions, VerifyWalletInput } from '../types.js';

export function createTrustModule(client: ArcusXClient) {
  return {
    registerWallet(input: RegisterWalletInput, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.walletRegister,
        LEGACY_ACTIONS.registerWallet,
        input,
        opts,
      );
    },

    verifyWallet(input: VerifyWalletInput, opts?: RequestOptions): Promise<Record<string, unknown>> {
      return httpPost(
        client.http,
        client.config,
        REST_PATHS.walletVerify,
        LEGACY_ACTIONS.verifyWallet,
        input,
        opts,
      );
    },
  };
}

export type TrustModule = ReturnType<typeof createTrustModule>;
