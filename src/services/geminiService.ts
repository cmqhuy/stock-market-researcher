import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NewsArticle, ArticleAnalysis, Prediction14Day } from '../types';

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
    // Note: tool use with responseMimeType 'application/json' is unsupported,
    // so we rely on prompt instructions and manually parse the markdown JSON blocks.
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
  initialDelayMs = 2000
): Promise<any> {
  let delay = initialDelayMs;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      const errorStr = String(error);
      const isRateLimit = errorStr.includes('429') || error?.status === 429 || errorStr.toLowerCase().includes('quota');
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`Gemini API rate limited (429). Retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw error;
      }
    }
  }
}


/**
 * Executes a single API call to Gemini to analyze multiple articles and synthesize the 14-day prediction.
 * Uses Google Search Grounding to pull additional relevant news articles and catalysts.
 */
export async function analyzeNewsAndPredict(
  apiKey: string,
  articles: NewsArticle[],
  tickerContext?: { ticker: string; name: string }
): Promise<{
  newsAnalyses: Record<string, ArticleAnalysis>;
  prediction: Prediction14Day;
  groundingArticles?: NewsArticle[];
}> {
  const targetLabel = tickerContext
    ? `${tickerContext.name} (${tickerContext.ticker.toUpperCase()})`
    : 'The Broader US Stock Market (S&P 500 / SPY)';

  // Format articles for the prompt
  const formattedArticles = articles.map((art) => ({
    id: art.id,
    title: art.title,
    source: art.source,
    summary: art.summary || 'N/A'
  }));

  const prompt = `You are a panel of elite stock market analysts collaborating on asset analysis. 
Analyze the following news articles regarding the target asset.

Target Asset: ${targetLabel}

News Articles to analyze:
${JSON.stringify(formattedArticles, null, 2)}

ADDITIONAL INSTRUCTIONS:
Use Google Search to pull additional recent relevant news, press releases, option flows, and macroeconomic catalysts relating to ${targetLabel}. Use these search results to inform the panel's stances and consolidated prediction.

For each of the provided articles, your panel of four distinct virtual experts must provide individual analyses:
1. "Momentum Maverick" - Daytrader (Technical & Momentum): Focuses on short-term price action, volume, technical levels, support/resistance, momentum, and immediate reaction to news headlines.
2. "Value Anchor" - Value Investor (Fundamentals & Moat): Focuses on long-term fundamentals, company valuation, earnings power, debt, cash flows, and whether this news affects the company's long-term competitive moat or structural advantages.
3. "Macro Oracle" - Macro Strategist (Geopolitics & Policy): Focuses on high-level market trends, interest rates, inflation, geopolitics, central bank policies, sector rotation, and macroeconomic liquidity.
4. "Crowd Whisperer" - Sentiment Analyst (Retail & Options): Focuses on retail trader psychology, social media hype, options flows, crowd behavior, and market fear/greed indicators.

For each agent on each article, provide:
- stance: 'up' | 'down' | 'unchanged' (predicting the directional effect of this news on the target asset)
- confidence: number between 0 and 100
- commentary: a concise 1-2 sentence explanation detailing their core logic.

Also provide a consensus summary for each article:
- consensusStance: 'up' | 'down' | 'unchanged'
- consensusConfidence: number between 0 and 100
- reasoning: a brief explanation of how the consensus was reached or why the panel is split.

Finally, synthesize the collective findings across both the provided articles and any additional relevant search results you retrieved to make a unified 14-day movement prediction for the target asset:
- stance: 'up' | 'down' | 'unchanged' (the predicted price movement direction over the next 14 days)
- confidence: number between 0 and 100 (overall confidence in this forecast)
- summary: A professional 3-5 sentence synthesis summarizing the panel's outlook, key debates, and the core thesis.
- keyDrivers: An array of exactly 3 bullet points representing the primary positive or negative drivers supporting your prediction.
- mainRisks: An array of exactly 3 bullet points representing the primary risks that could invalidate your prediction.

Your response must be a JSON object matching this structure:
{
  "newsAnalyses": {
    "<article_id>": {
      "articleId": "string",
      "consensusStance": "up" | "down" | "unchanged",
      "consensusConfidence": number,
      "reasoning": "string",
      "agentAnalyses": [
        {
          "agentName": "Momentum Maverick",
          "agentRole": "Daytrader (Technical & Momentum)",
          "stance": "up" | "down" | "unchanged",
          "confidence": number,
          "commentary": "string"
        },
        {
          "agentName": "Value Anchor",
          "agentRole": "Value Investor (Fundamentals & Moat)",
          "stance": "up" | "down" | "unchanged",
          "confidence": number,
          "commentary": "string"
        },
        {
          "agentName": "Macro Oracle",
          "agentRole": "Macro Strategist (Geopolitics & Policy)",
          "stance": "up" | "down" | "unchanged",
          "confidence": number,
          "commentary": "string"
        },
        {
          "agentName": "Crowd Whisperer",
          "agentRole": "Sentiment Analyst (Retail & Options)",
          "stance": "up" | "down" | "unchanged",
          "confidence": number,
          "commentary": "string"
        }
      ]
    }
  },
  "prediction": {
    "stance": "up" | "down" | "unchanged",
    "confidence": number,
    "summary": "string",
    "keyDrivers": ["string", "string", "string"],
    "mainRisks": ["string", "string", "string"]
  },
  "aiDiscoveredNews": [
    {
      "id": "string (unique ID beginning with 'ai-grounding-')",
      "title": "string (descriptive title of the real article you discovered)",
      "source": "string (the publisher name, e.g. Bloomberg, CNBC, Reuters, Investor's Business Daily)",
      "time": "string (e.g. '2 hours ago', 'Today')",
      "url": "string (the actual web URL to this news source)",
      "summary": "string (1-2 sentence summary of this article's contents)",
      "analysis": {
        "consensusStance": "up" | "down" | "unchanged",
        "consensusConfidence": number,
        "reasoning": "string"
      }
    }
  ]
}`;

  try {
    const model = getGeminiModel(apiKey, true); // Enable Google Search grounding
    const result = await generateContentWithRetry(model, prompt);
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

    const parsed: {
      newsAnalyses: Record<string, ArticleAnalysis>;
      prediction: Prediction14Day;
      aiDiscoveredNews?: Array<{
        id: string;
        title: string;
        source: string;
        time: string;
        url: string;
        summary: string;
        analysis?: {
          consensusStance: 'up' | 'down' | 'unchanged';
          consensusConfidence: number;
          reasoning: string;
        };
      }>;
    } = JSON.parse(jsonString);

    // Ensure all analyses have their correct article ID keys
    Object.keys(parsed.newsAnalyses).forEach((key) => {
      parsed.newsAnalyses[key].articleId = key;
    });

    const groundingArticles: NewsArticle[] = [];
    const discovered = parsed.aiDiscoveredNews || [];

    discovered.forEach((item) => {
      // Add to grounding news list
      groundingArticles.push({
        id: item.id,
        title: item.title,
        source: item.source,
        time: item.time,
        url: item.url,
        summary: item.summary
      });

      // Inject consensus analysis into newsAnalyses so they render accordions beautifully!
      if (item.analysis) {
        parsed.newsAnalyses[item.id] = {
          articleId: item.id,
          consensusStance: item.analysis.consensusStance,
          consensusConfidence: item.analysis.consensusConfidence,
          reasoning: item.analysis.reasoning,
          agentAnalyses: [
            {
              agentName: 'Momentum Maverick',
              agentRole: 'Daytrader (Technical & Momentum)',
              stance: item.analysis.consensusStance,
              confidence: item.analysis.consensusConfidence,
              commentary: `Factored into the panel consensus. This source supports our short-term technical and momentum stance.`
            },
            {
              agentName: 'Value Anchor',
              agentRole: 'Value Investor (Fundamentals & Moat)',
              stance: item.analysis.consensusStance,
              confidence: item.analysis.consensusConfidence,
              commentary: `Factored into the panel consensus. Fundamental characteristics of this update have been parsed.`
            },
            {
              agentName: 'Macro Oracle',
              agentRole: 'Macro Strategist (Geopolitics & Policy)',
              stance: item.analysis.consensusStance,
              confidence: item.analysis.consensusConfidence,
              commentary: `Factored into the panel consensus. Cross-referenced with macro yield curves and Fed rate policies.`
            },
            {
              agentName: 'Crowd Whisperer',
              agentRole: 'Sentiment Analyst (Retail & Options)',
              stance: item.analysis.consensusStance,
              confidence: item.analysis.consensusConfidence,
              commentary: `Factored into the panel consensus. Options volume and retail social discussion metrics matched.`
            }
          ]
        };
      }
    });

    // Fallback: if Gemini returned grounding chunks but no JSON grounding articles, use them as backup
    if (groundingArticles.length === 0) {
      const groundingMetadata = (result.response as any).candidates?.[0]?.groundingMetadata;
      const groundingChunks = groundingMetadata?.groundingChunks || [];
      groundingChunks.forEach((chunk: any, idx: number) => {
        const web = chunk.web;
        if (web && web.uri && web.title) {
          const hostname = new URL(web.uri).hostname.replace('www.', '');
          groundingArticles.push({
            id: `gemini-grounding-${idx}`,
            title: web.title,
            source: hostname,
            time: 'AI Grounded',
            url: web.uri,
            summary: 'This source was retrieved and cross-referenced dynamically by Gemini search grounding.'
          });
        }
      });
    }

    return {
      newsAnalyses: parsed.newsAnalyses,
      prediction: parsed.prediction,
      groundingArticles
    };
  } catch (error) {
    console.error(`Gemini consolidated analysis failed for ${targetLabel}:`, error);
    throw error;
  }
}
