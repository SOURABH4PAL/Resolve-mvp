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
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Flame,
  ArrowRight,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Stats calculation
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'ASSIGNED').length;
  const inProgressCount = tickets.filter(
    t => t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_USER' || t.status === 'REOPENED'
  ).length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const assignedToMeCount = tickets.filter(
    t => t.assigned_to === currentUser?.id && t.status !== 'CLOSED'
  ).length;
  const criticalCount = tickets.filter(
    t => t.priority === 'CRITICAL' && t.status !== 'CLOSED'
  ).length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

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
      header: 'Subject & Category',
      render: ticket => {
        const deptName = ticket.category?.department?.name || 'Department';
        const catName = ticket.category?.name || 'General';
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginBottom: 2 }}>
              {ticket.title}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--color-slate-500)' }}>
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
      render: ticket => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: ticket => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'assigned_to',
      header: 'Assignee',
      width: '160px',
      render: ticket => {
        const name = ticket.assignee?.name || (ticket.assigned_to ? 'Assigned' : 'Unassigned');
        return (
          <span style={{ fontSize: '0.85rem', color: ticket.assignee ? 'var(--color-slate-800)' : 'var(--color-slate-400)' }}>
            {name}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      width: '120px',
      render: ticket => (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
          {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
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
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Top Banner / Welcome */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {currentUser?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="page-subtitle">
            Live overview of department issues, active service requests, and resolution progress.
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
            leftIcon={<PlusCircle size={17} />}
            onClick={() => navigate('/create-ticket')}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Critical Attention Alert */}
      {criticalCount > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flame size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#991b1b' }}>
                {criticalCount} Critical Issue Requires Immediate Attention
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>
                High business impact incidents flagged with critical priority.
              </div>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              const criticalTicket = tickets.find(t => t.priority === 'CRITICAL');
              if (criticalTicket) navigate(`/tickets/${criticalTicket.id}`);
            }}
          >
            Inspect Critical Ticket
          </Button>
        </div>
      )}

      {/* Stats KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}
          >
            <Inbox size={22} />
          </div>
          <div>
            <div className="stat-val">{totalCount}</div>
            <div className="stat-label">Total Tickets</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="stat-val">{openCount}</div>
            <div className="stat-label">Open / Assigned</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-val">{inProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val">{resolvedCount}</div>
            <div className="stat-label">Resolved / Closed</div>
          </div>
        </div>

        {(currentUser?.role === 'RESOLVER' || currentUser?.role === 'SUPER_ADMIN') && (
          <div
            className="stat-card"
            style={{ borderColor: 'var(--color-primary-200)', backgroundColor: '#faf5ff' }}
          >
            <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
              <UserCheck size={22} />
            </div>
            <div>
              <div className="stat-val">{assignedToMeCount}</div>
              <div className="stat-label">Assigned to Me</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Tickets</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              Track live ticket lifecycle, assigned resolvers, and issue progress from the backend.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              'ALL',
              'OPEN',
              'ASSIGNED',
              'IN_PROGRESS',
              'WAITING_FOR_USER',
              'RESOLVED',
              'CLOSED',
              'REOPENED',
            ].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  borderColor: filterStatus === status ? 'var(--color-primary-600)' : 'var(--color-slate-200)',
                  backgroundColor: filterStatus === status ? 'var(--color-primary-50)' : '#ffffff',
                  color: filterStatus === status ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
                  transition: 'all 0.15s ease',
                }}
              >
                {status === 'ALL' ? 'All Tickets' : status.replace(/_/g, ' ')}
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
              ? 'Loading tickets from backend...'
              : 'No tickets found matching the selected filter.'
          }
        />

        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#fafbfc',
            borderTop: '1px solid var(--color-slate-100)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--color-slate-500)',
          }}
        >
          <span>Showing {filteredTickets.length} of {tickets.length} total tickets</span>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight size={14} />}
            onClick={() => navigate('/my-tickets')}
          >
            View My Tickets
          </Button>
        </div>
      </div>
    </div>
  );
};
