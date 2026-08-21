import { useState } from 'react'
import { Check, Search, Sparkles, Zap } from 'lucide-react'
import { Avatar, Badge, Button, Sheet, cx } from '@/components/ui'
import { useKudos } from '@/hooks/useKudos'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/context/ToastContext'

const MAX_MESSAGE = 280
const POINT_PRESETS = [100, 250, 500]
const VALUE_TAGS = ['Teamwork', 'Innovation', 'Impact', 'Leadership']

export default function GiveKudosModal({ isOpen, onClose }) {
  const [toUserId, setToUserId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')
  const [tags, setTags] = useState(['Teamwork'])
  const [points, setPoints] = useState(500)

  const { recipients, loadingRecipients, sendKudos, isSending } = useKudos()
  const { profile } = useAuth()
  const { addToast } = useToast()

  const maxPoints = profile?.points_balance || 0
  const balanceAfter = maxPoints - (points || 0)
  const canSend = toUserId && message.trim().length > 0 && balanceAfter >= 0 && !isSending

  const toggleTag = (tag) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const filteredRecipients = (recipients || []).filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!canSend) return

    try {
      // We append tags to the message since the DB schema doesn't have a tags column yet
      const finalMessage = tags.length > 0 
        ? `${message}\n\nTags: ${tags.join(', ')}`
        : message

      await sendKudos({ 
        toUserId, 
        message: finalMessage, 
        points: points || 0 
      })
      
      addToast('success', 'Kudos sent successfully!')
      
      // Reset form
      setToUserId('')
      setMessage('')
      setPoints(500)
      setTags(['Teamwork'])
      onClose()
    } catch (err) {
      console.error(err)
      addToast('error', err.message || 'Failed to send Kudos')
    }
  }

  // Format points helper
  const formatPoints = (p) => p.toLocaleString()

  return (
    <Sheet
      open={isOpen}
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
              <span className={cx("text-numeric-lg", balanceAfter < 0 ? "text-danger-text" : "text-ink-primary")}>
                {formatPoints(balanceAfter)}
              </span>
              <span className="text-label-xs text-ink-muted">pts</span>
            </p>
          </div>
          <div className="flex flex-1 gap-2.5 sm:flex-none sm:ml-auto">
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button className="flex-1 sm:flex-none" disabled={!canSend} onClick={handleSubmit}>
              <Sparkles size={15} />
              {isSending ? 'Sending...' : 'Send Kudos'}
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your teammates"
          className="min-w-0 flex-1 bg-transparent text-body-sm text-ink-primary outline-none placeholder:text-ink-muted"
        />
      </div>

      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] md:grid md:grid-cols-4 md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {loadingRecipients ? (
          <p className="text-body-sm text-ink-muted px-2 py-4">Loading team members...</p>
        ) : filteredRecipients.length === 0 ? (
          <p className="text-body-sm text-ink-muted px-2 py-4">No matching teammates found.</p>
        ) : (
          filteredRecipients.slice(0, 4).map((person) => {
            const selected = person.id === toUserId
            const initials = (person.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setToUserId(person.id)}
                className={cx(
                  'flex w-[86px] shrink-0 flex-col items-center gap-2 rounded-[13px] border px-2 py-3 md:w-auto',
                  'transition-all duration-200 ease-smooth active:scale-[0.97]',
                  selected
                    ? 'border-brand-solid bg-brand-subtle'
                    : 'border-stroke-subtle bg-surface-subtle hover:border-stroke'
                )}
              >
                <span className="relative">
                  <Avatar initials={initials} color={person.avatar_url} size="lg" />
                  {selected && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-brand-solid ring-2 ring-surface-base">
                      <Check size={10} strokeWidth={3} className="text-white" />
                    </span>
                  )}
                </span>
                <span className={cx('text-label-xs truncate w-full text-center', selected ? 'text-brand-text' : 'text-ink-primary')}>
                  {(person.name || 'User').split(' ')[0]}
                </span>
                <span className="font-mono text-[11px] leading-3 text-ink-muted truncate w-full text-center">Team</span>
              </button>
            )
          })
        )}
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
            points !== null && !POINT_PRESETS.includes(points)
              ? 'border-[1.5px] border-gold-solid bg-gold-subtle text-gold-text'
              : 'border-stroke-subtle bg-surface-subtle text-ink-secondary hover:text-ink-primary'
          )}
        >
          Custom
        </button>
      </div>
      
      {points !== null && !POINT_PRESETS.includes(points) && (
        <div className="mt-3">
          <input 
            type="number"
            min="0"
            max={maxPoints}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
            className="w-full h-11 rounded-xl border border-stroke-subtle bg-surface-subtle px-3.5 text-body-sm text-ink-primary outline-none focus:border-brand-solid focus:ring-1 focus:ring-brand-solid"
            placeholder="Enter custom points amount"
          />
        </div>
      )}

      <p className="mt-4 text-center text-body-sm text-ink-muted sm:hidden">
        Balance after sending{' '}
        <span className={cx("text-label-sm", balanceAfter < 0 ? "text-danger-text" : "text-ink-primary")}>
          {formatPoints(balanceAfter)} pts
        </span>
      </p>
    </Sheet>
  )
}
