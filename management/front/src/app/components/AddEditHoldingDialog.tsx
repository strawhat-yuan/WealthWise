import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { usePortfolio } from '../context/PortfolioContext';
import { Holding, AssetType } from '../types/portfolio';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface AddEditHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  holding: Holding | null;
}

interface FormData {
  ticker: string;
  name: string;
  type: AssetType;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
}

export function AddEditHoldingDialog({ open, onClose, holding }: AddEditHoldingDialogProps) {
  const { addHolding, updateHolding } = usePortfolio();
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      ticker: '',
      name: '',
      type: 'stock',
      quantity: 1,
      purchasePrice: 0,
      currentPrice: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (holding) {
      setValue('ticker', holding.ticker);
      setValue('name', holding.name);
      setValue('type', holding.type);
      setValue('quantity', holding.quantity);
      setValue('purchasePrice', holding.purchasePrice);
      setValue('currentPrice', holding.currentPrice);
      setValue('purchaseDate', holding.purchaseDate);
    } else {
      reset();
    }
  }, [holding, setValue, reset]);

  const onSubmit = (data: FormData) => {
    if (holding) {
      updateHolding(holding.id, data);
    } else {
      addHolding(data);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{holding ? 'Edit Holding' : 'Add New Holding'}</DialogTitle>
          <DialogDescription>
            {holding ? 'Update the details of your holding.' : 'Add a new holding to your portfolio.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker/Symbol *</Label>
              <Input
                id="ticker"
                {...register('ticker', { required: 'Ticker is required' })}
                placeholder="e.g., AAPL"
              />
              {errors.ticker && (
                <p className="text-sm text-red-600">{errors.ticker.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Asset Type *</Label>
              <Select
                value={selectedType}
                onValueChange={(value: AssetType) => setValue('type', value)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g., Apple Inc."
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                {...register('quantity', {
                  required: 'Quantity is required',
                  min: { value: 0.01, message: 'Quantity must be positive' },
                })}
              />
              {errors.quantity && (
                <p className="text-sm text-red-600">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...register('purchaseDate', { required: 'Purchase date is required' })}
              />
              {errors.purchaseDate && (
                <p className="text-sm text-red-600">{errors.purchaseDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                {...register('purchasePrice', {
                  required: 'Purchase price is required',
                  min: { value: 0, message: 'Price must be non-negative' },
                })}
              />
              {errors.purchasePrice && (
                <p className="text-sm text-red-600">{errors.purchasePrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPrice">Current Price *</Label>
              <Input
                id="currentPrice"
                type="number"
                step="0.01"
                {...register('currentPrice', {
                  required: 'Current price is required',
                  min: { value: 0, message: 'Price must be non-negative' },
                })}
              />
              {errors.currentPrice && (
                <p className="text-sm text-red-600">{errors.currentPrice.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {holding ? 'Update' : 'Add'} Holding
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
