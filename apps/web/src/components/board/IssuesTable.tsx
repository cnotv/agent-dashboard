import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons'
import { Badge, Card, Flex, IconButton, Link, Table, Text, TextField } from '@radix-ui/themes'
import { createColumnHelper, flexRender, useTable } from '@tanstack/react-table'
import { Fragment, useMemo } from 'react'
import type { BoardCard } from '@agent-dashboard/contracts'
import { SortIndicator } from '@/components/tables/SortIndicator'
import { boardTableRows } from '@/lib/board-table'
import { issueStatusColors, issueStatusLabels } from '@/lib/presentation'
import type { BoardTableRow } from '@/lib/types'
import { GateStrip } from './GateStrip'
import { issuesTableFeatures } from './issues-table-features'

const columnHelper = createColumnHelper<typeof issuesTableFeatures, BoardTableRow>()

const issuesTableColumns = columnHelper.columns([
  columnHelper.display({
    id: 'expand',
    header: () => null,
    cell: ({ row }) => (
      <IconButton size="1" variant="ghost" color="gray" aria-label="Show checks" onClick={row.getToggleExpandedHandler()}>
        {row.getIsExpanded() ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </IconButton>
    ),
  }),
  columnHelper.accessor('statusLabel', {
    header: 'Status',
    sortFn: 'text',
    cell: ({ row }) => (
      <Badge color={issueStatusColors[row.original.status]} variant="soft" radius="full">
        {issueStatusLabels[row.original.status]}
      </Badge>
    ),
  }),
  columnHelper.accessor('issueTitle', {
    header: 'Issue',
    sortFn: 'alphanumeric',
    cell: ({ row }) =>
      row.original.card.issue ? (
        <Link href={row.original.card.issue.url} target="_blank" rel="noopener noreferrer" highContrast underline="hover">
          {row.original.issueTitle}
        </Link>
      ) : (
        <Text color="gray">No linked issue</Text>
      ),
  }),
  columnHelper.accessor('pullRequestTitle', {
    header: 'Pull request',
    sortFn: 'alphanumeric',
    cell: ({ row }) =>
      row.original.card.pullRequest ? (
        <Link href={row.original.card.pullRequest.url} target="_blank" rel="noopener noreferrer" color="gray" underline="hover">
          {row.original.pullRequestTitle}
        </Link>
      ) : (
        <Text color="gray">None</Text>
      ),
  }),
  columnHelper.accessor('gatesPassed', {
    header: 'Checks',
    sortFn: 'basic',
    enableGlobalFilter: false,
    cell: ({ row }) =>
      row.original.card.pullRequest
        ? `${row.original.card.pullRequest.gateSummary.passed}/${row.original.card.pullRequest.gateSummary.total}`
        : '',
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    sortFn: 'text',
    enableGlobalFilter: false,
    cell: ({ getValue }) => (getValue() ? new Date(getValue()).toLocaleString() : ''),
  }),
])

/** The board as a searchable, sortable, paged table, with each row expanding to its checks. */
/** The board as a searchable, sortable, paged table, with each row expanding to its checks. */
export const IssuesTable = ({ cards }: { cards: BoardCard[] }) => {
  const tableRows = useMemo(() => boardTableRows(cards), [cards])

  const table = useTable({
    features: issuesTableFeatures,
    columns: issuesTableColumns,
    data: tableRows,
    getRowId: (row) => row.rowKey,
    getRowCanExpand: () => true,
    globalFilterFn: 'includesString',
    enableMultiSort: true,
    initialState: {
      sorting: [{ id: 'updatedAt', desc: true }],
      pagination: { pageIndex: 0, pageSize: 20 },
    },
  })

  const visibleColumnCount = table.getAllLeafColumns().length

  return (
    <Card size="1">
      <Flex direction="column" gap="3">
        <TextField.Root
          placeholder="Search issues and pull requests"
          aria-label="Search issues and pull requests"
          value={String(table.state.globalFilter ?? '')}
          onChange={(changeEvent) => table.setGlobalFilter(changeEvent.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>

        <Table.Root variant="ghost" size="2">
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.ColumnHeaderCell key={header.id}>
                    {header.column.getCanSort() ? (
                      <Flex asChild align="center" gap="1">
                        <button type="button" className="table-sort-button" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIndicator direction={header.column.getIsSorted()} />
                        </button>
                      </Flex>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </Table.ColumnHeaderCell>
                ))}
              </Table.Row>
            ))}
          </Table.Header>
          <Table.Body>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <Table.Row align="center">
                  {row.getAllCells().map((cell) => (
                    <Table.Cell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Cell>
                  ))}
                </Table.Row>
                {row.getIsExpanded() && (
                  <Table.Row>
                    <Table.Cell colSpan={visibleColumnCount}>
                      {row.original.card.pullRequest ? (
                        <GateStrip gates={row.original.card.pullRequest.gates} summary={row.original.card.pullRequest.gateSummary} />
                      ) : (
                        <Text size="2" color="gray">
                          No pull request yet.
                        </Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                )}
              </Fragment>
            ))}
          </Table.Body>
        </Table.Root>

        <Flex justify="between" align="center">
          <Text size="1" color="gray">
            {table.getFilteredRowModel().rows.length} rows
          </Text>
          <Flex gap="2" align="center">
            <IconButton variant="soft" color="gray" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
              <ChevronLeftIcon />
            </IconButton>
            <Text size="1" color="gray">
              Page {table.state.pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}
            </Text>
            <IconButton variant="soft" color="gray" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
              <ChevronRightIcon />
            </IconButton>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  )
}
