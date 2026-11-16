import React from 'react';
import { TicketStatus } from '../../types';
import { Clock, CheckCircle2, AlertCircle, CheckCheck, UserCheck, HelpCircle, RotateCcw, Lock } from 'lucide-react';

export interface StatusBadgeProps {
  status: TicketStatus;
  isBlocked?: boolean;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isBlocked = false, showIcon = true }) => {
  if (isBlocked) {
    return (
      <span className="badge status-badge-blocked" style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
        {showIcon && <Lock size={12} />}
        Blocked
      </span>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Open',
          className: 'status-badge-open',
          icon: <AlertCircle size={12} />,
        };
      case 'ASSIGNED':
        return {
          label: 'Assigned',
          className: 'status-badge-open',
          icon: <UserCheck size={12} />,
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          className: 'status-badge-in_progress',
          icon: <Clock size={12} />,
        };
      case 'WAITING_FOR_USER':
        return {
          label: 'Waiting for User',
          className: 'status-badge-in_progress',
          icon: <HelpCircle size={12} />,
        };
      case 'RESOLVED':
        return {
          label: 'Resolved',
          className: 'status-badge-resolved',
          icon: <CheckCircle2 size={12} />,
        };
      case 'CLOSED':
        return {
          label: 'Closed',
          className: 'status-badge-closed',
          icon: <CheckCheck size={12} />,
        };
      case 'REOPENED':
        return {
          label: 'In Progress',
          className: 'status-badge-in_progress',
          icon: <RotateCcw size={12} />,
        };
      default:
        return {
          label: String(status).replace('_', ' '),
          className: 'status-badge-open',
          icon: <AlertCircle size={12} />,
        };
    }
  };

  const { label, className, icon } = getStatusConfig();

  return (
    <span className={`badge ${className}`}>
      {showIcon && icon}
      {label}
    </span>
  );
};
