import { Badge, Button, Card, Dialog, Flex, Heading, Table, Tabs, Text, TextField } from '@radix-ui/themes'
import { useState, type FormEvent } from 'react'
import { useMachineTokens } from '@/hooks/useActivity'
import { CopyableSnippet } from './CopyableSnippet'
import { useToast } from '@/hooks/useToast'
import { runtimeConfiguration } from '@/lib/runtime-configuration'
import { runnerLaunchAgentCommands, runnerTryCommands } from '@/lib/runner-setup'

const dashboardUrl = (): string => runtimeConfiguration.apiBaseUrl || window.location.origin

/**
 * The Laptop runner panel: issues a runner token, shows it once inside the commands that install
 * the runner on a Mac, and lists runners with when each last asked for work.
 */
export const RunnerPanel = () => {
  const toast = useToast()
  const { machineTokens: runnerTokens, createMachineToken, revokeMachineToken } = useMachineTokens('runner', toast.notifyError)
  const [isOpen, setIsOpen] = useState(false)
  const [runnerLabel, setRunnerLabel] = useState('')
  const [runnerToken, setRunnerToken] = useState<string | null>(null)

  const closeDialog = (nextOpen: boolean): void => {
    setIsOpen(nextOpen)
    if (!nextOpen) {
      setRunnerToken(null)
      setRunnerLabel('')
    }
  }

  const create = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault()
    try {
      setRunnerToken((await createMachineToken(runnerLabel)).token)
    } catch (createError) {
      toast.notifyError(createError)
    }
  }

  const revoke = async (tokenId: string, label: string): Promise<void> => {
    try {
      await revokeMachineToken(tokenId)
      toast.notifySuccess(`${label} revoked`)
    } catch (revokeError) {
      toast.notifyError(revokeError)
    }
  }

  const setupInput = runnerToken === null ? null : { dashboardUrl: dashboardUrl(), runnerToken }

  return (
    <Card size="2">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="start" gap="4" wrap="wrap">
          <Flex direction="column" gap="1" maxWidth="620px">
            <Heading as="h2" size="3" weight="medium">
              Laptop runner
            </Heading>
            <Text size="2" color="gray">
              Runs the sessions you start from the board, the phone included, on your own laptop. It asks this
              dashboard for work every few seconds, so nothing here reaches into the laptop. Its token can only take
              and report starts.
            </Text>
          </Flex>
          <Dialog.Root open={isOpen} onOpenChange={closeDialog}>
            <Dialog.Trigger>
              <Button size="2">New runner</Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="720px">
              <Dialog.Title>Set up a laptop runner</Dialog.Title>
              {setupInput === null ? (
                <form onSubmit={(submitEvent) => void create(submitEvent)}>
                  <Dialog.Description size="2" color="gray" mb="4">
                    Name the machine. It needs Node 22.18 or later, git and Claude Code, logged in; tmux 3.2 or later
                    for sessions steered from the phone (brew install tmux).
                  </Dialog.Description>
                  <TextField.Root
                    autoFocus
                    aria-label="Machine"
                    maxLength={80}
                    placeholder="Mac mini"
                    value={runnerLabel}
                    onChange={(changeEvent) => setRunnerLabel(changeEvent.target.value)}
                  />
                  <Flex gap="3" mt="5" justify="end">
                    <Dialog.Close>
                      <Button type="button" variant="soft" color="gray">
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <Button type="submit" disabled={runnerLabel.trim().length === 0}>
                      Create token
                    </Button>
                  </Flex>
                </form>
              ) : (
                <Flex direction="column" gap="3">
                  <Dialog.Description size="2" color="gray">
                    The token is in the commands below and shown only now; the dashboard keeps just its hash. Paste
                    them into Terminal on that machine.
                  </Dialog.Description>
                  <Tabs.Root defaultValue="service">
                    <Tabs.List>
                      <Tabs.Trigger value="service">Start with the Mac</Tabs.Trigger>
                      <Tabs.Trigger value="try">Try it once</Tabs.Trigger>
                    </Tabs.List>
                    <Tabs.Content value="service">
                      <Text as="p" size="2" color="gray" my="2">
                        Installs it as a login agent that starts with the Mac and restarts if it stops. Its log is
                        ~/agent-dashboard/runner.log.
                      </Text>
                      <CopyableSnippet snippet={runnerLaunchAgentCommands(setupInput)} />
                    </Tabs.Content>
                    <Tabs.Content value="try">
                      <Text as="p" size="2" color="gray" my="2">
                        Runs it in this terminal until you close it.
                      </Text>
                      <CopyableSnippet snippet={runnerTryCommands(setupInput).join('\n')} />
                    </Tabs.Content>
                  </Tabs.Root>
                  <Flex justify="end">
                    <Dialog.Close>
                      <Button>Done</Button>
                    </Dialog.Close>
                  </Flex>
                </Flex>
              )}
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        {runnerTokens.length > 0 && (
          <Table.Root variant="ghost" size="2">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Machine</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Last asked for work</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {runnerTokens.map((runnerToken) => (
                <Table.Row key={runnerToken.tokenId} align="center">
                  <Table.RowHeaderCell>
                    <Text size="2" weight="medium">
                      {runnerToken.label}
                    </Text>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    {runnerToken.lastUsedAt ? (
                      <Text size="2" color="gray">
                        {new Date(runnerToken.lastUsedAt).toLocaleString()}
                      </Text>
                    ) : (
                      <Badge variant="outline" color="gray" radius="full">
                        Never
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell justify="end">
                    <Button size="1" variant="ghost" color="red" onClick={() => void revoke(runnerToken.tokenId, runnerToken.label)}>
                      Revoke
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Flex>
    </Card>
  )
}
