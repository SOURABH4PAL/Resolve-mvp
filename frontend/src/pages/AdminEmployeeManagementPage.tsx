import React, { useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { User, Category } from '../types';
import {
  Users,
  Search,
  Building2,
  Shield,
  FolderTree,
  UserCheck,
  CheckCircle2,
  PlusCircle,
} from 'lucide-react';

export const AdminEmployeeManagementPage: React.FC = () => {
  const { employees, responsibilities, categories, tickets, updateCategoryResponsibility } = useTickets();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Edit Responsibility Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<User | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const filteredEmployees = employees.filter(emp => {
    if (searchTerm) {
      const matchName = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEmail = emp.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchId = emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchName && !matchEmail && !matchId) return false;
    }

    if (selectedDept !== 'ALL') {
      const deptName = emp.department?.name;
      if (deptName !== selectedDept) return false;
    }

    return true;
  });

  const handleOpenAssignModal = (emp: User) => {
    setTargetEmployee(emp);
    setSelectedCategoryId(categories[0]?.id || '');
    setModalOpen(true);
  };

  const handleSaveResponsibility = () => {
    if (!targetEmployee || !selectedCategoryId) return;

    // Find if a responsibility entry exists for this category
    const existingResp = responsibilities.find(r => r.category_id === selectedCategoryId);
    const cat = categories.find(c => c.id === selectedCategoryId);

    if (existingResp) {
      updateCategoryResponsibility(
        existingResp.id,
        targetEmployee.id,
        targetEmployee.name,
        targetEmployee.email
      );
    } else if (cat) {
      // Create new link
      updateCategoryResponsibility(
        `resp-${Date.now()}`,
        targetEmployee.id,
        targetEmployee.name,
        targetEmployee.email
      );
    }

    setModalOpen(false);
    setTargetEmployee(null);
  };

  const columns: Column<User>[] = [
    {
      key: 'employee_id',
      header: 'Employee ID',
      width: '130px',
      render: emp => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-600)' }}>
          {emp.employee_id}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Employee & Email',
      render: emp => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{emp.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>{emp.email}</div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      width: '180px',
      render: emp => (
        <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)' }}>
          {emp.department?.name || 'Operations'}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      width: '130px',
      render: () => (
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: '#e0e7ff',
            color: '#3730a3',
          }}
        >
          EMPLOYEE
        </span>
      ),
    },
    {
      key: 'responsibilities',
      header: 'Category Responsibilities',
      render: emp => {
        const empResp = responsibilities
          .filter(r => r.responsible_employee_id === emp.id || r.responsible_employee_email === emp.email)
          .map(r => r.category_name);

        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {empResp.length > 0 ? (
              empResp.map(cat => (
                <span
                  key={cat}
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    color: '#7e22ce',
                  }}
                >
                  {cat}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>None assigned</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'active_tickets',
      header: 'Active Load',
      width: '120px',
      render: emp => {
        const activeCount = tickets.filter(
          t => (t.assigned_to === emp.id || t.assigned_to === emp.employee_id) && t.status !== 'CLOSED' && t.status !== 'RESOLVED'
        ).length;

        return (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              backgroundColor: activeCount > 2 ? '#fee2e2' : '#f1f5f9',
              color: activeCount > 2 ? '#991b1b' : 'var(--color-slate-700)',
            }}
          >
            {activeCount} Tickets
          </span>
        );
      },
    },
    {
      key: 'action',
      header: '',
      width: '160px',
      align: 'right',
      render: emp => (
        <Button
          variant="secondary"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            handleOpenAssignModal(emp);
          }}
        >
          Assign Category
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Management</h1>
          <p className="page-subtitle">
            Manage organization members and assign category support responsibilities to employees.
          </p>
        </div>
      </div>

      {/* Info Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 18px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          fontSize: '0.85rem',
          color: '#1e40af',
        }}
      >
        <Shield size={20} style={{ flexShrink: 0 }} />
        <span>
          <strong>Architecture Rule: ROLE != RESPONSIBILITY</strong>. All internal users hold the standard{' '}
          <strong>EMPLOYEE</strong> role. Support duties are designated by assigning category responsibility to an
          employee without changing their account role.
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
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
              placeholder="Search by employee name, email, or ID..."
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

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
            }}
          >
            <option value="ALL">All Departments</option>
            <option value="IT Support">IT Support</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Finance & Payroll">Finance & Payroll</option>
          </select>
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="card">
        <Table<User>
          columns={columns}
          data={filteredEmployees}
          emptyMessage="No employees found matching filter."
        />
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--color-slate-100)',
            fontSize: '0.825rem',
            color: 'var(--color-slate-500)',
          }}
        >
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Assign Category Responsibility Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Assign Category Responsibility"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveResponsibility}>
              Save Assignment
            </Button>
          </div>
        }
      >
        {targetEmployee && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>Employee</div>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: 2 }}>
                {targetEmployee.name} ({targetEmployee.employee_id})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Department: {targetEmployee.department?.name || 'Operations'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Select Support Category to Assign
              </label>
              <select
                value={selectedCategoryId}
                onChange={e => setSelectedCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.department?.name || 'General'} &gt; {c.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 6 }}>
                New tickets created by any employee under this category will automatically be routed to{' '}
                <strong>{targetEmployee.name}</strong>.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
