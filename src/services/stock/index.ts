import type { IStockService, StockQuote } from '../../types';
import { getTickerName } from './tickerMapper';

export class StockService implements IStockService {
  async fetchQuote(ticker: string): Promise<StockQuote> {
    const cleanTicker = ticker.toUpperCase().trim();
    // Fetch 7 days of daily price data
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=7d`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Yahoo Finance quote for ${cleanTicker}: HTTP error ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (!meta) {
      throw new Error(`No metadata returned from Yahoo API for ${cleanTicker}`);
    }

    const price = meta.regularMarketPrice;
    
    // Parse historical close prices and matching timestamps
    let history: number[] = [];
    let historyTimestamps: number[] = [];
    const closes = result?.indicators?.quote?.[0]?.close;
    const timestamps = result?.timestamp;

    if (Array.isArray(closes) && Array.isArray(timestamps)) {
      for (let i = 0; i < closes.length; i++) {
        const val = closes[i];
        const ts = timestamps[i];
        if (typeof val === 'number' && !isNaN(val) && typeof ts === 'number') {
          history.push(val);
          historyTimestamps.push(ts * 1000); // Convert to milliseconds
        }
      }
    }

    // Determine the correct previous close for daily percentage change calculation
    let prevClose = meta.previousClose || meta.chartPreviousClose || price;
    
    if (history.length > 0) {
      // Default to the last historical close
      prevClose = history[history.length - 1];

      const regularStart = meta.currentTradingPeriod?.regular?.start;
      if (historyTimestamps.length >= 2 && typeof regularStart === 'number') {
        const lastTsSeconds = historyTimestamps[historyTimestamps.length - 1] / 1000;
        if (lastTsSeconds >= regularStart) {
          // The last point in the chart is from the current trading day, so the previous close is the point before it
          prevClose = history[history.length - 2];
        }
      } else if (history.length >= 2) {
        // Fallback: check if the last close is very close to the current price
        const lastClose = history[history.length - 1];
        const diffPct = Math.abs((lastClose - price) / price);
        if (diffPct < 0.001) {
          prevClose = history[history.length - 2];
        }
      }
    }

    const change = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const name = getTickerName(cleanTicker);

    return {
      ticker: cleanTicker,
      name,
      price,
      change,
      history,
      historyTimestamps
    };
  }
}
