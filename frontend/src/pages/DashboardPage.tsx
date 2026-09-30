import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Table, Column } from '../components/common/Table';
import { Ticket } from '../types';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  Inbox,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Bell,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Employee-specific tickets
  const myTickets = tickets.filter(t => t.created_by === currentUser?.id);
  const myOpenCount = myTickets.filter(t => t.status === 'OPEN' || t.status === 'ASSIGNED').length;
  const myInProgressCount = myTickets.filter(
    t => t.status === 'IN_PROGRESS' || t.status === 'WAITING_FOR_USER' || t.status === 'REOPENED'
  ).length;
  const myResolvedCount = myTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  // Tickets assigned to this employee (if they have category responsibility)
  const assignedToMeTickets = tickets.filter(
    t => t.assigned_to === currentUser?.id && t.status !== 'CLOSED' && t.status !== 'RESOLVED'
  );

  // Tickets to display in recent list: Employee's tickets
  const displayTickets = myTickets.length > 0 ? myTickets : tickets;

  const filteredTickets = displayTickets.filter(t => {
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
      header: 'Assigned To',
      width: '170px',
      render: ticket => {
        const name = ticket.assignee?.name || (ticket.assigned_to ? 'Assigned' : 'Awaiting assignment');
        return (
          <span style={{ fontSize: '0.85rem', color: ticket.assignee ? 'var(--color-slate-800)' : 'var(--color-slate-400)' }}>
            {name}
          </span>
        );
      },
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      width: '130px',
      render: ticket => {
        const date = new Date(ticket.updated_at || ticket.created_at);
        return (
          <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: '',
      width: '60px',
      align: 'right',
      render: ticket => (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            navigate(`/tickets/${ticket.ticket_number}`);
          }}
          aria-label="View ticket"
        >
          <ArrowRight size={16} />
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.2)',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              marginBottom: 10,
            }}
          >
            <span>Employee Support Portal</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            Welcome back, {currentUser?.name || 'Employee'}!
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#c7d2fe', marginTop: 6, maxWidth: 500 }}>
            Need assistance with IT, HR, or Finance? Raise a ticket and the responsible team will resolve it promptly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant="secondary"
            size="lg"
            leftIcon={<RefreshCw size={16} />}
            isLoading={isLoadingTickets}
            onClick={() => fetchTickets()}
            style={{ backgroundColor: '#ffffff', color: 'var(--color-primary-800)' }}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<PlusCircle size={18} />}
            onClick={() => navigate('/employee/create-ticket')}
            style={{
              backgroundColor: '#ffffff',
              color: 'var(--color-primary-700)',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <Inbox size={22} />
          </div>
          <div>
            <div className="stat-val">{myOpenCount}</div>
            <div className="stat-label">My Open Tickets</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-val">{myInProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val">{myResolvedCount}</div>
            <div className="stat-label">Resolved / Closed</div>
          </div>
        </div>

        {/* Assigned to Me Card (Shown for employees who have tickets assigned to them) */}
        <div
          className="stat-card"
          onClick={() => navigate('/employee/assigned')}
          style={{
            cursor: 'pointer',
            borderColor: assignedToMeTickets.length > 0 ? 'var(--color-primary-300)' : undefined,
            backgroundColor: assignedToMeTickets.length > 0 ? '#faf5ff' : undefined,
          }}
        >
          <div className="stat-icon" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div className="stat-val">{assignedToMeTickets.length}</div>
            <div className="stat-label">
              Assigned To Me{' '}
              {assignedToMeTickets.length > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#7e22ce', fontWeight: 600 }}>• Active</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Tickets & Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Recent Tickets Table Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">My Recent Tickets</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Track live issue lifecycle and designated responsible employees.
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
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
                  }}
                >
                  {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <Table<Ticket>
            columns={columns}
            data={filteredTickets}
            isLoading={isLoadingTickets}
            emptyMessage="No tickets found matching this filter."
            onRowClick={ticket => navigate(`/tickets/${ticket.ticket_number}`)}
          />

          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--color-slate-100)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.825rem', color: 'var(--color-slate-500)' }}>
              Showing {filteredTickets.length} of {displayTickets.length} tickets
            </span>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight size={14} />}
              onClick={() => navigate('/employee/my-tickets')}
            >
              View All My Tickets
            </Button>
          </div>
        </div>

        {/* Right Column: Activity / Notifications & Help */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Notifications / Activity Preview */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--color-slate-100)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} style={{ color: 'var(--color-primary-600)' }} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                  Recent Activity
                </h4>
              </div>
              <button
                onClick={() => navigate('/employee/notifications')}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-primary-600)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                View All
              </button>
            </div>

            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myTickets.length > 0 ? (
                myTickets.slice(0, 3).map(t => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      backgroundColor: 'var(--color-slate-50)',
                      borderLeft: '3px solid var(--color-primary-600)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      {t.ticket_number}: {t.title}
                    </div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--color-slate-600)', marginTop: 2 }}>
                      Status: <strong>{t.status.replace('_', ' ')}</strong> • Priority: {t.priority}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)', textAlign: 'center', padding: '16px 0' }}>
                  No recent activity. Create a ticket to get started.
                </div>
              )}
            </div>
          </div>

          {/* Quick Support Guidelines */}
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <HelpCircle size={18} style={{ color: 'var(--color-primary-600)' }} />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                How Support Works
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-600)', lineHeight: 1.5 }}>
              ResolveHub automatically routes your ticket to the <strong>responsible employee</strong> dedicated to that category. You will receive updates as they investigate and resolve your issue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
