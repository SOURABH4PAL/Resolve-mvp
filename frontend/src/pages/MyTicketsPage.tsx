import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Table, Column } from '../components/common/Table';
import { TicketCard } from '../components/common/TicketCard';
import { Ticket } from '../types';
import { formatDate } from '../utils/formatters';
import {
  PlusCircle,
  Search,
  LayoutGrid,
  List,
  Inbox,
  RefreshCw,
} from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 10;

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleStatusChange = (st: string) => {
    setStatusFilter(st);
    setCurrentPage(1);
  };

  const handlePriorityChange = (pr: string) => {
    setPriorityFilter(pr);
    setCurrentPage(1);
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCurrentPage(1);
  };

  // Filter by current user
  const myTickets = tickets.filter(t => t.created_by === currentUser?.id);

  // Search and filter
  const filteredTickets = myTickets.filter(ticket => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const priorityWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'ticket_number') {
      comparison = a.ticket_number.localeCompare(b.ticket_number);
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'priority') {
      comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
    } else if (sortBy === 'status') {
      comparison = a.status.localeCompare(b.status);
    } else if (sortBy === 'updated_at') {
      comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    } else {
      // created_at or default
      comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedTickets.length / pageSize) || 1;
  const paginatedTickets = sortedTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      width: '120px',
      sortable: true,
      render: ticket => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
          {ticket.ticket_number}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title & Department',
      sortable: true,
      render: ticket => {
        const deptName = ticket.category?.department?.name || 'Department';
        const catName = ticket.category?.name || 'General';
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{ticket.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              {deptName} • {catName}
            </div>
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '120px',
      sortable: true,
      render: ticket => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      sortable: true,
      render: ticket => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'assignee_name',
      header: 'Assigned To',
      width: '170px',
      render: ticket => {
        const assigneeName = ticket.assignee?.name || (ticket.assigned_to ? 'Assigned' : 'Awaiting assignment');
        return (
          <span style={{ fontSize: '0.85rem', color: ticket.assignee ? 'var(--color-slate-700)' : 'var(--color-slate-400)' }}>
            {assigneeName}
          </span>
        );
      },
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      width: '130px',
      sortable: true,
      render: ticket => (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
          {formatDate(ticket.updated_at)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      width: '70px',
      align: 'right',
      render: ticket => (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            navigate(`/tickets/${ticket.id}`);
          }}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tickets</h1>
          <p className="page-subtitle">
            All issues and requests submitted by you ({currentUser?.name}).
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
          <Button
            variant="primary"
            leftIcon={<PlusCircle size={16} />}
            onClick={() => navigate('/create-ticket')}
          >
            Create New Ticket
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
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
              placeholder="Search by ticket ID, subject, keyword..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Status Filter */}
          <select
            className="form-select"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={e => handleStatusChange(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_USER">Waiting for User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          {/* Priority Filter */}
          <select
            className="form-select"
            style={{ width: 140 }}
            value={priorityFilter}
            onChange={e => handlePriorityChange(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* View Switcher (Table vs Card) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            border: '1px solid var(--color-slate-200)',
            borderRadius: 'var(--radius-md)',
            padding: 2,
          }}
        >
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: viewMode === 'table' ? 'var(--color-slate-100)' : 'transparent',
              color: viewMode === 'table' ? 'var(--color-slate-900)' : 'var(--color-slate-500)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            <List size={16} />
            Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: viewMode === 'cards' ? 'var(--color-slate-100)' : 'transparent',
              color: viewMode === 'cards' ? 'var(--color-slate-900)' : 'var(--color-slate-500)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            <LayoutGrid size={16} />
            Cards
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      {filteredTickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Inbox size={28} />
          </div>
          <h3 className="empty-state-title">No tickets found</h3>
          <p className="empty-state-text">
            {myTickets.length === 0
              ? "You haven't logged any tickets yet. Create your first ticket to get started."
              : 'No tickets matched your current search filters.'}
          </p>
          <Button
            variant="primary"
            leftIcon={<PlusCircle size={16} />}
            onClick={() => navigate('/create-ticket')}
          >
            Create Ticket
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <Table
          columns={columns}
          data={paginatedTickets}
          keyExtractor={t => t.id}
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
          onRowClick={t => navigate(`/tickets/${t.id}`)}
        />
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {paginatedTickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
