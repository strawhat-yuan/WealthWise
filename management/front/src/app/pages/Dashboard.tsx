import { usePortfolio } from '../context/PortfolioContext';
import { calculatePortfolioStats, formatCurrency, formatPercent } from '../utils/portfolioUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/button';
import { DashboardSkeleton } from '../components/DashboardSkeleton';

type TimeRange = '1M' | '3M' | '6M' | 'YTD' | 'ALL';

export default function Dashboard() {
  const { holdings, performanceData, trades, totalRealizedPnL, isLoading, error } = usePortfolio();
  const stats = calculatePortfolioStats(holdings);
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [allocationTab, setAllocationTab] = useState<'ticker' | 'sector'>('ticker');

  // Show loading skeleton
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Show error message
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Please check your connection and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter performance data based on time range
  const getFilteredPerformanceData = () => {
    const now = new Date(); // Using the actual current date
    let startDate = new Date(now);

    switch (timeRange) {
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'ALL':
        return performanceData;
    }

    return performanceData.filter(d => new Date(d.date) >= startDate);
  };

  const filteredPerformanceData = getFilteredPerformanceData();

  // Calculate Y-axis domain for better visualization
  const getYAxisDomain = (): any => {
    if (filteredPerformanceData.length === 0) return [0, 'auto'];
    
    const values = filteredPerformanceData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = (maxValue - minValue) * 0.1; // 10% padding
    
    return [
      Math.max(0, Math.floor((minValue - padding) / 1000) * 1000),
      Math.ceil((maxValue + padding) / 1000) * 1000
    ];
  };

  // Enhance chart data with trade markers
  const chartDataWithTrades = filteredPerformanceData.map(d => {
    const dayTrades = trades.filter(t => {
      if (!t.ts) return false;
      const tStr = typeof t.ts === 'string' ? t.ts : new Date(t.ts).toISOString();
      return tStr.split('T')[0] === d.date;
    });
    return {
      ...d,
      dayTrades: dayTrades,
      hasTrade: dayTrades.length > 0
    };
  });

  const renderTradeDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.hasTrade) {
      return (
        <circle 
          key={`dot-${payload.date}`}
          cx={cx} 
          cy={cy} 
          r={4} 
          fill="#3b82f6" 
          stroke="#fff" 
          strokeWidth={2} 
        />
      );
    }
    return <circle r={0} />;
  };


  // Prepare data for pie chart (by holding)
  const topHoldingsData = holdings
    .map(holding => ({
      name: holding.ticker,
      value: (holding.quantity || 0) * (holding.currentPrice || 0),
    }))
    .filter(d => !isNaN(d.value) && d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Take top 5 and group the rest as "Other"
  const topHoldings = topHoldingsData.slice(0, 5);
  const otherHoldingsValue = topHoldingsData
    .slice(5)
    .reduce((sum, holding) => sum + holding.value, 0);

  // Add "Other" category if there are more than 5 holdings
  const holdingsChartData = otherHoldingsValue > 0
    ? [...topHoldings, { name: 'Other', value: otherHoldingsValue }]
    : topHoldings;

  // Prepare data for Sector distribution chart
  const sectorMap: Record<string, number> = {};
  holdings.forEach(h => {
    const sector = h.sector || 'Others';
    // Defense: Ensure we don't use NaN in chart calculations
    const value = (h.quantity || 0) * (h.currentPrice || 0);
    if (!isNaN(value) && value > 0) {
      sectorMap[sector] = (sectorMap[sector] || 0) + value;
    }
  });

  const sectorChartData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
  const SECTOR_COLORS: Record<string, string> = {
    'Technology': '#6366f1', // Indigo
    'Financial': '#0ea5e9', // Sky
    'Healthcare': '#10b981', // Emerald
    'Energy': '#f59e0b', // Amber
    'Automotive': '#64748b', // Slate
    'Communication Services': '#f43f5e', // Rose
    'Consumer Cyclical': '#f97316', // Orange
    'Others': '#94a3b8'
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl tabular-nums tracking-tight">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-gray-500 mt-1 tabular-nums">
              Cost: {formatCurrency(stats.totalCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Gain</CardTitle>
            {stats.totalGainLoss >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-2xl tabular-nums tracking-tight ${stats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalGainLoss)}
            </div>
            <p className={`text-xs mt-1 tabular-nums ${stats.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(stats.totalGainLossPercent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Daily P&L</CardTitle>
            {(() => {
              const totalDailyPnL = holdings.reduce((sum, h) => {
                const value = h.quantity * h.currentPrice;
                const chg = h.changePercent || 0;
                const dailyPnL = value * (chg / (100 + chg));
                return sum + dailyPnL;
              }, 0);
              return totalDailyPnL >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              );
            })()}
          </CardHeader>
          <CardContent>
            {(() => {
              const totalDailyPnL = holdings.reduce((sum, h) => {
                const value = h.quantity * h.currentPrice;
                const chg = h.changePercent || 0;
                const dailyPnL = value * (chg / (100 + chg));
                return sum + dailyPnL;
              }, 0);
              return (
                <div className={`font-bold text-2xl tabular-nums tracking-tight ${totalDailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalDailyPnL)}
                </div>
              );
            })()}
            <p className="text-xs text-gray-500 mt-1">
              Active positions: {holdings.filter(h => h.quantity > 0).length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Realized P&L</CardTitle>
            {totalRealizedPnL >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`font-bold text-2xl tabular-nums tracking-tight ${totalRealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalRealizedPnL)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total closed profit</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Portfolio Performance</CardTitle>
            <div className="flex gap-1">
              {(['1M', '3M', '6M', 'YTD', 'ALL'] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className="h-7 px-2 text-xs"
                >
                  {range}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartDataWithTrades}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  tick={{ fontSize: 12 }}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  domain={getYAxisDomain()}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'Value') {
                      return [formatCurrency(value), 'Total Value'];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    const dateStr = new Date(label).toLocaleDateString();
                    const dayData = payload?.[0]?.payload;
                    if (dayData?.hasTrade) {
                      const tradeSummary = dayData.dayTrades.map((t: any) => 
                        `${t.tradeType} ${t.quantity} ${t.ticker}`
                      ).join(', ');
                      return `${dateStr} (${tradeSummary})`;
                    }
                    return dateStr;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Value"
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={renderTradeDot}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Allocation Chart (Combined Ticker & Sector) */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{allocationTab === 'ticker' ? 'Asset Allocation' : 'Sector Allocation'}</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={allocationTab === 'ticker' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAllocationTab('ticker')}
                className="h-7 px-2 text-xs"
              >
                Ticker
              </Button>
              <Button
                variant={allocationTab === 'sector' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAllocationTab('sector')}
                className="h-7 px-2 text-xs"
              >
                Sector
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationTab === 'ticker' ? holdingsChartData : sectorChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(allocationTab === 'ticker' ? holdingsChartData : sectorChartData).map((entry: any, index: number) => (
                    <Cell 
                      key={`allocation-${entry.name}-${index}`} 
                      fill={allocationTab === 'sector' && SECTOR_COLORS[entry.name] ? SECTOR_COLORS[entry.name] : COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => {
                    const percent = stats.totalValue > 0 ? ((value / stats.totalValue) * 100).toFixed(1) : '0';
                    return [`${formatCurrency(value)} (${percent}%)`, 'Value'];
                  }} 
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}