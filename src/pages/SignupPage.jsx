import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/shared/Button';
import {
  UserPlus, Mail, Lock, Eye, EyeOff, User, Building2, Sparkles, ChevronDown,
} from 'lucide-react';

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'recipient',
    orgName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) setServerError('');
  };

  // Client-side validation (Edge-Case 1.8: empty name blocked)
  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (form.role === 'admin' && !form.orgName.trim()) {
      newErrors.orgName = 'Organization name is required for admins.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent rapid clicks (Edge-Case 1.10)

    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const { profile } = await signUp({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim(),
        role: form.role,
        orgName: form.orgName.trim(),
      });

      // Redirect based on role
      if (profile?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/app/dashboard', { replace: true });
      }
    } catch (err) {
      // Edge-Case 1.1: existing email
      if (err.message?.toLowerCase().includes('already registered') || err.message?.toLowerCase().includes('already been registered')) {
        setServerError('An account with this email already exists. Try signing in instead.');
      } else {
        setServerError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all text-sm';

  return (
    <div className="min-h-screen flex">
      {/* Left side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-accent relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-32 left-10 w-80 h-80 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-white text-center max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Sparkles className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Join Kudos</h1>
          <p className="text-lg text-indigo-100 leading-relaxed">
            Create your account and start building a culture of recognition today.
          </p>
        </div>
      </div>

      {/* Right side — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-[var(--bg-secondary)]">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[var(--color-primary-600)]">
              <Sparkles className="w-8 h-8" />
              <span className="text-2xl font-bold">Kudos</span>
            </div>
          </div>

          <div className="glass rounded-2xl p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Create your account</h2>
              <p className="mt-2 text-[var(--text-secondary)]">
                Get started in under a minute.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="signup-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className={`${inputClasses} ${errors.name ? 'border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]' : ''}`}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane@company.com"
                    className={`${inputClasses} ${errors.email ? 'border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]' : ''}`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className={`${inputClasses} pr-10 ${errors.password ? 'border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]' : ''}`}
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
                {errors.password && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.password}</p>}
              </div>

              {/* Role Selector */}
              <div>
                <label htmlFor="signup-role" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  I am a...
                </label>
                <div className="relative">
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
                  <select
                    id="signup-role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="recipient">Team Member (Recipient)</option>
                    <option value="admin">Admin (Manager)</option>
                  </select>
                </div>
              </div>

              {/* Organization Name — Admin only */}
              {form.role === 'admin' && (
                <div className="animate-slide-up">
                  <label htmlFor="signup-org" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Organization name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      id="signup-org"
                      name="orgName"
                      type="text"
                      value={form.orgName}
                      onChange={handleChange}
                      placeholder="Acme Corp"
                      className={`${inputClasses} ${errors.orgName ? 'border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]' : ''}`}
                    />
                  </div>
                  {errors.orgName && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.orgName}</p>}
                </div>
              )}

              {/* Server Error */}
              {serverError && (
                <div className="p-3 rounded-lg bg-[var(--color-danger-50)] text-[var(--color-danger-600)] text-sm animate-slide-up">
                  {serverError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                icon={UserPlus}
                className="w-full"
                size="lg"
              >
                Create Account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-500)] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
