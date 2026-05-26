import type { NewsArticle, StockQuote } from './models';
import type { Prediction14Day, ArticleAnalysis } from './ai';

export interface IStockService {
  fetchQuote(ticker: string): Promise<StockQuote>;
}

export interface INewsService {
  fetchLatestNews(ticker?: string): Promise<NewsArticle[]>;
}

export interface IAIService {
  analyzeNewsAndPredict(
    apiKey: string,
    articles: NewsArticle[],
    tickerContext?: { ticker: string; name: string },
    signal?: AbortSignal,
    logMeta?: {
      callsite: 'useMarketAnalysis' | 'useStockAnalysis' | 'manual';
      trigger: string;
    }
  ): Promise<{
    newsAnalyses: Record<string, ArticleAnalysis>;
    prediction: Prediction14Day;
    groundingArticles?: NewsArticle[];
  }>;
}
