/**
 * Screen 1 — Login
 * Split screen on desktop, stacked hero plus sheet on mobile.
 * Figma: "01 · Login"
 */
import { useState } from 'react'
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, Sparkles, Zap } from 'lucide-react'
import { BRAND_GRADIENT, Button, Field, Input, cx } from '../components/ui'

const PROMISES = [
  'Peer to peer kudos in two clicks',
  'Points ledger your finance team can audit',
  'Rewards catalog with 40+ partners',
]

export default function Screen1({ onNavigate }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('admin1@acme.com')
  const [password, setPassword] = useState('Demo1234!')

  const submit = (e) => {
    e.preventDefault()
    onNavigate?.('dashboard')
  }

  return (
    <div className="min-h-screen bg-surface-base md:grid md:grid-cols-2">
      {/* ---------------------------------------------------- brand panel */}
      <section className="relative overflow-hidden px-6 pb-16 pt-14 md:flex md:min-h-screen md:flex-col md:px-16 md:py-16">
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(135deg, #372fbd 0%, #635aed 55%, #9355f2 100%)' }} />
        {/* gradient mesh blobs */}
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
            Recognition that
            <br className="hidden md:block" /> actually lands.
          </h1>
          <p className="mt-4 max-w-[46ch] text-body-md text-white/70 md:mt-5 md:text-body-lg">
            Give peers the credit they earned, turn points into rewards people actually want, and see
            the culture data behind it all.
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

        {/* social proof card, desktop only */}
        <div className="mt-auto hidden items-center gap-4 rounded-2xl border border-white/20 bg-white/[0.14] p-4 backdrop-blur-sm md:flex">
          <div className="flex shrink-0">
            <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[#f5738c] text-[11.5px] font-medium text-white ring-2 ring-white/50">PS</span>
            <span className="-ml-3.5 grid h-[38px] w-[38px] place-items-center rounded-full bg-[#33b899] text-[11.5px] font-medium text-white ring-2 ring-white/50">CM</span>
          </div>
          <div className="min-w-0">
            <p className="text-label-sm text-white">Priya recognized Carlos</p>
            <p className="mt-0.5 truncate text-body-sm text-white/70">
              “Shipped the retention campaign a week early.”
            </p>
          </div>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-label-xs text-[#18181b]">
            <Zap size={13} className="text-[#f59e0b]" fill="currentColor" />
            500
          </span>
        </div>
      </section>

      {/* ----------------------------------------------------------- form */}
      <section
        className={cx(
          'relative z-10 -mt-8 rounded-t-[26px] bg-surface-base px-6 pb-10 pt-8',
          'md:mt-0 md:flex md:min-h-screen md:items-center md:justify-center md:rounded-none md:px-16'
        )}
      >
        <form onSubmit={submit} className="w-full md:max-w-[400px]">
          <h2 className="hidden text-display-lg text-ink-primary md:block">Welcome back</h2>
          <p className="hidden text-body-md text-ink-secondary md:mt-2.5 md:block">
            Sign in to your Acme Corp workspace.
          </p>

          <div className="md:mt-9">
            <Field label="Email address">
              <Input
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
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
                onChange={(e) => setPassword(e.target.value)}
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

          <Button type="submit" size="lg" className="mt-6 w-full">
            Sign in
            <ArrowRight size={16} />
          </Button>

          <div className="my-5 flex items-center gap-3.5">
            <span className="h-px flex-1 bg-stroke-subtle" />
            <span className="font-mono text-[11px] text-ink-muted">or</span>
            <span className="h-px flex-1 bg-stroke-subtle" />
          </div>

          <Button variant="secondary" size="lg" className="w-full">
            <Lock size={16} />
            Continue with Acme SSO
          </Button>

          <p className="mt-7 text-center text-body-sm text-ink-secondary">
            New to Kudos?{' '}
            <button type="button" className="text-label-sm text-brand-text transition hover:opacity-80">
              Create an account
            </button>
          </p>
        </form>
      </section>
    </div>
  )
}
