import { Badge, Card, Link, Text } from '@radix-ui/themes'
import { createColumnHelper } from '@tanstack/react-table'
import type { AgentSessionSummary } from '@agent-dashboard/contracts'
import { SortableTable } from '@/components/tables/SortableTable'
import type { sortableTableFeatures } from '@/components/tables/sortable-table-features'
import {
  formatCompactCount,
  formatFullCount,
  formatTimeAgo,
  gitHubIssueUrl,
  providerLabels,
  repositoryKey,
  sessionStateColors,
  sessionStateLabels,
} from '@/lib/presentation'
import { sessionDetail, sessionLabel, sessionStateOrder } from '@/lib/session-timeline'

const columnHelper = createColumnHelper<typeof sortableTableFeatures, AgentSessionSummary>()

const sessionColumns = (now: number) =>
  columnHelper.columns([
    columnHelper.accessor((session) => (session.repository ? repositoryKey(session.repository) : sessionLabel(session)), {
      id: 'session',
      header: 'Session',
      sortFn: 'alphanumeric',
      cell: ({ row, getValue }) => (
        <>
          <Text as="div" size="2" weight="medium">
            {getValue()}
          </Text>
          <Text as="div" size="1" color="gray">
            {sessionDetail(row.original)}
          </Text>
        </>
      ),
    }),
    columnHelper.accessor((session) => sessionStateOrder[session.state], {
      id: 'state',
      header: 'State',
      sortFn: 'basic',
      cell: ({ row }) => (
        <Badge color={sessionStateColors[row.original.state]} variant="soft" radius="full">
          {sessionStateLabels[row.original.state]}
        </Badge>
      ),
    }),
    columnHelper.accessor((session) => session.issueNumber ?? 0, {
      id: 'issue',
      header: 'Issue',
      sortFn: 'basic',
      cell: ({ row }) =>
        row.original.repository && row.original.issueNumber !== null ? (
          <Link href={gitHubIssueUrl(row.original.repository, row.original.issueNumber)} target="_blank" rel="noopener noreferrer">
            #{row.original.issueNumber}
          </Link>
        ) : (
          <Text color="gray">None</Text>
        ),
    }),
    columnHelper.accessor((session) => providerLabels[session.provider], { id: 'agent', header: 'Agent', sortFn: 'alphanumeric' }),
    columnHelper.accessor('lastEventAt', {
      header: 'Last activity',
      sortFn: 'alphanumeric',
      cell: ({ getValue }) => <Text color="gray">{formatTimeAgo(getValue(), now)}</Text>,
    }),
    columnHelper.accessor((session) => session.tokens.total, {
      id: 'tokens',
      header: 'Tokens',
      sortFn: 'basic',
      cell: ({ getValue }) => <span title={`${formatFullCount(getValue())} tokens`}>{formatCompactCount(getValue())}</span>,
    }),
  ])

export const SessionsTable = ({ sessions, now }: { sessions: AgentSessionSummary[]; now: number }) => (
  <Card size="1">
    <SortableTable
      columns={sessionColumns(now)}
      rows={sessions}
      rowKeyOf={(session) => session.sessionId}
      numericColumnIds={['tokens']}
    />
  </Card>
)
