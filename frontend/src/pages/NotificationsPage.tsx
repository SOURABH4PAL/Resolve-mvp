import React from 'react';
import { Bell, AlertCircle, Info } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            System alerts, status transitions, and assigned ticket updates.
          </p>
        </div>
      </div>

      {/* Backend Integration Pending Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}
      >
        <Info size={22} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
        <div>
          <h4 style={{ fontWeight: 600, color: '#1e40af', fontSize: '0.95rem', marginBottom: 4 }}>
            Pending Backend Integration (Milestone M5)
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.5 }}>
            The <code>GET /api/notifications</code> endpoint has not yet been implemented in the FastAPI backend (scheduled under task M5 in <code>PROJECT_PLAN.md</code>).
            In compliance with project specifications, no fake API calls or synthetic mock notifications are generated. Once the backend notification router is committed, this feed will display live in-app alerts.
          </p>
        </div>
      </div>

      {/* Clean Empty Placeholder */}
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Bell size={28} />
          </div>
          <h3 className="empty-state-title">No notifications to display</h3>
          <p className="empty-state-text">
            Live notification streaming will activate once <code>GET /api/notifications</code> is deployed on the backend.
          </p>
        </div>
      </div>
    </div>
  );
};
