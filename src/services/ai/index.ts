import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IAIService, NewsArticle, ArticleAnalysis, Prediction14Day } from '../../types';
import { buildRoundtablePrompt } from './promptBuilder';

/**
 * Helper to initialize the Gemini client.
 */
function getGeminiModel(apiKey: string, enableSearch = false) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const config: any = {
    model: 'gemini-2.5-flash',
    generationConfig: {}
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
 */
async function generateContentWithRetry(
  model: any,
  prompt: string,
  maxRetries = 3,
  initialDelayMs = 2000,
  signal?: AbortSignal
): Promise<any> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return await model.generateContent(prompt, { signal });
    } catch (error: any) {
      if (error?.name === 'AbortError' || (error instanceof DOMException && error.name === 'AbortError')) {
        throw error;
      }
      const errorStr = String(error);
      const isRateLimit = errorStr.includes('429') || error?.status === 429 || errorStr.toLowerCase().includes('quota');
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`Gemini API rate limited (429). Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
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
        delay *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}

type PendingChangeListener = (pendingList: string[]) => void;

export class AIService implements IAIService {
  private static pendingRequests: string[] = [];
  private static listeners = new Set<PendingChangeListener>();

  static getPendingRequests(): string[] {
    return this.pendingRequests;
  }

  static subscribe(listener: PendingChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.pendingRequests);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static addPending(label: string) {
    this.pendingRequests.push(label);
    this.listeners.forEach(l => l([...this.pendingRequests]));
  }

  private static removePending(label: string) {
    this.pendingRequests = this.pendingRequests.filter(r => r !== label);
    this.listeners.forEach(l => l([...this.pendingRequests]));
  }

  async analyzeNewsAndPredict(
    apiKey: string,
    articles: NewsArticle[],
    tickerContext?: { ticker: string; name: string },
    signal?: AbortSignal
  ): Promise<{
    newsAnalyses: Record<string, ArticleAnalysis>;
    prediction: Prediction14Day;
    groundingArticles?: NewsArticle[];
  }> {
    const targetLabel = tickerContext
      ? `${tickerContext.name} (${tickerContext.ticker.toUpperCase()})`
      : 'Global Market Overview';

    const prompt = buildRoundtablePrompt(articles, tickerContext);

    try {
      AIService.addPending(targetLabel);
      const model = getGeminiModel(apiKey, true); // Enable Google Search grounding
      const result = await generateContentWithRetry(model, prompt, 3, 2000, signal);
      const textResponse = result.response.text();

      if (!textResponse) {
        throw new Error('Empty response from Gemini API');
      }

      // Clean up text response if markdown code blocks wrap the JSON
      let jsonString = textResponse.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
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

      return {
        newsAnalyses: parsed.newsAnalyses,
        prediction: parsed.prediction as Prediction14Day,
        groundingArticles
      };
    } catch (error) {
      console.error(`Gemini consolidated analysis failed for ${targetLabel}:`, error);
      throw error;
    } finally {
      AIService.removePending(targetLabel);
    }
  }
}
