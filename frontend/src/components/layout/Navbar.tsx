import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <h2 className="navbar-title">ResolveHub</h2>
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
            <Shield size={14} style={{ color: 'var(--color-primary-600)' }} />
            <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
              {currentUser.name}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                padding: '2px 8px',
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
        )}

        {/* Notification Icon */}
        <button
          className="icon-button"
          onClick={() => navigate('/notifications')}
          title="Notifications (Pending backend integration)"
          aria-label="View notifications"
        >
          <Bell size={19} />
        </button>

        {/* Profile */}
        <button
          className="icon-button"
          onClick={() => navigate('/profile')}
          title="My Profile"
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
