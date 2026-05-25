import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';
import { WatchlistPanel } from './components/WatchlistPanel';
import { MarketOverview } from './components/MarketOverview';
import { StockAnalysisDetail } from './components/StockAnalysisDetail';
import type { AppSettings, WatchlistStock, MarketState, StockAnalysis } from './types';
import { getMockWatchlist, generateMockMarketAnalysis, generateMockStockAnalysis, MOCK_TICKERS } from './services/mockDataGenerator';
import { fetchLatestNews, fetchLiveStockQuote } from './services/newsService';
import { analyzeNewsAndPredict } from './services/geminiService';

export function App() {
  // Load settings from localStorage or defaults
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedKey = localStorage.getItem('gemini_api_key') || '';
    const savedMode = (localStorage.getItem('gemini_mode') as 'demo' | 'live') || 'demo';
    return { apiKey: savedKey, mode: savedMode };
  });

  // Load watchlist from localStorage or defaults
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>(() => {
    const savedWatchlist = localStorage.getItem('watchlist_stocks');
    if (savedWatchlist) {
      try {
        return JSON.parse(savedWatchlist);
      } catch (e) {
        console.error('Failed to parse saved watchlist, using defaults.');
      }
    }
    return getMockWatchlist();
  });

  const [selectedTicker, setSelectedTicker] = useState<string>('MARKET');
  const [marketState, setMarketState] = useState<MarketState>(() => {
    const savedMarket = localStorage.getItem('omega_market_analysis');
    if (savedMarket) {
      try {
        return JSON.parse(savedMarket);
      } catch (e) {
        console.error('Failed to parse cached market state.');
      }
    }
    return generateMockMarketAnalysis();
  });

  const [stockAnalyses, setStockAnalyses] = useState<Record<string, StockAnalysis>>(() => {
    const savedAnalyses = localStorage.getItem('omega_stock_analyses');
    if (savedAnalyses) {
      try {
        return JSON.parse(savedAnalyses);
      } catch (e) {
        console.error('Failed to parse cached stock analyses.');
      }
    }
    return {};
  });
  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(false);
  const [isLoadingStock, setIsLoadingStock] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<{ title: string; message: string; details?: string } | null>(null);

  // Sync watchlist to localstorage
  useEffect(() => {
    localStorage.setItem('watchlist_stocks', JSON.stringify(watchlist));
  }, [watchlist]);

  // Sync stock analyses to localstorage
  useEffect(() => {
    localStorage.setItem('omega_stock_analyses', JSON.stringify(stockAnalyses));
  }, [stockAnalyses]);

  // Sync market state to localstorage
  useEffect(() => {
    localStorage.setItem('omega_market_analysis', JSON.stringify(marketState));
  }, [marketState]);

  // Sync settings to localstorage
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('gemini_api_key', newSettings.apiKey);
    localStorage.setItem('gemini_mode', newSettings.mode);
  };

  // Run general market analysis
  const handleRunMarketAnalysis = useCallback(async (currentSettings: AppSettings) => {
    setIsLoadingMarket(true);
    try {
      if (currentSettings.mode === 'live' && currentSettings.apiKey) {
        // Fetch real market news headlines
        const articles = await fetchLatestNews();
        const activeArticles = articles.slice(0, 5);

        // Run consolidated article analysis and 14-day synthesis in ONE single Gemini API call
        const { newsAnalyses, prediction } = await analyzeNewsAndPredict(
          currentSettings.apiKey,
          activeArticles
        );

        setMarketState({
          prediction,
          news: activeArticles,
          newsAnalyses,
          lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: Date.now()
        });
      } else {
        // Demo mode fallback
        const mockMarket = generateMockMarketAnalysis();
        setMarketState(mockMarket);
      }
    } catch (error) {
      console.error('Market analysis failed:', error);
      setErrorMessage({
        title: 'Market Analysis Failed',
        message: 'Failed to execute Live Market Analysis. The app has fallen back to simulated data. Please verify your API key and connection.',
        details: error instanceof Error ? error.message : String(error)
      });
      setMarketState(generateMockMarketAnalysis());
    } finally {
      setIsLoadingMarket(false);
    }
  }, []);

  // Run analysis for a specific stock ticker
  const handleRunStockAnalysis = useCallback(async (ticker: string, currentSettings: AppSettings) => {
    const cleanTicker = ticker.toUpperCase().trim();
    const stockInfo = watchlist.find((s) => s.ticker === cleanTicker) || MOCK_TICKERS[cleanTicker];
    const name = stockInfo?.name || `${cleanTicker} Inc.`;

    setIsLoadingStock(true);
    try {
      if (currentSettings.mode === 'live' && currentSettings.apiKey) {
        // Fetch real stock news and latest price/change in parallel
        const [articles, quote] = await Promise.all([
          fetchLatestNews(cleanTicker),
          fetchLiveStockQuote(cleanTicker).catch(() => null)
        ]);
        const activeArticles = articles.slice(0, 5); // Limit to 5 articles to keep context clean and fast
        const nameToUse = quote?.name || name;

        // Run consolidated article analysis and 14-day synthesis in ONE single Gemini API call
        const { newsAnalyses, prediction } = await analyzeNewsAndPredict(
          currentSettings.apiKey,
          activeArticles,
          { ticker: cleanTicker, name: nameToUse }
        );

        const finalAnalysis: StockAnalysis = {
          ticker: cleanTicker,
          name: nameToUse,
          prediction,
          news: activeArticles,
          newsAnalyses,
          lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: Date.now()
        };

        // Cache the analysis
        setStockAnalyses((prev) => ({ ...prev, [cleanTicker]: finalAnalysis }));

        // Update predictions, confidence scores, and current price/change in the watchlist
        setWatchlist((prevWatchlist) =>
          prevWatchlist.map((stock) =>
            stock.ticker === cleanTicker
              ? {
                  ...stock,
                  name: nameToUse,
                  price: quote?.price || stock.price,
                  change: quote?.change || stock.change,
                  prediction: prediction.stance,
                  confidence: prediction.confidence,
                }
              : stock
          )
        );
      } else {
        // Demo mode fallback
        const mockAnalysis = generateMockStockAnalysis(cleanTicker);
        setStockAnalyses((prev) => ({ ...prev, [cleanTicker]: mockAnalysis }));

        setWatchlist((prevWatchlist) =>
          prevWatchlist.map((stock) =>
            stock.ticker === cleanTicker
              ? {
                  ...stock,
                  prediction: mockAnalysis.prediction.stance,
                  confidence: mockAnalysis.prediction.confidence,
                }
              : stock
          )
        );
      }
    } catch (error) {
      console.error(`Stock analysis failed for ${cleanTicker}:`, error);
      setErrorMessage({
        title: `Analysis Failed: ${cleanTicker}`,
        message: `Failed to analyze ${cleanTicker} in Live Mode. The app has fallen back to simulated data. Please verify your API key and connection.`,
        details: error instanceof Error ? error.message : String(error)
      });
      
      const mockAnalysis = generateMockStockAnalysis(cleanTicker);
      setStockAnalyses((prev) => ({ ...prev, [cleanTicker]: mockAnalysis }));
      setWatchlist((prevWatchlist) =>
        prevWatchlist.map((stock) =>
          stock.ticker === cleanTicker
            ? {
                ...stock,
                prediction: mockAnalysis.prediction.stance,
                confidence: mockAnalysis.prediction.confidence,
              }
            : stock
        )
      );
    } finally {
      setIsLoadingStock(false);
    }
  }, [watchlist]);

  // Handle setting modes / API Key
  const handleSaveSettingsAndTrigger = (newSettings: AppSettings) => {
    handleSaveSettings(newSettings);
    // Re-run analyses based on the new settings
    handleRunMarketAnalysis(newSettings);
    if (selectedTicker !== 'MARKET') {
      handleRunStockAnalysis(selectedTicker, newSettings);
    }
  };

  // Trigger initial market and default stock analyses on mount
  useEffect(() => {
    const now = Date.now();
    const isExpired = !marketState.timestamp || (now - marketState.timestamp > 15 * 60 * 1000);
    const isSimulated = !marketState.timestamp;
    const needsRefetch = isExpired || (settings.mode === 'live' && isSimulated);

    if (needsRefetch) {
      handleRunMarketAnalysis(settings);
    }
  }, []);

  // Refresh all watchlist prices with live quotes when settings change (in live mode)
  useEffect(() => {
    if (settings.mode === 'live' && settings.apiKey) {
      const refreshAllQuotes = async () => {
        try {
          const updatedWatchlist = await Promise.all(
            watchlist.map(async (stock) => {
              try {
                const quote = await fetchLiveStockQuote(stock.ticker);
                return {
                  ...stock,
                  name: quote.name,
                  price: quote.price,
                  change: quote.change
                };
              } catch (err) {
                return stock;
              }
            })
          );
          setWatchlist(updatedWatchlist);
        } catch (err) {
          console.warn('Failed to refresh watchlist quotes:', err);
        }
      };
      refreshAllQuotes();
    }
  }, [settings.mode, settings.apiKey]);

  // When selected ticker changes, load its analysis
  useEffect(() => {
    if (selectedTicker !== 'MARKET') {
      const existing = stockAnalyses[selectedTicker];
      const now = Date.now();
      const isExpired = !existing || !existing.timestamp || (now - existing.timestamp > 15 * 60 * 1000);
      const isSimulated = existing && !existing.timestamp;
      const needsRefetch = isExpired || (settings.mode === 'live' && isSimulated);

      if (needsRefetch) {
        handleRunStockAnalysis(selectedTicker, settings);
      }
    }
  }, [selectedTicker, stockAnalyses, settings, handleRunStockAnalysis]);

  // Watchlist Actions
  const handleAddStock = async (ticker: string) => {
    const cleanTicker = ticker.toUpperCase().trim();
    if (watchlist.some((s) => s.ticker === cleanTicker)) {
      setSelectedTicker(cleanTicker);
      return;
    }

    setIsLoadingStock(true);
    try {
      let name = `${cleanTicker} Corporation`;
      let price = 100;
      let change = 0;

      if (settings.mode === 'live' && settings.apiKey) {
        const quote = await fetchLiveStockQuote(cleanTicker);
        name = quote.name;
        price = quote.price;
        change = quote.change;
      } else {
        const existingMock = MOCK_TICKERS[cleanTicker];
        name = existingMock?.name || `${cleanTicker} Corporation`;
        price = existingMock?.price || 50 + Math.random() * 200;
        change = existingMock?.change || (Math.random() - 0.5) * 8;
      }

      const newStock: WatchlistStock = {
        ticker: cleanTicker,
        name,
        price,
        change,
      };

      setWatchlist((prev) => [...prev, newStock]);
      setSelectedTicker(cleanTicker);
    } catch (err) {
      console.error('Failed to add stock:', err);
      const existingMock = MOCK_TICKERS[cleanTicker];
      const newStock: WatchlistStock = {
        ticker: cleanTicker,
        name: existingMock?.name || `${cleanTicker} Corporation`,
        price: existingMock?.price || 100,
        change: existingMock?.change || 0,
      };
      setWatchlist((prev) => [...prev, newStock]);
      setSelectedTicker(cleanTicker);
    } finally {
      setIsLoadingStock(false);
    }
  };

  const handleRemoveStock = (ticker: string) => {
    setWatchlist((prev) => prev.filter((s) => s.ticker !== ticker));
    if (selectedTicker === ticker) {
      setSelectedTicker('MARKET');
    }
  };

  return (
    <div className="app-container">
      <Navbar settings={settings} onOpenSettings={() => setIsSettingsOpen(true)} />

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
            isLoading={isLoadingStock}
          />
        </div>

        <div className="main-column">
          {selectedTicker === 'MARKET' ? (
            <MarketOverview marketState={marketState} isLoading={isLoadingMarket} />
          ) : (
            <StockAnalysisDetail
              stockAnalysis={stockAnalyses[selectedTicker] || null}
              isLoading={isLoadingStock}
              onRefreshAnalysis={(t) => handleRunStockAnalysis(t, settings)}
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
          <div className="glass-panel modal-content" style={{ maxWidth: '420px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--down-color)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                {errorMessage.title}
              </h3>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0.5rem 0' }}>
              {errorMessage.message}
            </p>

            {errorMessage.details && (
              <div style={{
                background: 'rgba(7, 10, 19, 0.6)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                color: '#ef4444',
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
              onClick={() => setErrorMessage(null)}
              style={{
                marginTop: '1.25rem',
                width: '100%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--down-color)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
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
