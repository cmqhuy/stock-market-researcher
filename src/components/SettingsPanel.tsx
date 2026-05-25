import React, { useState } from 'react';
import { X, Key, Shield, HelpCircle, Eye, EyeOff, Lock } from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [mode, setMode] = useState<Required<AppSettings>['mode']>(settings.mode);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({ apiKey, mode });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close settings">
          <X size={20} />
        </button>

        <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={22} className="text-primary" style={{ color: 'var(--primary)' }} />
          Terminal Configurations
        </h2>

        <p className="settings-description">
          Configure the engine execution mode. Live Mode performs actual sentiment analysis via Gemini 1.5 using real RSS feeds.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="settings-group">
            <label className="settings-label">Execution Mode</label>
            <div className="mode-toggle-container">
              <button
                type="button"
                className={`mode-toggle-btn ${mode === 'demo' ? 'active' : ''}`}
                onClick={() => setMode('demo')}
              >
                Demo Simulation
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${mode === 'live' ? 'active' : ''}`}
                onClick={() => setMode('live')}
              >
                Live API Mode
              </button>
            </div>
          </div>

          <div className="settings-group">
            <label className="settings-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Gemini API Key</span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem' }}
              >
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                {showKey ? 'Hide' : 'Show'}
              </button>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Key size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-dark)' }} />
              <input
                type={showKey ? 'text' : 'password'}
                className="form-input"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                disabled={mode === 'demo'}
              />
            </div>
            {mode === 'demo' ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dark)' }}>
                API key is not required in Demo Simulation Mode.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div className="key-guide-box" style={{
                  background: 'rgba(99, 102, 241, 0.04)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start'
                }}>
                  <HelpCircle size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>How to get an API Key</strong>
                    Get a free API key from the <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}>Google AI Studio Console</a>. Make sure your key has access to Gemini models.
                  </div>
                </div>

                <div className="security-notice-box" style={{
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'flex-start'
                }}>
                  <Lock size={14} style={{ color: 'var(--up-color)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.15rem' }}>Local Storage Security (BYOK)</strong>
                    Your API key is saved directly in your browser's local storage and never sent to any external server other than Google's official Gemini API endpoint.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="setup-guide-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem', fontWeight: '700', color: 'var(--text-main)' }}>
              <HelpCircle size={14} style={{ color: 'var(--primary)' }} />
              How the Expert Panel Works
            </div>
            The terminal hosts four virtual agent sub-agents:
            <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <li><strong>Sarah (Daytrader)</strong>: technical momentum and short-term volatility.</li>
              <li><strong>David (Value)</strong>: core valuations, cash flows, and moat sustainability.</li>
              <li><strong>Elena (Macro)</strong>: inflation, yield curves, and geopolitics.</li>
              <li><strong>Jack (Sentiment)</strong>: option sweeps and retail community chatter.</li>
            </ul>
            In Live Mode, Gemini evaluates real headlines and synthesizes a 14-day directional forecast.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-primary" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--panel-border)' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              Save Configurations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default SettingsPanel;
