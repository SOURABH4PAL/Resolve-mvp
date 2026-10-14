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
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const AssignedToMePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, updateTicketStatus, resolveTicket, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Tickets assigned to this user
  const assignedTickets = tickets.filter(
    t => t.assigned_to === currentUser?.id || t.assigned_to === currentUser?.employee_id
  );

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
        await resolveTicket(ticketId, 'Resolved by responsible employee.');
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
      header: 'Resolution Actions',
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
              navigate(`/tickets/${ticket.ticket_number}`);
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
            Support queue for tickets assigned to you as the designated responsible employee.
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

      {/* Info Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: '#1e40af',
          marginBottom: 20,
        }}
      >
        <ShieldCheck size={18} style={{ flexShrink: 0 }} />
        <span>
          As an <strong>Employee</strong> assigned responsibility for specific categories, issues assigned to you appear
          here for investigation and resolution.
        </span>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div className="stat-val">{assignedTickets.length}</div>
            <div className="stat-label">Total Assigned</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-val">
              {assignedTickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length}
            </div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val">
              {assignedTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length}
            </div>
            <div className="stat-label">Resolved by Me</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="stat-val">
              {assignedTickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'CLOSED').length}
            </div>
            <div className="stat-label">Critical Pending</div>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              borderColor: statusFilter === status ? 'var(--color-primary-600)' : 'var(--color-slate-200)',
              backgroundColor: statusFilter === status ? 'var(--color-primary-50)' : '#ffffff',
              color: statusFilter === status ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
              transition: 'all 0.15s ease',
            }}
          >
            {status === 'ALL' ? 'All Assigned' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Assigned Tickets Queue</h3>
          <span style={{ fontSize: '0.825rem', color: 'var(--color-slate-500)' }}>
            {filteredTickets.length} tickets shown
          </span>
        </div>

        <Table<Ticket>
          columns={columns}
          data={filteredTickets}
          isLoading={isLoadingTickets}
          emptyMessage="No tickets currently assigned to you."
          onRowClick={ticket => navigate(`/tickets/${ticket.ticket_number}`)}
        />
      </div>
    </div>
  );
};
