import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import * as cognito from '@/lib/cognito';
import { db } from '@/lib/db';
import { getSession, loadSession, onSessionChange, setSession } from '@/lib/session';

/** The signed-in user, in the shape the screens use. */
export type Session = { user: { id: string; email: string | null } };

type SignUpResult = { needsEmailConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  /** Confirms the emailed code, then signs in with the password from sign-up. */
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Permanently deletes the account and all of its data, then signs out. */
  deleteAccount: () => Promise<void>;
  /** Emails a code for choosing a new password. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Sets a new password with the emailed code, then signs in with it. */
  confirmPasswordReset: (email: string, code: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return value;
}

/** The signed-in user's id. Only call this from screens behind the auth guard. */
export function useUserId(): string {
  const { session } = useAuth();
  if (!session) {
    throw new Error('useUserId called without a session');
  }
  return session.user.id;
}

function toSession(tokens: cognito.Tokens | null): Session | null {
  if (!tokens) return null;
  const claims = cognito.decodeClaims(tokens.idToken);
  return { user: { id: claims.sub, email: claims.email ?? null } };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Kept in memory only, so confirming the email code can finish signing in.
  const pendingPassword = useRef<{ email: string; password: string } | null>(null);

  useEffect(() => {
    loadSession()
      .then((tokens) => setSessionState(toSession(tokens)))
      .finally(() => setIsLoading(false));
    return onSessionChange((tokens) => {
      setSessionState(toSession(tokens));
      // Don't let one account's cached data show up for the next one.
      if (!tokens) queryClient.clear();
    });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    async function startSession(email: string, password: string) {
      const tokens = await cognito.signIn(email, password);
      await setSession(tokens);
      // First sign-in creates the user's profile; later ones are a no-op.
      const { error } = await db.rpc('ensure_my_account');
      if (error) {
        await setSession(null);
        throw error;
      }
    }

    return {
      session,
      isLoading,
      async signIn(email, password) {
        await startSession(email, password);
      },
      async signUp(email, password) {
        const { confirmed } = await cognito.signUp(email, password);
        if (confirmed) {
          await startSession(email, password);
          return { needsEmailConfirmation: false };
        }
        pendingPassword.current = { email, password };
        return { needsEmailConfirmation: true };
      },
      async confirmSignUp(email, code) {
        await cognito.confirmSignUp(email, code);
        const pending = pendingPassword.current;
        if (pending?.email === email) {
          await startSession(email, pending.password);
          pendingPassword.current = null;
        }
      },
      async resendConfirmationCode(email) {
        await cognito.resendConfirmationCode(email);
      },
      async signOut() {
        const tokens = getSession();
        await setSession(null);
        if (tokens) cognito.revoke(tokens.refreshToken).catch(() => {});
      },
      async deleteAccount() {
        const tokens = getSession();
        if (!tokens) return;
        // Data first (it cascades from the profile), then the Cognito login.
        const { error } = await db.rpc('delete_my_account');
        if (error) throw error;
        await cognito.deleteUser(tokens.accessToken);
        await setSession(null);
      },
      async requestPasswordReset(email) {
        await cognito.forgotPassword(email);
      },
      async confirmPasswordReset(email, code, password) {
        await cognito.confirmForgotPassword(email, code, password);
        await startSession(email, password);
      },
    };
  }, [session, isLoading]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
