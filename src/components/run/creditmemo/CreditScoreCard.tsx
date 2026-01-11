import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CreditScoreCardProps {
  score: number;
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  sicCode: string | null;
}

const categoryConfig = {
  excellent: { label: 'Excellent', color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success/30' },
  good: { label: 'Good', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  fair: { label: 'Fair', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/30' },
  poor: { label: 'Poor', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  critical: { label: 'Critical', color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive/30' },
};

export function CreditScoreCard({ score, category, sicCode }: CreditScoreCardProps) {
  const config = categoryConfig[category];
  
  // Calculate circumference and offset for the circular progress
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className={cn('glass-card', config.bgColor, config.borderColor)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Credit Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Circular Score Display */}
          <div className="relative">
            <svg width="160" height="160" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={
                  category === 'excellent' ? 'hsl(var(--success))' :
                  category === 'good' ? 'hsl(142 71% 45%)' :
                  category === 'fair' ? 'hsl(var(--warning))' :
                  category === 'poor' ? 'hsl(25 95% 53%)' :
                  'hsl(var(--destructive))'
                }
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-4xl font-bold', config.color)}>
                {Math.round(score)}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1 space-y-3">
            <div>
              <span className={cn('text-2xl font-semibold', config.color)}>
                {config.label}
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                Overall creditworthiness assessment
              </p>
            </div>
            
            {sicCode && (
              <div className="text-sm">
                <span className="text-muted-foreground">Industry Benchmark: </span>
                <span className="font-mono text-foreground">SIC {sicCode}</span>
              </div>
            )}

            <div className="flex gap-1 mt-2">
              {['critical', 'poor', 'fair', 'good', 'excellent'].map((cat) => (
                <div
                  key={cat}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-colors',
                    cat === category ? categoryConfig[cat as keyof typeof categoryConfig].bgColor.replace('/10', '/60') : 'bg-muted'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
