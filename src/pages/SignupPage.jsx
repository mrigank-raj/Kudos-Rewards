import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Building2, Check, Eye, EyeOff, Lock, Mail, Sparkles, User } from 'lucide-react';
import { Button, Field, Input, cx } from '@/components/ui';

const PROMISES = [
  'Peer to peer kudos in two clicks',
  'Points ledger your finance team can audit',
  'Rewards catalog with 40+ partners',
];

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
      {/* ---------------------------------------------------- brand panel */}
      <section className="relative z-0 overflow-hidden px-6 pb-16 pt-14 md:flex md:min-h-screen md:flex-col md:px-16 md:py-16">
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(135deg, #372fbd 0%, #635aed 55%, #9355f2 100%)' }} />
        <div className="pointer-events-none absolute -left-32 -top-40 -z-10 h-[520px] w-[560px] rounded-full bg-[#6bd9ff] opacity-40 blur-[130px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-[520px] w-[520px] rounded-full bg-[#ff6bb8] opacity-30 blur-[150px]" />
        <div className="pointer-events-none absolute left-24 top-40 -z-10 h-[420px] w-[420px] rounded-full bg-white opacity-[0.13] blur-[120px]" />

        <div className="flex items-center gap-3">
          <span className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-white/25 bg-white/20">
            <Sparkles size={20} className="text-white" />
          </span>
          <span className="text-heading-md text-white">Kudos</span>
        </div>

        <div className="mt-14 md:mt-auto md:pt-24">
          <h1 className="text-[34px] font-bold leading-[1.18] tracking-[-0.03em] text-white md:text-[52px]">
            Join a team that
            <br className="hidden md:block" /> notices the work.
          </h1>
          <p className="mt-4 max-w-[46ch] text-body-md text-white/70 md:mt-5 md:text-body-lg">
            Create your account to start sending kudos, earning points, and redeeming rewards —
            takes under a minute.
          </p>

          <ul className="mt-9 hidden space-y-3.5 md:block">
            {PROMISES.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20">
                  <Check size={12} strokeWidth={3} className="text-white" />
                </span>
                <span className="text-body-md text-white/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
            Get started in under a minute.
          </p>

          <div className="md:mt-9 space-y-4">
            <Field label="Full name">
              <Input
                icon={User}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Doe"
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
                placeholder="you@company.com"
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

            <Field label="I am a...">
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full h-[46px] rounded-xl border border-stroke bg-surface-base px-3.5 text-body-md text-ink-primary outline-none focus:border-brand-solid focus:shadow-focus-brand"
              >
                <option value="recipient">Team member (recipient)</option>
                <option value="admin">Admin (manager)</option>
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
                    placeholder="Acme Corp"
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
