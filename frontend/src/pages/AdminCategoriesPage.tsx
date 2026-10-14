import React, { useState, useEffect, useCallback } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Category, Subcategory, CategoryResponsibility, User, PaginatedResponse } from '../types';
import { EmployeeAutocomplete } from '../components/common/EmployeeAutocomplete';
import { api } from '../api/client';
import {
  FolderTree,
  Users,
  Route,
  UserMinus,
  UserPlus,
  RefreshCw,
  Search,
  Building2,
  GitFork,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  const {
    categories,
    departments,
    subcategories,
    responsibilities,
    employees,
    updateCategoryResponsibility,
    removeCategoryResponsibility,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useTickets();

  // Active view switcher: 'categories' | 'employee_directory' | 'routing_matrix'
  const [activeTab, setActiveTab] = useState<'categories' | 'employee_directory' | 'routing_matrix'>('categories');

  // ==========================================
  // SECTION 1: Categories & Taxonomies State
  // ==========================================
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [catSelectedDept, setCatSelectedDept] = useState('ALL');
  const [catCurrentPage, setCatCurrentPage] = useState(1);
  const [catSortBy, setCatSortBy] = useState('name');
  const [catSortOrder, setCatSortOrder] = useState<'asc' | 'desc'>('asc');
  const catPageSize = 10;

  // Modals for Category / Subcategory assignment
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [selectedResp, setSelectedResp] = useState<CategoryResponsibility | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  // Subcategory Add/Edit Modal
  const [subcatModalOpen, setSubcatModalOpen] = useState(false);
  const [editingSubcat, setEditingSubcat] = useState<Subcategory | null>(null);
  const [subcatName, setSubcatName] = useState('');
  const [subcatDesc, setSubcatDesc] = useState('');
  const [isSubmittingSubcat, setIsSubmittingSubcat] = useState(false);

  // ==========================================
  // SECTION 2: Employee Responsibilities Directory (STRICT 5 PER PAGE SERVER-SIDE)
  // ==========================================
  const [empPage, setEmpPage] = useState(1);
  const empPageSize = 5; // Strict rule: only this employee list uses 5
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('ALL');
  const [empDirectoryUsers, setEmpDirectoryUsers] = useState<User[]>([]);
  const [empTotalRecords, setEmpTotalRecords] = useState(0);
  const [empTotalPages, setEmpTotalPages] = useState(1);
  const [isLoadingEmpDirectory, setIsLoadingEmpDirectory] = useState(false);
  const [empDirectoryError, setEmpDirectoryError] = useState<string | null>(null);

  // Modal to assign responsibility from Employee Directory view
  const [directAssignModalOpen, setDirectAssignModalOpen] = useState(false);
  const [targetEmployeeForAssignment, setTargetEmployeeForAssignment] = useState<User | null>(null);
  const [directAssignCatId, setDirectAssignCatId] = useState('');
  const [directAssignSubId, setDirectAssignSubId] = useState('');

  // Fetch 5 employees per page from FastAPI
  const fetchPaginatedEmployees = useCallback(async () => {
    setIsLoadingEmpDirectory(true);
    setEmpDirectoryError(null);
    try {
      const params = new URLSearchParams();
      params.append('envelope', 'true');
      params.append('page', String(empPage));
      params.append('page_size', String(empPageSize));
      if (empSearch.trim()) {
        params.append('search', empSearch.trim());
      }
      if (empDeptFilter !== 'ALL') {
        const foundDept = departments.find(d => d.name === empDeptFilter || d.id === empDeptFilter);
        if (foundDept) {
          params.append('department_id', foundDept.id);
        }
      }
      params.append('sort_by', 'name');
      params.append('sort_order', 'asc');

      const res = await api.get<PaginatedResponse<User>>(`/users?${params.toString()}`);
      if (res && Array.isArray(res.items)) {
        setEmpDirectoryUsers(res.items);
        setEmpTotalRecords(res.total);
        setEmpTotalPages(res.total_pages || Math.ceil(res.total / empPageSize) || 1);
      } else if (Array.isArray(res)) {
        // Fallback if not enveloped
        setEmpDirectoryUsers((res as User[]).slice(0, empPageSize));
        setEmpTotalRecords((res as User[]).length);
        setEmpTotalPages(Math.ceil((res as User[]).length / empPageSize) || 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch employee list from server.';
      setEmpDirectoryError(msg);
    } finally {
      setIsLoadingEmpDirectory(false);
    }
  }, [empPage, empPageSize, empSearch, empDeptFilter, departments]);

  useEffect(() => {
    if (activeTab === 'employee_directory') {
      fetchPaginatedEmployees();
    }
  }, [activeTab, fetchPaginatedEmployees]);

  // Handle Category Assign Modal Open
  const handleOpenAssignModal = (cat: Category, resp?: CategoryResponsibility) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(null);
    setSelectedResp(resp || null);
    setSelectedEmployeeId(resp?.responsible_employee_id || employees[0]?.id || '');
    setAssignModalOpen(true);
  };

  // Handle Subcategory Assign Modal Open
  const handleOpenSubcategoryAssignModal = (cat: Category, sub: Subcategory, resp?: CategoryResponsibility) => {
    setSelectedCategory(cat);
    setSelectedSubcategory(sub);
    setSelectedResp(resp || null);
    setSelectedEmployeeId(resp?.responsible_employee_id || employees[0]?.id || '');
    setAssignModalOpen(true);
  };

  // Remove Employee Responsibility
  const handleRemoveEmployee = (cat: Category, resp?: CategoryResponsibility) => {
    if (window.confirm(`Are you sure you want to remove the assigned employee for ${cat.name}?`)) {
      if (resp) {
        removeCategoryResponsibility(resp.id);
      } else {
        removeCategoryResponsibility(cat.id);
      }
    }
  };

  // Save Assignment from Category View
  const handleSaveAssignment = () => {
    if (!selectedCategory || !selectedEmployeeId) return;

    const emp = employees.find(e => e.id === selectedEmployeeId || e.employee_id === selectedEmployeeId);
    if (!emp) return;

    const dept = departments.find(d => d.id === selectedCategory.department_id) || selectedCategory.department;

    if (selectedSubcategory) {
      const respId = selectedResp?.id || `resp-sub-${selectedSubcategory.id}`;
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
          subcategory_id: selectedSubcategory.id,
          subcategory_name: selectedSubcategory.name,
        }
      );
    } else {
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
    }

    setAssignModalOpen(false);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedResp(null);
  };

  // Subcategory actions
  const handleOpenAddSubcategory = (cat: Category) => {
    setSelectedCategory(cat);
    setEditingSubcat(null);
    setSubcatName('');
    setSubcatDesc('');
    setSubcatModalOpen(true);
  };

  const handleOpenEditSubcategory = (cat: Category, sub: Subcategory) => {
    setSelectedCategory(cat);
    setEditingSubcat(sub);
    setSubcatName(sub.name);
    setSubcatDesc(sub.description || '');
    setSubcatModalOpen(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !subcatName.trim()) return;

    setIsSubmittingSubcat(true);
    try {
      if (editingSubcat) {
        await updateSubcategory(editingSubcat.id, {
          name: subcatName.trim(),
          description: subcatDesc.trim() || undefined,
        });
      } else {
        await createSubcategory({
          category_id: selectedCategory.id,
          name: subcatName.trim(),
          description: subcatDesc.trim() || undefined,
        });
      }
      setSubcatModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save subcategory';
      alert(msg);
    } finally {
      setIsSubmittingSubcat(false);
    }
  };

  const handleDeleteSubcategory = async (sub: Subcategory) => {
    if (window.confirm(`Are you sure you want to delete subcategory "${sub.name}"?`)) {
      try {
        await deleteSubcategory(sub.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete subcategory';
        alert(msg);
      }
    }
  };

  // Save Direct Assignment from Employee Directory
  const handleSaveDirectAssignment = () => {
    if (!targetEmployeeForAssignment || !directAssignCatId) return;

    const cat = categories.find(c => c.id === directAssignCatId);
    if (!cat) return;

    const dept = departments.find(d => d.id === cat.department_id) || cat.department;
    const sub = directAssignSubId ? subcategories.find(s => s.id === directAssignSubId) : undefined;

    const respId = sub ? `resp-sub-${sub.id}` : `resp-${cat.id}`;
    updateCategoryResponsibility(
      respId,
      targetEmployeeForAssignment.id,
      targetEmployeeForAssignment.name,
      targetEmployeeForAssignment.email,
      {
        department_id: dept?.id || '',
        department_name: dept?.name || '',
        category_id: cat.id,
        category_name: cat.name,
        subcategory_id: sub?.id,
        subcategory_name: sub?.name,
      }
    );

    setDirectAssignModalOpen(false);
    setTargetEmployeeForAssignment(null);
    setDirectAssignCatId('');
    setDirectAssignSubId('');
  };

  // Category Filtering & Sorting
  const filteredCategories = categories.filter(cat => {
    if (catSearchTerm) {
      const term = catSearchTerm.toLowerCase();
      const matchName = cat.name.toLowerCase().includes(term);
      const matchDesc = (cat.description || '').toLowerCase().includes(term);
      const matchSub = subcategories.some(
        s => s.category_id === cat.id && s.name.toLowerCase().includes(term)
      );
      if (!matchName && !matchDesc && !matchSub) return false;
    }

    if (catSelectedDept !== 'ALL') {
      const dept = departments.find(d => d.id === cat.department_id) || cat.department;
      if (dept?.name !== catSelectedDept && cat.department_id !== catSelectedDept) return false;
    }

    return true;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let valA = '';
    let valB = '';
    if (catSortBy === 'department') {
      const deptA = departments.find(d => d.id === a.department_id) || a.department;
      const deptB = departments.find(d => d.id === b.department_id) || b.department;
      valA = deptA?.name || '';
      valB = deptB?.name || '';
    } else {
      valA = a.name || '';
      valB = b.name || '';
    }
    const cmp = valA.localeCompare(valB);
    return catSortOrder === 'asc' ? cmp : -cmp;
  });

  const catTotalPages = Math.ceil(sortedCategories.length / catPageSize) || 1;
  const paginatedCategories = sortedCategories.slice(
    (catCurrentPage - 1) * catPageSize,
    catCurrentPage * catPageSize
  );

  const categoryColumns: Column<Category>[] = [
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
            {dept?.name || 'Not assigned'}
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
          r => !r.subcategory_id && (r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase())
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
      header: 'Subcategories & Assignees',
      render: cat => {
        const subs = subcategories.filter(s => s.category_id === cat.id);
        const catResp = responsibilities.find(
          r => !r.subcategory_id && (r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase())
        );
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {subs.length > 0 ? (
              subs.map(s => {
                const subResp = responsibilities.find(r => r.subcategory_id === s.id);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: 4,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>{s.name}</span>
                      {subResp && subResp.responsible_employee_name ? (
                        <div style={{ fontSize: '0.7rem', color: '#16a34a' }}>
                          Assignee: <strong>{subResp.responsible_employee_name}</strong>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)' }}>
                          Assignee: {catResp?.responsible_employee_name ? `Inherits (${catResp.responsible_employee_name})` : 'Unassigned'}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleOpenSubcategoryAssignModal(cat, s, subResp)}
                        title="Assign Employee to Subcategory"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary-600)',
                          cursor: 'pointer',
                          padding: '1px 4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}
                      >
                        {subResp?.responsible_employee_name ? 'Reassign' : 'Assign'}
                      </button>
                      <button
                        onClick={() => handleOpenEditSubcategory(cat, s)}
                        title="Edit Subcategory"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-slate-600)',
                          cursor: 'pointer',
                          padding: '1px 4px',
                          fontSize: '0.7rem',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubcategory(s)}
                        title="Delete Subcategory"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '1px 4px',
                          fontSize: '0.7rem',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>Direct category</span>
            )}
            <button
              onClick={() => handleOpenAddSubcategory(cat)}
              style={{
                background: 'none',
                border: '1px dashed #cbd5e1',
                borderRadius: 4,
                padding: '3px 8px',
                fontSize: '0.7rem',
                color: 'var(--color-primary-600)',
                cursor: 'pointer',
                textAlign: 'center',
                width: 'fit-content',
                marginTop: 2,
              }}
            >
              + Add Subcategory
            </button>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Employee Management',
      width: '200px',
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
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories &amp; Responsibilities</h1>
          <p className="page-subtitle">
            Consolidated administration of support taxonomies, routing rules, and employee queue assignments.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-slate-100)',
            padding: 3,
            borderRadius: 8,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setActiveTab('categories')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'categories' ? '#ffffff' : 'transparent',
              color: activeTab === 'categories' ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
              boxShadow: activeTab === 'categories' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <FolderTree size={15} />
            Categories &amp; Subs
          </button>
          <button
            onClick={() => {
              setActiveTab('employee_directory');
              setEmpPage(1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'employee_directory' ? '#ffffff' : 'transparent',
              color: activeTab === 'employee_directory' ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
              boxShadow: activeTab === 'employee_directory' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={15} />
            Employee Responsibilities (5/page)
          </button>
          <button
            onClick={() => setActiveTab('routing_matrix')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeTab === 'routing_matrix' ? '#ffffff' : 'transparent',
              color: activeTab === 'routing_matrix' ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
              boxShadow: activeTab === 'routing_matrix' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Route size={15} />
            Routing Matrix View
          </button>
        </div>
      </div>

      {/* =========================================================
          VIEW 1: CATEGORIES & SUBCATEGORIES TAXONOMY
          ========================================================= */}
      {activeTab === 'categories' && (
        <>
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
                  value={catSearchTerm}
                  onChange={e => {
                    setCatSearchTerm(e.target.value);
                    setCatCurrentPage(1);
                  }}
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
                value={catSelectedDept}
                onChange={e => {
                  setCatSelectedDept(e.target.value);
                  setCatCurrentPage(1);
                }}
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

              {(catSearchTerm || catSelectedDept !== 'ALL') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCatSearchTerm('');
                    setCatSelectedDept('ALL');
                    setCatCurrentPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <div className="card">
            <Table<Category>
              columns={categoryColumns}
              data={paginatedCategories}
              emptyMessage="No categories matching criteria."
              sortBy={catSortBy}
              sortOrder={catSortOrder}
              onSort={key => {
                if (catSortBy === key) {
                  setCatSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
                } else {
                  setCatSortBy(key);
                  setCatSortOrder('asc');
                }
                setCatCurrentPage(1);
              }}
              pagination={{
                currentPage: catCurrentPage,
                totalPages: catTotalPages,
                totalRecords: sortedCategories.length,
                pageSize: catPageSize,
                onPageChange: setCatCurrentPage,
              }}
            />
          </div>
        </>
      )}

      {/* =========================================================
          VIEW 2: EMPLOYEE RESPONSIBILITIES DIRECTORY (5 PER PAGE)
          ========================================================= */}
      {activeTab === 'employee_directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: '12px 18px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              fontSize: '0.85rem',
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              <strong>Server-Side Paginated Directory</strong>: Displaying 5 employees per page fetched live from FastAPI. Total: <strong>{empTotalRecords}</strong> registered employees.
            </span>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={13} />}
              isLoading={isLoadingEmpDirectory}
              onClick={fetchPaginatedEmployees}
            >
              Refresh List
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
                  placeholder="Search employee name, email, or employee ID..."
                  value={empSearch}
                  onChange={e => {
                    setEmpSearch(e.target.value);
                    setEmpPage(1);
                  }}
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
                value={empDeptFilter}
                onChange={e => {
                  setEmpDeptFilter(e.target.value);
                  setEmpPage(1);
                }}
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

              {(empSearch || empDeptFilter !== 'ALL') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEmpSearch('');
                    setEmpDeptFilter('ALL');
                    setEmpPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Employee Directory Table (5 per page) */}
          <div className="card">
            {empDirectoryError && (
              <div style={{ padding: 16, backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '0.85rem' }}>
                {empDirectoryError}
              </div>
            )}

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee &amp; Email</th>
                    <th style={{ width: 180 }}>Department</th>
                    <th>Support Responsibilities</th>
                    <th style={{ width: 170, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingEmpDirectory ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-slate-500)' }}>
                        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                        <div>Loading employees from FastAPI...</div>
                      </td>
                    </tr>
                  ) : empDirectoryUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--color-slate-500)' }}>
                        No employees found matching the specified criteria.
                      </td>
                    </tr>
                  ) : (
                    empDirectoryUsers.map(emp => {
                      const empDept = departments.find(d => d.id === emp.department_id);
                      const deptName = empDept?.name || emp.department?.name || 'Not assigned';

                      const empResps = responsibilities.filter(
                        r => r.responsible_employee_id === emp.id || r.responsible_employee_email === emp.email
                      );

                      return (
                        <tr key={emp.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--color-primary-100)',
                                  color: 'var(--color-primary-700)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  flexShrink: 0,
                                }}
                              >
                                {emp.name[0]?.toUpperCase() || 'E'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>
                                  {emp.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                                  {emp.email} • ID: {emp.employee_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: '0.85rem',
                                color: deptName === 'Not assigned' ? 'var(--color-slate-400)' : 'var(--color-slate-700)',
                                fontWeight: 500,
                              }}
                            >
                              {deptName}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {empResps.length > 0 ? (
                                empResps.map(r => (
                                  <span
                                    key={r.id}
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
                                    {r.subcategory_name ? `${r.category_name} > ${r.subcategory_name}` : r.category_name}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                                  None assigned
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<UserPlus size={13} />}
                              onClick={() => {
                                setTargetEmployeeForAssignment(emp);
                                setDirectAssignCatId(categories[0]?.id || '');
                                setDirectAssignSubId('');
                                setDirectAssignModalOpen(true);
                              }}
                            >
                              Assign Queue
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (5 per page) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderTop: '1px solid var(--color-slate-100)',
                fontSize: '0.85rem',
                color: 'var(--color-slate-600)',
              }}
            >
              <div>
                Showing Page <strong>{empPage}</strong> of <strong>{empTotalPages}</strong> ({empTotalRecords} total employees, 5 per page)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={empPage <= 1 || isLoadingEmpDirectory}
                  leftIcon={<ChevronLeft size={14} />}
                  onClick={() => setEmpPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={empPage >= empTotalPages || isLoadingEmpDirectory}
                  rightIcon={<ChevronRight size={14} />}
                  onClick={() => setEmpPage(p => Math.min(empTotalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 3: ROUTING RULES MATRIX
          ========================================================= */}
      {activeTab === 'routing_matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Explanatory Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              backgroundColor: '#faf5ff',
              border: '1px solid #e9d5ff',
              borderRadius: 12,
              color: '#581c87',
            }}
          >
            <GitFork size={24} style={{ color: '#7e22ce', flexShrink: 0 }} />
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong>Automated Ticket Assignment Model</strong>: When an employee submits a support request,
              the system evaluates the category routing table and immediately routes to the assigned responsible employee.
              Resolvers handle tickets directly within their operational domain.
            </div>
          </div>

          {/* Department Cards Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {departments.map(dept => {
              const deptCategories = categories.filter(
                c => c.department_id === dept.id || c.department?.name === dept.name
              );

              return (
                <div key={dept.id} className="card" style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '14px 20px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid var(--color-slate-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: 'var(--color-primary-50)',
                          color: 'var(--color-primary-600)',
                        }}
                      >
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                          {dept.name}
                        </h3>
                        <span style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                          {deptCategories.length} Categories mapped
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {deptCategories.map(cat => {
                      const resp = responsibilities.find(
                        r => !r.subcategory_id && (r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase())
                      );
                      const responsibleName = resp?.responsible_employee_name || 'Unassigned';
                      const responsibleEmail = resp?.responsible_employee_email || 'No email configured';

                      return (
                        <div
                          key={cat.id}
                          style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid var(--color-slate-100)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-900)' }}>
                              {cat.name}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                              {cat.description || 'General inquiry'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  fontSize: '0.825rem',
                                  fontWeight: 600,
                                  color: resp?.responsible_employee_name ? 'var(--color-slate-800)' : '#dc2626',
                                }}
                              >
                                {responsibleName}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)' }}>
                                {responsibleEmail}
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAssignModal(cat, resp)}
                            >
                              Edit Routing
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: Assign Employee to Category / Subcategory
          ========================================================= */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={
          selectedSubcategory
            ? `Assign Employee to Subcategory: ${selectedSubcategory.name}`
            : selectedResp && selectedResp.responsible_employee_name
            ? `Change Employee for ${selectedCategory?.name}`
            : `Assign Employee to ${selectedCategory?.name}`
        }
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                {selectedSubcategory ? 'Selected Subcategory' : 'Selected Category'}
              </div>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: 2 }}>
                {selectedCategory.name} {selectedSubcategory ? `> ${selectedSubcategory.name}` : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Current Assignee: <strong>{selectedResp?.responsible_employee_name || 'Unassigned'}</strong>
              </div>
            </div>

            {/* Keyboard-accessible searchable employee autocomplete */}
            <EmployeeAutocomplete
              employees={employees}
              selectedEmployeeId={selectedEmployeeId}
              onSelect={emp => setSelectedEmployeeId(emp.id)}
              label="Select Responsible Employee"
              placeholder="Type employee name, email, or department..."
              required
              helperText="Incoming tickets matching this taxonomy will be routed directly to this employee."
            />
          </div>
        )}
      </Modal>

      {/* =========================================================
          MODAL: Assign Responsibility to Employee (from Directory)
          ========================================================= */}
      <Modal
        isOpen={directAssignModalOpen}
        onClose={() => setDirectAssignModalOpen(false)}
        title={targetEmployeeForAssignment ? `Assign Queue to ${targetEmployeeForAssignment.name}` : 'Assign Queue'}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDirectAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveDirectAssignment}>
              Save Assignment
            </Button>
          </div>
        }
      >
        {targetEmployeeForAssignment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>
                {targetEmployeeForAssignment.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                {targetEmployeeForAssignment.email} • Dept: {targetEmployeeForAssignment.department?.name || 'Not assigned'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Select Category *
              </label>
              <select
                value={directAssignCatId}
                onChange={e => {
                  setDirectAssignCatId(e.target.value);
                  setDirectAssignSubId('');
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({departments.find(d => d.id === cat.department_id)?.name || 'General'})
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Subcategory */}
            {directAssignCatId && subcategories.filter(s => s.category_id === directAssignCatId).length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                  Subcategory (Optional)
                </label>
                <select
                  value={directAssignSubId}
                  onChange={e => setDirectAssignSubId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">Whole Category (All subcategories)</option>
                  {subcategories
                    .filter(s => s.category_id === directAssignCatId)
                    .map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* =========================================================
          MODAL: Add / Edit Subcategory
          ========================================================= */}
      <Modal
        isOpen={subcatModalOpen}
        onClose={() => setSubcatModalOpen(false)}
        title={editingSubcat ? `Edit Subcategory in ${selectedCategory?.name}` : `Add Subcategory to ${selectedCategory?.name}`}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setSubcatModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveSubcategory} isLoading={isSubmittingSubcat}>
              Save Subcategory
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveSubcategory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
              Subcategory Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Keyboard Replacement"
              value={subcatName}
              onChange={e => setSubcatName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of this subcategory..."
              value={subcatDesc}
              onChange={e => setSubcatDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
