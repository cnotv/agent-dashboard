import { describe, expect, it } from 'vitest'
import type { ChatDelivery, SessionChat } from '@agent-dashboard/contracts'
import { chatTimelineOf } from './session-chat'

const delivery = (overrides: Partial<ChatDelivery>): ChatDelivery => ({
  deliveryId: 'd1',
  text: 'Also update the docs',
  state: 'delivered',
  message: null,
  createdAt: '2026-09-30T10:01:00Z',
  ...overrides,
})

const chatWith = (deliveries: ChatDelivery[], typedAt: string | null): SessionChat => ({
  sessionId: 's1',
  availability: 'on-laptop',
  deliveryRoute: 'tmux',
  sendBlocker: null,
  messages: [
    { messageId: 'm1', role: 'user', kind: 'text', text: 'Fix it', toolName: null, createdAt: '2026-09-30T10:00:00Z' },
    ...(typedAt === null
      ? []
      : [
          {
            messageId: 'm2',
            role: 'user' as const,
            kind: 'text' as const,
            text: 'Also update the docs',
            toolName: null,
            createdAt: typedAt,
          },
        ]),
  ],
  deliveries,
  updatedAt: null,
})

describe('chatTimelineOf', () => {
  it('shows a sent message until the transcript has it', () => {
    expect(chatTimelineOf(chatWith([delivery({ state: 'sent' })], null)).map((item) => item.itemKey)).toEqual(['m1', 'd1'])
    expect(chatTimelineOf(chatWith([delivery({})], null)).map((item) => item.itemKey)).toEqual(['m1', 'd1'])
    expect(chatTimelineOf(chatWith([delivery({})], '2026-09-30T10:01:02Z')).map((item) => item.itemKey)).toEqual(['m1', 'm2'])
  })

  it('keeps a failed message, and does not take an older identical message for the delivered one', () => {
    expect(chatTimelineOf(chatWith([delivery({ state: 'failed' })], '2026-09-30T10:01:02Z')).map((item) => item.itemKey)).toEqual([
      'm1',
      'm2',
      'd1',
    ])
    expect(chatTimelineOf(chatWith([delivery({})], '2026-09-30T09:00:00Z')).map((item) => item.itemKey)).toEqual(['m1', 'm2', 'd1'])
  })
})
