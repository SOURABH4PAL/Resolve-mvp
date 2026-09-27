import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Table, Column } from '../components/common/Table';
import { Ticket, TicketStatus } from '../types';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

export const AssignedToMePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, updateTicketStatus, resolveTicket, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Tickets assigned to this user
  const assignedTickets = tickets.filter(t => t.assigned_to === currentUser?.id);

  // Status filtered
  const filteredTickets = assignedTickets.filter(t => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const handleQuickStatusChange = async (ticketId: string, newStatus: TicketStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoadingId(ticketId);
    try {
      if (newStatus === 'RESOLVED') {
        await resolveTicket(ticketId, 'Resolved via quick action');
      } else {
        await updateTicketStatus(ticketId, newStatus);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      width: '120px',
      render: ticket => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
          {ticket.ticket_number}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Issue & Category',
      render: ticket => {
        const creatorName = ticket.creator?.name || 'Employee';
        const deptName = ticket.category?.department?.name || 'Department';
        const catName = ticket.category?.name || 'General';
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{ticket.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              Raised by: <strong style={{ color: 'var(--color-slate-700)' }}>{creatorName}</strong> • {deptName} ({catName})
            </div>
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '120px',
      render: ticket => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: ticket => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'actions',
      header: 'Resolver Actions',
      width: '200px',
      align: 'right',
      render: ticket => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
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

          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              navigate(`/tickets/${ticket.id}`);
            }}
          >
            <ExternalLink size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Assigned To Me</h1>
          <p className="page-subtitle">
            Resolver queue for tickets assigned to {currentUser?.name} ({currentUser?.employee_id}).
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

      {/* If current user is EMPLOYEE, show informative banner */}
      {currentUser?.role === 'EMPLOYEE' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: '#92400e',
            marginBottom: 20,
          }}
        >
          <ShieldAlert size={18} />
          <span>
            You are logged in as an <strong>Employee</strong>. Only tickets explicitly assigned to your user account will appear here. Log in with a <strong>Resolver</strong> account (e.g. <code>resolver@resolvehub.com</code>) to manage department queues.
          </span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div className="stat-val">{assignedTickets.length}</div>
            <div className="stat-label">Assigned Tickets</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-val">{assignedTickets.filter(t => t.status === 'IN_PROGRESS').length}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="stat-val">{assignedTickets.filter(t => t.status === 'OPEN' || t.status === 'ASSIGNED').length}</div>
            <div className="stat-label">Awaiting First Response</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val">{assignedTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length}</div>
            <div className="stat-label">Resolved / Closed</div>
          </div>
        </div>
      </div>

      {/* Ticket List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Resolver Queue</h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: statusFilter === status ? 'var(--color-primary-600)' : 'var(--color-slate-200)',
                  backgroundColor: statusFilter === status ? 'var(--color-primary-50)' : '#ffffff',
                  color: statusFilter === status ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
                  transition: 'all 0.15s ease',
                }}
              >
                {status === 'ALL' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={t => t.id}
          onRowClick={t => navigate(`/tickets/${t.id}`)}
          emptyMessage={
            isLoadingTickets
              ? 'Loading assigned tickets...'
              : 'No tickets currently assigned to you in this filter.'
          }
        />
      </div>
    </div>
  );
};
