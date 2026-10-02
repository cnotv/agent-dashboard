import type { CheckGate } from '@dashi/contracts'

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

const previewRouteLinePattern = /^\s*preview route\s*:\s*`?([^\s`]+)`?\s*$/im

// The body is written by anyone who can open a pull request, so only a plain path on the
// preview's own host is accepted: a leading "//" would make the browser leave for another host.
const safeRoutePattern = /^\/(?!\/)[A-Za-z0-9/_\-.~%?=&#]*$/

const isSafeRoute = (route: string): boolean => safeRoutePattern.test(route) && !route.split(/[/?#]/).includes('..')

/**
 * Reads the page a pull request is about from the `Preview route: /path` line of its body,
 * the same line the shared pr-preview workflow records its screenshot from.
 * @param pullRequestBody The pull request's body.
 * @returns The route, or null when the body names none or names an unsafe one.
 */
export const previewRouteFromBody = (pullRequestBody: string): string | null => {
  const requestedRoute = previewRouteLinePattern.exec(pullRequestBody)?.[1]
  return requestedRoute !== undefined && isSafeRoute(requestedRoute) ? requestedRoute : null
}

/**
 * Points a deploy preview at the page its pull request changes.
 * @param previewUrl The preview's root address, or null when there is no preview yet.
 * @param pullRequestBody The pull request's body, which may carry a `Preview route:` line.
 * @returns The preview page's address, the root when no route is named, or null without a preview.
 */
export const previewPageUrl = (previewUrl: string | null, pullRequestBody: string): string | null => {
  if (previewUrl === null) return null
  const route = previewRouteFromBody(pullRequestBody)
  return route === null ? previewUrl : `${previewUrl.replace(/\/+$/, '')}${route}`
}
