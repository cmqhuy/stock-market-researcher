import React from 'react';
import { TrendingUp, Settings, ShieldAlert } from 'lucide-react';
import type { AppSettings } from '../types';

interface NavbarProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  pendingRequests?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ settings, onOpenSettings, pendingRequests = 0 }) => {
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="glass-panel navbar">
      <div className="nav-brand">
        <TrendingUp className="nav-logo-icon" size={28} />
        <div>
          <h1>Omega Terminal</h1>
        </div>
        <span>Agent Research Terminal</span>
      </div>

      <div className="nav-actions">
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>
          {currentDateStr}
        </span>

        {settings.mode === 'live' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="status-badge live" title="Directly using Gemini API client-side with real RSS news">
              <span className="status-dot"></span>
              Live AI Mode
            </div>
            {pendingRequests > 0 && (
              <div 
                className="status-badge" 
                style={{ 
                  background: 'rgba(99, 102, 241, 0.12)', 
                  color: 'var(--primary)', 
                  borderColor: 'rgba(99, 102, 241, 0.25)', 
                  fontSize: '0.75rem', 
                  padding: '0.25rem 0.5rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.35rem',
                  animation: 'pulse-glow 2s infinite ease-in-out'
                }}
                title={`${pendingRequests} active request(s) currently calling Gemini API`}
              >
                <span className="status-dot" style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }}></span>
                {pendingRequests} Gemini Request{pendingRequests > 1 ? 's' : ''}
              </div>
            )}
          </div>
        ) : (
          <div className="status-badge demo" title="Simulating stock market news and agent analyses">
            <span className="status-dot"></span>
            Demo Mode
          </div>
        )}

        {settings.mode === 'live' && !settings.apiKey && (
          <div className="badge-down" style={{ padding: '0.25rem 0.5rem', gap: '0.25rem', fontSize: '0.75rem' }}>
            <ShieldAlert size={14} />
            Key Missing
          </div>
        )}

        <button className="settings-btn" onClick={onOpenSettings} aria-label="Open Settings">
          <Settings size={16} />
          Settings
        </button>
      </div>
    </header>
  );
};
export default Navbar;
