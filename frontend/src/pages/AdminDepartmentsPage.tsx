import React, { useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { Department } from '../types';
import {
  Building2,
  Plus,
  Mail,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AdminDepartmentsPage: React.FC = () => {
  const { departments, categories, tickets, createDepartment, updateDepartment, deleteDepartment } = useTickets();

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setName('');
    setEmail('');
    setIsActive(true);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setEmail(dept.department_email || '');
    setIsActive(dept.is_active);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Department name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: name.trim(),
          department_email: email.trim() || undefined,
          is_active: isActive,
        });
        setSuccessMsg(`Department '${name.trim()}' updated successfully!`);
      } else {
        await createDepartment({
          name: name.trim(),
          department_email: email.trim() || undefined,
        });
        setSuccessMsg(`Department '${name.trim()}' created successfully!`);
      }
      setModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (dept: Department) => {
    setDeptToDelete(dept);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDepartment(deptToDelete.id);
      setSuccessMsg(`Department '${deptToDelete.name}' deleted/deactivated successfully.`);
      setDeleteModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete department');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      width: '100px',
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
    {
      key: 'actions',
      header: 'Actions',
      width: '140px',
      render: dept => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenEdit(dept)}
            style={{ padding: '4px 8px' }}
            title="Edit Department"
          >
            <Edit2 size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleOpenDelete(dept)}
            style={{ padding: '4px 8px', color: '#ef4444' }}
            title="Delete Department"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">
            Configure organizational functional departments, routing boundaries, and lead contacts.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} />
          <span>Add Department</span>
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

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDept ? 'Edit Department' : 'Create New Department'}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
                Department Name *
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Engineering & Development"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
                Department Email
              </label>
              <input
                type="email"
                className="input"
                placeholder="e.g. engineering@resolvehub.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {editingDept && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="deptActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                />
                <label htmlFor="deptActive" style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)', cursor: 'pointer' }}>
                  Department is active
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deptToDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Department"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)', lineHeight: 1.5 }}>
              Are you sure you want to delete or deactivate department <strong>{deptToDelete.name}</strong>?
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
              If this department has existing tickets or categories, it will be safely deactivated to preserve data integrity.
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
                {isSubmitting ? 'Processing...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
