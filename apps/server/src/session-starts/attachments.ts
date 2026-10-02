import type { AttachmentLimits, StartAttachment, StartTarget } from '@dashi/contracts'
import type { AttachmentDelivery, AttachmentRelay } from './types.ts'

// A laptop start held this long without a runner claiming it gives up its files rather than
// keeping them in memory indefinitely.
const unclaimedMilliseconds = 15 * 60_000

export const attachmentLimits: AttachmentLimits = {
  fileCount: 5,
  fileTargetBytes: 8 * 1024 * 1024,
  inlineTargetBytes: 48 * 1024,
}

/**
 * Tells how a start's attachments reach its session: as files a laptop session can read, or as
 * base64 inside the prompt for a session that only takes text.
 * @param target Where the session runs.
 * @returns The delivery.
 */
export const attachmentDeliveryFor = (target: StartTarget): AttachmentDelivery =>
  target === 'laptop-remote-control' || target === 'laptop-headless' ? 'files' : 'inline'

/**
 * Counts the bytes a base64 text decodes to, without decoding it.
 * @param base64 The base64 text.
 * @returns The decoded size in bytes.
 */
export const decodedSizeOf = (base64: string): number => Math.floor((base64.length * 3) / 4) - (base64.match(/=+$/)?.[0].length ?? 0)

/**
 * Checks a start's attachments against the limits of the way they reach its session.
 * @param attachments The attachments.
 * @param target Where the session runs.
 * @returns Null when they fit, or the reason they do not.
 */
export const attachmentLimitProblem = (attachments: StartAttachment[], target: StartTarget): string | null => {
  if (attachments.length > attachmentLimits.fileCount) return `Attach at most ${attachmentLimits.fileCount} files`
  const totalBytes = attachments.reduce((total, attachment) => total + decodedSizeOf(attachment.base64), 0)
  const allowedBytes = attachmentDeliveryFor(target) === 'files' ? attachmentLimits.fileTargetBytes : attachmentLimits.inlineTargetBytes
  return totalBytes > allowedBytes ? `The attachments come to ${totalBytes} bytes; this session takes at most ${allowedBytes}` : null
}

/**
 * Creates the in-memory hand-off of a laptop start's attachments to the runner that claims it.
 * Nothing is written anywhere: a server restart before the claim loses them.
 * @param now The clock.
 * @returns The relay.
 */
export const createAttachmentRelay = (now: () => number): AttachmentRelay => {
  const heldAttachments = new Map<string, { attachments: StartAttachment[]; heldAt: number }>()
  const dropUnclaimed = (): void =>
    [...heldAttachments]
      .filter(([, held]) => now() - held.heldAt > unclaimedMilliseconds)
      .forEach(([startId]) => heldAttachments.delete(startId))

  return {
    hold: (startId, attachments) => {
      dropUnclaimed()
      if (attachments.length > 0) heldAttachments.set(startId, { attachments, heldAt: now() })
    },
    take: (startId) => {
      dropUnclaimed()
      const held = heldAttachments.get(startId)
      heldAttachments.delete(startId)
      return held?.attachments ?? []
    },
  }
}
