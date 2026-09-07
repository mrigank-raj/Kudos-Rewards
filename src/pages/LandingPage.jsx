import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, BarChart3, Bell, Code2, Database,
  Layers, Lock, Sparkles, Trophy, Users, Zap,
} from 'lucide-react';
import { cx } from '@/components/ui';

const REPO_URL = 'https://github.com/mrigank-raj/Kudos-Rewards';

const PROBLEM_POINTS = [
  'Recognition tracked in spreadsheets, or not tracked at all',
  'Physical gift cards and manual email approvals',
  'No visibility into whether the program actually works',
];

const PRODUCT_POINTS = [
  'One auditable points ledger, built on atomic Postgres transactions',
  'Peer-to-peer kudos, redemptions, and approvals in one place',
  'Live analytics on who’s recognized and where points go',
];

const SCREENSHOTS = [
  { src: '/screenshots/recipient-dashboard.png', alt: 'Recipient dashboard showing points balance and company recognition feed', label: 'Recipient dashboard' },
  { src: '/screenshots/admin-dashboard.png', alt: 'Admin dashboard showing ledger activity and quarterly points budget', label: 'Admin dashboard' },
  { src: '/screenshots/analytics.png', alt: 'Analytics page showing points issued vs redeemed and top earners', label: 'Analytics & leaderboard' },
];

const BUILT_ITEMS = [
  {
    icon: Database,
    title: 'Atomic points ledger',
    body: 'Every credit, debit, and redemption runs through Postgres RPC functions rather than client-side balance updates — no race conditions, no double-spending, no negative balances.',
  },
  {
    icon: Lock,
    title: 'Row-level security, end to end',
    body: 'All data access is enforced by Postgres RLS policies, not application code. The frontend never touches a service-role key.',
  },
  {
    icon: Users,
    title: 'Peer-to-peer recognition',
    body: 'Employees tag kudos with company values, react with emoji, and see an org-wide feed — not just a top-down admin tool.',
  },
  {
    icon: Bell,
    title: 'Real-time notifications',
    body: 'In-app notifications and balance updates sync live via Supabase Realtime — no polling, no page refresh.',
  },
  {
    icon: Trophy,
    title: 'Leaderboard & badges',
    body: 'Rank by points earned, and unlock achievement badges awarded automatically from real ledger activity.',
  },
  {
    icon: BadgeCheck,
    title: 'Redemption fulfillment',
    body: 'Admins review and approve pending redemptions through a real queue, not a fire-and-forget button.',
  },
];

const STACK = ['React', 'Tailwind CSS v4', 'TanStack Query', 'Supabase (Postgres · Auth · RLS · Realtime)', 'Recharts', 'Vercel'];

function Section({ className, children }) {
  return <section className={cx('mx-auto max-w-[1080px] px-6', className)}>{children}</section>;
}

export default function LandingPage() {
  return (
    <div className="bg-surface-base">
      {/* ---------------------------------------------------------- nav */}
      <header className="mx-auto flex max-w-[1080px] items-center gap-3 px-6 py-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundImage: 'var(--brand-gradient)' }}>
          <Sparkles size={17} className="text-white" />
        </span>
        <span className="text-heading-md text-ink-primary">Kudos</span>
        <div className="ml-auto flex items-center gap-2.5">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 text-label-sm text-ink-secondary transition hover:text-ink-primary sm:inline-flex"
          >
            <Code2 size={15} />
            Source
          </a>
          <Link
            to="/login"
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-stroke bg-surface-base px-3.5 text-label-sm text-ink-primary transition hover:bg-surface-subtle"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(160deg, #372fbd 0%, #635aed 45%, #9355f2 100%)' }} />
        <div className="pointer-events-none absolute -left-40 -top-32 -z-10 h-[480px] w-[520px] rounded-full bg-[#6bd9ff] opacity-30 blur-[130px]" />
        <div className="pointer-events-none absolute -right-32 top-10 -z-10 h-[420px] w-[420px] rounded-full bg-[#ff6bb8] opacity-25 blur-[140px]" />

        <Section className="pb-0 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-label-xs text-white/85">
            Portfolio project — not a live product
          </span>

          <h1 className="mx-auto mt-6 max-w-[19ch] text-[34px] font-bold leading-[1.15] tracking-[-0.03em] text-white sm:text-[52px]">
            An employee recognition platform, built end to end.
          </h1>
          <p className="mx-auto mt-5 max-w-[54ch] text-body-lg text-white/75">
            Kudos replaces spreadsheets and physical gift cards with one auditable points ledger —
            admins issue recognition, employees redeem it, and every transaction is logged.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-5 text-label-md text-[#372fbd] transition-transform duration-200 ease-smooth hover:brightness-95 active:scale-[0.97]"
            >
              Try the live demo
              <ArrowRight size={16} />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/30 bg-white/10 px-5 text-label-md text-white transition hover:bg-white/15"
            >
              <Code2 size={16} />
              View source
            </a>
          </div>
          <p className="mt-5 text-body-sm text-white/55">
            Demo credentials are pre-filled on the sign-in screen — no account needed.
          </p>
        </Section>

        {/* floating screenshot peeking out of the hero */}
        <Section className="relative mt-14 sm:mt-16">
          <div className="mx-auto max-w-[880px] overflow-hidden rounded-t-2xl border border-white/15 shadow-elevation-lg">
            <img
              src="/screenshots/recipient-dashboard.png"
              alt="Kudos recipient dashboard"
              className="block w-full translate-y-6 rounded-t-2xl"
            />
          </div>
        </Section>
      </section>

      {/* ---------------------------------------------------- problem/product */}
      <Section className="pt-24 sm:pt-28">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
          <div>
            <h2 className="text-heading-lg text-ink-primary">The problem</h2>
            <p className="mt-2 text-body-md text-ink-secondary">
              Recognition and reward programs are usually run by hand.
            </p>
            <ul className="mt-5 space-y-3">
              {PROBLEM_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-body-md text-ink-secondary">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-border bg-brand-subtle p-6">
            <h2 className="text-heading-lg text-ink-primary">What Kudos does</h2>
            <p className="mt-2 text-body-md text-ink-secondary">
              A centralized hub for both sides of the loop.
            </p>
            <ul className="mt-5 space-y-3">
              {PRODUCT_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-body-md text-ink-primary">
                  <Zap size={15} className="mt-0.5 shrink-0 text-brand-solid" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------- screenshots */}
      <Section className="mt-24 sm:mt-28">
        <div className="text-center">
          <h2 className="text-heading-lg text-ink-primary">See it in action</h2>
          <p className="mt-2 text-body-md text-ink-secondary">Real screens from the running app — not mockups.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {SCREENSHOTS.map((shot, i) => (
            <figure
              key={shot.src}
              className={cx(
                'overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-subtle shadow-elevation-md',
                i === 1 && 'sm:-translate-y-4'
              )}
            >
              <img src={shot.src} alt={shot.alt} className="block w-full" />
              <figcaption className="px-4 py-3 text-label-sm text-ink-secondary">{shot.label}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------- what I built */}
      <Section className="mt-24 sm:mt-28">
        <div className="text-center">
          <h2 className="text-heading-lg text-ink-primary">What I built</h2>
          <p className="mt-2 text-body-md text-ink-secondary">The product decisions behind the demo.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BUILT_ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-stroke-subtle bg-surface-base p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-subtle">
                <Icon size={18} className="text-brand-solid" />
              </span>
              <h3 className="mt-4 text-heading-sm text-ink-primary">{title}</h3>
              <p className="mt-1.5 text-body-sm text-ink-secondary">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-stroke-subtle bg-surface-subtle p-5">
          <Layers size={16} className="text-ink-muted" />
          {STACK.map((tech) => (
            <span key={tech} className="rounded-full border border-stroke-subtle bg-surface-base px-3 py-1.5 text-label-xs text-ink-secondary">
              {tech}
            </span>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------- footer CTA */}
      <Section className="mt-24 mb-16 sm:mt-28">
        <div className="relative overflow-hidden rounded-[28px] px-8 py-14 text-center" style={{ backgroundImage: 'var(--brand-gradient)' }}>
          <BarChart3 size={220} className="pointer-events-none absolute -right-10 -top-10 text-white/[0.08]" />
          <h2 className="text-display-lg text-white">Ready to explore?</h2>
          <p className="mx-auto mt-2.5 max-w-[46ch] text-body-md text-white/75">
            Sign in as an admin or a recipient and walk through the full recognition loop.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-5 text-label-md text-[#372fbd] transition hover:brightness-95 active:scale-[0.97]"
            >
              Enter the demo
              <ArrowRight size={16} />
            </Link>
            <a
              href={`${REPO_URL}/blob/main/docs/Decision.md`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/30 px-5 text-label-md text-white transition hover:bg-white/10"
            >
              Read the decision log
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-body-sm text-ink-muted">
          Built by Mrigank Raj Chouhan —{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-brand-text hover:opacity-80">
            view source on GitHub
          </a>
        </p>
      </Section>
    </div>
  );
}
