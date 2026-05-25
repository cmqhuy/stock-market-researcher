import React, { useState } from 'react';
import { Shield, ChevronDown, Award, Lightbulb, AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import type { MarketState, ArticleAnalysis } from '../types';
import { LoadingPanel } from './LoadingPanel';

interface MarketOverviewProps {
  marketState: MarketState;
  isLoading: boolean;
  isLiveMode: boolean;
  onRefreshMarket: () => void;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ marketState, isLoading, isLiveMode, onRefreshMarket }) => {
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingPanel minHeight="400px" />;
  }

  const { prediction, news, newsAnalyses } = marketState;

  // Compute sentiment needle rotation
  let rotation = 90; // vertical (neutral)
  let sentimentLabel = 'Neutral';
  let sentimentColor = 'var(--unchanged-color)';

  if (prediction.stance === 'up') {
    rotation = 90 + (prediction.confidence * 0.75); // 90 -> 165 deg
    sentimentLabel = prediction.confidence > 75 ? 'Strongly Bullish' : 'Bullish';
    sentimentColor = 'var(--up-color)';
  } else if (prediction.stance === 'down') {
    rotation = 90 - (prediction.confidence * 0.75); // 90 -> 15 deg
    sentimentLabel = prediction.confidence > 75 ? 'Strongly Bearish' : 'Bearish';
    sentimentColor = 'var(--down-color)';
  }

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
      {isLiveMode && marketState.isSimulated && (
        <div className="simulation-warning-banner">
          <AlertTriangle className="warning-icon" size={16} />
          <span>
            <strong>Demo Simulation Mode Fallback:</strong> The live Gemini analysis failed to execute or is unavailable. Showing simulated market projections.
          </span>
        </div>
      )}

      {/* Header row: title + as-of timestamp + refresh button */}
      <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>Global Market Overview</h2>
          {marketState.lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              As of {marketState.lastUpdated}
            </span>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={onRefreshMarket}
          style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', gap: '0.35rem' }}
        >
          <RefreshCw size={14} />
          Refresh Analysis
        </button>
      </div>

      {/* 14-Day Forecast Banner */}
      <div className={`glass-panel forecast-banner ${prediction.stance}`}>
        <div className="forecast-header">
          <div className="forecast-main-stance">
            <span className="forecast-title">14-Day Market Projection</span>
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

      {/* Market Sentiment Gauge on a separate row */}
      <div className="glass-panel" style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span className="forecast-title" style={{ fontSize: '0.95rem', letterSpacing: '0.05em', margin: 0 }}>Market Sentiment Consensus</span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '480px', lineHeight: 1.4 }}>
            Consolidated market sentiment computed dynamically by averaging the directional biases and confidence levels of the expert panel across all premium financial news sources.
          </p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sentiment-gauge-container" style={{ margin: 0 }}>
            <div className="sentiment-gauge-track">
              <div className="sentiment-gauge-inner">
                <div className="sentiment-gauge-needle" style={{ transform: `rotate(${rotation - 90}deg)` }}></div>
                <div className="sentiment-gauge-center"></div>
              </div>
            </div>
            <span className="sentiment-label" style={{ color: sentimentColor }}>
              {sentimentLabel}
            </span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)', marginTop: '0.25rem' }}>
            Derived from news consensus
          </span>
        </div>
      </div>

      {/* General Market News List (Full width row) */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div className="news-header-section">
          <h2 className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            <MessageSquare size={18} className="text-primary" style={{ color: 'var(--primary)' }} />
            Market Headlines & Expert Debates
          </h2>
          <span className="news-count-badge">{news.length} Articles</span>
        </div>

        <div className="news-list" style={{ marginTop: '1rem' }}>
          {news.map((article) => {
            const isExpanded = expandedArticleId === article.id;
            const analysis: ArticleAnalysis | undefined = newsAnalyses[article.id];

            return (
              <div key={article.id} className={`news-item ${isExpanded ? 'expanded' : ''}`}>
                {/* Summary Bar clickable */}
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

                {/* Expanded Expert Roundtable details */}
                {isExpanded && (
                  <div className="news-details-expanded">
                    {article.summary && (
                      <p className="article-summary-text">{article.summary}</p>
                    )}

                    <h4 className="expert-debate-header">
                      <Award size={14} style={{ color: 'var(--primary)' }} />
                      Expert Roundtable Opinions
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
                              Panel Consensus Stance:{' '}
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
export default MarketOverview;
