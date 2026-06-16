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
import type { CustomClaims, User, Charity } from '@charity-net/shared';
import { auth } from './firebase';
import { getApi } from './api';

type AuthState = {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  charity: Charity | null;
  claims: CustomClaims | null;
  loading: boolean;
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
  });

  const refresh = async (): Promise<void> => {
    if (!auth.currentUser) {
      setState({ firebaseUser: null, user: null, charity: null, claims: null, loading: false });
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
      setState({
        firebaseUser: auth.currentUser,
        user: (data.user as unknown as User | null) ?? null,
        charity: ((data as unknown as { charity?: Charity }).charity ?? null),
        claims,
        loading: false,
      });
    } catch {
      setState({
        firebaseUser: auth.currentUser,
        user: null,
        charity: null,
        claims,
        loading: false,
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
        });
        return;
      }
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
