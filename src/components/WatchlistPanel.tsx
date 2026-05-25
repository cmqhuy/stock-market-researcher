import React, { useState } from 'react';
import { Plus, ListCollapse, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { WatchlistStock } from '../types';

interface WatchlistPanelProps {
  stocks: WatchlistStock[];
  selectedTicker: string;
  onSelectStock: (ticker: string) => void;
  onAddStock: (ticker: string) => void;
  onRemoveStock: (ticker: string) => void;
  isLoading: boolean;
}

// Deterministic seed-based mock history generator for Sparklines
const getSparklinePoints = (ticker: string, changePercent: number): number[] => {
  const charSum = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const points: number[] = [];
  let currentVal = 50; // midpoint of SVG box (height = 100)
  
  // Create 8 data points
  for (let i = 0; i < 8; i++) {
    // Generate a pseudo-random wave based on ticker character sum and iteration
    const sinWave = Math.sin(charSum + i * 1.5) * 20;
    const cosWave = Math.cos(charSum * 0.5 + i * 2.2) * 10;
    let step = sinWave + cosWave;
    
    // Tilt the sparkline trend towards the actual stock daily change percentage at the final points
    if (i > 4) {
      step += (changePercent > 0 ? 12 : -12) * (i - 4);
    }
    
    // Clamp points
    const val = Math.max(10, Math.min(90, currentVal + step));
    points.push(val);
  }
  return points;
};

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  stocks,
  selectedTicker,
  onSelectStock,
  onAddStock,
  onRemoveStock,
  isLoading,
}) => {
  const [newTicker, setNewTicker] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTicker.trim().toUpperCase();
    if (clean) {
      onAddStock(clean);
      setNewTicker('');
    }
  };

  const renderSparkline = (ticker: string, changePercent: number) => {
    const points = getSparklinePoints(ticker, changePercent);
    const width = 70;
    const height = 28;
    const stepX = width / (points.length - 1);
    
    // Build path coordinates
    const pathData = points
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${idx * stepX} ${height - (p / 100) * height}`)
      .join(' ');
      
    // Build polygon data for gradient fill (closes the shape at the bottom)
    const fillData = `${pathData} L ${width} ${height} L 0 ${height} Z`;
    
    const color = changePercent >= 0 ? 'var(--up-color)' : 'var(--down-color)';
    const gradientId = `grad-${ticker}`;

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={fillData} fill={`url(#${gradientId})`} />
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="glass-panel watchlist-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 className="panel-title" style={{ marginBottom: '0.75rem' }}>
        <ListCollapse size={18} className="text-primary" style={{ color: 'var(--primary)' }} />
        Watchlist
      </h2>

      <form onSubmit={handleSubmit} className="watchlist-form">
        <input
          type="text"
          className="form-input"
          placeholder="Enter ticker (e.g. AAPL)"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          disabled={isLoading}
          maxLength={6}
          style={{ textTransform: 'uppercase' }}
        />
        <button type="submit" className="btn-primary" disabled={isLoading || !newTicker.trim()} style={{ padding: '0.75rem' }}>
          <Plus size={18} />
        </button>
      </form>

      <div className="watchlist-items">
        {stocks.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dark)' }}>Watchlist is empty</span>
          </div>
        ) : (
          stocks.map((stock) => {
            const isActive = selectedTicker === stock.ticker;
            const isPositive = stock.change >= 0;
            
            return (
              <div
                key={stock.ticker}
                className={`watchlist-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectStock(stock.ticker)}
              >
                <div className="watchlist-card-left">
                  <span className="ticker-symbol">{stock.ticker}</span>
                  <span className="ticker-name">{stock.name}</span>
                </div>

                {/* Micro sparkline */}
                <div style={{ padding: '0 0.5rem', display: 'flex', alignItems: 'center' }}>
                  {renderSparkline(stock.ticker, stock.change)}
                </div>

                <div className="watchlist-card-right">
                  <div className="ticker-price-container">
                    <span className="ticker-price">${stock.price.toFixed(2)}</span>
                    <span className={`ticker-change ${isPositive ? 'up' : 'down'}`}>
                      {isPositive ? '+' : ''}
                      {stock.change.toFixed(2)}%
                    </span>
                  </div>

                  {stock.prediction && (
                    <div style={{ marginLeft: '0.25rem' }}>
                      {stock.prediction === 'up' ? (
                        <TrendingUp size={14} style={{ color: 'var(--up-color)' }} />
                      ) : stock.prediction === 'down' ? (
                        <TrendingDown size={14} style={{ color: 'var(--down-color)' }} />
                      ) : (
                        <Minus size={14} style={{ color: 'var(--unchanged-color)' }} />
                      )}
                    </div>
                  )}

                  <button
                    className="btn-remove"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent card selection
                      onRemoveStock(stock.ticker);
                    }}
                    aria-label={`Remove ${stock.ticker}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default WatchlistPanel;
