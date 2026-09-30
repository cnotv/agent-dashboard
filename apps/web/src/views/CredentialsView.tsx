import { Badge, Button, Card, Code, Flex, Table, Text } from '@radix-ui/themes'
import { ConnectAgentsPanel } from '@/components/credentials/ConnectAgentsPanel'
import { SecretDialog } from '@/components/credentials/SecretDialog'
import { VaultPanel } from '@/components/credentials/VaultPanel'
import { useToast } from '@/hooks/useToast'
import { useVault } from '@/hooks/useVault'

/** The Credentials page: the vault and the stored secrets, each with add, test and remove. */
export const CredentialsView = () => {
  const toast = useToast()
  const vault = useVault(toast.notifyError)
  const isUnlocked = vault.vaultState?.unlocked ?? false

  const testSecret = async (name: string, label: string): Promise<void> => {
    try {
      const testResult = await vault.testSecret(name)
      const statusSuffix = testResult.status ? ` (${testResult.status})` : ''
      if (testResult.ok) toast.notifySuccess(`${label}: ${testResult.message}`)
      else toast.notifyError(`${label}: ${testResult.message}${statusSuffix}`)
    } catch (testError) {
      toast.notifyError(testError)
    }
  }

  const deleteSecret = async (name: string, label: string): Promise<void> => {
    try {
      await vault.deleteSecret(name)
      toast.notifySuccess(`${label} removed`)
    } catch (deleteError) {
      toast.notifyError(deleteError)
    }
  }

  return (
    <Flex direction="column" gap="5" maxWidth="1000px">
      {vault.vaultState && (
        <VaultPanel vaultState={vault.vaultState} onSetUp={vault.setUp} onUnlock={vault.unlock} onLock={vault.lock} />
      )}

      <Card size="1">
        <Table.Root variant="ghost" size="2">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Credential</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Stored</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {vault.secrets.map((secret) => (
              <Table.Row key={secret.name} align="center">
                <Table.RowHeaderCell>
                  <Text as="div" size="2" weight="medium">
                    {secret.label}
                  </Text>
                  <Text as="div" size="1" color="gray">
                    {secret.description}
                  </Text>
                </Table.RowHeaderCell>
                <Table.Cell>
                  {secret.isSet ? (
                    <Code variant="soft" color="gray">
                      ••••{secret.lastFour}
                    </Code>
                  ) : (
                    <Badge variant="outline" color="gray" radius="full">
                      Not set
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell justify="end">
                  <Flex gap="2" justify="end" wrap="wrap">
                    <SecretDialog secret={secret} disabled={!isUnlocked} onSave={vault.saveSecret} />
                    <Button
                      size="1"
                      variant="soft"
                      color="gray"
                      disabled={!secret.isSet || !isUnlocked}
                      onClick={() => void testSecret(secret.name, secret.label)}
                    >
                      Test
                    </Button>
                    <Button
                      size="1"
                      variant="ghost"
                      color="red"
                      disabled={!secret.isSet}
                      onClick={() => void deleteSecret(secret.name, secret.label)}
                    >
                      Remove
                    </Button>
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>

      <ConnectAgentsPanel />
    </Flex>
  )
}
