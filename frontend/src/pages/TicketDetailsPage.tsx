import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { SlaBadge } from '../components/common/SlaBadge';
import { EmployeeName } from '../components/common/EmployeeName';
import { Modal } from '../components/common/Modal';
import { Ticket, TicketStatus, TicketComment, TicketAttachment, TicketJourneyEvent } from '../types';
import {
  ArrowLeft,
  Building,
  User,
  Calendar,
  Clock,
  Paperclip,
  Send,
  Lock,
  Unlock,
  FileCheck,
  CheckCircle2,
  CheckCheck,
  RotateCcw,
  Download,
  UploadCloud,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  History,
  Tag,
  ArrowRight,
} from 'lucide-react';

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useAuth();
  const {
    getTicketById,
    updateTicketStatus,
    resolveTicket,
    closeTicket,
    reopenTicket,
    blockTicket,
    unblockTicket,
    getTicketJourney,
    getComments,
    addComment,
    getAttachments,
    uploadAttachment,
  } = useTickets();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [journeyEvents, setJourneyEvents] = useState<TicketJourneyEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [commentText, setCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Blocking Modal State
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [unblockModalOpen, setUnblockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockError, setBlockError] = useState<string | null>(null);
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);

  // Reopen Modal State
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopening, setIsReopening] = useState(false);

  const loadTicketData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const ticketData = await getTicketById(id);
      setTicket(ticketData);

      // Load comments, attachments, and journey events in parallel
      const [commentsData, attachmentsData, journeyData] = await Promise.all([
        getComments(ticketData.id).catch(() => []),
        getAttachments(ticketData.id).catch(() => []),
        getTicketJourney(ticketData.id).catch(() => []),
      ]);
      setComments(commentsData || []);
      setAttachments(attachmentsData || []);
      setJourneyEvents(journeyData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load ticket details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id, getTicketById, getComments, getAttachments, getTicketJourney]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-slate-500)' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Loading ticket details and journey history...</p>
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
        <Button variant="primary" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    );
  }

  const isAssigned = currentUser?.id === ticket.assigned_to || currentUser?.employee_id === ticket.assigned_to;
  const isCreator = currentUser?.id === ticket.created_by;
  const canManageTicket = isSuperAdmin || isAssigned;
  const isStaff = canManageTicket;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    try {
      const newComment = await addComment(ticket.id, commentText.trim(), isInternalNote);
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      setIsInternalNote(false);
      // Refresh journey
      const freshJourney = await getTicketJourney(ticket.id).catch(() => []);
      setJourneyEvents(freshJourney);
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
      const [freshComments, freshJourney] = await Promise.all([
        getComments(ticket.id).catch(() => []),
        getTicketJourney(ticket.id).catch(() => []),
      ]);
      setComments(freshComments || []);
      setJourneyEvents(freshJourney || []);
    } catch (err: unknown) {
      console.error('Failed to update status:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update status on server.';
      alert(msg);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConfirmReopen = async () => {
    setIsReopening(true);
    try {
      const updated = await reopenTicket(ticket.id, reopenReason.trim() || undefined);
      setTicket(updated);
      setReopenModalOpen(false);
      setReopenReason('');
      const [freshComments, freshJourney] = await Promise.all([
        getComments(ticket.id).catch(() => []),
        getTicketJourney(ticket.id).catch(() => []),
      ]);
      setComments(freshComments || []);
      setJourneyEvents(freshJourney || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reopen ticket.';
      alert(msg);
    } finally {
      setIsReopening(false);
    }
  };

  const handleConfirmBlock = async () => {
    if (!blockReason.trim()) {
      setBlockError('A clear reason is required to block a ticket.');
      return;
    }
    setIsSubmittingBlock(true);
    setBlockError(null);
    try {
      const updated = await blockTicket(ticket.id, blockReason.trim());
      setTicket(updated);
      setBlockModalOpen(false);
      setBlockReason('');
      const [freshComments, freshJourney] = await Promise.all([
        getComments(ticket.id).catch(() => []),
        getTicketJourney(ticket.id).catch(() => []),
      ]);
      setComments(freshComments || []);
      setJourneyEvents(freshJourney || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to block ticket.';
      setBlockError(msg);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleConfirmUnblock = async () => {
    setIsSubmittingBlock(true);
    setBlockError(null);
    try {
      const updated = await unblockTicket(ticket.id);
      setTicket(updated);
      setUnblockModalOpen(false);
      const [freshComments, freshJourney] = await Promise.all([
        getComments(ticket.id).catch(() => []),
        getTicketJourney(ticket.id).catch(() => []),
      ]);
      setComments(freshComments || []);
      setJourneyEvents(freshJourney || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unblock ticket.';
      setBlockError(msg);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.docx', '.xlsx', '.csv', '.doc'];
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incoming = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errorMsgs: string[] = [];

      for (const f of incoming) {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          errorMsgs.push(`"${f.name}" has an unsupported format. Supported: PDF, PNG, JPG, TXT, DOCX, XLSX, CSV.`);
          continue;
        }
        if (f.size > MAX_FILE_SIZE_BYTES) {
          errorMsgs.push(`"${f.name}" exceeds the 10MB limit.`);
          continue;
        }
        if (f.size === 0) {
          errorMsgs.push(`"${f.name}" is an empty file.`);
          continue;
        }
        validFiles.push(f);
      }

      if (errorMsgs.length > 0) {
        alert(errorMsgs.join('\n'));
      }

      if (validFiles.length > 0) {
        setIsUploading(true);
        try {
          for (const f of validFiles) {
            const newAtt = await uploadAttachment(ticket.id, f);
            setAttachments(prev => [...prev, newAtt]);
          }
        } catch (err: unknown) {
          console.error('Failed to upload file(s):', err);
          const msg = err instanceof Error ? err.message : 'File upload failed.';
          alert(`File upload failed: ${msg}`);
        } finally {
          setIsUploading(false);
        }
      }
      e.target.value = '';
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

  const departmentName = ticket.category?.department?.name || 'General';
  const categoryName = ticket.category?.name || 'Unspecified';
  const creatorName = ticket.creator?.name || 'Employee';
  const creatorEmail = ticket.creator?.email || '—';
  const assigneeName = ticket.assignee?.name || (ticket.assigned_to ? 'Assigned' : 'Unassigned');

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Navigation Back Button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--color-slate-600)',
            fontSize: '0.85rem',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      {/* Blocked Ticket Notice Banner */}
      {ticket.is_blocked && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '2px solid #f87171',
            borderRadius: 12,
            boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.1)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ padding: 8, borderRadius: 8, backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b' }}>
                This Ticket is Blocked
              </div>
              <div style={{ fontSize: '0.85rem', color: '#b91c1c', marginTop: 3 }}>
                Reason: <strong>{ticket.blocked_reason || 'Administrative hold'}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#7f1d1d', marginTop: 2 }}>
                Blocked at {formatDate(ticket.blocked_at)} • All status transitions and reassignments are suspended until unblocked.
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Unlock size={14} />}
              onClick={() => {
                setBlockError(null);
                setUnblockModalOpen(true);
              }}
              style={{ backgroundColor: '#059669', borderColor: '#047857' }}
            >
              Unblock Ticket
            </Button>
          )}
        </div>
      )}

      {/* Main Ticket Header Card */}
      <div
        className="card"
        style={{
          borderLeft: `4px solid ${
            ticket.is_blocked
              ? '#dc2626'
              : ticket.priority === 'CRITICAL'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
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
                {ticket.is_blocked && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Lock size={11} /> BLOCKED
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-slate-900)', lineHeight: 1.35, margin: 0 }}>
                {ticket.title}
              </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} isBlocked={ticket.is_blocked} />
              <SlaBadge slaStatus={ticket.sla_status} resolutionDueAt={ticket.resolution_due_at} />
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
                Lifecycle Actions:
              </span>

              {ticket.is_blocked ? (
                <span style={{ fontSize: '0.8rem', color: '#b91c1c', fontStyle: 'italic' }}>
                  Actions suspended while ticket is blocked.
                </span>
              ) : (
                <>
                  {(ticket.status === 'OPEN' || ticket.status === 'ASSIGNED') && canManageTicket && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={statusLoading}
                      leftIcon={<Clock size={14} />}
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                    >
                      Start Progress
                    </Button>
                  )}

                  {ticket.status === 'IN_PROGRESS' && canManageTicket && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={statusLoading}
                      leftIcon={<CheckCircle2 size={14} />}
                      onClick={() => handleStatusChange('RESOLVED')}
                    >
                      Resolve Issue
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
                        Confirm &amp; Close
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={statusLoading}
                        leftIcon={<RotateCcw size={14} />}
                        onClick={() => {
                          setReopenReason('');
                          setReopenModalOpen(true);
                        }}
                      >
                        Reopen Issue
                      </Button>
                    </>
                  )}

                  {ticket.status === 'CLOSED' && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', fontWeight: 500 }}>
                      This ticket is closed and archived.
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Super Admin Block Controls */}
            {isSuperAdmin && (
              <div>
                {ticket.is_blocked ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Unlock size={14} />}
                    onClick={() => {
                      setBlockError(null);
                      setUnblockModalOpen(true);
                    }}
                    style={{ color: '#059669', borderColor: '#a7f3d0' }}
                  >
                    Unblock Ticket
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Lock size={14} />}
                    onClick={() => {
                      setBlockReason('');
                      setBlockError(null);
                      setBlockModalOpen(true);
                    }}
                    style={{ color: '#dc2626' }}
                  >
                    Block Ticket
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Discussion vs Sidebar Meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24, alignItems: 'start' }}>
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

          {/* Ticket Journey Audit Timeline */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={18} style={{ color: 'var(--color-primary-600)' }} />
                <h3 className="card-title">Ticket Journey Timeline</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                {journeyEvents.length} Recorded Milestone{journeyEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="card-body">
              {journeyEvents.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)', textAlign: 'center', padding: '16px 0' }}>
                  No timeline milestones recorded yet.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  {/* Timeline vertical bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 7,
                      top: 8,
                      bottom: 8,
                      width: 2,
                      backgroundColor: '#e2e8f0',
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {journeyEvents.map(event => {
                      let iconColor = 'var(--color-primary-600)';
                      let bulletBg = '#eef2ff';
                      if (event.event_type === 'BLOCKED') {
                        iconColor = '#dc2626';
                        bulletBg = '#fee2e2';
                      } else if (event.event_type === 'UNBLOCKED' || event.event_type === 'RESOLVED') {
                        iconColor = '#059669';
                        bulletBg = '#ecfdf5';
                      } else if (event.event_type === 'CLOSED') {
                        iconColor = '#475569';
                        bulletBg = '#f1f5f9';
                      }

                      return (
                        <div key={event.id} style={{ position: 'relative', paddingLeft: 18 }}>
                          {/* Dot indicator */}
                          <div
                            style={{
                              position: 'absolute',
                              left: -18,
                              top: 3,
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: iconColor,
                              border: '2px solid #ffffff',
                              boxShadow: '0 0 0 2px #e2e8f0',
                            }}
                          />

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  backgroundColor: bulletBg,
                                  color: iconColor,
                                }}
                              >
                                {event.event_type}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                                {event.description}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                              {formatDate(event.created_at)}
                            </span>
                          </div>

                          {(event.old_value || event.new_value) && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: '0.75rem',
                                color: 'var(--color-slate-600)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              {event.old_value && (
                                <span style={{ textDecoration: 'line-through', color: 'var(--color-slate-400)' }}>
                                  {event.old_value}
                                </span>
                              )}
                              {event.old_value && event.new_value && <ArrowRight size={12} />}
                              {event.new_value && (
                                <span style={{ fontWeight: 600, color: 'var(--color-slate-700)' }}>
                                  {event.new_value}
                                </span>
                              )}
                            </div>
                          )}

                          {event.actor?.name && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)', marginTop: 2 }}>
                              By: {event.actor.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--color-slate-400)' }}>
                  PDF, PNG, JPG, TXT, DOCX, XLSX (Max 10MB)
                </span>
                <label
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: isUploading ? 'not-allowed' : 'pointer', margin: 0 }}
                >
                  <UploadCloud size={14} />
                  {isUploading ? 'Uploading...' : 'Attach File(s)'}
                  <input
                    type="file"
                    multiple
                    disabled={isUploading}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
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
              <h3 className="card-title">Activity &amp; Discussion</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                {comments.length} message{comments.length !== 1 ? 's' : ''}
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
                    const isStaffComment = c.user?.role === 'SUPER_ADMIN' || c.user_id === ticket.assigned_to;
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

                        <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={14} style={{ color: 'var(--color-slate-500)', flexShrink: 0 }} />
                  <EmployeeName
                    name={creatorName}
                    email={creatorEmail}
                    maxWidth="200px"
                    showEmailSubtitle={true}
                  />
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Assigned Employee
                </span>
                <div style={{ fontWeight: 600 }}>
                  {ticket.assignee ? (
                    <EmployeeName
                      name={ticket.assignee.name}
                      email={ticket.assignee.email}
                      maxWidth="200px"
                      showEmailSubtitle={true}
                    />
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>Unassigned</span>
                  )}
                </div>
              </div>

              {/* SLA Target in Sidebar */}
              <div style={{ borderTop: '1px solid var(--color-slate-100)', paddingTop: 10 }}>
                <span style={{ color: 'var(--color-slate-400)', display: 'block', marginBottom: 2 }}>
                  Service Level Agreement
                </span>
                <div style={{ marginTop: 4 }}>
                  <SlaBadge slaStatus={ticket.sla_status} resolutionDueAt={ticket.resolution_due_at} />
                </div>
                {ticket.resolution_due_at && (
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)', marginTop: 4 }}>
                    Due: {formatDate(ticket.resolution_due_at)}
                  </div>
                )}
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

      {/* Block Ticket Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Block Ticket (Super Admin)"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setBlockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={isSubmittingBlock}
              onClick={handleConfirmBlock}
            >
              Confirm Block
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', fontWeight: 600 }}>
              <ShieldAlert size={18} />
              <span>Blocking Notice</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#991b1b', marginTop: 4 }}>
              Blocking halts all lifecycle operations until unblocked. This event will be recorded in the Ticket Journey.
            </p>
          </div>

          {blockError && (
            <div style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.8rem' }}>
              {blockError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Reason for Blocking <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={3}
              placeholder="E.g., Pending vendor dependency, waiting for legal clearance, budget approval required..."
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Unblock Ticket Modal */}
      <Modal
        isOpen={unblockModalOpen}
        onClose={() => setUnblockModalOpen(false)}
        title="Unblock Ticket"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setUnblockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmittingBlock}
              onClick={handleConfirmUnblock}
            >
              Confirm Unblock
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)' }}>
            Are you sure you want to unblock ticket <strong>{ticket.ticket_number}</strong>?
          </p>
          {ticket.blocked_reason && (
            <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-slate-500)' }}>Current reason: </span>
              <span style={{ fontWeight: 500, color: 'var(--color-slate-800)' }}>{ticket.blocked_reason}</span>
            </div>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
            Unblocking will restore normal assignment and lifecycle progress.
          </p>
        </div>
      </Modal>

      {/* Reopen Ticket Modal */}
      <Modal
        isOpen={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        title="Reopen Issue"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setReopenModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isReopening}
              onClick={handleConfirmReopen}
            >
              Confirm Reopen
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-700)' }}>
            Reopening will transition this resolved ticket back to <strong>In Progress</strong> and notify the assigned employee.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-slate-700)' }}>
              Reason for Reopening (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Explain why the issue requires further work..."
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
