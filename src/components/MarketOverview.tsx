import React, { useState } from 'react';
import { Shield, ChevronDown, Award, Lightbulb, AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MarketState, ArticleAnalysis } from '../types';

interface MarketOverviewProps {
  marketState: MarketState;
  isLoading: boolean;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ marketState, isLoading }) => {
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="glass-panel shimmer-wrapper" style={{ minHeight: '400px' }}>
        <div className="shimmer-block" style={{ width: '40%', height: '24px', marginBottom: '1.5rem' }} />
        <div className="shimmer-block" style={{ width: '100%', height: '140px', marginBottom: '1rem' }} />
        <div className="shimmer-block" style={{ width: '100%', height: '80px', marginBottom: '1rem' }} />
        <div className="shimmer-block" style={{ width: '100%', height: '80px' }} />
      </div>
    );
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
    switch (name.charAt(0)) {
      case 'S': return 'avatar-s';
      case 'D': return 'avatar-d';
      case 'E': return 'avatar-e';
      case 'J': return 'avatar-j';
      default: return '';
    }
  };

  return (
    <div className="stock-detail-view">
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

      {/* Main Grid: Sentiment Dial & General news */}
      <div className="market-main-grid">
        {/* Sentiment Gauge */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="forecast-title" style={{ marginBottom: '1rem', textAlign: 'center' }}>Market Sentiment</span>
          <div className="sentiment-gauge-container">
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
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)', marginTop: '0.5rem', textAlign: 'center' }}>
            Derived from expert news consensus
          </span>
        </div>

        {/* General Market News List */}
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
    </div>
  );
};
export default MarketOverview;
