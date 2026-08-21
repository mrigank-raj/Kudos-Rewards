import { useEffect, useState } from 'react'
import { Moon, PanelsTopLeft, Sun, X } from 'lucide-react'
import Screen1 from './screens/Screen1'
import Screen2 from './screens/Screen2'
import Screen3 from './screens/Screen3'
import Screen4 from './screens/Screen4'
import Screen5 from './screens/Screen5'
import Screen6 from './screens/Screen6'
import Screen7 from './screens/Screen7'
import Screen8 from './screens/Screen8'
import Screen9 from './screens/Screen9'
import Screen10 from './screens/Screen10'
import { cx } from './components/ui'

export const SCREENS = [
  { id: 1, name: 'Login', group: 'Auth', Component: Screen1 },
  { id: 2, name: 'Recipient dashboard', group: 'Recipient', Component: Screen2 },
  { id: 3, name: 'Give Kudos', group: 'Recipient', Component: Screen3 },
  { id: 4, name: 'Reward catalog', group: 'Recipient', Component: Screen4 },
  { id: 5, name: 'Redeem confirmation', group: 'Recipient', Component: Screen5 },
  { id: 6, name: 'Transaction history', group: 'Recipient', Component: Screen6 },
  { id: 7, name: 'Admin dashboard', group: 'Admin', Component: Screen7 },
  { id: 8, name: 'Reward programs', group: 'Admin', Component: Screen8 },
  { id: 9, name: 'People', group: 'Admin', Component: Screen9 },
  { id: 10, name: 'Analytics', group: 'Admin', Component: Screen10 },
]

/** Where the shell nav sends you, per role. */
const ROUTES = {
  dashboard: 2,
  catalog: 4,
  history: 6,
  profile: 2,
  programs: 8,
  people: 9,
  analytics: 10,
}

const ADMIN_SCREENS = [7, 8, 9, 10]

/** Deep link support: ?screen=7&theme=dark opens that screen directly. */
const params = () => new URLSearchParams(window.location.search)

export default function App() {
  const [screenId, setScreenId] = useState(() => {
    const n = Number(params().get('screen'))
    return SCREENS.some((s) => s.id === n) ? n : 1
  })
  const [theme, setTheme] = useState(() => {
    const q = params().get('theme')
    if (q === 'dark' || q === 'light') return q
    return localStorage.getItem('kudos-theme') ?? 'light'
  })
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kudos-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const navigate = (key) => {
    const target = ROUTES[key]
    if (!target) return
    // stay on the admin side when an admin screen is showing
    if (ADMIN_SCREENS.includes(screenId) && key === 'dashboard') return setScreenId(7)
    setScreenId(target)
  }

  const current = SCREENS.find((s) => s.id === screenId) ?? SCREENS[0]
  const { Component } = current

  return (
    <>
      <Component theme={theme} onToggleTheme={toggleTheme} onNavigate={navigate} />

      {/* ------------------------------------------------- screen picker */}
      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        aria-label="Browse screens"
        className={cx(
          // sits clear of the sidebar org switcher and the mobile tab bar
          'fixed bottom-28 left-4 z-[60] grid h-12 w-12 place-items-center rounded-full',
          'md:bottom-5 md:left-auto md:right-5',
          'bg-ink-primary text-ink-inverse shadow-elevation-lg',
          'transition-transform duration-200 active:scale-90'
        )}
      >
        {pickerOpen ? <X size={19} /> : <PanelsTopLeft size={19} />}
      </button>

      {pickerOpen && (
        <div className="fixed bottom-44 left-4 z-[60] w-[268px] overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-raised shadow-elevation-lg animate-pop-in md:bottom-20 md:left-auto md:right-5">
          <div className="flex items-center gap-2 border-b border-stroke-subtle px-4 py-3">
            <span className="text-label-sm text-ink-primary">Screens</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-surface-subtle px-2.5 py-1.5 text-label-xs text-ink-secondary transition hover:text-ink-primary"
            >
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto py-1.5">
            {['Auth', 'Recipient', 'Admin'].map((group) => (
              <div key={group}>
                <p className="px-4 pb-1 pt-2.5 text-overline uppercase text-ink-muted">{group}</p>
                {SCREENS.filter((s) => s.group === group).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setScreenId(s.id)
                      setPickerOpen(false)
                    }}
                    className={cx(
                      'flex w-full items-center gap-2.5 px-4 py-2 text-left text-label-sm transition-colors',
                      s.id === screenId
                        ? 'bg-brand-subtle text-brand-text'
                        : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary'
                    )}
                  >
                    <span
                      className={cx(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[11px]',
                        s.id === screenId ? 'bg-brand-solid text-white' : 'bg-surface-subtle text-ink-muted'
                      )}
                    >
                      {s.id}
                    </span>
                    {s.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
