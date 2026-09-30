import { LockClosedIcon, LockOpen1Icon } from '@radix-ui/react-icons'
import { Button, Callout, Flex, Text, TextField } from '@radix-ui/themes'
import { useState, type FormEvent } from 'react'
import type { VaultState } from '@agent-dashboard/contracts'
import { useToast } from '@/hooks/useToast'

interface VaultPanelProps {
  vaultState: VaultState
  onSetUp: (passphrase: string) => Promise<void>
  onUnlock: (passphrase: string) => Promise<void>
  onLock: () => Promise<void>
}

/** The vault's state, with the passphrase form to set it up or unlock it, and the lock button. */
/** The vault's state, with the passphrase form to set it up or unlock it, and the lock button. */
/** The vault's state, with the passphrase form to set it up or unlock it, and the lock button. */
export const VaultPanel = ({ vaultState, onSetUp, onUnlock, onLock }: VaultPanelProps) => {
  const toast = useToast()
  const [passphrase, setPassphrase] = useState('')

  const runVaultAction = async (action: () => Promise<void>, successMessage: string): Promise<void> => {
    try {
      await action()
      setPassphrase('')
      toast.notifySuccess(successMessage)
    } catch (actionError) {
      toast.notifyError(actionError)
    }
  }

  const submitPassphrase = (submitEvent: FormEvent): void => {
    submitEvent.preventDefault()
    void (vaultState.initialised
      ? runVaultAction(() => onUnlock(passphrase), 'Vault unlocked')
      : runVaultAction(() => onSetUp(passphrase), 'Vault created'))
  }

  if (vaultState.mode === 'environment') {
    return vaultState.unlocked ? (
      <Callout.Root color="green" variant="surface">
        <Callout.Icon>
          <LockOpen1Icon />
        </Callout.Icon>
        <Callout.Text>Unlocked by the master key from the environment.</Callout.Text>
      </Callout.Root>
    ) : (
      <Callout.Root color="red" variant="surface">
        <Callout.Icon>
          <LockClosedIcon />
        </Callout.Icon>
        <Callout.Text>
          The stored credentials were encrypted with a different AGENT_DASHBOARD_MASTER_KEY. Restart the dashboard with the
          original key.
        </Callout.Text>
      </Callout.Root>
    )
  }

  if (vaultState.unlocked) {
    return (
      <Callout.Root color="green" variant="surface">
        <Callout.Icon>
          <LockOpen1Icon />
        </Callout.Icon>
        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <Callout.Text>Unlocked until the next restart. The passphrase-derived key is held in memory only.</Callout.Text>
          <Button size="1" variant="soft" color="gray" onClick={() => void runVaultAction(onLock, 'Vault locked')}>
            Lock now
          </Button>
        </Flex>
      </Callout.Root>
    )
  }

  return (
    <Callout.Root variant="surface">
      <Callout.Icon>
        <LockClosedIcon />
      </Callout.Icon>
      <Flex direction="column" gap="3">
        <Text size="2" weight="medium">
          {vaultState.initialised ? 'The vault is locked' : 'Set a vault passphrase'}
        </Text>
        <form onSubmit={submitPassphrase}>
          <Flex gap="2" wrap="wrap" align="center">
            <TextField.Root
              type="password"
              placeholder="Passphrase"
              aria-label="Passphrase"
              autoComplete="current-password"
              value={passphrase}
              onChange={(changeEvent) => setPassphrase(changeEvent.target.value)}
              style={{ minWidth: 260 }}
            />
            <Button type="submit" disabled={passphrase.length === 0}>
              {vaultState.initialised ? 'Unlock' : 'Create vault'}
            </Button>
          </Flex>
        </form>
        {!vaultState.initialised && (
          <Text size="1" color="gray">
            At least 12 characters. It cannot be recovered: losing it means entering the credentials again.
          </Text>
        )}
      </Flex>
    </Callout.Root>
  )
}
