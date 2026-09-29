import React from 'react';
import { BookOpen, Search, Eye, ThumbsUp, Plus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { MOCK_FAQS } from '../mock/mockData';

export const AdminFaqPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">FAQ &amp; Knowledge Base</h1>
          <p className="page-subtitle">
            Manage company knowledge base articles to deflect common employee inquiries.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {MOCK_FAQS.map(faq => (
          <div key={faq.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        ))}
      </div>
    </div>
  );
};
