import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Category } from '../types';
import { FolderTree, Route, UserCheck, CheckCircle2, Search } from 'lucide-react';
import { MOCK_SUBCATEGORIES } from '../mock/mockData';

export const AdminCategoriesPage: React.FC = () => {
  const { categories, departments, responsibilities } = useTickets();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const pageSize = 10;

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
      // Also match child subcategories
      const matchSub = MOCK_SUBCATEGORIES.some(
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
      width: '220px',
      render: cat => {
        const resp = responsibilities.find(
          r => r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase()
        );
        return (
          <div>
            {resp ? (
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                  {resp.responsible_employee_name}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                  {resp.responsible_employee_email}
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Unassigned</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'subcategories',
      header: 'Subcategories',
      render: cat => {
        const subs = MOCK_SUBCATEGORIES.filter(s => s.category_id === cat.id);
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
      header: '',
      width: '140px',
      align: 'right',
      render: () => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/routing')}
        >
          Configure Routing
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories &amp; Subcategories</h1>
          <p className="page-subtitle">
            Manage support taxonomies and verify employee assignment mapping.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Route size={16} />}
          onClick={() => navigate('/admin/routing')}
        >
          Responsibility Matrix
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
    </div>
  );
};
