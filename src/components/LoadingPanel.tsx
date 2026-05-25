import React, { useState, useEffect } from 'react';

interface LoadingMessage {
  title: string;
  description: string;
}

const LOADING_MESSAGES: LoadingMessage[] = [
  { title: "Convening Expert Roundtable", description: "Assembling our panel of specialists to deliberate on recent market catalysts..." },
  { title: "Filtering Signal from Noise", description: "Isolating high-impact headline data and discarding speculative market chatter..." },
  { title: "Analyzing Value Moats", description: "The Value Anchor is evaluating capital allocations, cash flows, and moat sustainability..." },
  { title: "Tracking Option Sweepers", description: "The Crowd Whisperer is analyzing institutional option blocks and speculative retail sentiment..." },
  { title: "Modeling Macro Trajectories", description: "The Macro Oracle is cross-referencing Federal Reserve policy, yield curves, and geopolitical indicators..." },
  { title: "Mapping Momentum Indicators", description: "The Momentum Maverick is plotting moving averages, RSI deviations, and key support levels..." },
  { title: "Synthesizing Consensus Vectors", description: "Reconciling Momentum Maverick's technical setups with Value Anchor's fundamental valuation levels..." },
  { title: "Polling Market Sentiment", description: "Aggregating the Crowd Whisperer's social feeds and fear-and-greed index multipliers..." },
  { title: "Running Regression Models", description: "The Macro Oracle is evaluating historical correlations to current macroeconomic data..." },
  { title: "Assessing Liquidity Channels", description: "Measuring passive ETF inflows and tracing corporate stock buyback patterns..." },
  { title: "Debating Valuation Multiples", description: "Comparing PEG ratios and enterprise multipliers against historical industry baselines..." },
  { title: "Calculating Volatility Curves", description: "Evaluating option implied volatility (IV) levels to price in potential gap risk..." },
  { title: "Auditing Financial Statements", description: "Checking net margins, free cash flow generation rates, and debt-to-equity ratios..." },
  { title: "Decoding Fed Policy Signals", description: "Parsing FOMC minutes and Federal Reserve governor speeches for rate cut clues..." },
  { title: "Simulating Price Targets", description: "Projecting 14-day standard deviation channels and potential price breakout zones..." },
  { title: "Evaluating Logistics Bottlenecks", description: "Sifting through shipping indices and global supply chain transit times..." },
  { title: "Correlating News Catalysts", description: "Determining whether news updates represent structural shifts or temporary volatility spikes..." },
  { title: "Structuring Sentiment Graphs", description: "Parsing NLP news arguments into structured bullish and bearish stance vectors..." },
  { title: "Scanning Option Sentiment", description: "Gauging retail order flows, call/put ratios, and wall-of-worry parameters..." },
  { title: "Formatting Consensus Reports", description: "Consolidating the roundtable's final ratings, confidence scores, and key risk alerts..." }
];

export const LoadingPanel: React.FC<{ minHeight?: string }> = ({ minHeight = '450px' }) => {
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<LoadingMessage>(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
    return LOADING_MESSAGES[randomIndex];
  });

  useEffect(() => {
    const pickRandom = () => {
      const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
      setCurrentLoadingMessage(LOADING_MESSAGES[randomIndex]);
    };
    
    const interval = setInterval(pickRandom, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel analysis-running-overlay" style={{ minHeight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner"></div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, margin: '1rem 0 0.5rem 0' }}>{currentLoadingMessage.title}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px', margin: 0, lineHeight: 1.4 }}>
        {currentLoadingMessage.description}
      </p>
    </div>
  );
};
