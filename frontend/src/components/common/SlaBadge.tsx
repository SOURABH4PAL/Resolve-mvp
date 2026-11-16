import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, MinusCircle } from 'lucide-react';

export interface SlaBadgeProps {
  slaStatus?: string | null;
  remainingHours?: number | null;
  resolutionDueAt?: string | null;
  showIcon?: boolean;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  slaStatus,
  remainingHours: initialRemainingHours,
  resolutionDueAt,
  showIcon = true,
}) => {
  let remainingHours = initialRemainingHours;
  if (remainingHours === undefined && resolutionDueAt) {
    const diffMs = new Date(resolutionDueAt).getTime() - Date.now();
    remainingHours = Math.round(diffMs / (1000 * 60 * 60));
  }

  const norm = (slaStatus || 'NO_SLA').toUpperCase();

  let label = 'Within SLA';
  let bg = '#ecfdf5';
  let color = '#065f46';
  let border = '#a7f3d0';
  let icon = <CheckCircle2 size={12} />;

  if (norm === 'BREACHED' || norm === 'SLA_BREACHED') {
    label = 'SLA Breached';
    bg = '#fef2f2';
    color = '#991b1b';
    border = '#fecaca';
    icon = <AlertOctagon size={12} />;
  } else if (norm === 'AT_RISK' || norm === 'SLA_AT_RISK') {
    label = 'SLA At Risk';
    bg = '#fffbeb';
    color = '#92400e';
    border = '#fde68a';
    icon = <AlertTriangle size={12} />;
  } else if (norm === 'NO_SLA' || norm === 'NONE') {
    label = 'No SLA Policy';
    bg = '#f1f5f9';
    color = '#64748b';
    border = '#e2e8f0';
    icon = <MinusCircle size={12} />;
  }

  return (
    <span
      className="badge"
      style={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: '0.725rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        whiteSpace: 'nowrap',
      }}
      title={remainingHours !== undefined && remainingHours !== null ? `${remainingHours > 0 ? `${remainingHours}h remaining` : `Breached by ${Math.abs(remainingHours)}h`}` : undefined}
    >
      {showIcon && icon}
      <span>{label}</span>
      {remainingHours !== undefined && remainingHours !== null && (
        <span style={{ fontSize: '0.675rem', opacity: 0.85 }}>
          ({remainingHours > 0 ? `${remainingHours}h left` : 'Breached'})
        </span>
      )}
    </span>
  );
};
