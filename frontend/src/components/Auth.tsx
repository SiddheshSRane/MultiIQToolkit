import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, LogIn, UserPlus, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

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
    <div className="app glass-card" style={{ maxWidth: '500px', margin: '40px auto' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <User className="text-primary" />
        {mode === 'signin' && 'Sign In'}
        {mode === 'signup' && 'Create Account'}
        {mode === 'forgot' && 'Reset Password'}
      </h2>
      <p className="desc" style={{ marginBottom: '24px' }}>
        {mode === 'signin' && 'Sign in to save your activity and access your history'}
        {mode === 'signup' && 'Create an account to get started'}
        {mode === 'forgot' && 'Enter your email to receive a password reset link'}
      </p>

      {error && (
        <div
          className="section"
          style={{
            borderLeft: '4px solid var(--danger)',
            background: 'rgba(244, 63, 94, 0.05)',
            marginBottom: '20px',
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '14px' }}>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div
          className="section"
          style={{
            borderLeft: '4px solid var(--primary)',
            background: 'rgba(99, 102, 241, 0.05)',
            marginBottom: '20px',
          }}
          role="status"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <CheckCircle size={18} />
            <span style={{ fontSize: '14px' }}>{success}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={16} />
              Full Name (Optional)
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-label="Full name"
            />
          </div>
        )}

        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={16} />
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email address"
          />
        </div>

        {mode !== 'forgot' && (
          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} />
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              aria-label="Password"
            />
            {mode === 'signin' && (
              <button
                type="button"
                className="text-btn"
                onClick={() => setMode('forgot')}
                style={{
                  fontSize: '12px',
                  background: 'transparent',
                  color: 'var(--primary)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  marginTop: '4px',
                }}
              >
                Forgot password?
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          className="primary"
          disabled={loading || !email || (mode !== 'forgot' && !password)}
          style={{ width: '100%', marginBottom: '16px' }}
        >
          {loading ? (
            <>Processing...</>
          ) : (
            <>
              {mode === 'signin' && (
                <>
                  <LogIn size={18} /> Sign In
                </>
              )}
              {mode === 'signup' && (
                <>
                  <UserPlus size={18} /> Create Account
                </>
              )}
              {mode === 'forgot' && (
                <>
                  <ArrowRight size={18} /> Send Reset Link
                </>
              )}
            </>
          )}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
        {mode === 'signin' && (
          <p className="desc" style={{ margin: 0, fontSize: '13px' }}>
            Don't have an account?{' '}
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccess(null);
              }}
              style={{
                background: 'transparent',
                color: 'var(--primary)',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign up
            </button>
          </p>
        )}
        {mode === 'signup' && (
          <p className="desc" style={{ margin: 0, fontSize: '13px' }}>
            Already have an account?{' '}
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccess(null);
              }}
              style={{
                background: 'transparent',
                color: 'var(--primary)',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign in
            </button>
          </p>
        )}
        {mode === 'forgot' && (
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              setMode('signin');
              setError(null);
              setSuccess(null);
            }}
            style={{
              background: 'transparent',
              color: 'var(--primary)',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '13px',
            }}
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
