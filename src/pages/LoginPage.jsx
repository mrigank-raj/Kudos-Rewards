import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button, Field, Input, cx } from '@/components/ui';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { profile } = await signIn({
        email: email.trim(),
        password,
      });

      if (profile?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/app/dashboard', { replace: true });
      }
    } catch (err) {
      console.error("Supabase Login Error:", err);
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base md:grid md:grid-cols-2">
      <AuthBrandPanel
        title="Welcome to the KIIT University Employee Portal"
        body="Thank colleagues, earn and redeem reward points, and stay connected with the KIIT community."
      />

      {/* ----------------------------------------------------------- form */}
      <section
        className={cx(
          'relative z-10 -mt-8 rounded-t-[26px] bg-surface-base px-6 pb-10 pt-8',
          'md:mt-0 md:flex md:min-h-screen md:items-center md:justify-center md:rounded-none md:px-16'
        )}
      >
        <form onSubmit={handleSubmit} className="w-full md:max-w-[400px]">
          <h2 className="hidden text-display-lg text-ink-primary md:block">Welcome back</h2>
          <p className="hidden text-body-md text-ink-secondary md:mt-2.5 md:block">
            Sign in with your @kiit.ac.in email.
          </p>

          <div className="md:mt-9">
            <Field label="Email address">
              <Input
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="you@kiit.ac.in"
                autoComplete="email"
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Password"
              hint={
                <button type="button" className="text-label-sm text-brand-text transition hover:opacity-80">
                  Forgot password?
                </button>
              }
            >
              <Input
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••••"
                autoComplete="current-password"
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="shrink-0 text-ink-muted transition hover:text-ink-secondary"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
            </Field>
          </div>
          
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-danger-subtle text-danger-text text-sm animate-fade-in border border-danger-border">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
            {!loading && <ArrowRight size={16} />}
          </Button>

          <p className="mt-7 text-center text-body-sm text-ink-secondary">
            First time here?{' '}
            <Link to="/signup" className="text-label-sm text-brand-text transition hover:opacity-80">
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
