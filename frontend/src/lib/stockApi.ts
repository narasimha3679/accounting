const STOCK_API_URL = import.meta.env.VITE_STOCK_API_URL || 'http://localhost:3001';

export interface StockPrice {
  symbol: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  dividendYield?: number;
  companyName?: string;
  exchange?: string;
  lastUpdated: string;
  source: 'yahoo' | 'finnhub' | 'alphavantage';
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type: string;
}

export async function getStockPrice(symbol: string): Promise<StockPrice | null> {
  const response = await fetch(`${STOCK_API_URL}/api/price/${encodeURIComponent(symbol)}`);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to fetch stock price');
  }
  return await response.json();
}

export async function getStockPrices(symbols: string[]): Promise<Record<string, StockPrice | null>> {
  if (symbols.length === 0) return {};
  
  const symbolsParam = symbols.join(',');
  const response = await fetch(`${STOCK_API_URL}/api/prices?symbols=${encodeURIComponent(symbolsParam)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stock prices');
  }
  return await response.json();
}

export async function trackStock(symbol: string): Promise<void> {
  const response = await fetch(`${STOCK_API_URL}/api/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbols: [symbol] }),
  });
  if (!response.ok) {
    throw new Error('Failed to track stock');
  }
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const response = await fetch(`${STOCK_API_URL}/api/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to search stocks');
  }
  const data = await response.json();
  return data.results || [];
}

