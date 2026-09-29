import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Category } from '../types';
import { FolderTree, Route, UserCheck, CheckCircle2 } from 'lucide-react';
import { MOCK_SUBCATEGORIES } from '../mock/mockData';

export const AdminCategoriesPage: React.FC = () => {
  const { categories, departments, responsibilities } = useTickets();
  const navigate = useNavigate();

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
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

      <div className="card">
        <Table<Category>
          columns={columns}
          data={categories}
          emptyMessage="No categories registered."
        />
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-slate-100)', fontSize: '0.825rem', color: 'var(--color-slate-500)' }}>
          Total {categories.length} categories active
        </div>
      </div>
    </div>
  );
};
