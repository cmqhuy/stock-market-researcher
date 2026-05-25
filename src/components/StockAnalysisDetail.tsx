import React, { useState, useEffect } from 'react';
import { Shield, ChevronDown, Award, Lightbulb, AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import type { StockAnalysis, ArticleAnalysis } from '../types';

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


interface StockAnalysisDetailProps {
  stockAnalysis: StockAnalysis | null;
  isLoading: boolean;
  onRefreshAnalysis: (ticker: string) => void;
  isLiveMode: boolean;
}

export const StockAnalysisDetail: React.FC<StockAnalysisDetailProps> = ({
  stockAnalysis,
  isLoading,
  onRefreshAnalysis,
  isLiveMode,
}) => {
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<LoadingMessage>(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
    return LOADING_MESSAGES[randomIndex];
  });

  useEffect(() => {
    if (isLoading) {
      // Pick initial random one
      const pickRandom = () => {
        const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
        setCurrentLoadingMessage(LOADING_MESSAGES[randomIndex]);
      };
      pickRandom();

      const interval = setInterval(pickRandom, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="glass-panel analysis-running-overlay" style={{ minHeight: '450px' }}>
        <div className="loading-spinner"></div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{currentLoadingMessage.title}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>
          {currentLoadingMessage.description}
        </p>
      </div>
    );
  }

  if (!stockAnalysis) {
    return (
      <div className="glass-panel empty-state" style={{ minHeight: '450px' }}>
        <MessageSquare size={48} className="empty-state-icon" />
        <h3>No Stock Selected</h3>
        <p style={{ fontSize: '0.9rem', maxWidth: '350px' }}>
          Select a stock ticker from the watchlist or enter a new one to evaluate the expert daytrader/investor panel.
        </p>
      </div>
    );
  }

  const { ticker, name, prediction, news, newsAnalyses, lastUpdated } = stockAnalysis;

  const toggleExpandArticle = (id: string) => {
    setExpandedArticleId(expandedArticleId === id ? null : id);
  };

  const getAgentAvatarClass = (name: string): string => {
    if (name.includes('Momentum') || name.includes('Maverick')) return 'avatar-m';
    if (name.includes('Value') || name.includes('Anchor')) return 'avatar-v';
    if (name.includes('Macro') || name.includes('Oracle')) return 'avatar-o';
    if (name.includes('Crowd') || name.includes('Whisperer')) return 'avatar-c';
    return '';
  };

  const getAgentInitials = (name: string): string => {
    if (name.includes('Momentum') || name.includes('Maverick')) return 'MM';
    if (name.includes('Value') || name.includes('Anchor')) return 'VA';
    if (name.includes('Macro') || name.includes('Oracle')) return 'MO';
    if (name.includes('Crowd') || name.includes('Whisperer')) return 'CW';
    return name.charAt(0);
  };

  return (
    <div className="stock-detail-view">
      {isLiveMode && stockAnalysis && stockAnalysis.isSimulated && (
        <div className="simulation-warning-banner">
          <AlertTriangle className="warning-icon" size={16} />
          <span>
            <strong>Demo Simulation Mode Fallback:</strong> The live Gemini analysis failed to execute or is unavailable. Showing simulated stock projections.
          </span>
        </div>
      )}

      {/* Selected Stock Header */}
      <div className="flex-between">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 800 }}>
            {name}{' '}
            <span style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '1.25rem', marginLeft: '0.25rem' }}>
              ({ticker})
            </span>
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            As of {lastUpdated}
          </span>
        </div>

        <button
          className="btn-primary"
          onClick={() => onRefreshAnalysis(ticker)}
          style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', gap: '0.35rem' }}
        >
          <RefreshCw size={14} />
          Refresh Analysis
        </button>
      </div>

      {/* 14-Day Prediction Banner */}
      <div className={`glass-panel forecast-banner ${prediction.stance}`}>
        <div className="forecast-header">
          <div className="forecast-main-stance">
            <span className="forecast-title">14-Day Stock Projection</span>
            <span className={`forecast-value ${prediction.stance}`}>
              {prediction.stance.toUpperCase()}
            </span>
          </div>

          <div className="forecast-confidence">
            <span className="forecast-title">Panel Confidence</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {prediction.confidence}%
            </span>
            <div className="confidence-bar-bg">
              <div
                className="confidence-bar-fill"
                style={{ width: `${prediction.confidence}%` }}
              ></div>
            </div>
          </div>
        </div>

        <p className="forecast-summary">{prediction.summary}</p>

        <div className="forecast-details">
          <div>
            <span className="detail-list-title green">
              <Lightbulb size={14} />
              Key Drivers
            </span>
            <ul className="detail-list">
              {prediction.keyDrivers.map((driver, idx) => (
                <li key={idx}>{driver}</li>
              ))}
            </ul>
          </div>

          <div>
            <span className="detail-list-title red">
              <AlertTriangle size={14} />
              Primary Risks
            </span>
            <ul className="detail-list">
              {prediction.mainRisks.map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Stock news list with expert accordion debates */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="news-header-section">
          <h2 className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            <MessageSquare size={18} className="text-primary" style={{ color: 'var(--primary)' }} />
            Asset Headlines & Roundtable Debates
          </h2>
          <span className="news-count-badge">{news.length} News Articles</span>
        </div>

        <div className="news-list" style={{ marginTop: '1rem' }}>
          {news.map((article) => {
            const isExpanded = expandedArticleId === article.id;
            const analysis: ArticleAnalysis | undefined = newsAnalyses[article.id];

            return (
              <div key={article.id} className={`news-item ${isExpanded ? 'expanded' : ''}`}>
                {/* Summary Bar */}
                <div className="news-summary-bar" onClick={() => toggleExpandArticle(article.id)}>
                  <div className="news-title-area">
                    <div className="news-meta">
                      <span className="news-source-tag">{article.source}</span>
                      <span>•</span>
                      <span>{article.time}</span>
                      {analysis && (
                        <>
                          <span>•</span>
                          <div className="agent-avatars-row">
                            {analysis.agentAnalyses.map((agent, i) => (
                              <div
                                key={i}
                                className={`agent-mini-dot ${getAgentAvatarClass(agent.agentName)}`}
                                title={`${agent.agentName}: ${agent.stance.toUpperCase()} (${agent.confidence}%)`}
                              >
                                {getAgentInitials(agent.agentName)}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <h3 className="news-item-title">{article.title}</h3>
                  </div>

                  <div className="news-item-right">
                    {analysis ? (
                      <div style={{ marginRight: '0.5rem' }}>
                        {analysis.consensusStance === 'up' ? (
                          <span className="badge-up">
                            <TrendingUp size={12} />
                            Up ({analysis.consensusConfidence}%)
                          </span>
                        ) : analysis.consensusStance === 'down' ? (
                          <span className="badge-down">
                            <TrendingDown size={12} />
                            Down ({analysis.consensusConfidence}%)
                          </span>
                        ) : (
                          <span className="badge-unchanged">
                            <Minus size={12} />
                            Flat ({analysis.consensusConfidence}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginRight: '0.5rem' }}>
                        <span className="badge-unchanged" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                          AI Grounding
                        </span>
                      </div>
                    )}
                    <ChevronDown size={18} className="news-chevron" />
                  </div>
                </div>

                {/* Expanded news details */}
                {isExpanded && (
                  <div className="news-details-expanded">
                    {article.summary && (
                      <p className="article-summary-text">{article.summary}</p>
                    )}

                    <h4 className="expert-debate-header">
                      <Award size={14} style={{ color: 'var(--primary)' }} />
                      Expert Panel Breakdown
                    </h4>

                    {analysis ? (
                      <>
                        <div className="expert-grid">
                          {analysis.agentAnalyses.map((agent) => (
                            <div key={agent.agentName} className="expert-card">
                              <div className="expert-card-header">
                                <div className="expert-profile">
                                  <div className={`expert-avatar ${getAgentAvatarClass(agent.agentName)}`}>
                                    {getAgentInitials(agent.agentName)}
                                  </div>
                                  <div className="expert-profile-text">
                                    <span className="expert-name">{agent.agentName}</span>
                                    <span className="expert-role">{agent.agentRole.split(' ')[0]}</span>
                                  </div>
                                </div>
                                <div>
                                  {agent.stance === 'up' ? (
                                    <span className="badge-up" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                      Up
                                    </span>
                                  ) : agent.stance === 'down' ? (
                                    <span className="badge-down" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                      Down
                                    </span>
                                  ) : (
                                    <span className="badge-unchanged" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                      Flat
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="expert-commentary">"{agent.commentary}"</p>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)', textAlign: 'right' }}>
                                Confidence: {agent.confidence}%
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="consensus-block">
                          <div className="consensus-icon-area">
                            <Shield size={18} />
                          </div>
                          <div className="consensus-text-area">
                            <h5 className="consensus-heading">
                              Expert Consensus Verdict:{' '}
                              <span style={{ color: analysis.consensusStance === 'up' ? 'var(--up-color)' : analysis.consensusStance === 'down' ? 'var(--down-color)' : 'var(--unchanged-color)' }}>
                                {analysis.consensusStance.toUpperCase()} ({analysis.consensusConfidence}% confidence)
                              </span>
                            </h5>
                            <p className="consensus-reasoning">{analysis.reasoning}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="consensus-block" style={{ borderLeft: '2px solid var(--primary)', background: 'rgba(99, 102, 241, 0.02)' }}>
                        <div className="consensus-icon-area" style={{ color: 'var(--primary)', borderColor: 'var(--primary)', background: 'rgba(99, 102, 241, 0.05)' }}>
                          <Shield size={18} />
                        </div>
                        <div className="consensus-text-area">
                          <h5 className="consensus-heading" style={{ color: 'var(--primary)' }}>
                            AI Search Grounding Source
                          </h5>
                          <p className="consensus-reasoning" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            This article was retrieved dynamically by the panel via live search grounding. It was cross-referenced to validate consensus confidence levels and shape the final 14-day projection.
                          </p>
                          {article.url && (
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary"
                              style={{ display: 'inline-flex', padding: '0.35rem 0.65rem', fontSize: '0.75rem', marginTop: '0.5rem', textDecoration: 'none', width: 'fit-content', gap: '0.25rem' }}
                            >
                              View Original Article
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default StockAnalysisDetail;
