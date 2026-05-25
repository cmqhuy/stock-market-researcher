import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Clock } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';
import { WatchlistPanel } from './components/WatchlistPanel';
import { MarketOverview } from './components/MarketOverview';
import { StockAnalysisDetail } from './components/StockAnalysisDetail';
import type { AppSettings } from './types';
import { AIService } from './services/ai';

// Custom Hooks
import { useAppSettings } from './hooks/useAppSettings';
import { useErrorModal } from './hooks/useErrorModal';
import { useWatchlist } from './hooks/useWatchlist';
import { useMarketAnalysis } from './hooks/useMarketAnalysis';
import { useStockAnalysis } from './hooks/useStockAnalysis';

export function App() {
  const { settings, saveSettings } = useAppSettings();
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);

  useEffect(() => {
    return AIService.subscribe(setPendingRequests);
  }, []);
  const { errorMessage, triggerError, closeError } = useErrorModal();
  const {
    watchlist,
    isLoadingQuote,
    addStock,
    removeStock,
    reorderWatchlist,
    setWatchlist,
  } = useWatchlist(settings.mode);

  const [selectedTicker, setSelectedTicker] = useState<string>('MARKET');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const {
    marketState,
    isLoadingMarket,
    runMarketAnalysis,
  } = useMarketAnalysis(settings, triggerError, selectedTicker === 'MARKET');

  const {
    stockAnalyses,
    isLoadingStock,
    runStockAnalysis,
  } = useStockAnalysis(settings, watchlist, setWatchlist, selectedTicker, triggerError);

  // Handle setting modes / API Key
  const handleSaveSettingsAndTrigger = (newSettings: AppSettings) => {
    saveSettings(newSettings);
  };

  // Watchlist Actions
  const handleAddStock = async (ticker: string) => {
    try {
      const addedTicker = await addStock(ticker);
      if (addedTicker) {
        setSelectedTicker(addedTicker);
      }
    } catch (err) {
      triggerError(
        'Failed to Add Stock',
        err,
        `Failed to load stock data for ${ticker.toUpperCase()}. Please check the ticker symbol and your internet connection.`
      );
    }
  };

  const handleRemoveStock = (ticker: string) => {
    removeStock(ticker);
    if (selectedTicker === ticker) {
      setSelectedTicker('MARKET');
    }
  };

  return (
    <div className="app-container">
      <Navbar settings={settings} onOpenSettings={() => setIsSettingsOpen(true)} pendingRequests={pendingRequests} />

      <div className="dashboard-grid">
        <div className="sidebar-column">
          {/* Market Overview Selector Card */}
          <div
            className={`glass-panel watchlist-card ${selectedTicker === 'MARKET' ? 'active' : ''}`}
            onClick={() => setSelectedTicker('MARKET')}
            style={{ padding: '1.1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          >
            <Activity size={18} style={{ color: 'var(--primary)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-display)' }}>Global Market Overview</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Index & macro-level research</span>
            </div>
          </div>

          <WatchlistPanel
            stocks={watchlist}
            selectedTicker={selectedTicker}
            onSelectStock={setSelectedTicker}
            onAddStock={handleAddStock}
            onRemoveStock={handleRemoveStock}
            isLoading={isLoadingStock || isLoadingQuote}
            onReorderWatchlist={reorderWatchlist}
          />
        </div>

        <div className="main-column">
          {selectedTicker === 'MARKET' ? (
            <MarketOverview
              marketState={marketState}
              isLoading={isLoadingMarket}
              isLiveMode={settings.mode === 'live'}
              onRefreshMarket={() => runMarketAnalysis(settings)}
            />
          ) : (
            <StockAnalysisDetail
              stockAnalysis={stockAnalyses[selectedTicker] || null}
              isLoading={isLoadingStock}
              onRefreshAnalysis={(t) => runStockAnalysis(t, settings)}
              isLiveMode={settings.mode === 'live'}
            />
          )}
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          onSaveSettings={handleSaveSettingsAndTrigger}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {errorMessage && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-panel modal-content" style={{ maxWidth: '420px', border: errorMessage.retryAfterSeconds ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                background: errorMessage.retryAfterSeconds ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: errorMessage.retryAfterSeconds ? '#f59e0b' : 'var(--down-color)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {errorMessage.retryAfterSeconds ? <Clock size={20} /> : <AlertTriangle size={20} />}
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                {errorMessage.title}
              </h3>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0.5rem 0' }}>
              {errorMessage.message}
            </p>

            {errorMessage.retryAfterSeconds !== undefined && errorMessage.retryAfterSeconds > 0 ? (
              <div style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                color: 'var(--text-main)'
              }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(245, 158, 11, 0.85)', fontWeight: 600 }}>
                  API Cooldown Period
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
                  {errorMessage.retryAfterSeconds}s
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Please wait before resubmitting.
                </span>
              </div>
            ) : errorMessage.retryAfterSeconds !== undefined && errorMessage.retryAfterSeconds === 0 ? (
              <div style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                color: 'var(--up-color)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}>
                <span className="status-dot" style={{ backgroundColor: 'var(--up-color)', position: 'static', transform: 'none' }}></span>
                Cooldown complete. You may retry now!
              </div>
            ) : null}

            {errorMessage.details && (
              <div style={{
                background: 'rgba(7, 10, 19, 0.6)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                color: errorMessage.retryAfterSeconds ? '#f59e0b' : '#ef4444',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                marginTop: '0.5rem',
                wordBreak: 'break-all'
              }}>
                <strong>Details:</strong> {errorMessage.details}
              </div>
            )}

            <button
              className="btn-primary"
              onClick={closeError}
              style={{
                marginTop: '1.25rem',
                width: '100%',
                background: errorMessage.retryAfterSeconds ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: errorMessage.retryAfterSeconds ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                color: errorMessage.retryAfterSeconds ? '#f59e0b' : 'var(--down-color)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = errorMessage.retryAfterSeconds ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.boxShadow = errorMessage.retryAfterSeconds ? '0 0 15px rgba(245, 158, 11, 0.15)' : '0 0 15px rgba(239, 68, 68, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = errorMessage.retryAfterSeconds ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
