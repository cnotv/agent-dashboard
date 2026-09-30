import { ReloadIcon, RowsIcon, ViewVerticalIcon } from '@radix-ui/react-icons'
import { Badge, Button, Callout, Flex, SegmentedControl, Select, Skeleton, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { BoardCardItem } from '@/components/board/BoardCardItem'
import { IssuesTable } from '@/components/board/IssuesTable'
import { useBoard, useRepositories } from '@/hooks/useBoard'
import { issueStatusColors, issueStatusLabels, parseRepositoryKey, repositoryKey } from '@/lib/presentation'

const skeletonColumnCount = 6

export const IssuesBoardView = () => {
  const { repositories, errorMessage: repositoriesError } = useRepositories()
  const [searchParams, setSearchParams] = useSearchParams()

  const firstRepositoryKey = repositories[0] ? repositoryKey(repositories[0]) : ''
  const selectedRepositoryKey = searchParams.get('repository') ?? firstRepositoryKey
  const layout = searchParams.get('layout') === 'table' ? 'table' : 'board'
  const selectedRepository = useMemo(() => parseRepositoryKey(selectedRepositoryKey), [selectedRepositoryKey])
  const { board, isLoading, errorMessage, refresh } = useBoard(selectedRepository)

  const updateSearchParam = (name: string, value: string): void =>
    setSearchParams((currentParams) => new URLSearchParams({ ...Object.fromEntries(currentParams), [name]: value }), {
      replace: true,
    })

  const loadError = repositoriesError ?? errorMessage

  return (
    <Flex direction="column" gap="5">
      <Flex gap="3" align="center" wrap="wrap">
        <Select.Root value={selectedRepositoryKey} onValueChange={(nextKey) => updateSearchParam('repository', nextKey)}>
          <Select.Trigger placeholder="Choose a repository" aria-label="Repository" style={{ minWidth: 240 }} />
          <Select.Content>
            {repositories.map((repository) => (
              <Select.Item key={repositoryKey(repository)} value={repositoryKey(repository)}>
                {repositoryKey(repository)}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Button variant="soft" color="gray" onClick={refresh} loading={isLoading}>
          <ReloadIcon /> Refresh
        </Button>
        <SegmentedControl.Root value={layout} onValueChange={(nextLayout) => updateSearchParam('layout', nextLayout)}>
          <SegmentedControl.Item value="board" aria-label="Board">
            <Flex gap="1" align="center">
              <ViewVerticalIcon /> Board
            </Flex>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="table" aria-label="Table">
            <Flex gap="1" align="center">
              <RowsIcon /> Table
            </Flex>
          </SegmentedControl.Item>
        </SegmentedControl.Root>
        {board && (
          <Text size="1" color="gray">
            Updated {new Date(board.fetchedAt).toLocaleTimeString()}
          </Text>
        )}
      </Flex>

      {loadError && (
        <Callout.Root color="red" variant="surface">
          <Callout.Text>
            {loadError} <RouterLink to="/credentials">Open Credentials</RouterLink>
          </Callout.Text>
        </Callout.Root>
      )}

      {isLoading && !board && (
        <div className="board-columns">
          {Array.from({ length: skeletonColumnCount }, (_, placeholderIndex) => (
            <Skeleton key={placeholderIndex} height="160px" />
          ))}
        </div>
      )}

      {board && layout === 'table' && <IssuesTable cards={board.columns.flatMap((column) => column.cards)} />}

      {board && layout === 'board' && (
        <div className="board-columns">
          {board.columns.map((column) => (
            <Flex key={column.status} direction="column" gap="3">
              <Flex justify="between" align="center">
                <Text size="2" weight="medium">
                  {issueStatusLabels[column.status]}
                </Text>
                <Badge color={issueStatusColors[column.status]} variant="soft" radius="full">
                  {column.cards.length}
                </Badge>
              </Flex>
              {column.cards.map((card) => (
                <BoardCardItem
                  key={card.issue ? `issue-${card.issue.number}` : `pull-${card.pullRequest?.number}`}
                  card={card}
                  repository={board.repository}
                />
              ))}
            </Flex>
          ))}
        </div>
      )}
    </Flex>
  )
}
