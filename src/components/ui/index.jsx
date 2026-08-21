import { useEffect, useState } from 'react'
import { Check, ChevronDown, Search, X, Zap } from 'lucide-react'

/* ------------------------------------------------------------- utilities */

export const cx = (...parts) => parts.filter(Boolean).join(' ')

export const BRAND_GRADIENT = { backgroundImage: 'var(--brand-gradient)' }
export const VAULT_GRADIENT = { backgroundImage: 'var(--vault-gradient)' }

/** Tracks a media query. Used to switch modals into bottom sheets. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    setMatches(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)')

/* --------------------------------------------------------------- surface */

export function Card({ className, children, flush = false, ...rest }) {
  return (
    <div
      className={cx(
        'rounded-2xl bg-surface-base border border-stroke-subtle shadow-elevation-md',
        !flush && 'p-5',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ title, subtitle, action, className }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-heading-sm text-ink-primary truncate">{title}</h3>
        {subtitle && <p className="text-body-sm text-ink-muted mt-0.5 truncate">{subtitle}</p>}
      </div>
      <div className="ml-auto shrink-0">{action}</div>
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h1 className="text-display-lg text-ink-primary">{title}</h1>
        {subtitle && <p className="text-body-md text-ink-secondary mt-1.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2.5 sm:ml-auto shrink-0">{children}</div>}
    </div>
  )
}

/* --------------------------------------------------------------- buttons */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium ' +
  'transition-all duration-200 ease-smooth active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-surface-canvas disabled:pointer-events-none disabled:opacity-50'

const BUTTON_SIZES = {
  sm: 'h-9 px-3.5 text-label-sm',
  md: 'h-11 px-[18px] text-label-sm',
  lg: 'h-[52px] px-5 text-label-md',
}

export function Button({ variant = 'primary', size = 'md', className, style, children, ...rest }) {
  const variants = {
    primary: 'text-white shadow-glow-brand hover:brightness-110',
    secondary: 'bg-surface-base text-ink-primary border border-stroke hover:bg-surface-subtle',
    ghost: 'bg-surface-subtle text-ink-secondary hover:text-ink-primary',
    quiet: 'text-ink-secondary hover:text-ink-primary hover:bg-surface-subtle',
    disabled: 'bg-surface-subtle text-ink-muted pointer-events-none',
  }
  return (
    <button
      type="button"
      className={cx(BUTTON_BASE, BUTTON_SIZES[size], variants[variant], className)}
      style={variant === 'primary' ? { ...BRAND_GRADIENT, ...style } : style}
      {...rest}
    >
      {children}
    </button>
  )
}

export function IconButton({ className, children, label, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        'inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-surface-subtle',
        'text-ink-secondary transition-all duration-200 ease-smooth',
        'hover:text-ink-primary active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- inputs */

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-label-sm text-ink-primary">{label}</span>
        {hint && <span className="ml-auto">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

export function Input({ icon: Icon, trailing, invalid, className, ...rest }) {
  return (
    <div
      className={cx(
        'flex items-center gap-2.5 rounded-xl bg-surface-base px-3.5 h-[46px]',
        'border transition-all duration-200 ease-smooth',
        invalid
          ? 'border-danger-solid focus-within:shadow-focus-danger'
          : 'border-stroke focus-within:border-brand-solid focus-within:shadow-focus-brand',
        className
      )}
    >
      {Icon && <Icon size={17} className="shrink-0 text-ink-muted" />}
      <input
        className="min-w-0 flex-1 bg-transparent text-body-md text-ink-primary outline-none placeholder:text-ink-muted"
        {...rest}
      />
      {trailing}
    </div>
  )
}

export function SearchInput({ className, ...rest }) {
  return (
    <div
      className={cx(
        'flex items-center gap-2.5 rounded-[10px] bg-surface-base h-10 px-3.5',
        'border border-stroke-subtle transition-all duration-200 ease-smooth',
        'focus-within:border-brand-solid focus-within:shadow-focus-brand',
        className
      )}
    >
      <Search size={15} className="shrink-0 text-ink-muted" />
      <input
        className="min-w-0 flex-1 bg-transparent text-body-sm text-ink-primary outline-none placeholder:text-ink-muted"
        {...rest}
      />
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className={cx(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-300 ease-smooth',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-surface-base',
        checked ? 'bg-brand-solid' : 'bg-stroke'
      )}
    >
      <span
        className={cx(
          'absolute top-[2.5px] h-[17px] w-[17px] rounded-full bg-white shadow-sm',
          'transition-transform duration-300 ease-smooth',
          checked ? 'translate-x-[18.5px]' : 'translate-x-[2.5px]'
        )}
      />
    </button>
  )
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className={cx(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] transition-all duration-200 ease-smooth',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40',
        checked ? 'bg-brand-solid' : 'bg-surface-base border border-stroke-strong'
      )}
    >
      {checked && <Check size={11} strokeWidth={3} className="text-white" />}
    </button>
  )
}

/* ------------------------------------------------------------- indicators */

const TONE_SUBTLE = {
  brand: 'bg-brand-subtle text-brand-text',
  gold: 'bg-gold-subtle text-gold-text',
  success: 'bg-success-subtle text-success-text',
  danger: 'bg-danger-subtle text-danger-text',
  neutral: 'bg-surface-subtle text-ink-secondary',
}

const TONE_DOT = {
  brand: 'bg-brand-solid',
  gold: 'bg-gold-solid',
  success: 'bg-success-solid',
  danger: 'bg-danger-solid',
  neutral: 'bg-ink-muted',
}

// Spelled out rather than derived from TONE_DOT: Tailwind's JIT scans for
// complete class strings, so a computed name would never reach the stylesheet.
const TONE_ICON = {
  brand: 'text-brand-solid',
  gold: 'text-gold-solid',
  success: 'text-success-solid',
  danger: 'text-danger-solid',
  neutral: 'text-ink-muted',
}

export function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-xs',
        TONE_SUBTLE[tone],
        className
      )}
    >
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />}
      {children}
    </span>
  )
}

export function PointsPill({ value, className, size = 'md' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border border-gold-border bg-gold-subtle text-gold-text',
        size === 'sm' ? 'px-2.5 py-1 text-label-xs' : 'px-3 py-1.5 text-label-sm',
        className
      )}
    >
      <Zap size={size === 'sm' ? 11 : 13} className="text-gold-solid" fill="currentColor" />
      {value}
    </span>
  )
}

export function TrendPill({ tone = 'success', icon: Icon, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-xs', TONE_SUBTLE[tone])}>
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {children}
    </span>
  )
}

export function IconTile({ icon: Icon, tone = 'brand', size = 36, iconSize = 16, className }) {
  return (
    <span
      className={cx('grid shrink-0 place-items-center rounded-[10px]', TONE_SUBTLE[tone], className)}
      style={{ width: size, height: size }}
    >
      <Icon size={iconSize} className={TONE_ICON[tone]} />
    </span>
  )
}

export function ProgressBar({ value, className, barClassName, style, height = 6 }) {
  return (
    <div
      className={cx('w-full overflow-hidden rounded-full bg-surface-subtle', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cx('h-full rounded-full transition-[width] duration-500 ease-smooth', barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, ...style }}
      />
    </div>
  )
}

/* --------------------------------------------------------------- avatars */

const AVATAR_SIZES = { xs: 26, sm: 30, md: 34, lg: 40, xl: 50 }

export function Avatar({ initials, color, size = 'md', ring, className, style }) {
  const px = AVATAR_SIZES[size] ?? size
  return (
    <span
      className={cx(
        'grid shrink-0 place-items-center rounded-full font-medium text-white',
        ring && 'ring-2',
        className
      )}
      style={{
        width: px,
        height: px,
        fontSize: px <= 28 ? 10 : px <= 34 ? 11.5 : 13,
        background: color ?? undefined,
        backgroundImage: color ? undefined : 'var(--brand-gradient)',
        ...style,
      }}
    >
      {initials}
    </span>
  )
}

export function AvatarStack({ people, size = 'sm', ringClass = 'ring-surface-base', className }) {
  const px = AVATAR_SIZES[size] ?? size
  return (
    <div className={cx('flex shrink-0', className)} style={{ paddingRight: (people.length - 1) * 4 }}>
      {people.map((p, i) => (
        <Avatar
          key={i}
          initials={p.initials}
          color={p.color}
          size={size}
          ring
          className={ringClass}
          style={{ marginLeft: i === 0 ? 0 : -px * 0.42, zIndex: people.length - i }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ tabs */

export function SegmentedTabs({ options, value, onChange, className, size = 'md' }) {
  return (
    <div className={cx('inline-flex gap-1 rounded-[11px] bg-surface-subtle p-1', className)}>
      {options.map((opt) => {
        const key = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const count = typeof opt === 'string' ? null : opt.count
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange?.(key)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-lg transition-all duration-200 ease-smooth',
              size === 'sm' ? 'px-3 py-1.5 text-label-xs' : 'px-3.5 py-2 text-label-sm',
              active
                ? 'bg-surface-base text-ink-primary shadow-elevation-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            )}
          >
            {label}
            {count != null && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-px font-mono text-[11px] leading-4',
                  active ? 'bg-brand-subtle text-brand-text' : 'bg-surface-base text-ink-muted'
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ChipRow({ options, value, onChange, className }) {
  return (
    <div className={cx('flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange?.(opt)}
            className={cx(
              'shrink-0 rounded-full px-3.5 py-2 text-label-xs transition-all duration-200 ease-smooth active:scale-95',
              active
                ? 'bg-brand-solid text-white'
                : 'bg-surface-base border border-stroke-subtle text-ink-secondary hover:text-ink-primary'
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------- modal and bottom sheet */

/**
 * Centred frosted modal on desktop, bottom sheet on mobile.
 * This is the single responsive behaviour the brief calls for on
 * Give Kudos and Confirm Redemption.
 */
export function Sheet({ open, onClose, title, subtitle, icon, footer, width = 580, children }) {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-[#08080d]/60 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative w-full bg-surface-base shadow-elevation-lg',
          'max-h-[92vh] overflow-y-auto',
          'rounded-t-[26px] animate-sheet-up',
          'md:rounded-[22px] md:border md:border-stroke-subtle md:animate-pop-in'
        )}
        style={{ maxWidth: isMobile ? '100%' : width }}
      >
        {/* mobile grabber */}
        <div className="flex justify-center pt-2.5 md:hidden">
          <span className="h-1 w-10 rounded-full bg-stroke-strong" />
        </div>

        <div className="flex items-center gap-3 px-5 pb-5 pt-4 md:px-6 md:pt-5 md:border-b md:border-stroke-subtle">
          {icon && (
            <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl" style={BRAND_GRADIENT}>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-heading-lg text-ink-primary md:text-heading-md">{title}</h2>
            {subtitle && <p className="text-body-sm text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-surface-subtle text-ink-secondary transition hover:text-ink-primary active:scale-95 md:rounded-[9px]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 pb-5 md:px-6 md:py-6">{children}</div>

        {footer && (
          <div className="sticky bottom-0 border-t border-stroke-subtle bg-surface-base px-5 py-4 md:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ empty state */

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-subtle">
        <Icon size={26} className="text-brand-solid" />
      </span>
      <h3 className="text-heading-sm text-ink-primary mt-4">{title}</h3>
      <p className="text-body-sm text-ink-muted mt-1.5 max-w-[38ch]">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Dropdown({ icon: Icon, children, className }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex h-10 items-center gap-2 rounded-[10px] border border-stroke-subtle bg-surface-base px-3.5',
        'text-label-sm text-ink-secondary transition-all duration-200 ease-smooth',
        'hover:text-ink-primary hover:border-stroke active:scale-[0.98]',
        className
      )}
    >
      {Icon && <Icon size={15} />}
      {children}
      <ChevronDown size={13} className="text-ink-muted" />
    </button>
  )
}

export function Divider({ className }) {
  return <div className={cx('h-px w-full bg-stroke-subtle', className)} />
}
