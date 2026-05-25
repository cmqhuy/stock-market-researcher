const commonNames: Record<string, string> = {
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft Corporation',
  GOOGL: 'Alphabet Inc. (Class A)',
  GOOG: 'Alphabet Inc. (Class C)',
  AMZN: 'Amazon.com, Inc.',
  NVDA: 'NVIDIA Corporation',
  TSLA: 'Tesla, Inc.',
  META: 'Meta Platforms, Inc.',
  SPY: 'SPDR S&P 500 ETF Trust',
  QQQ: 'Invesco QQQ Trust',
  DIA: 'SPDR Dow Jones Industrial Average ETF Trust'
};

/**
 * Gets a clean name for a ticker, falling back to a default format if not in commonNames.
 */
export function getTickerName(ticker: string): string {
  const cleanTicker = ticker.toUpperCase().trim();
  return commonNames[cleanTicker] || `${cleanTicker} Corporation`;
}
