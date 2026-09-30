import { Badge, Button, Card, Code, Dialog, Flex, Heading, Table, Text, TextField } from '@radix-ui/themes'
import { useState, type FormEvent } from 'react'
import { useIngestTokens } from '@/hooks/useActivity'
import { useToast } from '@/hooks/useToast'
import { connectSnippet } from '@/lib/connect-snippet'
import { runtimeConfiguration } from '@/lib/runtime-configuration'

const dashboardUrl = (): string => runtimeConfiguration.apiBaseUrl || window.location.origin

/** The Connect Claude Code panel: issues a machine's ingest token, shows it once in a settings snippet, and lists tokens to revoke. */
export const ConnectAgentsPanel = () => {
  const toast = useToast()
  const { ingestTokens, createIngestToken, revokeIngestToken } = useIngestTokens(toast.notifyError)
  const [isOpen, setIsOpen] = useState(false)
  const [tokenLabel, setTokenLabel] = useState('')
  const [snippet, setSnippet] = useState<string | null>(null)

  const closeDialog = (nextOpen: boolean): void => {
    setIsOpen(nextOpen)
    if (!nextOpen) {
      setSnippet(null)
      setTokenLabel('')
    }
  }

  const create = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault()
    try {
      const createdToken = await createIngestToken(tokenLabel)
      setSnippet(connectSnippet({ dashboardUrl: dashboardUrl(), ingestToken: createdToken.token }))
    } catch (createError) {
      toast.notifyError(createError)
    }
  }

  const copySnippet = async (): Promise<void> => {
    if (snippet === null) return
    try {
      await navigator.clipboard.writeText(snippet)
      toast.notifySuccess('Copied')
    } catch (copyError) {
      toast.notifyError(copyError)
    }
  }

  const revoke = async (tokenId: string, label: string): Promise<void> => {
    try {
      await revokeIngestToken(tokenId)
      toast.notifySuccess(`${label} revoked`)
    } catch (revokeError) {
      toast.notifyError(revokeError)
    }
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="start" gap="4" wrap="wrap">
          <Flex direction="column" gap="1" maxWidth="620px">
            <Heading as="h2" size="3" weight="medium">
              Connect Claude Code
            </Heading>
            <Text size="2" color="gray">
              Each machine running Claude Code gets its own token. Its hooks report session state and its telemetry
              reports tokens used, and neither can read anything back from this dashboard.
            </Text>
          </Flex>
          <Dialog.Root open={isOpen} onOpenChange={closeDialog}>
            <Dialog.Trigger>
              <Button size="2">New token</Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="640px">
              <Dialog.Title>Connect a machine</Dialog.Title>
              {snippet === null ? (
                <form onSubmit={(submitEvent) => void create(submitEvent)}>
                  <Dialog.Description size="2" color="gray" mb="4">
                    Name the machine so you can tell its token apart later.
                  </Dialog.Description>
                  <label>
                    <Text as="div" size="2" mb="1" weight="medium">
                      Machine
                    </Text>
                    <TextField.Root
                      autoFocus
                      maxLength={80}
                      placeholder="Work laptop"
                      value={tokenLabel}
                      onChange={(changeEvent) => setTokenLabel(changeEvent.target.value)}
                    />
                  </label>
                  <Flex gap="3" mt="5" justify="end">
                    <Dialog.Close>
                      <Button type="button" variant="soft" color="gray">
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <Button type="submit" disabled={tokenLabel.trim().length === 0}>
                      Create token
                    </Button>
                  </Flex>
                </form>
              ) : (
                <Flex direction="column" gap="3">
                  <Dialog.Description size="2" color="gray">
                    Merge this into <Code>~/.claude/settings.json</Code> on that machine, then start a new Claude Code
                    session. The token is shown only now; the dashboard keeps just its hash.
                  </Dialog.Description>
                  <pre className="connect-snippet">{snippet}</pre>
                  <Flex gap="3" justify="end">
                    <Button variant="soft" color="gray" onClick={() => void copySnippet()}>
                      Copy
                    </Button>
                    <Dialog.Close>
                      <Button>Done</Button>
                    </Dialog.Close>
                  </Flex>
                </Flex>
              )}
            </Dialog.Content>
          </Dialog.Root>
        </Flex>

        {ingestTokens.length > 0 && (
          <Table.Root variant="ghost" size="2">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Machine</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Last report</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell justify="end">Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {ingestTokens.map((ingestToken) => (
                <Table.Row key={ingestToken.tokenId} align="center">
                  <Table.RowHeaderCell>
                    <Text size="2" weight="medium">
                      {ingestToken.label}
                    </Text>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    {ingestToken.lastUsedAt ? (
                      <Text size="2" color="gray">
                        {new Date(ingestToken.lastUsedAt).toLocaleString()}
                      </Text>
                    ) : (
                      <Badge variant="outline" color="gray" radius="full">
                        Never
                      </Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell justify="end">
                    <Button
                      size="1"
                      variant="ghost"
                      color="red"
                      onClick={() => void revoke(ingestToken.tokenId, ingestToken.label)}
                    >
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
