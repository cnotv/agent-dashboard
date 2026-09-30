import { ExclamationTriangleIcon, FileTextIcon, GlobeIcon, Link2Icon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, IconButton, Link, Separator, Text, Tooltip } from '@radix-ui/themes'
import type { BoardCard, IssueSummary, RepositoryReference } from '@agent-dashboard/contracts'
import { GateIndicator } from './GateIndicator'
import { PullRequestActions } from './PullRequestActions'
import { PullRequestMedia } from './PullRequestMedia'
import { StartSessionDialog } from './StartSessionDialog'

interface BoardCardItemProps {
  card: BoardCard
  repository: RepositoryReference
  onPullRequestChanged: () => void
}

const IssueHeading = ({ issue }: { issue: IssueSummary }) => (
  <Flex direction="column" gap="1">
    <Link href={issue.url} target="_blank" rel="noopener noreferrer" size="2" weight="medium" highContrast underline="hover">
      #{issue.number} {issue.title}
    </Link>
    {issue.labels.length > 0 && (
      <Flex gap="1" wrap="wrap">
        {issue.labels.map((label) => (
          <Badge key={label.name} variant="outline" color="gray" radius="full">
            {label.name}
          </Badge>
        ))}
      </Flex>
    )}
  </Flex>
)

const PreviewButton = ({ previewUrl }: { previewUrl: string | null }) =>
  previewUrl === null ? (
    <Tooltip content="No deploy preview yet">
      <span>
        <IconButton size="1" variant="ghost" color="gray" disabled aria-label="No deploy preview yet">
          <GlobeIcon />
        </IconButton>
      </span>
    </Tooltip>
  ) : (
    <Tooltip content="Open the deploy preview">
      <IconButton size="1" variant="ghost" aria-label="Open the deploy preview" asChild>
        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
          <GlobeIcon />
        </a>
      </IconButton>
    </Tooltip>
  )

/**
 * One board card: every issue its pull request works on, then the pull request, and one row of
 * icons: Start, then the pull request's checks, merge conflict, deploy preview, screenshot,
 * video, merge and close.
 */
export const BoardCardItem = ({ card, repository, onPullRequestChanged }: BoardCardItemProps) => (
  <Card size="2">
    <Flex direction="column" gap="3">
      <Flex direction="column" gap="2">
        {card.issues.length === 0 ? (
          <Text size="2" color="gray">
            No linked issue
          </Text>
        ) : (
          card.issues.map((issue) => <IssueHeading key={issue.number} issue={issue} />)
        )}
      </Flex>
      {card.pullRequest && (
        <>
          <Separator size="4" />
          <Flex gap="2" align="start">
            {card.pullRequest.isDraft ? <FileTextIcon /> : <Link2Icon />}
            <Link href={card.pullRequest.url} target="_blank" rel="noopener noreferrer" size="1" color="gray" underline="hover">
              #{card.pullRequest.number} {card.pullRequest.title}
            </Link>
          </Flex>
        </>
      )}
      <Separator size="4" />
      <Flex className="card-icon-row" gap="2" align="center">
        <StartSessionDialog repository={repository} issue={card.issues[0] ?? null} />
        {card.pullRequest && (
          <>
            <GateIndicator gates={card.pullRequest.gates} summary={card.pullRequest.gateSummary} />
            {card.pullRequest.mergeable === 'CONFLICTING' && (
              <Tooltip content="Merge conflict">
                <IconButton size="1" variant="ghost" color="red" aria-label="Merge conflict" asChild>
                  <a href={card.pullRequest.url} target="_blank" rel="noopener noreferrer">
                    <ExclamationTriangleIcon />
                  </a>
                </IconButton>
              </Tooltip>
            )}
            <PreviewButton previewUrl={card.pullRequest.previewUrl} />
            <PullRequestMedia repository={repository} pullRequest={card.pullRequest} />
            <PullRequestActions repository={repository} pullRequest={card.pullRequest} onChanged={onPullRequestChanged} />
          </>
        )}
      </Flex>
    </Flex>
  </Card>
)
