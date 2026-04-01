import { Holding, PortfolioStats } from '../types/portfolio';

export const calculateHoldingValue = (holding: Holding): number => {
  return holding.quantity * holding.currentPrice;
};

export const calculateHoldingCost = (holding: Holding): number => {
  return holding.quantity * holding.purchasePrice;
};

export const calculateHoldingGainLoss = (holding: Holding): number => {
  return calculateHoldingValue(holding) - calculateHoldingCost(holding);
};

export const calculateHoldingGainLossPercent = (holding: Holding): number => {
  const cost = calculateHoldingCost(holding);
  if (cost === 0) return 0;
  return (calculateHoldingGainLoss(holding) / cost) * 100;
};

export const calculatePortfolioStats = (holdings: Holding[]): PortfolioStats => {
  const totalValue = holdings.reduce((sum, holding) => sum + calculateHoldingValue(holding), 0);
  const totalCost = holdings.reduce((sum, holding) => sum + calculateHoldingCost(holding), 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPercent = totalCost === 0 ? 0 : (totalGainLoss / totalCost) * 100;

  return {
    totalValue,
    totalCost,
    totalGainLoss,
    totalGainLossPercent,
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};
