import React, { useState } from 'react';
import { TrendingUp, Settings, ShieldAlert, RefreshCw } from 'lucide-react';
import type { AppSettings } from '../types';

interface NavbarProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  pendingRequests?: string[];
}

export const Navbar: React.FC<NavbarProps> = ({ settings, onOpenSettings, pendingRequests = [] }) => {
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  
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
            {pendingRequests.length > 0 && (
              <div style={{ position: 'relative' }}>
                <div 
                  className="status-badge" 
                  onClick={() => setIsPendingListOpen(!isPendingListOpen)}
                  style={{ 
                    background: 'rgba(99, 102, 241, 0.12)', 
                    color: 'var(--primary)', 
                    borderColor: 'rgba(99, 102, 241, 0.25)', 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.35rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    animation: 'pulse-glow 2s infinite ease-in-out'
                  }}
                  title="Click to view pending Gemini API queries"
                >
                  <span className="status-dot animate-pulse" style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }}></span>
                  {pendingRequests.length} Gemini Request{pendingRequests.length > 1 ? 's' : ''}
                </div>

                {isPendingListOpen && (
                  <div 
                    className="glass-panel" 
                    style={{ 
                      position: 'absolute', 
                      top: 'calc(100% + 0.5rem)', 
                      right: 0, 
                      zIndex: 1000, 
                      minWidth: '220px', 
                      padding: '0.75rem', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.5rem',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.35rem', fontWeight: 600 }}>
                      Pending API Queries
                    </div>
                    {pendingRequests.map((req, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {req}
                        </span>
                        <RefreshCw size={11} className="animate-spin" style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
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
