import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPITileProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  format?: 'currency' | 'percent' | 'number' | 'ratio';
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

const formatValue = (value: string | number, format: KPITileProps['format']) => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return 'N/A';
  
  switch (format) {
    case 'currency':
      if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
      if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
      return `$${value.toFixed(0)}`;
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'ratio':
      return value.toFixed(2);
    default:
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
      return value.toLocaleString();
  }
};

export function KPITile({ title, value, format = 'number', icon, trend, trendValue, className }: KPITileProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn(
      "glass-card rounded-xl p-5 transition-all hover:border-primary/30",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{formatValue(value, format)}</p>
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        )}
      </div>
      {(trend || trendValue) && (
        <div className={cn("mt-3 flex items-center gap-1 text-sm", trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span>{trendValue || (trend === 'up' ? 'Increase' : trend === 'down' ? 'Decrease' : 'No change')}</span>
        </div>
      )}
    </div>
  );
}
