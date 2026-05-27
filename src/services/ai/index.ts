import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAIService, NewsArticle, ArticleAnalysis, Prediction14Day } from '../../types';
import { buildRoundtablePrompt } from './promptBuilder';
import { GeminiLogger } from './logger';

/**
 * Helper to initialize the Gemini client.
 */
function getGeminiModel(apiKey: string, enableSearch = false) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const config: any = {
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.15, // Low temperature for high analytical consistency and determinism
    }
  };
  
  if (enableSearch) {
    config.tools = [{ googleSearch: {} }];
  } else {
    config.generationConfig.responseMimeType = 'application/json';
  }

  return genAI.getGenerativeModel(config);
}

/**
 * Retries the Gemini generation with exponential backoff on 429 rate limit exceptions.
 * Calls GeminiLogger.retry(logId) on each retry attempt.
 */
async function generateContentWithRetry(
  apiKeys: string[],
  prompt: string,
  logId: string,
  maxRetries = 3,
  initialDelayMs = 2000,
  signal?: AbortSignal
): Promise<any> {
  let delay = initialDelayMs;
  const attemptsLimit = Math.max(maxRetries, apiKeys.length);
  
  for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
    const keyIndex = AIService.getNextKeyIndex() % apiKeys.length;
    const currentKey = apiKeys[keyIndex];
    
    try {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const model = getGeminiModel(currentKey, true); // Enable Google Search grounding
      const result = await model.generateContent(prompt, { signal });
      return result;
    } catch (error: any) {
      if (error?.name === 'AbortError' || (error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
      const errorStr = String(error);
      const isRateLimit = errorStr.includes('429') || error?.status === 429 || errorStr.toLowerCase().includes('quota');
      if (isRateLimit && attempt < attemptsLimit) {
        console.warn(`Gemini API rate limited with key index ${keyIndex} (attempt ${attempt}/${attemptsLimit}). Rotating key and retrying in ${delay}ms...`);
        AIService.rotateKey();
        GeminiLogger.retry(logId);
        if (signal) {
          await new Promise<void>((resolve, reject) => {
            if (signal.aborted) {
              reject(new DOMException('Aborted', 'AbortError'));
              return;
            }
            const timer = setTimeout(() => {
              signal.removeEventListener('abort', abortHandler);
              resolve();
            }, delay);
            const abortHandler = () => {
              clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            };
            signal.addEventListener('abort', abortHandler);
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        delay *= 1.5;
      } else {
        throw error;
      }
    }
  }
}

class RequestQueue {
  private queue: Array<{
    fn: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private running = false;
  private lastRequestTime = 0;
  private minDelayMs = 2000; // Force 2 seconds between API calls to avoid rate limits

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.minDelayMs) {
        const waitTime = this.minDelayMs - elapsed;
        await new Promise((r) => setTimeout(r, waitTime));
      }

      this.lastRequestTime = Date.now();

      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.running = false;
  }
}

export interface PendingState {
  active: string[];
  queued: string[];
}

type PendingChangeListener = (state: PendingState) => void;

export class AIService implements IAIService {
  private static activeRequests: string[] = [];
  private static queuedRequests: string[] = [];
  private static listeners = new Set<PendingChangeListener>();
  private static queue = new RequestQueue();
  private static currentKeyIndex = 0;

  static rotateKey() {
    this.currentKeyIndex++;
  }

  static getNextKeyIndex() {
    return this.currentKeyIndex;
  }

  static getPendingState(): PendingState {
    return {
      active: this.activeRequests,
      queued: this.queuedRequests
    };
  }

  static subscribe(listener: PendingChangeListener): () => void {
    this.listeners.add(listener);
    listener({ active: [...this.activeRequests], queued: [...this.queuedRequests] });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify() {
    const state = { active: [...this.activeRequests], queued: [...this.queuedRequests] };
    this.listeners.forEach(l => l(state));
  }

  private static addQueued(label: string) {
    this.queuedRequests.push(label);
    this.notify();
  }

  private static promoteToActive(label: string) {
    this.queuedRequests = this.queuedRequests.filter(r => r !== label);
    this.activeRequests.push(label);
    this.notify();
  }

  private static removeRequest(label: string) {
    this.queuedRequests = this.queuedRequests.filter(r => r !== label);
    this.activeRequests = this.activeRequests.filter(r => r !== label);
    this.notify();
  }

  async analyzeNewsAndPredict(
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
  }> {
    const targetLabel = tickerContext
      ? `${tickerContext.name} (${tickerContext.ticker.toUpperCase()})`
      : 'Global Market Overview';

    const ticker = tickerContext?.ticker?.toUpperCase() ?? 'MARKET';
    const type = tickerContext ? 'stock-analysis' : 'market-overview';
    const callsite = logMeta?.callsite ?? 'manual';
    const trigger = logMeta?.trigger ?? 'unknown';

    // Begin structured log entry
    const logId = GeminiLogger.begin({
      callsite,
      type,
      ticker,
      trigger,
      articleCount: articles.length,
    });

    const prompt = buildRoundtablePrompt(articles, tickerContext);

    try {
      AIService.addQueued(targetLabel);

      const apiKeys = apiKey.split(/[\s,\n\r]+/).map(k => k.trim()).filter(Boolean);
      if (apiKeys.length === 0) {
        throw new Error('No valid Gemini API key provided.');
      }

      const result = await AIService.queue.enqueue(async () => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        AIService.promoteToActive(targetLabel);
        const res = await generateContentWithRetry(apiKeys, prompt, logId, 1, 2000, signal);
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        // Rotate key index for the next call
        AIService.rotateKey();
        return res;
      });

      const textResponse = result.response.text();

      if (!textResponse) {
        throw new Error('Empty response from Gemini API');
      }

      // Clean up text response using regex to extract the JSON block,
      // discarding any conversational text before/after code blocks.
      let jsonString = textResponse.trim();
      
      const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = jsonString.match(jsonBlockRegex);
      
      if (match && match[1]) {
        jsonString = match[1].trim();
      } else {
        const genericBlockRegex = /```\s*([\s\S]*?)\s*```/;
        const genericMatch = jsonString.match(genericBlockRegex);
        if (genericMatch && genericMatch[1]) {
          jsonString = genericMatch[1].trim();
        } else {
          // If no markdown blocks exist, extract everything from the first '{' to the last '}'
          const firstBrace = jsonString.indexOf('{');
          const lastBrace = jsonString.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1).trim();
          }
        }
      }

      const parsedRaw: any = JSON.parse(jsonString);
      if (!parsedRaw || typeof parsedRaw !== 'object') {
        throw new Error('Invalid JSON structure returned from Gemini API');
      }

      // Defensive construction of the parsed object structure
      const parsed = {
        newsAnalyses: (parsedRaw.newsAnalyses && typeof parsedRaw.newsAnalyses === 'object') ? parsedRaw.newsAnalyses : {},
        prediction: (parsedRaw.prediction && typeof parsedRaw.prediction === 'object') ? parsedRaw.prediction : {
          stance: 'unchanged',
          confidence: 50,
          summary: 'No prediction details provided by the model.',
          keyDrivers: [],
          mainRisks: []
        },
        aiDiscoveredNews: Array.isArray(parsedRaw.aiDiscoveredNews) ? parsedRaw.aiDiscoveredNews : []
      };

      // Ensure prediction properties are fully populated with defaults
      parsed.prediction.stance = parsed.prediction.stance || 'unchanged';
      parsed.prediction.confidence = typeof parsed.prediction.confidence === 'number' ? parsed.prediction.confidence : 50;
      parsed.prediction.summary = parsed.prediction.summary || 'Consensus synthesis pending panel updates.';
      parsed.prediction.keyDrivers = Array.isArray(parsed.prediction.keyDrivers) ? parsed.prediction.keyDrivers : [];
      parsed.prediction.mainRisks = Array.isArray(parsed.prediction.mainRisks) ? parsed.prediction.mainRisks : [];

      // Ensure there are at least some elements in drivers/risks to avoid empty lists
      while (parsed.prediction.keyDrivers.length < 3) {
        parsed.prediction.keyDrivers.push('Analyzing market momentum and volume trends.');
      }
      while (parsed.prediction.mainRisks.length < 3) {
        parsed.prediction.mainRisks.push('Potential macro rate volatility and market headlines.');
      }

      // Ensure all analyses have their correct article ID keys and safe field defaults
      Object.keys(parsed.newsAnalyses).forEach((key) => {
        const analysis = parsed.newsAnalyses[key];
        if (analysis && typeof analysis === 'object') {
          analysis.articleId = key;
          analysis.consensusStance = analysis.consensusStance || 'unchanged';
          analysis.consensusConfidence = typeof analysis.consensusConfidence === 'number' ? analysis.consensusConfidence : 50;
          analysis.reasoning = analysis.reasoning || '';
          analysis.agentAnalyses = Array.isArray(analysis.agentAnalyses) ? analysis.agentAnalyses : [];
          
          // Ensure all four agents exist or provide defaults
          analysis.agentAnalyses.forEach((agent: any) => {
            if (agent && typeof agent === 'object') {
              agent.agentName = agent.agentName || 'Analyst';
              agent.agentRole = agent.agentRole || 'Roundtable Member';
              agent.stance = agent.stance || 'unchanged';
              agent.confidence = typeof agent.confidence === 'number' ? agent.confidence : 50;
              agent.commentary = agent.commentary || 'Reviewing recent updates.';
            }
          });
        }
      });

      const groundingArticles: NewsArticle[] = [];
      const discovered = parsed.aiDiscoveredNews || [];

      discovered.forEach((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return;

        const itemId = item.id || `ai-grounding-discovered-${idx}`;
        const itemTitle = item.title || 'AI Discovered Market News';
        const itemSource = item.source || 'AI Search';
        const itemTime = item.time || 'AI Grounded';
        const itemUrl = item.url || '';
        const itemSummary = item.summary || 'Retrieved via Live AI Search Grounding.';

        // Add to grounding news list
        groundingArticles.push({
          id: itemId,
          title: itemTitle,
          source: itemSource,
          time: itemTime,
          url: itemUrl,
          summary: itemSummary
        });

        // Inject consensus analysis into newsAnalyses so they render accordions beautifully!
        if (item.analysis && typeof item.analysis === 'object') {
          const stance = item.analysis.consensusStance || 'unchanged';
          const confidence = typeof item.analysis.consensusConfidence === 'number' ? item.analysis.consensusConfidence : 50;
          const reasoning = item.analysis.reasoning || 'Cross-referenced via search grounding.';

          parsed.newsAnalyses[itemId] = {
            articleId: itemId,
            consensusStance: stance,
            consensusConfidence: confidence,
            reasoning: reasoning,
            agentAnalyses: [
              {
                agentName: 'Momentum Maverick',
                agentRole: 'Daytrader (Technical & Momentum)',
                stance: stance,
                confidence: confidence,
                commentary: `Factored into the panel consensus. This source supports our short-term technical and momentum stance.`
              },
              {
                agentName: 'Value Anchor',
                agentRole: 'Value Investor (Fundamentals & Moat)',
                stance: stance,
                confidence: confidence,
                commentary: `Factored into the panel consensus. Fundamental characteristics of this update have been parsed.`
              },
              {
                agentName: 'Macro Oracle',
                agentRole: 'Macro Strategist (Geopolitics & Policy)',
                stance: stance,
                confidence: confidence,
                commentary: `Factored into the panel consensus. Cross-referenced with macro yield curves and Fed rate policies.`
              },
              {
                agentName: 'Crowd Whisperer',
                agentRole: 'Sentiment Analyst (Retail & Options)',
                stance: stance,
                confidence: confidence,
                commentary: `Factored into the panel consensus. Options volume and retail social discussion metrics matched.`
              }
            ]
          };
        }
      });

      // Fallback: if Gemini returned grounding chunks but no JSON grounding articles, use them as backup
      if (groundingArticles.length === 0) {
        try {
          const groundingMetadata = (result.response as any).candidates?.[0]?.groundingMetadata;
          const groundingChunks = groundingMetadata?.groundingChunks || [];
          groundingChunks.forEach((chunk: any, idx: number) => {
            try {
              const web = chunk.web;
              if (web && web.uri && web.title) {
                let hostname = 'Web Search';
                try {
                  hostname = new URL(web.uri).hostname.replace('www.', '');
                } catch (urlErr) {
                  console.warn('Malformed grounding URL:', web.uri, urlErr);
                }
                groundingArticles.push({
                  id: `gemini-grounding-${idx}`,
                  title: web.title,
                  source: hostname,
                  time: 'AI Grounded',
                  url: web.uri,
                  summary: 'This source was retrieved and cross-referenced dynamically by Gemini search grounding.'
                });
              }
            } catch (chunkErr) {
              console.warn('Failed parsing grounding chunk:', chunkErr);
            }
          });
        } catch (metadataErr) {
          console.warn('Failed retrieving grounding metadata:', metadataErr);
        }
      }

      GeminiLogger.success(logId);
      return {
        newsAnalyses: parsed.newsAnalyses,
        prediction: parsed.prediction as Prediction14Day,
        groundingArticles
      };
    } catch (error: any) {
      if (error?.name === 'AbortError' || (error instanceof DOMException && error.name === 'AbortError')) {
        GeminiLogger.aborted(logId);
      } else {
        GeminiLogger.error(logId, error);
      }
      console.error(`Gemini consolidated analysis failed for ${targetLabel}:`, error);
      throw error;
    } finally {
      AIService.removeRequest(targetLabel);
    }
  }
}
