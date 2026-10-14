import React, { useState, useEffect, useCallback } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { User, Category, PaginatedResponse } from '../types';
import { api } from '../api/client';
import {
  Users,
  Search,
  Building2,
  Shield,
  FolderTree,
  UserCheck,
  CheckCircle2,
  PlusCircle,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export const AdminEmployeeManagementPage: React.FC = () => {
  const {
    employees,
    departments,
    responsibilities,
    categories,
    tickets,
    updateCategoryResponsibility,
    createEmployee,
    updateEmployee,
    deleteEmployee,
  } = useTickets();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const pageSize = 10;

  const [employeesData, setEmployeesData] = useState<User[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Notification banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Responsibility Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<User | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Create / Edit Employee Modal
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [empId, setEmpId] = useState('');
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empDeptId, setEmpDeptId] = useState('');
  const [empRole, setEmpRole] = useState<'EMPLOYEE' | 'SUPER_ADMIN'>('EMPLOYEE');
  const [empIsActive, setEmpIsActive] = useState(true);

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<User | null>(null);

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

  const fetchPaginatedEmployees = useCallback(async () => {
    setIsLoadingEmployees(true);
    try {
      const params = new URLSearchParams();
      params.append('envelope', 'true');
      params.append('page', String(currentPage));
      params.append('page_size', String(pageSize));
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (selectedDept !== 'ALL') {
        const foundDept = departments.find(d => d.name === selectedDept || d.id === selectedDept);
        if (foundDept) {
          params.append('department_id', foundDept.id);
        }
      }
      if (sortBy) {
        const validSort = ['name', 'email', 'employee_id'].includes(sortBy) ? sortBy : 'name';
        params.append('sort_by', validSort);
        params.append('sort_order', sortOrder);
      }

      const res = await api.get<PaginatedResponse<User>>(`/users?${params.toString()}`);
      if (res && Array.isArray(res.items)) {
        setEmployeesData(res.items);
        setTotalRecords(res.total);
        setTotalPages(res.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch paginated employees:', err);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [currentPage, pageSize, searchTerm, selectedDept, sortBy, sortOrder, departments]);

  useEffect(() => {
    fetchPaginatedEmployees();
  }, [fetchPaginatedEmployees]);

  const handleOpenCreateEmployee = () => {
    setEditingEmployee(null);
    setEmpId(`DLQ-EMP-${String(employees.length + 1).padStart(3, '0')}`);
    setEmpName('');
    setEmpEmail('');
    setEmpPassword('Password123!');
    setEmpDeptId(departments[0]?.id || '');
    setEmpRole('EMPLOYEE');
    setEmpIsActive(true);
    setErrorMsg('');
    setEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: User) => {
    setEditingEmployee(emp);
    setEmpId(emp.employee_id);
    setEmpName(emp.name);
    setEmpEmail(emp.email);
    setEmpPassword('');
    setEmpDeptId(emp.department_id || '');
    setEmpRole(emp.role);
    setEmpIsActive(emp.is_active);
    setErrorMsg('');
    setEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empId.trim()) {
      setErrorMsg('Name, email, and employee ID are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, {
          name: empName.trim(),
          email: empEmail.trim(),
          employee_id: empId.trim(),
          department_id: empDeptId || undefined,
          role: empRole,
          is_active: empIsActive,
          password: empPassword.trim() || undefined,
        });
        setSuccessMsg(`Employee '${empName}' updated successfully!`);
      } else {
        await createEmployee({
          name: empName.trim(),
          email: empEmail.trim(),
          employee_id: empId.trim(),
          department_id: empDeptId || undefined,
          role: empRole,
          password: empPassword.trim() || 'Password123!',
        });
        setSuccessMsg(`Employee '${empName}' created successfully!`);
      }
      setEmployeeModalOpen(false);
      fetchPaginatedEmployees();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (emp: User) => {
    setEmpToDelete(emp);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!empToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteEmployee(empToDelete.id);
      setSuccessMsg(`Employee '${empToDelete.name}' removed or deactivated.`);
      setDeleteModalOpen(false);
      fetchPaginatedEmployees();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignModal = (emp: User) => {
    setTargetEmployee(emp);
    setSelectedCategoryId(categories[0]?.id || '');
    setAssignModalOpen(true);
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

    setAssignModalOpen(false);
    setTargetEmployee(null);
    setSuccessMsg(`Assigned responsibility to ${targetEmployee.name}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const columns: Column<User>[] = [
    {
      key: 'employee_id',
      header: 'Employee ID',
      width: '120px',
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
      sortable: true,
      render: emp => {
        const dept = departments.find(d => d.id === emp.department_id);
        const deptName = dept?.name || emp.department?.name || 'Not assigned';
        return (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)' }}>
            {deptName}
          </span>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      width: '110px',
      render: emp => (
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: emp.role === 'SUPER_ADMIN' ? '#fef3c7' : '#e0e7ff',
            color: emp.role === 'SUPER_ADMIN' ? '#92400e' : '#3730a3',
          }}
        >
          {emp.role}
        </span>
      ),
    },
    {
      key: 'responsibilities',
      header: 'Support Responsibilities',
      render: emp => {
        const empResp = responsibilities
          .filter(r => r.responsible_employee_id === emp.id || r.responsible_employee_email === emp.email)
          .map(r => (r.subcategory_name ? `${r.category_name} (${r.subcategory_name})` : r.category_name));

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
      key: 'is_active',
      header: 'Status',
      width: '90px',
      render: emp => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: emp.is_active ? '#ecfdf5' : '#f1f5f9',
            color: emp.is_active ? '#065f46' : '#64748b',
          }}
        >
          {emp.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Actions',
      width: '200px',
      align: 'right',
      render: emp => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              handleOpenAssignModal(emp);
            }}
            style={{ padding: '4px 6px', fontSize: '0.75rem' }}
            title="Assign category routing"
          >
            Assign
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              handleOpenEditEmployee(emp);
            }}
            style={{ padding: '4px 6px' }}
            title="Edit Employee"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              handleOpenDelete(emp);
            }}
            style={{ padding: '4px 6px', color: '#ef4444' }}
            title="Delete Employee"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Employee & Team Management</h1>
          <p className="page-subtitle">
            Manage organization members, onboard team interns, and configure category support assignments.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreateEmployee}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={16} />
          <span>Add Employee</span>
        </Button>
      </div>

      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Info Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          fontSize: '0.85rem',
          color: '#1e40af',
        }}
      >
        <Shield size={20} style={{ flexShrink: 0 }} />
        <span>
          <strong>Role & Responsibility Routing:</strong> Internal employees and interns hold the{' '}
          <strong>EMPLOYEE</strong> role. Support responsibilities route incoming category tickets to their dashboard.
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
              placeholder="Search by name, email, or employee ID..."
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
              padding: '9px 14px',
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

          {(searchTerm || selectedDept !== 'ALL') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedDept('ALL');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="card">
        <Table<User>
          columns={columns}
          data={employeesData}
          emptyMessage={isLoadingEmployees ? "Loading employees from server..." : "No employees found matching filter."}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage,
            totalPages,
            totalRecords,
            pageSize,
            onPageChange: setCurrentPage,
          }}
        />
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-slate-100)', fontSize: '0.825rem', color: 'var(--color-slate-500)' }}>
          Showing page {currentPage} of {totalPages} ({totalRecords} total active organization members)
        </div>
      </div>

      {/* Create / Edit Employee Modal */}
      {employeeModalOpen && (
        <Modal
          isOpen={employeeModalOpen}
          onClose={() => setEmployeeModalOpen(false)}
          title={editingEmployee ? 'Edit Employee / Team Member' : 'Add New Employee / Team Member'}
        >
          <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 6,
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Aditya Yadav"
                  value={empName}
                  onChange={e => setEmpName(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  Employee ID *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. DLQ-INT-001"
                  value={empId}
                  onChange={e => setEmpId(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Work Email *
              </label>
              <input
                type="email"
                className="input"
                placeholder="e.g. aditya.yadav@dailoqa.com"
                value={empEmail}
                onChange={e => setEmpEmail(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Department
              </label>
              <select
                value={empDeptId}
                onChange={e => setEmpDeptId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="">-- No Department Assigned --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  System Role
                </label>
                <select
                  value={empRole}
                  onChange={e => setEmpRole(e.target.value as 'EMPLOYEE' | 'SUPER_ADMIN')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="EMPLOYEE">EMPLOYEE (Standard / Intern)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  {editingEmployee ? 'Reset Password (optional)' : 'Password *'}
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder={editingEmployee ? 'Leave empty to keep current' : 'e.g. Password123!'}
                  value={empPassword}
                  onChange={e => setEmpPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {editingEmployee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="empActiveStatus"
                  checked={empIsActive}
                  onChange={e => setEmpIsActive(e.target.checked)}
                />
                <label htmlFor="empActiveStatus" style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)', cursor: 'pointer' }}>
                  Account is active
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button type="button" variant="ghost" onClick={() => setEmployeeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete / Deactivate Confirmation Modal */}
      {deleteModalOpen && empToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete / Deactivate Employee"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{empToDelete.name}</strong> ({empToDelete.email})?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
              If this member has associated ticket records or activity, the account will be safely deactivated rather than deleted to ensure history preservation.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              >
                {isSubmitting ? 'Processing...' : 'Confirm Remove'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Category Responsibility Modal */}
      {assignModalOpen && (
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Category Responsibility"
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
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
                  {targetEmployee.email}
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
                  {categories.map(c => {
                    const dept = departments.find(d => d.id === c.department_id);
                    return (
                      <option key={c.id} value={c.id}>
                        {dept?.name || c.department?.name || 'General'} &gt; {c.name}
                      </option>
                    );
                  })}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 6 }}>
                  New tickets created under this category will automatically be routed to{' '}
                  <strong>{targetEmployee.name}</strong>.
                </p>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
