import type { ChatDelivery, ChatMessage, SessionChat } from '@agent-dashboard/contracts'
import type { ChatTimelineItem } from './types'

// The laptop's clock and the server's can disagree by a little, so a transcript message counts
// as the delivered one when it is at most this much older than the delivery.
const clockSkewMilliseconds = 60_000

const isInTranscript = (delivery: ChatDelivery, messages: ChatMessage[]): boolean =>
  messages.some(
    (message) =>
      message.role === 'user' &&
      message.kind === 'text' &&
      message.text.trim() === delivery.text.trim() &&
      (message.createdAt === null || Date.parse(message.createdAt) >= Date.parse(delivery.createdAt) - clockSkewMilliseconds),
  )

/**
 * Lays out a session's chat: the transcript, then every message typed in Dashi that the
 * transcript does not show yet, so a message stays visible from the moment it is sent.
 * @param chat The session's chat from the server.
 * @returns The items in the order the drawer shows them.
 */
export const chatTimelineOf = (chat: SessionChat): ChatTimelineItem[] => [
  ...chat.messages.map((message): ChatTimelineItem => ({ itemKey: message.messageId, source: 'transcript', message })),
  ...chat.deliveries
    .filter((delivery) => !(delivery.state === 'delivered' && isInTranscript(delivery, chat.messages)))
    .map((delivery): ChatTimelineItem => ({ itemKey: delivery.deliveryId, source: 'pending', delivery })),
]
