import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';
import { Bell, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { currentUser, switchUser, logout, allUsers } = useAuth();
  const { unreadNotificationsCount } = useTickets();
  const navigate = useNavigate();

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <h2 className="navbar-title">ResolveHub</h2>
      </div>

      <div className="navbar-right">
        {/* Quick Role Switcher for Demo & Testing */}
        <div className="persona-switcher" title="Switch active persona for testing Employee, Resolver, or Super Admin view">
          <ShieldAlert size={14} style={{ color: 'var(--color-primary-600)' }} />
          <span>Role view:</span>
          <select
            className="persona-select"
            value={currentUser?.id || ''}
            onChange={e => switchUser(e.target.value)}
          >
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>

        {/* Notification Icon */}
        <button
          className="icon-button"
          onClick={() => navigate('/notifications')}
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell size={19} />
          {unreadNotificationsCount > 0 && <span className="icon-badge" />}
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
