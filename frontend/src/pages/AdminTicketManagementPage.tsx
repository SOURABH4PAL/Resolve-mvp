import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { SlaBadge } from '../components/common/SlaBadge';
import { EmployeeName } from '../components/common/EmployeeName';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import {
  Ticket as TicketIcon,
  Filter,
  Search,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  ShieldAlert,
  ArrowUpDown,
} from 'lucide-react';

export const AdminTicketManagementPage: React.FC = () => {
  const { tickets, departments, categories, employees, assignTicket, blockTicket, unblockTicket, isLoadingTickets, fetchTickets } = useTickets();
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'BLOCKED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('unassigned_first');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 10;

  // Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Blocking Modal State
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [ticketToBlock, setTicketToBlock] = useState<Ticket | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Tab Counts
  const unassignedCount = useMemo(() => tickets.filter(t => !t.assigned_to).length, [tickets]);
  const assignedCount = useMemo(() => tickets.filter(t => !!t.assigned_to).length, [tickets]);
  const blockedCount = useMemo(() => tickets.filter(t => !!t.is_blocked).length, [tickets]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    setSelectedCategory('ALL');
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleStatusChange = (st: string) => {
    setSelectedStatus(st);
    setCurrentPage(1);
  };

  const handlePriorityChange = (pr: string) => {
    setSelectedPriority(pr);
    setCurrentPage(1);
  };

  const handleAssignmentFilterChange = (af: 'ALL' | 'ASSIGNED' | 'UNASSIGNED' | 'BLOCKED') => {
    setAssignmentFilter(af);
    setCurrentPage(1);
  };

  const handleAssigneeChange = (assigneeId: string) => {
    setSelectedAssignee(assigneeId);
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder(key === 'created_at' || key === 'unassigned_first' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedDept('ALL');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setSelectedAssignee('ALL');
    setAssignmentFilter('ALL');
    setSortBy('unassigned_first');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchNum = ticket.ticket_number.toLowerCase().includes(q);
        const matchTitle = ticket.title.toLowerCase().includes(q);
        const matchDesc = ticket.description.toLowerCase().includes(q);
        const matchAssignee = (ticket.assignee?.name || '').toLowerCase().includes(q);
        const matchCat = (ticket.category?.name || '').toLowerCase().includes(q);
        const matchDept = (ticket.category?.department?.name || '').toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchDesc && !matchAssignee && !matchCat && !matchDept) return false;
      }

      if (selectedDept !== 'ALL') {
        const deptName = ticket.category?.department?.name;
        const deptId = ticket.category?.department_id;
        if (deptName !== selectedDept && deptId !== selectedDept) return false;
      }

      if (selectedCategory !== 'ALL') {
        if (ticket.category_id !== selectedCategory && ticket.category?.name !== selectedCategory) return false;
      }

      if (selectedStatus !== 'ALL' && ticket.status !== selectedStatus) {
        return false;
      }

      if (selectedPriority !== 'ALL' && ticket.priority !== selectedPriority) {
        return false;
      }

      if (assignmentFilter === 'ASSIGNED' && !ticket.assigned_to) return false;
      if (assignmentFilter === 'UNASSIGNED' && ticket.assigned_to) return false;
      if (assignmentFilter === 'BLOCKED' && !ticket.is_blocked) return false;

      if (selectedAssignee !== 'ALL') {
        if (ticket.assigned_to !== selectedAssignee && ticket.assignee?.id !== selectedAssignee) return false;
      }

      return true;
    });
  }, [tickets, searchTerm, selectedDept, selectedCategory, selectedStatus, selectedPriority, assignmentFilter, selectedAssignee]);

  const priorityWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  // Deterministic sorting strategy:
  // Default 'unassigned_first': Unassigned first, then High priority > Medium > Low, then older tickets first.
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      if (sortBy === 'unassigned_first') {
        // 1. Unassigned tickets first
        const aUnassigned = !a.assigned_to ? 1 : 0;
        const bUnassigned = !b.assigned_to ? 1 : 0;
        if (aUnassigned !== bUnassigned) {
          return bUnassigned - aUnassigned;
        }
        // 2. Priority: Higher first
        const prioDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (prioDiff !== 0) return prioDiff;
        // 3. Older first (deterministic)
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      }

      let comparison = 0;
      if (sortBy === 'ticket_number') {
        comparison = a.ticket_number.localeCompare(b.ticket_number);
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'priority') {
        comparison = (priorityWeight[a.priority] || 0) - (priorityWeight[b.priority] || 0);
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortBy === 'assigned_to') {
        const nameA = a.assignee?.name || '';
        const nameB = b.assignee?.name || '';
        comparison = nameA.localeCompare(nameB);
      } else if (sortBy === 'sla_status') {
        const slaOrder: Record<string, number> = { BREACHED: 3, AT_RISK: 2, WITHIN_SLA: 1, NO_SLA: 0 };
        comparison = (slaOrder[a.sla_status || ''] || 0) - (slaOrder[b.sla_status || ''] || 0);
      } else {
        // created_at
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTickets, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    return sortedTickets.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedTickets, currentPage, pageSize]);

  // Assignment Modal
  const handleOpenReassignModal = (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTicket(ticket);
    setTargetEmployeeId(ticket.assigned_to || employees[0]?.id || '');
    setReassignModalOpen(true);
  };

  const handleConfirmReassign = async () => {
    if (!selectedTicket || !targetEmployeeId) return;
    setIsAssigning(true);
    try {
      const targetEmp = employees.find(e => e.id === targetEmployeeId || e.employee_id === targetEmployeeId);
      await assignTicket(selectedTicket.id, targetEmployeeId, targetEmp?.name);
      setReassignModalOpen(false);
      setSelectedTicket(null);
    } catch (err) {
      console.error('Failed to reassign ticket:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  // Blocking handlers
  const handleOpenBlockModal = (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    setTicketToBlock(ticket);
    setBlockReason('');
    setBlockError(null);
    setBlockModalOpen(true);
  };

  const handleOpenUnblockModal = (ticket: Ticket, e: React.MouseEvent) => {
    e.stopPropagation();
    setTicketToBlock(ticket);
    setBlockError(null);
    setUnblockModalOpen(true);
  };

  const handleConfirmBlock = async () => {
    if (!ticketToBlock) return;
    if (!blockReason.trim()) {
      setBlockError('A clear business reason is required to block a ticket.');
      return;
    }
    setIsSubmittingBlock(true);
    setBlockError(null);
    try {
      await blockTicket(ticketToBlock.id, blockReason.trim());
      setBlockModalOpen(false);
      setTicketToBlock(null);
      setBlockReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to block ticket.';
      setBlockError(msg);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleConfirmUnblock = async () => {
    if (!ticketToBlock) return;
    setIsSubmittingBlock(true);
    setBlockError(null);
    try {
      await unblockTicket(ticketToBlock.id);
      setUnblockModalOpen(false);
      setTicketToBlock(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unblock ticket.';
      setBlockError(msg);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      width: '125px',
      sortable: true,
      render: ticket => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
            {ticket.ticket_number}
          </span>
          {ticket.is_blocked && (
            <span
              title={`Blocked: ${ticket.blocked_reason || 'Administrative hold'}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 4px',
                borderRadius: 4,
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              <Lock size={10} style={{ marginRight: 2 }} /> BLOCKED
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Issue Details',
      sortable: true,
      render: ticket => {
        const dept = ticket.category?.department?.name || 'General';
        const cat = ticket.category?.name || 'Unspecified';
        return (
          <div style={{ maxWidth: '320px' }}>
            <div
              style={{
                fontWeight: 600,
                color: 'var(--color-slate-900)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={ticket.title}
            >
              {ticket.title}
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-slate-500)',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexWrap: 'wrap',
              }}
            >
              <span>{dept} &gt; {cat}</span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                Submitter: <EmployeeName name={ticket.creator?.name} email={ticket.creator?.email} maxWidth="120px" />
              </span>
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
      sortable: true,
      render: ticket => (
        <SlaBadge
          slaStatus={ticket.sla_status}
          resolutionDueAt={ticket.resolution_due_at}
        />
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned Employee',
      width: '170px',
      sortable: true,
      render: ticket => {
        const isUnassigned = !ticket.assigned_to;
        return (
          <div>
            {isUnassigned ? (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AlertTriangle size={12} />
                Unassigned
              </span>
            ) : (
              <EmployeeName
                name={ticket.assignee?.name}
                email={ticket.assignee?.email}
                maxWidth="150px"
              />
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Management Actions',
      width: '210px',
      align: 'right',
      render: ticket => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Super Admin Block / Unblock Controls */}
          {isSuperAdmin && (
            ticket.is_blocked ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={e => handleOpenUnblockModal(ticket, e)}
                style={{ color: '#059669', borderColor: '#a7f3d0', fontSize: '0.75rem', padding: '4px 8px' }}
                title="Unblock this ticket to resume lifecycle actions"
              >
                <Unlock size={12} style={{ marginRight: 4 }} /> Unblock
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => handleOpenBlockModal(ticket, e)}
                style={{ color: '#dc2626', fontSize: '0.75rem', padding: '4px 8px' }}
                title="Block this ticket (e.g. pending vendor dependency, legal hold)"
              >
                <Lock size={12} style={{ marginRight: 4 }} /> Block
              </Button>
            )
          )}

          <Button
            variant="secondary"
            size="sm"
            disabled={ticket.is_blocked}
            onClick={e => handleOpenReassignModal(ticket, e)}
            title={ticket.is_blocked ? 'Ticket is blocked from assignment' : 'Assign to employee'}
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
            Global administrative controls, assignment workflows, SLA compliance, and operational triage.
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

      {/* Operational Quick Tabs: Unassigned Priority View */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--color-slate-200)',
          paddingBottom: 2,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => handleAssignmentFilterChange('ALL')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            borderBottom: assignmentFilter === 'ALL' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            background: assignmentFilter === 'ALL' ? '#f0fdf4' : 'transparent',
            color: assignmentFilter === 'ALL' ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          All Tickets
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 12,
              fontSize: '0.75rem',
              backgroundColor: '#e2e8f0',
              color: '#334155',
            }}
          >
            {tickets.length}
          </span>
        </button>

        <button
          onClick={() => handleAssignmentFilterChange('UNASSIGNED')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            borderBottom: assignmentFilter === 'UNASSIGNED' ? '2px solid #d97706' : '2px solid transparent',
            background: assignmentFilter === 'UNASSIGNED' ? '#fffbeb' : 'transparent',
            color: assignmentFilter === 'UNASSIGNED' ? '#b45309' : 'var(--color-slate-600)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <AlertTriangle size={14} color="#d97706" />
          Unassigned Tickets
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 12,
              fontSize: '0.75rem',
              backgroundColor: unassignedCount > 0 ? '#fef3c7' : '#e2e8f0',
              color: unassignedCount > 0 ? '#92400e' : '#334155',
              fontWeight: 700,
            }}
          >
            {unassignedCount}
          </span>
        </button>

        <button
          onClick={() => handleAssignmentFilterChange('ASSIGNED')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px 6px 0 0',
            border: 'none',
            borderBottom: assignmentFilter === 'ASSIGNED' ? '2px solid var(--color-primary-600)' : '2px solid transparent',
            background: assignmentFilter === 'ASSIGNED' ? '#f0fdf4' : 'transparent',
            color: assignmentFilter === 'ASSIGNED' ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Assigned Tickets
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 12,
              fontSize: '0.75rem',
              backgroundColor: '#e2e8f0',
              color: '#334155',
            }}
          >
            {assignedCount}
          </span>
        </button>

        {blockedCount > 0 && (
          <button
            onClick={() => handleAssignmentFilterChange('BLOCKED')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              borderBottom: assignmentFilter === 'BLOCKED' ? '2px solid #dc2626' : '2px solid transparent',
              background: assignmentFilter === 'BLOCKED' ? '#fef2f2' : 'transparent',
              color: assignmentFilter === 'BLOCKED' ? '#b91c1c' : 'var(--color-slate-600)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Lock size={13} color="#dc2626" />
            Blocked Tickets
            <span
              style={{
                padding: '2px 7px',
                borderRadius: 12,
                fontSize: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontWeight: 700,
              }}
            >
              {blockedCount}
            </span>
          </button>
        )}
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
                placeholder="Search ticket #, title, keyword, submitter, department..."
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
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
            onChange={e => handleDeptChange(e.target.value)}
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => handleCategoryChange(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Categories</option>
            {categories
              .filter(c => {
                if (selectedDept === 'ALL') return true;
                const dept = departments.find(d => d.id === c.department_id) || c.department;
                return dept?.name === selectedDept || c.department_id === selectedDept;
              })
              .map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => handleStatusChange(e.target.value)}
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
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => handlePriorityChange(e.target.value)}
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

          {/* Assigned Employee Filter */}
          <select
            value={selectedAssignee}
            onChange={e => handleAssigneeChange(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Assignees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {(searchTerm ||
            selectedDept !== 'ALL' ||
            selectedCategory !== 'ALL' ||
            selectedStatus !== 'ALL' ||
            selectedPriority !== 'ALL' ||
            assignmentFilter !== 'ALL' ||
            selectedAssignee !== 'ALL') && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Current Ordering Indicator */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={13} />
            <span>
              Order: {sortBy === 'unassigned_first' ? (
                <strong>Default Priority (Unassigned first &gt; High priority &gt; Older tickets)</strong>
              ) : (
                <span>Sorted by <strong>{sortBy}</strong> ({sortOrder.toUpperCase()})</span>
              )}
            </span>
          </div>
          {sortBy !== 'unassigned_first' && (
            <button
              onClick={() => {
                setSortBy('unassigned_first');
                setSortOrder('desc');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary-600)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.75rem',
              }}
            >
              Reset to Unassigned-First Priority Sort
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <Table<Ticket>
          columns={columns}
          data={paginatedTickets}
          isLoading={isLoadingTickets}
          emptyMessage="No tickets found matching the selected criteria."
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

      {/* Reassign Ticket Modal */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Assign Ticket to Employee"
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
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>Target Ticket</div>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: 2 }}>
                {selectedTicket.ticket_number}: {selectedTicket.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Category: {selectedTicket.category?.name || 'General'}
              </div>
            </div>

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
                    {emp.name} ({emp.email}) — {emp.responsibilities?.join(', ') || 'Employee'}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 6 }}>
                The assigned employee will receive this ticket in their &quot;Work Queue / Assigned To Me&quot; list.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Block Ticket Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Block Ticket (Super Admin)"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setBlockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isSubmittingBlock}
              onClick={handleConfirmBlock}
            >
              Block Ticket
            </Button>
          </div>
        }
      >
        {ticketToBlock && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontWeight: 600 }}>
                <ShieldAlert size={18} />
                <span>Ticket Blocking Notice</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: 4 }}>
                Blocking ticket <strong>{ticketToBlock.ticket_number}</strong> will halt all progress, status updates, and reassignment until an administrator unblocks it. This action will be recorded in the audit journey.
              </p>
            </div>

            {blockError && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.8rem' }}>
                {blockError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
                Reason for Blocking <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="E.g., Pending budget approval, legal review hold, external vendor dependency..."
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 4 }}>
                Explain why progress is suspended so team members understand what is needed to unblock.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Unblock Ticket Confirmation Modal */}
      <Modal
        isOpen={unblockModalOpen}
        onClose={() => setUnblockModalOpen(false)}
        title="Unblock Ticket"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setUnblockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmittingBlock}
              onClick={handleConfirmUnblock}
            >
              Confirm Unblock
            </Button>
          </div>
        }
      >
        {ticketToBlock && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)' }}>
              Are you sure you want to unblock ticket <strong>{ticketToBlock.ticket_number}: {ticketToBlock.title}</strong>?
            </p>
            {ticketToBlock.blocked_reason && (
              <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--color-slate-500)' }}>Current reason: </span>
                <span style={{ fontWeight: 500, color: 'var(--color-slate-800)' }}>{ticketToBlock.blocked_reason}</span>
              </div>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
              Unblocking will restore normal lifecycle transitions and assignment workflows.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
