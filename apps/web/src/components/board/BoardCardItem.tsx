import { FileTextIcon, Link2Icon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, Link, Separator, Text } from '@radix-ui/themes'
import type { BoardCard, RepositoryReference } from '@agent-dashboard/contracts'
import { GateStrip } from './GateStrip'
import { PullRequestMedia } from './PullRequestMedia'

/** One board card: the issue, its labels, and its pull request with the check gates. */
export const BoardCardItem = ({ card, repository }: { card: BoardCard; repository: RepositoryReference }) => (
  <Card size="2">
    <Flex direction="column" gap="3">
      <Flex direction="column" gap="2">
        {card.issue ? (
          <Link href={card.issue.url} target="_blank" rel="noopener noreferrer" size="2" weight="medium" highContrast underline="hover">
            #{card.issue.number} {card.issue.title}
          </Link>
        ) : (
          <Text size="2" color="gray">
            No linked issue
          </Text>
        )}
        {card.issue && card.issue.labels.length > 0 && (
          <Flex gap="1" wrap="wrap">
            {card.issue.labels.map((label) => (
              <Badge key={label.name} variant="outline" color="gray" radius="full">
                {label.name}
              </Badge>
            ))}
          </Flex>
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
            <GateStrip gates={card.pullRequest.gates} summary={card.pullRequest.gateSummary} />
          </Flex>
          <Separator size="4" />
          <PullRequestMedia repository={repository} pullRequest={card.pullRequest} />
        </>
      )}
    </Flex>
  </Card>
)
