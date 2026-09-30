import { CodeIcon, Cross2Icon, ExternalLinkIcon } from '@radix-ui/react-icons'
import { Badge, Callout, Dialog, Flex, IconButton, Link, Skeleton, Text, Tooltip } from '@radix-ui/themes'
import { useState } from 'react'
import type { ChangedFile, ChangedFileStatus, PullRequestSummary, RepositoryReference } from '@agent-dashboard/contracts'
import { usePolledResource } from '@/hooks/usePolledResource'
import { dashboardApi } from '@/lib/api'
import { diffLinesOf } from '@/lib/diff-lines'
import { repositoryKey } from '@/lib/presentation'

interface PullRequestFilesDrawerProps {
  repository: RepositoryReference
  pullRequest: PullRequestSummary
}

const statusColors: Record<ChangedFileStatus, 'green' | 'red' | 'blue' | 'amber' | 'gray'> = {
  added: 'green',
  removed: 'red',
  modified: 'blue',
  renamed: 'amber',
  copied: 'amber',
  changed: 'blue',
  unchanged: 'gray',
}

// Past this many files, every file starts folded so the list itself is the overview.
const unfoldedFileLimit = 10

const LineCounts = ({ additions, deletions }: { additions: number; deletions: number }) => (
  <Text size="1" className="line-counts">
    <Text color="green">+{additions}</Text> <Text color="red">−{deletions}</Text>
  </Text>
)

const FilePatch = ({ file }: { file: ChangedFile }) =>
  file.patch === null ? (
    <Text as="p" size="1" color="gray" className="file-patch-missing">
      GitHub shows no diff for this file (binary or too large).{' '}
      <Link href={file.blobUrl} target="_blank" rel="noopener noreferrer">
        Open it on GitHub
      </Link>
    </Text>
  ) : (
    <div className="file-patch" role="table" aria-label={`Changes to ${file.filename}`}>
      {diffLinesOf(file.patch).map((line) => (
        <div key={line.lineKey} className={`diff-line diff-line-${line.kind}`} role="row">
          <span className="diff-line-number" role="cell">
            {line.oldLineNumber ?? ''}
          </span>
          <span className="diff-line-number" role="cell">
            {line.newLineNumber ?? ''}
          </span>
          <code className="diff-line-text" role="cell">
            {line.text}
          </code>
        </div>
      ))}
    </div>
  )

// The patch is only rendered while its file is unfolded, so a long pull request opens quickly.
const ChangedFileItem = ({ file, startsUnfolded }: { file: ChangedFile; startsUnfolded: boolean }) => {
  const [isUnfolded, setIsUnfolded] = useState(startsUnfolded)
  return (
    <details className="changed-file" open={isUnfolded} onToggle={(event) => setIsUnfolded(event.currentTarget.open)}>
      <summary className="changed-file-summary">
        <Badge color={statusColors[file.status]} variant="soft" size="1">
          {file.status}
        </Badge>
        <Text size="2" className="changed-file-name" title={file.filename}>
          {file.previousFilename ? `${file.previousFilename} → ${file.filename}` : file.filename}
        </Text>
        <LineCounts additions={file.additions} deletions={file.deletions} />
      </summary>
      {isUnfolded && <FilePatch file={file} />}
    </details>
  )
}

const FilesDrawerBody = ({ repository, pullRequest }: PullRequestFilesDrawerProps) => {
  const { resource, errorMessage } = usePolledResource(
    `${repositoryKey(repository)}#${pullRequest.number}@${pullRequest.headSha ?? ''}`,
    () => dashboardApi.readPullRequestFiles(repository, pullRequest),
    null,
  )

  if (errorMessage !== null) {
    return (
      <Callout.Root color="red" variant="surface">
        <Callout.Text>{errorMessage}</Callout.Text>
      </Callout.Root>
    )
  }
  if (resource === null) {
    return (
      <Flex direction="column" gap="2">
        <Skeleton height="32px" />
        <Skeleton height="160px" />
        <Skeleton height="32px" />
      </Flex>
    )
  }

  const totalAdditions = resource.files.reduce((total, file) => total + file.additions, 0)
  const totalDeletions = resource.files.reduce((total, file) => total + file.deletions, 0)
  const startsUnfolded = resource.files.length <= unfoldedFileLimit

  return (
    <Flex direction="column" gap="3">
      <Flex gap="2" align="center">
        <Text size="2" color="gray">
          {resource.files.length} {resource.files.length === 1 ? 'file' : 'files'}
        </Text>
        <LineCounts additions={totalAdditions} deletions={totalDeletions} />
      </Flex>
      {resource.isTruncated && (
        <Callout.Root color="amber" variant="surface">
          <Callout.Text>
            Only the first {resource.files.length} files are shown.{' '}
            <Link href={`${pullRequest.url}/files`} target="_blank" rel="noopener noreferrer">
              See them all on GitHub
            </Link>
          </Callout.Text>
        </Callout.Root>
      )}
      {resource.files.map((file) => (
        <ChangedFileItem key={file.filename} file={file} startsUnfolded={startsUnfolded} />
      ))}
    </Flex>
  )
}

/**
 * The Files icon of a board card: opens a drawer from the side listing every file the pull request
 * changes, each with its diff. The files are read only when the drawer opens.
 */
export const PullRequestFilesDrawer = ({ repository, pullRequest }: PullRequestFilesDrawerProps) => (
  <Dialog.Root>
    <Tooltip content="Files changed">
      <Dialog.Trigger>
        <IconButton size="1" variant="ghost" aria-label="Files changed">
          <CodeIcon />
        </IconButton>
      </Dialog.Trigger>
    </Tooltip>
    <Dialog.Content className="side-drawer" aria-describedby={undefined}>
      <Flex direction="column" gap="4">
        <Flex gap="3" align="start" justify="between">
          <Dialog.Title size="4" mb="0">
            #{pullRequest.number} {pullRequest.title}
          </Dialog.Title>
          <Flex gap="3" align="center">
            <Tooltip content="Open the files on GitHub">
              <IconButton size="2" variant="ghost" color="gray" aria-label="Open the files on GitHub" asChild>
                <a href={`${pullRequest.url}/files`} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon />
                </a>
              </IconButton>
            </Tooltip>
            <Dialog.Close>
              <IconButton size="2" variant="ghost" color="gray" aria-label="Close">
                <Cross2Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
        </Flex>
        <FilesDrawerBody repository={repository} pullRequest={pullRequest} />
      </Flex>
    </Dialog.Content>
  </Dialog.Root>
)
