import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppSettings, StockAnalysis, WatchlistStock, NewsArticle } from '../types';
import { NewsService } from '../services/news';
import { AIService } from '../services/ai';
import { StockService } from '../services/stock';
import { generateMockStockAnalysis, MOCK_TICKERS } from '../services/mock';

const newsService = new NewsService();
const aiService = new AIService();
const stockService = new StockService();

export function useStockAnalysis(
  settings: AppSettings,
  watchlist: WatchlistStock[],
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistStock[]>>,
  selectedTicker: string,
  triggerError: (title: string, error: unknown, defaultMessage: string) => void
) {
  const [stockAnalyses, setStockAnalyses] = useState<Record<string, StockAnalysis>>(() => {
    const savedAnalyses = localStorage.getItem('omega_stock_analyses');
    if (savedAnalyses) {
      try {
        const parsed = JSON.parse(savedAnalyses);
        if (parsed && typeof parsed === 'object') {
          const validated: Record<string, StockAnalysis> = {};
          Object.keys(parsed).forEach((ticker) => {
            const item = parsed[ticker];
            if (item && typeof item === 'object' && item.prediction && Array.isArray(item.news)) {
              item.newsAnalyses = item.newsAnalyses || {};
              item.prediction.keyDrivers = Array.isArray(parsed.prediction?.keyDrivers) ? parsed.prediction.keyDrivers : (item.prediction?.keyDrivers || []);
              item.prediction.mainRisks = Array.isArray(parsed.prediction?.mainRisks) ? parsed.prediction.mainRisks : (item.prediction?.mainRisks || []);
              validated[ticker] = item;
            }
          });
          return validated;
        }
      } catch (e) {
        console.error('Failed to parse cached stock analyses.');
      }
    }
    return {};
  });

  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const lastUsedKeyRef = useRef(settings.apiKey);
  const lastUsedModeRef = useRef(settings.mode);
  const lastSelectedTickerRef = useRef(selectedTicker);
  const inFlightRef = useRef<Record<string, boolean>>({});

  // Sync stock analyses to localStorage
  useEffect(() => {
    localStorage.setItem('omega_stock_analyses', JSON.stringify(stockAnalyses));
  }, [stockAnalyses]);

  const runStockAnalysis = useCallback(async (ticker: string, currentSettings: AppSettings) => {
    const cleanTicker = ticker.toUpperCase().trim();
    if (inFlightRef.current[cleanTicker]) return;
    inFlightRef.current[cleanTicker] = true;

    const stockInfo = watchlist.find((s) => s.ticker === cleanTicker) || MOCK_TICKERS[cleanTicker];
    const name = stockInfo?.name || `${cleanTicker} Inc.`;

    setIsLoadingStock(true);
    try {
      // ALWAYS fetch real stock news and latest price/change in parallel
      let activeArticles: NewsArticle[] = [];
      let quote: any = null;
      try {
        const [articles, quoteData] = await Promise.all([
          newsService.fetchLatestNews(cleanTicker),
          stockService.fetchQuote(cleanTicker).catch(() => null)
        ]);
        activeArticles = articles.slice(0, 10);
        quote = quoteData;
      } catch (fetchError) {
        console.warn(`Failed to fetch live stock data for ${cleanTicker}, using local mock fallback:`, fetchError);
      }

      // Verify user is still looking at this stock after the async news/quote fetch
      if (cleanTicker !== lastSelectedTickerRef.current) {
        console.log(`User navigated away from ${cleanTicker} during fetch. Aborting.`);
        return;
      }

      const nameToUse = quote?.name || name;
      const isLive = currentSettings.mode === 'live' && !!currentSettings.apiKey;

      if (isLive) {
        let finalArticles = activeArticles;
        if (finalArticles.length === 0) {
          // Fallback to offline mock articles
          const offlineMock = generateMockStockAnalysis(cleanTicker);
          finalArticles = offlineMock.news;
        }

        // Run consolidated article analysis and 14-day synthesis in ONE single Gemini API call
        const { newsAnalyses, prediction, groundingArticles } = await aiService.analyzeNewsAndPredict(
          currentSettings.apiKey!,
          finalArticles,
          { ticker: cleanTicker, name: nameToUse }
        );

        // Verify user is still looking at this stock after the async Gemini call
        if (cleanTicker !== lastSelectedTickerRef.current) {
          console.log(`User navigated away from ${cleanTicker} during Gemini call. Aborting state update.`);
          return;
        }

        // De-duplicate and merge grounding articles from Gemini search
        const combinedArticles = [...finalArticles];
        (groundingArticles || []).forEach(ga => {
          const isDup = finalArticles.some(
            aa => (aa.url && aa.url === ga.url) || 
                  aa.title.toLowerCase().replace(/[^a-z0-9]/g, '') === ga.title.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (!isDup) combinedArticles.push(ga);
        });

        const finalAnalysis: StockAnalysis = {
          ticker: cleanTicker,
          name: nameToUse,
          prediction,
          news: combinedArticles,
          newsAnalyses,
          lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: Date.now(),
          isSimulated: false
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
                  history: quote?.history && quote.history.length > 0 ? quote.history : stock.history,
                  historyTimestamps: quote?.historyTimestamps && quote.historyTimestamps.length > 0 ? quote.historyTimestamps : stock.historyTimestamps,
                  prediction: prediction.stance,
                  confidence: prediction.confidence,
                }
              : stock
          )
        );
      } else {
        // Demo Mode (or Live Mode with missing API Key)
        // Generate mock analysis based on real articles (if any)
        const mockAnalysis = generateMockStockAnalysis(cleanTicker, activeArticles.length > 0 ? activeArticles : undefined);
        
        // Verify user is still looking at this stock before writing simulated data to state
        if (cleanTicker !== lastSelectedTickerRef.current) {
          return;
        }

        const finalAnalysis: StockAnalysis = {
          ...mockAnalysis,
          newsAnalyses: {}, // AI analysis is disabled in Demo Mode
          lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: Date.now(),
          isSimulated: true
        };

        setStockAnalyses((prev) => ({ ...prev, [cleanTicker]: finalAnalysis }));

        setWatchlist((prevWatchlist) =>
          prevWatchlist.map((stock) =>
            stock.ticker === cleanTicker
              ? {
                  ...stock,
                  name: nameToUse,
                  price: quote?.price || stock.price || mockAnalysis.prediction.confidence * 2,
                  change: quote?.change || stock.change || (mockAnalysis.prediction.confidence / 10 - 5),
                  history: quote?.history && quote.history.length > 0 ? quote.history : stock.history,
                  historyTimestamps: quote?.historyTimestamps && quote.historyTimestamps.length > 0 ? quote.historyTimestamps : stock.historyTimestamps,
                  prediction: mockAnalysis.prediction.stance,
                  confidence: mockAnalysis.prediction.confidence,
                }
              : stock
          )
        );
      }
    } catch (error) {
      console.error(`Stock analysis failed for ${cleanTicker}:`, error);

      // Verify user is still looking at this stock before triggering error dialog or fallback updates
      if (cleanTicker !== lastSelectedTickerRef.current) {
        return;
      }

      triggerError(
        `Analysis Failed: ${cleanTicker}`,
        error,
        `Failed to analyze ${cleanTicker} in Live Mode. The app has fallen back to simulated data. Please verify your API key and connection.`
      );
      
      // Fetch latest news and quote anyway so we show live news and live prices even in error fallback
      let fallbackNews: NewsArticle[] = [];
      let fallbackQuote: any = null;
      try {
        [fallbackNews, fallbackQuote] = await Promise.all([
          newsService.fetchLatestNews(cleanTicker),
          stockService.fetchQuote(cleanTicker).catch(() => null)
        ]);
        fallbackNews = fallbackNews.slice(0, 10);
      } catch {
        // ignore
      }

      const mockAnalysis = generateMockStockAnalysis(cleanTicker, fallbackNews.length > 0 ? fallbackNews : undefined);
      const finalAnalysis: StockAnalysis = {
        ...mockAnalysis,
        newsAnalyses: {}, // Empty in Demo Mode / Error fallback
        lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
        timestamp: 0, // Store fallback with timestamp=0 so it's always treated as expired and re-fetched next time
        isSimulated: true
      };
      
      setStockAnalyses((prev) => ({ ...prev, [cleanTicker]: finalAnalysis }));
      setWatchlist((prevWatchlist) =>
        prevWatchlist.map((stock) =>
          stock.ticker === cleanTicker
            ? {
                ...stock,
                price: fallbackQuote?.price || stock.price || mockAnalysis.prediction.confidence * 2,
                change: fallbackQuote?.change || stock.change || (mockAnalysis.prediction.confidence / 10 - 5),
                history: fallbackQuote?.history && fallbackQuote.history.length > 0 ? fallbackQuote.history : stock.history,
                historyTimestamps: fallbackQuote?.historyTimestamps && fallbackQuote.historyTimestamps.length > 0 ? fallbackQuote.historyTimestamps : stock.historyTimestamps,
                prediction: mockAnalysis.prediction.stance,
                confidence: mockAnalysis.prediction.confidence,
              }
            : stock
        )
      );
    } finally {
      inFlightRef.current[cleanTicker] = false;
      if (cleanTicker === lastSelectedTickerRef.current) {
        setIsLoadingStock(false);
      }
    }
  }, [watchlist, setWatchlist, triggerError]);

  // Load analysis whenever the selected stock changes, expires, or configuration changes
  useEffect(() => {
    if (selectedTicker !== 'MARKET') {
      const existing = stockAnalyses[selectedTicker];
      const now = Date.now();
      const isExpired = !existing || !existing.timestamp || (now - existing.timestamp > 60 * 60 * 1000);
      const isSimulated = existing?.isSimulated === true;
      const modeChanged = settings.mode !== lastUsedModeRef.current;
      const keyChanged = settings.apiKey !== lastUsedKeyRef.current;
      const tickerChanged = selectedTicker !== lastSelectedTickerRef.current;

      const needsRefetch = isExpired || 
                            (settings.mode === 'live' && isSimulated) || 
                            (settings.mode === 'live' && keyChanged) || 
                            modeChanged;

      if (needsRefetch) {
        lastUsedKeyRef.current = settings.apiKey;
        lastUsedModeRef.current = settings.mode;
        lastSelectedTickerRef.current = selectedTicker;
        runStockAnalysis(selectedTicker, settings);
      } else if (tickerChanged) {
        lastSelectedTickerRef.current = selectedTicker;
      }
    }
  }, [selectedTicker, settings, runStockAnalysis]);

  return {
    stockAnalyses,
    isLoadingStock,
    runStockAnalysis
  };
}
