import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { TicketPriority, Subcategory } from '../types';
import { api } from '../api/client';
import {
  UploadCloud,
  X,
  Paperclip,
  CheckCircle,
  Building,
  Info,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const CreateTicketPage: React.FC = () => {
  const { categories, departments, createTicket, uploadAttachment } = useTickets();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (categoryId) {
      api.get<Subcategory[]>(`/subcategories?category_id=${categoryId}`)
        .then(subs => {
          if (Array.isArray(subs)) {
            setSubcategories(subs);
          } else {
            setSubcategories([]);
          }
        })
        .catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
      setSubcategoryId('');
    }
  }, [categoryId]);

  // Filter categories by selected department if chosen, or show all
  const availableCategories = departmentId
    ? categories.filter(c => c.department_id === departmentId)
    : categories;

  const handleDepartmentChange = (deptId: string) => {
    setDepartmentId(deptId);
    setCategoryId('');
    setSubcategoryId('');
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    setSubcategoryId('');
    if (catId) {
      const cat = categories.find(c => c.id === catId);
      if (cat && !departmentId) {
        setDepartmentId(cat.department_id);
      }
    }
  };

  const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.docx', '.xlsx', '.csv', '.doc'];
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const incoming = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errorMsgs: string[] = [];

      for (const f of incoming) {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          errorMsgs.push(`"${f.name}" has an unsupported format. Supported formats: PDF, PNG, JPG, TXT, DOCX, XLSX, CSV.`);
          continue;
        }
        if (f.size > MAX_FILE_SIZE_BYTES) {
          errorMsgs.push(`"${f.name}" exceeds the 10MB limit (${(f.size / (1024 * 1024)).toFixed(1)}MB).`);
          continue;
        }
        if (f.size === 0) {
          errorMsgs.push(`"${f.name}" is an empty file.`);
          continue;
        }
        validFiles.push(f);
      }

      if (errorMsgs.length > 0) {
        setServerError(errorMsgs.join(' '));
      } else {
        setServerError(null);
      }

      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'Ticket title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    }

    if (!description.trim()) {
      newErrors.description = 'Please provide a clear description of the issue';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Description should provide sufficient context (at least 10 characters)';
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
        category_id: categoryId || null,
        subcategory_id: subcategoryId || null,
        priority,
      });

      // Upload attachments if selected
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
      const msg = err instanceof Error ? err.message : 'Failed to submit ticket. Please try again.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Submit Ticket</h1>
          <p className="page-subtitle">
            Create an internal support ticket. You can choose a specific department/category or leave it as "Any / Not Specified" for administrative triage.
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
            <h3 className="card-title">Ticket Information</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <Input
                label="Ticket Title"
                placeholder="e.g. Dual monitor flickering when connected to docking station"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                error={errors.title}
                hint="Provide a concise, descriptive summary of the problem."
              />

              {/* Department & Category Selects with 'Any' support */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Select
                  label="Department"
                  placeholder="Any / Not Specified"
                  value={departmentId}
                  onChange={e => handleDepartmentChange(e.target.value)}
                  options={[
                    { value: '', label: 'Any / Not Specified' },
                    ...departments.map(d => ({ value: d.id, label: d.name })),
                  ]}
                />

                <Select
                  label="Category"
                  placeholder="Any / Not Specified"
                  value={categoryId}
                  onChange={e => handleCategoryChange(e.target.value)}
                  options={[
                    { value: '', label: 'Any / Not Specified' },
                    ...availableCategories.map(c => ({
                      value: c.id,
                      label: departmentId
                        ? c.name
                        : `${c.name} (${departments.find(d => d.id === c.department_id)?.name || 'General'})`,
                    })),
                  ]}
                />
              </div>

              {/* Subcategory Select if category chosen */}
              {categoryId && (
                <div style={{ marginTop: 16 }}>
                  <Select
                    label="Subcategory"
                    placeholder="Not Specified"
                    value={subcategoryId}
                    onChange={e => setSubcategoryId(e.target.value)}
                    options={[
                      { value: '', label: 'Not Specified (General)' },
                      ...subcategories.map(s => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </div>
              )}

              {/* Priority Select */}
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label required">Priority</label>
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
                  {priority === 'LOW' && 'Low: Minor issue, workaround available.'}
                  {priority === 'MEDIUM' && 'Medium: Standard operational issue affecting routine work.'}
                  {priority === 'HIGH' && 'High: Serious impact affecting critical operations.'}
                  {priority === 'CRITICAL' && 'Critical: Complete work blockage or major outage.'}
                </span>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label required">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Please describe the issue, error messages encountered, device details, and steps to reproduce..."
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ borderColor: errors.description ? '#ef4444' : undefined }}
                />
                {errors.description && <span className="form-error">{errors.description}</span>}
              </div>

              {/* Attachments */}
              <div className="form-group">
                <label className="form-label">Supporting Attachments</label>
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
                    Choose files or drag &amp; drop here
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: 4 }}>
                    Supported: PDF, PNG, JPG, TXT, DOCX, XLSX, CSV (Max 10MB per file)
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
                          backgroundColor: 'var(--color-slate-100)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.825rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <Paperclip size={14} style={{ color: 'var(--color-slate-500)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <span style={{ color: 'var(--color-slate-400)', fontSize: '0.75rem', flexShrink: 0 }}>
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          style={{ color: 'var(--color-slate-400)', padding: 2 }}
                          title="Remove attachment"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/employee/my-tickets')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Guidelines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Info size={18} style={{ color: 'var(--color-primary-600)' }} />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Submission Guidelines</h4>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--color-slate-600)', lineHeight: 1.6 }}>
              <li>Selecting "Any / Not Specified" routes your ticket to the triage team for department assignment.</li>
              <li>Priority levels guide response and resolution time targets.</li>
              <li>Include screenshots or logs whenever error messages appear.</li>
              <li>Status updates and employee assignments are tracked in your Ticket Journey.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
