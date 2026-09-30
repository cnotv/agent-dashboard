/**
 * Shows a screenshot or a video full screen. Safari on the iPhone has no full screen for page
 * elements, so there a video falls back to the phone's own player and an image to a new tab.
 * @param mediaElement The image or video to show.
 * @param mediaUrl Where the media is, for the new-tab fallback.
 */
export const showMediaFullscreen = (mediaElement: HTMLElement, mediaUrl: string): void => {
  const openInNewTab = (): void => void window.open(mediaUrl, '_blank', 'noopener,noreferrer')
  if (document.fullscreenEnabled && typeof mediaElement.requestFullscreen === 'function') {
    mediaElement.requestFullscreen().catch(openInNewTab)
    return
  }
  if ('webkitEnterFullscreen' in mediaElement && typeof mediaElement.webkitEnterFullscreen === 'function') {
    mediaElement.webkitEnterFullscreen()
    return
  }
  openInNewTab()
}
