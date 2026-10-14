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
  Users,
  Building2,
  FolderTree,
  Route,
  Clock,
  Activity,
  BookOpen,
  BarChart3,
  Settings,
  Ticket as TicketIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTickets } from '../../context/TicketContext';

export interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { currentUser } = useAuth();
  const { tickets, unreadNotificationCount } = useTickets();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Ticket badges
  const myTicketsCount = tickets.filter(t => t.created_by === currentUser?.id).length;
  const assignedToMeCount = tickets.filter(
    t => t.assigned_to === currentUser?.id && t.status !== 'CLOSED' && t.status !== 'RESOLVED'
  ).length;
  const openCompanyTicketsCount = tickets.filter(
    t => t.status !== 'CLOSED' && t.status !== 'RESOLVED'
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
    <aside className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div
        className="sidebar-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 14px',
          gap: 6,
        }}
      >
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.05rem', minWidth: 0 }}>
          <div className="sidebar-logo-icon" style={{ width: 28, height: 28, minWidth: 28 }}>
            <Layers size={16} />
          </div>
          <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>ResolveHub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: isSuperAdmin ? '#b91c1c' : 'var(--color-primary-700)',
              backgroundColor: isSuperAdmin ? '#fef2f2' : 'var(--color-primary-50)',
              border: `1px solid ${isSuperAdmin ? '#fecaca' : 'var(--color-primary-200)'}`,
              padding: '2px 5px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isSuperAdmin ? 'Admin Management' : 'Employee Portal'}
          </div>
          <button
            className="mobile-sidebar-close"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav List */}
      <nav
        className="sidebar-nav"
        onClick={e => {
          if ((e.target as HTMLElement).closest('.nav-item')) {
            onCloseMobile?.();
          }
        }}
      >
        {isSuperAdmin ? (
          /* =========================================================
             SUPER ADMIN NAVIGATION (System Management First)
             ========================================================= */
          <>
            <div className="nav-section-title">Overview</div>

            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Admin Dashboard</span>
            </NavLink>

            <NavLink
              to="/admin/tickets"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <TicketIcon size={18} />
              <span>Ticket Management</span>
              {openCompanyTicketsCount > 0 && (
                <span className="nav-badge active-badge">{openCompanyTicketsCount}</span>
              )}
            </NavLink>

            <div className="nav-section-title">Organization & Routing</div>

            <NavLink
              to="/admin/employees"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Users size={18} />
              <span>Employee Management</span>
            </NavLink>

            <NavLink
              to="/admin/departments"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Building2 size={18} />
              <span>Departments</span>
            </NavLink>

            <NavLink
              to="/admin/categories"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <FolderTree size={18} />
              <span>Categories &amp; Responsibilities</span>
            </NavLink>

            <div className="nav-section-title">Operations & Knowledge</div>

            <NavLink
              to="/admin/sla"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Clock size={18} />
              <span>SLA & Escalation</span>
            </NavLink>

            <NavLink
              to="/admin/faq"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <BookOpen size={18} />
              <span>FAQ / Knowledge Base</span>
            </NavLink>

            <NavLink
              to="/admin/reports"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <BarChart3 size={18} />
              <span>Reports & Analytics</span>
            </NavLink>

            <div className="nav-section-title">System</div>

            <NavLink
              to="/admin/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Settings size={18} />
              <span>Settings & Profile</span>
            </NavLink>
          </>
        ) : (
          /* =========================================================
             EMPLOYEE NAVIGATION (Support Portal)
             ========================================================= */
          <>
            <div className="nav-section-title">Support Portal</div>

            <NavLink
              to="/employee/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/employee/create-ticket"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <PlusCircle size={18} />
              <span>Create Ticket</span>
            </NavLink>

            <NavLink
              to="/employee/my-tickets"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Inbox size={18} />
              <span>My Tickets</span>
              {myTicketsCount > 0 && <span className="nav-badge">{myTicketsCount}</span>}
            </NavLink>

            <NavLink
              to="/employee/assigned"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <UserCheck size={18} />
              <span>Assigned To Me</span>
              {assignedToMeCount > 0 && (
                <span className="nav-badge active-badge">{assignedToMeCount}</span>
              )}
            </NavLink>

            <NavLink
              to="/employee/faq"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <BookOpen size={18} />
              <span>FAQ / Help</span>
            </NavLink>

            <div className="nav-section-title">Personal</div>

            <NavLink
              to="/employee/notifications"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Bell size={18} />
              <span>Notifications</span>
              {unreadNotificationCount > 0 && (
                <span className="nav-badge active-badge">{unreadNotificationCount}</span>
              )}
            </NavLink>

            <NavLink
              to="/employee/profile"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <User size={18} />
              <span>My Profile</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer Profile Pill */}
      {currentUser && (
        <div className="sidebar-footer">
          <div className="user-quick-profile">
            <div
              className="user-avatar"
              style={{
                backgroundColor: isSuperAdmin ? '#fee2e2' : undefined,
                color: isSuperAdmin ? '#991b1b' : undefined,
              }}
            >
              {getInitials(currentUser.name)}
            </div>
            <div className="user-meta">
              <div className="user-meta-name" title={currentUser.name}>
                {currentUser.name}
              </div>
              <div
                className="user-meta-role"
                style={{
                  color: isSuperAdmin ? '#f43f5e' : undefined,
                  fontWeight: 600,
                }}
              >
                {isSuperAdmin ? 'Super Admin' : 'Employee'} • {currentUser.employee_id}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
