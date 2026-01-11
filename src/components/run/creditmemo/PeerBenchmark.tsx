import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { PeerComparison } from '@/hooks/useCreditAnalysis';
import { cn } from '@/lib/utils';

interface PeerBenchmarkProps {
  comparisons: PeerComparison[];
  sicCode: string | null;
}

function formatValue(value: number | null, metric: string): string {
  if (value === null) return 'N/A';
  if (metric.includes('Margin') || metric.includes('Return')) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(2);
}

const statusConfig = {
  above: { icon: ArrowUp, color: 'text-success', label: 'Above Average' },
  at: { icon: Minus, color: 'text-muted-foreground', label: 'At Average' },
  below: { icon: ArrowDown, color: 'text-destructive', label: 'Below Average' },
};

export function PeerBenchmark({ comparisons, sicCode }: PeerBenchmarkProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Peer Benchmarking</CardTitle>
        <CardDescription>
          {sicCode 
            ? `Comparison against SIC ${sicCode} industry peers`
            : 'Comparison against general market benchmarks'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {comparisons.map((comparison) => {
            const config = statusConfig[comparison.status];
            const Icon = config.icon;

            return (
              <div key={comparison.metric} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comparison.metric}</span>
                    <div className={cn('flex items-center gap-1 text-sm', config.color)}>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{config.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-medium">
                      {formatValue(comparison.company, comparison.metric)}
                    </span>
                    <span className="text-muted-foreground text-sm ml-2">
                      vs {formatValue(comparison.peerAverage, comparison.metric)}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <Progress 
                    value={comparison.percentile ?? 50} 
                    className="h-3"
                  />
                  {/* Peer average marker */}
                  <div 
                    className="absolute top-0 h-3 w-0.5 bg-foreground/60"
                    style={{ left: '50%' }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Bottom 25%</span>
                  <span>Peer Avg</span>
                  <span>Top 25%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Percentile rankings are estimated based on industry benchmarks. 
            Higher percentiles indicate better performance relative to peers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
