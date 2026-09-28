import React from 'react';
import { useTickets } from '../context/TicketContext';
import { BarChart3, TrendingUp, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const { tickets, departments } = useTickets();

  const total = tickets.length;
  const resolved = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="page-subtitle">
            Executive performance indicators, turnaround metrics, and organizational resolution trends.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="stat-val">{resolutionRate}%</div>
            <div className="stat-label">Resolution Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-val">3.2 hrs</div>
            <div className="stat-label">Avg. First Response</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val">14.6 hrs</div>
            <div className="stat-label">Avg. Resolution Time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="stat-val">94.2%</div>
            <div className="stat-label">SLA Compliance</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 16 }}>
          Department Ticket Distribution
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {departments.map(dept => {
            const count = tickets.filter(
              t => t.category?.department_id === dept.id || t.category?.department?.name === dept.name
            ).length;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={dept.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>{dept.name}</span>
                  <span style={{ color: 'var(--color-slate-500)' }}>
                    {count} tickets ({pct}%)
                  </span>
                </div>
                <div style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: 'var(--color-primary-600)',
                      borderRadius: 5,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
