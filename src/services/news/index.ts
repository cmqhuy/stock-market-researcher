import type { INewsService, NewsArticle } from '../../types';
import { cleanHtmlDescription, formatDateString } from './parser';

/**
 * Reusable helper to fetch and parse a single RSS feed via CORS proxy.
 */
async function fetchAndParseRss(
  url: string,
  defaultSource: string,
  cleanTicker: string
): Promise<Array<{ article: NewsArticle; date: Date }>> {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const xmlText = await response.text();
    
    // Parse RSS XML using standard DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Parse error check
    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
      throw new Error("XML parsing error");
    }
    
    const items = xmlDoc.getElementsByTagName("item");
    const parsedArticles: Array<{ article: NewsArticle; date: Date }> = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.getElementsByTagName("title")[0]?.textContent || '';
      const link = item.getElementsByTagName("link")[0]?.textContent || '';
      const description = item.getElementsByTagName("description")[0]?.textContent || '';
      const pubDate = item.getElementsByTagName("pubDate")[0]?.textContent || '';
      
      let source = item.getElementsByTagName("source")[0]?.textContent || defaultSource;
      let cleanTitle = title.trim();
      
      // Clean up Google News title attribution suffix (e.g. "Stocks soar - CNBC" -> source: "CNBC")
      if (defaultSource === 'Google News') {
        const sourceMatch = cleanTitle.match(/\s+-\s+([^-]+)$/);
        if (sourceMatch && sourceMatch[1]) {
          source = sourceMatch[1].trim();
          cleanTitle = cleanTitle.replace(/\s+-\s+[^-]+$/, '').trim();
        }
      }
      
      // Generate a clean, safe ID for JSON keys (alphanumeric and hyphens only)
      const sourceSlug = defaultSource.toLowerCase().replace(/[^a-z0-9]/g, '');
      const tickerSlug = cleanTicker ? cleanTicker.toLowerCase() : 'market';
      const articleId = `art-${sourceSlug}-${tickerSlug}-${i}`;
      const parsedDate = new Date(pubDate);
      
      parsedArticles.push({
        article: {
          id: articleId,
          title: cleanTitle,
          source: source.trim(),
          time: formatDateString(pubDate),
          url: link.trim() || undefined,
          summary: cleanHtmlDescription(description)
        },
        date: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate
      });
    }
    
    return parsedArticles;
  } catch (error) {
    console.warn(`Failed to fetch RSS feed from ${defaultSource} (${url}):`, error);
    return [];
  }
}

export class NewsService implements INewsService {
  async fetchLatestNews(ticker?: string): Promise<NewsArticle[]> {
    const cleanTicker = ticker ? ticker.toUpperCase().trim() : '';
    const feeds: Array<{ url: string; source: string }> = [];

    if (cleanTicker) {
      // Stock Specific feeds
      feeds.push({
        url: `https://finance.yahoo.com/rss/headline?s=${cleanTicker}`,
        source: 'Yahoo Finance'
      });
      feeds.push({
        url: `https://news.google.com/rss/search?q=${cleanTicker}+stock&hl=en-US&gl=US&ceid=US:en`,
        source: 'Google News'
      });
    } else {
      // Global Market Overview feeds
      feeds.push({
        url: `https://finance.yahoo.com/rss/headline?s=SPY,DIA,QQQ`,
        source: 'Yahoo Finance'
      });
      feeds.push({
        url: `https://news.google.com/rss/search?q=stock+market+finance+economy&hl=en-US&gl=US&ceid=US:en`,
        source: 'Google News'
      });
      feeds.push({
        url: `https://search.cnbc.com/rs/search/all/view.xml?partnerId=2000&keywords=finance`,
        source: 'CNBC'
      });
      feeds.push({
        url: `https://feeds.content.dowjones.io/public/rss/mw_topstories`,
        source: 'MarketWatch'
      });
    }

    try {
      // Fetch all feeds in parallel
      const feedPromises = feeds.map(feed => fetchAndParseRss(feed.url, feed.source, cleanTicker));
      const results = await Promise.all(feedPromises);

      // Merge results
      const allArticles: Array<{ article: NewsArticle; date: Date }> = [];
      results.forEach(articles => allArticles.push(...articles));

      // De-duplicate by URL and Title (ignoring capitalization and non-alphanumeric chars)
      const seenUrls = new Set<string>();
      const seenTitles = new Set<string>();
      const uniqueArticles: Array<{ article: NewsArticle; date: Date }> = [];

      for (const item of allArticles) {
        const urlKey = item.article.url ? item.article.url.trim().toLowerCase() : '';
        const titleKey = item.article.title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        let isDuplicate = false;
        if (urlKey && seenUrls.has(urlKey)) {
          isDuplicate = true;
        }
        if (titleKey && seenTitles.has(titleKey)) {
          isDuplicate = true;
        }

        if (!isDuplicate) {
          if (urlKey) seenUrls.add(urlKey);
          if (titleKey) seenTitles.add(titleKey);
          uniqueArticles.push(item);
        }
      }

      // Sort chronologically (newest first)
      uniqueArticles.sort((a, b) => b.date.getTime() - a.date.getTime());

      return uniqueArticles.map(p => p.article);
    } catch (error) {
      console.warn(`Failed fetching aggregated news for ${cleanTicker || 'MARKET'}:`, error);
      return [];
    }
  }
}
