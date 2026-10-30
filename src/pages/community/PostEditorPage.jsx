import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleHelp, Lightbulb, Loader2, Megaphone, MessagesSquare, ShieldAlert } from 'lucide-react'
import { Button, Card, EmptyState, Field, Input, cx } from '@/components/ui'
import { CharCount, ErrorState, FieldError, LoadingCards, Textarea } from '@/components/community/CommunityUI'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { useAreaBase, useCategories, useCreatePost, usePost, useUpdatePost } from '@/hooks/useCommunity'
import { LIMITS, POST_TYPES, friendlyError, parseTags, validatePost } from '@/lib/community'

const TYPE_ICONS = { question: CircleHelp, discussion: MessagesSquare, tip: Lightbulb, announcement: Megaphone }
const TYPE_HINTS = {
  question: 'You need help with something specific. You can accept the answer that solves it.',
  discussion: 'Open-ended conversation, opinions or ideas.',
  tip: 'Share something useful you learned. Tips appreciated by 3+ colleagues earn reputation.',
  announcement: 'Official HR communication, highlighted in the feed.',
}

const PLACEHOLDERS = {
  question: { title: 'e.g. How do I request access to the analytics warehouse?', body: 'What are you trying to do, what have you tried, and where are you stuck?' },
  discussion: { title: 'e.g. How do your teams run async stand-ups?', body: 'Give some context and what you would like to hear from others.' },
  tip: { title: 'e.g. Use saved searches to triage tickets faster', body: 'Explain the tip and when it helps. Use ``` for code blocks and - for lists.' },
  announcement: { title: 'e.g. Benefits enrolment opens on Monday', body: 'What is happening, who it affects, and what people need to do.' },
}

export default function PostEditorPage({ initialType }) {
  const { postId } = useParams()
  const isEdit = !!postId
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const base = useAreaBase()
  const toast = useToast()
  const { profile } = useAuth()
  const canAnnounce = profile?.role === 'admin'

  const { data: categories = [], isLoading: loadingCategories, isError: categoriesError, refetch: refetchCategories } = useCategories()
  const existing = usePost(postId)
  const createPost = useCreatePost()
  const updatePost = useUpdatePost()

  const startType = initialType || params.get('type')
  const [draft, setDraft] = useState({
    type: POST_TYPES[startType] && (startType !== 'announcement' || canAnnounce) ? startType : 'question',
    categoryId: '',
    title: '',
    body: '',
    tags: '',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  // Prefill when editing.
  useEffect(() => {
    if (isEdit && existing.data) {
      setDraft({
        type: existing.data.type,
        categoryId: existing.data.category_id,
        title: existing.data.title,
        body: existing.data.body,
        tags: (existing.data.tags || []).join(', '),
      })
    }
  }, [isEdit, existing.data])

  const types = useMemo(() => Object.keys(POST_TYPES).filter((t) => t !== 'announcement' || canAnnounce), [canAnnounce])
  const pending = createPost.isPending || updatePost.isPending
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e?.target ? e.target.value : e }))

  // Re-validate as the user types once they've tried to submit.
  useEffect(() => {
    if (submitted) setErrors(validatePost(draft, { canAnnounce }).errors)
  }, [draft, submitted, canAnnounce])

  const onSubmit = (e) => {
    e.preventDefault()
    if (pending) return
    setSubmitted(true)
    const { errors: errs, value } = validatePost(draft, { canAnnounce })
    setErrors(errs)
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0]
      document.getElementById(`post-${first}`)?.focus()
      return
    }

    if (isEdit) {
      updatePost.mutate(
        { id: postId, value },
        {
          onSuccess: () => {
            toast.success('Post updated')
            navigate(`${base}/community/post/${postId}`)
          },
          onError: (err) => toast.error(friendlyError(err)),
        }
      )
    } else {
      createPost.mutate(value, {
        onSuccess: (row) => {
          toast.success(value.type === 'question' ? 'Question posted — colleagues will be able to help' : 'Post published')
          navigate(`${base}/community/post/${row.id}`, { replace: true })
        },
        onError: (err) => toast.error(friendlyError(err)),
      })
    }
  }

  if (isEdit && existing.isLoading) return <div className="mx-auto max-w-[760px]"><LoadingCards count={1} /></div>
  if (isEdit && existing.isError) return <div className="mx-auto max-w-[760px]"><ErrorState error={existing.error} onRetry={existing.refetch} /></div>
  if (isEdit && (!existing.data || existing.data.author_id !== profile?.id)) {
    return (
      <Card className="mx-auto max-w-[760px]">
        <EmptyState icon={ShieldAlert} title="You can't edit this post" body="Only the author can edit a post. It may also have been deleted." action={<Link to={`${base}/community`} className="text-label-sm text-brand-text">Back to community</Link>} />
      </Card>
    )
  }

  const ph = PLACEHOLDERS[draft.type]
  const tagPreview = parseTags(draft.tags)

  return (
    <div className="mx-auto max-w-[760px] animate-fade-in">
      <Link to={isEdit ? `${base}/community/post/${postId}` : `${base}/community`} className="inline-flex items-center gap-1.5 text-label-sm text-ink-secondary hover:text-ink-primary">
        <ArrowLeft size={15} /> {isEdit ? 'Back to post' : 'Back to community'}
      </Link>
      <h1 className="mt-3 text-display-lg text-ink-primary">
        {isEdit ? 'Edit post' : draft.type === 'question' ? 'Ask for help' : 'Create a post'}
      </h1>
      <p className="mt-1.5 text-body-md text-ink-secondary">
        {isEdit ? 'Update the title, description, category or tags.' : 'Posts are visible to everyone in your organization.'}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6">
        <Card className="space-y-6">
          {!isEdit && (
            <fieldset>
              <legend className="mb-2 text-label-sm text-ink-primary">What kind of post is this?</legend>
              <div id="post-type" tabIndex={-1} className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                {types.map((t) => {
                  const Icon = TYPE_ICONS[t]
                  const active = draft.type === t
                  return (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setDraft((d) => ({ ...d, type: t }))}
                      className={cx(
                        'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40',
                        active ? 'border-brand-solid bg-brand-subtle' : 'border-stroke-subtle hover:bg-surface-subtle'
                      )}
                    >
                      <Icon size={18} className={active ? 'text-brand-solid' : 'text-ink-muted'} />
                      <span className={cx('text-label-sm', active ? 'text-brand-text' : 'text-ink-primary')}>{POST_TYPES[t].label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-body-sm text-ink-muted">{TYPE_HINTS[draft.type]}</p>
              <FieldError>{errors.type}</FieldError>
            </fieldset>
          )}

          <div>
            <Field label="Category">
              {loadingCategories ? (
                <p className="text-body-sm text-ink-muted">Loading categories…</p>
              ) : categoriesError ? (
                <button type="button" onClick={() => refetchCategories()} className="text-body-sm text-danger-text underline">Couldn't load categories — retry</button>
              ) : (
                <select
                  id="post-categoryId"
                  value={draft.categoryId}
                  onChange={set('categoryId')}
                  aria-invalid={!!errors.categoryId}
                  aria-describedby="post-categoryId-error"
                  className={cx(
                    'h-[46px] w-full rounded-xl border bg-surface-base px-3 text-body-md text-ink-primary outline-none transition',
                    errors.categoryId ? 'border-danger-solid' : 'border-stroke focus:border-brand-solid focus:shadow-focus-brand'
                  )}
                >
                  <option value="">Choose a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </Field>
            <FieldError id="post-categoryId-error">{errors.categoryId}</FieldError>
          </div>

          <div>
            <Field label="Title" hint={<CharCount value={draft.title} max={LIMITS.titleMax} />}>
              <Input
                id="post-title"
                value={draft.title}
                onChange={set('title')}
                placeholder={ph.title}
                maxLength={LIMITS.titleMax + 20}
                invalid={!!errors.title}
                aria-invalid={!!errors.title}
                aria-describedby="post-title-error"
              />
            </Field>
            <FieldError id="post-title-error">{errors.title}</FieldError>
          </div>

          <div>
            <Field label="Description" hint={<CharCount value={draft.body} max={LIMITS.bodyMax} />}>
              <Textarea
                id="post-body"
                rows={9}
                value={draft.body}
                onChange={set('body')}
                placeholder={ph.body}
                invalid={!!errors.body}
                aria-invalid={!!errors.body}
                aria-describedby="post-body-help post-body-error"
              />
            </Field>
            <p id="post-body-help" className="mt-1.5 text-body-sm text-ink-muted">
              Formatting: blank line for paragraphs, <code className="font-mono">-</code> for bullets, <code className="font-mono">`code`</code> and <code className="font-mono">```</code> blocks. Links are clickable.
            </p>
            <FieldError id="post-body-error">{errors.body}</FieldError>
          </div>

          <div>
            <Field label="Tags (optional)" hint={<span className="text-[11px] font-mono text-ink-muted">{tagPreview.length}/{LIMITS.tagsMax}</span>}>
              <Input id="post-tags" value={draft.tags} onChange={set('tags')} placeholder="e.g. excel, onboarding, vpn" invalid={!!errors.tags} aria-describedby="post-tags-error" />
            </Field>
            {tagPreview.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tagPreview.map((t) => <span key={t} className="rounded-full bg-brand-subtle px-2 py-0.5 text-label-xs text-brand-text">#{t}</span>)}
              </div>
            )}
            <FieldError id="post-tags-error">{errors.tags}</FieldError>
          </div>

          <p className="rounded-xl bg-surface-subtle px-3.5 py-3 text-body-sm text-ink-muted">
            Attachments aren't supported yet — link to shared documents instead. Don't post passwords, customer data or anything confidential.
          </p>
        </Card>

        <div className="mt-4 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => navigate(-1)} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 size={15} className="animate-spin" />}
            {isEdit ? 'Save changes' : draft.type === 'question' ? 'Post question' : 'Publish'}
          </Button>
        </div>
      </form>
    </div>
  )
}
