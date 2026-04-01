import { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Holding } from '../types/portfolio';
import {
  calculateHoldingValue,
  calculateHoldingCost,
  calculateHoldingGainLoss,
  calculateHoldingGainLossPercent,
  formatCurrency,
  formatPercent,
} from '../utils/portfolioUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Trash2, Edit, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AddEditHoldingDialog } from '../components/AddEditHoldingDialog';
import { HoldingsSkeleton } from '../components/HoldingsSkeleton';

type SortField = 'ticker' | 'name' | 'value' | 'gainLoss' | null;
type SortDirection = 'asc' | 'desc';

export default function Holdings() {
  const { holdings, removeHolding, isLoading, error } = usePortfolio();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Show loading skeleton
  if (isLoading) {
    return <HoldingsSkeleton />;
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default desc
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort holdings
  const sortedHoldings = [...holdings].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;
    switch (sortField) {
      case 'ticker':
        comparison = a.ticker.localeCompare(b.ticker);
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'value':
        comparison = calculateHoldingValue(a) - calculateHoldingValue(b);
        break;
      case 'gainLoss':
        comparison = calculateHoldingGainLoss(a) - calculateHoldingGainLoss(b);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />
    );
  };

  const handleEdit = (holding: Holding) => {
    setEditingHolding(holding);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingHolding(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHolding(null);
  };

  const getAssetTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'stock':
        return 'bg-blue-100 text-blue-800';
      case 'bond':
        return 'bg-green-100 text-green-800';
      case 'cash':
        return 'bg-gray-100 text-gray-800';
      case 'etf':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-3xl">Holdings</h2>
          <p className="text-gray-600 mt-1">Manage your portfolio holdings</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Holding
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('ticker')}>
                    <div className="flex items-center">
                      Ticker
                      {getSortIcon('ticker')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('name')}>
                    <div className="flex items-center">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg. Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('value')}>
                    <div className="flex items-center justify-end">
                      Total Value
                      {getSortIcon('value')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('gainLoss')}>
                    <div className="flex items-center justify-end">
                      Gain/Loss
                      {getSortIcon('gainLoss')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No holdings found. Click "Add Holding" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedHoldings.map((holding) => {
                    const value = calculateHoldingValue(holding);
                    const cost = calculateHoldingCost(holding);
                    const gainLoss = calculateHoldingGainLoss(holding);
                    const gainLossPercent = calculateHoldingGainLossPercent(holding);

                    return (
                      <TableRow key={holding.id}>
                        <TableCell className="font-medium">{holding.ticker}</TableCell>
                        <TableCell>{holding.name}</TableCell>
                        <TableCell>
                          <Badge className={getAssetTypeBadgeColor(holding.type)}>
                            {holding.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{holding.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(holding.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(holding.currentPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(value)}</TableCell>
                        <TableCell className="text-right">
                          {holding.type === 'cash' ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                              <div className="flex items-center justify-end gap-1">
                                {gainLoss >= 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                <span className="font-medium">{formatCurrency(gainLoss)}</span>
                              </div>
                              <div className="text-xs">{formatPercent(gainLossPercent)}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(holding)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeHolding(holding.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddEditHoldingDialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        holding={editingHolding}
      />
    </div>
  );
}