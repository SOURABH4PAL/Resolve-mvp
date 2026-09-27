import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Ticket, TicketStatus, TicketComment, TicketAttachment } from '../types';
import {
  ArrowLeft,
  Building,
  User,
  Calendar,
  Clock,
  Paperclip,
  Send,
  Lock,
  FileCheck,
  CheckCircle2,
  CheckCheck,
  RotateCcw,
  Download,
  UploadCloud,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const {
    getTicketById,
    updateTicketStatus,
    resolveTicket,
    closeTicket,
    getComments,
    addComment,
    getAttachments,
    uploadAttachment,
  } = useTickets();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [commentText, setCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadTicketData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const ticketData = await getTicketById(id);
      setTicket(ticketData);

      // Load comments & attachments in parallel
      const [commentsData, attachmentsData] = await Promise.all([
        getComments(ticketData.id).catch(() => []),
        getAttachments(ticketData.id).catch(() => []),
      ]);
      setComments(commentsData || []);
      setAttachments(attachmentsData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load ticket details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id, getTicketById, getComments, getAttachments]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-slate-500)' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Loading ticket details from backend...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="empty-state">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <h3 className="empty-state-title">Ticket Not Found</h3>
        <p className="empty-state-text">
          {error || `No ticket matching "${id}" could be located on the server.`}
        </p>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isStaff = currentUser?.role === 'RESOLVER' || currentUser?.role === 'SUPER_ADMIN';

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    try {
      const newComment = await addComment(ticket.id, commentText.trim(), isInternalNote);
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      setIsInternalNote(false);
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to post comment to server.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    setStatusLoading(true);
    try {
      let updated: Ticket;
      if (newStatus === 'RESOLVED') {
        updated = await resolveTicket(ticket.id, 'Issue resolved by staff.');
      } else if (newStatus === 'CLOSED') {
        updated = await closeTicket(ticket.id);
      } else {
        updated = await updateTicketStatus(ticket.id, newStatus);
      }
      setTicket(updated);
      // Reload comments to reflect system status comment created by backend
      const freshComments = await getComments(ticket.id);
      setComments(freshComments || []);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status on server.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const newAtt = await uploadAttachment(ticket.id, file);
        setAttachments(prev => [...prev, newAtt]);
      } catch (err) {
        console.error('Failed to upload file:', err);
        alert('File upload failed. Ensure size is within 10MB limit.');
      } finally {
        setIsUploading(false);
      }
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

  const departmentName = ticket.category?.department?.name || 'Department';
  const categoryName = ticket.category?.name || 'General';
  const creatorName = ticket.creator?.name || 'Employee';
  const creatorEmail = ticket.creator?.email || '—';
  const assigneeName = ticket.assignee?.name || (ticket.assigned_to ? 'Assigned' : 'Unassigned');

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
            ticket.priority === 'CRITICAL'
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
                  {departmentName}
                </span>
                <span style={{ color: 'var(--color-slate-300)' }}>•</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                  {categoryName}
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

              {(ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={statusLoading}
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
                  isLoading={statusLoading}
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
                    isLoading={statusLoading}
                    leftIcon={<CheckCheck size={14} />}
                    onClick={() => handleStatusChange('CLOSED')}
                  >
                    Confirm & Close
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={statusLoading}
                    leftIcon={<RotateCcw size={14} />}
                    onClick={() => handleStatusChange('REOPENED')}
                  >
                    Reopen Issue
                  </Button>
                </>
              )}

              {ticket.status === 'CLOSED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={statusLoading}
                  leftIcon={<RotateCcw size={14} />}
                  onClick={() => handleStatusChange('REOPENED')}
                >
                  Reopen Ticket
                </Button>
              )}

              {ticket.status === 'REOPENED' && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={statusLoading}
                  leftIcon={<Clock size={14} />}
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                >
                  Resume Work
                </Button>
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
                  ({attachments.length})
                </span>
              </div>

              {/* Add attachment button */}
              <label
                className="btn btn-secondary btn-sm"
                style={{ cursor: isUploading ? 'not-allowed' : 'pointer', margin: 0 }}
              >
                <UploadCloud size={14} />
                {isUploading ? 'Uploading...' : 'Attach File'}
                <input
                  type="file"
                  disabled={isUploading}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <div className="card-body">
              {attachments.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)', textAlign: 'center', padding: '16px 0' }}>
                  No files attached to this ticket.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                  {attachments.map(att => (
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
                            {(att.file_size / 1024).toFixed(0)} KB • Uploaded by {att.uploader?.name || 'User'}
                          </div>
                        </div>
                      </div>

                      <a
                        href={`/api/attachments/${att.id}/download`}
                        download={att.file_name}
                        className="btn btn-ghost btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Download size={14} />
                        Download
                      </a>
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
                {comments.length} messages
              </span>
            </div>

            <div className="card-body">
              {/* Comment Thread */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                {comments.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)', textAlign: 'center', padding: '16px 0' }}>
                    No comments yet. Start the conversation below.
                  </div>
                ) : (
                  comments.map(c => {
                    const isStaffComment = c.user?.role === 'RESOLVER' || c.user?.role === 'SUPER_ADMIN';
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
                              {c.user?.name || 'User'}
                            </span>
                            {c.user?.role && (
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
                                {c.user.role.replace('_', ' ')}
                              </span>
                            )}
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
                          {c.content}
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
                    isLoading={isPostingComment}
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
                  {departmentName}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Issue Category
                </span>
                <div style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
                  {categoryName}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Reported By
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-slate-800)' }}>
                  <User size={14} style={{ color: 'var(--color-slate-500)' }} />
                  {creatorName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 2 }}>
                  {creatorEmail}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Assigned Resolver
                </span>
                <div style={{ fontWeight: 600, color: ticket.assignee ? 'var(--color-slate-900)' : 'var(--color-slate-400)' }}>
                  {assigneeName}
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
    </div>
  );
};
