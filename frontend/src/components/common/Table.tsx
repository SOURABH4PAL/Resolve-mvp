import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords?: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  pagination?: PaginationProps;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found',
  isLoading = false,
  pagination,
  sortBy,
  sortOrder = 'asc',
  onSort,
}: TableProps<T>): React.ReactElement {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => {
              const isSortable = !!col.sortable && !!onSort;
              const isSorted = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  onClick={() => isSortable && onSort(col.key)}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                    cursor: isSortable ? 'pointer' : 'default',
                    userSelect: isSortable ? 'none' : 'auto',
                  }}
                  title={isSortable ? `Sort by ${col.header}` : undefined}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    <span>{col.header}</span>
                    {isSortable && (
                      <span style={{ color: isSorted ? 'var(--color-primary-600)' : 'var(--color-slate-400)' }}>
                        {isSorted ? (
                          sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-slate-400)' }}
              >
                Loading records...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-slate-400)' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const rowKey = keyExtractor
                ? keyExtractor(item)
                : (item as any)?.id || (item as any)?.ticket_number || String(index);

              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(item)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{
                        textAlign: col.align || 'left',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--color-slate-100)',
            fontSize: '0.85rem',
            color: 'var(--color-slate-600)',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            {pagination.totalRecords !== undefined ? (
              <span>
                Showing{' '}
                <strong>
                  {Math.min(
                    (pagination.currentPage - 1) * (pagination.pageSize || 10) + 1,
                    pagination.totalRecords
                  )}
                </strong>{' '}
                to{' '}
                <strong>
                  {Math.min(
                    pagination.currentPage * (pagination.pageSize || 10),
                    pagination.totalRecords
                  )}
                </strong>{' '}
                of <strong>{pagination.totalRecords}</strong> records
              </span>
            ) : (
              <span>
                Page <strong>{pagination.currentPage}</strong> of{' '}
                <strong>{Math.max(1, pagination.totalPages)}</strong>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-200)',
                backgroundColor: pagination.currentPage <= 1 ? '#f8fafc' : '#ffffff',
                color: pagination.currentPage <= 1 ? 'var(--color-slate-400)' : 'var(--color-slate-700)',
                cursor: pagination.currentPage <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.825rem',
                fontWeight: 500,
              }}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <span
              style={{
                padding: '0 8px',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--color-slate-700)',
              }}
            >
              {pagination.currentPage} / {Math.max(1, pagination.totalPages)}
            </span>

            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-200)',
                backgroundColor: pagination.currentPage >= pagination.totalPages ? '#f8fafc' : '#ffffff',
                color: pagination.currentPage >= pagination.totalPages ? 'var(--color-slate-400)' : 'var(--color-slate-700)',
                cursor: pagination.currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.825rem',
                fontWeight: 500,
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
