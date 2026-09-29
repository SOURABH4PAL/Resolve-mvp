import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

interface DemoAccount {
  label: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  responsibility?: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Employee (Support User)',
    name: 'Jane Doe',
    email: 'employee@resolvehub.com',
    password: 'Employee123!',
    role: 'EMPLOYEE',
    responsibility: 'General Employee (Creates Tickets)',
  },
  {
    label: 'Employee (Responsible for IT)',
    name: 'Amit Patel (IT Lead)',
    email: 'amit.patel@resolvehub.com',
    password: 'Password123!',
    role: 'EMPLOYEE',
    responsibility: 'Responsible for IT Support Categories',
  },
  {
    label: 'Super Admin',
    name: 'Super Admin',
    email: 'admin@resolvehub.com',
    password: 'Admin123!',
    role: 'SUPER_ADMIN',
    responsibility: 'Complete System & Org Management',
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
      const user = await login(email.trim(), password);
      if (user) {
        if (user.role === 'SUPER_ADMIN') {
          navigate('/admin/dashboard');
        } else {
          navigate('/employee/dashboard');
        }
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

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
          padding: '40px 32px',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              backgroundColor: 'var(--color-primary-600)',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              marginBottom: 16,
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
            }}
          >
            <Layers size={28} />
          </div>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--color-slate-900)',
              letterSpacing: '-0.025em',
            }}
          >
            Sign In to ResolveHub
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-slate-500)',
              marginTop: 6,
            }}
          >
            Unified internal support and issue resolution platform
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: 20,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Work Email"
            type="email"
            placeholder="you@resolvehub.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftIcon={<Mail size={16} />}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            required
            autoComplete="current-password"
          />

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

        {/* Seeded Demo Credentials Helper */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: '1px solid var(--color-slate-100)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-slate-400)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 12,
            }}
          >
            <ShieldCheck size={14} />
            <span>Seeded Demo Credentials</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DEMO_ACCOUNTS.map(acc => {
              const isSelected = email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary-500)' : 'var(--color-slate-200)',
                    backgroundColor: isSelected ? 'var(--color-primary-50)' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        color: isSelected ? 'var(--color-primary-800)' : 'var(--color-slate-800)',
                      }}
                    >
                      {acc.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.725rem',
                        color: 'var(--color-slate-500)',
                        marginTop: 1,
                      }}
                    >
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
                          : '#e0e7ff',
                      color:
                        acc.role === 'SUPER_ADMIN'
                          ? '#991b1b'
                          : '#3730a3',
                    }}
                  >
                    {acc.role}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
