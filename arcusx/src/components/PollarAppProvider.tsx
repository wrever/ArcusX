import { useEffect, type ReactNode, useMemo } from 'react';
import { PollarProvider, usePollar } from '@pollar/react';
import type { AuthUrlOpener } from '@pollar/core';
import '@pollar/react/styles.css';
import '../css/PollarOverrides.css';
import { useStellarNetwork } from '../hooks/useStellarNetwork';
import {
  isPollarEnabled,
  pollarPublishableKey,
  pollarStellarNetwork,
} from '../config/pollar';
import { registerPollarBridge, unregisterPollarBridge } from '../services/pollarWallet';
import { takePollarOAuthPopup } from '../services/pollarOAuthPopup';

/**
 * Pollar abre OAuth en microtask (pierde user-gesture) → about:blank.
 * Reservamos el popup en el click y acá solo navegamos la URL.
 */
const arcusxPollarOpenAuthUrl: AuthUrlOpener = async ({ getUrl }) => {
  const popup = takePollarOAuthPopup();
  if (!popup || popup.closed) {
    throw new Error(
      'No se pudo abrir la ventana de login. Permití popups para este sitio e intentá de nuevo.',
    );
  }

  try {
    popup.document.title = 'Pollar';
    popup.document.body.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:1.5rem;color:#111">Redirigiendo al inicio de sesión…</p>';
  } catch {
    /* ignore — about:blank may restrict writes in some browsers */
  }

  const url = await getUrl();
  if (!url) {
    try {
      popup.close();
    } catch {
      /* ignore */
    }
    throw new Error(
      'Pollar no pudo crear la sesión. En Dashboard → Domains agregá exactamente http://localhost:5173 (o tu origen).',
    );
  }

  popup.location.href = url;
};

function PollarClientBridge() {
  const { getClient } = usePollar();

  useEffect(() => {
    registerPollarBridge({ getClient });
    return () => unregisterPollarBridge();
  }, [getClient]);

  return null;
}

/**
 * Solo monta Pollar si hay publishable key.
 * Login UI propia (PollarConnectPopup); OAuth con popup reservado en el click.
 */
export function PollarAppProvider({ children }: { children: ReactNode }) {
  const { network } = useStellarNetwork();
  const apiKey = pollarPublishableKey(network);

  const clientConfig = useMemo(
    () =>
      apiKey
        ? {
            apiKey,
            stellarNetwork: pollarStellarNetwork(network),
            openAuthUrl: arcusxPollarOpenAuthUrl,
            oauthRedirectUri:
              typeof window !== 'undefined' ? window.location.origin : undefined,
          }
        : null,
    [apiKey, network],
  );

  if (!isPollarEnabled(network) || !clientConfig) {
    return <>{children}</>;
  }

  return (
    <PollarProvider key={network} client={clientConfig}>
      <PollarClientBridge />
      {children}
    </PollarProvider>
  );
}
