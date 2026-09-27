import React from 'react';
import { Ticket } from '../../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { MessageSquare, Paperclip, User, Building, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/tickets/${ticket.ticket_number}`);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="ticket-card" onClick={handleClick} role="button" tabIndex={0}>
      <div className="ticket-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="ticket-id">{ticket.ticket_number}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>•</span>
          <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--color-slate-600)' }}>
            {ticket.department_name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <h4 className="ticket-card-title">{ticket.title}</h4>

      <p style={{
        fontSize: '0.85rem',
        color: 'var(--color-slate-600)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: 1.45,
      }}>
        {ticket.description}
      </p>

      <div className="ticket-card-meta">
        <div className="ticket-meta-item">
          <Building size={14} />
          <span>{ticket.category_name}</span>
        </div>
        <div className="ticket-meta-item">
          <User size={14} />
          <span>{ticket.assignee_name ? `Assigned: ${ticket.assignee_name}` : 'Unassigned'}</span>
        </div>
        <div className="ticket-meta-item">
          <Calendar size={14} />
          <span>{formatDate(ticket.created_at)}</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="ticket-meta-item" title={`${ticket.attachments.length} attachments`}>
              <Paperclip size={14} />
              <span>{ticket.attachments.length}</span>
            </div>
          )}
          {ticket.comments && ticket.comments.length > 0 && (
            <div className="ticket-meta-item" title={`${ticket.comments.length} comments`}>
              <MessageSquare size={14} />
              <span>{ticket.comments.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
