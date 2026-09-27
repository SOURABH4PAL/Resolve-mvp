import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Modal } from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { TicketStatus, TicketPriority } from '../types';
import {
  ArrowLeft,
  Building,
  User,
  Calendar,
  Clock,
  Paperclip,
  Send,
  Lock,
  Flame,
  FileCheck,
  CheckCircle2,
  CheckCheck,
  RotateCcw,
  ArrowRightLeft,
  AlertTriangle,
  Download,
  UploadCloud,
} from 'lucide-react';

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, allUsers } = useAuth();
  const {
    tickets,
    getTicketById,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addComment,
    addAttachment,
  } = useTickets();

  const ticket = getTicketById(id || '');

  // Form states
  const [commentText, setCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [escalationReason, setEscalationReason] = useState('');
  const [escalated, setEscalated] = useState(false);

  if (!ticket) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">Ticket Not Found</h3>
        <p className="empty-state-text">
          No ticket matching "{id}" could be located in ResolveHub.
        </p>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isStaff = currentUser?.role === 'RESOLVER' || currentUser?.role === 'SUPER_ADMIN';
  const isCreator = currentUser?.id === ticket.created_by;

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(ticket.id, commentText, isInternalNote);
    setCommentText('');
    setIsInternalNote(false);
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    updateTicketStatus(ticket.id, newStatus);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateTicketPriority(ticket.id, e.target.value as TicketPriority);
  };

  const handleAssignConfirm = () => {
    if (!selectedAssignee) return;
    assignTicket(ticket.id, selectedAssignee);
    setAssignModalOpen(false);
  };

  const handleConfirmEscalation = () => {
    if (!escalationReason.trim()) return;
    setEscalated(true);
    setEscalateModalOpen(false);
    addComment(
      ticket.id,
      `[USER ESCALATION]: Ticket highlighted by ${currentUser?.name}. Reason: ${escalationReason.trim()}`,
      false
    );
  };

  const handleSimulatedAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const sizeStr = `${(file.size / 1024).toFixed(0)} KB`;
      addAttachment(ticket.id, file.name, sizeStr);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const resolverOptions = allUsers.map(u => ({
    value: u.id,
    label: `${u.name} (${u.role.replace('_', ' ')} - ${u.department_name})`,
  }));

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto' }}>
      {/* Top Navigation Back Button */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-slate-600)',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          Back to list
        </button>
      </div>

      {/* Main Ticket Header Card */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          borderLeft: `4px solid ${
            ticket.priority === 'URGENT'
              ? '#ef4444'
              : ticket.priority === 'HIGH'
              ? '#f97316'
              : 'var(--color-primary-600)'
          }`,
        }}
      >
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: 'var(--color-primary-700)',
                  }}
                >
                  {ticket.ticket_number}
                </span>
                <span style={{ color: 'var(--color-slate-300)' }}>•</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-600)' }}>
                  {ticket.department_name}
                </span>
                <span style={{ color: 'var(--color-slate-300)' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                  {ticket.category_name}
                </span>
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-slate-900)', lineHeight: 1.35 }}>
                {ticket.title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          {/* Workflow Action Bar */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--color-slate-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Status change buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
                Lifecycle:
              </span>

              {ticket.status === 'OPEN' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Clock size={14} />}
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                >
                  Mark In Progress
                </Button>
              )}

              {ticket.status === 'IN_PROGRESS' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 size={14} />}
                  onClick={() => handleStatusChange('RESOLVED')}
                >
                  Mark Resolved
                </Button>
              )}

              {ticket.status === 'RESOLVED' && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCheck size={14} />}
                    onClick={() => handleStatusChange('CLOSED')}
                  >
                    Confirm & Close
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RotateCcw size={14} />}
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                  >
                    Reopen Issue
                  </Button>
                </>
              )}

              {ticket.status === 'CLOSED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw size={14} />}
                  onClick={() => handleStatusChange('OPEN')}
                >
                  Reopen Ticket
                </Button>
              )}

              {/* Assign button */}
              {isStaff && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowRightLeft size={14} />}
                  onClick={() => setAssignModalOpen(true)}
                >
                  {ticket.assigned_to ? 'Reassign' : 'Assign Resolver'}
                </Button>
              )}
            </div>

            {/* User Highlight / Escalate Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isCreator && ticket.status !== 'CLOSED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Flame size={14} style={{ color: '#ef4444' }} />}
                  onClick={() => setEscalateModalOpen(true)}
                  disabled={escalated}
                >
                  {escalated ? 'Ticket Escalated' : 'Highlight / Escalate'}
                </Button>
              )}

              {/* Change Priority dropdown (Staff / Admin) */}
              {isStaff && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>Priority:</span>
                  <select
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: 110 }}
                    value={ticket.priority}
                    onChange={handlePriorityChange}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Conversation vs Sidebar Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Issue Description Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Issue Description</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.925rem', color: 'var(--color-slate-800)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Paperclip size={18} style={{ color: 'var(--color-primary-600)' }} />
                <h3 className="card-title">Supporting Attachments</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
                  ({ticket.attachments?.length || 0})
                </span>
              </div>

              {/* Add attachment button */}
              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: 'pointer', margin: 0 }}
              >
                <UploadCloud size={14} />
                Attach File
                <input
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleSimulatedAttachment}
                />
              </label>
            </div>

            <div className="card-body">
              {!ticket.attachments || ticket.attachments.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)', textAlign: 'center', padding: '16px 0' }}>
                  No files attached to this ticket.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {ticket.attachments.map(att => (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'var(--color-slate-50)',
                        border: '1px solid var(--color-slate-200)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileCheck size={18} style={{ color: 'var(--color-primary-600)' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-slate-900)' }}>
                            {att.file_name}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                            {att.file_size} • Stored on OneDrive: <span style={{ fontFamily: 'monospace' }}>{att.file_path}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Download size={14} />}
                        onClick={() => alert(`Simulated downloading ${att.file_name} from OneDrive reference.`)}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Discussion & Comments */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Activity & Discussion</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                {ticket.comments?.length || 0} messages
              </span>
            </div>

            <div className="card-body">
              {/* Comment Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                {(!ticket.comments || ticket.comments.length === 0) ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)', textAlign: 'center', padding: '16px 0' }}>
                    No comments yet. Start the conversation below.
                  </div>
                ) : (
                  ticket.comments.map(c => {
                    const isStaffComment = c.user_role === 'RESOLVER' || c.user_role === 'SUPER_ADMIN';
                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-lg)',
                          backgroundColor: c.is_internal ? '#fffbeb' : '#ffffff',
                          border: c.is_internal ? '1px dashed #fde68a' : '1px solid var(--color-slate-200)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-slate-900)' }}>
                              {c.user_name}
                            </span>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: isStaffComment ? 'var(--color-primary-100)' : 'var(--color-slate-100)',
                                color: isStaffComment ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
                              }}
                            >
                              {c.user_role.replace('_', ' ')}
                            </span>
                            {c.is_internal && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: '#92400e',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <Lock size={11} /> Internal Note
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                            {formatDate(c.created_at)}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {c.comment}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleSendComment}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <textarea
                    className="form-textarea"
                    placeholder="Type your response or update..."
                    rows={3}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  {isStaff ? (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        color: 'var(--color-slate-600)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={e => setIsInternalNote(e.target.checked)}
                      />
                      <span>Internal staff note (hidden from employees)</span>
                    </label>
                  ) : <div />}

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!commentText.trim()}
                    rightIcon={<Send size={14} />}
                  >
                    Post Message
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metadata Card */}
          <div className="card">
            <div className="card-header">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ticket Information</h4>
            </div>
            <div className="card-body" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Derived Department
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-slate-800)' }}>
                  <Building size={14} style={{ color: 'var(--color-primary-600)' }} />
                  {ticket.department_name}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Issue Category
                </span>
                <div style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
                  {ticket.category_name}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Reported By
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-slate-800)' }}>
                  <User size={14} style={{ color: 'var(--color-slate-500)' }} />
                  {ticket.creator_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                  {ticket.creator_email}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Assigned Resolver
                </span>
                <div style={{ fontWeight: 600, color: ticket.assignee_name ? 'var(--color-slate-900)' : 'var(--color-slate-400)' }}>
                  {ticket.assignee_name || 'Unassigned'}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-slate-100)', paddingTop: 10 }}>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Created At
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-slate-600)' }}>
                  <Calendar size={13} />
                  {formatDate(ticket.created_at)}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Last Updated
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-slate-600)' }}>
                  <Clock size={13} />
                  {formatDate(ticket.updated_at)}
                </div>
              </div>

              {ticket.resolved_at && (
                <div>
                  <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                    Resolved At
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontWeight: 600 }}>
                    <CheckCircle2 size={13} />
                    {formatDate(ticket.resolved_at)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assignee Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Resolver to ${ticket.ticket_number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!selectedAssignee} onClick={handleAssignConfirm}>
              Assign Resolver
            </Button>
          </>
        }
      >
        <Select
          label="Select Staff Resolver"
          placeholder="-- Choose Resolver --"
          value={selectedAssignee}
          onChange={e => setSelectedAssignee(e.target.value)}
          options={resolverOptions}
          required
        />
      </Modal>

      {/* Escalation Modal (BRD Section 6.6) */}
      <Modal
        isOpen={escalateModalOpen}
        onClose={() => setEscalateModalOpen(false)}
        title="Highlight / Escalate Ticket"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEscalateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!escalationReason.trim()}
              onClick={handleConfirmEscalation}
            >
              Confirm Escalation
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem',
              color: '#92400e',
              display: 'flex',
              gap: 8,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>
              Per BRD Section 6.6: Highlighting notifies department resolver leads and supervisors that this issue has not been solved within the expected timeframe.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label required">Reason for Escalation</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Critical customer presentation in 2 hours and network connectivity is still broken..."
              rows={3}
              value={escalationReason}
              onChange={e => setEscalationReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
