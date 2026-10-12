import React from 'react';
import { Clock, AlertTriangle, Construction } from 'lucide-react';

export const AdminSlaPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">SLA &amp; Escalation Management</h1>
          <p className="page-subtitle">
            Configure Service Level Agreements, turnaround targets, and automated escalation pathways.
          </p>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 32px',
          backgroundColor: '#fffbeb',
          border: '2px dashed #fde68a',
          borderRadius: 16,
          textAlign: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Construction size={32} style={{ color: '#d97706' }} />
        </div>

        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#92400e',
            margin: 0,
          }}
        >
          Coming Soon
        </h2>

        <p
          style={{
            fontSize: '0.95rem',
            color: '#78716c',
            maxWidth: 520,
            lineHeight: 1.6,
          }}
        >
          SLA policies, automated escalation rules, and breach tracking are currently under development.
          Once implemented, this page will allow you to:
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            width: '100%',
            maxWidth: 640,
            marginTop: 8,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              borderRadius: 10,
              border: '1px solid #fde68a',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Clock size={16} style={{ color: '#d97706' }} />
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-800)' }}>
                SLA Policies
              </span>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--color-slate-500)', margin: 0, lineHeight: 1.4 }}>
              Define first-response and resolution targets per priority level.
            </p>
          </div>

          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#ffffff',
              borderRadius: 10,
              border: '1px solid #fde68a',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <AlertTriangle size={16} style={{ color: '#dc2626' }} />
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-800)' }}>
                Escalation Rules
              </span>
            </div>
            <p style={{ fontSize: '0.775rem', color: 'var(--color-slate-500)', margin: 0, lineHeight: 1.4 }}>
              Auto-escalate breached tickets to department leads or admins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
