import { Cross2Icon, FileIcon, PlusIcon } from '@radix-ui/react-icons'
import { Badge, Button, Callout, Dialog, Flex, IconButton, Link, Select, Text, TextArea, TextField } from '@radix-ui/themes'
import { useMemo, useRef, useState, type ClipboardEvent, type FormEvent } from 'react'
import type { CreatedIssue, RepositoryReference, SessionStart } from '@dashi/contracts'
import { useRepositories } from '@/hooks/useBoard'
import { useStartChoices } from '@/hooks/useSessionStarts'
import { useToast } from '@/hooks/useToast'
import { dashboardApi } from '@/lib/api'
import { issueBodyFor, readAttachment } from '@/lib/attachments'
import { errorMessageOf, parseRepositoryKey, repositoryKey } from '@/lib/presentation'
import type { PickedAttachment } from '@/lib/types'
import { StartChoicesFields } from './StartChoicesFields'
import { StartedSummary } from './StartedSummary'

interface NewIssueDialogProps {
  defaultRepository: RepositoryReference | null
}

const kilobytesOf = (byteSize: number): string => `${Math.max(1, Math.round(byteSize / 1024))} KB`

const AttachmentList = ({ pickedAttachments, onRemove }: { pickedAttachments: PickedAttachment[]; onRemove: (name: string) => void }) => (
  <Flex gap="2" wrap="wrap">
    {pickedAttachments.map(({ attachment, byteSize }) => (
      <Badge key={attachment.name} color="gray" variant="soft" size="2">
        <FileIcon />
        {attachment.name} · {kilobytesOf(byteSize)}
        <IconButton type="button" size="1" variant="ghost" color="gray" aria-label={`Remove ${attachment.name}`} onClick={() => onRemove(attachment.name)}>
          <Cross2Icon />
        </IconButton>
      </Badge>
    ))}
  </Flex>
)

/**
 * The New issue button and its dialog: a repository, a title, a text and attachments, and where
 * to develop it. It opens the issue on GitHub and starts a session on it with the text and the
 * attachments, which go to the session only and are never stored.
 */
export const NewIssueDialog = ({ defaultRepository }: NewIssueDialogProps) => {
  const toast = useToast()
  const { repositories } = useRepositories()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [chosenRepositoryKey, setChosenRepositoryKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [pickedAttachments, setPickedAttachments] = useState<PickedAttachment[]>([])
  const [createdIssue, setCreatedIssue] = useState<CreatedIssue | null>(null)
  const [started, setStarted] = useState<SessionStart | null>(null)

  const fallbackRepository = defaultRepository ?? repositories[0] ?? null
  const repositoryKeyShown = chosenRepositoryKey ?? (fallbackRepository ? repositoryKey(fallbackRepository) : '')
  const repository = useMemo(() => parseRepositoryKey(repositoryKeyShown), [repositoryKeyShown])
  const attachmentBytes = pickedAttachments.reduce((total, picked) => total + picked.byteSize, 0)
  const { choices, setChoices, options, errorMessage, chosenTarget, chosenAvailability } = useStartChoices(
    repository ?? { owner: '', name: '' },
    isOpen && repository !== null,
    'feature',
    attachmentBytes,
  )
  const attachmentCountLimit = options?.attachmentLimits.fileCount ?? 0
  const canSubmit = repository !== null && title.trim() !== '' && chosenTarget !== null && chosenAvailability?.isAvailable === true

  const resetForm = (): void => {
    setTitle('')
    setText('')
    setPickedAttachments([])
    setCreatedIssue(null)
    setStarted(null)
  }

  const changeOpen = (nextOpen: boolean): void => {
    setIsOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  const addFiles = async (files: File[]): Promise<void> => {
    const roomLeft = attachmentCountLimit - pickedAttachments.length
    if (files.length > roomLeft) toast.notifyError(`Attach at most ${attachmentCountLimit} files`)
    try {
      const added = await files.slice(0, Math.max(0, roomLeft)).reduce<Promise<PickedAttachment[]>>(async (pickedSoFar, file) => {
        const earlier = await pickedSoFar
        const takenNames = [...pickedAttachments, ...earlier].map((picked) => picked.attachment.name)
        return [...earlier, await readAttachment(file, takenNames)]
      }, Promise.resolve([]))
      setPickedAttachments((current) => [...current, ...added])
    } catch (readError) {
      toast.notifyError(readError)
    }
  }

  // A screenshot pasted into the text becomes an attachment, as it would in Claude.
  const attachPastedFiles = (pasteEvent: ClipboardEvent<HTMLTextAreaElement>): void => {
    const pastedFiles = Array.from(pasteEvent.clipboardData.files)
    if (pastedFiles.length === 0) return
    pasteEvent.preventDefault()
    void addFiles(pastedFiles)
  }

  const startOn = async (issue: CreatedIssue, chosenRepository: RepositoryReference): Promise<void> => {
    if (chosenTarget === null) return
    try {
      const sessionStart = await dashboardApi.startSession({
        repository: chosenRepository,
        issueNumber: issue.number,
        pullRequestNumber: null,
        workflow: choices.workflow,
        target: chosenTarget,
        permissionMode: choices.permissionMode,
        note: text.trim(),
        attachments: pickedAttachments.map((picked) => picked.attachment),
      })
      if (sessionStart.state === 'failed') toast.notifyError(sessionStart.message ?? 'The session did not start')
      setStarted(sessionStart)
    } catch (startError) {
      toast.notifyError(`Issue #${issue.number} is open, but the session did not start: ${errorMessageOf(startError)}`)
    }
  }

  const submit = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    try {
      const issue =
        createdIssue ??
        (await dashboardApi.createIssue(repository, {
          title: title.trim(),
          body: issueBodyFor(text.trim(), pickedAttachments.map((picked) => picked.attachment.name)),
        }))
      setCreatedIssue(issue)
      await startOn(issue, repository)
    } catch (createError) {
      toast.notifyError(createError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={changeOpen}>
      <Dialog.Trigger>
        <Button aria-label="New issue">
          <PlusIcon /> New issue
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>New issue</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Opens the issue on GitHub and starts a session on it. Attachments go to the session only.
        </Dialog.Description>
        {started && createdIssue ? (
          <Flex direction="column" gap="4">
            <Link href={createdIssue.url} target="_blank" rel="noopener noreferrer" size="2">
              Issue #{createdIssue.number} is open on GitHub
            </Link>
            <StartedSummary start={started} />
            <Flex justify="end">
              <Dialog.Close>
                <Button>Done</Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        ) : (
          <form onSubmit={(submitEvent) => void submit(submitEvent)}>
            <Flex direction="column" gap="4">
              {createdIssue && (
                <Callout.Root color="amber" size="1">
                  <Callout.Text>
                    Issue{' '}
                    <Link href={createdIssue.url} target="_blank" rel="noopener noreferrer">
                      #{createdIssue.number}
                    </Link>{' '}
                    is open; pick where to run it and start again, or start it later from its card.
                  </Callout.Text>
                </Callout.Root>
              )}
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Repository
                </Text>
                <Select.Root value={repositoryKeyShown} onValueChange={setChosenRepositoryKey} disabled={createdIssue !== null}>
                  <Select.Trigger placeholder="Choose a repository" aria-label="Repository" />
                  <Select.Content>
                    {repositories.map((listedRepository) => (
                      <Select.Item key={repositoryKey(listedRepository)} value={repositoryKey(listedRepository)}>
                        {repositoryKey(listedRepository)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Title
                </Text>
                <TextField.Root
                  maxLength={256}
                  value={title}
                  disabled={createdIssue !== null}
                  onChange={(changeEvent) => setTitle(changeEvent.target.value)}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  What it is about
                </Text>
                <TextArea
                  rows={5}
                  maxLength={20000}
                  placeholder="Goes into the issue and the session's first message. Paste a screenshot to attach it."
                  value={text}
                  disabled={createdIssue !== null}
                  onChange={(changeEvent) => setText(changeEvent.target.value)}
                  onPaste={attachPastedFiles}
                />
              </label>
              <Flex direction="column" gap="2">
                <Flex gap="2" align="center">
                  <Button
                    type="button"
                    variant="soft"
                    color="gray"
                    disabled={createdIssue !== null || pickedAttachments.length >= attachmentCountLimit}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileIcon /> Attach files
                  </Button>
                  <Text size="1" color="gray">
                    Sent to the session, never stored
                  </Text>
                </Flex>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  aria-label="Attachments"
                  onChange={(changeEvent) => {
                    void addFiles(Array.from(changeEvent.target.files ?? []))
                    changeEvent.target.value = ''
                  }}
                />
                {pickedAttachments.length > 0 && (
                  <AttachmentList
                    pickedAttachments={pickedAttachments}
                    onRemove={(name) => setPickedAttachments((current) => current.filter((picked) => picked.attachment.name !== name))}
                  />
                )}
              </Flex>
              <StartChoicesFields
                choices={choices}
                onChange={setChoices}
                options={options}
                optionsError={errorMessage}
                chosenTarget={chosenTarget}
                chosenAvailability={chosenAvailability}
                attachmentBytes={attachmentBytes}
                showsWorkflow
              />
              <Flex gap="3" justify="end">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
                  {createdIssue ? 'Start the session' : 'Open and start'}
                </Button>
              </Flex>
            </Flex>
          </form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  )
}
