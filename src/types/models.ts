export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  time: string;
  url?: string;
  summary?: string;
}

export interface AppSettings {
  apiKey: string;
  mode: 'demo' | 'live';
}

export interface WatchlistStock {
  ticker: string;
  name: string;
  price: number;
  change: number; // percentage
  prediction?: 'up' | 'down' | 'unchanged';
  confidence?: number;
  history?: number[];
  historyTimestamps?: number[];
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  history?: number[];
  historyTimestamps?: number[];
}
