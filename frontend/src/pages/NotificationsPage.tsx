import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Bell, CheckCheck, Clock, ExternalLink, Inbox } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationsCount,
  } = useTickets();
  const navigate = useNavigate();

  const [filterUnread, setFilterUnread] = useState(false);

  const displayedNotifications = filterUnread
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleNotificationClick = (id: string, ticketNumber?: string) => {
    markNotificationRead(id);
    if (ticketNumber) {
      navigate(`/tickets/${ticketNumber}`);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            System alerts, status transitions, resolver comments, and escalations.
          </p>
        </div>

        {unreadNotificationsCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck size={16} />}
            onClick={markAllNotificationsRead}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${!filterUnread ? 'active' : ''}`}
          onClick={() => setFilterUnread(false)}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          className={`tab-btn ${filterUnread ? 'active' : ''}`}
          onClick={() => setFilterUnread(true)}
        >
          Unread Only ({unreadNotificationsCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="card">
        {displayedNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Inbox size={26} />
            </div>
            <h3 className="empty-state-title">No notifications</h3>
            <p className="empty-state-text">
              {filterUnread
                ? 'All notifications have been read.'
                : 'No notification records in your feed.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayedNotifications.map((n, idx) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n.id, n.ticket_number)}
                style={{
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  backgroundColor: n.is_read ? '#ffffff' : 'var(--color-primary-50)',
                  borderBottom:
                    idx < displayedNotifications.length - 1
                      ? '1px solid var(--color-slate-100)'
                      : 'none',
                  cursor: n.ticket_number ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: n.is_read ? 'var(--color-slate-100)' : '#e0e7ff',
                      color: n.is_read ? 'var(--color-slate-500)' : 'var(--color-primary-700)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Bell size={18} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontWeight: n.is_read ? 600 : 700,
                          fontSize: '0.9rem',
                          color: 'var(--color-slate-900)',
                        }}
                      >
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--color-primary-600)',
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', lineHeight: 1.45 }}>
                      {n.message}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 6,
                        fontSize: '0.75rem',
                        color: 'var(--color-slate-400)',
                      }}
                    >
                      <Clock size={12} />
                      <span>{formatTime(n.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {!n.is_read && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        markNotificationRead(n.id);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Mark read
                    </button>
                  )}
                  {n.ticket_number && (
                    <span style={{ color: 'var(--color-slate-400)' }}>
                      <ExternalLink size={16} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
