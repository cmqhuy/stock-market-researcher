import { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { SettingsPanel } from './components/SettingsPanel';
import { WatchlistPanel } from './components/WatchlistPanel';
import { MarketOverview } from './components/MarketOverview';
import { StockAnalysisDetail } from './components/StockAnalysisDetail';
import type { AppSettings, WatchlistStock, MarketState, StockAnalysis } from './types';
import { getMockWatchlist, generateMockMarketAnalysis, generateMockStockAnalysis, MOCK_TICKERS } from './services/mockDataGenerator';
import { fetchLatestNews } from './services/newsService';
import { analyzeNewsArticle, synthesize14DayPrediction } from './services/geminiService';

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
  const [marketState, setMarketState] = useState<MarketState>(() => generateMockMarketAnalysis());
  const [stockAnalyses, setStockAnalyses] = useState<Record<string, StockAnalysis>>({});
  const [isLoadingMarket, setIsLoadingMarket] = useState<boolean>(false);
  const [isLoadingStock, setIsLoadingStock] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<{ title: string; message: string; details?: string } | null>(null);

  // Sync watchlist to localstorage
  useEffect(() => {
    localStorage.setItem('watchlist_stocks', JSON.stringify(watchlist));
  }, [watchlist]);

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
        
        // Analyze each news article in parallel using Gemini
        const errors: any[] = [];
        const analysisPromises = articles.slice(0, 5).map(async (article) => {
          try {
            const analysis = await analyzeNewsArticle(currentSettings.apiKey, article);
            return { article, analysis };
          } catch (err) {
            console.warn(`Failed to analyze market article: "${article.title}"`, err);
            errors.push(err);
            return null;
          }
        });
        
        const results = await Promise.all(analysisPromises);
        const articlesWithAnalysis = results.filter((r): r is { article: typeof articles[0]; analysis: any } => r !== null);

        if (articlesWithAnalysis.length === 0) {
          const firstError = errors[0];
          throw firstError || new Error('All market article analyses failed.');
        }

        // Synthesize 14-day market prediction
        const prediction = await synthesize14DayPrediction(
          currentSettings.apiKey,
          articlesWithAnalysis
        );

        // Group analyses into dictionary
        const newsAnalyses: Record<string, any> = {};
        articlesWithAnalysis.forEach((item) => {
          newsAnalyses[item.article.id] = item.analysis;
        });

        setMarketState({
          prediction,
          news: articlesWithAnalysis.map((item) => item.article),
          newsAnalyses,
          lastUpdated: new Date().toLocaleDateString()
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
        // Fetch real stock news from Yahoo Finance RSS
        const articles = await fetchLatestNews(cleanTicker);

        // Analyze at least 5 articles in parallel using Gemini
        const errors: any[] = [];
        const analysisPromises = articles.slice(0, 6).map(async (article) => {
          try {
            const analysis = await analyzeNewsArticle(currentSettings.apiKey, article, { ticker: cleanTicker, name });
            return { article, analysis };
          } catch (err) {
            console.warn(`Failed to analyze article: "${article.title}"`, err);
            errors.push(err);
            return null;
          }
        });

        const results = await Promise.all(analysisPromises);
        const articlesWithAnalysis = results.filter((r): r is { article: typeof articles[0]; analysis: any } => r !== null);

        if (articlesWithAnalysis.length === 0) {
          const firstError = errors[0];
          throw firstError || new Error(`All analyses failed for ticker ${cleanTicker}`);
        }

        // Synthesize 14-day stock prediction
        const prediction = await synthesize14DayPrediction(
          currentSettings.apiKey,
          articlesWithAnalysis,
          cleanTicker,
          name
        );

        // Group analyses into dictionary
        const newsAnalyses: Record<string, any> = {};
        articlesWithAnalysis.forEach((item) => {
          newsAnalyses[item.article.id] = item.analysis;
        });

        const finalAnalysis: StockAnalysis = {
          ticker: cleanTicker,
          name,
          prediction,
          news: articlesWithAnalysis.map((item) => item.article),
          newsAnalyses,
          lastUpdated: new Date().toLocaleDateString(),
        };

        // Cache the analysis
        setStockAnalyses((prev) => ({ ...prev, [cleanTicker]: finalAnalysis }));

        // Update predictions and confidence scores in the watchlist
        setWatchlist((prevWatchlist) =>
          prevWatchlist.map((stock) =>
            stock.ticker === cleanTicker
              ? {
                  ...stock,
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
    handleRunMarketAnalysis(settings);
  }, []);

  // When selected ticker changes, load its analysis
  useEffect(() => {
    if (selectedTicker !== 'MARKET' && !stockAnalyses[selectedTicker]) {
      handleRunStockAnalysis(selectedTicker, settings);
    }
  }, [selectedTicker, stockAnalyses, settings, handleRunStockAnalysis]);

  // Watchlist Actions
  const handleAddStock = async (ticker: string) => {
    const cleanTicker = ticker.toUpperCase().trim();
    if (watchlist.some((s) => s.ticker === cleanTicker)) {
      setSelectedTicker(cleanTicker);
      return;
    }

    // Determine details
    const existingMock = MOCK_TICKERS[cleanTicker];
    const name = existingMock?.name || `${cleanTicker} Corporation`;
    const price = existingMock?.price || 50 + Math.random() * 200;
    const change = existingMock?.change || (Math.random() - 0.5) * 8; // -4% to +4%

    const newStock: WatchlistStock = {
      ticker: cleanTicker,
      name,
      price,
      change,
    };

    setWatchlist((prev) => [...prev, newStock]);
    setSelectedTicker(cleanTicker);
    // Analysis is triggered automatically by the selection useEffect hook
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
