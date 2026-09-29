import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Input } from '../components/common/Input';
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  Calendar,
  BadgeCheck,
  CheckCircle2,
  FolderTree,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, departments, responsibilities } = useTickets();

  if (!currentUser) return null;

  const departmentName =
    departments.find(d => d.id === currentUser.department_id)?.name ||
    currentUser.department?.name ||
    'Not Assigned';

  const myTickets = tickets.filter(t => t.created_by === currentUser.id);
  const myAssignedTickets = tickets.filter(
    t => t.assigned_to === currentUser.id || t.assigned_to === currentUser.employee_id
  );
  const myResolvedTickets = myAssignedTickets.filter(
    t => t.status === 'RESOLVED' || t.status === 'CLOSED'
  );

  const myResponsibilities = responsibilities
    .filter(r => r.responsible_employee_id === currentUser.id || r.responsible_employee_email === currentUser.email)
    .map(r => r.category_name);

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">
            Authenticated corporate employee profile and assigned support responsibilities.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        {/* Left Column: Avatar & Role Summary Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div
            className="card-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: 32,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor:
                  currentUser.role === 'SUPER_ADMIN' ? '#fee2e2' : 'var(--color-primary-100)',
                color:
                  currentUser.role === 'SUPER_ADMIN' ? '#991b1b' : 'var(--color-primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
              {currentUser.name}
            </h3>

            <p style={{ fontSize: '0.825rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
              {currentUser.email}
            </p>

            <div style={{ marginTop: 14, display: 'inline-flex' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor:
                    currentUser.role === 'SUPER_ADMIN' ? '#fee2e2' : '#e0e7ff',
                  color:
                    currentUser.role === 'SUPER_ADMIN' ? '#991b1b' : '#3730a3',
                }}
              >
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>

            {/* Quick Stats on Profile */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--color-slate-100)',
                display: 'grid',
                gridTemplateColumns: myAssignedTickets.length > 0 ? '1fr 1fr' : '1fr',
                gap: 12,
                textAlign: 'center',
                width: '100%',
              }}
            >
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                  {myTickets.length}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                  Submitted
                </div>
              </div>

              {myAssignedTickets.length > 0 && (
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
                    {myResolvedTickets.length}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                    Resolved
                  </div>
                </div>
              )}
            </div>

            {/* Category Responsibilities Pill list */}
            {myResponsibilities.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: '1px solid var(--color-slate-100)',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-400)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Support Responsibilities
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {myResponsibilities.map(resp => (
                    <span
                      key={resp}
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        backgroundColor: '#faf5ff',
                        color: '#7e22ce',
                        border: '1px solid #e9d5ff',
                      }}
                    >
                      {resp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Account Details */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Employee Information</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Full Name"
                value={currentUser.name}
                disabled
                leftIcon={<UserIcon size={16} />}
              />

              <Input
                label="Employee ID"
                value={currentUser.employee_id}
                disabled
                hint="Assigned corporate ID"
                leftIcon={<BadgeCheck size={16} />}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Corporate Email"
                value={currentUser.email}
                disabled
                hint="Backend account email"
                leftIcon={<Mail size={16} />}
              />

              <Input
                label="Department"
                value={departmentName}
                disabled
                leftIcon={<Building size={16} />}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Role Permission"
                value={currentUser.role.replace('_', ' ')}
                disabled
                leftIcon={<Shield size={16} />}
              />

              <Input
                label="Account Created"
                value={new Date(currentUser.created_at).toLocaleDateString()}
                disabled
                leftIcon={<Calendar size={16} />}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
