import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Settings, Shield, User, Database, Lock, Server } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Profile &amp; System Settings</h1>
          <p className="page-subtitle">
            Configure enterprise security, authentication parameters, and review administrative credentials.
          </p>
        </div>
      </div>

      {/* Admin Profile Card */}
      <div className="card" style={{ padding: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          Administrative Account
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            AD
          </div>

          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
              {currentUser?.name || 'Super Admin'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
              {currentUser?.email || 'admin@resolvehub.com'}
            </div>
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                }}
              >
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            borderTop: '1px solid var(--color-slate-100)',
            paddingTop: 16,
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>Employee ID</div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
              {currentUser?.employee_id || 'ADM-001'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>Access Level</div>
            <div style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
              Full Enterprise Control
            </div>
          </div>
        </div>
      </div>

      {/* System Architecture Specifications */}
      <div className="card" style={{ padding: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          Role &amp; Responsibility Architecture
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-900)' }}>
              Application Roles
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-600)', marginTop: 4 }}>
              ResolveHub MVP operates with strictly 2 roles: <code>EMPLOYEE</code> and <code>SUPER_ADMIN</code>.
              Support queues are managed by employees via Category Responsibilities.
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-900)' }}>
              Routing Engine
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-600)', marginTop: 4 }}>
              Active matrix maps: <strong>Department &rarr; Category &rarr; Responsible Employee</strong>.
              Tickets auto-assign to the responsible employee upon submission.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
