/**
 * Screen 5 — Redeem confirmation
 * Shows the arithmetic before spending so nobody redeems by accident.
 * Figma: "05 · Redeem Confirmation"
 */
import { useState } from 'react'
import { ArrowRight, Coffee, Film, Headphones, Mail, Package, Shield, Shirt, Sparkles, Sun, Utensils, Zap } from 'lucide-react'
import Screen4 from './Screen4'
import { Button, Divider, Sheet } from '../components/ui'
import { RECIPIENT, REWARDS, formatPoints } from '../lib/data'

const ICONS = { Coffee, Utensils, Package, Film, Shirt, Headphones, Sparkles, Sun }

export function RedeemSheet({ open, onClose, reward }) {
  if (!reward) return null
  const Icon = ICONS[reward.icon]
  const after = RECIPIENT.balance - reward.cost

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Confirm redemption"
      width={470}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto">
            Cancel
          </Button>
          <Button onClick={onClose} className="sm:w-auto">
            Confirm redemption
            <ArrowRight size={15} />
          </Button>
        </div>
      }
    >
      {/* product */}
      <div className="flex items-center gap-3.5 rounded-2xl bg-surface-subtle p-3.5">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-[13px]"
          style={{ backgroundImage: `linear-gradient(135deg, ${reward.from} 0%, ${reward.to} 100%)` }}
        >
          <Icon size={24} className="text-white/95" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-label-md text-ink-primary md:text-heading-sm">{reward.title}</p>
          <p className="mt-0.5 truncate text-body-sm text-ink-muted">{reward.desc} · Digital delivery</p>
        </div>
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 md:flex">
          <Zap size={15} className="text-gold-solid" fill="currentColor" />
          <span className="text-numeric-lg text-ink-primary">{formatPoints(reward.cost)}</span>
        </span>
      </div>

      {/* the maths */}
      <div className="mt-5 rounded-2xl border border-stroke-subtle px-4">
        <Row label="Current balance" value={`${formatPoints(RECIPIENT.balance)} pts`} />
        <Divider />
        <Row label="Reward cost" value={`−${formatPoints(reward.cost)} pts`} tone="text-danger-text" />
        <Divider />
        <Row label="New balance" value={`${formatPoints(after)} pts`} emphasis />
      </div>

      {/* reassurance */}
      <ul className="mt-4 space-y-2.5">
        <li className="flex items-center gap-2.5 text-body-sm text-ink-muted">
          <Mail size={15} className="shrink-0" />
          Code emailed to {RECIPIENT.email} within 5 minutes
        </li>
        <li className="flex items-center gap-2.5 text-body-sm text-ink-muted">
          <Shield size={15} className="shrink-0" />
          Redemptions are final and logged to the ledger
        </li>
      </ul>
    </Sheet>
  )
}

function Row({ label, value, tone, emphasis }) {
  return (
    <div className="flex items-center py-3.5">
      <span className={emphasis ? 'text-label-md text-ink-primary' : 'text-body-md text-ink-secondary'}>{label}</span>
      <span className={`ml-auto ${emphasis ? 'text-numeric-lg text-ink-primary' : `text-label-md ${tone ?? 'text-ink-primary'}`}`}>
        {value}
      </span>
    </div>
  )
}

export default function Screen5(props) {
  const [reward, setReward] = useState(REWARDS[0])
  const [open, setOpen] = useState(true)

  return (
    <>
      <Screen4
        {...props}
        onRedeem={(r) => {
          setReward(r)
          setOpen(true)
        }}
      />
      <RedeemSheet open={open} onClose={() => setOpen(false)} reward={reward} />
    </>
  )
}
