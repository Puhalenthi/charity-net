import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { ApiError, type CustomClaims, type User, type Charity } from '@charity-net/shared';
import { auth } from './firebase';
import { getApi } from './api';

type AuthState = {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  charity: Charity | null;
  claims: CustomClaims | null;
  loading: boolean;
  /**
   * How the last profile fetch ended. 'missing' means the server definitively
   * said this account has no profile (onboarding never finished); 'error'
   * means the request itself failed and we know nothing. Routing must not
   * treat the two the same — an API blip is not a reason to restart signup.
   */
  profileStatus: 'unknown' | 'ok' | 'missing' | 'error';
};

type AuthContextValue = AuthState & {
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    charity: null,
    claims: null,
    loading: true,
    profileStatus: 'unknown',
  });

  const refresh = async (): Promise<void> => {
    if (!auth.currentUser) {
      setState({
        firebaseUser: null,
        user: null,
        charity: null,
        claims: null,
        loading: false,
        profileStatus: 'unknown',
      });
      return;
    }
    const token = await auth.currentUser.getIdTokenResult(true);
    const claims: CustomClaims = {
      role: (token.claims['role'] as CustomClaims['role']) ?? 'person',
      approved: Boolean(token.claims['approved']),
      charityId: token.claims['charityId'] as string | undefined,
    };
    try {
      const data = await getApi().me();
      const user = (data.user as unknown as User | null) ?? null;
      setState({
        firebaseUser: auth.currentUser,
        user,
        charity: ((data as unknown as { charity?: Charity }).charity ?? null),
        claims,
        loading: false,
        profileStatus: user ? 'ok' : 'missing',
      });
    } catch (err) {
      // The server rejected our token outright — the account no longer exists
      // or the session was revoked. Keeping the dead session around strands
      // the user on signed-in-only screens, so drop it.
      if (err instanceof ApiError && err.status === 401) {
        await signOut(auth);
        return;
      }
      setState({
        firebaseUser: auth.currentUser,
        user: null,
        charity: null,
        claims,
        loading: false,
        profileStatus: 'error',
      });
    }
  };

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setState({
          firebaseUser: null,
          user: null,
          charity: null,
          claims: null,
          loading: false,
          profileStatus: 'unknown',
        });
        return;
      }
      // Mark loading while we fetch the profile so consumers (e.g. HomeRouter)
      // wait instead of briefly rendering the signed-out landing page.
      setState((s) => ({ ...s, firebaseUser: fbUser, loading: true }));
      await refresh();
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      async signInEmail(email: string, password: string) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signUpEmail(email: string, password: string) {
        await createUserWithEmailAndPassword(auth, email, password);
      },
      async signInGoogle() {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      async signOut() {
        await signOut(auth);
      },
      refresh,
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
