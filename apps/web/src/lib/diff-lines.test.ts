import { describe, expect, it } from 'vitest'
import { diffLinesOf } from './diff-lines'

describe('diffLinesOf', () => {
  it('numbers context, removed and added lines from the hunk header', () => {
    const lines = diffLinesOf('@@ -10,3 +10,3 @@ const x\n keep\n-old\n+new\n tail')
    expect(lines.map(({ kind, oldLineNumber, newLineNumber, text }) => [kind, oldLineNumber, newLineNumber, text])).toEqual([
      ['hunk', null, null, '@@ -10,3 +10,3 @@ const x'],
      ['context', 10, 10, 'keep'],
      ['removed', 11, null, 'old'],
      ['added', null, 11, 'new'],
      ['context', 12, 12, 'tail'],
    ])
  })

  it('restarts numbering at each hunk and leaves notes unnumbered', () => {
    const lines = diffLinesOf('@@ -1 +1 @@\n-a\n+b\n@@ -40,2 +40,2 @@\n c\n\\ No newline at end of file')
    expect(lines.map(({ kind, oldLineNumber, newLineNumber }) => [kind, oldLineNumber, newLineNumber])).toEqual([
      ['hunk', null, null],
      ['removed', 1, null],
      ['added', null, 1],
      ['hunk', null, null],
      ['context', 40, 40],
      ['note', null, null],
    ])
  })

  it('reads a single-line hunk header without counts', () => {
    expect(diffLinesOf('@@ -0,0 +1 @@\n+first')[1]).toMatchObject({ kind: 'added', newLineNumber: 1, text: 'first' })
  })
})
