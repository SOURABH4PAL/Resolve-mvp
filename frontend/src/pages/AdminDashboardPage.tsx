import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { SlaBadge } from '../components/common/SlaBadge';
import { EmployeeName } from '../components/common/EmployeeName';
import { Table, Column } from '../components/common/Table';
import { Ticket, DashboardReport, DepartmentWorkload, DepartmentSlaPerformance } from '../types';
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
  Lock,
  Award,
  BarChart3,
} from 'lucide-react';
import { api } from '../api/client';

export const AdminDashboardPage: React.FC = () => {
  const { tickets, departments, categories, responsibilities, employees, isLoadingTickets, fetchTickets } = useTickets();
  const navigate = useNavigate();

  const [dashboardReport, setDashboardReport] = useState<DashboardReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const loadDashboardReport = async () => {
    setIsLoadingReport(true);
    try {
      const data = await api.get<DashboardReport>('/reports/dashboard');
      if (data && data.summary) {
        setDashboardReport(data);
      }
    } catch (err) {
      console.warn('Failed to fetch dashboard report, computing from tickets array:', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    loadDashboardReport();
  }, []);

  // Summary Metrics (prefer backend live report, fallback to tickets array)
  const totalTickets = dashboardReport?.summary?.total_tickets ?? tickets.length;
  const openTickets = dashboardReport?.summary?.open_tickets ?? tickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = dashboardReport?.summary?.in_progress_tickets ?? tickets.filter(
    t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'WAITING_FOR_USER'
  ).length;
  const resolvedTickets = dashboardReport?.summary?.resolved_tickets ?? tickets.filter(t => t.status === 'RESOLVED').length;
  const closedTickets = dashboardReport?.summary?.closed_tickets ?? tickets.filter(t => t.status === 'CLOSED').length;
  const unassignedTickets = dashboardReport?.summary?.unassigned_tickets ?? tickets.filter(t => !t.assigned_to).length;
  const blockedTickets = dashboardReport?.summary?.blocked_tickets ?? tickets.filter(t => !!t.is_blocked).length;

  // Real SLA Metrics from backend
  const slaSummary = dashboardReport?.sla_summary;
  const departmentSlaList = dashboardReport?.department_sla || [];

  // Local fallback for department breakdown if not in report
  const departmentBreakdown = dashboardReport?.department_workload?.length
    ? dashboardReport.department_workload.map((dw: DepartmentWorkload) => ({
        department: dw.department_name,
        total: dw.total_tickets,
        open: dw.open_tickets,
      }))
    : departments.map(dept => {
        const deptTickets = tickets.filter(
          t => t.category?.department_id === dept.id || t.category?.department?.name === dept.name
        );
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

  const handleSyncAll = async () => {
    await Promise.all([fetchTickets(), loadDashboardReport()]);
  };

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket ID',
      width: '120px',
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
      header: 'Subject & Category',
      render: ticket => {
        const deptName = ticket.category?.department?.name || 'General';
        const catName = ticket.category?.name || 'Unspecified';
        return (
          <div style={{ maxWidth: 300 }}>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
              <span>{deptName} • {catName}</span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                By: <EmployeeName name={ticket.creator?.name} email={ticket.creator?.email} maxWidth="100px" />
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
      render: ticket => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '130px',
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
      key: 'assigned_to',
      header: 'Assigned Employee',
      width: '170px',
      render: ticket => {
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
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <AlertTriangle size={11} /> Unassigned
              </span>
            ) : (
              <EmployeeName
                name={ticket.assignee?.name}
                email={ticket.assignee?.email}
                maxWidth="140px"
              />
            )}
          </div>
        );
      },
    },
    {
      key: 'action',
      header: '',
      width: '90px',
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
            Real-time oversight across tickets, SLA compliance ratios, category responsibilities, and operational queues.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant="secondary"
            size="lg"
            leftIcon={<RefreshCw size={16} />}
            isLoading={isLoadingTickets || isLoadingReport}
            onClick={handleSyncAll}
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

      {/* Operational Alert Banner for Unassigned Tickets */}
      {unassignedTickets > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            backgroundColor: '#fffbeb',
            border: '2px solid #fde68a',
            borderRadius: 12,
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#fef3c7', color: '#b45309' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e' }}>
                Operational Attention: {unassignedTickets} Unassigned Ticket{unassignedTickets > 1 ? 's' : ''} Awaiting Triage
              </div>
              <div style={{ fontSize: '0.775rem', color: '#b45309', marginTop: 2 }}>
                Unassigned tickets have no responsible owner assigned. Triage these tickets promptly to safeguard SLA targets.
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/admin/tickets')}
            style={{ backgroundColor: '#d97706', borderColor: '#b45309' }}
          >
            Triage Unassigned Tickets
          </Button>
        </div>
      )}

      {/* Quick Action Navigation Bar */}
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
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>All Tickets</div>
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
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>Departments</div>
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
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>Categories &amp; Subs</div>
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

        <button
          onClick={() => navigate('/admin/sla')}
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
          <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <Award size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>SLA Policies</div>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>Rules &amp; Tiers</div>
          </div>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
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

        {blockedTickets > 0 && (
          <div
            className="stat-card"
            style={{
              borderColor: '#fecaca',
              backgroundColor: '#fef2f2',
            }}
          >
            <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <Lock size={20} />
            </div>
            <div>
              <div className="stat-val" style={{ color: '#dc2626' }}>
                {blockedTickets}
              </div>
              <div className="stat-label">Blocked</div>
            </div>
          </div>
        )}
      </div>

      {/* SLA Compliance Section */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={20} style={{ color: 'var(--color-primary-600)' }} />
              <h3 className="card-title" style={{ margin: 0 }}>Service Level Agreement (SLA) Overview</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              Compliance ratio across tickets with active SLA resolution targets (excluding exempt policies)
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={() => navigate('/admin/sla')}>
            Manage Policies
          </Button>
        </div>

        {slaSummary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* SLA Key Indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ padding: 14, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>SLA-Eligible Tickets</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-slate-900)', marginTop: 4 }}>
                  {slaSummary.total_eligible}
                </div>
              </div>

              <div style={{ padding: 14, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.75rem', color: '#166534' }}>Within SLA</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                  {slaSummary.within_sla}
                </div>
              </div>

              <div style={{ padding: 14, backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '0.75rem', color: '#92400e' }}>At Risk (&lt;4h remaining)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b45309', marginTop: 4 }}>
                  {slaSummary.at_risk}
                </div>
              </div>

              <div style={{ padding: 14, backgroundColor: slaSummary.breached > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 8, border: `1px solid ${slaSummary.breached > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                <div style={{ fontSize: '0.75rem', color: slaSummary.breached > 0 ? '#991b1b' : 'var(--color-slate-500)' }}>Breached SLA</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: slaSummary.breached > 0 ? '#dc2626' : 'var(--color-slate-900)', marginTop: 4 }}>
                  {slaSummary.breached}
                </div>
              </div>

              <div style={{ padding: 14, backgroundColor: '#f5f3ff', borderRadius: 8, border: '1px solid #ddd6fe' }}>
                <div style={{ fontSize: '0.75rem', color: '#5b21b6' }}>Overall Compliance</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#6d28d9', marginTop: 4 }}>
                  {slaSummary.compliance_percentage}%
                </div>
              </div>
            </div>

            {/* Compliance Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-slate-700)' }}>Enterprise SLA Compliance Target: 90%</span>
                <span style={{ fontWeight: 700, color: slaSummary.compliance_percentage >= 90 ? '#16a34a' : '#d97706' }}>
                  {slaSummary.compliance_percentage}% Achieved
                </span>
              </div>
              <div style={{ height: 10, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, slaSummary.compliance_percentage)}%`,
                    backgroundColor: slaSummary.compliance_percentage >= 90 ? '#16a34a' : slaSummary.compliance_percentage >= 75 ? '#d97706' : '#dc2626',
                    borderRadius: 6,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
            Loading SLA compliance statistics...
          </div>
        )}

        {/* Department-wise SLA Performance Table */}
        {departmentSlaList.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-800)', marginBottom: 10 }}>
              Department-Wise SLA Performance
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: 'var(--color-slate-500)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Department</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Eligible Tickets</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Within SLA</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Breached</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600 }}>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentSlaList.map((ds: DepartmentSlaPerformance) => {
                    const comp = ds.compliance_percentage;
                    const badgeColor = comp >= 90 ? '#166534' : comp >= 75 ? '#92400e' : '#991b1b';
                    const badgeBg = comp >= 90 ? '#f0fdf4' : comp >= 75 ? '#fffbeb' : '#fef2f2';
                    return (
                      <tr key={ds.department_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                          {ds.department_name}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--color-slate-600)' }}>
                          {ds.total_eligible}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#15803d', fontWeight: 600 }}>
                          {ds.within_sla}
                        </td>
                        <td style={{ padding: '10px 12px', color: ds.breached > 0 ? '#dc2626' : 'var(--color-slate-600)', fontWeight: ds.breached > 0 ? 700 : 400 }}>
                          {ds.breached}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: badgeColor,
                              backgroundColor: badgeBg,
                            }}
                          >
                            {comp}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Department Breakdown & Employee Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Department Volume Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Tickets by Department</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Current ticket distribution across business departments
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/departments')}>
              Manage
            </Button>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {departmentBreakdown.map((dept: { department: string; open: number; total: number }) => (
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

        {/* Employee Workload Card */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Employee Support Workload</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Active load for employees assigned to category queues
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/routing')}>
              Configure Routing
            </Button>
          </div>

          <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
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
                  <EmployeeName
                    name={emp.name}
                    email={emp.email}
                    maxWidth="180px"
                    showEmailSubtitle={true}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 3 }}>
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
                    {emp.activeLoad} Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Recent Tickets Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Tickets Across Company</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              Inspect and triage company-wide support tickets.
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
