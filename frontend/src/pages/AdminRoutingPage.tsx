import React, { useState } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { CategoryResponsibility, User } from '../types';
import {
  Route,
  Building2,
  FolderTree,
  UserCheck,
  Shield,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  GitFork,
} from 'lucide-react';

export const AdminRoutingPage: React.FC = () => {
  const {
    departments,
    categories,
    responsibilities,
    employees,
    tickets,
    updateCategoryResponsibility,
  } = useTickets();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedResp, setSelectedResp] = useState<CategoryResponsibility | null>(null);
  const [newEmployeeId, setNewEmployeeId] = useState('');

  const handleOpenEdit = (resp: CategoryResponsibility) => {
    setSelectedResp(resp);
    setNewEmployeeId(resp.responsible_employee_id);
    setModalOpen(true);
  };

  const handleSaveRouting = () => {
    if (!selectedResp || !newEmployeeId) return;

    const chosenEmp = employees.find(e => e.id === newEmployeeId || e.employee_id === newEmployeeId);
    if (!chosenEmp) return;

    updateCategoryResponsibility(
      selectedResp.id,
      chosenEmp.id,
      chosenEmp.name,
      chosenEmp.email
    );

    setModalOpen(false);
    setSelectedResp(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Category Responsibility &amp; Routing</h1>
          <p className="page-subtitle">
            Configure automated routing rules: Department &rarr; Category &rarr; Responsible Employee.
          </p>
        </div>
      </div>

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
          the system evaluates the category routing table and immediately sets{' '}
          <code>Assigned To: &lt;Responsible Employee&gt;</code>. There is no separate resolver role&mdash;designated
          employees handle resolution within their operational domain.
        </div>
      </div>

      {/* Department Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {departments.map(dept => {
          const deptCategories = categories.filter(
            c => c.department_id === dept.id || c.department?.name === dept.name
          );

          return (
            <div key={dept.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Department Header */}
              <div
                style={{
                  padding: '16px 20px',
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
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: 'var(--color-primary-50)',
                      color: 'var(--color-primary-600)',
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                      {dept.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                      {dept.department_email} • {deptCategories.length} Categories
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Routing Rows */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {deptCategories.map((cat, idx) => {
                  const resp = responsibilities.find(
                    r => r.category_id === cat.id || r.category_name.toLowerCase() === cat.name.toLowerCase()
                  );

                  const activeTicketsCount = tickets.filter(
                    t =>
                      (t.category_id === cat.id || t.category?.name === cat.name) &&
                      t.status !== 'CLOSED' &&
                      t.status !== 'RESOLVED'
                  ).length;

                  const responsibleName = resp?.responsible_employee_name || 'Unassigned';
                  const responsibleEmail = resp?.responsible_employee_email || 'No email configured';

                  return (
                    <div
                      key={cat.id}
                      style={{
                        padding: '16px 20px',
                        borderBottom:
                          idx < deptCategories.length - 1 ? '1px solid var(--color-slate-100)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                      }}
                    >
                      {/* Left: Category info */}
                      <div style={{ minWidth: 260 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                            {cat.name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor: '#f1f5f9',
                              color: 'var(--color-slate-600)',
                            }}
                          >
                            {activeTicketsCount} Active Tickets
                          </span>
                        </div>
                        <p style={{ fontSize: '0.775rem', color: 'var(--color-slate-500)', marginTop: 2, margin: 0 }}>
                          {cat.description || 'General category inquiries'}
                        </p>
                      </div>

                      {/* Middle: Routing Arrow & Responsible Employee */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ color: 'var(--color-slate-400)', display: 'flex', alignItems: 'center' }}>
                          <ArrowRight size={18} />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 14px',
                            backgroundColor: resp ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${resp ? '#bbf7d0' : '#fecaca'}`,
                            borderRadius: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: resp ? '#16a34a' : '#dc2626',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {responsibleName[0]?.toUpperCase() || 'U'}
                          </div>

                          <div>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, color: resp ? '#15803d' : '#991b1b' }}>
                              Responsible Employee
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                              {responsibleName}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                              {responsibleEmail}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action */}
                      <div>
                        {resp ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(resp)}
                          >
                            Change Employee
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              handleOpenEdit({
                                id: `resp-${cat.id}`,
                                department_id: dept.id,
                                department_name: dept.name,
                                category_id: cat.id,
                                category_name: cat.name,
                                responsible_employee_id: employees[0]?.id || '',
                                responsible_employee_name: employees[0]?.name || '',
                                responsible_employee_email: employees[0]?.email || '',
                                updated_at: new Date().toISOString(),
                              })
                            }
                          >
                            Assign Employee
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reassign Responsibility Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Reassign Category Responsibility"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRouting}>
              Save Routing Rule
            </Button>
          </div>
        }
      >
        {selectedResp && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>Routing Target</div>
              <div style={{ fontWeight: 600, color: 'var(--color-slate-900)', marginTop: 2 }}>
                {selectedResp.department_name} &gt; {selectedResp.category_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                Current Assignee: <strong>{selectedResp.responsible_employee_name}</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                New Responsible Employee
              </label>
              <select
                value={newEmployeeId}
                onChange={e => setNewEmployeeId(e.target.value)}
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
                All future tickets created in <strong>{selectedResp.category_name}</strong> will automatically be assigned to this employee.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
