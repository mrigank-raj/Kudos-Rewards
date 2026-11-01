/**
 * What a transactions row means to the person who owns it. One place so
 * History, the dashboard and exports never disagree. `icon` is a lucide
 * icon name; `kind` is the History filter it belongs to.
 */
export function describeTransaction(tx) {
  switch (tx.type) {
    case 'welcome': return { title: 'Welcome points', icon: 'PartyPopper', kind: 'Earned' }
    case 'manual_credit': return { title: 'Points from HR', icon: 'Zap', kind: 'Earned' }
    case 'earn': return { title: 'Thank You ! received', icon: 'Sparkles', kind: 'Earned' }
    case 'thank_you': return { title: 'Sent a Thank You !', icon: 'Send', kind: 'Sent' }
    case 'manual_debit': return { title: 'Deducted by HR', icon: 'ArrowDownCircle', kind: 'Deducted' }
    case 'redeem': return tx.points > 0
      ? { title: 'Reward refunded', icon: 'Gift', kind: 'Redeemed' }
      : { title: 'Reward redeemed', icon: 'Gift', kind: 'Redeemed' }
    default: return { title: 'Points update', icon: 'Zap', kind: 'Earned' }
  }
}

/** Rank with ties: 1 + how many are strictly ahead. Medals only make sense above 0. */
export function rankWithTies(points, all) {
  return 1 + all.filter((p) => Number(p) > Number(points)).length
}
