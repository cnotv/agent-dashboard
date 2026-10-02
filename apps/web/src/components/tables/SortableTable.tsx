import { Flex, Table } from '@radix-ui/themes'
import { Fragment, type ReactNode } from 'react'
import { flexRender, useTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import { SortIndicator } from './SortIndicator'
import { sortableTableFeatures } from './sortable-table-features'

interface SortableTableProps<Row extends RowData> {
  columns: ColumnDef<typeof sortableTableFeatures, Row, unknown>[]
  rows: Row[]
  rowKeyOf: (row: Row) => string
  numericColumnIds: string[]
  // A full-width line under a row, such as a session's timeline, kept with its row when sorting.
  // It spans every column but the first, which leads each row with its action.
  rowDetailOf?: (row: Row) => ReactNode | null
  // The same kind of line under the headings, such as the axis the row lines are read against.
  headerDetail?: ReactNode
}

const DetailRow = ({ columnCount, children }: { columnCount: number; children: ReactNode }) => (
  <Table.Row className="table-detail-row">
    <Table.Cell />
    <Table.Cell colSpan={columnCount - 1}>{children}</Table.Cell>
  </Table.Row>
)

/** A TanStack table on Radix Table with sortable headings and right-aligned numeric columns. */
export const SortableTable = <Row extends RowData>({
  columns,
  rows,
  rowKeyOf,
  numericColumnIds,
  rowDetailOf,
  headerDetail,
}: SortableTableProps<Row>) => {
  const table = useTable({
    features: sortableTableFeatures,
    columns,
    data: rows,
    getRowId: rowKeyOf,
  })
  const justifyOf = (columnId: string) => (numericColumnIds.includes(columnId) ? 'end' : undefined)

  return (
    <Table.Root variant="ghost" size="2">
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.ColumnHeaderCell key={header.id} justify={justifyOf(header.column.id)}>
                {header.column.getCanSort() ? (
                  <Flex asChild align="center" gap="1" display="inline-flex">
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
        {headerDetail !== undefined && <DetailRow columnCount={columns.length}>{headerDetail}</DetailRow>}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map((row) => {
          const rowDetail = rowDetailOf?.(row.original) ?? null
          return (
            <Fragment key={row.id}>
              <Table.Row align="center" className={rowDetail === null ? undefined : 'table-row-with-detail'}>
                {row.getAllCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    justify={justifyOf(cell.column.id)}
                    className={numericColumnIds.includes(cell.column.id) ? 'numeric-cell' : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
              {rowDetail !== null && <DetailRow columnCount={columns.length}>{rowDetail}</DetailRow>}
            </Fragment>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}
