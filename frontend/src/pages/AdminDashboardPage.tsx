import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Table, Column } from '../components/common/Table';
import { Ticket } from '../types';
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building2,
  FolderTree,
  Route,
  ArrowRight,
  ShieldAlert,
  Flame,
  UserCheck,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { MOCK_ESCALATIONS } from '../mock/mockData';

export const AdminDashboardPage: React.FC = () => {
  const { tickets, departments, categories, responsibilities, employees, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  // Metrics
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter(
    t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'WAITING_FOR_USER'
  ).length;
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
  const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;
  const unassignedTickets = tickets.filter(t => !t.assigned_to).length;
  const slaBreachedTickets = MOCK_ESCALATIONS.length;

  // Department breakdown
  const departmentBreakdown = departments.map(dept => {
    const deptTickets = tickets.filter(t => t.category?.department_id === dept.id || t.category?.department?.name === dept.name);
    const openCount = deptTickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
    return {
      department: dept.name,
      total: deptTickets.length,
      open: openCount,
    };
  });

  // Employee workload breakdown (Responsible employees)
  const employeeWorkloads = employees.map(emp => {
    const assignedTickets = tickets.filter(t => t.assigned_to === emp.id || t.assigned_to === emp.employee_id);
    const activeAssigned = assignedTickets.filter(t => t.status !== 'CLOSED' && t.status !== 'RESOLVED').length;
    const empResponsibilities = responsibilities
      .filter(r => r.responsible_employee_id === emp.id || r.responsible_employee_email === emp.email)
      .map(r => r.category_name);

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      responsibilities: empResponsibilities,
      activeLoad: activeAssigned,
      totalAssigned: assignedTickets.length,
    };
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
      header: 'Subject & Department',
      render: ticket => {
        const deptName = ticket.category?.department?.name || 'Department';
        const catName = ticket.category?.name || 'General';
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{ticket.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              {deptName} • {catName} • Raised by: {ticket.creator?.name || 'Employee'}
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
      header: 'Responsible Employee',
      width: '180px',
      render: ticket => {
        const assigneeName = ticket.assignee?.name || (ticket.assigned_to ? 'Assigned' : 'Unassigned');
        const isUnassigned = !ticket.assigned_to;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                Needs Assignment
              </span>
            ) : (
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-slate-800)' }}>
                {assigneeName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'action',
      header: '',
      width: '80px',
      align: 'right',
      render: ticket => (
        <Button
          variant="secondary"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            navigate(`/tickets/${ticket.ticket_number}`);
          }}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Management Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 16,
          padding: '28px 32px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
          border: '1px solid #334155',
          boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)',
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
              backgroundColor: '#ef4444',
              color: '#ffffff',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              marginBottom: 10,
            }}
          >
            <span>Super Admin Console</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            Enterprise Operations Dashboard
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: 6, maxWidth: 650 }}>
            System-wide oversight across tickets, employee category responsibilities, SLA compliance, and organizational queues.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant="secondary"
            size="lg"
            leftIcon={<RefreshCw size={16} />}
            isLoading={isLoadingTickets}
            onClick={() => fetchTickets()}
            style={{ backgroundColor: '#334155', color: '#ffffff', borderColor: '#475569' }}
          >
            Sync Data
          </Button>

          <Button
            variant="primary"
            size="lg"
            leftIcon={<Route size={18} />}
            onClick={() => navigate('/admin/routing')}
            style={{ backgroundColor: 'var(--color-primary-600)' }}
          >
            Configure Routing
          </Button>
        </div>
      </div>

      {/* Quick Action Bar for Management */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate('/admin/tickets')}
          className="admin-quick-action"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#eef2ff', color: 'var(--color-primary-600)' }}>
            <TicketIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>View All Tickets</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>{totalTickets} Total</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/employees')}
          className="admin-quick-action"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#ecfdf5', color: '#059669' }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>Manage Employees</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>{employees.length} Active</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/departments')}
          className="admin-quick-action"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>Manage Depts</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>{departments.length} Units</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/categories')}
          className="admin-quick-action"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#fffbeb', color: '#d97706' }}>
            <FolderTree size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>Categories & Subs</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>{categories.length} Registered</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin/routing')}
          className="admin-quick-action"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 10,
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <Route size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>Category Routing</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>{responsibilities.length} Rules</div>
          </div>
        </button>
      </div>

      {/* Management Metrics Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <TicketIcon size={20} />
          </div>
          <div>
            <div className="stat-val">{totalTickets}</div>
            <div className="stat-label">Total Tickets</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-val">{openTickets}</div>
            <div className="stat-label">Open</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="stat-val">{inProgressTickets}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="stat-val">{resolvedTickets}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--color-slate-100)', color: 'var(--color-slate-600)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="stat-val">{closedTickets}</div>
            <div className="stat-label">Closed</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            borderColor: slaBreachedTickets > 0 ? '#fecaca' : undefined,
            backgroundColor: slaBreachedTickets > 0 ? '#fef2f2' : undefined,
          }}
        >
          <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <Flame size={20} />
          </div>
          <div>
            <div className="stat-val" style={{ color: slaBreachedTickets > 0 ? '#dc2626' : undefined }}>
              {slaBreachedTickets}
            </div>
            <div className="stat-label">SLA Breached</div>
          </div>
        </div>

        <div
          className="stat-card"
          style={{
            borderColor: unassignedTickets > 0 ? '#fed7aa' : undefined,
            backgroundColor: unassignedTickets > 0 ? '#fff7ed' : undefined,
          }}
        >
          <div className="stat-icon" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="stat-val" style={{ color: unassignedTickets > 0 ? '#ea580c' : undefined }}>
              {unassignedTickets}
            </div>
            <div className="stat-label">Unassigned</div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Department Breakdown & Employee Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Department Volume Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Tickets by Department</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Current load across organizational departments
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/departments')}>
              Manage
            </Button>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {departmentBreakdown.map(dept => (
              <div key={dept.department}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>{dept.department}</span>
                  <span style={{ color: 'var(--color-slate-500)' }}>
                    <strong>{dept.open}</strong> active / {dept.total} total
                  </span>
                </div>
                <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${totalTickets > 0 ? Math.min(100, Math.round((dept.total / totalTickets) * 100)) : 0}%`,
                      backgroundColor: 'var(--color-primary-600)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Workload Card (Role == EMPLOYEE with designated responsibilities) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Employee Support Workload</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Responsible employees handling category queues
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/routing')}>
              Configure Routing
            </Button>
          </div>

          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {employeeWorkloads.map(emp => (
              <div
                key={emp.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-900)' }}>
                      {emp.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)' }}>
                      ({emp.email})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                    Responsible for:{' '}
                    <strong style={{ color: 'var(--color-primary-700)' }}>
                      {emp.responsibilities.length > 0 ? emp.responsibilities.join(', ') : 'General Support'}
                    </strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      backgroundColor: emp.activeLoad > 2 ? '#fee2e2' : '#e0e7ff',
                      color: emp.activeLoad > 2 ? '#991b1b' : '#3730a3',
                    }}
                  >
                    {emp.activeLoad} Active Tickets
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Escalations Alert Card */}
      {MOCK_ESCALATIONS.length > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={20} style={{ color: '#dc2626' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>
                Recent SLA Escalations & Breaches
              </h3>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/sla')}>
              View SLA Policies
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MOCK_ESCALATIONS.map(esc => (
              <div
                key={esc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #fee2e2',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>
                      {esc.ticket_number}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-900)' }}>
                      {esc.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                    Dept: {esc.department} • Assigned Employee: {esc.responsible_employee_name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c' }}>
                    {esc.hours_elapsed}h elapsed (Limit: {esc.sla_limit_hours}h)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Recent Tickets Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Tickets Across Company</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              Inspect and manage all employee-raised support issues.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            rightIcon={<ArrowRight size={14} />}
            onClick={() => navigate('/admin/tickets')}
          >
            All Tickets View
          </Button>
        </div>

        <Table<Ticket>
          columns={columns}
          data={tickets.slice(0, 10)}
          isLoading={isLoadingTickets}
          emptyMessage="No tickets recorded."
          onRowClick={ticket => navigate(`/tickets/${ticket.ticket_number}`)}
        />
      </div>
    </div>
  );
};
