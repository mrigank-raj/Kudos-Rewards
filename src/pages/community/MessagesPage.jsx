import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, isSameDay } from 'date-fns'
import { ArrowLeft, CheckCheck, Loader2, MessagesSquare, PenSquare, Send, ShieldCheck } from 'lucide-react'
import { Button, Card, EmptyState, SearchInput, Sheet, cx } from '@/components/ui'
import { CharCount, ErrorState, TimeAgo, UserAvatar } from '@/components/community/CommunityUI'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { useAreaBase } from '@/hooks/useCommunity'
import { useDirectory, useStartConversation } from '@/hooks/useCommunityPeople'
import { useConversationMessages, useConversations, useMarkConversationRead, useSendMessage } from '@/hooks/useMessages'
import { LIMITS, friendlyError } from '@/lib/community'

function NewConversationSheet({ open, onClose }) {
  const navigate = useNavigate()
  const base = useAreaBase()
  const toast = useToast()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const directory = useDirectory({ search: debounced })
  const start = useStartConversation()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const people = (directory.data?.pages.flat() || []).filter((p) => p.user_id !== profile?.id)

  return (
    <Sheet open={open} onClose={onClose} title="New message" subtitle="Message anyone in your organization" width={520}>
      <SearchInput autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search colleagues" aria-label="Search colleagues" />
      <div className="mt-3 max-h-[50vh] overflow-y-auto">
        {directory.isLoading ? (
          <p className="py-6 text-center text-body-sm text-ink-muted">Loading…</p>
        ) : people.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-ink-muted">No colleagues found.</p>
        ) : (
          <ul>
            {people.map((p) => (
              <li key={p.user_id}>
                <button
                  type="button"
                  disabled={start.isPending}
                  onClick={() =>
                    start.mutate(p.user_id, {
                      onSuccess: (id) => {
                        onClose()
                        navigate(`${base}/messages/${id}`)
                      },
                      onError: (e) => toast.error(friendlyError(e)),
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40"
                >
                  <UserAvatar user={{ name: p.name, avatar_url: p.avatar_url }} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-label-sm text-ink-primary">{p.name}</span>
                    <span className="block truncate text-body-sm text-ink-muted">{[p.job_title, p.team].filter(Boolean).join(' · ') || 'Team member'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  )
}

function ConversationList({ conversations, activeId, base }) {
  return (
    <ul className="divide-y divide-stroke-subtle">
      {conversations.map((c) => {
        const unread = Number(c.unread_count) > 0
        return (
          <li key={c.conversation_id}>
            <Link
              to={`${base}/messages/${c.conversation_id}`}
              aria-current={activeId === c.conversation_id ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-solid/40',
                activeId === c.conversation_id ? 'bg-brand-subtle/60' : 'hover:bg-surface-subtle'
              )}
            >
              <UserAvatar user={{ name: c.other_name, avatar_url: c.other_avatar_url }} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cx('truncate text-label-sm', unread ? 'text-ink-primary' : 'text-ink-secondary')}>{c.other_name}</span>
                  {c.last_message_at && <span className="ml-auto shrink-0 text-[11px] text-ink-muted"><TimeAgo date={c.last_message_at} /></span>}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={cx('truncate text-body-sm', unread ? 'font-medium text-ink-primary' : 'text-ink-muted')}>
                    {c.last_message_preview ?? 'No messages yet'}
                  </span>
                  {unread && (
                    <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-solid px-1.5 text-[11px] font-semibold text-white" aria-label={`${c.unread_count} unread`}>
                      {c.unread_count}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function Thread({ conversation, base }) {
  const { profile } = useAuth()
  const toast = useToast()
  const query = useConversationMessages(conversation.conversation_id)
  const send = useSendMessage(conversation.conversation_id)
  const markRead = useMarkConversationRead()
  const [body, setBody] = useState('')
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)
  const { mutate: markReadMutate } = markRead

  const messages = useMemo(() => [...(query.data?.pages.flat() || [])].reverse(), [query.data])
  const newestId = messages[messages.length - 1]?.id

  // Mark read on open and whenever a new message arrives while open.
  useEffect(() => {
    if (conversation.conversation_id && Number(conversation.unread_count) > 0) markReadMutate(conversation.conversation_id)
  }, [conversation.conversation_id, conversation.unread_count, newestId, markReadMutate])

  // Stick to the bottom for new messages (not when loading older ones).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [newestId])

  const submit = (e) => {
    e.preventDefault()
    const value = body.trim()
    if (!value || send.isPending) return
    if (value.length > LIMITS.messageMax) return toast.error(`Messages are limited to ${LIMITS.messageMax.toLocaleString()} characters.`)
    send.mutate(value, { onSuccess: () => setBody(''), onError: (err) => toast.error(friendlyError(err)) })
  }

  const lastMine = [...messages].reverse().find((m) => m.sender_id === profile?.id)
  const seen = lastMine && conversation.other_last_read_at && new Date(conversation.other_last_read_at) >= new Date(lastMine.created_at)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-stroke-subtle px-4 py-3">
        <Link to={`${base}/messages`} className="-ml-1 p-1 text-ink-secondary md:hidden" aria-label="Back to conversations"><ArrowLeft size={19} /></Link>
        <UserAvatar user={{ name: conversation.other_name, avatar_url: conversation.other_avatar_url }} size="md" />
        <div className="min-w-0">
          <Link to={`${base}/directory/${conversation.other_user_id}`} className="block truncate text-label-sm text-ink-primary hover:underline">{conversation.other_name}</Link>
          <p className="truncate text-body-sm text-ink-muted">
            {[conversation.other_job_title, conversation.other_team, conversation.other_role === 'admin' && 'HR'].filter(Boolean).join(' · ') || 'Team member'}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-label="Message history">
        {query.hasNextPage && (
          <div className="flex justify-center pb-2">
            <Button variant="ghost" size="sm" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
              {query.isFetchingNextPage && <Loader2 size={14} className="animate-spin" />} Load older messages
            </Button>
          </div>
        )}
        {query.isLoading ? (
          <p className="py-10 text-center text-body-sm text-ink-muted">Loading messages…</p>
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-label-sm text-ink-primary">Say hello to {conversation.other_name.split(' ')[0]}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-body-sm text-ink-muted"><ShieldCheck size={13} /> Only the two of you can read this conversation.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === profile?.id
            const prev = messages[i - 1]
            const newDay = !prev || !isSameDay(new Date(prev.created_at), new Date(m.created_at))
            return (
              <div key={m.id}>
                {newDay && (
                  <p className="py-3 text-center text-[11px] font-medium uppercase tracking-wide text-ink-muted">{format(new Date(m.created_at), 'EEE d MMM')}</p>
                )}
                <div className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cx(
                      'max-w-[80%] rounded-2xl px-3.5 py-2 text-body-md whitespace-pre-wrap break-words',
                      mine ? 'rounded-br-md text-white' : 'rounded-bl-md bg-surface-subtle text-ink-primary'
                    )}
                    style={mine ? { backgroundImage: 'var(--brand-gradient)' } : undefined}
                  >
                    <span className="sr-only">{mine ? 'You' : conversation.other_name}: </span>
                    {m.body}
                    <span className={cx('mt-0.5 block text-right text-[10px]', mine ? 'text-white/75' : 'text-ink-muted')}>
                      {format(new Date(m.created_at), 'HH:mm')}
                    </span>
                  </div>
                </div>
                {mine && m.id === lastMine?.id && seen && (
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-ink-muted"><CheckCheck size={12} /> Seen</p>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="border-t border-stroke-subtle p-3">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e)
            }}
            placeholder="Write a message…"
            title="Enter to send, Shift+Enter for a new line"
            aria-label="Message (Enter to send, Shift+Enter for a new line)"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-stroke bg-surface-base px-3.5 py-2.5 text-body-md text-ink-primary outline-none placeholder:text-ink-muted focus:border-brand-solid focus:shadow-focus-brand"
          />
          <Button type="submit" aria-label="Send message" disabled={!body.trim() || send.isPending} className="!h-11 !w-11 !px-0">
            {send.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
        {body.length > LIMITS.messageMax * 0.8 && <div className="mt-1 text-right"><CharCount value={body} max={LIMITS.messageMax} /></div>}
      </form>
    </div>
  )
}

export default function MessagesPage() {
  const { conversationId } = useParams()
  const base = useAreaBase()
  const [composing, setComposing] = useState(false)
  const query = useConversations()
  const conversations = query.data || []
  const active = conversations.find((c) => c.conversation_id === conversationId)

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-end gap-4 md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">Messages</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">Private one-to-one conversations with colleagues.</p>
        </div>
        <Button className="ml-auto" onClick={() => setComposing(true)}><PenSquare size={16} /> New message</Button>
      </div>

      <Card flush className="mt-0 overflow-hidden md:mt-6">
        <div className="grid h-[calc(100dvh-210px)] min-h-[440px] md:h-[calc(100dvh-260px)] md:grid-cols-[320px_minmax(0,1fr)]">
          <div className={cx('min-h-0 flex-col border-stroke-subtle md:flex md:border-r', conversationId ? 'hidden' : 'flex')}>
            <div className="flex items-center gap-2 border-b border-stroke-subtle px-4 py-3 md:hidden">
              <p className="text-label-md text-ink-primary">Conversations</p>
              <Button size="sm" className="ml-auto" onClick={() => setComposing(true)}><PenSquare size={14} /> New</Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {query.isLoading ? (
                <p className="p-6 text-center text-body-sm text-ink-muted">Loading conversations…</p>
              ) : query.isError ? (
                <div className="p-4"><ErrorState error={query.error} onRetry={query.refetch} /></div>
              ) : conversations.length === 0 ? (
                <EmptyState icon={MessagesSquare} title="No conversations yet" body="Message a colleague from their profile or start one here." action={<Button variant="secondary" onClick={() => setComposing(true)}>New message</Button>} />
              ) : (
                <ConversationList conversations={conversations} activeId={conversationId} base={base} />
              )}
            </div>
          </div>

          <div className={cx('min-h-0', conversationId ? 'block' : 'hidden md:block')}>
            {conversationId && active ? (
              <Thread key={active.conversation_id} conversation={active} base={base} />
            ) : conversationId && query.isLoading ? (
              <p className="p-10 text-center text-body-sm text-ink-muted">Loading…</p>
            ) : conversationId ? (
              <EmptyState icon={MessagesSquare} title="Conversation not found" body="It doesn't exist or you're not part of it." action={<Link to={`${base}/messages`} className="text-label-sm text-brand-text">Back to messages</Link>} />
            ) : (
              <div className="grid h-full place-items-center">
                <EmptyState icon={MessagesSquare} title="Select a conversation" body="Choose someone on the left, or start a new message." />
              </div>
            )}
          </div>
        </div>
      </Card>

      <NewConversationSheet open={composing} onClose={() => setComposing(false)} />
    </div>
  )
}
