export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  time: string;
  url?: string;
  summary?: string;
}

export interface AgentAnalysis {
  agentName: string;
  agentRole: string;
  stance: 'up' | 'down' | 'unchanged';
  confidence: number; // 0 to 100
  commentary: string;
}

export interface ArticleAnalysis {
  articleId: string;
  consensusStance: 'up' | 'down' | 'unchanged';
  consensusConfidence: number; // 0 to 100
  reasoning: string;
  agentAnalyses: AgentAnalysis[];
}

export interface Prediction14Day {
  stance: 'up' | 'down' | 'unchanged';
  confidence: number; // 0 to 100
  summary: string;
  keyDrivers: string[];
  mainRisks: string[];
}

export interface StockAnalysis {
  ticker: string;
  name: string;
  prediction: Prediction14Day;
  news: NewsArticle[];
  newsAnalyses: Record<string, ArticleAnalysis>;
  lastUpdated: string;
  timestamp?: number;
  isSimulated?: boolean;
}

export interface MarketState {
  prediction: Prediction14Day;
  news: NewsArticle[];
  newsAnalyses: Record<string, ArticleAnalysis>;
  lastUpdated: string;
  timestamp?: number;
  isSimulated?: boolean;
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
