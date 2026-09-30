import { ExternalLinkIcon, PlayIcon } from '@radix-ui/react-icons'
import { Button, Callout, Dialog, Flex, IconButton, Link, RadioCards, Select, Text, TextArea, Tooltip } from '@radix-ui/themes'
import { useState, type FormEvent } from 'react'
import type {
  HeadlessPermissionMode,
  IssueSummary,
  RepositoryReference,
  SessionStart,
  StartTarget,
  StartWorkflow,
} from '@agent-dashboard/contracts'
import { useStartOptions } from '@/hooks/useSessionStarts'
import { useToast } from '@/hooks/useToast'
import { dashboardApi } from '@/lib/api'
import { permissionModeLabels, permissionModeOrder, startTargetLabels, startTargetOrder, startWorkflowOrder } from '@/lib/presentation'
import { defaultTargetFor, suggestedWorkflowFor, targetAvailabilityFor } from '@/lib/start-session'

interface StartSessionDialogProps {
  repository: RepositoryReference
  issue: IssueSummary | null
}

interface StartChoices {
  workflow: StartWorkflow
  target: StartTarget | null
  permissionMode: HeadlessPermissionMode
  note: string
}

const StartedSummary = ({ start }: { start: SessionStart }) => (
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

/**
 * The Start button on a board card and its dialog: pick a workflow, where the session runs and
 * an optional note, then start it on the laptop runner or a Claude Code routine.
 */
export const StartSessionDialog = ({ repository, issue }: StartSessionDialogProps) => {
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [started, setStarted] = useState<SessionStart | null>(null)
  const [choices, setChoices] = useState<StartChoices>({
    workflow: suggestedWorkflowFor(issue?.labels ?? []),
    target: null,
    permissionMode: 'auto',
    note: '',
  })
  const { options, errorMessage } = useStartOptions(repository, isOpen)
  const chosenTarget = choices.target ?? (options ? defaultTargetFor(options) : null)
  const chosenAvailability = chosenTarget && options ? targetAvailabilityFor(chosenTarget, options) : null

  const changeOpen = (nextOpen: boolean): void => {
    setIsOpen(nextOpen)
    if (!nextOpen) setStarted(null)
  }

  const start = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault()
    if (chosenTarget === null) return
    setIsStarting(true)
    try {
      const sessionStart = await dashboardApi.startSession({
        repository,
        issueNumber: issue?.number ?? null,
        workflow: choices.workflow,
        target: chosenTarget,
        permissionMode: choices.permissionMode,
        note: choices.note,
      })
      if (sessionStart.state === 'failed') toast.notifyError(sessionStart.message ?? 'The session did not start')
      setStarted(sessionStart)
    } catch (startError) {
      toast.notifyError(startError)
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={changeOpen}>
      <Tooltip content="Start a session">
        <Dialog.Trigger>
          <IconButton size="1" variant="ghost" aria-label="Start a session">
            <PlayIcon />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content maxWidth="560px">
        <Dialog.Title>{issue ? `Start #${issue.number}` : 'Start a session'}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {issue ? issue.title : `${repository.owner}/${repository.name}`}
        </Dialog.Description>
        {started ? (
          <Flex direction="column" gap="4">
            <StartedSummary start={started} />
            <Flex justify="end">
              <Dialog.Close>
                <Button>Done</Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        ) : (
          <form onSubmit={(submitEvent) => void start(submitEvent)}>
            <Flex direction="column" gap="4">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Workflow
                </Text>
                <Select.Root value={choices.workflow} onValueChange={(value) => setChoices({ ...choices, workflow: startWorkflowOrder.find((workflow) => workflow === value) ?? choices.workflow })}>
                  <Select.Trigger />
                  <Select.Content>
                    {startWorkflowOrder.map((workflow) => (
                      <Select.Item key={workflow} value={workflow}>
                        {workflow}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  Where it runs
                </Text>
                {errorMessage && (
                  <Callout.Root color="red" size="1">
                    <Callout.Text>{errorMessage}</Callout.Text>
                  </Callout.Root>
                )}
                <RadioCards.Root
                  value={chosenTarget ?? undefined}
                  onValueChange={(value) => setChoices({ ...choices, target: startTargetOrder.find((target) => target === value) ?? null })}
                  columns={{ initial: '1', sm: '2' }}
                >
                  {startTargetOrder.map((target) => {
                    const availability = options ? targetAvailabilityFor(target, options) : { isAvailable: false, hint: null }
                    return (
                      <RadioCards.Item key={target} value={target} disabled={!availability.isAvailable}>
                        <Flex direction="column" gap="1" width="100%">
                          <Text size="2" weight="medium">
                            {startTargetLabels[target].name}
                          </Text>
                          <Text size="1" color="gray">
                            {availability.isAvailable ? startTargetLabels[target].description : availability.hint}
                          </Text>
                        </Flex>
                      </RadioCards.Item>
                    )
                  })}
                </RadioCards.Root>
                {chosenAvailability?.hint && chosenAvailability.isAvailable && (
                  <Text size="1" color="amber">
                    {chosenAvailability.hint}
                  </Text>
                )}
              </Flex>
              {chosenTarget === 'laptop-headless' && (
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    Permissions
                  </Text>
                  <Select.Root
                    value={choices.permissionMode}
                    onValueChange={(value) =>
                      setChoices({ ...choices, permissionMode: permissionModeOrder.find((permissionMode) => permissionMode === value) ?? 'auto' })
                    }
                  >
                    <Select.Trigger />
                    <Select.Content>
                      {permissionModeOrder.map((permissionMode) => (
                        <Select.Item key={permissionMode} value={permissionMode}>
                          {permissionModeLabels[permissionMode]}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>
              )}
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Note for the session
                </Text>
                <TextArea
                  maxLength={2000}
                  placeholder="Optional: anything the issue does not say"
                  value={choices.note}
                  onChange={(changeEvent) => setChoices({ ...choices, note: changeEvent.target.value })}
                />
              </label>
              <Flex gap="3" justify="end">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" loading={isStarting} disabled={chosenAvailability?.isAvailable !== true}>
                  <PlayIcon /> Start
                </Button>
              </Flex>
            </Flex>
          </form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
