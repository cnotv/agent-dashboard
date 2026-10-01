import { describe, expect, it } from 'vitest'
import { defaultCollapsedStatuses, parseCollapsedStatuses, toggleCollapsedStatus } from './board-columns'

describe('parseCollapsedStatuses', () => {
  it('folds No pull request and Closed until the browser remembers otherwise', () => {
    expect(parseCollapsedStatuses(null)).toEqual(['no-pull-request', 'closed'])
    expect(parseCollapsedStatuses('[]')).toEqual([])
    expect(parseCollapsedStatuses('["draft","closed"]')).toEqual(['draft', 'closed'])
  })

  it('drops unknown columns and falls back on anything unreadable', () => {
    expect(parseCollapsedStatuses('["draft","__proto__","toString",3]')).toEqual(['draft'])
    expect(parseCollapsedStatuses('{oops')).toEqual(defaultCollapsedStatuses)
    expect(parseCollapsedStatuses('{"draft":true}')).toEqual(defaultCollapsedStatuses)
  })
})

describe('toggleCollapsedStatus', () => {
  it('folds and unfolds one column, leaving the others', () => {
    expect(toggleCollapsedStatus(['closed'], 'draft')).toEqual(['closed', 'draft'])
    expect(toggleCollapsedStatus(['closed', 'draft'], 'closed')).toEqual(['draft'])
  })
})
