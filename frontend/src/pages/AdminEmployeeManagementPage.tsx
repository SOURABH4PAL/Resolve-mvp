import React, { useState, useMemo } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { EmployeeName } from '../components/common/EmployeeName';
import { User, Category, Department } from '../types';
import {
  Users,
  Search,
  Building2,
  Shield,
  FolderTree,
  UserCheck,
  CheckCircle2,
  PlusCircle,
  CheckSquare,
  Square,
  AlertCircle,
  X,
} from 'lucide-react';

export const AdminEmployeeManagementPage: React.FC = () => {
  const {
    employees,
    departments,
    responsibilities,
    categories,
    tickets,
    updateCategoryResponsibility,
    bulkAssignDepartment,
    fetchMasterData,
  } = useTickets();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const pageSize = 10;

  // Bulk Selection State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [bulkDeptModalOpen, setBulkDeptModalOpen] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Responsibility Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<User | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    setCurrentPage(1);
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchEmail = emp.email.toLowerCase().includes(q);
        const matchId = (emp.employee_id || '').toLowerCase().includes(q);
        const matchDept = (emp.department?.name || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchId && !matchDept) return false;
      }

      if (selectedDept !== 'ALL') {
        const deptName = emp.department?.name;
        const deptId = emp.department_id;
        if (deptName !== selectedDept && deptId !== selectedDept) return false;
      }

      return true;
    });
  }, [employees, searchTerm, selectedDept]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortBy === 'employee_id') {
        valA = a.employee_id || '';
        valB = b.employee_id || '';
      } else if (sortBy === 'department') {
        valA = a.department?.name || '';
        valB = b.department?.name || '';
      } else {
        valA = a.name || '';
        valB = b.name || '';
      }
      const cmp = valA.localeCompare(valB);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredEmployees, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    return sortedEmployees.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedEmployees, currentPage, pageSize]);

  // Bulk Selection Handlers
  const isAllPageSelected = useMemo(() => {
    if (paginatedEmployees.length === 0) return false;
    return paginatedEmployees.every(emp => selectedEmployeeIds.includes(emp.id));
  }, [paginatedEmployees, selectedEmployeeIds]);

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(paginatedEmployees.map(e => e.id));
      setSelectedEmployeeIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = paginatedEmployees.map(e => e.id);
      setSelectedEmployeeIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectEmployee = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedEmployeeIds([]);
  };

  const handleOpenBulkDeptModal = () => {
    if (selectedEmployeeIds.length === 0) return;
    setTargetDeptId(departments[0]?.id || '');
    setBulkDeptModalOpen(true);
  };

  const handleConfirmBulkDeptAssign = async () => {
    if (!targetDeptId || selectedEmployeeIds.length === 0) return;
    setIsBulkAssigning(true);
    setFeedbackMessage(null);
    try {
      const result = await bulkAssignDepartment(selectedEmployeeIds, targetDeptId);
      const targetDept = departments.find(d => d.id === targetDeptId);
      setFeedbackMessage({
        type: 'success',
        text: `Successfully assigned ${result.updated_count} employee(s) to ${targetDept?.name || 'the department'}.`,
      });
      setSelectedEmployeeIds([]);
      setBulkDeptModalOpen(false);
      await fetchMasterData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk assignment failed.';
      setFeedbackMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleOpenAssignModal = (emp: User) => {
    setTargetEmployee(emp);
    setSelectedCategoryId(categories[0]?.id || '');
    setModalOpen(true);
  };

  const handleSaveResponsibility = () => {
    if (!targetEmployee || !selectedCategoryId) return;

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
      key: 'select',
      header: (
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleToggleSelectAllPage}>
          <input
            type="checkbox"
            checked={isAllPageSelected}
            onChange={() => {}}
            style={{ cursor: 'pointer', width: 16, height: 16 }}
            title="Select / deselect all on this page"
          />
        </div>
      ),
      width: '45px',
      render: emp => {
        const isSelected = selectedEmployeeIds.includes(emp.id);
        return (
          <div onClick={e => handleToggleSelectEmployee(emp.id, e)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              style={{ cursor: 'pointer', width: 16, height: 16 }}
            />
          </div>
        );
      },
    },
    {
      key: 'employee_id',
      header: 'Employee ID',
      width: '130px',
      sortable: true,
      render: emp => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-600)' }}>
          {emp.employee_id}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Employee & Email',
      sortable: true,
      render: emp => (
        <EmployeeName
          name={emp.name}
          email={emp.email}
          maxWidth="200px"
          showEmailSubtitle={true}
        />
      ),
    },
    {
      key: 'department',
      header: 'Department',
      width: '170px',
      sortable: true,
      render: emp => (
        <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-800)', fontWeight: 500 }}>
          {emp.department?.name || 'Operations'}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'System Role',
      width: '120px',
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
      width: '110px',
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
      header: 'Actions',
      width: '150px',
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
            Manage organization members, assign department affiliations, and configure category support responsibilities.
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
          <strong>EMPLOYEE</strong> role. Support duties and department affiliations are designated by administrative assignment without changing their system account role.
        </span>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: feedbackMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedbackMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: feedbackMessage.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedEmployeeIds.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            border: '2px solid var(--color-primary-500)',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                backgroundColor: 'var(--color-primary-600)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                padding: '3px 10px',
                borderRadius: 12,
              }}
            >
              {selectedEmployeeIds.length} Selected
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)', fontWeight: 500 }}>
              Bulk actions for selected organization members
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearSelection}
            >
              Clear Selection
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Building2 size={14} />}
              onClick={handleOpenBulkDeptModal}
            >
              Assign to Department
            </Button>
          </div>
        </div>
      )}

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
                transform: 'translateY(-50)',
                color: 'var(--color-slate-400)',
              }}
            />
            <input
              type="text"
              placeholder="Search by employee name, email, ID, or department..."
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

          <select
            value={selectedDept}
            onChange={e => handleDeptChange(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-200)',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
              minWidth: 200,
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card">
        <Table<User>
          columns={columns}
          data={paginatedEmployees}
          emptyMessage="No employees found matching the filter criteria."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage,
            totalPages,
            totalRecords: sortedEmployees.length,
            pageSize,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      {/* Bulk Assign Department Modal */}
      <Modal
        isOpen={bulkDeptModalOpen}
        onClose={() => setBulkDeptModalOpen(false)}
        title={`Bulk Assign Department (${selectedEmployeeIds.length} Employees)`}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setBulkDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isBulkAssigning}
              onClick={handleConfirmBulkDeptAssign}
            >
              Confirm Department Assignment
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)' }}>
            You are about to reassign <strong>{selectedEmployeeIds.length}</strong> employees to a new department in a single batch operation.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Select Destination Department <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={targetDeptId}
              onChange={e => setTargetDeptId(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                backgroundColor: '#ffffff',
              }}
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: 'var(--color-slate-600)' }}>
            Target department members will be eligible to handle department tickets and receive auto-routed category assignments.
          </div>
        </div>
      </Modal>

      {/* Edit Category Responsibility Modal */}
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
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>Selected Member</div>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: 2 }}>
                {targetEmployee.name} ({targetEmployee.employee_id})
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                {targetEmployee.email} • {targetEmployee.department?.name || 'Operations'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
                Target Category
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
                    {c.department?.name || 'Department'} &gt; {c.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 6 }}>
                New tickets created under this category will automatically be routed to this employee.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
