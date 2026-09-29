import React from 'react';
import { Activity, ShieldCheck, UserCheck, Clock, CheckCircle2 } from 'lucide-react';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  details: string;
  type: 'ROUTE' | 'STATUS' | 'SLA' | 'SYSTEM';
}

const MOCK_AUDIT_TRAIL: AuditEvent[] = [
  {
    id: 'aud-1',
    timestamp: '2026-03-24T10:14:00Z',
    actor: 'Super Admin',
    actorRole: 'SUPER_ADMIN',
    action: 'Category Responsibility Updated',
    details: 'Reassigned Hardware Issues category to Amit Patel (EMP-101).',
    type: 'ROUTE',
  },
  {
    id: 'aud-2',
    timestamp: '2026-03-23T15:20:00Z',
    actor: 'Amit Patel',
    actorRole: 'EMPLOYEE',
    action: 'Status Transition',
    details: 'Updated ticket TKT-000105 status from IN_PROGRESS to WAITING_FOR_USER.',
    type: 'STATUS',
  },
  {
    id: 'aud-3',
    timestamp: '2026-03-22T14:00:00Z',
    actor: 'System Watchdog',
    actorRole: 'SYSTEM',
    action: 'SLA Warning Triggered',
    details: 'Ticket TKT-000102 exceeded 4h resolution target threshold.',
    type: 'SLA',
  },
  {
    id: 'aud-4',
    timestamp: '2026-03-21T14:30:00Z',
    actor: 'Rohit Singh',
    actorRole: 'EMPLOYEE',
    action: 'Ticket Resolved',
    details: 'Marked TKT-000103 as RESOLVED with note: "Document upload size limit expanded."',
    type: 'STATUS',
  },
];

export const AdminActivityPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity &amp; Audit Trail</h1>
          <p className="page-subtitle">
            System audit logs, routing modifications, ticket status transitions, and administrative operations.
          </p>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column' }}>
          {MOCK_AUDIT_TRAIL.map((ev, idx) => (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                padding: '16px 0',
                borderBottom: idx < MOCK_AUDIT_TRAIL.length - 1 ? '1px solid var(--color-slate-100)' : 'none',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor:
                    ev.type === 'ROUTE'
                      ? '#faf5ff'
                      : ev.type === 'SLA'
                      ? '#fef2f2'
                      : '#eff6ff',
                  color:
                    ev.type === 'ROUTE'
                      ? '#7e22ce'
                      : ev.type === 'SLA'
                      ? '#dc2626'
                      : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Activity size={18} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                      {ev.action}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 4,
                        backgroundColor: '#f1f5f9',
                        color: 'var(--color-slate-600)',
                      }}
                    >
                      {ev.actor} ({ev.actorRole})
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--color-slate-600)', marginTop: 4 }}>
                  {ev.details}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
