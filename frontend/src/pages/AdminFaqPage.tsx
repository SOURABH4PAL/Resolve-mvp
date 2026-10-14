import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Eye, ThumbsUp, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { FaqItem } from '../types';
import { api } from '../api/client';
import { useTickets } from '../context/TicketContext';

export const AdminFaqPage: React.FC = () => {
  const { departments, categories } = useTickets();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [categoryName, setCategoryName] = useState('');

  const loadFaqs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<FaqItem[]>('/faqs');
      setFaqs(data || []);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleOpenAddModal = () => {
    setEditingFaq(null);
    setQuestion('');
    setAnswer('');
    setDepartmentName(departments[0]?.name || 'IT Support');
    setCategoryName(categories[0]?.name || 'General');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (faq: FaqItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setDepartmentName(faq.department_name || departments[0]?.name || 'IT Support');
    setCategoryName(faq.category_name || categories[0]?.name || 'General');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setFormError('Question is required.');
      return;
    }
    if (!answer.trim()) {
      setFormError('Answer is required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const foundDept = departments.find(d => d.name === departmentName);
    const foundCat = categories.find(c => c.name === categoryName);

    const payload = {
      question: question.trim(),
      answer: answer.trim(),
      department_id: foundDept?.id || undefined,
      category_id: foundCat?.id || undefined,
      department_name: departmentName || foundDept?.name || 'General',
      category_name: categoryName || foundCat?.name || 'General',
    };

    try {
      if (editingFaq) {
        const updated = await api.put<FaqItem>(`/faqs/${editingFaq.id}`, payload);
        setFaqs(prev => prev.map(f => (f.id === updated.id ? updated : f)));
      } else {
        const created = await api.post<FaqItem>('/faqs', payload);
        setFaqs(prev => [created, ...prev]);
      }
      setModalOpen(false);
      setEditingFaq(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save FAQ.';
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFaq = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this FAQ article?')) {
      try {
        await api.delete('/faqs/' + id);
        setFaqs(prev => prev.filter(f => f.id !== id));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete FAQ.';
        alert(msg);
      }
    }
  };

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">FAQ &amp; Knowledge Base</h1>
          <p className="page-subtitle">
            Manage company knowledge base articles to deflect common employee inquiries.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenAddModal}
        >
          Add FAQ Article
        </Button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 12,
              color: 'var(--color-slate-400)',
            }}
          />
          <input
            type="text"
            placeholder="Search FAQs by question, answer, department..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 38px',
              borderRadius: 6,
              border: '1px solid var(--color-slate-300)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* FAQ Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map(faq => (
            <div
              key={faq.id}
              className="card"
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.725rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    backgroundColor: '#e0e7ff',
                    color: '#3730a3',
                  }}
                >
                  {faq.department_name} • {faq.category_name}
                </span>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={e => handleOpenEditModal(faq, e)}
                    title="Edit FAQ"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-slate-600)',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={e => handleDeleteFaq(faq.id, e)}
                    title="Delete FAQ"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                {faq.question}
              </h4>

              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--color-slate-600)', lineHeight: 1.45 }}>
                {faq.answer}
              </p>

              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 10,
                  borderTop: '1px solid var(--color-slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: '0.75rem',
                  color: 'var(--color-slate-400)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={13} /> {faq.views} views
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ThumbsUp size={13} /> {faq.helpful_count} found helpful
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-slate-500)', gridColumn: '1 / -1' }}>
            No FAQs found. Click &ldquo;Add FAQ Article&rdquo; to create one.
          </div>
        )}
      </div>

      {/* Add / Edit FAQ Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingFaq(null);
        }}
        title={editingFaq ? 'Edit FAQ Article' : 'Add New FAQ Article'}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditingFaq(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveFaq} isLoading={isSaving}>
              {editingFaq ? 'Save Changes' : 'Create FAQ'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveFaq} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {formError && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
              Question *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. How do I request a replacement laptop charger?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
              Answer / Solution *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detailed step-by-step answer..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Department
              </label>
              <select
                value={departmentName}
                onChange={e => setDepartmentName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                {departments.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                Category
              </label>
              <select
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  backgroundColor: '#ffffff',
                }}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
