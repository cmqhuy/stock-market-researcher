import React, { useState, useEffect } from 'react';
import { Shield, ChevronDown, Award, Lightbulb, AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import type { StockAnalysis, ArticleAnalysis } from '../types';

interface LoadingMessage {
  title: string;
  description: string;
}

const LOADING_MESSAGES: LoadingMessage[] = [
  { title: "Convening Analyst Roundtable", description: "Sarah, David, Elena, and Jack are debating the latest stock news and synthesizing the 14-day projection..." },
  { title: "Filtering Signal from Noise", description: "Isolating raw headline data and discarding market hype to trace underlying volatility vectors..." },
  { title: "Analyzing Value Moats", description: "David is evaluating long-term competitive advantages and discounted cash flows..." },
  { title: "Tracking Option Sweepers", description: "Jack is monitoring institutional option blocks, call-to-put ratios, and order flows..." },
  { title: "Modeling Macro Trajectories", description: "Elena is cross-referencing Federal Reserve statements, yields, and geopolitical risk factors..." },
  { title: "Mapping Momentum Indicators", description: "Sarah is plotting moving averages, relative strength index deviations, and key support floors..." },
  { title: "Synthesizing Consensus Vectors", description: "Reconciling contrasting daytrader momentum with value investor fundamental targets..." },
  { title: "Polling Sentiment Indexes", description: "Aggregating crowd behavior and sentiment multipliers across major financial channels..." },
  { title: "Running Regression Parameters", description: "Evaluating correlation weights between historical events and current market dynamics..." },
  { title: "Assessing Liquidity Flows", description: "Measuring capital allocations, passive fund flows, and sector rotation indices..." },
  { title: "Debating Valuation Multiples", description: "Comparing price-to-earnings growth (PEG) ratios against historical industry baselines..." },
  { title: "Measuring Volatility Spikes", description: "Calculating implied volatility deviations to isolate standard market fluctuations..." },
  { title: "Auditing Balance Sheets", description: "Checking debt-to-equity ratios, net profit margins, and operational cash generation rates..." },
  { title: "Decoding Policy Signals", description: "Evaluating central bank interest rate decisions and liquidity tightening timetables..." },
  { title: "Simulating Price Targets", description: "Projecting standard deviation charts and trading channels for the next 14 days..." },
  { title: "Evaluating Supply Chains", description: "Sifting through international port delays and inventory shipment timelines..." },
  { title: "Correlating News Catalysts", description: "Determining if recent headlines act as systemic drivers or short-term volatility events..." },
  { title: "Structuring Decision Trees", description: "Parsing natural language arguments into quantitative directional vectors..." },
  { title: "Scanning Social Channels", description: "Gauging retail investor psychology and speculative hype trends..." },
  { title: "Compiling Consensus Reports", description: "Consolidating expert panel stances, confidence ratings, and key market risk warnings..." }
];

interface StockAnalysisDetailProps {
  stockAnalysis: StockAnalysis | null;
  isLoading: boolean;
  onRefreshAnalysis: (ticker: string) => void;
}

export const StockAnalysisDetail: React.FC<StockAnalysisDetailProps> = ({
  stockAnalysis,
  isLoading,
  onRefreshAnalysis,
}) => {
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState<LoadingMessage>(() => {
    const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
    return LOADING_MESSAGES[randomIndex];
  });

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
      setCurrentLoadingMessage(LOADING_MESSAGES[randomIndex]);
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
    switch (name.charAt(0)) {
      case 'M': return 'avatar-m';
      case 'V': return 'avatar-v';
      case 'O': return 'avatar-o';
      case 'C': return 'avatar-c';
      default: return '';
    }
  };

  return (
    <div className="stock-detail-view">
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
            Terminal Analysis Updated: {lastUpdated}
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
                                {agent.agentName.charAt(0)}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <h3 className="news-item-title">{article.title}</h3>
                  </div>

                  <div className="news-item-right">
                    {analysis && (
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
                                    {agent.agentName.charAt(0)}
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
                      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Analysis pending...
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
