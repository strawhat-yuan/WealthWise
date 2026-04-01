export type AssetType = 'stock' | 'bond' | 'cash' | 'etf';

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  type: AssetType;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  realizedPnL: number;
  purchaseDate: string;
}

export interface PerformanceData {
  date: string;
  value: number;
}

export interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
}
