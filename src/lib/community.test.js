// Run with: npm test   (Node's built-in test runner, no extra dependencies)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  areaBase, buildCommentTree, friendlyError, parseInline, parseRichText, parseTags, resolveAppLink, slugify,
  validateComment, validatePost,
} from './community.js'

const goodDraft = {
  type: 'question',
  categoryId: 'cat-1',
  title: '  How do I   reset my VPN token?  ',
  body: '  My token expired and the self-service page returns an error.  ',
  tags: 'VPN, #it-help, vpn',
}

test('validatePost trims, collapses whitespace and normalises tags', () => {
  const { errors, value } = validatePost(goodDraft)
  assert.deepEqual(errors, {})
  assert.equal(value.title, 'How do I reset my VPN token?')
  assert.equal(value.body, 'My token expired and the self-service page returns an error.')
  assert.deepEqual(value.tags, ['vpn', 'it-help'])
  assert.equal(value.category_id, 'cat-1')
})

test('validatePost rejects empty / too short / too long fields', () => {
  assert.ok(validatePost({ ...goodDraft, title: '   ' }).errors.title)
  assert.ok(validatePost({ ...goodDraft, title: 'Help' }).errors.title)
  assert.ok(validatePost({ ...goodDraft, title: 'x'.repeat(151) }).errors.title)
  assert.ok(validatePost({ ...goodDraft, body: '   ' }).errors.body)
  assert.ok(validatePost({ ...goodDraft, body: 'too short' }).errors.body)
  assert.ok(validatePost({ ...goodDraft, categoryId: '' }).errors.categoryId)
  assert.ok(validatePost({ ...goodDraft, tags: 'a,b,c,d,e,f' }).errors.tags)
})

test('validatePost blocks announcements for non-HR', () => {
  assert.ok(validatePost({ ...goodDraft, type: 'announcement' }).errors.type)
  assert.equal(validatePost({ ...goodDraft, type: 'announcement' }, { canAnnounce: true }).errors.type, undefined)
})

test('validateComment', () => {
  assert.ok(validateComment(' ').error)
  assert.ok(validateComment('x'.repeat(5001)).error)
  assert.deepEqual(validateComment('  Thanks!  '), { error: null, value: 'Thanks!' })
})

test('parseTags de-duplicates and slugs spaces', () => {
  assert.deepEqual(parseTags('Machine Learning, machine-learning, , #SQL'), ['machine-learning', 'sql'])
})

test('buildCommentTree nests replies, pins the accepted answer, sorts', () => {
  const t = (m) => new Date(Date.UTC(2026, 0, 1, 0, m)).toISOString()
  const comments = [
    { id: 'a', parent_id: null, created_at: t(1), like_count: 0 },
    { id: 'b', parent_id: null, created_at: t(2), like_count: 5 },
    { id: 'c', parent_id: 'a', created_at: t(4), like_count: 0 },
    { id: 'd', parent_id: 'a', created_at: t(3), like_count: 0 },
    { id: 'e', parent_id: 'missing', created_at: t(5), like_count: 1 },
  ]
  const oldest = buildCommentTree(comments, { sort: 'oldest' })
  assert.deepEqual(oldest.map((n) => n.id), ['a', 'b', 'e'])
  assert.deepEqual(oldest[0].replies.map((n) => n.id), ['d', 'c'], 'replies read oldest-first')

  assert.deepEqual(buildCommentTree(comments, { sort: 'newest' }).map((n) => n.id), ['e', 'b', 'a'])
  assert.deepEqual(buildCommentTree(comments, { sort: 'helpful' }).map((n) => n.id), ['b', 'e', 'a'])
  assert.deepEqual(buildCommentTree(comments, { sort: 'helpful', acceptedId: 'a' }).map((n) => n.id), ['a', 'b', 'e'])
  // Input is not mutated.
  assert.equal(comments[0].replies, undefined)
})

test('parseRichText produces safe blocks and never raw HTML', () => {
  const blocks = parseRichText('Hello <b>there</b>\nsecond line\n\n- one\n- two `x`\n\n```\nconst a = 1\n```')
  assert.equal(blocks[0].type, 'paragraph')
  assert.equal(blocks[0].lines[0][0].text, 'Hello <b>there</b>', 'markup stays as text')
  assert.equal(blocks[0].lines.length, 2)
  assert.equal(blocks[1].type, 'list')
  assert.deepEqual(blocks[1].items[1].map((p) => p.type), ['text', 'code'])
  assert.deepEqual(blocks[2], { type: 'code', text: 'const a = 1' })
})

test('parseInline only links http(s) URLs', () => {
  const parts = parseInline('see https://example.com/docs. and javascript:alert(1)')
  const links = parts.filter((p) => p.type === 'link')
  assert.equal(links.length, 1)
  assert.equal(links[0].href, 'https://example.com/docs')
})

test('role-neutral notification links resolve per area', () => {
  assert.equal(areaBase('admin'), '/admin')
  assert.equal(areaBase('recipient'), '/app')
  assert.equal(resolveAppLink('recipient', '/community/post/1'), '/app/community/post/1')
  assert.equal(resolveAppLink('admin', '/messages/9'), '/admin/messages/9')
  assert.equal(resolveAppLink('admin', '/app/catalog'), '/app/catalog')
  assert.equal(resolveAppLink('admin', null), null)
})

test('friendlyError keeps our own DB messages and hides internals', () => {
  assert.equal(friendlyError({ code: '42501', message: 'Only HR admins can post announcements' }), 'Only HR admins can post announcements')
  assert.equal(friendlyError({ code: '42501', message: 'new row violates row-level security policy for table "x"' }), "You don't have permission to do that.")
  assert.equal(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint' }), 'That already exists.')
  assert.equal(friendlyError(null), 'Something went wrong. Please try again.')
})

test('slugify matches the DB slug constraint', () => {
  assert.equal(slugify('Tools & Software'), 'tools-and-software')
  assert.match(slugify('  Café — Ünïcode!! '), /^[a-z0-9-]{2,40}$/)
})
