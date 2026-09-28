import React from 'react';
import { Button } from '../components/common/Button';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Clock, AlertTriangle, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { MOCK_SLA_RULES, MOCK_ESCALATIONS } from '../mock/mockData';
import { useNavigate } from 'react-router-dom';

export const AdminSlaPage: React.FC = () => {
  const navigate = useNavigate();

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

      {/* SLA Policy Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {MOCK_SLA_RULES.map(rule => (
          <div
            key={rule.priority}
            className="card"
            style={{
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderTop: `4px solid ${
                rule.priority === 'CRITICAL'
                  ? '#dc2626'
                  : rule.priority === 'HIGH'
                  ? '#ea580c'
                  : rule.priority === 'MEDIUM'
                  ? '#0284c7'
                  : '#16a34a'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <PriorityBadge priority={rule.priority} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-400)' }}>
                Target Threshold
              </span>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                  {rule.firstResponseHours}h
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                  First Response
                </div>
              </div>

              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                  {rule.resolutionHours}h
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                  Target Resolution
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-600)', margin: 0, lineHeight: 1.4 }}>
              {rule.description}
            </p>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 10,
                borderTop: '1px solid var(--color-slate-100)',
                fontSize: '0.75rem',
                color: 'var(--color-slate-500)',
              }}
            >
              Escalates to: <strong>{rule.escalateTo}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Active Escalation Incidents */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: '#dc2626' }} />
            <h3 className="card-title" style={{ color: '#991b1b' }}>
              Active Escalation &amp; Breached Incidents
            </h3>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626' }}>
            {MOCK_ESCALATIONS.length} Breaches Detected
          </span>
        </div>

        <div style={{ padding: '0 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_ESCALATIONS.map(esc => (
            <div
              key={esc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: 8,
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>
                    {esc.ticket_number}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                    {esc.title}
                  </span>
                  <PriorityBadge priority={esc.priority} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 4 }}>
                  Department: {esc.department} • Responsible Employee: <strong>{esc.responsible_employee_name}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>
                    {esc.hours_elapsed}h elapsed
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#991b1b' }}>
                    SLA Max: {esc.sla_limit_hours}h
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/tickets/${esc.ticket_number}`)}
                >
                  Inspect Issue
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
