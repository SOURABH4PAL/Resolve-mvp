import React, { useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Department } from '../types';
import { Building2, Plus, Mail, CheckCircle2, FolderTree, Ticket as TicketIcon } from 'lucide-react';

export const AdminDepartmentsPage: React.FC = () => {
  const { departments, categories, tickets } = useTickets();

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department Name',
      render: dept => (
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
            <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{dept.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>ID: {dept.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'department_email',
      header: 'Department Email',
      render: dept => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--color-slate-700)' }}>
          <Mail size={14} style={{ color: 'var(--color-slate-400)' }} />
          <span>{dept.department_email || 'None'}</span>
        </div>
      ),
    },
    {
      key: 'categories_count',
      header: 'Categories',
      width: '140px',
      render: dept => {
        const count = categories.filter(c => c.department_id === dept.id || c.department?.name === dept.name).length;
        return (
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
            {count} Categories
          </span>
        );
      },
    },
    {
      key: 'tickets_count',
      header: 'Ticket Volume',
      width: '140px',
      render: dept => {
        const deptTickets = tickets.filter(t => t.category?.department_id === dept.id || t.category?.department?.name === dept.name);
        return (
          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)' }}>
            <strong>{deptTickets.length}</strong> total
          </span>
        );
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '120px',
      render: dept => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: dept.is_active ? '#ecfdf5' : '#f1f5f9',
            color: dept.is_active ? '#065f46' : '#64748b',
          }}
        >
          {dept.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">
            Configure organizational functional departments and routing boundaries.
          </p>
        </div>
      </div>

      <div className="card">
        <Table<Department>
          columns={columns}
          data={departments}
          emptyMessage="No departments configured."
        />
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--color-slate-100)', fontSize: '0.825rem', color: 'var(--color-slate-500)' }}>
          Total {departments.length} departments registered
        </div>
      </div>
    </div>
  );
};
