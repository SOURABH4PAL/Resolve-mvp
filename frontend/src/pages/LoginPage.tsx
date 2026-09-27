import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    label: 'Employee',
    name: 'Jane Doe',
    email: 'employee@resolvehub.com',
    password: 'Employee123!',
    role: 'EMPLOYEE',
  },
  {
    label: 'IT Resolver',
    name: 'IT Support Resolver',
    email: 'resolver@resolvehub.com',
    password: 'Resolver123!',
    role: 'RESOLVER',
  },
  {
    label: 'Super Admin',
    name: 'Super Admin',
    email: 'admin@resolvehub.com',
    password: 'Admin123!',
    role: 'SUPER_ADMIN',
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('employee@resolvehub.com');
  const [password, setPassword] = useState('Employee123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(email.trim(), password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Login failed. Please verify your credentials.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
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
            Sign In to ResolveHub
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', marginTop: 4 }}>
            Connected to FastAPI Backend (`POST /api/auth/login`)
          </p>
        </div>

        {/* Login Form */}
        <div style={{ padding: '28px 32px' }}>
          <form onSubmit={handleSubmit}>
            <Input
              label="Work Email"
              type="email"
              placeholder="name@resolvehub.com"
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
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
              Sign In
            </Button>
          </form>

          {/* Seeded Backend Credentials */}
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
              <span>Use Seeded Demo Credentials:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: email === acc.email ? '1px solid var(--color-primary-500)' : '1px solid var(--color-slate-200)',
                    backgroundColor: email === acc.email ? 'var(--color-primary-50)' : 'var(--color-slate-50)',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-slate-800)' }}>
                      {acc.label} ({acc.name})
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                      {acc.email}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor:
                        acc.role === 'SUPER_ADMIN'
                          ? '#fee2e2'
                          : acc.role === 'RESOLVER'
                          ? '#fef3c7'
                          : '#e0e7ff',
                      color:
                        acc.role === 'SUPER_ADMIN'
                          ? '#991b1b'
                          : acc.role === 'RESOLVER'
                          ? '#92400e'
                          : '#3730a3',
                    }}
                  >
                    {acc.role}
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
