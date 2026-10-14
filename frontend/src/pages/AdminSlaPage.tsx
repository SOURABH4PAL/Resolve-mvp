import React, { useState, useEffect } from 'react';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Table, Column } from '../components/common/Table';
import { api } from '../api/client';
import { formatDateTime } from '../utils/formatters';
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Bell,
  ArrowUpRight,
  Zap,
} from 'lucide-react';

interface SlaPolicyItem {
  id: string;
  name: string;
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
  is_active: boolean;
}

interface EscalationRecord {
  id: string;
  ticket_id: string;
  escalation_type: string;
  reason: string;
  status: string;
  created_at: string;
}

export const AdminSlaPage: React.FC = () => {
  const { checkSlaEscalations } = useTickets();

  const [policies, setPolicies] = useState<SlaPolicyItem[]>([]);
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [policiesRes, escalationsRes] = await Promise.all([
        api.get<SlaPolicyItem[]>('/sla-policies').catch(() => []),
        api.get<EscalationRecord[]>('/escalations').catch(() => []),
      ]);
      setPolicies(policiesRes || []);
      setEscalations(escalationsRes || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch SLA data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunEscalationCheck = async () => {
    setIsChecking(true);
    setErrorMsg('');
    try {
      const res = await checkSlaEscalations();
      setCheckResult(res);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Escalation check failed');
    } finally {
      setIsChecking(false);
    }
  };

  const policyColumns: Column<SlaPolicyItem>[] = [
    {
      key: 'priority',
      header: 'Priority Tier',
      width: '160px',
      render: p => {
        const colorMap: Record<string, { bg: string; text: string }> = {
          CRITICAL: { bg: '#fee2e2', text: '#991b1b' },
          HIGH: { bg: '#ffedd5', text: '#9a3412' },
          MEDIUM: { bg: '#fef3c7', text: '#92400e' },
          LOW: { bg: '#e0f2fe', text: '#0369a1' },
        };
        const style = colorMap[p.priority] || { bg: '#f1f5f9', text: '#475569' };
        return (
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.8rem',
              backgroundColor: style.bg,
              color: style.text,
            }}
          >
            {p.priority === 'CRITICAL' ? 'URGENT / CRITICAL' : p.priority}
          </span>
        );
      },
    },
    {
      key: 'name',
      header: 'Policy Name',
      render: p => <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{p.name}</span>,
    },
    {
      key: 'first_response_hours',
      header: 'First Response Target',
      width: '180px',
      render: p => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#dc2626' }}>
          <Clock size={15} />
          <span>Within {p.first_response_hours} Hours</span>
        </div>
      ),
    },
    {
      key: 'resolution_hours',
      header: 'Resolution Target',
      width: '180px',
      render: p => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-slate-700)' }}>
          <CheckCircle2 size={15} style={{ color: '#059669' }} />
          <span>Within {p.resolution_hours} Hours</span>
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      width: '110px',
      render: p => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: p.is_active ? '#ecfdf5' : '#f1f5f9',
            color: p.is_active ? '#065f46' : '#64748b',
          }}
        >
          {p.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const escalationColumns: Column<EscalationRecord>[] = [
    {
      key: 'escalation_type',
      header: 'Type',
      width: '180px',
      render: e => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: e.escalation_type === 'SLA_RESPONSE_BREACH' ? '#fef2f2' : '#f5f3ff',
            color: e.escalation_type === 'SLA_RESPONSE_BREACH' ? '#b91c1c' : '#6d28d9',
          }}
        >
          {e.escalation_type}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Escalation Concern & Details',
      render: e => (
        <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-800)' }}>
          {e.reason}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: e => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: e.status === 'OPEN' ? '#fee2e2' : '#f1f5f9',
            color: e.status === 'OPEN' ? '#991b1b' : '#475569',
          }}
        >
          {e.status}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Triggered At',
      width: '160px',
      render: e => (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
          {formatDateTime(e.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">SLA &amp; Escalation Management</h1>
          <p className="page-subtitle">
            Configure Service Level Agreements, turnaround deadlines, and automated breach escalation pathways.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            onClick={loadData}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
          <Button
            variant="primary"
            onClick={handleRunEscalationCheck}
            disabled={isChecking}
            style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          >
            <Zap size={15} />
            <span>{isChecking ? 'Checking Breaches...' : 'Run SLA Escalation Check'}</span>
          </Button>
        </div>
      </div>

      {/* Check Result Banner */}
      {checkResult && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 10,
            backgroundColor: checkResult.newly_escalated_count > 0 ? '#fef2f2' : '#ecfdf5',
            border: `1px solid ${checkResult.newly_escalated_count > 0 ? '#fca5a5' : '#a7f3d0'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '0.95rem', color: checkResult.newly_escalated_count > 0 ? '#991b1b' : '#065f46' }}>
            {checkResult.newly_escalated_count > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span>
              SLA Scan Complete: {checkResult.total_breached_found} breach(es) found &bull; {checkResult.newly_escalated_count} newly escalated
            </span>
          </div>
          {checkResult.escalated_tickets?.length > 0 && (
            <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: 4 }}>
              Escalations raised for ticket(s):{' '}
              {checkResult.escalated_tickets.map((t: any) => `${t.ticket_number} (${t.priority})`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Policy Highlights Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div style={{ padding: '16px 20px', backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Urgent / Critical</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: 'var(--color-slate-900)' }}>4h Response</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>Auto-escalates to Lead/Admin if unresponded</div>
        </div>
        <div style={{ padding: '16px 20px', backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase' }}>High Priority</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: 'var(--color-slate-900)' }}>8h Response</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>24h total resolution window</div>
        </div>
        <div style={{ padding: '16px 20px', backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ca8a04', textTransform: 'uppercase' }}>Medium Priority</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: 'var(--color-slate-900)' }}>24h Response</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>48h total resolution window</div>
        </div>
        <div style={{ padding: '16px 20px', backgroundColor: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>Low Priority</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: 4, color: 'var(--color-slate-900)' }}>48h Response</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: 2 }}>96h total resolution window</div>
        </div>
      </div>

      {/* SLA Policies Table */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-slate-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} style={{ color: 'var(--color-primary-600)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Active SLA Policies &amp; Targets</h2>
        </div>
        <Table<SlaPolicyItem>
          columns={policyColumns}
          data={policies}
          emptyMessage="No SLA policies loaded."
        />
      </div>

      {/* Escalation Audit History */}
      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-slate-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={18} style={{ color: '#dc2626' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Escalation Audit Trail</h2>
        </div>
        <Table<EscalationRecord>
          columns={escalationColumns}
          data={escalations}
          emptyMessage="No active escalations recorded. All tickets are within SLA targets!"
        />
      </div>
    </div>
  );
};
