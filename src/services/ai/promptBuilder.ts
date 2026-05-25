import type { NewsArticle } from '../../types';

/**
 * Builds the comprehensive prompt instructions for the Gemini expert panel.
 */
export function buildRoundtablePrompt(
  articles: NewsArticle[],
  tickerContext?: { ticker: string; name: string }
): string {
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

  return `You are a panel of elite stock market analysts collaborating on asset analysis. 
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
}
