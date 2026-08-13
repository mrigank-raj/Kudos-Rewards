import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/shared/Button';
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent rapid clicks

    // Client-side validation
    if (!form.email.trim() || !form.password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { profile } = await signIn({
        email: form.email.trim(),
        password: form.password,
      });

      // Redirect based on role
      if (profile?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/app/dashboard', { replace: true });
      }
    } catch (err) {
      // Temporary debugging: log and show exact error
      console.error("Supabase Login Error:", err);
      setError(`Auth Error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-accent relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-white text-center max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Xoxo Rewards</h1>
          <p className="text-lg text-indigo-100 leading-relaxed">
            Recognize, reward, and retain your best people with a platform built for modern teams.
          </p>
          <div className="mt-8 text-xs text-indigo-200 opacity-50 font-mono">
            API: {import.meta.env.VITE_SUPABASE_URL ? import.meta.env.VITE_SUPABASE_URL : 'MISSING'}
          </div>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--bg-secondary)]">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[var(--color-primary-600)]">
              <Sparkles className="w-8 h-8" />
              <span className="text-2xl font-bold">Xoxo</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h2>
              <p className="mt-2 text-[var(--text-secondary)]">
                Sign in to your account to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-[var(--color-danger-50)] text-[var(--color-danger-600)] text-sm animate-slide-up">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                icon={LogIn}
                className="w-full"
                size="lg"
              >
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-500)] transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
