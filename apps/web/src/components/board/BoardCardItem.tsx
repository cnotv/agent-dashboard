import { FileTextIcon, GlobeIcon, Link2Icon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, IconButton, Link, Separator, Text, Tooltip } from '@radix-ui/themes'
import type { BoardCard, IssueSummary, RepositoryReference } from '@agent-dashboard/contracts'
import { GateIndicator } from './GateIndicator'
import { PullRequestActions } from './PullRequestActions'
import { PullRequestMedia } from './PullRequestMedia'
import { StartSessionDialog } from './StartSessionDialog'

interface BoardCardItemProps {
  card: BoardCard
  repository: RepositoryReference
  showRepository: boolean
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
 * One board card: its repository when the board shows several, every issue its pull request works on, then the pull request, and one row of
 * icons: Start, then the pull request's checks, merge conflict, deploy preview, screenshot,
 * video, merge and close.
 */
export const BoardCardItem = ({ card, repository, showRepository, onPullRequestChanged }: BoardCardItemProps) => (
  <Card size="2">
    <Flex direction="column" gap="3">
      <Flex direction="column" gap="2">
        {showRepository && (
          <Text size="1" color="gray">
            {repository.owner}/{repository.name}
          </Text>
        )}
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
              <StartSessionDialog repository={repository} issue={card.issues[0] ?? null} conflictingPullRequest={card.pullRequest} />
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
