import type { DiffLine, DiffLineKind } from './types'

const hunkHeaderPattern = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

interface DiffPosition {
  oldLineNumber: number
  newLineNumber: number
}

const kindOf = (rawLine: string): DiffLineKind => {
  if (rawLine.startsWith('@@')) return 'hunk'
  if (rawLine.startsWith('+')) return 'added'
  if (rawLine.startsWith('-')) return 'removed'
  if (rawLine.startsWith('\\')) return 'note'
  return 'context'
}

const positionAfter = (kind: DiffLineKind, rawLine: string, position: DiffPosition): DiffPosition => {
  if (kind === 'hunk') {
    const headerMatch = hunkHeaderPattern.exec(rawLine)
    return headerMatch ? { oldLineNumber: Number(headerMatch[1]), newLineNumber: Number(headerMatch[2]) } : position
  }
  if (kind === 'added') return { ...position, newLineNumber: position.newLineNumber + 1 }
  if (kind === 'removed') return { ...position, oldLineNumber: position.oldLineNumber + 1 }
  if (kind === 'context') return { oldLineNumber: position.oldLineNumber + 1, newLineNumber: position.newLineNumber + 1 }
  return position
}

/**
 * Splits a unified diff patch, as GitHub sends it for one file, into numbered lines.
 * @param patch The file's patch.
 * @returns One entry per line: hunk headers and notes carry no numbers, removed lines only the
 * old one, added lines only the new one, context lines both. The +, - or space marker is dropped.
 */
export const diffLinesOf = (patch: string): DiffLine[] =>
  patch.split('\n').reduce<{ lines: DiffLine[]; position: DiffPosition }>(
    ({ lines, position }, rawLine, lineIndex) => {
      const kind = kindOf(rawLine)
      const isNumbered = kind !== 'hunk' && kind !== 'note'
      const line: DiffLine = {
        lineKey: String(lineIndex),
        kind,
        oldLineNumber: isNumbered && kind !== 'added' ? position.oldLineNumber : null,
        newLineNumber: isNumbered && kind !== 'removed' ? position.newLineNumber : null,
        text: isNumbered ? rawLine.slice(1) : rawLine,
      }
      return { lines: [...lines, line], position: positionAfter(kind, rawLine, position) }
    },
    { lines: [], position: { oldLineNumber: 0, newLineNumber: 0 } },
  ).lines
