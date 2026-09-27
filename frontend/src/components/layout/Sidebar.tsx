import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Inbox,
  UserCheck,
  Bell,
  User,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';

export const Sidebar: React.FC = () => {
  const { currentUser } = useAuth();
  const { tickets } = useTickets();

  const myTicketsCount = tickets.filter(t => t.created_by === currentUser?.id).length;
  const assignedToMeCount = tickets.filter(
    t => t.assigned_to === currentUser?.id && t.status !== 'CLOSED'
  ).length;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Layers size={18} />
          </div>
          <span>ResolveHub</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>

        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/create-ticket"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <PlusCircle size={18} />
          <span>Create Ticket</span>
        </NavLink>

        <NavLink
          to="/my-tickets"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Inbox size={18} />
          <span>My Tickets</span>
          {myTicketsCount > 0 && <span className="nav-badge">{myTicketsCount}</span>}
        </NavLink>

        <NavLink
          to="/assigned-to-me"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <UserCheck size={18} />
          <span>Assigned To Me</span>
          {assignedToMeCount > 0 && (
            <span className="nav-badge active-badge">{assignedToMeCount}</span>
          )}
        </NavLink>

        <div className="nav-section-title">Account & System</div>

        <NavLink
          to="/notifications"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Bell size={18} />
          <span>Notifications</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <User size={18} />
          <span>Profile</span>
        </NavLink>
      </nav>

      {/* Footer Profile Pill */}
      {currentUser && (
        <div className="sidebar-footer">
          <div className="user-quick-profile">
            <div className="user-avatar">{getInitials(currentUser.name)}</div>
            <div className="user-meta">
              <div className="user-meta-name" title={currentUser.name}>
                {currentUser.name}
              </div>
              <div className="user-meta-role">
                {currentUser.role.replace('_', ' ')} • {currentUser.employee_id}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
