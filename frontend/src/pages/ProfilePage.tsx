import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Input } from '../components/common/Input';
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  BadgeCheck,
  Calendar,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets, departments } = useTickets();

  if (!currentUser) return null;

  const myTickets = tickets.filter(t => t.created_by === currentUser?.id);
  const myAssignedTickets = tickets.filter(t => t.assigned_to === currentUser?.id);
  const myResolvedTickets = myAssignedTickets.filter(
    t => t.status === 'RESOLVED' || t.status === 'CLOSED'
  );

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const departmentObj = departments.find(d => d.id === currentUser.department_id);
  const departmentName = departmentObj?.name || (currentUser.department_id ? 'Assigned Dept' : 'General');

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">
            Authenticated employee account information retrieved from <code>GET /api/users/me</code>.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: User Profile Card */}
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary-100)',
                color: 'var(--color-primary-700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 700,
                margin: '0 auto 16px',
                border: '3px solid #ffffff',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {getInitials(currentUser.name)}
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
                    currentUser.role === 'SUPER_ADMIN'
                      ? '#fee2e2'
                      : currentUser.role === 'RESOLVER'
                      ? '#fef3c7'
                      : '#e0e7ff',
                  color:
                    currentUser.role === 'SUPER_ADMIN'
                      ? '#991b1b'
                      : currentUser.role === 'RESOLVER'
                      ? '#92400e'
                      : '#3730a3',
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
                gridTemplateColumns: currentUser.role === 'RESOLVER' || currentUser.role === 'SUPER_ADMIN' ? '1fr 1fr' : '1fr',
                gap: 12,
                textAlign: 'center',
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

              {(currentUser.role === 'RESOLVER' || currentUser.role === 'SUPER_ADMIN') && (
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
