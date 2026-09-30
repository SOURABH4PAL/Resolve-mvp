import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import {
  Ticket as TicketIcon,
  Filter,
  Search,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const AdminTicketManagementPage: React.FC = () => {
  const { tickets, departments, categories, employees, assignTicket, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  // Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  // Filtered tickets
  const filteredTickets = tickets.filter(ticket => {
    if (searchTerm) {
      const matchNum = ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTitle = ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDesc = ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchAssignee = ticket.assignee?.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchNum && !matchTitle && !matchDesc && !matchAssignee) return false;
    }

    if (selectedDept !== 'ALL') {
      const deptName = ticket.category?.department?.name;
      const deptId = ticket.category?.department_id;
      if (deptName !== selectedDept && deptId !== selectedDept) return false;
    }

    if (selectedStatus !== 'ALL' && ticket.status !== selectedStatus) {
      return false;
    }

    if (selectedPriority !== 'ALL' && ticket.priority !== selectedPriority) {
      return false;
    }

    if (assignmentFilter === 'ASSIGNED' && !ticket.assigned_to) return false;
    if (assignmentFilter === 'UNASSIGNED' && ticket.assigned_to) return false;

    return true;
  });

  const handleOpenReassignModal = (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicket(ticket);
    setTargetEmployeeId(ticket.assigned_to || employees[0]?.id || '');
    setReassignError(null);
    setReassignModalOpen(true);
  };

  const handleConfirmReassign = async () => {
    if (!selectedTicket || !targetEmployeeId) return;
    setIsAssigning(true);
    setReassignError(null);
    try {
      const targetEmp = employees.find(e => e.id === targetEmployeeId || e.employee_id === targetEmployeeId);
      await assignTicket(selectedTicket.id, targetEmployeeId, targetEmp?.name);
      setReassignModalOpen(false);
      setSelectedTicket(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reassign ticket on server.';
      setReassignError(msg);
    } finally {
      setIsAssigning(false);
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
      header: 'Issue Details',
      render: ticket => {
        const dept = ticket.category?.department?.name || 'Department';
        const cat = ticket.category?.name || 'Category';
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{ticket.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              {dept} &gt; {cat} • Submitter: <strong>{ticket.creator?.name || 'Employee'}</strong>
            </div>
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '110px',
      render: ticket => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
      render: ticket => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'assigned_to',
      header: 'Assigned Employee',
      width: '180px',
      render: ticket => {
        const name = ticket.assignee?.name || (ticket.assigned_to ? 'Assigned' : 'Unassigned');
        const isUnassigned = !ticket.assigned_to;
        return (
          <div>
            {isUnassigned ? (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                }}
              >
                Unassigned
              </span>
            ) : (
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-slate-800)' }}>
                {name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Management Actions',
      width: '180px',
      align: 'right',
      render: ticket => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={e => handleOpenReassignModal(ticket, e)}
          >
            Assign
          </Button>
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
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ticket Management</h1>
          <p className="page-subtitle">
            Global view and administrative controls for all support tickets across company departments.
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

      {/* Filter Toolbar Card */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Search box */}
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ position: 'relative' }}>
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
                placeholder="Search ticket #, title, or keywords..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
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
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
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
            <option value="WAITING_FOR_USER">Waiting for User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
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

          {/* Assignment Filter */}
          <select
            value={assignmentFilter}
            onChange={e => setAssignmentFilter(e.target.value as any)}
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Assignment Statuses</option>
            <option value="ASSIGNED">Assigned Only</option>
            <option value="UNASSIGNED">Unassigned Only</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <Table<Ticket>
          columns={columns}
          data={filteredTickets}
          isLoading={isLoadingTickets}
          emptyMessage="No tickets found matching current filters."
          onRowClick={ticket => navigate(`/tickets/${ticket.ticket_number}`)}
        />
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-slate-100)', fontSize: '0.825rem', color: 'var(--color-slate-500)' }}>
          Showing {filteredTickets.length} of {tickets.length} total company tickets
        </div>
      </div>

      {/* Reassign Ticket Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Assign Ticket to Responsible Employee"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isAssigning}
              onClick={handleConfirmReassign}
            >
              Confirm Assignment
            </Button>
          </div>
        }
      >
        {selectedTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>Selected Ticket</div>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: 2 }}>
                {selectedTicket.ticket_number}: {selectedTicket.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Category: {selectedTicket.category?.name || 'General'}
              </div>
            </div>

            {reassignError && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 6,
                  color: '#991b1b',
                  fontSize: '0.8rem',
                }}
              >
                {reassignError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
                Select Responsible Employee
              </label>
              <select
                value={targetEmployeeId}
                onChange={e => setTargetEmployeeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email}) — {emp.responsibilities?.join(', ') || 'General Employee'}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 6 }}>
                The selected employee will receive this ticket in their &quot;Assigned To Me&quot; queue.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
