import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { SlaBadge } from '../components/common/SlaBadge';
import { EmployeeName } from '../components/common/EmployeeName';
import { Table, Column } from '../components/common/Table';
import { Ticket, TicketStatus } from '../types';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Search,
  Lock,
  ArrowUpDown,
} from 'lucide-react';

export const AssignedToMePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, updateTicketStatus, resolveTicket, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const pageSize = 10;

  // Tickets assigned to this user
  const assignedTickets = useMemo(() => {
    return tickets.filter(
      t => t.assigned_to === currentUser?.id || t.assigned_to === currentUser?.employee_id
    );
  }, [tickets, currentUser]);

  // Search and Filter
  const filteredTickets = useMemo(() => {
    return assignedTickets.filter(t => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchNum = t.ticket_number.toLowerCase().includes(q);
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchCat = (t.category?.name || '').toLowerCase().includes(q);
        const matchCreator = (t.creator?.name || '').toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchDesc && !matchCat && !matchCreator) return false;
      }

      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

      return true;
    });
  }, [assignedTickets, searchTerm, statusFilter, priorityFilter]);

  const priorityWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'priority') {
        cmp = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
      } else if (sortBy === 'status') {
        cmp = a.status.localeCompare(b.status);
      } else if (sortBy === 'ticket_number') {
        cmp = a.ticket_number.localeCompare(b.ticket_number);
      } else if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === 'updated_at') {
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else {
        // created_at
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredTickets, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    return sortedTickets.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedTickets, currentPage, pageSize]);

  const handleQuickStatusChange = async (ticketId: string, newStatus: TicketStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(ticketId);
    try {
      if (newStatus === 'RESOLVED') {
        await resolveTicket(ticketId, 'Resolved by responsible employee.');
      } else {
        await updateTicketStatus(ticketId, newStatus);
      }
    } catch (err: unknown) {
      console.error('Failed to update status:', err);
      const msg = err instanceof Error ? err.message : 'Action failed.';
      alert(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder(key === 'created_at' || key === 'updated_at' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      width: '120px',
      sortable: true,
      render: ticket => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
            {ticket.ticket_number}
          </span>
          {ticket.is_blocked && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 4,
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
              }}
            >
              BLOCKED
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Issue & Category',
      sortable: true,
      render: ticket => {
        const deptName = ticket.category?.department?.name || 'Department';
        const catName = ticket.category?.name || 'General';
        return (
          <div style={{ maxWidth: 320 }}>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{ticket.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>By:</span>
              <EmployeeName name={ticket.creator?.name} email={ticket.creator?.email} maxWidth="120px" />
              <span>•</span>
              <span>{deptName} ({catName})</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '100px',
      sortable: true,
      render: ticket => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      sortable: true,
      render: ticket => <StatusBadge status={ticket.status} isBlocked={ticket.is_blocked} />,
    },
    {
      key: 'sla_status',
      header: 'SLA Status',
      width: '135px',
      render: ticket => (
        <SlaBadge slaStatus={ticket.sla_status} resolutionDueAt={ticket.resolution_due_at} />
      ),
    },
    {
      key: 'actions',
      header: 'Resolution Actions',
      width: '200px',
      align: 'right',
      render: ticket => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          {ticket.is_blocked ? (
            <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontStyle: 'italic' }}>
              Blocked
            </span>
          ) : (
            <>
              {(ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Clock size={13} />}
                  isLoading={actionLoadingId === ticket.id}
                  onClick={e => handleQuickStatusChange(ticket.id, 'IN_PROGRESS', e)}
                >
                  Start
                </Button>
              )}

              {ticket.status === 'IN_PROGRESS' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 size={13} />}
                  isLoading={actionLoadingId === ticket.id}
                  onClick={e => handleQuickStatusChange(ticket.id, 'RESOLVED', e)}
                >
                  Resolve
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              navigate(`/tickets/${ticket.ticket_number}`);
            }}
          >
            Inspect
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Work Queue</h1>
          <p className="page-subtitle">
            Assigned To Me: Manage and resolve issues routed to you for support fulfillment.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            isLoading={isLoadingTickets}
            onClick={() => fetchTickets()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-slate-400)',
              }}
            />
            <input
              type="text"
              placeholder="Search by ticket #, subject, reporter, or category..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-200)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="card">
        <Table<Ticket>
          columns={columns}
          data={paginatedTickets}
          isLoading={isLoadingTickets}
          emptyMessage="Your work queue is clear. No assigned tickets found."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage,
            totalPages,
            totalRecords: sortedTickets.length,
            pageSize,
            onPageChange: setCurrentPage,
          }}
          onRowClick={ticket => navigate(`/tickets/${ticket.ticket_number}`)}
        />
      </div>
    </div>
  );
};
