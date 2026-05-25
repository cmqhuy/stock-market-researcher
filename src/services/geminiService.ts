import { GoogleGenerativeAI } from '@google/generative-ai';
import type { NewsArticle, ArticleAnalysis, Prediction14Day } from '../types';

/**
 * Helper to initialize the Gemini client.
 */
function getGeminiModel(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash', // We use gemini-1.5-flash as it is fast, cheap, and supports structured JSON outputs
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
}

/**
 * Asks the expert panel (Sarah, David, Elena, Jack) to analyze a single news article
 * and how it will affect the stock (or the broader market).
 */
export async function analyzeNewsArticle(
  apiKey: string,
  article: NewsArticle,
  tickerContext?: { ticker: string; name: string }
): Promise<ArticleAnalysis> {
  const targetLabel = tickerContext
    ? `${tickerContext.name} (${tickerContext.ticker.toUpperCase()})`
    : 'The Broader US Stock Market (S&P 500 / SPY)';

  const prompt = `You are a panel of elite stock market research sub-agents. Analyze the following news article and how it affects the target asset.

Target Asset: ${targetLabel}

News Article Title: ${article.title}
Source: ${article.source}
Summary: ${article.summary || 'N/A'}

You must provide individual analyses from the perspective of four distinct experts:
1. "Sarah" - Daytrader (Technical & Momentum): Focuses on short-term price action, volume, technical levels, support/resistance, momentum, and immediate reaction to news headlines.
2. "David" - Value Investor (Fundamentals & Moat): Focuses on long-term fundamentals, company valuation, earnings power, debt, cash flows, and whether this news affects the company's long-term competitive moat or structural advantages.
3. "Elena" - Macro Strategist (Geopolitics & Policy): Focuses on high-level market trends, interest rates, inflation, geopolitics, central bank policies, sector rotation, and macroeconomic liquidity.
4. "Jack" - Sentiment Analyst (Retail & Options): Focuses on retail trader psychology, social media hype, options flows, crowd behavior, and market fear/greed indicators.

For each agent, provide:
- stance: 'up' | 'down' | 'unchanged' (predicting the directional effect of this news on the target asset)
- confidence: number between 0 and 100
- commentary: a 2-4 sentence explanation detailing their specific logic.

Also provide a consensus summary of the article's impact:
- consensusStance: 'up' | 'down' | 'unchanged'
- consensusConfidence: number between 0 and 100 (an aggregate confidence level based on agreement and individual stances)
- reasoning: a brief explanation of how the consensus was reached or why the panel is split.

Your response must be a JSON object matching this structure:
{
  "articleId": "${article.id}",
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
}`;

  try {
    const model = getGeminiModel(apiKey);
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    
    if (!textResponse) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed: ArticleAnalysis = JSON.parse(textResponse);
    // Ensure the article ID is correct
    parsed.articleId = article.id;
    return parsed;
  } catch (error) {
    console.error(`Gemini analysis failed for article "${article.title}":`, error);
    throw error;
  }
}

/**
 * Synthesizes the collective news analyses for a stock or the general market to make
 * a unified 14-day movement prediction.
 */
export async function synthesize14DayPrediction(
  apiKey: string,
  articlesWithAnalysis: Array<{ article: NewsArticle; analysis: ArticleAnalysis }>,
  ticker?: string,
  companyName?: string
): Promise<Prediction14Day> {
  const targetLabel = ticker && companyName
    ? `${companyName} (${ticker.toUpperCase()})`
    : 'The Broader US Stock Market (S&P 500 / SPY)';

  // Format articles and analysis to save tokens and keep prompt clean
  const simplifiedData = articlesWithAnalysis.map(item => ({
    title: item.article.title,
    consensusStance: item.analysis.consensusStance,
    consensusConfidence: item.analysis.consensusConfidence,
    agentStances: item.analysis.agentAnalyses.map(a => `${a.agentName}: ${a.stance} (${a.confidence}%)`),
    reasoning: item.analysis.reasoning
  }));

  const prompt = `You are the moderator of an elite stock market research panel. Your panel has analyzed the latest news for a target asset. Now, you must synthesize their findings to provide a 14-day movement prediction for the asset.

Target Asset: ${targetLabel}

Here is the news and the panel's individual analyses:
${JSON.stringify(simplifiedData, null, 2)}

Based on these analyses, provide:
1. stance: 'up' | 'down' | 'unchanged' (the predicted price movement direction over the next 14 days)
2. confidence: number between 0 and 100 (overall confidence in this forecast)
3. summary: A professional 3-5 sentence synthesis summarizing the panel's outlook, key debates, and the core thesis.
4. keyDrivers: An array of exactly 3 bullet points representing the primary positive or negative drivers supporting your prediction.
5. mainRisks: An array of exactly 3 bullet points representing the primary risks that could invalidate your prediction.

Your response must be a JSON object matching this structure:
{
  "stance": "up" | "down" | "unchanged",
  "confidence": number,
  "summary": "string",
  "keyDrivers": ["string", "string", "string"],
  "mainRisks": ["string", "string", "string"]
}`;

  try {
    const model = getGeminiModel(apiKey);
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();

    if (!textResponse) {
      throw new Error('Empty response from Gemini API during synthesis');
    }

    const parsed: Prediction14Day = JSON.parse(textResponse);
    return parsed;
  } catch (error) {
    console.error(`Gemini synthesis failed for ${targetLabel}:`, error);
    throw error;
  }
}
