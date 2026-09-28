import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { currentUser, logout, switchUserRole } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const handleNotificationClick = () => {
    if (isSuperAdmin) {
      navigate('/admin/activity');
    } else {
      navigate('/employee/notifications');
    }
  };

  const handleProfileClick = () => {
    if (isSuperAdmin) {
      navigate('/admin/settings');
    } else {
      navigate('/employee/profile');
    }
  };

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <h2 className="navbar-title">
          ResolveHub{' '}
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--color-slate-400)',
              marginLeft: 8,
            }}
          >
            {isSuperAdmin ? 'Enterprise Administration' : 'Employee Support Portal'}
          </span>
        </h2>
      </div>

      <div className="navbar-right">
        {/* Quick Role Switcher for Live Demo */}
        {switchUserRole && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isSuperAdmin ? '#fef2f2' : '#eef2ff',
              border: `1px solid ${isSuperAdmin ? '#fecaca' : '#c7d2fe'}`,
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.775rem',
            }}
          >
            <Shield
              size={13}
              style={{
                color: isSuperAdmin ? '#dc2626' : 'var(--color-primary-600)',
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--color-slate-600)' }}>Role:</span>
            <select
              value={isSuperAdmin ? 'SUPER_ADMIN' : 'EMPLOYEE'}
              onChange={e => {
                const target = e.target.value as 'SUPER_ADMIN' | 'EMPLOYEE';
                switchUserRole(target);
                navigate(target === 'SUPER_ADMIN' ? '/admin/dashboard' : '/employee/dashboard');
              }}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '0.775rem',
                color: isSuperAdmin ? '#991b1b' : '#3730a3',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="SUPER_ADMIN">Super Admin (Management)</option>
              <option value="EMPLOYEE">Employee (Support Portal)</option>
            </select>
          </div>
        )}

        {/* Current User Role Badge */}
        {currentUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'var(--color-slate-100)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
              {currentUser.name}
            </span>
          </div>
        )}

        {/* Notification Icon */}
        <button
          className="icon-button"
          onClick={handleNotificationClick}
          title={isSuperAdmin ? 'System Activity & Audit' : 'Notifications'}
          aria-label="View notifications"
        >
          <Bell size={19} />
        </button>

        {/* Profile */}
        <button
          className="icon-button"
          onClick={handleProfileClick}
          title={isSuperAdmin ? 'Admin Settings & Profile' : 'My Profile'}
          aria-label="View profile"
        >
          <UserIcon size={19} />
        </button>

        {/* Logout */}
        <button
          className="icon-button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
};
