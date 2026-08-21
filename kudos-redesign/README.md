# Kudos Rewards, UI redesign

React + Tailwind implementation of the Kudos Rewards redesign, built to match the
Figma file screen for screen. Ten screens, responsive from 390px to 1440px, with a
full light and dark theme.

Figma source: `https://www.figma.com/design/dJh0kbCGHKh6gz5QzPAktr`

## Running it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. A round button in the corner opens a screen picker
and a theme toggle, so you can walk all ten screens without wiring up routing.

You can also deep link: `?screen=7&theme=dark` opens the admin dashboard in dark.

## The screens

| File | Screen | Side |
| --- | --- | --- |
| `src/screens/Screen1.jsx` | Login | Auth |
| `src/screens/Screen2.jsx` | Recipient dashboard | Recipient |
| `src/screens/Screen3.jsx` | Give Kudos | Recipient |
| `src/screens/Screen4.jsx` | Reward catalog | Recipient |
| `src/screens/Screen5.jsx` | Redeem confirmation | Recipient |
| `src/screens/Screen6.jsx` | Transaction history | Recipient |
| `src/screens/Screen7.jsx` | Admin dashboard | Admin |
| `src/screens/Screen8.jsx` | Reward programs | Admin |
| `src/screens/Screen9.jsx` | People | Admin |
| `src/screens/Screen10.jsx` | Analytics and leaderboard | Admin |

Screens 3 and 5 are overlays. Each renders its parent screen underneath and opens
the sheet on top, which is exactly how the flow behaves in the product, so they
stay individually addressable while sharing one implementation.

Rendered PNGs of every screen live in `screenshots/`, exported from Figma at 2x:
`screen4-desktop-dark.png`, `screen9-mobile-light.png` and so on. Forty two files,
covering all ten screens across desktop and mobile in both themes, plus the two
foundations sheets.

## How theming works

There is one token set, defined once as CSS custom properties in `src/index.css`
and surfaced to Tailwind in `tailwind.config.js`. Switching `data-theme` on the
root element swaps every value at once. No component contains a hard coded colour
outside the two fixed brand gradients.

Token names map straight onto the Figma variable collection:

| Figma variable | Tailwind class |
| --- | --- |
| `surface/base` | `bg-surface-base` |
| `border/subtle` | `border-stroke-subtle` |
| `text/primary` | `text-ink-primary` |
| `brand/solid` | `bg-brand-solid` |
| `gold/text` | `text-gold-text` |
| `success/subtle` | `bg-success-subtle` |

Rename a token in one place and both the design file and the code stay in step.

The type ramp, elevations and the two brand gradients come across the same way,
so `text-heading-lg` and `shadow-elevation-md` are the same values the Figma text
and effect styles use.

## Responsive behaviour

The breakpoint is Tailwind's `md` at 768px.

- Recipients get a bottom tab bar with a centre action button. Admins get a
  hamburger slide over, since their nav is deeper and less thumb driven.
- The People table becomes a stack of cards under a sticky search bar. A table at
  390px is unusable, so it is not a table at 390px.
- Modals become bottom sheets. `Sheet` in `src/components/ui` handles both from one
  component.
- Touch targets stay at or above 44px.

## Layout of the source

```
src/
  App.jsx                     screen picker, theme state, deep links
  index.css                   the token set, both themes
  lib/data.js                 all demo data, matching the Figma screens
  components/ui/index.jsx     buttons, inputs, badges, avatars, sheet, charts chrome
  components/shell/AppShell.jsx  sidebar, top bar, mobile header, tab bar, drawer
  screens/Screen1..10.jsx     one file per screen
```

`lib/data.js` is the only place demo content lives. Swap it for real API calls and
the screens keep working unchanged.

## Notes and known gaps

- Every number is demo data. The logged in recipient is Priya Sharma with 2,350
  points; the admin is Sarah Chen.
- Reward artwork is a gradient plus an icon rather than photography, because there
  are no licensed product images in the project. The card layout takes a real image
  without changes.
- Charts are Recharts with animation switched off, so the data paints immediately
  rather than drawing itself in on every mount.
- There is no router. Navigation is state in `App.jsx`, which keeps the delivery
  focused on the UI. Dropping in React Router is a small change.
- Nothing here talks to Supabase yet. Forms hold local state and buttons close
  their own sheets.
