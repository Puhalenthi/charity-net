import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { AuthTabs } from '@/components/AuthTabs';
import { authErrorMessage } from '@/lib/authErrors';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUpEmail, signInGoogle } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signUpEmail(email, password);
      toast({ title: 'Account created', description: 'Now finish setting up your profile.', variant: 'success' });
      navigate('/complete-signup');
    } catch (err) {
      toast({ title: 'Sign up failed', description: authErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <AuthTabs active="signup" />
          <div>
            <CardTitle>Sign up</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              New here? Create an account to get started.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handle} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating…' : 'Create account'}
            </Button>
          </form>
          <div className="relative flex items-center justify-center text-xs text-muted-foreground">
            <span className="relative bg-card px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                await signInGoogle();
                toast({ title: 'Account created', variant: 'success' });
                navigate('/complete-signup');
              } catch (err) {
                toast({ title: 'Google sign up failed', description: authErrorMessage(err), variant: 'destructive' });
              }
            }}
          >
            Continue with Google
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
