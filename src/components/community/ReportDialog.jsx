import { useEffect, useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { Button, Sheet, cx } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useReportContent } from '@/hooks/useCommunity'
import { REPORT_REASONS, friendlyError } from '@/lib/community'
import { Textarea } from './CommunityUI'

/** Report a post or comment to HR. `target` is { postId } or { commentId }. */
export default function ReportDialog({ target, onClose }) {
  const toast = useToast()
  const report = useReportContent()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  useEffect(() => {
    if (target) {
      setReason('')
      setDetails('')
    }
  }, [target])

  const submit = () =>
    report.mutate(
      { ...target, reason, details: details.trim() },
      {
        onSuccess: () => {
          toast.success('Thanks — HR will review this report')
          onClose()
        },
        onError: (e) => toast.error(friendlyError(e)),
      }
    )

  return (
    <Sheet
      open={!!target}
      onClose={report.isPending ? undefined : onClose}
      title={`Report ${target?.commentId ? 'comment' : 'post'}`}
      subtitle="Reports are only visible to you and HR."
      icon={<Flag size={17} className="text-white" />}
      width={500}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={report.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={!reason || report.isPending}>
            {report.isPending && <Loader2 size={14} className="animate-spin" />}
            Send report
          </Button>
        </div>
      }
    >
      <fieldset>
        <legend className="mb-2 text-label-sm text-ink-primary">What's wrong?</legend>
        <div className="grid gap-2" role="radiogroup">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={reason === r.value}
              onClick={() => setReason(r.value)}
              className={cx(
                'rounded-xl border px-3.5 py-2.5 text-left text-label-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40',
                reason === r.value ? 'border-brand-solid bg-brand-subtle text-brand-text' : 'border-stroke-subtle text-ink-primary hover:bg-surface-subtle'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="mb-2 block text-label-sm text-ink-primary">Details (optional)</span>
        <Textarea rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything that helps HR understand the problem" />
      </label>
    </Sheet>
  )
}
