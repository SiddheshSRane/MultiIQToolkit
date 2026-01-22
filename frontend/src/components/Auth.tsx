
import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Gem, Mail, Lock, User, Loader2, Zap } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        if (error) setError(error.message);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) setError(error.message);
        else setSuccess('Account created! Check your email.');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) setError(error.message);
        else setSuccess('Reset link sent!');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, fullName, signIn, signUp, resetPassword]);

  return (
    <div className="layout-root" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-app)',
      padding: 24
    }}>
      <div className="hub-card" style={{
        maxWidth: 480,
        width: '100%',
        padding: 48,
        textAlign: 'center',
        cursor: 'default',
        transform: 'none'
      }}>
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 32 }}>
          <div className="brand-logo indigo-glow">
            <Gem size={32} />
          </div>
          <h1 style={{ fontSize: 28 }}>Refinery</h1>
        </div>

        <h2 style={{ fontSize: 24, marginBottom: 8 }}>
          {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
        </h2>
        <p className="desc" style={{ marginBottom: 32 }}>
          {mode === 'signin' ? 'Access your elite data refinement suite.' : mode === 'signup' ? 'Start your journey with professional tools.' : 'Recover your portal access.'}
        </p>

        {error && (
          <div className="section" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}
        {success && (
          <div className="section" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 24 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {mode === 'signup' && (
            <div className="input-group">
              <label><User size={14} style={{ marginRight: 8 }} /> Full name</label>
              <input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}

          <div className="input-group">
            <label><Mail size={14} style={{ marginRight: 8 }} /> Corporate Email</label>
            <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          {mode !== 'forgot' && (
            <div className="input-group">
              <label><Lock size={14} style={{ marginRight: 8 }} /> Secure Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'signin' && (
                <button type="button" onClick={() => setMode('forgot')} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                  Forgot Password?
                </button>
              )}
            </div>
          )}

          <button className="primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '16px', marginTop: 8 }}>
            {loading ? <Loader2 className="animate-spin" /> : <><Zap /> {mode === 'signin' ? 'Sign In to Portal' : mode === 'signup' ? 'Activate Account' : 'Send Recovery Link'}</>}
          </button>
        </form>

        <div style={{ marginTop: 32, fontSize: 14 }}>
          {mode === 'signin' ? (
            <p className="desc">New to the refinery? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }}>Create Access</button></p>
          ) : (
            <p className="desc">Known Identity? <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }}>Return to Login</button></p>
          )}
        </div>
      </div>
    </div>
  );
}
