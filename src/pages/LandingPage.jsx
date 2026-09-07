import { Link } from 'react-router-dom';
import { ArrowRight, Code2 } from 'lucide-react';
import { cx } from '@/components/ui';

const REPO_URL = 'https://github.com/mrigank-raj/Kudos-Rewards';

const FACTS = [
  { label: 'Role', value: 'Solo — product, design, engineering' },
  { label: 'Stack', value: 'React · Postgres · Supabase' },
  { label: 'Status', value: 'Portfolio project, not a live business' },
];

const NAV_LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#decisions', label: 'Decisions that mattered' },
  { href: '#bugs', label: 'Bugs I found fixing my own work' },
  { href: '#screens', label: 'What it looks like' },
];

const DECISIONS = [
  {
    title: 'Peer-to-peer recognition, not just top-down',
    body: 'Manager-to-employee recognition alone creates a bottleneck — one person has to notice everything. I added a P2P kudos feed so recognition flows sideways too, which is also what makes the org-wide feed worth building at all.',
  },
  {
    title: 'The points ledger lives in Postgres, not React',
    body: 'send_kudos and redeem_reward are stored procedures, not client-side API call sequences. Moving points from A to B has to be atomic — if a request failed halfway through a multi-step client flow, A could lose points without B ever receiving them.',
  },
  {
    title: 'New users get provisioned by a database trigger',
    body: 'Supabase requires email confirmation before a session exists, which blocks a fresh signup from inserting their own profile row under RLS — a chicken-and-egg problem. A Postgres trigger (handle_new_user) creates the profile and starting balance server-side the moment the auth row exists, so nobody hits a schema error on day one.',
  },
];

const BUGS = [
  {
    title: 'Recipients couldn’t actually see each other',
    body: 'The only RLS policies on `users` were "view your own row" and "admins view the org." No policy covered a regular employee viewing a teammate’s row — which meant the P2P kudos recipient picker and the "org-wide" kudos feed were both silently broken for every non-admin session. It likely went unnoticed because manual testing ran from the admin account.',
  },
  {
    title: 'A gradient that rendered as a blank white box',
    body: 'I reused the hero background technique from the login screen, but dropped one class. Login’s section has an explicit z-index (which creates a CSS stacking context); mine didn’t, so a -z-10 gradient layer escaped and painted behind the page’s own background instead of behind just its section. Caught it by actually screenshotting the page instead of trusting the code.',
  },
  {
    title: 'Two components, one Realtime channel, one crash',
    body: 'The desktop and mobile headers both render at all times (CSS just hides one) and each independently opened a Supabase Realtime subscription on the exact same channel name. The second subscribe call threw, because you can’t attach a listener to a channel that’s already live. Fixed by subscribing once and passing the data down.',
  },
];

const SCREENS = [
  {
    src: '/screenshots/recipient-dashboard.png',
    label: 'Recipient dashboard',
    caption: 'Balance, quick actions, and the company-wide kudos feed — the feed that RLS was quietly blocking until the fix above.',
  },
  {
    src: '/screenshots/admin-dashboard.png',
    label: 'Admin ledger',
    caption: 'The date-range control filters the ledger and the KPI trend for real now. It used to be a button that did nothing.',
  },
  {
    src: '/screenshots/analytics.png',
    label: 'Analytics & leaderboard',
    caption: 'Ranked by a Postgres RPC (get_top_recipients), not a client-side aggregation — same query the leaderboard page reuses.',
  },
];

function SectionLabel({ n, children }) {
  return (
    <p className="flex items-center gap-2.5 text-label-sm text-ink-muted">
      <span className="font-mono text-[11px] text-brand-solid">{n}</span>
      {children}
    </p>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-surface-base lg:grid lg:grid-cols-[300px_1fr]">
      {/* ---------------------------------------------------------- sidebar */}
      <aside className="border-b border-stroke-subtle px-6 py-8 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-8 lg:py-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[9px]" style={{ backgroundImage: 'var(--brand-gradient)' }}>
            <span className="text-label-sm text-white">K</span>
          </span>
          <span className="text-heading-sm text-ink-primary">Kudos</span>
        </div>

        <p className="mt-4 text-body-md text-ink-secondary">
          An employee recognition &amp; rewards platform, built solo by{' '}
          <span className="text-ink-primary">Mrigank Raj Chouhan</span>.
        </p>

        <dl className="mt-6 space-y-3 border-t border-stroke-subtle pt-6">
          {FACTS.map((f) => (
            <div key={f.label}>
              <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">{f.label}</dt>
              <dd className="mt-0.5 text-body-sm text-ink-primary">{f.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-2.5 border-t border-stroke-subtle pt-6">
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-label-sm text-white transition hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundImage: 'var(--brand-gradient)' }}
          >
            Try the live demo
            <ArrowRight size={14} />
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-stroke bg-surface-base text-label-sm text-ink-primary transition hover:bg-surface-subtle"
          >
            <Code2 size={14} />
            View source
          </a>
        </div>

        <nav className="mt-8 hidden flex-col gap-2 border-t border-stroke-subtle pt-6 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-body-sm text-ink-secondary transition hover:text-ink-primary">
              {l.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* ---------------------------------------------------------- main */}
      <main className="mx-auto w-full max-w-[680px] px-6 py-12 lg:px-12 lg:py-16">
        <h1 className="text-[28px] font-bold leading-[1.25] tracking-[-0.02em] text-ink-primary sm:text-[36px]">
          I built Kudos to prove I could take a product from a rough spec to
          something with real database integrity, real security, and a real
          design system — not just a UI mockup.
        </h1>
        <p className="mt-5 text-body-lg text-ink-secondary">
          It replaces the spreadsheets and manual gift-card emails most teams
          still use for recognition programs with one auditable points
          ledger: admins issue recognition, employees redeem it, and every
          transaction is logged.
        </p>

        <section id="problem" className="mt-14 scroll-mt-8">
          <SectionLabel n="01">The problem</SectionLabel>
          <h2 className="mt-2 text-heading-lg text-ink-primary">Recognition programs are usually run by hand</h2>
          <ul className="mt-4 space-y-2.5 text-body-md text-ink-secondary">
            <li>— Tracked in spreadsheets, or not tracked at all</li>
            <li>— Physical gift cards and manual email approvals</li>
            <li>— No visibility into whether the program actually works</li>
          </ul>
        </section>

        <section id="decisions" className="mt-14 scroll-mt-8">
          <SectionLabel n="02">Decisions that mattered</SectionLabel>
          <h2 className="mt-2 text-heading-lg text-ink-primary">Three calls that shaped the architecture</h2>
          <div className="mt-6 space-y-6">
            {DECISIONS.map((d) => (
              <div key={d.title} className="border-l-2 border-brand-border pl-5">
                <h3 className="text-heading-sm text-ink-primary">{d.title}</h3>
                <p className="mt-1.5 text-body-md text-ink-secondary">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="bugs" className="mt-14 scroll-mt-8">
          <SectionLabel n="03">Bugs I found fixing my own work</SectionLabel>
          <h2 className="mt-2 text-heading-lg text-ink-primary">Nothing here was caught by a code review — only by reading and running the app</h2>
          <div className="mt-6 space-y-6">
            {BUGS.map((b) => (
              <div key={b.title} className="rounded-2xl bg-surface-subtle p-5">
                <h3 className="text-heading-sm text-ink-primary">{b.title}</h3>
                <p className="mt-1.5 text-body-md text-ink-secondary">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="screens" className="mt-14 scroll-mt-8">
          <SectionLabel n="04">What it looks like</SectionLabel>
          <h2 className="mt-2 text-heading-lg text-ink-primary">Real screens, not mockups</h2>
          <div className="mt-6 space-y-10">
            {SCREENS.map((s) => (
              <figure key={s.src}>
                <div className="overflow-hidden rounded-2xl border border-stroke-subtle shadow-elevation-md">
                  <img src={s.src} alt={s.label} className="block w-full" />
                </div>
                <figcaption className="mt-3">
                  <p className="text-label-sm text-ink-primary">{s.label}</p>
                  <p className="mt-1 text-body-sm text-ink-muted">{s.caption}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className={cx('mt-16 border-t border-stroke-subtle pt-10')}>
          <p className="text-body-md text-ink-secondary">
            That’s the whole loop — from a Postgres RLS policy to a pixel that
            wasn’t rendering. If you want the fuller reasoning behind any of
            the calls above, it’s written down as it happened, not
            reconstructed after the fact.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-label-sm text-white transition hover:brightness-110 active:scale-[0.97]"
              style={{ backgroundImage: 'var(--brand-gradient)' }}
            >
              Try the live demo
              <ArrowRight size={15} />
            </Link>
            <a
              href={`${REPO_URL}/blob/main/docs/Decision.md`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-stroke bg-surface-base px-4 text-label-sm text-ink-primary transition hover:bg-surface-subtle"
            >
              Read the full decision log
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
