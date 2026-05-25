import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ListCollapse, X, TrendingUp, TrendingDown, Minus, GripVertical } from 'lucide-react';
import type { WatchlistStock } from '../types';

interface WatchlistPanelProps {
  stocks: WatchlistStock[];
  selectedTicker: string;
  onSelectStock: (ticker: string) => void;
  onAddStock: (ticker: string) => void;
  onRemoveStock: (ticker: string) => void;
  isLoading: boolean;
  onReorderWatchlist?: (stocks: WatchlistStock[]) => void;
}


export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({
  stocks,
  selectedTicker,
  onSelectStock,
  onAddStock,
  onRemoveStock,
  isLoading,
  onReorderWatchlist,
}) => {
  const [newTicker, setNewTicker] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    price: number;
    date: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  const handlePointHover = (e: React.MouseEvent<SVGCircleElement>, price: number, date: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      price,
      date,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      visible: true
    });
  };

  const handlePointLeave = () => {
    setTooltip(prev => prev ? { ...prev, visible: false } : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTicker.trim().toUpperCase();
    if (clean) {
      onAddStock(clean);
      setNewTicker('');
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !onReorderWatchlist) return;

    const reordered = [...stocks];
    const item = reordered[draggedIndex];
    reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, item);

    onReorderWatchlist(reordered);
    setDraggedIndex(null);
  };

  const renderSparkline = (
    ticker: string,
    changePercent: number,
    historyPoints?: number[],
    historyTimestamps?: number[]
  ) => {
    if (!historyPoints || historyPoints.length <= 1) {
      // API is offline or no history was loaded. Render a text placeholder instead of mock waves.
      return (
        <span 
          style={{ 
            color: 'var(--text-dark)', 
            fontSize: '0.88rem', 
            fontWeight: 700, 
            letterSpacing: '0.05em',
            opacity: 0.75
          }}
        >
          &mdash;&mdash;
        </span>
      );
    }

    const min = Math.min(...historyPoints);
    const max = Math.max(...historyPoints);
    const range = max - min;
    const points = historyPoints.map((val) => {
      if (range === 0) return 50;
      // Map val to range [10, 90]
      return 10 + ((val - min) / range) * 80;
    });

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
        {points.map((p, idx) => {
          const x = idx * stepX;
          const y = height - (p / 100) * height;
          const priceVal = historyPoints[idx];
          
          let dateLabel = '';
          if (historyTimestamps && historyTimestamps[idx]) {
            const date = new Date(historyTimestamps[idx]);
            if (!isNaN(date.getTime())) {
              const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
              dateLabel = hasTime
                ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })
                : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            }
          }
          if (!dateLabel) {
            const daysAgo = historyPoints.length - 1 - idx;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          }

          return (
            <g key={idx} className="sparkline-point-group">
              <circle
                cx={x}
                cy={y}
                r="2.5"
                className="sparkline-dot"
                fill={color}
                style={{ opacity: 0, transition: 'opacity 0.15s ease', pointerEvents: 'none' }}
              />
              <circle
                cx={x}
                cy={y}
                r="7"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(e, priceVal, dateLabel)}
                onMouseMove={(e) => handlePointHover(e, priceVal, dateLabel)}
                onMouseLeave={handlePointLeave}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="glass-panel watchlist-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 className="panel-title" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
        <ListCollapse size={18} className="text-primary" style={{ color: 'var(--primary)' }} />
        Watchlist
        <span className="live-badge">
          <span className="live-dot"></span>
          LIVE
        </span>
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
          stocks.map((stock, index) => {
            const isActive = selectedTicker === stock.ticker;
            const isDragging = index === draggedIndex;
            const hasChange = typeof stock.change === 'number' && !isNaN(stock.change);
            const isPositive = hasChange && stock.change > 0;
            const isNegative = hasChange && stock.change < 0;
            
            return (
              <div
                key={stock.ticker}
                className={`watchlist-card ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
                onClick={() => onSelectStock(stock.ticker)}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Grab handle for drag & drop reordering */}
                <div className="watchlist-drag-handle" title="Drag to reorder">
                  <GripVertical size={14} />
                </div>

                <div className="watchlist-card-left">
                  <span className="ticker-symbol">{stock.ticker}</span>
                  <span className="ticker-name">{stock.name}</span>
                </div>

                {/* Micro sparkline - references the history array or mock generator */}
                <div className="watchlist-sparkline-wrapper">
                  {renderSparkline(stock.ticker, stock.change, stock.history, stock.historyTimestamps)}
                </div>

                <div className="ticker-price-container">
                  <span className="ticker-price">${stock.price.toFixed(2)}</span>
                  <span className={`ticker-change ${isPositive ? 'up' : isNegative ? 'down' : ''}`}>
                    {hasChange ? (
                      <>
                        {stock.change > 0 ? '+' : ''}
                        {stock.change.toFixed(2)}%
                      </>
                    ) : (
                      '--'
                    )}
                  </span>
                </div>

                {/* Intraday/Daily Trend indicator */}
                <div 
                  className="watchlist-trend-icon"
                  title={
                    isPositive ? `Upward intraday movement (+${stock.change.toFixed(2)}%)` :
                    isNegative ? `Downward intraday movement (${stock.change.toFixed(2)}%)` :
                    `Flat / no intraday movement`
                  }
                >
                  {isPositive ? (
                    <TrendingUp size={14} style={{ color: 'var(--up-color)' }} />
                  ) : isNegative ? (
                    <TrendingDown size={14} style={{ color: 'var(--down-color)' }} />
                  ) : (
                    <Minus size={14} style={{ color: 'var(--text-dark)' }} />
                  )}
                </div>

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
            );
          })
        )}
      </div>

      {tooltip && tooltip.visible && createPortal(
        <div
          className="sparkline-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -120%)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <div className="tooltip-price">${tooltip.price.toFixed(2)}</div>
          <div className="tooltip-date">{tooltip.date}</div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default WatchlistPanel;
