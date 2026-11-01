import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toCsv } from './csv.js'

test('toCsv quotes, escapes and neutralises formulas', () => {
  assert.equal(toCsv([['a', 'b,c', 'say "hi"'], [-5, 0]]), 'a,"b,c","say ""hi"""\r\n-5,0')
  assert.equal(toCsv([['=SUM(A1)', '+1', '@x', '-2']]), "'=SUM(A1),'+1,'@x,'-2")
  assert.equal(toCsv([[null, undefined, 'line\nbreak']]), ',,"line\nbreak"')
})
