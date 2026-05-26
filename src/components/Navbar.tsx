import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, Settings, ShieldAlert, RefreshCw, Copy, Check, Clock } from 'lucide-react';
import type { AppSettings } from '../types';
import { GeminiLogger, type GeminiLogEntry } from '../services/ai/logger';

interface NavbarProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  pendingRequests?: string[];
}

const STATUS_ICON: Record<string, string> = {
  success: '✓',
  error: '✗',
  aborted: '⊘',
  pending: '⏳',
};
const STATUS_COLOR: Record<string, string> = {
  success: '#10b981',
  error: '#ef4444',
  aborted: '#6b7280',
  pending: '#f59e0b',
};

export const Navbar: React.FC<NavbarProps> = ({ settings, onOpenSettings, pendingRequests = [] }) => {
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  const [recentLog, setRecentLog] = useState<GeminiLogEntry[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isPendingListOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsPendingListOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isPendingListOpen]);

  useEffect(() => {
    return GeminiLogger.subscribe((entries) => {
      // Keep the 20 most recent entries for the dropdown
      setRecentLog(entries.slice(-20).reverse());
      setSessionTotal(GeminiLogger.sessionTotal());
    });
  }, []);

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleCopyLog = () => {
    const all = GeminiLogger.getAll();
    const lines = all.map((e) => {
      const dur = e.durationMs != null ? `${e.durationMs}ms` : 'pending';
      return [
        new Date(e.startedAt).toLocaleTimeString(),
        e.status.toUpperCase().padEnd(7),
        e.type.padEnd(16),
        e.ticker.padEnd(6),
        `trigger=${e.trigger}`,
        `articles=${e.articleCount}`,
        `attempts=${e.attempts}`,
        dur,
        e.error ? `err="${e.error}"` : '',
      ].filter(Boolean).join(' | ');
    });
    const header = `Gemini Request Log — ${all.length} entries — session total: ${sessionTotal}`;
    const text = [header, '─'.repeat(header.length), ...lines].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasPending = pendingRequests.length > 0;
  const hasLog = recentLog.length > 0;

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

            {/* Pending / log badge — always visible in live mode once any log entry exists */}
            {(hasPending || hasLog) && (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <div
                  className="status-badge"
                  onClick={() => setIsPendingListOpen(!isPendingListOpen)}
                  style={{
                    background: hasPending ? 'rgba(99, 102, 241, 0.12)' : 'rgba(30, 32, 48, 0.6)',
                    color: hasPending ? 'var(--primary)' : 'var(--text-muted)',
                    borderColor: hasPending ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.08)',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    animation: hasPending ? 'pulse-glow 2s infinite ease-in-out' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                  title="Click to view Gemini API request log"
                >
                  {hasPending ? (
                    <span className="status-dot animate-pulse" style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }} />
                  ) : (
                    <Clock size={11} />
                  )}
                  {hasPending
                    ? `${pendingRequests.length} Pending`
                    : `${sessionTotal} Session Request${sessionTotal !== 1 ? 's' : ''}`}
                </div>

                {isPendingListOpen && (
                  <div
                    className="glass-panel"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      zIndex: 1000,
                      width: '360px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6), 0 8px 10px -6px rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      maxHeight: '420px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem', marginBottom: '0.15rem' }}>
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Gemini Request Log &nbsp;
                        <span style={{ color: 'var(--primary)' }}>({sessionTotal} this session)</span>
                      </span>
                      <button
                        onClick={handleCopyLog}
                        title="Copy full log to clipboard"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.1rem 0.3rem' }}
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        {copied ? 'Copied!' : 'Copy all'}
                      </button>
                    </div>

                    {/* Pending section */}
                    {hasPending && (
                      <>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b', fontWeight: 600, marginTop: '0.1rem' }}>
                          ⏳ Active ({pendingRequests.length})
                        </div>
                        {pendingRequests.map((req, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-main)', padding: '0.2rem 0.35rem', background: 'rgba(245,158,11,0.06)', borderRadius: '5px', border: '1px solid rgba(245,158,11,0.12)' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{req}</span>
                            <RefreshCw size={11} className="animate-spin" style={{ color: '#f59e0b', flexShrink: 0 }} />
                          </div>
                        ))}
                        {recentLog.filter(e => e.status !== 'pending').length > 0 && (
                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.15rem 0' }} />
                        )}
                      </>
                    )}

                    {/* Recent log entries */}
                    {recentLog.filter(e => e.status !== 'pending').map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '14px 1fr auto',
                          gap: '0.35rem',
                          alignItems: 'start',
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.35rem',
                          background: 'rgba(255,255,255,0.02)',
                          borderRadius: '5px',
                          border: `1px solid rgba(255,255,255,0.04)`,
                        }}
                      >
                        <span style={{ color: STATUS_COLOR[entry.status], fontWeight: 700, lineHeight: 1.6 }}>
                          {STATUS_ICON[entry.status]}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {entry.ticker}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', background: 'rgba(99,102,241,0.08)', padding: '0 0.3rem', borderRadius: '3px', border: '1px solid rgba(99,102,241,0.15)' }}>
                              {entry.trigger}
                            </span>
                            {entry.attempts > 1 && (
                              <span style={{ color: '#f59e0b', fontSize: '0.65rem' }}>
                                ×{entry.attempts} retries
                              </span>
                            )}
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                            {new Date(entry.startedAt).toLocaleTimeString()} · {entry.articleCount} articles
                            {entry.durationMs != null ? ` · ${entry.durationMs < 1000 ? `${entry.durationMs}ms` : `${(entry.durationMs / 1000).toFixed(1)}s`}` : ''}
                          </span>
                          {entry.error && (
                            <span style={{ color: '#ef4444', fontSize: '0.65rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={entry.error}>
                              {entry.error.slice(0, 60)}{entry.error.length > 60 ? '…' : ''}
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                          {entry.callsite === 'useMarketAnalysis' ? 'MARKET' : 'STOCK'}
                        </span>
                      </div>
                    ))}

                    {recentLog.length === 0 && !hasPending && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0' }}>
                        No requests yet this session.
                      </span>
                    )}

                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.35rem', marginTop: '0.1rem', textAlign: 'center' }}>
                      Open DevTools console → type <code style={{ background: 'rgba(99,102,241,0.12)', padding: '0 0.25rem', borderRadius: '3px' }}>geminiLog()</code> for full log
                    </div>
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
