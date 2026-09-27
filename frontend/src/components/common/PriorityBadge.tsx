import React from 'react';
import { TicketPriority } from '../../types';
import { ArrowDown, Minus, ArrowUp, AlertTriangle } from 'lucide-react';

export interface PriorityBadgeProps {
  priority: TicketPriority;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true }) => {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'LOW':
        return {
          label: 'Low',
          className: 'priority-badge-low',
          icon: <ArrowDown size={12} />,
        };
      case 'MEDIUM':
        return {
          label: 'Medium',
          className: 'priority-badge-medium',
          icon: <Minus size={12} />,
        };
      case 'HIGH':
        return {
          label: 'High',
          className: 'priority-badge-high',
          icon: <ArrowUp size={12} />,
        };
      case 'CRITICAL':
        return {
          label: 'Critical',
          className: 'priority-badge-urgent',
          icon: <AlertTriangle size={12} />,
        };
      default:
        return {
          label: String(priority),
          className: 'priority-badge-medium',
          icon: <Minus size={12} />,
        };
    }
  };

  const { label, className, icon } = getPriorityConfig();

  return (
    <span className={`badge ${className}`}>
      {showIcon && icon}
      {label}
    </span>
  );
};
