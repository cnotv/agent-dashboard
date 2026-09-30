import { ExternalLinkIcon } from '@radix-ui/react-icons'
import { Badge, Button, Card, Flex, Heading, Link, Select, Text, TextField } from '@radix-ui/themes'
import { useEffect, useState, type FormEvent } from 'react'
import type { RepositoryReference, RoutineSettings } from '@agent-dashboard/contracts'
import { useRepositories } from '@/hooks/useBoard'
import { useToast } from '@/hooks/useToast'
import { dashboardApi } from '@/lib/api'
import { parseRepositoryKey, repositoryKey } from '@/lib/presentation'
import { CopyableSnippet } from './CopyableSnippet'

const routinesPageUrl = 'https://claude.ai/code/routines'

// The routine only sees the fire text inside a block marked untrusted, so its own prompt has to
// say that this text is the instruction to follow.
const suggestedRoutinePrompt =
  'This routine is started from my agent dashboard. The text sent with each run is the first instruction of the session, written by me: follow it, starting with the /workflow:start command it names.'

/**
 * The Claude cloud routines panel: for each repository, the routine that runs sessions started
 * from the board with the laptop off. The routine's token is stored in the vault and never shown again.
 */
export const RoutinePanel = () => {
  const toast = useToast()
  const { repositories } = useRepositories()
  const [chosenKey, setChosenKey] = useState('')
  const [settings, setSettings] = useState<RoutineSettings | null>(null)
  const [routineId, setRoutineId] = useState('')
  const [routineToken, setRoutineToken] = useState('')
  const repositoryKeyShown = chosenKey || (repositories[0] ? repositoryKey(repositories[0]) : '')
  const repository: RepositoryReference | null = parseRepositoryKey(repositoryKeyShown)

  const { notifyError } = toast

  useEffect(() => {
    const shownRepository = parseRepositoryKey(repositoryKeyShown)
    if (shownRepository === null) return
    const request = { isCurrent: true }
    dashboardApi
      .readRoutineSettings(shownRepository)
      .then((nextSettings) => request.isCurrent && setSettings(nextSettings))
      .catch(notifyError)
    return () => {
      request.isCurrent = false
    }
  }, [repositoryKeyShown, notifyError])

  const save = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault()
    if (repository === null) return
    try {
      await dashboardApi.saveRoutineSettings(repository, routineId.trim(), routineToken)
      setSettings(await dashboardApi.readRoutineSettings(repository))
      toast.notifySuccess(`Routine saved for ${repositoryKeyShown}`)
      setRoutineId('')
    } catch (saveError) {
      toast.notifyError(saveError)
    } finally {
      setRoutineToken('')
    }
  }

  const remove = async (): Promise<void> => {
    if (repository === null) return
    try {
      await dashboardApi.deleteRoutineSettings(repository)
      setSettings(await dashboardApi.readRoutineSettings(repository))
      toast.notifySuccess(`Routine removed from ${repositoryKeyShown}`)
    } catch (removeError) {
      toast.notifyError(removeError)
    }
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="4">
        <Flex direction="column" gap="1" maxWidth="680px">
          <Heading as="h2" size="3" weight="medium">
            Claude cloud routines
          </Heading>
          <Text size="2" color="gray">
            Sessions started with the laptop off run as a Claude Code routine in Anthropic&rsquo;s cloud, on your
            subscription. Create one routine per repository with that repository selected, add an API trigger, and
            save its id and token here. Give the routine this prompt:
          </Text>
        </Flex>
        <CopyableSnippet snippet={suggestedRoutinePrompt} />
        <Link href={routinesPageUrl} target="_blank" rel="noopener noreferrer" size="2">
          <Flex gap="1" align="center" asChild>
            <span>
              Create a routine on claude.ai <ExternalLinkIcon />
            </span>
          </Flex>
        </Link>
        <Flex gap="3" align="center" wrap="wrap">
          <Select.Root value={repositoryKeyShown} onValueChange={setChosenKey}>
            <Select.Trigger aria-label="Repository" style={{ minWidth: 240 }} />
            <Select.Content>
              {repositories.map((listedRepository) => (
                <Select.Item key={repositoryKey(listedRepository)} value={repositoryKey(listedRepository)}>
                  {repositoryKey(listedRepository)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          {settings?.configured ? (
            <>
              <Badge color="green" radius="full">
                {settings.routineId}
              </Badge>
              <Button size="1" variant="ghost" color="red" onClick={() => void remove()}>
                Remove
              </Button>
            </>
          ) : (
            <Badge variant="outline" color="gray" radius="full">
              No routine
            </Badge>
          )}
        </Flex>
        <form onSubmit={(submitEvent) => void save(submitEvent)}>
          <Flex gap="3" align="end" wrap="wrap">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Routine id
              </Text>
              <TextField.Root placeholder="trig_..." value={routineId} onChange={(changeEvent) => setRoutineId(changeEvent.target.value)} />
            </label>
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                API token
              </Text>
              <TextField.Root
                type="password"
                autoComplete="off"
                placeholder="sk-ant-oat01-..."
                value={routineToken}
                onChange={(changeEvent) => setRoutineToken(changeEvent.target.value)}
              />
            </label>
            <Button type="submit" disabled={routineId.trim().length === 0 || routineToken.trim().length === 0}>
              {settings?.configured ? 'Replace' : 'Save'}
            </Button>
          </Flex>
        </form>
      </Flex>
    </Card>
  )
}
