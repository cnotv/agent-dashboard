import { ExternalLinkIcon, ImageIcon, VideoIcon } from '@radix-ui/react-icons'
import { Callout, Flex, IconButton, Link, Popover, Text, Tooltip } from '@radix-ui/themes'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react'
import type { MediaKind, PreviewMediaKind, PullRequestSummary, RepositoryReference } from '@dashi/contracts'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { dashboardApi } from '@/lib/api'
import { showMediaFullscreen } from '@/lib/fullscreen'

const mediaLabels: Record<PreviewMediaKind, { name: string; missing: string }> = {
  image: { name: 'Screenshot', missing: 'No screenshot for this pull request' },
  video: { name: 'Video', missing: 'No video for this pull request' },
  before: { name: 'Screenshot of the base branch', missing: 'No screenshot of the base branch' },
}

const mediaIcons: Record<MediaKind, ReactNode> = { image: <ImageIcon />, video: <VideoIcon /> }

type MediaElement = HTMLImageElement & HTMLVideoElement

interface MediaViewerProps {
  kind: PreviewMediaKind
  mediaUrl: string
  mediaRef: RefObject<MediaElement | null>
  // Told when the media cannot be loaded, so an optional one, the before picture, can step aside
  // instead of showing an error.
  onMissing?: () => void
}

// The media itself is the full-screen button. The video plays without controls in the popover,
// since a click on native controls would also pause it, and gets them back in full screen.
const MediaViewer = ({ kind, mediaUrl, mediaRef, onMissing }: MediaViewerProps) => {
  const [hasFailed, setHasFailed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const syncFullscreen = (): void =>
      setIsFullscreen(document.fullscreenElement !== null && document.fullscreenElement === mediaRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [mediaRef])

  if (hasFailed && onMissing !== undefined) return null
  if (hasFailed) {
    return (
      <Callout.Root color="gray" variant="surface">
        <Callout.Text>The {mediaLabels[kind].name.toLowerCase()} could not be loaded.</Callout.Text>
      </Callout.Root>
    )
  }

  const showFullscreen = (): void => {
    if (mediaRef.current !== null && !isFullscreen) showMediaFullscreen(mediaRef.current, mediaUrl)
  }

  return (
    <Flex direction="column" gap="3">
      <button
        type="button"
        className="media-viewer-button"
        aria-label={`Show the ${mediaLabels[kind].name.toLowerCase()} full screen`}
        onClick={showFullscreen}
      >
        {kind === 'video' ? (
          // Muted so the browser lets it start on its own; the recordings carry no sound.
          <video
            ref={mediaRef}
            className="media-viewer"
            src={mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            controls={isFullscreen}
            onError={() => setHasFailed(true)}
          />
        ) : (
          <img
            ref={mediaRef}
            className="media-viewer"
            src={mediaUrl}
            alt={kind === 'before' ? 'Screenshot of the base branch' : 'Screenshot of the pull request'}
            onError={() => {
              setHasFailed(true)
              onMissing?.()
            }}
          />
        )}
      </button>
      <Flex justify="end" gap="3" align="center">
        <Text size="1" color="gray">
          Click to show it full screen
        </Text>
        <Link href={mediaUrl} target="_blank" rel="noopener noreferrer" size="2">
          <Flex gap="1" align="center" asChild>
            <span>
              Open <ExternalLinkIcon />
            </span>
          </Flex>
        </Link>
      </Flex>
    </Flex>
  )
}

interface MediaButtonProps {
  kind: MediaKind
  isAvailable: boolean
  mediaUrl: string
  beforeUrl: string | null
}

// The pull request's screenshot sits next to the base branch's, Before then After, so the change
// is what the eye lands on; a recording without a before picture shows After alone.
const ScreenshotComparison = ({ beforeUrl, mediaUrl, mediaRef }: { beforeUrl: string; mediaUrl: string; mediaRef: RefObject<MediaElement | null> }) => {
  const beforeRef = useRef<MediaElement>(null)
  const [hasBefore, setHasBefore] = useState(true)
  return (
    <div className="media-compare">
      {hasBefore && (
        <Flex direction="column" gap="2">
          <Text size="1" weight="medium" color="gray">
            Before
          </Text>
          <MediaViewer kind="before" mediaUrl={beforeUrl} mediaRef={beforeRef} onMissing={() => setHasBefore(false)} />
        </Flex>
      )}
      <Flex direction="column" gap="2">
        {hasBefore && (
          <Text size="1" weight="medium" color="gray">
            After
          </Text>
        )}
        <MediaViewer kind="image" mediaUrl={mediaUrl} mediaRef={mediaRef} />
      </Flex>
    </div>
  )
}

const MediaButton = ({ kind, isAvailable, mediaUrl, beforeUrl }: MediaButtonProps) => {
  const { isOpen, setIsOpen, triggerHoverHandlers, contentHoverHandlers } = useHoverOpen()
  const mediaRef = useRef<MediaElement>(null)

  // With the preview already showing (a mouse opens it on hover), a click on the icon goes
  // full screen; on touch, the first tap opens the preview as before.
  const showFullscreenFromIcon = (clickEvent: MouseEvent): void => {
    if (!isOpen || mediaRef.current === null) return
    clickEvent.preventDefault()
    showMediaFullscreen(mediaRef.current, mediaUrl)
  }

  if (!isAvailable) {
    // A disabled button gets no pointer events, so the tooltip hangs on the element around it.
    return (
      <Tooltip content={mediaLabels[kind].missing}>
        <span>
          <IconButton size="1" variant="ghost" color="gray" disabled aria-label={mediaLabels[kind].missing}>
            {mediaIcons[kind]}
          </IconButton>
        </span>
      </Tooltip>
    )
  }
  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <IconButton
          size="1"
          variant="ghost"
          aria-label={`Show the ${mediaLabels[kind].name.toLowerCase()}`}
          onClick={showFullscreenFromIcon}
          {...triggerHoverHandlers}
        >
          {mediaIcons[kind]}
        </IconButton>
      </Popover.Trigger>
      <Popover.Content
        width={beforeUrl === null ? '640px' : '960px'}
        maxWidth="calc(100vw - 32px)"
        size="2"
        onOpenAutoFocus={(focusEvent) => focusEvent.preventDefault()}
        {...contentHoverHandlers}
      >
        <Text as="div" size="2" weight="medium" mb="3">
          {mediaLabels[kind].name}
        </Text>
        {beforeUrl === null ? (
          <MediaViewer kind={kind} mediaUrl={mediaUrl} mediaRef={mediaRef} />
        ) : (
          <ScreenshotComparison beforeUrl={beforeUrl} mediaUrl={mediaUrl} mediaRef={mediaRef} />
        )}
      </Popover.Content>
    </Popover.Root>
  )
}

interface PullRequestMediaProps {
  repository: RepositoryReference
  pullRequest: PullRequestSummary
}

/** The screenshot and video buttons, placed in the icon row at the foot of a board card. */
export const PullRequestMedia = ({ repository, pullRequest }: PullRequestMediaProps) => (
  <>
    <MediaButton
      kind="image"
      isAvailable={pullRequest.media.hasImage}
      mediaUrl={dashboardApi.pullRequestMediaUrl(repository, pullRequest, 'image')}
      beforeUrl={dashboardApi.pullRequestMediaUrl(repository, pullRequest, 'before')}
    />
    <MediaButton
      kind="video"
      isAvailable={pullRequest.media.hasVideo}
      mediaUrl={dashboardApi.pullRequestMediaUrl(repository, pullRequest, 'video')}
      beforeUrl={null}
    />
  </>
)
