import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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

  // Styles
  const primaryColor = '#4f46e5';
  const textColor = '#1e293b';
  const mutedColor = '#64748b';
  const inputBg = '#f1f5f9';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(to bottom, ${primaryColor} 50%, #f8fafc 50%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 9999, // Overlay everything
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '1000px',
        minHeight: '600px',
        display: 'flex',
        overflow: 'hidden',
        flexDirection: 'row', // Default to row
      }}>

        {/* Left Side - Form */}
        <div style={{
          flex: '1',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
        }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '800',
              color: textColor,
              marginBottom: '8px',
              background: 'none',
              WebkitTextFillColor: 'initial',
            }}>
              {mode === 'signin' && 'Login'}
              {mode === 'signup' && 'Sign Up'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p style={{ color: mutedColor, fontSize: '15px' }}>
              {mode === 'signin' && 'Welcome back! Please login to your account.'}
              {mode === 'signup' && 'Create an account to get started.'}
              {mode === 'forgot' && 'Enter your email to recover your password.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#22c55e', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
              <CheckCircle size={16} /> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {mode === 'signup' && (
              <div className="input-field">
                <label style={{ display: 'none' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: inputBg,
                    border: '1px solid transparent',
                    fontSize: '15px',
                    color: textColor,
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div className="input-field">
              <label style={{ display: 'none' }}>Email</label>
              <input
                type="email"
                placeholder="Username or email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: inputBg,
                  border: '1px solid transparent',
                  fontSize: '15px',
                  color: textColor,
                  outline: 'none',
                }}
              />
            </div>

            {mode !== 'forgot' && (
              <div className="input-field" style={{ position: 'relative' }}>
                <label style={{ display: 'none' }}>Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: inputBg,
                    border: '1px solid transparent',
                    fontSize: '15px',
                    color: textColor,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: mutedColor,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            )}

            {mode === 'signin' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: mutedColor, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ borderRadius: '4px', width: '16px', height: '16px', accentColor: primaryColor }}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  style={{ background: 'none', border: 'none', color: primaryColor, fontWeight: '600', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: primaryColor,
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                opacity: loading ? 0.7 : 1,
                marginTop: '10px',
                boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.4)',
              }}
            >
              {loading ? 'Processing...' : (
                mode === 'signin' ? 'Login' : (mode === 'signup' ? 'Sign Up' : 'Send Link')
              )}
            </button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: mutedColor }}>
            {mode === 'signin' && (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: primaryColor, fontWeight: '600', cursor: 'pointer', padding: 0 }}>Sign up</button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: primaryColor, fontWeight: '600', cursor: 'pointer', padding: 0 }}>Login</button>
              </>
            )}
            {mode === 'forgot' && (
              <button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: primaryColor, fontWeight: '600', cursor: 'pointer', padding: 0 }}>Back to Login</button>
            )}
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className="auth-illustration" style={{
          flex: '1',
          backgroundColor: '#eff6ff', // Light blue tint
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Decorative Elements */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
          }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '4px solid #bfdbfe' }} />
          </div>

          <div style={{ marginBottom: '40px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/login-hero.png"
              alt="Security and Analytics 3D Illustration"
              style={{
                maxWidth: '100%',
                height: 'auto',
                maxHeight: '350px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 30px rgba(59, 130, 246, 0.15))'
              }}
            />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: '700', color: textColor, marginBottom: '12px' }}>
            Check Your Project Progress
          </h3>
          <p style={{ fontSize: '14px', color: mutedColor, lineHeight: '1.6', maxWidth: '300px', margin: '0 auto' }}>
            Manage your files, track conversions, and collaborate with your team in real-time efficiently.
          </p>

          {/* Dots */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '30px', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '6px', borderRadius: '3px', background: primaryColor }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#cbd5e1' }}></div>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 900px) {
           .auth-illustration {
             display: none !important;
           }
        }
      `}</style>
    </div>
  );
}
