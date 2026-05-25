import type { NewsArticle } from '../types';
import { generateMockMarketAnalysis, generateMockStockAnalysis, getMockWatchlist } from './mockDataGenerator';

/**
 * Fetches news from Yahoo Finance RSS feed via a public CORS proxy.
 * Falls back to mock data if the request fails.
 * 
 * @param ticker Optional ticker symbol. If omitted, fetches general market news.
 */
/**
 * Helper to fetch a single RSS feed via proxy and return parsed articles.
 */
async function fetchRssFeed(feedUrl: string, defaultSource: string): Promise<NewsArticle[]> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    if (xmlDoc.querySelector('parsererror')) {
      return [];
    }

    const items = xmlDoc.querySelectorAll('item');
    const articles: NewsArticle[] = [];

    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const rawDescription = item.querySelector('description')?.textContent || '';
      const summary = cleanHtmlDescription(rawDescription);
      const pubDate = item.querySelector('pubDate')?.textContent || new Date().toUTCString();
      let source = item.querySelector('source')?.textContent?.trim() || defaultSource;

      if (defaultSource === 'MarketWatch') {
        source = 'MarketWatch';
      } else if (defaultSource === 'CNBC') {
        source = 'CNBC';
      }

      if (!title || !link) return;

      articles.push({
        id: '', // Will be assigned during consolidation
        title,
        source,
        time: pubDate, // Store raw pubDate for sorting
        url: link,
        summary: summary || 'Select this article to read detailed expert panel commentary and market impact analysis.'
      });
    });

    return articles;
  } catch (error) {
    console.warn(`Feed fetch failed for ${feedUrl}:`, error);
    return [];
  }
}

/**
 * Fetches latest news headlines from multiple premium sources (Yahoo Finance, CNBC, MarketWatch) in parallel.
 * Merges, de-duplicates, and sorts them by date.
 * 
 * @param ticker Optional ticker symbol. If omitted, fetches general market news.
 */
export async function fetchLatestNews(ticker?: string): Promise<NewsArticle[]> {
  const cleanTicker = ticker?.toUpperCase().trim();
  const feeds: { url: string; source: string }[] = [];

  if (cleanTicker) {
    feeds.push({
      url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${cleanTicker}&region=US&lang=en-US`,
      source: 'Yahoo Finance'
    });
    feeds.push({
      url: `https://search.cnbc.com/rs/search/combinedseo/search.xml?partnerId=2&minCount=10&keywords=${cleanTicker}`,
      source: 'CNBC'
    });
  } else {
    feeds.push({
      url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,DIA&region=US&lang=en-US',
      source: 'Yahoo Finance'
    });
    feeds.push({
      url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
      source: 'CNBC'
    });
    feeds.push({
      url: 'https://feeds.content.outlook.marketwatch.com/rss/marketwatch/topstories',
      source: 'MarketWatch'
    });
  }

  try {
    // Fetch all feeds in parallel
    const results = await Promise.all(
      feeds.map(feed => fetchRssFeed(feed.url, feed.source))
    );

    // Merge articles
    const mergedArticles: NewsArticle[] = [];
    results.forEach(list => {
      mergedArticles.push(...list);
    });

    if (mergedArticles.length === 0) {
      throw new Error('No articles found in any RSS feeds');
    }

    // De-duplicate articles by simplified title to avoid identical syndicated headlines
    const seenTitles = new Set<string>();
    const uniqueArticles: NewsArticle[] = [];

    mergedArticles.forEach(art => {
      const simplifiedTitle = art.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // remove punctuation/spaces
        .trim();
      
      if (!seenTitles.has(simplifiedTitle)) {
        seenTitles.add(simplifiedTitle);
        uniqueArticles.push(art);
      }
    });

    // Sort by publication date (descending)
    uniqueArticles.sort((a, b) => {
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });

    // Take top 10 articles and format their IDs and dates
    const finalArticles = uniqueArticles.slice(0, 10).map((art, idx) => {
      return {
        ...art,
        id: cleanTicker ? `${cleanTicker.toLowerCase()}-live-${idx}` : `market-live-${idx}`,
        time: formatDateString(art.time)
      };
    });

    return finalArticles;
  } catch (error) {
    console.warn(`Multi-feed fetch failed for ${cleanTicker || 'General Market'}, falling back to mock data:`, error);
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
