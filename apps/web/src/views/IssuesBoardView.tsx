import { ReloadIcon } from '@radix-ui/react-icons'
import { Badge, Button, Callout, Flex, SegmentedControl, Select, Skeleton, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { BoardCardItem } from '@/components/board/BoardCardItem'
import { NetlifyControl } from '@/components/board/NetlifyControl'
import { useBoards, useRepositories } from '@/hooks/useBoard'
import { mergeBoards } from '@/lib/board-merge'
import { issueStatusColors, issueStatusLabels, parseRepositoryKey, repositoryKey } from '@/lib/presentation'

const skeletonColumnCount = 6
const allRepositoriesKey = 'all'

/**
 * The Issues page: issues and pull requests as a board, one column per status, for the chosen
 * repository or for every configured repository at once.
 */
export const IssuesBoardView = () => {
  const { repositories, errorMessage: repositoriesError } = useRepositories()
  const [searchParams, setSearchParams] = useSearchParams()

  const firstRepositoryKey = repositories[0] ? repositoryKey(repositories[0]) : ''
  const repositoryParameter = searchParams.get('repository')
  const showsAllRepositories = repositoryParameter === allRepositoriesKey
  const selectedRepositoryKey = showsAllRepositories ? firstRepositoryKey : (repositoryParameter ?? firstRepositoryKey)
  const selectedRepository = useMemo(() => parseRepositoryKey(selectedRepositoryKey), [selectedRepositoryKey])
  const shownRepositories = useMemo(
    () => (showsAllRepositories ? repositories : selectedRepository ? [selectedRepository] : []),
    [showsAllRepositories, repositories, selectedRepository],
  )
  const { boards, isLoading, errorMessage, refresh } = useBoards(shownRepositories)
  const columns = useMemo(() => mergeBoards(boards), [boards])
  const oldestFetchedAt = boards.map((board) => board.fetchedAt).sort()[0]

  const selectRepository = (nextKey: string): void => setSearchParams({ repository: nextKey }, { replace: true })
  const selectScope = (scope: string): void => selectRepository(scope === allRepositoriesKey ? allRepositoriesKey : firstRepositoryKey)

  const loadError = repositoriesError ?? errorMessage

  return (
    <Flex direction="column" gap="5">
      <Flex gap="3" align="center" wrap="wrap">
        <SegmentedControl.Root
          value={showsAllRepositories ? allRepositoriesKey : 'one'}
          onValueChange={selectScope}
          aria-label="Repositories shown"
        >
          <SegmentedControl.Item value={allRepositoriesKey}>All repositories</SegmentedControl.Item>
          <SegmentedControl.Item value="one">One repository</SegmentedControl.Item>
        </SegmentedControl.Root>
        {!showsAllRepositories && (
          <Select.Root value={selectedRepositoryKey} onValueChange={selectRepository}>
            <Select.Trigger placeholder="Choose a repository" aria-label="Repository" style={{ minWidth: 240 }} />
            <Select.Content>
              {repositories.map((repository) => (
                <Select.Item key={repositoryKey(repository)} value={repositoryKey(repository)}>
                  {repositoryKey(repository)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
        <Button variant="soft" color="gray" onClick={refresh} loading={isLoading}>
          <ReloadIcon /> Refresh
        </Button>
        {oldestFetchedAt && (
          <Text size="1" color="gray">
            Updated {new Date(oldestFetchedAt).toLocaleTimeString()}
          </Text>
        )}
        {!showsAllRepositories && selectedRepository && (
          <Flex ml="auto">
            <NetlifyControl repository={selectedRepository} />
          </Flex>
        )}
      </Flex>

      {loadError && (
        <Callout.Root color="red" variant="surface">
          <Callout.Text>
            {loadError} <RouterLink to="/credentials">Open Credentials</RouterLink>
          </Callout.Text>
        </Callout.Root>
      )}

      {isLoading && boards.length === 0 && (
        <div className="board-columns">
          {Array.from({ length: skeletonColumnCount }, (_, placeholderIndex) => (
            <Skeleton key={placeholderIndex} height="160px" />
          ))}
        </div>
      )}

      {columns.length > 0 && (
        <div className="board-columns">
          {columns.map((column) => (
            <Flex key={column.status} direction="column" gap="3">
              <Flex justify="between" align="center">
                <Text size="2" weight="medium">
                  {issueStatusLabels[column.status]}
                </Text>
                <Badge color={issueStatusColors[column.status]} variant="soft" radius="full">
                  {column.cards.length}
                </Badge>
              </Flex>
              {column.cards.map(({ card, repository }) => (
                <BoardCardItem
                  key={`${repositoryKey(repository)}-${card.pullRequest ? `pull-${card.pullRequest.number}` : `issue-${card.issues[0]?.number}`}`}
                  card={card}
                  repository={repository}
                  showRepository={showsAllRepositories}
                  onPullRequestChanged={refresh}
                />
              ))}
            </Flex>
          ))}
        </div>
      )}
    </Flex>
  )
}
