import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
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
            <Shield
              size={14}
              style={{
                color: isSuperAdmin ? '#dc2626' : 'var(--color-primary-600)',
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
              {currentUser.name}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: isSuperAdmin ? '#fee2e2' : '#e0e7ff',
                color: isSuperAdmin ? '#991b1b' : '#3730a3',
              }}
            >
              {isSuperAdmin ? 'Super Admin' : 'Employee'}
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
