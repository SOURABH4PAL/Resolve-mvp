import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { TicketPriority } from '../types';
import {
  UploadCloud,
  X,
  Paperclip,
  CheckCircle,
  Building,
  Info,
  AlertCircle,
} from 'lucide-react';

export const CreateTicketPage: React.FC = () => {
  const { categories, departments, createTicket, uploadAttachment } = useTickets();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Filter categories by selected department if chosen, or show all
  const availableCategories = departmentId
    ? categories.filter(c => c.department_id === departmentId)
    : categories;

  const handleDepartmentChange = (deptId: string) => {
    setDepartmentId(deptId);
    setCategoryId('');
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    const cat = categories.find(c => c.id === catId);
    if (cat && !departmentId) {
      setDepartmentId(cat.department_id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Ticket title / subject is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    }

    if (!categoryId) {
      newErrors.category = 'Please select a ticket category';
    }

    if (!description.trim()) {
      newErrors.description = 'Please provide detailed description of the issue';
    } else if (description.trim().length < 15) {
      newErrors.description = 'Description should be detailed (at least 15 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const createdTicket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        priority,
      });

      // Upload any selected attachments
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await uploadAttachment(createdTicket.id, file);
          } catch (uploadErr) {
            console.error(`Failed to upload ${file.name}:`, uploadErr);
          }
        }
      }

      navigate(`/tickets/${createdTicket.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create ticket on server.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === categoryId);
  const selectedDeptObj = departments.find(
    d => d.id === (departmentId || selectedCategoryObj?.department_id)
  );

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create New Ticket</h1>
          <p className="page-subtitle">
            Log an issue with the backend. Real tickets are assigned ticket numbers and routed to departments.
          </p>
        </div>
      </div>

      {serverError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: '#991b1b',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={18} />
          <span>{serverError}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        {/* Ticket Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Issue Details</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <Input
                label="Ticket Title / Subject"
                placeholder="e.g. Dual monitor flickering when connected to docking station"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                error={errors.title}
                hint="Be specific so the responsible team can quickly understand and resolve the problem."
              />

              {/* Department & Category Selects */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Select
                  label="Target Department"
                  placeholder="-- Select Department --"
                  value={departmentId}
                  onChange={e => handleDepartmentChange(e.target.value)}
                  options={departments.map(d => ({ value: d.id, label: d.name }))}
                />

                <Select
                  label="Issue Category"
                  placeholder="-- Select Category --"
                  value={categoryId}
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                  error={errors.category}
                  options={availableCategories.map(c => ({
                    value: c.id,
                    label: departmentId
                      ? c.name
                      : `${c.name} (${departments.find(d => d.id === c.department_id)?.name || 'General'})`,
                  }))}
                />
              </div>

              {/* Priority Select */}
              <div className="form-group">
                <label className="form-label required">Priority Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TicketPriority[]).map(p => {
                    const isSelected = priority === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: 'var(--radius-md)',
                          border: isSelected ? '2px solid var(--color-primary-600)' : '1px solid var(--color-slate-200)',
                          backgroundColor: isSelected ? 'var(--color-primary-50)' : '#ffffff',
                          color: isSelected ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <span className="form-hint" style={{ marginTop: 6 }}>
                  {priority === 'LOW' && 'Low: Minor inconvenience with workaround available.'}
                  {priority === 'MEDIUM' && 'Medium: Normal operational disruption affecting routine work.'}
                  {priority === 'HIGH' && 'High: Serious business impact affecting multiple team deliverables.'}
                  {priority === 'CRITICAL' && 'Critical: Major outage or system blocked requiring immediate attention.'}
                </span>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label required">Detailed Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Please provide steps to reproduce, error codes, device name, or any relevant details..."
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ borderColor: errors.description ? '#ef4444' : undefined }}
                />
                {errors.description && <span className="form-error">{errors.description}</span>}
              </div>

              {/* Attachments */}
              <div className="form-group">
                <label className="form-label">Supporting Documents & Screenshots</label>
                <div
                  style={{
                    border: '2px dashed var(--color-slate-200)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-slate-50)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <UploadCloud size={28} style={{ color: 'var(--color-primary-600)', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                    Drop files here or click to browse
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', marginTop: 4 }}>
                    Max upload size: 10MB (Stored via FastAPI `POST /api/tickets/{'{ticket_id}'}/attachments`)
                  </div>
                </div>

                {/* Uploaded files preview */}
                {selectedFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--color-slate-200)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                          <Paperclip size={14} style={{ color: 'var(--color-primary-600)' }} />
                          <span style={{ fontWeight: 500 }}>{file.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="icon-button"
                          style={{ width: 24, height: 24 }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/my-tickets')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  leftIcon={<CheckCircle size={16} />}
                >
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ backgroundColor: '#ffffff' }}>
            <div className="card-header">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building size={16} style={{ color: 'var(--color-primary-600)' }} />
                Routing Overview
              </h4>
            </div>
            <div className="card-body" style={{ padding: 18, fontSize: '0.8rem', color: 'var(--color-slate-600)' }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>Derived Department:</span>
                <p style={{ marginTop: 2, color: selectedDeptObj ? 'var(--color-primary-700)' : 'var(--color-slate-400)', fontWeight: 500 }}>
                  {selectedDeptObj ? selectedDeptObj.name : 'Select category to auto-derive'}
                </p>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>Department Email:</span>
                <p style={{ marginTop: 2, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {selectedDeptObj ? selectedDeptObj.department_email || 'None specified' : '—'}
                </p>
              </div>
              <div style={{ paddingTop: 10, borderTop: '1px solid var(--color-slate-100)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>Backend API:</span>
                <p style={{ marginTop: 4, lineHeight: 1.4, color: 'var(--color-slate-500)' }}>
                  Submissions create real tickets via <code>POST /api/tickets</code> and generate official sequential ticket IDs.
                </p>
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              backgroundColor: 'var(--color-primary-50)',
              borderColor: 'var(--color-primary-200)',
            }}
          >
            <div className="card-body" style={{ padding: 18, fontSize: '0.8rem', color: 'var(--color-slate-700)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--color-primary-800)', marginBottom: 8 }}>
                <Info size={16} />
                Need quick help?
              </div>
              <p style={{ lineHeight: 1.45 }}>
                Ensure your description includes all context, exact reproduction steps, and any error messages shown.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
