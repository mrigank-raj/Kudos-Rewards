/**
 * Screen 3 — Give Kudos
 * Frosted modal on desktop, bottom sheet on mobile, over the recipient dashboard.
 * Figma: "03 · Give Kudos"
 */
import { useState } from 'react'
import { Check, Search, Sparkles, Zap } from 'lucide-react'
import Screen2 from './Screen2'
import { Avatar, Badge, Button, Sheet, cx } from '../components/ui'
import { COLLEAGUES, POINT_PRESETS, RECIPIENT, VALUE_TAGS, formatPoints } from '../lib/data'

const MAX_MESSAGE = 280

export function GiveKudosSheet({ open, onClose }) {
  const [recipient, setRecipient] = useState(COLLEAGUES[0].name)
  const [message, setMessage] = useState(
    'Closed the Q3 renewal three weeks ahead of target. You made the whole quarter work.'
  )
  const [tags, setTags] = useState(['Teamwork'])
  const [points, setPoints] = useState(500)

  const toggleTag = (tag) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const balanceAfter = RECIPIENT.balance - (points || 0)
  const canSend = recipient && message.trim().length > 0 && balanceAfter >= 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Give Kudos"
      subtitle="Recognition posts to the company feed"
      icon={<Sparkles size={19} className="text-white" />}
      width={580}
      footer={
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block">
            <p className="font-mono text-[11px] leading-4 text-ink-muted">Balance after sending</p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-numeric-lg text-ink-primary">{formatPoints(balanceAfter)}</span>
              <span className="text-label-xs text-ink-muted">pts</span>
            </p>
          </div>
          <div className="flex flex-1 gap-2.5 sm:flex-none sm:ml-auto">
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 sm:flex-none" disabled={!canSend} onClick={onClose}>
              <Sparkles size={15} />
              Send Kudos
            </Button>
          </div>
        </div>
      }
    >
      {/* ------------------------------------------------------- recipient */}
      <p className="text-label-sm text-ink-primary">Who are you recognizing?</p>

      <div className="mt-2.5 flex h-11 items-center gap-2.5 rounded-xl border border-stroke-subtle bg-surface-subtle px-3.5">
        <Search size={15} className="text-ink-muted" />
        <input
          placeholder="Search your teammates"
          className="min-w-0 flex-1 bg-transparent text-body-sm text-ink-primary outline-none placeholder:text-ink-muted"
        />
      </div>

      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {COLLEAGUES.slice(0, 4).map((person) => {
          const selected = person.name === recipient
          return (
            <button
              key={person.name}
              type="button"
              onClick={() => setRecipient(person.name)}
              className={cx(
                'flex w-[86px] shrink-0 flex-col items-center gap-2 rounded-[13px] border px-2 py-3 md:w-auto',
                'transition-all duration-200 ease-smooth active:scale-[0.97]',
                selected
                  ? 'border-brand-solid bg-brand-subtle'
                  : 'border-stroke-subtle bg-surface-subtle hover:border-stroke'
              )}
            >
              <span className="relative">
                <Avatar initials={person.initials} color={person.color} size="lg" />
                {selected && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-brand-solid ring-2 ring-surface-base">
                    <Check size={10} strokeWidth={3} className="text-white" />
                  </span>
                )}
              </span>
              <span className={cx('text-label-xs', selected ? 'text-brand-text' : 'text-ink-primary')}>
                {person.first}
              </span>
              <span className="font-mono text-[11px] leading-3 text-ink-muted">{person.team}</span>
            </button>
          )
        })}
      </div>

      {/* --------------------------------------------------------- message */}
      <p className="mt-6 text-label-sm text-ink-primary">Your message</p>
      <div className="mt-2.5 rounded-xl border-[1.5px] border-brand-solid bg-surface-base p-3.5 shadow-focus-brand">
        <textarea
          rows={3}
          value={message}
          maxLength={MAX_MESSAGE}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-none bg-transparent text-body-md text-ink-primary outline-none placeholder:text-ink-muted"
          placeholder="Say what they did and why it mattered"
        />
        <p className="mt-1 text-right font-mono text-[11px] text-ink-muted">
          {message.length} / {MAX_MESSAGE}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {VALUE_TAGS.map((tag) => {
          const on = tags.includes(tag)
          return (
            <button key={tag} type="button" onClick={() => toggleTag(tag)} className="transition-transform active:scale-95">
              <Badge
                tone={on ? 'brand' : 'neutral'}
                className={cx('border', on ? 'border-brand-border' : 'border-stroke-subtle')}
              >
                {tag}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* ---------------------------------------------------------- points */}
      <div className="mt-6 flex items-center">
        <p className="text-label-sm text-ink-primary">Attach points</p>
        <span className="ml-auto font-mono text-[11px] text-ink-muted">Optional</span>
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-2.5">
        {POINT_PRESETS.map((amount) => {
          const on = points === amount
          return (
            <button
              key={amount}
              type="button"
              onClick={() => setPoints(amount)}
              className={cx(
                'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border text-label-sm',
                'transition-all duration-200 ease-smooth active:scale-[0.97]',
                on
                  ? 'border-[1.5px] border-gold-solid bg-gold-subtle text-gold-text'
                  : 'border-stroke-subtle bg-surface-subtle text-ink-secondary hover:text-ink-primary'
              )}
            >
              <Zap size={13} className={on ? 'text-gold-solid' : 'text-ink-muted'} fill={on ? 'currentColor' : 'none'} />
              {amount}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setPoints(0)}
          className={cx(
            'inline-flex h-11 items-center justify-center rounded-xl border text-label-sm',
            'transition-all duration-200 ease-smooth active:scale-[0.97]',
            points === 0
              ? 'border-[1.5px] border-gold-solid bg-gold-subtle text-gold-text'
              : 'border-stroke-subtle bg-surface-subtle text-ink-secondary hover:text-ink-primary'
          )}
        >
          Custom
        </button>
      </div>

      <p className="mt-4 text-center text-body-sm text-ink-muted sm:hidden">
        Balance after sending{' '}
        <span className="text-label-sm text-ink-primary">{formatPoints(balanceAfter)} pts</span>
      </p>
    </Sheet>
  )
}

export default function Screen3(props) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Screen2 {...props} onGiveKudos={() => setOpen(true)} />
      <GiveKudosSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}
