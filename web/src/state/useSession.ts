import { useCallback, useEffect, useState } from 'react';
import { ApiError, auth } from '../api/client';

export type Session =
  | { status: 'unknown' }
  | { status: 'anonymous' }
  | { status: 'signedIn'; email: string };

export interface SessionStore {
  session: Session;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Whether anyone is signed in.
 *
 * There is no token here to inspect — the session is an http-only cookie the browser sends and
 * this app cannot read. So "am I signed in" is answered by asking the server once and
 * remembering the answer, rather than by decoding something in localStorage.
 */
export function useSession(): SessionStore {
  const [session, setSession] = useState<Session>({ status: 'unknown' });

  const refresh = useCallback(async () => {
    try {
      const info = await auth.info();
      setSession({ status: 'signedIn', email: info.email });
    } catch (error) {
      // A 401 here is the normal answer for a visitor, not a failure worth surfacing.
      if (error instanceof ApiError && error.status === 401) {
        setSession({ status: 'anonymous' });
        return;
      }

      // Anything else — the API is down, or this is running without a backend — is also
      // "not signed in" as far as the editor is concerned. It keeps working locally.
      setSession({ status: 'anonymous' });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    session,
    refresh,
    signIn: async (email, password) => {
      await auth.login(email, password);
      await refresh();
    },
    register: async (email, password) => {
      await auth.register(email, password);
      await auth.login(email, password);
      await refresh();
    },
  };
}
