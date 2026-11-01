/**
 * Rows (arrays of cells) → CSV text. Quotes cells containing commas,
 * quotes or newlines, and neutralises text starting with = + - @ so a
 * colleague-supplied reason can't run as a spreadsheet formula. Numbers
 * pass through, so negative points stay numeric.
 */
export function toCsv(rows) {
  const cell = (v) => {
    if (typeof v === 'number') return String(v)
    let s = String(v ?? '')
    if (/^[=+\-@]/.test(s)) s = `'${s}`
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export function downloadCsv(filename, rows) {
  // BOM so Excel reads ₹ and names correctly.
  const url = URL.createObjectURL(new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
