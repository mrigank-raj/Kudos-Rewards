import { useMemo, useState } from 'react'
import { Check, Gift, X, Zap } from 'lucide-react'
import { Avatar, Badge, Card, SegmentedTabs, cx } from '@/components/ui'
import { useAllRedemptions, useUpdateRedemptionStatus } from '@/hooks/useRedemptions'
import { useToast } from '@/context/ToastContext'

const STATUS_TONE = { pending: 'gold', fulfilled: 'success', cancelled: 'danger' }
const formatPoints = (p) => (p || 0).toLocaleString()

export default function RedemptionsPage() {
  const { data: rawRedemptions, isLoading } = useAllRedemptions()
  const updateStatus = useUpdateRedemptionStatus()
  const toast = useToast()

  const [filter, setFilter] = useState('pending')
  const [actingId, setActingId] = useState(null)

  const redemptions = useMemo(() => {
    return (rawRedemptions || []).map((r) => ({
      id: r.id,
      status: r.status,
      pointsSpent: r.points_spent,
      createdAt: new Date(r.created_at),
      itemName: r.catalog_items?.name || 'Unknown reward',
      userName: r.users?.name || 'Unknown',
      userEmail: r.users?.email,
      initials: (r.users?.name || 'User').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      color: r.users?.avatar_url,
    }))
  }, [rawRedemptions])

  const counts = useMemo(() => ({
    pending: redemptions.filter((r) => r.status === 'pending').length,
    fulfilled: redemptions.filter((r) => r.status === 'fulfilled').length,
    cancelled: redemptions.filter((r) => r.status === 'cancelled').length,
    all: redemptions.length,
  }), [redemptions])

  const visible = filter === 'all' ? redemptions : redemptions.filter((r) => r.status === filter)

  const handleAction = async (redemptionId, status) => {
    setActingId(redemptionId)
    try {
      await updateStatus.mutateAsync({ redemptionId, status })
      toast.success(status === 'fulfilled' ? 'Marked as fulfilled.' : 'Redemption cancelled.')
    } catch (err) {
      toast.error(err.message || 'Failed to update redemption.')
    } finally {
      setActingId(null)
    }
  }

  const tabs = ['pending', 'fulfilled', 'cancelled', 'all'].map((key) => ({
    value: key,
    label: key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1),
    count: counts[key],
  }))

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-center md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">Redemptions</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            Review and fulfill reward redemptions across the workspace.
          </p>
        </div>
      </div>

      <SegmentedTabs className="mt-2 md:mt-6" options={tabs} value={filter} onChange={setFilter} />

      <Card flush className="mt-4 md:mt-5 overflow-hidden">
        <div className="border-t border-stroke-subtle first:border-t-0">
          {isLoading ? (
            <div className="py-10 text-center text-ink-muted">Loading redemptions...</div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-subtle">
                <Gift size={24} className="text-brand-solid" />
              </span>
              <h3 className="mt-4 text-heading-sm text-ink-primary">
                {filter === 'pending' ? 'Nothing waiting on you' : `No ${filter === 'all' ? '' : filter} redemptions`}
              </h3>
              <p className="mt-1.5 text-body-sm text-ink-muted">
                {filter === 'pending' ? 'New redemptions will show up here for approval.' : 'Try a different filter.'}
              </p>
            </div>
          ) : (
            visible.map((r, i) => (
              <div
                key={r.id}
                className={cx('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center', i > 0 && 'border-t border-stroke-subtle')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar initials={r.initials} color={r.color} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-label-sm text-ink-primary">{r.userName}</p>
                    <p className="truncate text-body-sm text-ink-muted">{r.userEmail}</p>
                  </div>
                </div>

                <div className="min-w-0 sm:ml-4">
                  <p className="truncate text-label-sm text-ink-primary">{r.itemName}</p>
                  <p className="flex items-center gap-1.5 text-body-sm text-ink-muted">
                    <Zap size={12} className="text-gold-solid" fill="currentColor" />
                    {formatPoints(r.pointsSpent)} pts · {r.createdAt.toLocaleDateString()}
                  </p>
                </div>

                <div className="ml-0 flex items-center gap-2 sm:ml-auto">
                  <Badge tone={STATUS_TONE[r.status]} dot className="capitalize">
                    {r.status}
                  </Badge>

                  {r.status === 'pending' && (
                    <div className="ml-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAction(r.id, 'fulfilled')}
                        disabled={actingId === r.id}
                        aria-label={`Mark ${r.itemName} for ${r.userName} as fulfilled`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success-subtle px-2.5 text-label-xs text-success-text transition active:scale-95 disabled:opacity-50"
                      >
                        <Check size={13} />
                        Fulfill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(r.id, 'cancelled')}
                        disabled={actingId === r.id}
                        aria-label={`Cancel ${r.itemName} for ${r.userName}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-danger-subtle px-2.5 text-label-xs text-danger-text transition active:scale-95 disabled:opacity-50"
                      >
                        <X size={13} />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
