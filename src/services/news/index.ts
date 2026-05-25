import type { INewsService, NewsArticle } from '../../types';
import { cleanHtmlDescription, formatDateString } from './parser';

export class NewsService implements INewsService {
  async fetchLatestNews(ticker?: string): Promise<NewsArticle[]> {
    const cleanTicker = ticker ? ticker.toUpperCase().trim() : '';
    
    // Decide feed URL based on whether we query a specific ticker or general market news
    let feedUrl = '';
    if (cleanTicker) {
      feedUrl = `https://finance.yahoo.com/rss/headline?s=${cleanTicker}`;
    } else {
      // General global stock market and economy news headlines
      feedUrl = `https://finance.yahoo.com/rss/headline?s=SPY,DIA,QQQ`;
    }
    
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
    
    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const xmlText = await response.text();
      
      // Parse RSS XML using standard DOMParser (fully supported in modern browsers)
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      // Parse error check
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        throw new Error("XML parsing error");
      }
      
      const items = xmlDoc.getElementsByTagName("item");
      const articles: NewsArticle[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const title = item.getElementsByTagName("title")[0]?.textContent || '';
        const link = item.getElementsByTagName("link")[0]?.textContent || '';
        const description = item.getElementsByTagName("description")[0]?.textContent || '';
        const pubDate = item.getElementsByTagName("pubDate")[0]?.textContent || '';
        const source = item.getElementsByTagName("source")[0]?.textContent || 'Yahoo Finance';
        
        // Compute a clean ID from the title hash or link to satisfy React rendering requirements
        const articleId = link ? link : `news-${cleanTicker}-${i}`;
        
        articles.push({
          id: articleId,
          title: title.trim(),
          source: source.trim(),
          time: formatDateString(pubDate),
          url: link.trim() || undefined,
          summary: cleanHtmlDescription(description)
        });
      }
      
      return articles;
    } catch (error) {
      console.warn(`Failed to fetch RSS news for ${cleanTicker || 'MARKET'}:`, error);
      // Return empty list if RSS feed fails so we don't break the app
      return [];
    }
  }
}
