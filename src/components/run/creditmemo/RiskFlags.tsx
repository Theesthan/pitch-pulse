import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';
import { RiskFlag } from '@/hooks/useCreditAnalysis';
import { cn } from '@/lib/utils';

interface RiskFlagsProps {
  flags: RiskFlag[];
}

const severityConfig = {
  low: { 
    icon: Info, 
    label: 'Low',
    className: 'bg-accent/30 border-accent text-accent-foreground',
    iconClassName: 'text-accent-foreground',
  },
  medium: { 
    icon: AlertCircle, 
    label: 'Medium',
    className: 'bg-warning/10 border-warning/30 text-warning',
    iconClassName: 'text-warning',
  },
  high: { 
    icon: AlertTriangle, 
    label: 'High',
    className: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    iconClassName: 'text-orange-400',
  },
  critical: { 
    icon: XCircle, 
    label: 'Critical',
    className: 'bg-destructive/10 border-destructive/30 text-destructive',
    iconClassName: 'text-destructive',
  },
};

export function RiskFlags({ flags }: RiskFlagsProps) {
  // Sort by severity
  const sortedFlags = [...flags].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  const criticalCount = flags.filter(f => f.severity === 'critical').length;
  const highCount = flags.filter(f => f.severity === 'high').length;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Risk Assessment</CardTitle>
            <CardDescription>Identified risk factors requiring attention</CardDescription>
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                {criticalCount} Critical
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="gap-1 bg-orange-500/20 text-orange-400 border-orange-500/30">
                <AlertTriangle className="h-3 w-3" />
                {highCount} High
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedFlags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-success/10 p-3">
              <Info className="h-6 w-6 text-success" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-success">No Risk Flags</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No significant risk factors identified in the analysis.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedFlags.map((flag) => {
              const config = severityConfig[flag.severity];
              const Icon = config.icon;

              return (
                <div
                  key={flag.id}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    config.className
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.iconClassName)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{flag.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {flag.category}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1 opacity-90">{flag.description}</p>
                      <p className="text-xs mt-2 opacity-70">
                        <span className="font-medium">Impact:</span> {flag.impact}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
