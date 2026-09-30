import { EnterFullScreenIcon, ExternalLinkIcon, ImageIcon, VideoIcon } from '@radix-ui/react-icons'
import { Button, Callout, Flex, IconButton, Link, Popover, Text, Tooltip } from '@radix-ui/themes'
import { useRef, useState, type ReactNode } from 'react'
import type { MediaKind, PullRequestSummary, RepositoryReference } from '@agent-dashboard/contracts'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { dashboardApi } from '@/lib/api'

const mediaLabels: Record<MediaKind, { name: string; missing: string }> = {
  image: { name: 'Screenshot', missing: 'No screenshot for this pull request' },
  video: { name: 'Video', missing: 'No video for this pull request' },
}

const mediaIcons: Record<MediaKind, ReactNode> = { image: <ImageIcon />, video: <VideoIcon /> }

interface MediaViewerProps {
  kind: MediaKind
  mediaUrl: string
}

const MediaViewer = ({ kind, mediaUrl }: MediaViewerProps) => {
  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null)
  const [hasFailed, setHasFailed] = useState(false)

  if (hasFailed) {
    return (
      <Callout.Root color="gray" variant="surface">
        <Callout.Text>The {mediaLabels[kind].name.toLowerCase()} could not be loaded.</Callout.Text>
      </Callout.Root>
    )
  }

  return (
    <Flex direction="column" gap="3">
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
          controls
          onError={() => setHasFailed(true)}
        />
      ) : (
        <img ref={mediaRef} className="media-viewer" src={mediaUrl} alt="Screenshot of the pull request" onError={() => setHasFailed(true)} />
      )}
      <Flex justify="end" gap="3" align="center">
        <Link href={mediaUrl} target="_blank" rel="noopener noreferrer" size="2">
          <Flex gap="1" align="center" asChild>
            <span>
              Open <ExternalLinkIcon />
            </span>
          </Flex>
        </Link>
        <Button size="1" variant="soft" onClick={() => void mediaRef.current?.requestFullscreen()}>
          <EnterFullScreenIcon /> Full screen
        </Button>
      </Flex>
    </Flex>
  )
}

interface MediaButtonProps {
  kind: MediaKind
  isAvailable: boolean
  mediaUrl: string
}

const MediaButton = ({ kind, isAvailable, mediaUrl }: MediaButtonProps) => {
  const { isOpen, setIsOpen, triggerHoverHandlers, contentHoverHandlers } = useHoverOpen()

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
        <IconButton size="1" variant="ghost" aria-label={`Show the ${mediaLabels[kind].name.toLowerCase()}`} {...triggerHoverHandlers}>
          {mediaIcons[kind]}
        </IconButton>
      </Popover.Trigger>
      <Popover.Content width="640px" maxWidth="calc(100vw - 32px)" size="2" {...contentHoverHandlers}>
        <Text as="div" size="2" weight="medium" mb="3">
          {mediaLabels[kind].name}
        </Text>
        <MediaViewer kind={kind} mediaUrl={mediaUrl} />
      </Popover.Content>
    </Popover.Root>
  )
}

interface PullRequestMediaProps {
  repository: RepositoryReference
  pullRequest: PullRequestSummary
}

/** The screenshot and video buttons at the foot of a board card. */
export const PullRequestMedia = ({ repository, pullRequest }: PullRequestMediaProps) => (
  <Flex gap="3" align="center">
    <MediaButton
      kind="image"
      isAvailable={pullRequest.media.hasImage}
      mediaUrl={dashboardApi.pullRequestMediaUrl(repository, pullRequest, 'image')}
    />
    <MediaButton
      kind="video"
      isAvailable={pullRequest.media.hasVideo}
      mediaUrl={dashboardApi.pullRequestMediaUrl(repository, pullRequest, 'video')}
    />
  </Flex>
)
