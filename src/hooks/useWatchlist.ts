import { useState, useEffect, useCallback } from 'react';
import type { WatchlistStock } from '../types';
import { StockService } from '../services/stock';
import { getMockWatchlist } from '../services/mock';

const stockService = new StockService();

export function useWatchlist(mode: 'live' | 'demo') {
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

  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // Sync watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('watchlist_stocks', JSON.stringify(watchlist));
  }, [watchlist]);

  // Refresh all quotes from the live Yahoo Finance service
  const refreshQuotes = useCallback(async () => {
    if (watchlist.length === 0) return;
    try {
      const updatedWatchlist = await Promise.all(
        watchlist.map(async (stock) => {
          try {
            const quote = await stockService.fetchQuote(stock.ticker);
            return {
              ...stock,
              name: quote.name,
              price: quote.price,
              change: quote.change,
              history: quote.history && quote.history.length > 0 ? quote.history : stock.history,
              historyTimestamps: quote.historyTimestamps && quote.historyTimestamps.length > 0 ? quote.historyTimestamps : stock.historyTimestamps
            };
          } catch (err) {
            console.warn(`Failed to refresh quote for ${stock.ticker}:`, err);
            return stock;
          }
        })
      );

      // Only update state if something changed (prices, changes, history, or timestamps)
      setWatchlist(prev => {
        const hasChanged = updatedWatchlist.some((updated, idx) => {
          const current = prev[idx];
          return !current || 
                 current.price !== updated.price || 
                 current.change !== updated.change ||
                 JSON.stringify(current.history) !== JSON.stringify(updated.history) ||
                 JSON.stringify(current.historyTimestamps) !== JSON.stringify(updated.historyTimestamps);
        });
        return hasChanged ? updatedWatchlist : prev;
      });
    } catch (err) {
      console.warn('Watchlist quotes refresh failed:', err);
    }
  }, [watchlist]);

  // Initial live quotes refresh on mount
  useEffect(() => {
    refreshQuotes();
  }, []);

  // Poll for live stock quotes every 15 seconds
  useEffect(() => {
    let active = true;
    const pollInterval = setInterval(async () => {
      if (!active) return;
      await refreshQuotes();
    }, 15000);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [refreshQuotes]);

  // Add a new stock ticker to the watchlist
  const addStock = useCallback(async (ticker: string) => {
    const cleanTicker = ticker.toUpperCase().trim();
    if (watchlist.some((s) => s.ticker === cleanTicker)) {
      return cleanTicker; // Already exists, return to select it
    }

    setIsLoadingQuote(true);
    try {
      let name = `${cleanTicker} Corporation`;
      let price = 100;
      let change = 0;
      let history: number[] = [];
      let historyTimestamps: number[] = [];

      try {
        // Always try to fetch live price first
        const quote = await stockService.fetchQuote(cleanTicker);
        name = quote.name;
        price = quote.price;
        change = quote.change;
        history = quote.history || [];
        historyTimestamps = quote.historyTimestamps || [];
      } catch (err) {
        // Fall back to mock seed data only if settings.mode is 'demo'
        if (mode === 'demo') {
          console.warn(`Falling back to mock ticker data for ${cleanTicker}`);
          const mockStocks = getMockWatchlist();
          const existingMock = mockStocks.find(s => s.ticker === cleanTicker);
          name = existingMock?.name || `${cleanTicker} Corporation`;
          price = existingMock?.price || 50 + Math.random() * 200;
          change = existingMock?.change || (Math.random() - 0.5) * 8;
        } else {
          // In live mode, propagate the error up so the UI can notify the user
          throw err;
        }
      }

      const newStock: WatchlistStock = {
        ticker: cleanTicker,
        name,
        price,
        change,
        history,
        historyTimestamps,
      };

      setWatchlist((prev) => [...prev, newStock]);
      return cleanTicker;
    } finally {
      setIsLoadingQuote(false);
    }
  }, [watchlist, mode]);

  // Remove a stock ticker from the watchlist
  const removeStock = useCallback((ticker: string) => {
    setWatchlist((prev) => prev.filter((s) => s.ticker !== ticker));
  }, []);

  // Reorder stock tickers in the watchlist
  const reorderWatchlist = useCallback((newWatchlist: WatchlistStock[]) => {
    setWatchlist(newWatchlist);
  }, []);

  return {
    watchlist,
    isLoadingQuote,
    addStock,
    removeStock,
    reorderWatchlist,
    refreshQuotes,
    setWatchlist
  };
}
