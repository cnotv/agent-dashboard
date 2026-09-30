import { anthropicErrorSchema, routineFireResponseSchema } from './schema.ts'
import type { RoutineFirer } from './types.ts'

const routinesApiUrl = 'https://api.anthropic.com/v1/claude_code/routines'

/**
 * Fires a Claude Code routine, which starts a cloud session on the subscription. The text
 * reaches the session inside a block the routine's own prompt has to choose to act on.
 * @param routineId The routine's trigger id, trig_...
 * @param routineToken The routine's API token, which can fire that routine and nothing else.
 * @param text The run's instructions.
 * @returns The new session's claude.ai link, or the API's reason for refusing.
 */
export const fireRoutine: RoutineFirer = async (routineId, routineToken, text) => {
  const fireResponse = await fetch(`${routinesApiUrl}/${encodeURIComponent(routineId)}/fire`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${routineToken}`,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'experimental-cc-routine-2026-04-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(30000),
  })
  const responseBody: unknown = await fireResponse.json().catch(() => null)
  if (!fireResponse.ok) {
    const parsedError = anthropicErrorSchema.safeParse(responseBody)
    return { ok: false, message: parsedError.success ? parsedError.data.error.message : `The routines API answered ${fireResponse.status}` }
  }
  const parsedFire = routineFireResponseSchema.safeParse(responseBody)
  return parsedFire.success
    ? { ok: true, sessionUrl: parsedFire.data.claude_code_session_url }
    : { ok: false, message: 'Unexpected answer from the routines API' }
}
