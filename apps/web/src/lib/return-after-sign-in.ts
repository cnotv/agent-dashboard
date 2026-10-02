const returnPathKey = 'dashi-return-after-sign-in'

/**
 * Accepts a stored page to return to only when it is a path on this dashboard, so a value planted
 * in storage can never send the browser to another site.
 * @param storedPath What storage holds.
 * @returns The path, or null.
 */
export const returnPathFrom = (storedPath: string | null): string | null =>
  storedPath !== null && storedPath.startsWith('/') && !storedPath.startsWith('//') && !storedPath.startsWith('/\\') ? storedPath : null

/**
 * Remembers the page the sign-in screen was shown on, such as a pair link with its code, since
 * sign-in itself always comes back to the start page.
 * @param path The path with its query.
 */
export const rememberReturnPath = (path: string): void => {
  try {
    window.sessionStorage.setItem(returnPathKey, path)
  } catch {
    // Without storage, sign-in lands on the start page, as it did before.
  }
}

/**
 * Takes the remembered page, once.
 * @returns The path to go back to, or null.
 */
export const takeReturnPath = (): string | null => {
  try {
    const storedPath = window.sessionStorage.getItem(returnPathKey)
    window.sessionStorage.removeItem(returnPathKey)
    return returnPathFrom(storedPath)
  } catch {
    return null
  }
}
