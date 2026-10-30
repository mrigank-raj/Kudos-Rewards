import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNowStrict, format } from 'date-fns'
import { AlertTriangle, Award, CircleCheck, Loader2, RotateCcw } from 'lucide-react'
import { Avatar, Badge, Button, Sheet, cx } from '@/components/ui'
import { POST_TYPES, QUESTION_STATUS, initialsOf, parseRichText } from '@/lib/community'
import { BADGE_ICONS } from './badgeIcons'

/* Small, community-specific building blocks layered on src/components/ui. */


/** avatar_url doubles as a colour in seed data; render an image only for real URLs. */
export function UserAvatar({ user, size = 'md', className }) {
  const url = user?.avatar_url
  if (url && /^https?:\/\//.test(url)) {
    const px = { xs: 26, sm: 30, md: 34, lg: 40, xl: 50 }[size] ?? size
    return (
      <img
        src={url}
        alt=""
        className={cx('shrink-0 rounded-full object-cover', className)}
        style={{ width: px, height: px }}
        loading="lazy"
      />
    )
  }
  return <Avatar initials={initialsOf(user?.name)} color={url || undefined} size={size} className={className} />
}

export function PostTypeBadge({ type }) {
  const meta = POST_TYPES[type]
  if (!meta) return null
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function QuestionStatusBadge({ status }) {
  const meta = QUESTION_STATUS[status]
  if (!meta) return null
  return (
    <Badge tone={meta.tone} dot>
      {status === 'resolved' && <CircleCheck size={12} className="-ml-0.5" />}
      {meta.label}
    </Badge>
  )
}

export function TimeAgo({ date, className }) {
  if (!date) return null
  const d = new Date(date)
  return (
    <time dateTime={d.toISOString()} title={format(d, 'PPpp')} className={className}>
      {formatDistanceToNowStrict(d, { addSuffix: true })}
    </time>
  )
}

/** Safe lightweight formatting: paragraphs, bullet lists, code, links. No HTML injection. */
export function RichText({ text, className }) {
  const blocks = parseRichText(text)
  const inline = (parts) =>
    parts.map((p, i) => {
      if (p.type === 'code') {
        return (
          <code key={i} className="rounded bg-surface-subtle px-1 py-0.5 font-mono text-[0.85em] text-ink-primary">
            {p.text}
          </code>
        )
      }
      if (p.type === 'link') {
        return (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-text underline underline-offset-2 break-all">
            {p.text}
          </a>
        )
      }
      return <span key={i}>{p.text}</span>
    })

  return (
    <div className={cx('space-y-3 text-body-md text-ink-secondary break-words', className)}>
      {blocks.map((b, i) => {
        if (b.type === 'code') {
          return (
            <pre key={i} className="overflow-x-auto rounded-xl bg-surface-subtle p-3 font-mono text-[13px] leading-5 text-ink-primary">
              <code>{b.text}</code>
            </pre>
          )
        }
        if (b.type === 'list') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}
            </ul>
          )
        }
        return (
          <p key={i}>
            {b.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(line)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export function Textarea({ invalid, className, ...rest }) {
  return (
    <textarea
      className={cx(
        'w-full resize-y rounded-xl border bg-surface-base px-3.5 py-3 text-body-md text-ink-primary outline-none',
        'placeholder:text-ink-muted transition-all duration-200 ease-smooth',
        invalid
          ? 'border-danger-solid focus:shadow-focus-danger'
          : 'border-stroke focus:border-brand-solid focus:shadow-focus-brand',
        className
      )}
      {...rest}
    />
  )
}

export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-body-sm text-danger-text">
      {children}
    </p>
  )
}

export function CharCount({ value, max }) {
  const n = (value || '').length
  return <span className={cx('font-mono text-[11px]', n > max ? 'text-danger-text' : 'text-ink-muted')}>{n.toLocaleString()}/{max.toLocaleString()}</span>
}

/* ------------------------------------------------------------ async states */

export function LoadingCards({ count = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-stroke-subtle bg-surface-base p-5">
          <div className="flex items-center gap-3">
            <div className="h-[34px] w-[34px] rounded-full bg-surface-subtle" />
            <div className="h-3 w-40 rounded bg-surface-subtle" />
          </div>
          <div className="mt-4 h-4 w-3/4 rounded bg-surface-subtle" />
          <div className="mt-2 h-3 w-full rounded bg-surface-subtle" />
          <div className="mt-2 h-3 w-2/3 rounded bg-surface-subtle" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ title = "Couldn't load this", error, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-danger-border bg-danger-subtle/40 px-6 py-10 text-center">
      <AlertTriangle size={24} className="text-danger-solid" />
      <h3 className="mt-3 text-heading-sm text-ink-primary">{title}</h3>
      {error?.message && <p className="mt-1 max-w-[46ch] text-body-sm text-ink-muted">{error.message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCcw size={14} /> Try again
        </Button>
      )}
    </div>
  )
}

export function LoadMore({ query, label = 'Load more' }) {
  // Auto-load when the sentinel scrolls into view; the button stays as a
  // keyboard/no-IntersectionObserver fallback.
  const ref = useRef(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query

  useEffect(() => {
    if (!hasNextPage || !ref.current || typeof IntersectionObserver === 'undefined') return
    const el = ref.current
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage()
    }, { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (!hasNextPage) return null
  return (
    <div ref={ref} className="flex justify-center py-4">
      <Button variant="secondary" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
        {isFetchingNextPage ? <Loader2 size={14} className="animate-spin" /> : null}
        {isFetchingNextPage ? 'Loading…' : label}
      </Button>
    </div>
  )
}

/* ---------------------------------------------------------------- dialogs */

/**
 * Confirmation for destructive actions. With `requireReason`, collects a
 * short reason (used for moderation) and passes it to onConfirm.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm', danger = false, pending = false, requireReason = false, reasonLabel = 'Reason' }) {
  const [reason, setReason] = useState('')
  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const canConfirm = !pending && (!requireReason || reason.trim().length >= 3)

  return (
    <Sheet
      open={open}
      onClose={pending ? undefined : onClose}
      title={title}
      width={460}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button
            variant={danger ? 'secondary' : 'primary'}
            className={danger ? '!border-danger-border !bg-danger-solid !text-white hover:!brightness-110' : undefined}
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {body && <p className="text-body-md text-ink-secondary">{body}</p>}
      {requireReason && (
        <label className="mt-4 block">
          <span className="mb-2 block text-label-sm text-ink-primary">{reasonLabel}</span>
          <Textarea rows={3} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} autoFocus />
        </label>
      )}
    </Sheet>
  )
}

export function BadgeChip({ badge }) {
  const Icon = BADGE_ICONS[badge.icon] || Award
  return (
    <span title={badge.description} className="inline-flex items-center gap-1.5 rounded-full border border-gold-border bg-gold-subtle px-2.5 py-1 text-label-xs text-gold-text">
      <Icon size={12} className="text-gold-solid" />
      {badge.name}
    </span>
  )
}

export function PersonLink({ base, user, className, children }) {
  if (!user?.id) return <span className={className}>{children ?? 'Former colleague'}</span>
  return (
    <Link to={`${base}/directory/${user.id}`} className={cx('hover:underline underline-offset-2', className)}>
      {children ?? user.name}
    </Link>
  )
}

const LINK_BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-all duration-200 ease-smooth ' +
  'active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas'
const LINK_BUTTON_VARIANTS = {
  primary: 'text-white shadow-glow-brand hover:brightness-110',
  secondary: 'bg-surface-base text-ink-primary border border-stroke hover:bg-surface-subtle',
  ghost: 'bg-surface-subtle text-ink-secondary hover:text-ink-primary',
}
const LINK_BUTTON_SIZES = { sm: 'h-9 px-3.5 text-label-sm', md: 'h-11 px-[18px] text-label-sm' }

/** A router Link styled like ui/Button (avoids nesting <button> inside <a>). */
export function LinkButton({ to, variant = 'primary', size = 'md', className, children, ...rest }) {
  return (
    <Link
      to={to}
      className={cx(LINK_BUTTON_BASE, LINK_BUTTON_SIZES[size], LINK_BUTTON_VARIANTS[variant], className)}
      style={variant === 'primary' ? { backgroundImage: 'var(--brand-gradient)' } : undefined}
      {...rest}
    >
      {children}
    </Link>
  )
}
