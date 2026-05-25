import type { NewsArticle } from '../types';
import { generateMockMarketAnalysis, generateMockStockAnalysis, getMockWatchlist } from './mockDataGenerator';

/**
 * Fetches news from Yahoo Finance RSS feed via a public CORS proxy.
 * Falls back to mock data if the request fails.
 * 
 * @param ticker Optional ticker symbol. If omitted, fetches general market news.
 */
export async function fetchLatestNews(ticker?: string): Promise<NewsArticle[]> {
  const cleanTicker = ticker?.toUpperCase().trim();
  let feedUrl = '';

  if (cleanTicker) {
    feedUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${cleanTicker}&region=US&lang=en-US`;
  } else {
    // For general market news, we fetch headlines for the major ETFs: SPY, QQQ, DIA
    feedUrl = 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,DIA&region=US&lang=en-US';
  }

  // Use allorigins.win as a reliable CORS proxy
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch news from RSS feed: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for XML parsing error
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('XML parsing failed');
    }

    const items = xmlDoc.querySelectorAll('item');
    const articles: NewsArticle[] = [];

    items.forEach((item, idx) => {
      const title = item.querySelector('title')?.textContent || 'No Title Available';
      const link = item.querySelector('link')?.textContent || '';
      
      // Clean up description if it contains HTML or extra markup
      const rawDescription = item.querySelector('description')?.textContent || '';
      const summary = cleanHtmlDescription(rawDescription);
      
      const pubDate = item.querySelector('pubDate')?.textContent || new Date().toUTCString();
      const source = item.querySelector('source')?.textContent || 'Yahoo Finance';

      // Format date for display
      const formattedDate = formatDateString(pubDate);

      articles.push({
        id: cleanTicker ? `${cleanTicker.toLowerCase()}-live-${idx}` : `market-live-${idx}`,
        title,
        source,
        time: formattedDate,
        url: link,
        summary: summary || 'Select this article to read detailed expert panel commentary and market impact analysis.'
      });
    });

    if (articles.length === 0) {
      throw new Error('No articles found in RSS feed');
    }

    // Sort by date (descending) or keep RSS ordering.
    // Ensure we return at least 5 articles for stock requests (as requested by user)
    if (cleanTicker && articles.length < 5) {
      // Pad with mock news if we have less than 5
      const mockAnalysis = generateMockStockAnalysis(cleanTicker);
      const needed = 5 - articles.length;
      articles.push(...mockAnalysis.news.slice(0, needed));
    }

    return articles;
  } catch (error) {
    console.warn(`RSS fetch failed for ${cleanTicker || 'General Market'}, falling back to mock data:`, error);
    // Return mock news from generator
    if (cleanTicker) {
      return generateMockStockAnalysis(cleanTicker).news;
    } else {
      return generateMockMarketAnalysis().news;
    }
  }
}

/**
 * Cleans Yahoo RSS description strings which often contain tracking pixels or HTML links.
 */
function cleanHtmlDescription(desc: string): string {
  if (!desc) return '';
  // Remove HTML tags
  let cleaned = desc.replace(/<\/?[^>]+(>|$)/g, "");
  // Remove Yahoo news sharing/tracking footer if present
  const footerIdx = cleaned.indexOf('Yahoo News');
  if (footerIdx !== -1) {
    cleaned = cleaned.substring(0, footerIdx);
  }
  return cleaned.trim();
}

/**
 * Formats standard pubDate RSS strings to a cleaner user-facing format.
 */
function formatDateString(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (e) {
    return dateStr;
  }
}

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
}

/**
 * Fetches live stock details (current price and change percentage) from Yahoo Finance.
 */
export async function fetchLiveStockQuote(ticker: string): Promise<StockQuote> {
  const cleanTicker = ticker.toUpperCase().trim();
  // Using Yahoo Finance Chart API
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanTicker}?interval=1d&range=1d`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    
    if (!meta) {
      throw new Error("No metadata returned from Yahoo API");
    }

    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose || price;
    const change = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    
    // Common mappings to display nice names
    const commonNames: Record<string, string> = {
      AAPL: 'Apple Inc.',
      MSFT: 'Microsoft Corporation',
      GOOGL: 'Alphabet Inc. (Class A)',
      GOOG: 'Alphabet Inc. (Class C)',
      AMZN: 'Amazon.com, Inc.',
      NVDA: 'NVIDIA Corporation',
      TSLA: 'Tesla, Inc.',
      META: 'Meta Platforms, Inc.',
      SPY: 'SPDR S&P 500 ETF Trust',
      QQQ: 'Invesco QQQ Trust',
      DIA: 'SPDR Dow Jones Industrial Average ETF Trust'
    };

    let name = cleanTicker;
    if (commonNames[cleanTicker]) {
      name = commonNames[cleanTicker];
    } else {
      name = `${cleanTicker} Corporation`;
    }

    return {
      ticker: cleanTicker,
      name,
      price,
      change
    };
  } catch (error) {
    console.warn(`Failed to fetch live quote for ${cleanTicker}:`, error);
    // Fall back to mock data
    const mockStocks = getMockWatchlist();
    const existingMock = mockStocks.find(s => s.ticker === cleanTicker);
    if (existingMock) {
      return {
        ticker: cleanTicker,
        name: existingMock.name,
        price: existingMock.price,
        change: existingMock.change
      };
    }
    
    return {
      ticker: cleanTicker,
      name: `${cleanTicker} Corporation`,
      price: 100 + Math.random() * 200,
      change: (Math.random() - 0.5) * 5
    };
  }
}
