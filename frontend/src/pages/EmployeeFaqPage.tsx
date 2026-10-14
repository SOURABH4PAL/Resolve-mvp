import React, { useState, useEffect } from 'react';
import { Search, BookOpen, ThumbsUp, ChevronDown, ChevronUp, HelpCircle, Building2 } from 'lucide-react';
import { FaqItem } from '../types';
import { api } from '../api/client';

export const EmployeeFaqPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadFaqs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<FaqItem[]>('/faqs');
      const loaded = data || [];
      setFaqs(loaded);
      const votes: Record<string, boolean> = {};
      loaded.forEach(f => {
        if (f.is_voted) votes[f.id] = true;
      });
      setVotedIds(votes);
    } catch (err) {
      console.error('Failed to load FAQs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  // Department list
  const departments = ['ALL', ...Array.from(new Set(faqs.map(f => f.department_name)))];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || faq.department_name === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => {
      const next = prev === id ? null : id;
      if (next) {
        api.post('/faqs/' + id + '/view').catch(() => {});
      }
      return next;
    });
  };

  const handleHelpfulVote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const res = await api.post<{ status: string; helpful_count: number; is_voted: boolean }>('/faqs/' + id + '/upvote');
      setFaqs(prev => prev.map(f => {
        if (f.id === id) {
          return { ...f, helpful_count: res.helpful_count, is_voted: res.is_voted };
        }
        return f;
      }));
      setVotedIds(prev => ({ ...prev, [id]: res.is_voted }));
    } catch (err: unknown) {
      console.error('Failed to vote FAQ:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary-600)', marginBottom: 4 }}>
            <BookOpen size={20} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Help Center &amp; FAQs</span>
          </div>
          <h1 className="page-title">Frequently Asked Questions</h1>
          <p className="page-subtitle">
            Find immediate answers to common HR, IT, Finance, and Facilities questions before raising a ticket.
          </p>
        </div>
      </div>

      {/* Search Bar Banner */}
      <div
        style={{
          position: 'relative',
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          borderRadius: 16,
          boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.25)',
          color: '#ffffff',
        }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0', color: '#ffffff' }}>
          How can we help you today?
        </h2>
        <p style={{ fontSize: '0.875rem', opacity: 0.9, margin: '0 0 18px 0' }}>
          Search for policies, tax documents, hardware replacements, and common issues.
        </p>

        <div style={{ position: 'relative', maxWidth: 640 }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-slate-400)',
            }}
          />
          <input
            type="text"
            placeholder="Search questions, policies, or topics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 46px',
              borderRadius: 10,
              border: 'none',
              fontSize: '0.95rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              color: 'var(--color-slate-900)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          />
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid',
              borderColor: selectedDept === dept ? 'var(--color-primary-600)' : 'var(--color-slate-200)',
              backgroundColor: selectedDept === dept ? 'var(--color-primary-50)' : '#ffffff',
              color: selectedDept === dept ? 'var(--color-primary-700)' : 'var(--color-slate-700)',
              fontWeight: selectedDept === dept ? 600 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {dept === 'ALL' ? 'All Topics' : dept}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map(faq => {
            const isExpanded = expandedId === faq.id;
            const isVoted = votedIds[faq.id];

            return (
              <div
                key={faq.id}
                className="card"
                onClick={() => handleToggleExpand(faq.id)}
                style={{
                  padding: '18px 22px',
                  cursor: 'pointer',
                  border: isExpanded ? '1px solid var(--color-primary-300)' : '1px solid var(--color-slate-200)',
                  boxShadow: isExpanded ? '0 4px 12px rgba(79, 70, 229, 0.08)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        backgroundColor: isExpanded ? 'var(--color-primary-100)' : '#f1f5f9',
                        color: isExpanded ? 'var(--color-primary-700)' : 'var(--color-slate-600)',
                        flexShrink: 0,
                      }}
                    >
                      <HelpCircle size={18} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--color-primary-600)',
                          display: 'block',
                          marginBottom: 2,
                        }}
                      >
                        {faq.department_name} • {faq.category_name}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                        {faq.question}
                      </h3>
                    </div>
                  </div>

                  <div style={{ color: 'var(--color-slate-400)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid var(--color-slate-100)',
                      color: 'var(--color-slate-700)',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                    }}
                  >
                    <p style={{ margin: 0 }}>{faq.answer}</p>

                    <div
                      style={{
                        marginTop: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.775rem',
                        color: 'var(--color-slate-500)',
                      }}
                    >
                      <span>Was this answer helpful?</span>
                      <button
                        onClick={e => handleHelpfulVote(faq.id, e)}
                        title={isVoted ? 'Click to remove upvote' : 'Mark as helpful'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid',
                          borderColor: isVoted ? '#bbf7d0' : 'var(--color-slate-200)',
                          backgroundColor: isVoted ? '#f0fdf4' : '#ffffff',
                          color: isVoted ? '#16a34a' : 'var(--color-slate-700)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <ThumbsUp size={14} /> {faq.helpful_count} {isVoted ? 'Upvoted' : 'Helpful'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-slate-500)' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No FAQs found matching "{searchQuery}".</p>
          </div>
        )}
      </div>
    </div>
  );
};
