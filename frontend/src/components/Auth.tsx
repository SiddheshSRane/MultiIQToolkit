import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, LogIn, UserPlus, ArrowRight, AlertCircle, CheckCircle, Component } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Account created! Please check your email to verify your account.');
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Password reset email sent! Check your inbox.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, fullName, signIn, signUp, resetPassword]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px',
    }}>
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(17, 25, 40, 0.75)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary, #8b5cf6) 100%)',
            marginBottom: '16px',
            boxShadow: '0 4px 6px -1px rgba(var(--primary-rgb, 99, 102, 241), 0.3)'
          }}>
            <Component size={24} color="white" />
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '8px',
            background: 'linear-gradient(to right, #fff, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="desc" style={{ fontSize: '14px', opacity: 0.7 }}>
            {mode === 'signin' && 'Enter your credentials to access your workspace'}
            {mode === 'signup' && 'Get started with your free account today'}
            {mode === 'forgot' && 'We\'ll send you a link to reset your password'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px',
            }}
            role="alert"
          >
            <AlertCircle size={18} className="text-red-400" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.4' }}>{error}</span>
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px',
            }}
            role="status"
          >
            <CheckCircle size={18} className="text-green-400" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '13px', color: '#86efac', lineHeight: '1.4' }}>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'block', color: '#e2e8f0' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'block', color: '#e2e8f0' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  color: 'white',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || (mode !== 'forgot' && !password)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.1s ease',
              opacity: (loading || !email || (mode !== 'forgot' && !password)) ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                {mode === 'signin' && <><LogIn size={18} /> Sign In</>}
                {mode === 'signup' && <><UserPlus size={18} /> Create Account</>}
                {mode === 'forgot' && <><ArrowRight size={18} /> Send Reset Link</>}
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          {mode === 'signin' && (
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              Don't have an account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign up
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign in
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <button
              onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', cursor: 'pointer' }}
            >
              <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
