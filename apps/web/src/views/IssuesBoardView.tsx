import { ReloadIcon } from '@radix-ui/react-icons'
import { Badge, Button, Callout, Flex, Select, Skeleton, Text } from '@radix-ui/themes'
import { useMemo } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'
import { BoardCardItem } from '@/components/board/BoardCardItem'
import { NetlifyControl } from '@/components/board/NetlifyControl'
import { useBoard, useRepositories } from '@/hooks/useBoard'
import { issueStatusColors, issueStatusLabels, parseRepositoryKey, repositoryKey } from '@/lib/presentation'

const skeletonColumnCount = 6

/** The Issues page: the chosen repository's issues and pull requests as a board, one column per status. */
export const IssuesBoardView = () => {
  const { repositories, errorMessage: repositoriesError } = useRepositories()
  const [searchParams, setSearchParams] = useSearchParams()

  const firstRepositoryKey = repositories[0] ? repositoryKey(repositories[0]) : ''
  const selectedRepositoryKey = searchParams.get('repository') ?? firstRepositoryKey
  const selectedRepository = useMemo(() => parseRepositoryKey(selectedRepositoryKey), [selectedRepositoryKey])
  const { board, isLoading, errorMessage, refresh } = useBoard(selectedRepository)

  const selectRepository = (nextKey: string): void => setSearchParams({ repository: nextKey }, { replace: true })

  const loadError = repositoriesError ?? errorMessage

  return (
    <Flex direction="column" gap="5">
      <Flex gap="3" align="center" wrap="wrap">
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
        <Button variant="soft" color="gray" onClick={refresh} loading={isLoading}>
          <ReloadIcon /> Refresh
        </Button>
        {board && (
          <Text size="1" color="gray">
            Updated {new Date(board.fetchedAt).toLocaleTimeString()}
          </Text>
        )}
        {selectedRepository && (
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

      {isLoading && !board && (
        <div className="board-columns">
          {Array.from({ length: skeletonColumnCount }, (_, placeholderIndex) => (
            <Skeleton key={placeholderIndex} height="160px" />
          ))}
        </div>
      )}

      {board && (
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
                  key={card.pullRequest ? `pull-${card.pullRequest.number}` : `issue-${card.issues[0]?.number}`}
                  card={card}
                  repository={board.repository}
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
