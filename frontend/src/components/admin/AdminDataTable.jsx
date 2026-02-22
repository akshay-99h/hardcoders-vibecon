import React, { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

function SortableHeader({ column, title }) {
  const sortState = column.getIsSorted();
  return (
    <button
      onClick={column.getToggleSortingHandler()}
      className="inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
    >
      <span>{title}</span>
      <span className="text-[10px]">
        {sortState === 'asc' ? '▲' : sortState === 'desc' ? '▼' : '↕'}
      </span>
    </button>
  );
}

function ColumnVisibilityMenu({ table }) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.columnDef.enableHiding !== false);

  if (columns.length === 0) {
    return null;
  }

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-accent">
        Columns
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-52 rounded-lg border border-border bg-card p-2 shadow-md">
        {columns.map((column) => (
          <label key={column.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-accent">
            <input
              type="checkbox"
              checked={column.getIsVisible()}
              onChange={column.getToggleVisibilityHandler()}
              className="h-3.5 w-3.5"
            />
            <span className="capitalize">{String(column.id).replace(/_/g, ' ')}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function PaginationControls({ table, pageSizeOptions = [5, 10, 20, 50] }) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Rows per page</span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(event) => table.setPageSize(Number(event.target.value))}
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="text-xs text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDataTable({
  title,
  description,
  data,
  columns,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  emptyMessage = 'No rows to display.',
}) {
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const columnCount = useMemo(() => table.getVisibleLeafColumns().length || 1, [table]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <ColumnVisibilityMenu table={table} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-left">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, {
                          ...header.getContext(),
                          SortableHeader,
                        })}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableRows.length > 0 ? (
              tableRows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3 text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnCount} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls table={table} pageSizeOptions={pageSizeOptions} />
    </section>
  );
}

export { AdminDataTable, SortableHeader };
