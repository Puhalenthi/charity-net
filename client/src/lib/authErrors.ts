// Maps Firebase Auth error codes to short, human-readable messages so the UI
// never surfaces raw strings like "Firebase: Error (auth/invalid-credential)".
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': "No account exists for that email — try signing up instead.",
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/email-already-in-use': 'An account with that email already exists — try signing in.',
  'auth/weak-password': 'Password is too weak — use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/popup-closed-by-user': 'The sign-in popup was closed before finishing.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  const message = (err as { message?: string })?.message;
  return message ? message.replace(/^Firebase:\s*/, '') : 'Something went wrong. Please try again.';
}
