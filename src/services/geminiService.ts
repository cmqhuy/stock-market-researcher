import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NewsArticle, ArticleAnalysis, Prediction14Day } from '../types';

/**
 * Helper to initialize the Gemini client.
 */
function getGeminiModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash', // We use gemini-2.5-flash as it is fast, cheap, and supports structured JSON outputs
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
}

/**
 * Executes a single API call to Gemini to analyze multiple articles and synthesize the 14-day prediction.
 * This saves API calls to avoid rate limits (429) on the free tier.
 */
export async function analyzeNewsAndPredict(
  apiKey: string,
  articles: NewsArticle[],
  tickerContext?: { ticker: string; name: string }
): Promise<{
  newsAnalyses: Record<string, ArticleAnalysis>;
  prediction: Prediction14Day;
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

  const prompt = `You are a panel of elite stock market research sub-agents collaborating on asset analysis. 
Analyze the following news articles regarding the target asset.

Target Asset: ${targetLabel}

News Articles to analyze:
${JSON.stringify(formattedArticles, null, 2)}

For each article, your panel of four distinct virtual experts must provide individual analyses:
1. "Sarah" - Daytrader (Technical & Momentum): Focuses on short-term price action, volume, technical levels, support/resistance, momentum, and immediate reaction to news headlines.
2. "David" - Value Investor (Fundamentals & Moat): Focuses on long-term fundamentals, company valuation, earnings power, debt, cash flows, and whether this news affects the company's long-term competitive moat or structural advantages.
3. "Elena" - Macro Strategist (Geopolitics & Policy): Focuses on high-level market trends, interest rates, inflation, geopolitics, central bank policies, sector rotation, and macroeconomic liquidity.
4. "Jack" - Sentiment Analyst (Retail & Options): Focuses on retail trader psychology, social media hype, options flows, crowd behavior, and market fear/greed indicators.

For each agent on each article, provide:
- stance: 'up' | 'down' | 'unchanged' (predicting the directional effect of this news on the target asset)
- confidence: number between 0 and 100
- commentary: a 2-4 sentence explanation detailing their specific logic.

Also provide a consensus summary for each article:
- consensusStance: 'up' | 'down' | 'unchanged'
- consensusConfidence: number between 0 and 100
- reasoning: a brief explanation of how the consensus was reached or why the panel is split.

Finally, synthesize the collective findings across all these articles to make a unified 14-day movement prediction for the target asset:
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
          "agentName": "Sarah",
          "agentRole": "Daytrader (Technical & Momentum)",
          "stance": "up" | "down" | "unchanged",
          "confidence": number,
          "commentary": "string"
        },
        {
          "agentName": "David",
          "agentRole": "Value Investor (Fundamentals & Moat)",
          "stance": "up" | "down" | "unchanged",
          "confidence": number,
          "commentary": "string"
        },
        {
          "agentName": "Elena",
          "agentRole": "Macro Strategist (Geopolitics & Policy)",
          "stance": "up" | "down" | "unchanged",
          "confidence": number,
          "commentary": "string"
        },
        {
          "agentName": "Jack",
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
  }
}`;

  try {
    const model = getGeminiModel(apiKey);
    const result = await model.generateContent(prompt);
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
    } = JSON.parse(jsonString);

    // Ensure all analyses have their correct article ID keys
    Object.keys(parsed.newsAnalyses).forEach((key) => {
      parsed.newsAnalyses[key].articleId = key;
    });

    return parsed;
  } catch (error) {
    console.error(`Gemini consolidated analysis failed for ${targetLabel}:`, error);
    throw error;
  }
}
