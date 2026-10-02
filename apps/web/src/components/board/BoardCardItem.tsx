import { FileTextIcon, GlobeIcon, Link2Icon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, IconButton, Link, Separator, Text, Tooltip } from '@radix-ui/themes'
import type { BoardCard, IssueSummary, RepositoryReference } from '@dashi/contracts'
import { gitHubPullRequestUrl } from '@/lib/presentation'
import { GateIndicator } from './GateIndicator'
import { PullRequestActions } from './PullRequestActions'
import { PullRequestFilesDrawer } from './PullRequestFilesDrawer'
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

const closedDateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// A closed issue says when it closed and which pull request did it, the only links left to follow.
const ClosedNote = ({ issue, repository }: { issue: IssueSummary; repository: RepositoryReference }) => (
  <Text size="1" color="gray">
    Closed {issue.closedAt ? closedDateFormat.format(new Date(issue.closedAt)) : ''}
    {issue.linkedPullRequestNumbers.map((pullRequestNumber, index) => (
      <span key={pullRequestNumber}>
        {index === 0 ? ' by ' : ', '}
        <Link href={gitHubPullRequestUrl(repository, pullRequestNumber)} target="_blank" rel="noopener noreferrer" color="gray">
          #{pullRequestNumber}
        </Link>
      </span>
    ))}
  </Text>
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
 * One board card: its repository when the board shows several, every issue its pull request works
 * on with the pull request's checks at the top right, then the pull request, and one row of icons.
 * An issue without a pull request has only Start; a pull request has its merge conflict, deploy
 * preview, screenshot, video, changed files, merge and close. A closed issue has no icons, only
 * when it closed and by which pull request.
 */
export const BoardCardItem = ({ card, repository, showRepository, onPullRequestChanged }: BoardCardItemProps) => (
  <Card size="2">
    <Flex direction="column" gap="3">
      <Flex gap="3" align="start" justify="between">
        <Flex direction="column" gap="2" minWidth="0">
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
          {card.status === 'closed' && card.issues[0] && <ClosedNote issue={card.issues[0]} repository={repository} />}
        </Flex>
        {card.pullRequest && <GateIndicator gates={card.pullRequest.gates} summary={card.pullRequest.gateSummary} />}
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
      {card.status !== 'closed' && (
        <>
          <Separator size="4" />
          <Flex className="card-icon-row" gap="2" align="center">
            {card.pullRequest === null ? (
              <StartSessionDialog repository={repository} issue={card.issues[0] ?? null} />
            ) : (
              <>
                {card.pullRequest.mergeable === 'CONFLICTING' && (
                  <StartSessionDialog repository={repository} issue={card.issues[0] ?? null} conflictingPullRequest={card.pullRequest} />
                )}
                <PreviewButton previewUrl={card.pullRequest.previewUrl} />
                <PullRequestMedia repository={repository} pullRequest={card.pullRequest} />
                <PullRequestFilesDrawer repository={repository} pullRequest={card.pullRequest} />
                <PullRequestActions repository={repository} pullRequest={card.pullRequest} onChanged={onPullRequestChanged} />
              </>
            )}
          </Flex>
        </>
      )}
    </Flex>
  </Card>
)
