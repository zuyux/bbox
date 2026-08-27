'use client';

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GooglePromptNotification = {
  isNotDisplayed?: () => boolean;
  getNotDisplayedReason?: () => string;
  isSkippedMoment?: () => boolean;
  getSkippedReason?: () => string;
};

type GoogleAccounts = {
  id: {
    initialize: (options: {
      client_id: string;
      callback: (response: GoogleCredentialResponse) => void;
      auto_select?: boolean;
      cancel_on_tap_outside?: boolean;
      ux_mode?: 'popup' | 'redirect';
      use_fedcm_for_prompt?: boolean;
    }) => void;
    renderButton: (
      parent: HTMLElement,
      options: {
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        type?: 'standard' | 'icon';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        logo_alignment?: 'left' | 'center';
        width?: string | number;
      }
    ) => void;
    prompt: (listener?: (notification: unknown) => void) => void;
    cancel: () => void;
  };
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let initializedClientId: string | null = null;
let pendingCredential:
  | {
      resolve: (credential: string) => void;
      reject: (error: Error) => void;
      settled: boolean;
      timeoutId: number;
    }
  | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in is only available in the browser.'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google sign-in.')), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google sign-in.'));
    document.head.appendChild(script);
  });
}

export async function requestGoogleIdToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google sign-in is not configured.');
  }

  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const googleId = window.google?.accounts?.id;
    if (!googleId) {
      reject(new Error('Google sign-in is unavailable.'));
      return;
    }

    if (pendingCredential && !pendingCredential.settled) {
      window.clearTimeout(pendingCredential.timeoutId);
      pendingCredential.settled = true;
      pendingCredential.reject(new Error('Google sign-in was restarted.'));
      googleId.cancel();
    }

    if (initializedClientId !== clientId) {
      googleId.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        callback: (response) => {
          const currentRequest = pendingCredential;
          if (!currentRequest || currentRequest.settled) return;

          currentRequest.settled = true;
          window.clearTimeout(currentRequest.timeoutId);
          pendingCredential = null;

          if (response.credential) {
            currentRequest.resolve(response.credential);
          } else {
            currentRequest.reject(new Error('Google did not return a credential.'));
          }
        },
      });
      initializedClientId = clientId;
    }

    const timeoutId = window.setTimeout(() => {
      const currentRequest = pendingCredential;
      if (!currentRequest || currentRequest.settled) return;

      currentRequest.settled = true;
      pendingCredential = null;
      googleId.cancel();
      currentRequest.reject(new Error('Google sign-in was closed before completion.'));
    }, 90_000);

    pendingCredential = { resolve, reject, settled: false, timeoutId };
    googleId.prompt((promptNotification) => {
      const notification = promptNotification as GooglePromptNotification;
      const currentRequest = pendingCredential;
      if (!currentRequest || currentRequest.settled) return;

      const notDisplayedReason = notification.isNotDisplayed?.()
        ? notification.getNotDisplayedReason?.()
        : null;
      const skippedReason = notification.isSkippedMoment?.()
        ? notification.getSkippedReason?.()
        : null;
      const reason = notDisplayedReason || skippedReason;

      if (!reason) return;

      if (reason === 'opt_out_or_no_session') {
        return;
      }

      currentRequest.settled = true;
      pendingCredential = null;
      window.clearTimeout(currentRequest.timeoutId);
      currentRequest.reject(
        new Error(
          reason === 'unregistered_origin'
            ? 'Google sign-in is not allowed for this app URL. Add this exact origin to the Google OAuth client.'
            : `Google sign-in could not open: ${reason}`
        )
      );
    });
  });
}

export async function renderGoogleSignInButton(
  parent: HTMLElement,
  onCredential: (credential: string) => void,
  onError: (error: Error) => void
) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    onError(new Error('Google sign-in is not configured.'));
    return;
  }

  try {
    await loadGoogleIdentityScript();
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Failed to load Google sign-in.'));
    return;
  }

  const googleId = window.google?.accounts?.id;
  if (!googleId) {
    onError(new Error('Google sign-in is unavailable.'));
    return;
  }

  parent.replaceChildren();
  const width = Math.max(parent.offsetWidth, 240);
  googleId.initialize({
    client_id: clientId,
    ux_mode: 'popup',
    cancel_on_tap_outside: true,
    callback: (response) => {
      if (response.credential) {
        onCredential(response.credential);
      } else {
        onError(new Error('Google did not return a credential.'));
      }
    },
  });
  initializedClientId = clientId;
  googleId.renderButton(parent, {
    theme: 'outline',
    size: 'large',
    type: 'standard',
    shape: 'rectangular',
    text: 'continue_with',
    logo_alignment: 'left',
    width,
  });
}
