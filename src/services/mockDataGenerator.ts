import type { StockAnalysis, MarketState, NewsArticle, ArticleAnalysis, AgentAnalysis, Prediction14Day, WatchlistStock } from '../types';

// Helper to generate dates relative to today

// Standard mock tickers
export const MOCK_TICKERS: Record<string, { name: string; price: number; change: number }> = {
  AAPL: { name: 'Apple Inc.', price: 189.84, change: 1.25 },
  MSFT: { name: 'Microsoft Corporation', price: 421.90, change: -0.45 },
  NVDA: { name: 'NVIDIA Corporation', price: 948.79, change: 3.82 },
  TSLA: { name: 'Tesla Inc.', price: 179.24, change: -2.18 },
  AMZN: { name: 'Amazon.com Inc.', price: 180.75, change: 0.88 },
  GOOGL: { name: 'Alphabet Inc.', price: 173.96, change: 0.54 },
  META: { name: 'Meta Platforms Inc.', price: 475.20, change: -1.10 },
};



// Helper to generate dates relative to today
const getRelativeDateStr = (daysAgo: number, hoursAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const getMockWatchlist = (): WatchlistStock[] => {
  return Object.entries(MOCK_TICKERS).map(([ticker, info]) => ({
    ticker,
    name: info.name,
    price: info.price,
    change: info.change,
    prediction: ticker === 'TSLA' ? 'down' : ticker === 'MSFT' ? 'unchanged' : 'up',
    confidence: ticker === 'NVDA' ? 88 : ticker === 'TSLA' ? 65 : 75,
  }));
};

// --- General Market Mock Data ---
export const generateMockMarketAnalysis = (): MarketState => {
  const news: NewsArticle[] = [
    {
      id: 'm-1',
      title: 'Federal Reserve Signals Interest Rates Will Remain "Higher for Longer" Amid Sticky Inflation',
      source: 'Financial Times',
      time: getRelativeDateStr(0, 2),
      summary: 'Fed officials expressed concern over the persistent pace of inflation and suggested rate cuts may be delayed until late in the year, dampening market hopes for rapid easing.'
    },
    {
      id: 'm-2',
      title: 'Tech Sector Leads Sharp Market Rebound as AI Demand Shows No Sign of Slowing',
      source: 'Bloomberg',
      time: getRelativeDateStr(0, 5),
      summary: 'Tech stocks staged a strong rally, lifting major indexes. Demand for high-performance chips and cloud infrastructure remains robust, fueling investor optimism.'
    },
    {
      id: 'm-3',
      title: 'Treasury Yields Rise to 4.6% as Bond Market Reacts to Tight Economic Data',
      source: 'Wall Street Journal',
      time: getRelativeDateStr(0, 8),
      summary: 'Yields on the 10-year Treasury bond ticked higher following stronger-than-expected retail sales, prompting conversations about potential overheating in the economy.'
    },
    {
      id: 'm-4',
      title: 'Geopolitical Tensions Drive Oil Prices Up 3%, Raising Energy Sector Shares',
      source: 'Reuters',
      time: getRelativeDateStr(1, 1),
      summary: 'Crude oil futures surged on concerns of supply disruptions in the Middle East, boosting oil majors but threatening to feed back into headline consumer inflation.'
    },
    {
      id: 'm-5',
      title: 'Retail Investors Pour Fresh Cash into Index ETFs, Sentiment Index Nears Extreme Greed',
      source: 'CNBC',
      time: getRelativeDateStr(1, 4),
      summary: 'Weekly flow data shows substantial retail inflows into passive equity funds. Meanwhile, fear-and-greed gauges hit their highest levels in three months.'
    }
  ];

  const newsAnalyses: Record<string, ArticleAnalysis> = {
    'm-1': {
      articleId: 'm-1',
      consensusStance: 'down',
      consensusConfidence: 75,
      reasoning: 'Higher interest rates increase borrowing costs and compress valuation multiples, presenting a headwind for equities, especially high-growth segments.',
      agentAnalyses: [
        {
          agentName: 'Momentum Maverick',
          agentRole: 'Daytrader (Technical & Momentum)',
          stance: 'down',
          confidence: 80,
          commentary: 'This is a clear short-term bearish trigger. Watch SPY support at the 50-day moving average. If that level breaks, we could see a rapid 2-3% drop. Momentum is shifting to the downside.'
        },
        {
          agentName: 'Value Anchor',
          agentRole: 'Value Investor (Fundamentals & Moat)',
          stance: 'down',
          confidence: 60,
          commentary: 'Higher discount rates lower the present value of future cash flows, making highly-valued growth stocks look overpriced. I will be looking to buy compounders at cheaper valuations.'
        },
        {
          agentName: 'Macro Oracle',
          agentRole: 'Macro Strategist (Geopolitics & Policy)',
          stance: 'down',
          confidence: 90,
          commentary: 'The Fed is trapped by stubborn services inflation and a tight labor market. The policy rate is restrictive, and this delays the liquidity injection markets were pricing in. Neutral to bearish stance is warranted.'
        },
        {
          agentName: 'Crowd Whisperer',
          agentRole: 'Sentiment Analyst (Retail & Options)',
          stance: 'unchanged',
          confidence: 70,
          commentary: 'While macro analysts are panicking, retail flows remain resilient. We might see a brief dip followed by heavy dip-buying. Be careful shorting; the retail crowd is still resilient.'
        }
      ]
    },
    'm-2': {
      articleId: 'm-2',
      consensusStance: 'up',
      consensusConfidence: 85,
      reasoning: 'Unprecedented institutional capital expenditure into Artificial Intelligence infrastructure provides strong fundamental backing for the market leaders, driving the entire index higher.',
      agentAnalyses: [
        {
          agentName: 'Momentum Maverick',
          agentRole: 'Daytrader (Technical & Momentum)',
          stance: 'up',
          confidence: 90,
          commentary: 'Excellent price action. Leaders like NVDA and MSFT are breaking out on high volume. This is a classic trend-following long setup. Ride the momentum, set tight stop losses.'
        },
        {
          agentName: 'Value Anchor',
          agentRole: 'Value Investor (Fundamentals & Moat)',
          stance: 'up',
          confidence: 70,
          commentary: 'AI capital expenditure is real. Unlike the dot-com bubble, these tech giants are printing massive free cash flows. Their moats are expanding, justifying higher valuations.'
        },
        {
          agentName: 'Macro Oracle',
          agentRole: 'Macro Strategist (Geopolitics & Policy)',
          stance: 'unchanged',
          confidence: 65,
          commentary: 'AI is a long-term productivity driver, which can act as a deflationary force eventually. However, in the near term, massive tech capital expenditure does not offset general macro tightening.'
        },
        {
          agentName: 'Crowd Whisperer',
          agentRole: 'Sentiment Analyst (Retail & Options)',
          stance: 'up',
          confidence: 85,
          commentary: 'Retail FOMO is kicking in again. Social media mentions of AI are soaring. Heavy call-option buying on mega-cap tech will force market makers to buy underlying shares, creating a delta squeeze.'
        }
      ]
    },
    'm-3': {
      articleId: 'm-3',
      consensusStance: 'down',
      consensusConfidence: 65,
      reasoning: 'Rising bond yields compete directly with stocks for investor capital, making risk-free government debt increasingly attractive compared to equity yields.',
      agentAnalyses: [
        {
          agentName: 'Momentum Maverick',
          agentRole: 'Daytrader (Technical & Momentum)',
          stance: 'down',
          confidence: 75,
          commentary: '10-year yield breaking 4.5% is historically a major trigger for algorithmic selling program execution. Growth sectors will feel the heat. Scalping index puts.'
        },
        {
          agentName: 'Value Anchor',
          agentRole: 'Value Investor (Fundamentals & Moat)',
          stance: 'down',
          confidence: 80,
          commentary: 'When risk-free yields reach 4.6%, the equity risk premium shrinks. If you can get 4.6% guaranteed from the US government, buying stocks at 25x earnings makes little sense. Wait for lower entries.'
        },
        {
          agentName: 'Macro Oracle',
          agentRole: 'Macro Strategist (Geopolitics & Policy)',
          stance: 'down',
          confidence: 85,
          commentary: 'Sticky retail sales indicate the consumer is still spending, which prevents yields from falling. The bond market is pricing out rate cuts. This structural shift is bearish for debt-heavy companies.'
        },
        {
          agentName: 'Crowd Whisperer',
          agentRole: 'Sentiment Analyst (Retail & Options)',
          stance: 'unchanged',
          confidence: 60,
          commentary: 'Retail traders rarely look at bond yields. While institutional desks are selling, retail accounts are active in single stocks. Expect high dispersion between indexes and hyped tickers.'
        }
      ]
    },
    'm-4': {
      articleId: 'm-4',
      consensusStance: 'unchanged',
      consensusConfidence: 60,
      reasoning: 'Higher oil prices benefit energy stock components but act as a tax on consumers and increase freight/input costs for the rest of the economy, creating a net neutral market effect.',
      agentAnalyses: [
        {
          agentName: 'Momentum Maverick',
          agentRole: 'Daytrader (Technical & Momentum)',
          stance: 'up',
          confidence: 70,
          commentary: 'Momentum is strong in XLE and energy names. I am long oil futures and oil majors. Shorting transportation names. Sector rotation is in play.'
        },
        {
          agentName: 'Value Anchor',
          agentRole: 'Value Investor (Fundamentals & Moat)',
          stance: 'unchanged',
          confidence: 65,
          commentary: 'Commodity prices are cyclical. Excellent for cash-rich oil producers right now, but it squeezes margins for consumer staples and industrials. A net wash for diversified portfolios.'
        },
        {
          agentName: 'Macro Oracle',
          agentRole: 'Macro Strategist (Geopolitics & Policy)',
          stance: 'down',
          confidence: 80,
          commentary: 'Oil at these levels represents a major geopolitical risk and feeds straight into headline CPI. This will make the Fed\'s job harder and increases the probability of stagflationary pressures.'
        },
        {
          agentName: 'Crowd Whisperer',
          agentRole: 'Sentiment Analyst (Retail & Options)',
          stance: 'unchanged',
          confidence: 50,
          commentary: 'Energy stocks are boring for the retail crowd, so option activity is flat. Social sentiment is highly focused on tech. Geopolitical anxiety is present but not leading to retail panic yet.'
        }
      ]
    },
    'm-5': {
      articleId: 'm-5',
      consensusStance: 'up',
      consensusConfidence: 70,
      reasoning: 'Strong capital inflows and positive sentiment can drive prices up in the near term, though extreme optimism signals potential medium-term contrarian risks.',
      agentAnalyses: [
        {
          agentName: 'Momentum Maverick',
          agentRole: 'Daytrader (Technical & Momentum)',
          stance: 'up',
          confidence: 80,
          commentary: 'Never fight the trend. High inflows mean dip-buyers are active. The index is in a clear upward channel. Stay long until the market breaks structure.'
        },
        {
          agentName: 'Value Anchor',
          agentRole: 'Value Investor (Fundamentals & Moat)',
          stance: 'unchanged',
          confidence: 75,
          commentary: 'Extreme greed in sentiment gauges suggests that margins of safety are narrow. I am not selling our quality names, but I am certainly not putting new cash to work here.'
        },
        {
          agentName: 'Macro Oracle',
          agentRole: 'Macro Strategist (Geopolitics & Policy)',
          stance: 'unchanged',
          confidence: 60,
          commentary: 'Liquidity flows are keeping the market afloat. Passive ETF inflows act as a floor. However, structural economic data does not support this level of exuberance indefinitely.'
        },
        {
          agentName: 'Crowd Whisperer',
          agentRole: 'Sentiment Analyst (Retail & Options)',
          stance: 'up',
          confidence: 90,
          commentary: 'Sentiment is incredibly bullish. The retail herd is running. Call-to-put ratios are extremely high. This momentum is self-fulfilling in the short term. Enjoy the party while it lasts!'
        }
      ]
    }
  };

  const prediction: Prediction14Day = {
    stance: 'up',
    confidence: 72,
    summary: 'Despite macro tightening and rising bond yields, the combination of strong AI capital expenditure, robust corporate earnings, and sustained retail/passive ETF inflows is expected to push the broader market modestly higher over the next 14 days.',
    keyDrivers: [
      'Relentless AI infrastructure spending supporting mega-cap tech.',
      'Sustained retail/passive ETF inflows providing index floors.',
      'Strong earnings reports confirming operational resilience.'
    ],
    mainRisks: [
      'Federal Reserve pushing rate cut expectations further out.',
      'Ten-year Treasury yields climbing above 4.75%.',
      'Geopolitical spikes in crude oil triggering CPI concerns.'
    ]
  };

  return {
    prediction,
    news,
    newsAnalyses,
    lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
    timestamp: Date.now()
  };
};

// --- Ticker-Specific Mock Data Generators ---
const MOCK_STOCK_NEWS_TEMPLATES: Record<string, Array<{ title: string; source: string; summary: string; impact: 'up' | 'down' | 'unchanged' }>> = {
  AAPL: [
    {
      title: 'Apple Announces On-Device Gemini Integration for iOS 18, Boosting Siri Capabilities',
      source: 'TechCrunch',
      summary: 'Apple has solidified a partnership with Google to integrate advanced Gemini models directly into iOS 18. The move is expected to dramatically enhance Siri and device productivity tools, prompting upgrading cycles.',
      impact: 'up'
    },
    {
      title: 'EU Fines Apple $1.8 Billion in Music Streaming Antitrust Dispute',
      source: 'Wall Street Journal',
      summary: 'The European Commission fined Apple for abusing its dominant position in the distribution of music streaming apps, concluding that anti-steering provisions were illegal. Apple plans to appeal.',
      impact: 'down'
    },
    {
      title: 'Apple iPhone Shipments in China Recover and Rise 12% Year-Over-Year',
      source: 'Bloomberg',
      summary: 'Data shows Apple iPhone shipments in China returned to growth, rebounding strongly from previous declines due to aggressive promotional activities and steady premium demand.',
      impact: 'up'
    },
    {
      title: 'Apple Developer Conference (WWDC) Expected to Reveal Heavy Focus on Local AI Systems',
      source: 'Wired',
      summary: 'Analysts predict Apple will unveil a localized, privacy-centric AI system at WWDC, utilizing on-device neural engines to secure user data, distinct from cloud-dependent competitors.',
      impact: 'up'
    },
    {
      title: 'Key Apple Supplier Foxconn Signals Muted Hardware Demand for Coming Quarter',
      source: 'Reuters',
      summary: 'Foxconn reported a conservative outlook for consumer electronics, citing general inflation affecting global discretionary device upgrade timelines.',
      impact: 'down'
    }
  ],
  TSLA: [
    {
      title: 'Tesla Robotaxi Event Scheduled for August; Musk Claims Autonomous FSD Nears Commercialization',
      source: 'Electrek',
      summary: 'Elon Musk announced that Tesla will unveil its dedicated Robotaxi in August. Musk highlighted that Full Self-Driving (FSD) version 12 is hitting critical milestones, driving optimistic options activity.',
      impact: 'up'
    },
    {
      title: 'Tesla Deliveries Fall 8% in Q1, Missing Wall Street Estimations Amid China Pressures',
      source: 'CNBC',
      summary: 'Tesla reported quarterly deliveries that fell significantly below analyst projections. Rising local EV competition in China and factory shutdowns in Germany dragged performance.',
      impact: 'down'
    },
    {
      title: 'Tesla Lays Off 10% of Global Workforce to Streamline Operations for Next Growth Wave',
      source: 'Bloomberg',
      summary: 'In an internal memo, Tesla outlined plans to cut its global workforce by more than 10% to reduce redundant roles and optimize capital for AI and autonomous projects.',
      impact: 'unchanged'
    },
    {
      title: 'Tesla Secures Key Regulatory Clearances for FSD Beta Testing in Shanghai',
      source: 'Reuters',
      summary: 'Tesla took a major step forward toward launching its autonomous driving assistant in China after reaching a mapping and data security agreement with local regulators.',
      impact: 'up'
    },
    {
      title: 'Li-Ion Battery Costs Plunge to Historic Lows, Improving EV Profit Margins',
      source: 'Financial Times',
      summary: 'Global battery-grade lithium carbonate prices dropped, lowering direct production costs for Tesla’s Standard Range and Long Range model lines.',
      impact: 'up'
    }
  ],
  NVDA: [
    {
      title: 'Nvidia Blackwell Ultra AI Chips Scheduled for Launch in Late 2026, Analyst Upgrades Target',
      source: 'MarketWatch',
      summary: 'Leading investment banks raised Nvidia price targets, citing high demand for its next-generation Blackwell chip architecture, which is pre-sold for the next 12 months.',
      impact: 'up'
    },
    {
      title: 'US Expands Semiconductor Export Controls Targeting AI Accelerators to Middle East',
      source: 'Wall Street Journal',
      summary: 'The US Commerce Department expanded licensing requirements for shipping advanced AI chips to several Middle Eastern countries, raising regulatory headwinds.',
      impact: 'down'
    },
    {
      title: 'Nvidia Reports Blockbuster Earnings: Revenue Up 262% YoY on Insatiable AI Demand',
      source: 'CNBC',
      summary: 'Nvidia crushed consensus estimates, posting Q1 revenue of $26 billion. Data Center revenue spiked to record highs as cloud giants continue building cluster sizes.',
      impact: 'up'
    },
    {
      title: 'Amazon Web Services Announces Massive New Order of Nvidia Blackwell GPUs',
      source: 'Bloomberg',
      summary: 'AWS announced a expanded collaboration to host Nvidia’s DGX Cloud, deploying tens of thousands of Blackwell GPUs for enterprise AI model training.',
      impact: 'up'
    },
    {
      title: 'Competitors AMD and Intel Unveil New Competitor AI Accelerators, Threatening Nvidia Pricing Power',
      source: 'Wired',
      summary: 'AMD launched its MI325X chip and Intel unveiled its Gaudi 3 processor, both claiming competitive pricing and comparable performance for inference tasks.',
      impact: 'unchanged'
    }
  ]
};

// Generic template generator for any other ticker
const generateGenericNewsTemplates = (ticker: string, companyName: string): Array<{ title: string; source: string; summary: string; impact: 'up' | 'down' | 'unchanged' }> => {
  return [
    {
      title: `${companyName} (${ticker}) Unveils New Cloud Integration Strategy to Optimize Operations`,
      source: 'TechCrunch',
      summary: `${companyName} announced an expansive software integration program designed to streamline internal logistics and lower operational expenses by 15% next fiscal year.`,
      impact: 'up'
    },
    {
      title: `Analysts Upgrade ${ticker} Citing Expanding Market Share and Pricing Resilience`,
      source: 'MarketWatch',
      summary: `Several research desks upgraded ${ticker} shares to Buy, citing strong customer retention ratios and price flexibility in a inflationary macroeconomic environment.`,
      impact: 'up'
    },
    {
      title: `Regulatory Committee Launches Investigation into ${companyName}'s Data Sharing Protocols`,
      source: 'Reuters',
      summary: `A congressional oversight committee has requested documentation regarding ${ticker}'s user privacy policies, creating legal uncertainty and near-term market pressure.`,
      impact: 'down'
    },
    {
      title: `${companyName} (${ticker}) Reports Better-Than-Expected Q2 Revenue; Guidance Aligns with Projections`,
      source: 'Bloomberg',
      summary: `${companyName} surpassed top-line analyst estimates for the quarter, driven by strong growth in its enterprise division. Profit guidance remains stable.`,
      impact: 'up'
    },
    {
      title: `General Supply Chain Friction Restricts ${ticker}'s Product Shipments in European Regions`,
      source: 'Wall Street Journal',
      summary: `Logistical hurdles at international ports have caused shipping delays for ${companyName}'s hardware inventory, potentially shifting Q3 sales into Q4.`,
      impact: 'down'
    }
  ];
};

export const generateMockStockAnalysis = (ticker: string): StockAnalysis => {
  const cleanTicker = ticker.toUpperCase().trim();
  const name = MOCK_TICKERS[cleanTicker]?.name || `${cleanTicker} Corporation`;
  
  const templates = MOCK_STOCK_NEWS_TEMPLATES[cleanTicker] || generateGenericNewsTemplates(cleanTicker, name);
  
  const news: NewsArticle[] = templates.map((t, idx) => ({
    id: `${cleanTicker.toLowerCase()}-${idx + 1}`,
    title: t.title,
    source: t.source,
    time: getRelativeDateStr(0, 3 + idx * 4),
    summary: t.summary
  }));

  const newsAnalyses: Record<string, ArticleAnalysis> = {};
  let totalUpScore = 0;
  let totalDownScore = 0;

  news.forEach((article, idx) => {
    const template = templates[idx];
    const impact = template.impact;
    
    // Configure stances based on the article's impact
    let sarahStance: 'up' | 'down' | 'unchanged' = 'unchanged';
    let davidStance: 'up' | 'down' | 'unchanged' = 'unchanged';
    let elenaStance: 'up' | 'down' | 'unchanged' = 'unchanged';
    let jackStance: 'up' | 'down' | 'unchanged' = 'unchanged';
    
    if (impact === 'up') {
      sarahStance = 'up';
      davidStance = Math.random() > 0.3 ? 'up' : 'unchanged';
      elenaStance = Math.random() > 0.5 ? 'up' : 'unchanged';
      jackStance = 'up';
      totalUpScore += 2;
    } else if (impact === 'down') {
      sarahStance = 'down';
      davidStance = Math.random() > 0.3 ? 'down' : 'unchanged';
      elenaStance = 'down';
      jackStance = 'down';
      totalDownScore += 2;
    } else {
      sarahStance = Math.random() > 0.5 ? 'up' : 'down';
      davidStance = 'unchanged';
      elenaStance = 'unchanged';
      jackStance = Math.random() > 0.5 ? 'up' : 'unchanged';
    }

    const confBase = 60 + Math.floor(Math.random() * 30);

    const agentAnalyses: AgentAnalysis[] = [
      {
        agentName: 'Momentum Maverick',
        agentRole: 'Daytrader (Technical & Momentum)',
        stance: sarahStance,
        confidence: confBase + 5,
        commentary: sarahStance === 'up' 
          ? `High volume breakout potential here. The news acts as a catalyst. I am going long with a stop-loss just below support.` 
          : sarahStance === 'down' 
            ? `Breaking support levels. High momentum to the downside. Expect short-sellers to pile in. Short position is favored.` 
            : `Muted price action. The stock is stuck in a tight consolidation range. No trade zone for me.`
      },
      {
        agentName: 'Value Anchor',
        agentRole: 'Value Investor (Fundamentals & Moat)',
        stance: davidStance,
        confidence: confBase - 5,
        commentary: davidStance === 'up'
          ? `This strengthens the company's long-term competitive advantage (moat) and free cash flow generation. A highly positive fundamental developments.`
          : davidStance === 'down'
            ? `This headwind represents a minor margin compression. While not thesis-breaking, it lowers our short-term valuation target.`
            : `No material impact on the company's long-term earnings capability. Noise in the markets; I remain focused on long-term compounders.`
      },
      {
        agentName: 'Macro Oracle',
        agentRole: 'Macro Strategist (Geopolitics & Policy)',
        stance: elenaStance,
        confidence: confBase,
        commentary: elenaStance === 'up'
          ? `Favorable sector tailwinds and policy alignments. Fits well within current macroeconomic trends.`
          : elenaStance === 'down'
            ? `Increased regulatory scrutiny or rising borrowing costs present structural macro risks. This sector is under policy pressure.`
            : `Macro conditions remain the primary driver for this stock. Sector rotation is offsetting company-specific updates.`
      },
      {
        agentName: 'Crowd Whisperer',
        agentRole: 'Sentiment Analyst (Retail & Options)',
        stance: jackStance,
        confidence: confBase + 8,
        commentary: jackStance === 'up'
          ? `Social sentiment is extremely positive. Option activity shows call-buying sweepers. Very bullish retail setup.`
          : jackStance === 'down'
            ? `Panic selling detected in online retail forums. Puts are being bid up. Muted bid support suggests further downside.`
            : `Sentiment is neutral. General discussion is low, and options flow is balanced. No clear directional bias from the crowd.`
      }
    ];

    // Compute consensus
    const stances = agentAnalyses.map(a => a.stance);
    const upCount = stances.filter(s => s === 'up').length;
    const downCount = stances.filter(s => s === 'down').length;
    const consensusStance = upCount > downCount ? 'up' : downCount > upCount ? 'down' : 'unchanged';
    const averageConf = Math.round(agentAnalyses.reduce((acc, curr) => acc + curr.confidence, 0) / 4);

    newsAnalyses[article.id] = {
      articleId: article.id,
      consensusStance,
      consensusConfidence: averageConf,
      reasoning: consensusStance === 'up'
        ? `The expert panel consensus is bullish, highlighting strong corporate catalysts and high social/options momentum.`
        : consensusStance === 'down'
          ? `The panel is bearish, focusing on structural regulatory challenges and momentum breakdowns.`
          : `The experts are split or neutral, seeing conflicting signals between short-term momentum and long-term valuation.`,
      agentAnalyses
    };
  });

  // Synthesize 14-day stock prediction
  let finalStance: 'up' | 'down' | 'unchanged' = 'unchanged';
  let finalConfidence = 60;
  let summary = '';
  let keyDrivers: string[] = [];
  let mainRisks: string[] = [];

  if (totalUpScore > totalDownScore + 1) {
    finalStance = 'up';
    finalConfidence = 70 + Math.min(25, (totalUpScore - totalDownScore) * 5);
    summary = `The 14-day outlook for ${cleanTicker} is bullish. A strong lineup of positive catalysts, including recent announcements and institutional buying patterns, outweighs headwinds.`;
    keyDrivers = [
      `Product/integration innovations strengthening market share.`,
      `Very bullish institutional and retail sentiment indicators.`,
      `Technical breakout confirmation on daily charts.`
    ];
    mainRisks = [
      `General macroeconomic market correction dragging all stocks.`,
      `Sudden regulatory filings or legal judgments.`,
      `Overbought conditions leading to brief profit-taking pullbacks.`
    ];
  } else if (totalDownScore > totalUpScore + 1) {
    finalStance = 'down';
    finalConfidence = 65 + Math.min(30, (totalDownScore - totalUpScore) * 5);
    summary = `The 14-day forecast is bearish. ${cleanTicker} is facing significant headwinds, including regulatory scrutiny and delivery/supply issues, which are dampening investor confidence.`;
    keyDrivers = [
      `Slowing demand in international segments (especially China/Europe).`,
      `Regulatory fine threats or compliance costs.`,
      `Downward technical trend with moving average breakdowns.`
    ];
    mainRisks = [
      `Unexpected positive earnings surprise or short squeeze.`,
      `Announcement of new strategic corporate partnerships.`,
      `Broader market recovery lifting depressed sector valuations.`
    ];
  } else {
    finalStance = 'unchanged';
    finalConfidence = 55 + Math.floor(Math.random() * 15);
    summary = `The 14-day projection is neutral. ${cleanTicker} is locked in a consolidation pattern, with robust fundamental support balanced out by near-term technical resistance.`;
    keyDrivers = [
      `Balanced buyer/seller activity at current valuation levels.`,
      `Solid fundamentals offsetting short-term growth concerns.`,
      `Range-bound price action awaiting the next earnings catalyst.`
    ];
    mainRisks = [
      `Breakout above near-term resistance on unexpected volume.`,
      `Breakdown below core support levels.`,
      `Sudden broad-market volatility spikes.`
    ];
  }

  return {
    ticker: cleanTicker,
    name,
    prediction: {
      stance: finalStance,
      confidence: finalConfidence,
      summary,
      keyDrivers,
      mainRisks
    },
    news,
    newsAnalyses,
    lastUpdated: new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
    timestamp: Date.now()
  };
};
