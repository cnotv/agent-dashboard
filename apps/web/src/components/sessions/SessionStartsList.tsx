import { ChatBubbleIcon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, Heading, IconButton, Link, Table, Text, Tooltip } from '@radix-ui/themes'
import type { SessionStart } from '@agent-dashboard/contracts'
import { sessionStartStateColors, sessionStartStateLabels, startTargetLabels } from '@/lib/presentation'
import { canChatWithStart } from '@/lib/session-chat'

interface SessionStartsListProps {
  starts: SessionStart[]
  onOpenChat: (start: SessionStart) => void
}

/**
 * The sessions started from the board, newest first: where each runs, its state, its link or
 * message, and for one running on the laptop the button that opens its conversation.
 */
export const SessionStartsList = ({ starts, onOpenChat }: SessionStartsListProps) => (
  <Card size="2">
    <Flex direction="column" gap="3">
      <Heading as="h2" size="3" weight="medium">
        Started from the board
      </Heading>
      <Table.Root variant="ghost" size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell aria-label="Chat" />
            <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Work</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Where</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>State</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {starts.map((start) => (
            <Table.Row key={start.startId} align="center">
              <Table.Cell>
                {canChatWithStart(start) && (
                  <Tooltip content="Open the conversation">
                    <IconButton
                      size="1"
                      variant="ghost"
                      aria-label={`Chat with ${start.repository.name} ${start.workflow}`}
                      onClick={() => onOpenChat(start)}
                    >
                      <ChatBubbleIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Table.Cell>
              <Table.Cell>
                <Text size="1" color="gray">
                  {new Date(start.createdAt).toLocaleString()}
                </Text>
              </Table.Cell>
              <Table.RowHeaderCell>
                <Text size="2">
                  {start.repository.name}
                  {start.issueNumber === null ? '' : ` #${start.issueNumber}`} · {start.workflow}
                </Text>
              </Table.RowHeaderCell>
              <Table.Cell>
                <Text size="1">
                  {startTargetLabels[start.target].name}
                  {start.runnerLabel ? ` (${start.runnerLabel})` : ''}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Flex direction="column" gap="1" align="start">
                  <Badge color={sessionStartStateColors[start.state]} radius="full">
                    {sessionStartStateLabels[start.state]}
                  </Badge>
                  {start.sessionUrl ? (
                    <Link href={start.sessionUrl} target="_blank" rel="noopener noreferrer" size="1">
                      <Flex gap="1" align="center" asChild>
                        <span>
                          Open in Claude <ExternalLinkIcon />
                        </span>
                      </Flex>
                    </Link>
                  ) : (
                    start.message && (
                      <Text size="1" color="gray">
                        {start.message}
                      </Text>
                    )
                  )}
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  </Card>
)
