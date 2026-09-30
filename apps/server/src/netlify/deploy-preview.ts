import type { CheckGate } from '@agent-dashboard/contracts'

const netlifyPreviewHostSuffix = '.netlify.app'

const isNetlifyPreviewUrl = (candidateUrl: string): boolean => {
  try {
    const parsedUrl = new URL(candidateUrl)
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname.endsWith(netlifyPreviewHostSuffix)
  } catch {
    return false
  }
}

/**
 * Finds a pull request's Netlify deploy preview among its check gates. Netlify reports the
 * preview as a commit status whose link is the build log while it builds and the preview site
 * once it is ready, so only a finished status pointing at a netlify.app host counts.
 * @param gates The pull request's check gates.
 * @returns The preview's address, or null when there is none yet.
 */
export const deployPreviewUrlFromGates = (gates: CheckGate[]): string | null =>
  gates.find((gate) => gate.state === 'success' && gate.url !== null && isNetlifyPreviewUrl(gate.url))?.url ?? null
