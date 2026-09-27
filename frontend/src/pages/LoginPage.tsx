import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchUser, allUsers } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('alex.morgan@dailoqa.internal');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your work email.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const success = login(email);
      setLoading(false);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Select one of the demo accounts below.');
      }
    }, 400);
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    navigate('/dashboard');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-slate-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-slate-200)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '36px 32px 24px',
            textAlign: 'center',
            borderBottom: '1px solid var(--color-slate-100)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 4px 8px rgba(79, 70, 229, 0.25)',
            }}
          >
            <Layers size={24} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
            Welcome to ResolveHub
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', marginTop: 4 }}>
            Unified Multi-Department Issue & Ticket Management
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: '28px 32px' }}>
          <form onSubmit={handleSubmit}>
            <Input
              label="Work Email"
              type="email"
              placeholder="name@dailoqa.internal"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              leftIcon={<Mail size={16} />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              leftIcon={<Lock size={16} />}
            />

            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  marginBottom: 18,
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              rightIcon={<ArrowRight size={16} />}
              style={{ width: '100%', marginTop: 8 }}
            >
              Sign In to ResolveHub
            </Button>
          </form>

          {/* Quick Demo Personas */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--color-slate-100)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 12,
                fontSize: '0.775rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--color-slate-500)',
              }}
            >
              <ShieldCheck size={14} />
              <span>Or 1-Click Demo Login As:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickLogin(user.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-200)',
                    backgroundColor: 'var(--color-slate-50)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                    e.currentTarget.style.borderColor = 'var(--color-primary-200)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-slate-50)';
                    e.currentTarget.style.borderColor = 'var(--color-slate-200)';
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                      {user.department_name}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor:
                        user.role === 'SUPER_ADMIN'
                          ? '#fee2e2'
                          : user.role === 'RESOLVER'
                          ? '#fef3c7'
                          : '#e0e7ff',
                      color:
                        user.role === 'SUPER_ADMIN'
                          ? '#991b1b'
                          : user.role === 'RESOLVER'
                          ? '#92400e'
                          : '#3730a3',
                    }}
                  >
                    {user.role.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
