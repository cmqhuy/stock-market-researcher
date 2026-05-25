import React, { useState } from 'react';
import { Shield, ChevronDown, Award, Lightbulb, AlertTriangle, MessageSquare, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import type { StockAnalysis, ArticleAnalysis } from '../types';
import { LoadingPanel } from './LoadingPanel';

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

  if (!stockAnalysis) {
    if (isLoading) {
      return <LoadingPanel minHeight="450px" />;
    }
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

  const ticker = stockAnalysis?.ticker || '';
  const name = stockAnalysis?.name || '';
  const prediction = stockAnalysis?.prediction || {
    stance: 'unchanged',
    confidence: 50,
    summary: 'No prediction details available.',
    keyDrivers: [],
    mainRisks: []
  };
  const news = stockAnalysis?.news || [];
  const newsAnalyses = stockAnalysis?.newsAnalyses || {};
  const lastUpdated = stockAnalysis?.lastUpdated || '';

  const stance = prediction.stance || 'unchanged';
  const confidence = typeof prediction.confidence === 'number' ? prediction.confidence : 50;

  const keyDrivers = Array.isArray(prediction.keyDrivers) ? prediction.keyDrivers : [];
  const mainRisks = Array.isArray(prediction.mainRisks) ? prediction.mainRisks : [];

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
      {(!isLiveMode || (stockAnalysis && stockAnalysis.isSimulated)) && (
        <div className="simulation-warning-banner">
          <AlertTriangle className="warning-icon" size={16} />
          <span>
            <strong>Simulation Sandbox Active:</strong> {!isLiveMode 
              ? "Running in offline demo mode. All predictions and roundtables are simulated locally." 
              : "Live analysis was unavailable. Showing simulated projections and local panel consensus."}
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
      <div className={`glass-panel forecast-banner ${stance}`} style={{ opacity: isLoading ? 0.75 : 1, transition: 'opacity 0.2s ease' }}>
        <div className="forecast-header">
          <div className="forecast-main-stance">
            <span className="forecast-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              14-Day Stock Projection
              {isLoading && <span className="status-dot" style={{ backgroundColor: 'var(--primary)', position: 'static', transform: 'none', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%' }} />}
            </span>
            <span className={`forecast-value ${stance}`}>
              {stance.toUpperCase()}
            </span>
          </div>

          <div className="forecast-confidence">
            <span className="forecast-title">Panel Confidence</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {confidence}%
            </span>
            <div className="confidence-bar-bg">
              <div
                className="confidence-bar-fill"
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
          </div>
        </div>

        <p className="forecast-summary">{prediction.summary || 'Outlook details pending review.'}</p>

        <div className="forecast-details">
          <div>
            <span className="detail-list-title green">
              <Lightbulb size={14} />
              Key Drivers
            </span>
            <ul className="detail-list">
              {keyDrivers.map((driver, idx) => (
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
              {mainRisks.map((risk, idx) => (
                <li key={idx}>{risk}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Stock news list with expert accordion debates */}
      <div className="glass-panel" style={{ padding: '1.25rem', opacity: isLoading ? 0.75 : 1, transition: 'opacity 0.2s ease' }}>
        <div className="news-header-section">
          <h2 className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
            <MessageSquare size={18} className="text-primary" style={{ color: 'var(--primary)' }} />
            Asset Headlines & Roundtable Debates
          </h2>
          {isLoading ? (
            <span className="news-count-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
              <RefreshCw size={12} className="animate-spin" />
              Updating...
            </span>
          ) : (
            <span className="news-count-badge">{news.length} News Articles</span>
          )}
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
                      {analysis && Array.isArray(analysis.agentAnalyses) && (
                        <>
                          <span>•</span>
                          <div className="agent-avatars-row">
                            {analysis.agentAnalyses.map((agent, i) => {
                              if (!agent) return null;
                              const agentName = agent.agentName || 'Analyst';
                              const agentStance = agent.stance || 'unchanged';
                              const agentConfidence = typeof agent.confidence === 'number' ? agent.confidence : 50;
                              return (
                                <div
                                  key={i}
                                  className={`agent-mini-dot ${getAgentAvatarClass(agentName)}`}
                                  title={`${agentName}: ${agentStance.toUpperCase()} (${agentConfidence}%)`}
                                >
                                  {getAgentInitials(agentName)}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                    <h3 className="news-item-title">{article.title}</h3>
                  </div>

                  <div className="news-item-right">
                    {analysis ? (
                      <div style={{ marginRight: '0.5rem' }}>
                        {(analysis.consensusStance || 'unchanged') === 'up' ? (
                          <span className="badge-up">
                            <TrendingUp size={12} />
                            Up ({analysis.consensusConfidence ?? 50}%)
                          </span>
                        ) : (analysis.consensusStance || 'unchanged') === 'down' ? (
                          <span className="badge-down">
                            <TrendingDown size={12} />
                            Down ({analysis.consensusConfidence ?? 50}%)
                          </span>
                        ) : (
                          <span className="badge-unchanged">
                            <Minus size={12} />
                            Flat ({analysis.consensusConfidence ?? 50}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginRight: '0.5rem' }}>
                        <span className="badge-unchanged" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                          {isLiveMode ? "AI Grounding" : "Live Headline"}
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

                    {analysis && Array.isArray(analysis.agentAnalyses) ? (
                      <>
                        <div className="expert-grid">
                          {analysis.agentAnalyses.map((agent, agentIdx) => {
                            if (!agent) return null;
                            const agentName = agent.agentName || 'Analyst';
                            const agentRole = agent.agentRole || 'Roundtable Member';
                            const agentStance = agent.stance || 'unchanged';
                            const agentConfidence = typeof agent.confidence === 'number' ? agent.confidence : 50;
                            const agentCommentary = agent.commentary || 'Reviewing recent updates.';
                            
                            return (
                              <div key={agentName || agentIdx} className="expert-card">
                                <div className="expert-card-header">
                                  <div className="expert-profile">
                                    <div className={`expert-avatar ${getAgentAvatarClass(agentName)}`}>
                                      {getAgentInitials(agentName)}
                                    </div>
                                    <div className="expert-profile-text">
                                      <span className="expert-name">{agentName}</span>
                                      <span className="expert-role">{(agentRole || '').split(' ')[0]}</span>
                                    </div>
                                  </div>
                                  <div>
                                    {agentStance === 'up' ? (
                                      <span className="badge-up" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
                                        Up
                                      </span>
                                    ) : agentStance === 'down' ? (
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
                                <p className="expert-commentary">"{agentCommentary}"</p>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-dark)', textAlign: 'right' }}>
                                  Confidence: {agentConfidence}%
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="consensus-block">
                          <div className="consensus-icon-area">
                            <Shield size={18} />
                          </div>
                          <div className="consensus-text-area">
                            <h5 className="consensus-heading">
                              Expert Consensus Verdict:{' '}
                              <span style={{ color: (analysis.consensusStance || 'unchanged') === 'up' ? 'var(--up-color)' : (analysis.consensusStance || 'unchanged') === 'down' ? 'var(--down-color)' : 'var(--unchanged-color)' }}>
                                {(analysis.consensusStance || 'unchanged').toUpperCase()} ({analysis.consensusConfidence ?? 50}% confidence)
                              </span>
                            </h5>
                            <p className="consensus-reasoning">{analysis.reasoning || 'No consensus reasoning provided.'}</p>
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
                            {!isLiveMode ? "AI Roundtable Opinions Disabled" : "AI Search Grounding Source"}
                          </h5>
                          <p className="consensus-reasoning" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {!isLiveMode 
                              ? "AI analysis is disabled in Demo Mode. Enable Live Mode in Settings with an API key to evaluate the expert roundtable." 
                              : "This article was retrieved dynamically by the panel via live search grounding. It was cross-referenced to validate consensus confidence levels and shape the final 14-day projection."}
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
