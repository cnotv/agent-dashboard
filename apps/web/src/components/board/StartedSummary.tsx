import { ExternalLinkIcon } from '@radix-ui/react-icons'
import { Flex, Link, Text } from '@radix-ui/themes'
import type { SessionStart } from '@dashi/contracts'

/**
 * What a start dialog shows once the start went out: queued for the runner, or the session's link.
 */
export const StartedSummary = ({ start }: { start: SessionStart }) => (
  <Flex direction="column" gap="3">
    <Text size="2">
      {start.state === 'queued' ? 'Queued. The laptop runner picks it up within a few seconds of its next check.' : start.message}
    </Text>
    {start.sessionUrl && (
      <Link href={start.sessionUrl} target="_blank" rel="noopener noreferrer" size="2">
        <Flex gap="1" align="center" asChild>
          <span>
            Open the session in Claude <ExternalLinkIcon />
          </span>
        </Flex>
      </Link>
    )}
    <Text size="1" color="gray">
      The Sessions page follows it from here.
    </Text>
  </Flex>
)
