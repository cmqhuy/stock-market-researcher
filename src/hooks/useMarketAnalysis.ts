import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppSettings, MarketState, NewsArticle } from '../types';
import { NewsService } from '../services/news';
import { AIService } from '../services/ai';
import { generateMockMarketAnalysis } from '../services/mock';

const newsService = new NewsService();
const aiService = new AIService();

export function useMarketAnalysis(
  settings: AppSettings,
  triggerError: (title: string, error: unknown, defaultMessage: string) => void
) {
  const [marketState, setMarketState] = useState<MarketState>(() => {
    const savedMarket = localStorage.getItem('omega_market_analysis');
    if (savedMarket) {
      try {
        const parsed = JSON.parse(savedMarket);
        if (parsed && typeof parsed === 'object' && parsed.prediction && Array.isArray(parsed.news)) {
          parsed.newsAnalyses = parsed.newsAnalyses || {};
          parsed.prediction.keyDrivers = Array.isArray(parsed.prediction.keyDrivers) ? parsed.prediction.keyDrivers : [];
          parsed.prediction.mainRisks = Array.isArray(parsed.prediction.mainRisks) ? parsed.prediction.mainRisks : [];
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse cached market state, falling back to mock.');
      }
    }
    return generateMockMarketAnalysis();
  });

  const [isLoadingMarket, setIsLoadingMarket] = useState(false);

  const lastUsedKeyRef = useRef(settings.apiKey);
  const lastUsedModeRef = useRef(settings.mode);

  // Sync market state to localStorage
  useEffect(() => {
    localStorage.setItem('omega_market_analysis', JSON.stringify(marketState));
  }, [marketState]);

  const runMarketAnalysis = useCallback(async (currentSettings: AppSettings) => {
    setIsLoadingMarket(true);
    try {
      // ALWAYS fetch real market news headlines first
      let activeArticles: NewsArticle[] = [];
      try {
        const articles = await newsService.fetchLatestNews();
        activeArticles = articles.slice(0, 10);
      } catch (newsError) {
        console.warn('Failed to fetch live market news, using local mock fallback:', newsError);
      }

      const isLive = currentSettings.mode === 'live' && !!currentSettings.apiKey;

      if (isLive) {
        if (activeArticles.length === 0) {
          // Fallback to offline mock articles so Gemini can run on something
          const offlineMock = generateMockMarketAnalysis();
          activeArticles = offlineMock.news;
        }

        // Run consolidated article analysis and 14-day synthesis in ONE single Gemini API call
        const { newsAnalyses, prediction, groundingArticles } = await aiService.analyzeNewsAndPredict(
          currentSettings.apiKey!,
          activeArticles
        );

        // De-duplicate and merge grounding articles from Gemini search
        const combinedArticles = [...activeArticles];
        (groundingArticles || []).forEach(ga => {
          const isDup = activeArticles.some(
            aa => (aa.url && aa.url === ga.url) || 
                  aa.title.toLowerCase().replace(/[^a-z0-9]/g, '') === ga.title.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (!isDup) combinedArticles.push(ga);
        });

        setMarketState({
          prediction,
          news: combinedArticles,
          newsAnalyses,
          lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: Date.now(),
          isSimulated: false
        });
      } else {
        // Demo Mode (or Live Mode with missing API Key)
        // Generate mock prediction based on active articles (if any)
        const mockMarket = generateMockMarketAnalysis(activeArticles.length > 0 ? activeArticles : undefined);
        setMarketState({
          prediction: mockMarket.prediction,
          news: mockMarket.news,
          newsAnalyses: {}, // AI analysis is disabled in Demo Mode
          lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
          timestamp: Date.now(),
          isSimulated: true
        });
      }
    } catch (error) {
      console.error('Market analysis failed:', error);
      triggerError(
        'Market Analysis Failed',
        error,
        'Failed to execute Live Market Analysis. The app has fallen back to simulated data. Please verify your API key and connection.'
      );
      
      // Fetch latest news anyway so we show live news even in error fallback
      let fallbackNews: NewsArticle[] = [];
      try {
        fallbackNews = (await newsService.fetchLatestNews()).slice(0, 10);
      } catch {
        // ignore
      }
      const mockMarket = generateMockMarketAnalysis(fallbackNews);
      setMarketState({
        prediction: mockMarket.prediction,
        news: mockMarket.news,
        newsAnalyses: {}, // Empty in Demo Mode / Error fallback
        lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
        timestamp: 0, // Store fallback with timestamp=0 so it's always treated as expired and re-fetched next time
        isSimulated: true
      });
    } finally {
      setIsLoadingMarket(false);
    }
  }, [triggerError]);

  // Run initial market analysis on mount if expired or configuration changes
  useEffect(() => {
    const now = Date.now();
    const isExpired = !marketState.timestamp || (now - marketState.timestamp > 60 * 60 * 1000);
    const isSimulated = marketState.isSimulated === true;
    const modeChanged = settings.mode !== lastUsedModeRef.current;
    const keyChanged = settings.apiKey !== lastUsedKeyRef.current;

    const needsRefetch = isExpired || 
                          (settings.mode === 'live' && isSimulated) || 
                          (settings.mode === 'live' && keyChanged) || 
                          modeChanged;

    if (needsRefetch) {
      lastUsedKeyRef.current = settings.apiKey;
      lastUsedModeRef.current = settings.mode;
      runMarketAnalysis(settings);
    }
  }, [settings, runMarketAnalysis]);

  return {
    marketState,
    isLoadingMarket,
    runMarketAnalysis
  };
}
