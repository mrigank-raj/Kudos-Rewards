/**
 * Demo data for the Kudos Rewards redesign.
 * Values match the Figma screens exactly so the code and the designs agree.
 * Swap this file for real API calls when wiring up the Supabase backend.
 */

export const ORG = { name: 'Acme Corp', initial: 'A', workspace: 'Workspace' }

export const RECIPIENT = {
  name: 'Priya Sharma',
  first: 'Priya',
  initials: 'PS',
  email: 'priya@acme.com',
  role: 'Recipient',
  team: 'Engineering',
  balance: 2350,
  rank: 4,
  avatar: '#9E66F2',
}

export const ADMIN = {
  name: 'Sarah Chen',
  initials: 'SC',
  email: 'admin1@acme.com',
  role: 'Admin',
  avatar: '#6366F1',
}

/* ---------------------------------------------------------------- rewards */

export const REWARDS = [
  { id: 'starbucks', title: 'Starbucks Gift Card', short: 'Starbucks', desc: '$10 credit', category: 'Gift card', cost: 200, icon: 'Coffee', from: '#056b47', to: '#0d9e6b' },
  { id: 'doordash', title: 'DoorDash Credit', short: 'DoorDash', desc: '$15 toward any order', category: 'Gift card', cost: 300, icon: 'Utensils', from: '#d92e24', to: '#fa7326' },
  { id: 'amazon', title: 'Amazon Gift Card', short: 'Amazon', desc: '$25 credit', category: 'Gift card', cost: 500, icon: 'Package', from: '#0d386b', to: '#1c73b8' },
  { id: 'movie', title: 'Movie Night Bundle', short: 'Movie Night', desc: '2 tickets plus popcorn', category: 'Experience', cost: 800, icon: 'Film', from: '#52176b', to: '#9e38b8' },
  { id: 'hoodie', title: 'Branded Hoodie', short: 'Branded Hoodie', desc: 'Premium heavyweight', category: 'Merch', cost: 1500, icon: 'Shirt', from: '#292930', to: '#5c5c6b' },
  { id: 'earbuds', title: 'Wireless Earbuds', short: 'Earbuds', desc: 'Noise cancelling', category: 'Merch', cost: 3000, icon: 'Headphones', from: '#292930', to: '#52525c' },
  { id: 'spa', title: 'Spa Day Voucher', short: 'Spa Day', desc: 'Full day, city wide', category: 'Wellness', cost: 4000, icon: 'Sparkles', from: '#292930', to: '#52525c' },
  { id: 'pto', title: 'Extra PTO Day', short: 'Extra PTO', desc: 'One paid day off', category: 'Time off', cost: 5000, icon: 'Sun', from: '#292930', to: '#52525c' },
]

export const REWARD_CATEGORIES = ['All', 'Gift cards', 'Experiences', 'Merch', 'Wellness']

/* ------------------------------------------------------------- recognition */

export const FEED = [
  {
    id: 1,
    from: { name: 'Sarah Chen', initials: 'SC', color: '#6366F1' },
    to: { name: 'Carlos Mendez', initials: 'CM', color: '#33b899' },
    message: 'Closed the Q3 renewal three weeks ahead of target. Absolute machine.',
    points: 500,
    time: '2h ago',
    tags: ['Teamwork', 'Ownership'],
  },
  {
    id: 2,
    from: { name: 'Aisha Patel', initials: 'AP', color: '#f5738c' },
    to: { name: 'Lisa Chang', initials: 'LC', color: '#fab033' },
    message: 'Rebuilt the onboarding flow and cut drop off by half.',
    points: 750,
    time: '5h ago',
    tags: ['Innovation'],
  },
  {
    id: 3,
    from: { name: 'Kenji Tanaka', initials: 'KT', color: '#59b3f2' },
    to: { name: 'Priya Sharma', initials: 'PS', color: '#9E66F2' },
    message: 'Stayed late to unblock the release. You are the reason it shipped.',
    points: 300,
    time: 'Yesterday',
    tags: ['Team Player'],
  },
]

export const COLLEAGUES = [
  { name: 'Carlos Mendez', first: 'Carlos', initials: 'CM', team: 'Sales', color: '#33b899' },
  { name: 'Aisha Patel', first: 'Aisha', initials: 'AP', team: 'Design', color: '#f5738c' },
  { name: 'Kenji Tanaka', first: 'Kenji', initials: 'KT', team: 'Eng', color: '#59b3f2' },
  { name: 'Lisa Chang', first: 'Lisa', initials: 'LC', team: 'Ops', color: '#fab033' },
  { name: 'Rachel Green', first: 'Rachel', initials: 'RG', team: 'Marketing', color: '#9E66F2' },
]

export const VALUE_TAGS = ['Teamwork', 'Ownership', 'Innovation', 'Customer first']
export const POINT_PRESETS = [100, 250, 500]

/* ---------------------------------------------------------------- history */

export const MY_ACTIVITY = [
  { id: 1, kind: 'earned', icon: 'Zap', title: 'Release management excellence', meta: 'From Sarah Chen', date: 'Jul 18', amount: 500 },
  { id: 2, kind: 'redeemed', icon: 'Gift', title: 'Redeemed: Starbucks Gift Card', meta: 'Order #KD-2841', date: 'Jul 20', amount: -200 },
  { id: 3, kind: 'earned', icon: 'Zap', title: 'Customer retention campaign', meta: 'From Kenji Tanaka', date: 'Jul 15', amount: 500 },
  { id: 4, kind: 'redeemed', icon: 'Sparkles', title: 'Kudos sent to Carlos Mendez', meta: '“Saved the launch demo”', date: 'Jul 12', amount: -100 },
]

export const HISTORY_SUMMARY = [
  { label: 'Total earned', value: '8,450', sub: 'Across 14 recognitions', tone: 'success', icon: 'ArrowUpRight' },
  { label: 'Total redeemed', value: '5,900', sub: 'Across 6 rewards', tone: 'danger', icon: 'ArrowDownRight' },
  { label: 'Kudos sent', value: '200', sub: 'To 2 teammates', tone: 'brand', icon: 'Sparkles' },
  { label: 'Current balance', value: '2,350', sub: 'Ready to spend', tone: 'gold', icon: 'Zap' },
]

export const LEDGER_GROUPS = [
  {
    month: 'August 2026',
    rows: [
      { id: 'a1', icon: 'Gift', title: 'Redeemed: Starbucks Gift Card', meta: 'Order #KD-2841 · Digital delivery', when: 'Aug 14, 02:01', amount: -200, balance: '2,350' },
      { id: 'a2', icon: 'Zap', title: 'Spot Bonus', meta: 'From Sarah Chen · Q3 renewal push', when: 'Aug 09, 11:20', amount: 500, balance: '2,550' },
    ],
  },
  {
    month: 'July 2026',
    rows: [
      { id: 'j1', icon: 'Sparkles', title: 'Kudos sent to Carlos Mendez', meta: '“Saved the launch demo”', when: 'Jul 28, 16:45', amount: -100, balance: '2,050' },
      { id: 'j2', icon: 'Zap', title: 'Release management excellence', meta: 'From Kenji Tanaka · Innovation Award', when: 'Jul 18, 14:00', amount: 500, balance: '2,150' },
      { id: 'j3', icon: 'Gift', title: 'Redeemed: DoorDash Credit', meta: 'Order #KD-2790 · Digital delivery', when: 'Jul 20, 21:30', amount: -300, balance: '1,650' },
      { id: 'j4', icon: 'Zap', title: 'Customer retention campaign', meta: 'From Emma Thompson · Sales Star', when: 'Jul 15, 16:30', amount: 500, balance: '1,950' },
    ],
  },
]

/* ------------------------------------------------------------------ admin */

export const ADMIN_KPIS = [
  { label: 'Team members', value: '128', icon: 'Users', trend: '+8', tone: 'success', sub: 'this quarter' },
  { label: 'Active programs', value: '3', icon: 'Trophy', trend: null, tone: null, sub: '1 paused' },
  { label: 'Points issued', value: '110,200', icon: 'Zap', trend: '12%', tone: 'success', sub: 'vs last quarter' },
  { label: 'Redemption rate', value: '30', unit: '%', icon: 'Gift', trend: '3%', tone: 'danger', sub: 'vs last quarter' },
]

export const ADMIN_LEDGER = [
  { id: 1, who: 'Aisha Patel', initials: 'AP', color: '#f5738c', meta: 'Spot Bonus · issued by Sarah Chen', when: 'Aug 14, 12:39', amount: 500 },
  { id: 2, who: 'new_tester', initials: 'NT', color: '#6b73f2', meta: 'Redeemed: Starbucks Gift Card', when: 'Aug 14, 02:01', amount: -200 },
  { id: 3, who: 'Priya Sharma', initials: 'PS', color: '#9E66F2', meta: 'Redeemed: DoorDash Credit', when: 'Jul 20, 21:30', amount: -300 },
  { id: 4, who: 'Priya Sharma', initials: 'PS', color: '#9E66F2', meta: 'Release management excellence', when: 'Jul 18, 14:00', amount: 500 },
  { id: 5, who: 'Carlos Mendez', initials: 'CM', color: '#33b899', meta: 'Customer retention campaign', when: 'Jul 15, 16:30', amount: 500 },
  { id: 6, who: 'Lisa Chang', initials: 'LC', color: '#fab033', meta: 'Innovation Award · rule based', when: 'Jul 12, 09:15', amount: 750 },
  { id: 7, who: 'Kenji Tanaka', initials: 'KT', color: '#59b3f2', meta: 'Redeemed: Branded Hoodie', when: 'Jul 08, 18:22', amount: -1500 },
]

export const BUDGET = { used: 110200, total: 150000, resets: 'Resets 30 September' }

export const PROGRAM_SPLIT = [
  { name: 'Sales Star', value: 52400, pct: 48, color: '#6366F1' },
  { name: 'Innovation Award', value: 34300, pct: 31, color: '#10B981' },
  { name: 'Spot Bonus', value: 23500, pct: 21, color: '#F59E0B' },
]

export const PROGRAMS = [
  { id: 1, name: 'Sales Star', desc: 'Automatically awarded when a rep closes 10 deals in a quarter.', points: 1000, type: 'Rule based', icon: 'Zap', status: 'Active', on: true, issued: '52,400', awards: '38 awards', people: [{ initials: 'CM', color: '#33b899' }, { initials: 'ET', color: '#f5738c' }, { initials: 'JW', color: '#6b73f2' }] },
  { id: 2, name: 'Innovation Award', desc: 'Nominated by any peer, approved by the program owner.', points: 750, type: 'Nomination', icon: 'Star', status: 'Active', on: true, issued: '34,300', awards: '21 awards', people: [{ initials: 'LC', color: '#fab033' }, { initials: 'AP', color: '#f5738c' }] },
  { id: 3, name: 'Spot Bonus', desc: 'Managers issue on the spot for exceptional work.', points: 500, type: 'Manual', icon: 'Hand', status: 'Active', on: true, issued: '23,500', awards: '47 awards', people: [{ initials: 'PS', color: '#9E66F2' }, { initials: 'KT', color: '#59b3f2' }, { initials: 'DK', color: '#33b899' }] },
  { id: 4, name: 'Employee of the Month', desc: 'Company wide vote, one winner per calendar month.', points: 2000, type: 'Nomination', icon: 'Star', status: 'Draft', on: false, issued: null, awards: 'Not launched', people: [] },
  { id: 5, name: 'Team Player', desc: 'Peer recognition for helping outside your own remit.', points: 300, type: 'Manual', icon: 'Hand', status: 'Inactive', on: false, issued: '8,900', awards: '19 awards', people: [{ initials: 'RG', color: '#fab033' }] },
  { id: 6, name: 'Onboarding Buddy', desc: 'Awarded for mentoring a new joiner through week one.', points: 250, type: 'Manual', icon: 'Hand', status: 'Inactive', on: false, issued: '4,250', awards: '17 awards', people: [{ initials: 'OH', color: '#6b73f2' }, { initials: 'DK', color: '#33b899' }] },
]

export const PEOPLE = [
  { id: 1, name: 'Emma Thompson', email: 'emma@acme.com', team: 'Sales', balance: '4,200', lifetime: '12,850', joined: 'Mar 1, 2025', initials: 'ET', color: '#f5738c' },
  { id: 2, name: 'Aisha Patel', email: 'aisha@acme.com', team: 'Design', balance: '3,600', lifetime: '9,400', joined: 'Feb 10, 2025', initials: 'AP', color: '#9E66F2' },
  { id: 3, name: 'Kenji Tanaka', email: 'kenji@acme.com', team: 'Engineering', balance: '3,500', lifetime: '11,200', joined: 'Apr 10, 2025', initials: 'KT', color: '#59b3f2' },
  { id: 4, name: 'Lisa Chang', email: 'lisa@acme.com', team: 'Operations', balance: '2,800', lifetime: '7,650', joined: 'Mar 10, 2025', initials: 'LC', color: '#fab033' },
  { id: 5, name: 'Priya Sharma', email: 'priya@acme.com', team: 'Engineering', balance: '2,350', lifetime: '8,450', joined: 'Feb 1, 2025', initials: 'PS', color: '#9E66F2' },
  { id: 6, name: 'Rachel Green', email: 'rachel@acme.com', team: 'Marketing', balance: '1,700', lifetime: '5,300', joined: 'Apr 5, 2025', initials: 'RG', color: '#33b899' },
  { id: 7, name: 'James Wilson', email: 'james@acme.com', team: 'Sales', balance: '1,800', lifetime: '6,900', joined: 'Feb 5, 2025', initials: 'JW', color: '#6b73f2' },
  { id: 8, name: 'Carlos Mendez', email: 'carlos@acme.com', team: 'Sales', balance: '1,450', lifetime: '10,100', joined: 'Mar 5, 2025', initials: 'CM', color: '#33b899' },
]

/* -------------------------------------------------------------- analytics */

export const ISSUED_VS_REDEEMED = [
  { month: 'Feb', issued: 17000, redeemed: 800 },
  { month: 'Mar', issued: 24000, redeemed: 3000 },
  { month: 'Apr', issued: 25500, redeemed: 6000 },
  { month: 'May', issued: 21000, redeemed: 7500 },
  { month: 'Jun', issued: 19500, redeemed: 7000 },
  { month: 'Jul', issued: 18500, redeemed: 12800 },
  { month: 'Aug', issued: 12000, redeemed: 9500 },
]

export const REDEMPTION_TREND = [
  { month: 'Feb', rate: 6 },
  { month: 'Mar', rate: 14 },
  { month: 'Apr', rate: 22 },
  { month: 'May', rate: 29 },
  { month: 'Jun', rate: 26 },
  { month: 'Jul', rate: 44 },
  { month: 'Aug', rate: 30 },
]

export const TOP_EARNERS = [
  { rank: 1, name: 'Emma Thompson', team: 'Sales', points: '12,850', pct: 100, initials: 'ET', color: '#f5738c' },
  { rank: 2, name: 'Kenji Tanaka', team: 'Engineering', points: '11,200', pct: 87, initials: 'KT', color: '#59b3f2' },
  { rank: 3, name: 'Carlos Mendez', team: 'Sales', points: '10,100', pct: 79, initials: 'CM', color: '#33b899' },
  { rank: 4, name: 'Aisha Patel', team: 'Design', points: '9,400', pct: 73, initials: 'AP', color: '#9E66F2' },
  { rank: 5, name: 'Priya Sharma', team: 'Engineering', points: '8,450', pct: 66, initials: 'PS', color: '#9E66F2' },
]

export const MEDALS = ['#d9a621', '#a1a6b0', '#b87334']

/* --------------------------------------------------------------- helpers */

export const formatPoints = (n) => Math.abs(n).toLocaleString('en-US')
export const signedPoints = (n) => `${n < 0 ? '−' : '+'}${formatPoints(n)}`
