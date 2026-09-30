import { FileTextIcon, GlobeIcon, Link2Icon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, Link, Separator, Text } from '@radix-ui/themes'
import type { BoardCard, IssueSummary, RepositoryReference } from '@agent-dashboard/contracts'
import { GateIndicator } from './GateIndicator'
import { PullRequestActions } from './PullRequestActions'
import { PullRequestMedia } from './PullRequestMedia'

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

/**
 * One board card: every issue its pull request works on, then the pull request with its checks,
 * its deploy preview, the screenshot and video, and the merge and close buttons.
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
          <Flex direction="column" gap="2">
            <Flex gap="2" align="start">
              {card.pullRequest.isDraft ? <FileTextIcon /> : <Link2Icon />}
              <Link href={card.pullRequest.url} target="_blank" rel="noopener noreferrer" size="1" color="gray" underline="hover">
                #{card.pullRequest.number} {card.pullRequest.title}
              </Link>
            </Flex>
            {card.pullRequest.mergeable === 'CONFLICTING' && (
              <Badge color="red" radius="full">
                Merge conflict
              </Badge>
            )}
            <Flex justify="between" align="center" gap="3" wrap="wrap">
              <GateIndicator gates={card.pullRequest.gates} summary={card.pullRequest.gateSummary} />
              {card.pullRequest.previewUrl && (
                <Link href={card.pullRequest.previewUrl} target="_blank" rel="noopener noreferrer" size="1">
                  <Flex gap="1" align="center" asChild>
                    <span>
                      <GlobeIcon /> Preview
                    </span>
                  </Flex>
                </Link>
              )}
            </Flex>
          </Flex>
          <Separator size="4" />
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <PullRequestMedia repository={repository} pullRequest={card.pullRequest} />
            <PullRequestActions repository={repository} pullRequest={card.pullRequest} onChanged={onPullRequestChanged} />
          </Flex>
        </>
      )}
    </Flex>
  </Card>
)
