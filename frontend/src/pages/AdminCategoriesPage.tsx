import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Category, CategoryResponsibility } from '../types';
import { Route, UserMinus, UserPlus, RefreshCw, Search } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const {
    categories,
    departments,
    subcategories,
    responsibilities,
    employees,
    updateCategoryResponsibility,
    removeCategoryResponsibility,
  } = useTickets();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedResp, setSelectedResp] = useState<CategoryResponsibility | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const pageSize = 10;

  const handleOpenAssignModal = (cat: Category, resp?: CategoryResponsibility) => {
    setSelectedCategory(cat);
    setSelectedResp(resp || null);
    setSelectedEmployeeId(resp?.responsible_employee_id || employees[0]?.id || '');
    setModalOpen(true);
  };

  const handleRemoveEmployee = (cat: Category, resp?: CategoryResponsibility) => {
    if (window.confirm(`Are you sure you want to remove the assigned employee for ${cat.name}?`)) {
      if (resp) {
        removeCategoryResponsibility(resp.id);
      } else {
        removeCategoryResponsibility(cat.id);
      }
    }
  };

  const handleSaveAssignment = () => {
    if (!selectedCategory || !selectedEmployeeId) return;

    const emp = employees.find(e => e.id === selectedEmployeeId || e.employee_id === selectedEmployeeId);
    if (!emp) return;

    const dept = departments.find(d => d.id === selectedCategory.department_id) || selectedCategory.department;
    const respId = selectedResp?.id || `resp-${selectedCategory.id}`;

    updateCategoryResponsibility(
      respId,
      emp.id,
      emp.name,
      emp.email,
      {
        department_id: dept?.id || '',
        department_name: dept?.name || '',
        category_id: selectedCategory.id,
        category_name: selectedCategory.name,
      }
    );

    setModalOpen(false);
    setSelectedCategory(null);
    setSelectedResp(null);
  };

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

  const filteredCategories = categories.filter(cat => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = cat.name.toLowerCase().includes(term);
      const matchDesc = (cat.description || '').toLowerCase().includes(term);
      const matchSub = subcategories.some(
        s => s.category_id === cat.id && s.name.toLowerCase().includes(term)
      );
      if (!matchName && !matchDesc && !matchSub) return false;
    }

    if (selectedDept !== 'ALL') {
      const dept = departments.find(d => d.id === cat.department_id) || cat.department;
      if (dept?.name !== selectedDept && cat.department_id !== selectedDept) return false;
    }

    return true;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let valA = '';
    let valB = '';
    if (sortBy === 'department') {
      const deptA = departments.find(d => d.id === a.department_id) || a.department;
      const deptB = departments.find(d => d.id === b.department_id) || b.department;
      valA = deptA?.name || '';
      valB = deptB?.name || '';
    } else {
      valA = a.name || '';
      valB = b.name || '';
    }
    const cmp = valA.localeCompare(valB);
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedCategories.length / pageSize) || 1;
  const paginatedCategories = sortedCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      render: cat => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{cat.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
            {cat.description || 'General category'}
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      width: '180px',
      sortable: true,
      render: cat => {
        const dept = departments.find(d => d.id === cat.department_id) || cat.department;
        return (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)', fontWeight: 500 }}>
            {dept?.name || 'Operations'}
          </span>
        );
      },
    },
    {
      key: 'responsible_employee',
      header: 'Responsible Employee',
      width: '240px',
      render: cat => {
        const resp = responsibilities.find(
          r => r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase()
        );
        const hasEmployee = resp && resp.responsible_employee_name && resp.responsible_employee_name.trim() !== '';

        return (
          <div>
            {hasEmployee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {resp.responsible_employee_name[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                    {resp.responsible_employee_name}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                    {resp.responsible_employee_email}
                  </div>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: 4, border: '1px solid #fecaca' }}>
                Unassigned (No Employee)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'subcategories',
      header: 'Subcategories',
      render: cat => {
        const subs = subcategories.filter(s => s.category_id === cat.id);
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {subs.length > 0 ? (
              subs.map(s => (
                <span
                  key={s.id}
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: '#f1f5f9',
                    color: 'var(--color-slate-700)',
                  }}
                >
                  {s.name}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>Direct category</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Employee Management',
      width: '220px',
      align: 'right',
      render: cat => {
        const resp = responsibilities.find(
          r => r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase()
        );
        const hasEmployee = resp && resp.responsible_employee_name && resp.responsible_employee_name.trim() !== '';

        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            {hasEmployee ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw size={13} />}
                  onClick={() => handleOpenAssignModal(cat, resp)}
                >
                  Change
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  style={{ color: '#dc2626', borderColor: '#fecaca' }}
                  leftIcon={<UserMinus size={13} />}
                  onClick={() => handleRemoveEmployee(cat, resp)}
                >
                  Remove
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserPlus size={13} />}
                onClick={() => handleOpenAssignModal(cat, resp)}
              >
                Add Employee
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories &amp; Employee Assignment</h1>
          <p className="page-subtitle">
            Manage support taxonomies, add new employees, or remove departed employees from category routing.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Route size={16} />}
          onClick={() => navigate('/admin/routing')}
        >
          Routing Matrix View
        </Button>
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
              placeholder="Search category or subcategory name..."
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

      <div className="card">
        <Table<Category>
          columns={columns}
          data={paginatedCategories}
          emptyMessage="No categories matching criteria."
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          pagination={{
            currentPage,
            totalPages,
            totalRecords: sortedCategories.length,
            pageSize,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      {/* Change / Add Employee Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedResp && selectedResp.responsible_employee_name ? `Change Employee for ${selectedCategory?.name}` : `Assign Employee to ${selectedCategory?.name}`}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveAssignment}>
              Save Assignment
            </Button>
          </div>
        }
      >
        {selectedCategory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>Selected Category</div>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: 2 }}>
                {selectedCategory.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Current Assignee: <strong>{selectedResp?.responsible_employee_name || 'Unassigned'}</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Select Employee *
              </label>
              <select
                value={selectedEmployeeId}
                onChange={e => setSelectedEmployeeId(e.target.value)}
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
                    {emp.name} ({emp.email}) — Dept: {emp.department?.name || 'Operations'}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 6 }}>
                All new tickets submitted under <strong>{selectedCategory.name}</strong> will be routed directly to this employee.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
