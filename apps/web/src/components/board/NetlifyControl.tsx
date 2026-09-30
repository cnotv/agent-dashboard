import { CheckCircledIcon, RocketIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Flex, Tooltip } from '@radix-ui/themes'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import type { RepositoryReference } from '@agent-dashboard/contracts'
import { useNetlifyStatus } from '@/hooks/useNetlifyStatus'
import { useToast } from '@/hooks/useToast'
import { repositoryKey } from '@/lib/presentation'

/**
 * Netlify for the selected repository: a green button to its site when one builds it, and
 * otherwise an Enable button that creates the site after a confirmation.
 */
export const NetlifyControl = ({ repository }: { repository: RepositoryReference }) => {
  const { status, errorMessage, enable } = useNetlifyStatus(repository)
  const toast = useToast()
  const [isEnabling, setIsEnabling] = useState(false)

  const enableNetlify = async (): Promise<void> => {
    setIsEnabling(true)
    try {
      await enable()
      toast.notifySuccess(`Netlify now builds ${repositoryKey(repository)}`)
    } catch (enableError) {
      toast.notifyError(enableError)
    } finally {
      setIsEnabling(false)
    }
  }

  if (errorMessage !== null) {
    return (
      <Tooltip content={errorMessage}>
        <Button variant="soft" color="gray" disabled>
          <RocketIcon /> Netlify unavailable
        </Button>
      </Tooltip>
    )
  }

  if (status === null) return null

  if (status.state === 'active') {
    return (
      <Tooltip content={`Netlify builds this repository as ${status.siteName}`}>
        <Button variant="soft" color="green" asChild>
          <a href={status.adminUrl} target="_blank" rel="noopener noreferrer">
            <CheckCircledIcon /> Netlify
          </a>
        </Button>
      </Tooltip>
    )
  }

  if (status.state === 'missing-token') {
    return (
      <Tooltip content="Save a Netlify token under Credentials first">
        <Button variant="soft" color="gray" asChild>
          <RouterLink to="/credentials">
            <RocketIcon /> Enable Netlify
          </RouterLink>
        </Button>
      </Tooltip>
    )
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button variant="soft" loading={isEnabling}>
          <RocketIcon /> Enable Netlify
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="460px">
        <AlertDialog.Title>Enable Netlify for {repositoryKey(repository)}?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Creates a Netlify site that builds the default branch and posts a deploy preview on every pull request. The
          build command and folder come from the repository&rsquo;s netlify.toml.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button onClick={() => void enableNetlify()}>Enable</Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  )
}
