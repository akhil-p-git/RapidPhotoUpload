import React from 'react';
import { useAuth } from '../AuthContext';

interface PrivateRouteProps {
  children: React.ReactElement;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FFE5D4 0%, #FFD4B3 25%, #B8E6B8 50%, #A8D8A8 75%, #98C898 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Always show children - let the gallery page handle auth prompts
  return children;
};
