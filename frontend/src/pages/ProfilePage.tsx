import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import {
  User as UserIcon,
  Mail,
  Building,
  Shield,
  BadgeCheck,
  Calendar,
  Layers,
  Save,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, switchUser, allUsers } = useAuth();
  const { tickets } = useTickets();

  const [name, setName] = useState(currentUser?.name || '');
  const [email] = useState(currentUser?.email || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if currentUser changes via persona switcher
  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
    }
  }, [currentUser]);

  const myTickets = tickets.filter(t => t.created_by === currentUser?.id);
  const myAssignedTickets = tickets.filter(t => t.assigned_to === currentUser?.id);
  const myResolvedTickets = myAssignedTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">
            Manage your employee account details, departmental routing, and role preferences.
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
                gridTemplateColumns: currentUser.role === 'RESOLVER' ? '1fr 1fr' : '1fr',
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

              {currentUser.role === 'RESOLVER' && (
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

        {/* Right Column: Account Details & Persona Switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Account Details Form */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Employee Information</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    leftIcon={<UserIcon size={16} />}
                  />

                  <Input
                    label="Employee ID"
                    value={currentUser.employee_id}
                    disabled
                    hint="Managed by IT / HR directory"
                    leftIcon={<BadgeCheck size={16} />}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Input
                    label="Corporate Email"
                    value={email}
                    disabled
                    hint="Single sign-on address"
                    leftIcon={<Mail size={16} />}
                  />

                  <Input
                    label="Department"
                    value={currentUser.department_name}
                    disabled
                    hint="Assigned organizational unit"
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
                    label="Account Active Since"
                    value={new Date(currentUser.created_at).toLocaleDateString()}
                    disabled
                    leftIcon={<Calendar size={16} />}
                  />
                </div>

                {savedSuccess && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: 'var(--radius-md)',
                      color: '#065f46',
                      fontSize: '0.85rem',
                      marginBottom: 16,
                    }}
                  >
                    Profile changes successfully updated.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button type="submit" variant="primary" leftIcon={<Save size={16} />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Persona Switcher Box for Reviewers & Evaluators */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-primary-600)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} style={{ color: 'var(--color-primary-600)' }} />
                <h3 className="card-title">Test Other Role Personas</h3>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', marginBottom: 16 }}>
                Quickly switch your active session to experience ResolveHub from each role perspective:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {allUsers.map(user => {
                  const isCurrent = user.id === currentUser.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => switchUser(user.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-lg)',
                        border: isCurrent
                          ? '2px solid var(--color-primary-600)'
                          : '1px solid var(--color-slate-200)',
                        backgroundColor: isCurrent ? 'var(--color-primary-50)' : '#ffffff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-slate-900)' }}>
                          {user.name}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                            Active
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                        {user.role.replace('_', ' ')} • {user.department_name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
