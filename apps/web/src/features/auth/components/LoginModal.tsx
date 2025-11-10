import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useAuthModal } from '../../../hooks/useAuthModal';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

export const LoginModal: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const { isLoginOpen, closeLogin } = useAuthModal();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoginOpen && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isLoginOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      closeLogin();
      navigate('/gallery');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .login-form { display: flex; flex-direction: column; gap: 20px; }
        .login-header { text-align: center; margin-bottom: 32px; }
        .login-title { font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .login-subtitle { font-size: 0.875rem; color: #6b7280; }
        .error-box { padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; }
        .error-text { font-size: 0.875rem; color: #dc2626; }
        .form-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.875rem; }
        .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #374151; }
        .forgot-link { color: #111827; font-weight: 500; text-decoration: none; transition: color 0.2s; }
        .forgot-link:hover { color: #4b5563; }
        .submit-btn { width: 100%; padding: 12px 16px; background: #111827; color: white; font-weight: 500; border-radius: 8px; border: none; cursor: pointer; transition: background 0.2s; }
        .submit-btn:hover:not(:disabled) { background: #1f2937; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .divider { position: relative; margin: 24px 0; }
        .divider-line { position: absolute; inset: 0; display: flex; align-items: center; }
        .divider-border { width: 100%; border-top: 1px solid #e5e7eb; }
        .divider-text { position: relative; display: flex; justify-content: center; font-size: 0.875rem; }
        .divider-text span { padding: 0 16px; background: white; color: #6b7280; }
        .social-buttons { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .social-btn { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: white; cursor: pointer; transition: background 0.2s; }
        .social-btn:hover { background: #f9fafb; }
        .social-btn svg { width: 20px; height: 20px; }
        .social-btn span { font-size: 0.875rem; font-weight: 500; color: #374151; }
        .signup-link { text-align: center; font-size: 0.875rem; color: #6b7280; }
        .signup-link button { color: #111827; font-weight: 500; background: none; border: none; cursor: pointer; padding: 0; margin-left: 4px; }
        .signup-link button:hover { color: #4b5563; }
      `}</style>
      <Modal isOpen={isLoginOpen} onClose={closeLogin} maxWidth="md">
        <div className="login-form">
          <div className="login-header">
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Sign in to your account and continue your journey</p>
          </div>

          {error && (
            <div className="error-box">
              <p className="error-text">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Input
                ref={emailInputRef}
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#111827' }}
                  />
                  Remember me
                </label>
                <button type="button" className="forgot-link">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="divider">
            <div className="divider-line">
              <div className="divider-border"></div>
            </div>
            <div className="divider-text">
              <span>Or continue with</span>
            </div>
          </div>

          <div className="social-buttons">
            <button type="button" className="social-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google</span>
            </button>
            <button type="button" className="social-btn">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <div className="signup-link">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                closeLogin();
                // Open register modal
              }}
            >
              Sign up for free
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
