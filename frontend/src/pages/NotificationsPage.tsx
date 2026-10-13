import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Ticket, Check, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { NotificationItem } from '../types';
import { Button } from '../components/common/Button';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<NotificationItem[]>('/notifications');
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            System alerts, status transitions, and assigned ticket updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchNotifications}
          >
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 size={14} />}
              onClick={handleMarkAllAsRead}
            >
              Mark All as Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-slate-200)', paddingBottom: 8 }}>
        <button
          onClick={() => setFilter('ALL')}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: filter === 'ALL' ? 'var(--color-primary-50)' : 'transparent',
            color: filter === 'ALL' ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
            fontWeight: filter === 'ALL' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            backgroundColor: filter === 'UNREAD' ? 'var(--color-primary-50)' : 'transparent',
            color: filter === 'UNREAD' ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
            fontWeight: filter === 'UNREAD' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="card">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div className="empty-state-icon" style={{ margin: '0 auto 12px' }}>
              <Bell size={28} />
            </div>
            <h3 className="empty-state-title">All caught up!</h3>
            <p className="empty-state-text" style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem' }}>
              {filter === 'UNREAD'
                ? 'You have no unread notifications.'
                : 'No notifications logged yet. Updates on ticket assignments and status changes will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredNotifications.map((notif, index) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.is_read) handleMarkAsRead(notif.id);
                  if (notif.ticket_id) navigate(`/tickets/${notif.ticket_id}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: index < filteredNotifications.length - 1 ? '1px solid var(--color-slate-100)' : 'none',
                  backgroundColor: notif.is_read ? '#ffffff' : '#f8fafc',
                  cursor: notif.ticket_id ? 'pointer' : 'default',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: notif.is_read ? '#f1f5f9' : 'var(--color-primary-100)',
                      color: notif.is_read ? 'var(--color-slate-500)' : 'var(--color-primary-700)',
                      marginTop: 2,
                    }}
                  >
                    {notif.ticket_id ? <Ticket size={18} /> : <Bell size={18} />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontWeight: notif.is_read ? 500 : 700,
                          fontSize: '0.9rem',
                          color: 'var(--color-slate-900)',
                        }}
                      >
                        {notif.title}
                      </span>
                      {!notif.is_read && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary-600)',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.825rem',
                        color: 'var(--color-slate-600)',
                        marginTop: 4,
                        lineHeight: 1.4,
                      }}
                    >
                      {notif.message}
                    </div>
                    <div
                      style={{
                        fontSize: '0.725rem',
                        color: 'var(--color-slate-400)',
                        marginTop: 6,
                      }}
                    >
                      {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {!notif.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Mark as read"
                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                  >
                    <Check size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
