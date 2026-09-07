import { Link } from 'react-router-dom';
import {
  ArrowRight, Bell, Code2, Database, Lock, ShieldCheck, Sparkles, Trophy, Users, Zap,
} from 'lucide-react';
import { cx } from '@/components/ui';

const REPO_URL = 'https://github.com/mrigank-raj/Kudos-Rewards';

const STATS = [
  { value: '12', label: 'Database tables' },
  { value: '14', label: 'Postgres functions' },
  { value: '30+', label: 'Row-level security policies' },
  { value: '0', label: 'Service-role keys in the frontend' },
];

const SHOWCASE = [
  {
    label: 'Recognition',
    title: 'A feed that actually belongs to everyone',
    body: 'Employees tag kudos with company values, react with emoji, and see who else got recognized — not just a top-down announcement board. Fixed a real RLS gap here: recipients could only ever see their own kudos until an org-wide read policy went in.',
    img: '/screenshots/recipient-dashboard.png',
    tone: 'brand',
  },
  {
    label: 'Analytics',
    title: 'Ranked by the database, not the browser',
    body: 'The leaderboard and the analytics dashboard both call the same Postgres function — points are summed once, server-side, not recomputed differently in two places.',
    img: '/screenshots/analytics.png',
    tone: 'gold',
  },
  {
    label: 'Admin',
    title: 'Every control actually does something',
    body: 'The date range, the sort, the redemption queue — all wired to real queries. Several of these were decorative buttons before this pass; none of them are now.',
    img: '/screenshots/admin-dashboard.png',
    tone: 'success',
  },
];

const BUILT = [
  { icon: Database, title: 'Atomic ledger', body: 'Every point movement runs through a Postgres RPC, never a client-side balance update.' },
  { icon: Lock, title: 'RLS end to end', body: 'Access control lives in Postgres policies. The frontend never touches a service-role key.' },
  { icon: Users, title: 'Peer-to-peer', body: 'Recognition flows sideways, not just from managers down.' },
  { icon: Bell, title: 'Realtime', body: 'Notifications and balances sync live via Supabase Realtime — no polling.' },
  { icon: Trophy, title: 'Badges', body: 'Achievements are awarded automatically from real ledger activity.' },
  { icon: ShieldCheck, title: 'Fulfillment queue', body: 'Redemptions are approved or cancelled by an admin, not fire-and-forgotten.' },
];

function BrowserFrame({ src, alt, className }) {
  return (
    <div className={cx('overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-raised shadow-elevation-lg', className)}>
      <div className="flex items-center gap-1.5 border-b border-stroke-subtle bg-surface-subtle px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 flex-1 truncate rounded-md bg-surface-base px-2.5 py-1 text-center font-mono text-[10px] text-ink-muted">
          kudos-rewards.vercel.app
        </span>
      </div>
      <img src={src} alt={alt} className="block w-full" />
    </div>
  );
}

const TONE_BG = { brand: 'bg-brand-subtle text-brand-solid', gold: 'bg-gold-subtle text-gold-solid', success: 'bg-success-subtle text-success-solid' };

export default function LandingPage() {
  return (
    <div className="bg-surface-base">
      {/* ---------------------------------------------------------- hero (nav lives inside it) */}
      <section className="relative z-0 overflow-hidden pb-28">
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #4b3fd6 0%, #372fbd 42%, #1f1a63 100%)' }} />
        <div className="pointer-events-none absolute left-1/2 top-[-220px] -z-10 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[#8c7bff] opacity-40 blur-[150px]" />
        <div className="pointer-events-none absolute -right-40 bottom-[-160px] -z-10 h-[420px] w-[420px] rounded-full bg-gold-solid opacity-[0.18] blur-[140px]" />

        <header className="mx-auto flex max-w-[1100px] items-center gap-3 px-6 py-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles size={17} className="text-white" />
          </span>
          <span className="text-heading-md text-white">Kudos</span>
          <div className="ml-auto flex items-center gap-2.5">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 text-label-sm text-white/80 transition hover:text-white sm:inline-flex"
            >
              <Code2 size={15} />
              Source
            </a>
            <Link
              to="/login"
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-white/25 bg-white/10 px-3.5 text-label-sm text-white backdrop-blur transition hover:bg-white/20"
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="mx-auto mt-8 max-w-[760px] px-6 text-center sm:mt-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-label-xs text-white/80 backdrop-blur">
            Solo-built portfolio project
          </span>
          <h1 className="mx-auto mt-6 max-w-[18ch] text-[38px] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[58px]">
            Recognition your team will actually use.
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-body-lg text-white/70">
            Kudos replaces spreadsheets and gift-card emails with one auditable points ledger —
            built, hardened, and shipped end to end by one person.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-5 text-label-md text-[#372fbd] shadow-[0_12px_30px_-8px_rgba(0,0,0,0.5)] transition hover:brightness-95 active:scale-[0.97]"
            >
              Try the live demo
              <ArrowRight size={16} />
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/25 bg-white/10 px-5 text-label-md text-white backdrop-blur transition hover:bg-white/15"
            >
              <Code2 size={16} />
              View source
            </a>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-16 max-w-[980px] px-6">
          <BrowserFrame src="/screenshots/recipient-dashboard.png" alt="Kudos recipient dashboard" />
        </div>
      </section>

      {/* ---------------------------------------------------------- stats */}
      <section className="border-b border-stroke-subtle bg-surface-raised">
        <div className="mx-auto grid max-w-[980px] grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-numeric-hero text-[32px] text-ink-primary sm:text-[38px]">{s.value}</p>
              <p className="mt-1 text-label-sm text-ink-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- showcase */}
      <section className="mx-auto max-w-[1100px] px-6 py-24">
        <div className="space-y-24">
          {SHOWCASE.map((s, i) => (
            <div key={s.title} className={cx('grid items-center gap-10 lg:grid-cols-2 lg:gap-16', i % 2 === 1 && 'lg:[&>*:first-child]:order-2')}>
              <div>
                <span className={cx('inline-flex items-center rounded-full px-3 py-1 text-label-xs', TONE_BG[s.tone])}>{s.label}</span>
                <h2 className="mt-4 text-display-lg text-ink-primary">{s.title}</h2>
                <p className="mt-4 text-body-lg text-ink-secondary">{s.body}</p>
              </div>
              <BrowserFrame src={s.img} alt={s.title} />
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- built with */}
      <section className="bg-surface-subtle py-24">
        <div className="mx-auto max-w-[1100px] px-6">
          <div className="text-center">
            <h2 className="text-display-lg text-ink-primary">What's under the hood</h2>
            <p className="mt-2 text-body-md text-ink-secondary">The engineering decisions behind the product.</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BUILT.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-stroke-subtle bg-surface-base p-6 transition hover:-translate-y-1 hover:shadow-elevation-lg">
                <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundImage: 'var(--brand-gradient)' }}>
                  <Icon size={19} className="text-white" />
                </span>
                <h3 className="mt-4 text-heading-sm text-ink-primary">{title}</h3>
                <p className="mt-1.5 text-body-sm text-ink-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- footer CTA */}
      <section className="relative z-0 overflow-hidden py-24 text-center">
        <div className="absolute inset-0 -z-10" style={{ backgroundImage: 'var(--brand-gradient)' }} />
        <Zap size={280} className="pointer-events-none absolute -right-16 -top-16 -z-10 text-white/[0.06]" />

        <div className="mx-auto max-w-[560px] px-6">
          <h2 className="text-display-xl text-white">Ready to look around?</h2>
          <p className="mt-3 text-body-lg text-white/75">
            Sign in as an admin or a recipient — demo credentials are pre-filled, no account needed.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
              className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-white/25 px-5 text-label-md text-white transition hover:bg-white/10"
            >
              Read the decision log
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-[1100px] px-6 py-8 text-center">
        <p className="text-body-sm text-ink-muted">
          Built by Mrigank Raj Chouhan —{' '}
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-brand-text hover:opacity-80">
            view source on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
