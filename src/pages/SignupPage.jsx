import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Building2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Button, Field, Input, cx } from '@/components/ui';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';

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
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = 'Name is required.';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    } else if (!/@kiit\.ac\.in$/i.test(form.email.trim())) {
      newErrors.email = 'Use your official @kiit.ac.in email address.';
    }
    if (!form.password) {
      newErrors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (form.role === 'admin' && !form.orgName.trim()) {
      newErrors.orgName = 'Organization name is required for HR.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
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

      if (profile?.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/app/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes('already registered') || err.message?.toLowerCase().includes('already been registered')) {
        setServerError('An account with this email already exists. Try signing in instead.');
      } else {
        setServerError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base md:grid md:grid-cols-2">
      <AuthBrandPanel
        title="Create your employee account"
        body="KIIT staff can register with their official @kiit.ac.in email address."
      />

      {/* ----------------------------------------------------------- form */}
      <section
        className={cx(
          'relative z-10 -mt-8 rounded-t-[26px] bg-surface-base px-6 pb-10 pt-8',
          'md:mt-0 md:flex md:min-h-screen md:items-center md:justify-center md:rounded-none md:px-16'
        )}
      >
        <form onSubmit={handleSubmit} className="w-full md:max-w-[400px]">
          <h2 className="hidden text-display-lg text-ink-primary md:block">Create your account</h2>
          <p className="hidden text-body-md text-ink-secondary md:mt-2.5 md:block">
            Use your official @kiit.ac.in email.
          </p>

          <div className="md:mt-9 space-y-4">
            <Field label="Full name">
              <Input
                icon={User}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your full name"
                autoComplete="name"
                invalid={!!errors.name}
              />
            </Field>
            {errors.name && <p className="-mt-2 text-xs text-danger-solid">{errors.name}</p>}

            <Field label="Email address">
              <Input
                icon={Mail}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@kiit.ac.in"
                autoComplete="email"
                invalid={!!errors.email}
              />
            </Field>
            {errors.email && <p className="-mt-2 text-xs text-danger-solid">{errors.email}</p>}

            <Field label="Password">
              <Input
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                invalid={!!errors.password}
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
            {errors.password && <p className="-mt-2 text-xs text-danger-solid">{errors.password}</p>}

            <Field label="Role">
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full h-[46px] rounded-xl border border-stroke bg-surface-base px-3.5 text-body-md text-ink-primary outline-none focus:border-brand-solid focus:shadow-focus-brand"
              >
                <option value="recipient">Employee</option>
                <option value="admin">HR</option>
              </select>
            </Field>

            {form.role === 'admin' && (
              <>
                <Field label="Organization name">
                  <Input
                    icon={Building2}
                    type="text"
                    name="orgName"
                    value={form.orgName}
                    onChange={handleChange}
                    placeholder="KIIT University"
                    invalid={!!errors.orgName}
                  />
                </Field>
                {errors.orgName && <p className="-mt-2 text-xs text-danger-solid">{errors.orgName}</p>}
              </>
            )}
          </div>

          {serverError && (
            <div className="mt-4 p-3 rounded-lg bg-danger-subtle text-danger-text text-sm animate-fade-in border border-danger-border">
              {serverError}
            </div>
          )}

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
            {!loading && <ArrowRight size={16} />}
          </Button>

          <p className="mt-7 text-center text-body-sm text-ink-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-label-sm text-brand-text transition hover:opacity-80">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
