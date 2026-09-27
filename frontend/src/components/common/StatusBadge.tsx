import React from 'react';
import { TicketStatus } from '../../types';
import { Clock, CheckCircle2, AlertCircle, CheckCheck } from 'lucide-react';

export interface StatusBadgeProps {
  status: TicketStatus;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Open',
          className: 'status-badge-open',
          icon: <AlertCircle size={12} />,
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          className: 'status-badge-in_progress',
          icon: <Clock size={12} />,
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
      default:
        return {
          label: status,
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
