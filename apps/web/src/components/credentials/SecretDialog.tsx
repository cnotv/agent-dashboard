import { ExternalLinkIcon } from '@radix-ui/react-icons'
import { Button, Dialog, Flex, Link, Text, TextField } from '@radix-ui/themes'
import { useState, type FormEvent } from 'react'
import type { SecretSummary } from '@dashi/contracts'
import { useToast } from '@/hooks/useToast'

interface SecretDialogProps {
  secret: SecretSummary
  disabled: boolean
  onSave: (name: string, value: string) => Promise<void>
}

/** The dialog that adds or replaces one stored secret; the value is cleared as soon as it is sent. */
export const SecretDialog = ({ secret, disabled, onSave }: SecretDialogProps) => {
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [secretValue, setSecretValue] = useState('')

  const save = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault()
    try {
      await onSave(secret.name, secretValue)
      toast.notifySuccess(`${secret.label} saved`)
      setIsOpen(false)
    } catch (saveError) {
      toast.notifyError(saveError)
    } finally {
      setSecretValue('')
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger>
        <Button size="1" variant={secret.isSet ? 'soft' : 'solid'} color={secret.isSet ? 'gray' : undefined} disabled={disabled}>
          {secret.isSet ? 'Replace' : 'Add'}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="460px">
        <Dialog.Title>{secret.label}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="2">
          {secret.description} The value is encrypted on the server and never shown again.
        </Dialog.Description>
        <Link href={secret.tokenPageUrl} target="_blank" rel="noopener noreferrer" size="2">
          <Flex gap="1" align="center" mb="4" asChild>
            <span>
              Create one on {new URL(secret.tokenPageUrl).hostname} <ExternalLinkIcon />
            </span>
          </Flex>
        </Link>
        <form onSubmit={(submitEvent) => void save(submitEvent)}>
          <label>
            <Text as="div" size="2" mb="1" weight="medium">
              Value
            </Text>
            <TextField.Root
              type="password"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              value={secretValue}
              onChange={(changeEvent) => setSecretValue(changeEvent.target.value)}
            />
          </label>
          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={secretValue.trim().length === 0}>
              Save
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  )
}
