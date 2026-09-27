import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { Ticket, TicketStatus } from '../types';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const AssignedToMePage: React.FC = () => {
  const { currentUser, allUsers, switchUser } = useAuth();
  const { tickets, updateTicketStatus, assignTicket } = useTickets();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [targetResolverId, setTargetResolverId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Tickets assigned to this user
  const assignedTickets = tickets.filter(t => t.assigned_to === currentUser?.id);

  // Status filtered
  const filteredTickets = assignedTickets.filter(t => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const handleOpenTransfer = (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicket(ticket);
    setTargetResolverId('');
    setTransferReason('');
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!selectedTicket || !targetResolverId) return;
    assignTicket(selectedTicket.id, targetResolverId);
    setTransferModalOpen(false);
  };

  const handleQuickStatusChange = (ticketId: string, newStatus: TicketStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTicketStatus(ticketId, newStatus);
  };

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      width: '110px',
      render: ticket => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
          {ticket.ticket_number}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Issue & Category',
      render: ticket => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{ticket.title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
            Raised by: <strong style={{ color: 'var(--color-slate-700)' }}>{ticket.creator_name}</strong> • {ticket.department_name} ({ticket.category_name})
          </div>
        </div>
      ),
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
      width: '130px',
      render: ticket => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'actions',
      header: 'Resolver Actions',
      width: '260px',
      align: 'right',
      render: ticket => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
          {ticket.status === 'OPEN' && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Clock size={13} />}
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
              onClick={e => handleQuickStatusChange(ticket.id, 'RESOLVED', e)}
            >
              Resolve
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            title="Transfer wrongly assigned ticket"
            leftIcon={<ArrowRightLeft size={13} />}
            onClick={e => handleOpenTransfer(ticket, e)}
          >
            Transfer
          </Button>

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

  const resolverOptions = allUsers
    .filter(u => u.id !== currentUser?.id)
    .map(u => ({
      value: u.id,
      label: `${u.name} (${u.role.replace('_', ' ')} - ${u.department_name})`,
    }));

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

        {/* If current user is EMPLOYEE, suggest switching to Resolver */}
        {currentUser?.role === 'EMPLOYEE' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              color: '#92400e',
            }}
          >
            <ShieldAlert size={16} />
            <span>Currently logged in as Employee.</span>
            <button
              onClick={() => switchUser('usr-2')}
              style={{
                textDecoration: 'underline',
                fontWeight: 600,
                color: '#b45309',
                cursor: 'pointer',
              }}
            >
              Switch to Sarah Jenkins (IT Resolver)
            </button>
          </div>
        )}
      </div>

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
            <div className="stat-val">{assignedTickets.filter(t => t.status === 'OPEN').length}</div>
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
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
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
                {status === 'ALL' ? 'All' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={t => t.id}
          onRowClick={t => navigate(`/tickets/${t.ticket_number}`)}
          emptyMessage="No tickets currently assigned to you in this status filter."
        />
      </div>

      {/* Transfer / Reassignment Modal (BRD 6.4) */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={`Transfer Ticket ${selectedTicket?.ticket_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!targetResolverId}
              onClick={handleConfirmTransfer}
            >
              Confirm Transfer
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
            Per BRD section 6.4: If this ticket is wrongly assigned, you can transfer it to another resolver or support team.
          </p>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-slate-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.825rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>{selectedTicket?.title}</div>
            <div style={{ color: 'var(--color-slate-500)', marginTop: 4 }}>
              Current: {selectedTicket?.department_name} • Priority: {selectedTicket?.priority}
            </div>
          </div>

          <Select
            label="Reassign To Resolver / Support Lead"
            placeholder="-- Choose Resolver --"
            value={targetResolverId}
            onChange={e => setTargetResolverId(e.target.value)}
            options={resolverOptions}
            required
          />

          <div className="form-group">
            <label className="form-label required">Transfer Reason</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Issue requires hardware replacement which belongs to physical desktop support team."
              value={transferReason}
              onChange={e => setTransferReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
