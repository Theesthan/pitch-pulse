import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CreditRatio } from '@/hooks/useCreditAnalysis';
import { cn } from '@/lib/utils';

interface RatiosTableProps {
  ratios: CreditRatio[];
}

const statusConfig = {
  good: { label: 'Good', variant: 'default' as const, icon: TrendingUp, className: 'bg-success/20 text-success border-success/30' },
  warning: { label: 'Warning', variant: 'secondary' as const, icon: Minus, className: 'bg-warning/20 text-warning border-warning/30' },
  critical: { label: 'Critical', variant: 'destructive' as const, icon: TrendingDown, className: 'bg-destructive/20 text-destructive border-destructive/30' },
};

function formatValue(value: number | null, isPercentage: boolean = false): string {
  if (value === null) return 'N/A';
  if (isPercentage) return `${(value * 100).toFixed(1)}%`;
  return value.toFixed(2);
}

function isPercentageRatio(name: string): boolean {
  return name.includes('Margin') || name.includes('Return');
}

export function RatiosTable({ ratios }: RatiosTableProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Credit Ratios</CardTitle>
        <CardDescription>Key financial ratios compared to industry benchmarks</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ratio</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Benchmark</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratios.map((ratio) => {
                const config = statusConfig[ratio.status];
                const Icon = config.icon;
                const isPercent = isPercentageRatio(ratio.name);

                return (
                  <TableRow key={ratio.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ratio.name}</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-medium">{ratio.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Formula: {ratio.formula}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatValue(ratio.value, isPercent)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatValue(ratio.benchmark, isPercent)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={config.variant}
                        className={cn('gap-1', config.className)}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
