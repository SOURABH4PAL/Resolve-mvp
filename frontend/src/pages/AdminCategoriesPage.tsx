import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { EmployeeName } from '../components/common/EmployeeName';
import { Category, Subcategory } from '../types';
import { FolderTree, Route, PlusCircle, Search, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { MOCK_SUBCATEGORIES } from '../mock/mockData';

export const AdminCategoriesPage: React.FC = () => {
  const { categories, departments, responsibilities, createCategory, createSubcategory, fetchMasterData } = useTickets();
  const navigate = useNavigate();

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const pageSize = 10;

  // Create Category Modal State
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDeptId, setNewCatDeptId] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catError, setCatError] = useState<string | null>(null);
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Create Subcategory Modal State
  const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCatId, setNewSubCatId] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [subError, setSubError] = useState<string | null>(null);
  const [isCreatingSub, setIsCreatingSub] = useState(false);

  // Status feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch real subcategories from backend
  const fetchSubcategories = async () => {
    try {
      const data = await api.get<Subcategory[]>('/subcategories');
      if (Array.isArray(data)) {
        setSubcategories(data);
      }
    } catch {
      setSubcategories(MOCK_SUBCATEGORIES);
    }
  };

  useEffect(() => {
    fetchSubcategories();
  }, []);

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

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
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
  }, [categories, searchTerm, selectedDept, subcategories, departments]);

  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
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
  }, [filteredCategories, sortBy, sortOrder, departments]);

  const totalPages = Math.ceil(sortedCategories.length / pageSize) || 1;
  const paginatedCategories = useMemo(() => {
    return sortedCategories.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [sortedCategories, currentPage, pageSize]);

  // Handle Category Creation
  const handleOpenCreateCategory = () => {
    setNewCatName('');
    setNewCatDeptId(departments[0]?.id || '');
    setNewCatDesc('');
    setCatError(null);
    setCreateCategoryOpen(true);
  };

  const handleConfirmCreateCategory = async () => {
    if (!newCatName.trim()) {
      setCatError('Category name is required.');
      return;
    }
    if (!newCatDeptId) {
      setCatError('Target department is required.');
      return;
    }

    // Duplicate check
    const duplicate = categories.some(
      c => c.department_id === newCatDeptId && c.name.toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (duplicate) {
      setCatError('A category with this name already exists in the selected department.');
      return;
    }

    setIsCreatingCat(true);
    setCatError(null);
    try {
      await createCategory(newCatDeptId, newCatName.trim(), newCatDesc.trim() || undefined);
      setFeedback({ type: 'success', text: `Category "${newCatName.trim()}" created successfully.` });
      setCreateCategoryOpen(false);
      await fetchMasterData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create category.';
      setCatError(msg);
    } finally {
      setIsCreatingCat(false);
    }
  };

  // Handle Subcategory Creation
  const handleOpenCreateSubcategory = (preselectedCatId?: string) => {
    setNewSubName('');
    setNewSubCatId(preselectedCatId || categories[0]?.id || '');
    setNewSubDesc('');
    setSubError(null);
    setCreateSubcategoryOpen(true);
  };

  const handleConfirmCreateSubcategory = async () => {
    if (!newSubName.trim()) {
      setSubError('Subcategory name is required.');
      return;
    }
    if (!newSubCatId) {
      setSubError('Parent category is required.');
      return;
    }

    // Duplicate check
    const duplicate = subcategories.some(
      s => s.category_id === newSubCatId && s.name.toLowerCase() === newSubName.trim().toLowerCase()
    );
    if (duplicate) {
      setSubError('A subcategory with this name already exists under the selected parent category.');
      return;
    }

    setIsCreatingSub(true);
    setSubError(null);
    try {
      await createSubcategory(newSubCatId, newSubName.trim(), newSubDesc.trim() || undefined);
      setFeedback({ type: 'success', text: `Subcategory "${newSubName.trim()}" created successfully.` });
      setCreateSubcategoryOpen(false);
      await fetchSubcategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create subcategory.';
      setSubError(msg);
    } finally {
      setIsCreatingSub(false);
    }
  };

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
      width: '210px',
      render: cat => {
        const resp = responsibilities.find(
          r => r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase()
        );
        return (
          <div>
            {resp ? (
              <EmployeeName
                name={resp.responsible_employee_name}
                email={resp.responsible_employee_email}
                maxWidth="180px"
                showEmailSubtitle={true}
              />
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
        const subs = subcategories.filter(s => s.category_id === cat.id);
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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
                    border: '1px solid #e2e8f0',
                  }}
                  title={s.description || s.name}
                >
                  {s.name}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>None registered</span>
            )}
            <button
              onClick={() => handleOpenCreateSubcategory(cat.id)}
              style={{
                background: 'none',
                border: '1px dashed var(--color-slate-300)',
                borderRadius: 4,
                padding: '1px 6px',
                fontSize: '0.7rem',
                color: 'var(--color-primary-600)',
                cursor: 'pointer',
              }}
              title="Add a new subcategory under this category"
            >
              + Add Subcategory
            </button>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
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
            Manage support taxonomies, create service categories and subcategories, and verify routing ownership.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            leftIcon={<Layers size={16} />}
            onClick={() => handleOpenCreateSubcategory()}
          >
            Create Subcategory
          </Button>
          <Button
            variant="primary"
            leftIcon={<PlusCircle size={16} />}
            onClick={handleOpenCreateCategory}
          >
            Create Category
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#166534' : '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
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

      {/* Create Category Modal */}
      <Modal
        isOpen={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        title="Create Service Category"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setCreateCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isCreatingCat}
              onClick={handleConfirmCreateCategory}
            >
              Create Category
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {catError && (
            <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.8rem' }}>
              {catError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Category Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="E.g., Hardware Support, Payroll Discrepancy..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Target Department <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={newCatDeptId}
              onChange={e => setNewCatDeptId(e.target.value)}
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

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Scope and purpose of this issue category..."
              value={newCatDesc}
              onChange={e => setNewCatDesc(e.target.value)}
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
          </div>
        </div>
      </Modal>

      {/* Create Subcategory Modal */}
      <Modal
        isOpen={createSubcategoryOpen}
        onClose={() => setCreateSubcategoryOpen(false)}
        title="Create Subcategory"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setCreateSubcategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isCreatingSub}
              onClick={handleConfirmCreateSubcategory}
            >
              Create Subcategory
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {subError && (
            <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.8rem' }}>
              {subError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Parent Category <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={newSubCatId}
              onChange={e => setNewSubCatId(e.target.value)}
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
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Subcategory Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="E.g., Laptop Screen, VPN Access, Tax Deduction..."
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Specific details about this subcategory..."
              value={newSubDesc}
              onChange={e => setNewSubDesc(e.target.value)}
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
          </div>
        </div>
      </Modal>
    </div>
  );
};
