import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bookmark, CircleHelp, FileText, Lightbulb, MessagesSquare, PenSquare, Search, Tag, X } from 'lucide-react'
import { Card, Dropdown, EmptyState, SearchInput, SectionTitle, SegmentedTabs } from '@/components/ui'
import PostCard from '@/components/community/PostCard'
import { ErrorState, LinkButton, LoadMore, LoadingCards, TimeAgo } from '@/components/community/CommunityUI'
import { useAuth } from '@/hooks/useAuth'
import { useAreaBase, useCategories, useFeed, useSavedPosts } from '@/hooks/useCommunity'
import { FEED_FILTERS } from '@/lib/community'

const COPY = {
  feed: { title: 'Community', subtitle: 'Ask questions, share what you know, and help colleagues across the organization.' },
  mine: { title: 'My posts', subtitle: 'Everything you have asked or shared, including posts HR has hidden.' },
  saved: { title: 'Saved posts', subtitle: 'Discussions you bookmarked to come back to.' },
}

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function HelpSidebar({ base }) {
  const unanswered = useFeed({ filter: 'unanswered' })
  const items = unanswered.data?.pages?.[0]?.slice(0, 5) || []

  return (
    <aside className="hidden space-y-4 lg:block">
      <Card>
        <SectionTitle title="Get started" />
        <div className="mt-4 grid gap-2">
          <Link to={`${base}/community/ask`} className="flex items-center gap-3 rounded-xl border border-stroke-subtle p-3 transition hover:bg-surface-subtle">
            <CircleHelp size={18} className="text-brand-solid" />
            <span>
              <span className="block text-label-sm text-ink-primary">Ask for help</span>
              <span className="block text-body-sm text-ink-muted">Get unstuck with input from colleagues</span>
            </span>
          </Link>
          <Link to={`${base}/community/new?type=tip`} className="flex items-center gap-3 rounded-xl border border-stroke-subtle p-3 transition hover:bg-surface-subtle">
            <Lightbulb size={18} className="text-gold-solid" />
            <span>
              <span className="block text-label-sm text-ink-primary">Share a tip</span>
              <span className="block text-body-sm text-ink-muted">Something that saved you time</span>
            </span>
          </Link>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Help someone today" subtitle="Questions still waiting for an answer" />
        <div className="mt-3">
          {unanswered.isLoading ? (
            <p className="py-3 text-body-sm text-ink-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-3 text-body-sm text-ink-muted">Every question has an answer. Nice work, team.</p>
          ) : (
            <ul className="divide-y divide-stroke-subtle">
              {items.map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link to={`${base}/community/post/${p.id}`} className="line-clamp-2 text-label-sm text-ink-primary hover:text-brand-text">
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-body-sm text-ink-muted">
                    {p.author?.name} · <TimeAgo date={p.created_at} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </aside>
  )
}

export default function CommunityFeedPage({ mode = 'feed' }) {
  const base = useAreaBase()
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const filter = params.get('filter') || 'latest'
  const tag = params.get('tag') || ''
  const categoryId = params.get('category') || ''
  const [searchInput, setSearchInput] = useState(params.get('q') || '')
  const search = useDebounced(searchInput)

  const { data: categories = [] } = useCategories()

  // Keep the URL in sync so filters survive refresh and can be shared.
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (search.trim()) next.set('q', search.trim())
    else next.delete('q')
    if (next.toString() !== params.toString()) setParams(next, { replace: true })
  }, [search, params, setParams])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const feedQuery = useFeed({ mode: mode === 'saved' ? 'feed' : mode, filter: mode === 'feed' ? filter : 'latest', categoryId, search, tag })
  const savedQuery = useSavedPosts()
  const query = mode === 'saved' ? savedQuery : feedQuery

  const posts = useMemo(() => {
    const pages = query.data?.pages || []
    if (mode === 'saved') return pages.flat().map((row) => row.post).filter(Boolean)
    return pages.flat()
  }, [query.data, mode])

  const departmentUnavailable = mode === 'feed' && filter === 'department' && !profile?.team
  const copy = COPY[mode]
  const filtersActive = !!(search || tag || categoryId)

  const categoryOptions = [{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="hidden text-display-lg text-ink-primary md:block">{copy.title}</h1>
          <p className="text-body-md text-ink-secondary md:mt-1.5">{copy.subtitle}</p>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <LinkButton to={`${base}/community/new`} variant="secondary" size="md"><PenSquare size={16} /> New post</LinkButton>
          <LinkButton to={`${base}/community/ask`} size="md"><CircleHelp size={16} /> Ask for help</LinkButton>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {mode !== 'saved' && (
            <div className="space-y-3">
              {mode === 'feed' && (
                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
                  <SegmentedTabs
                    options={FEED_FILTERS}
                    value={filter}
                    onChange={(v) => setParam('filter', v === 'latest' ? '' : v)}
                    size="sm"
                    className="whitespace-nowrap"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <SearchInput
                  className="flex-1"
                  placeholder="Search titles and descriptions"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search community posts"
                />
                <Dropdown
                  icon={FileText}
                  options={categoryOptions}
                  value={categoryId}
                  onChange={(v) => setParam('category', v)}
                  align="right"
                />
              </div>
              {filtersActive && (
                <div className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
                  {tag && (
                    <button type="button" onClick={() => setParam('tag', '')} className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-1 text-label-xs text-brand-text">
                      <Tag size={11} /> #{tag} <X size={11} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-label-xs text-brand-text hover:underline"
                    onClick={() => {
                      setSearchInput('')
                      setParams(filter !== 'latest' && mode === 'feed' ? { filter } : {}, { replace: true })
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {departmentUnavailable ? (
              <Card>
                <EmptyState icon={MessagesSquare} title="No department on your profile" body="Department filtering uses the team HR assigned to you. Ask HR to set your team, or browse all posts." />
              </Card>
            ) : query.isLoading ? (
              <LoadingCards />
            ) : query.isError ? (
              <ErrorState error={query.error} onRetry={() => query.refetch()} />
            ) : posts.length === 0 ? (
              <Card>
                {mode === 'saved' ? (
                  <EmptyState icon={Bookmark} title="Nothing saved yet" body="Use Save on any post to keep it here for later." action={<LinkButton to={`${base}/community`} variant="secondary">Browse the community</LinkButton>} />
                ) : mode === 'mine' ? (
                  <EmptyState icon={PenSquare} title="You haven't posted yet" body="Ask a question or share a tip — it only takes a minute." action={<LinkButton to={`${base}/community/ask`}>Ask for help</LinkButton>} />
                ) : filtersActive ? (
                  <EmptyState icon={Search} title="No matching posts" body="Try a different search, category or tag." />
                ) : filter === 'unanswered' ? (
                  <EmptyState icon={CircleHelp} title="No unanswered questions" body="Everyone has been helped. Check back later." />
                ) : (
                  <EmptyState icon={MessagesSquare} title="No posts here yet" body="Be the first to start the conversation." action={<LinkButton to={`${base}/community/ask`}>Ask for help</LinkButton>} />
                )}
              </Card>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onTagClick={(t) => setParam('tag', t)} />
                ))}
                <LoadMore query={query} label="Load more posts" />
              </>
            )}
          </div>
        </div>

        <HelpSidebar base={base} />
      </div>
    </div>
  )
}
