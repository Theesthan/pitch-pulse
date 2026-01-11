import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Shield,
  Undo2,
  Info
} from 'lucide-react';
import { ValidationResult, ValidationCheck } from '@/types/financials';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface ValidationTabProps {
  validationResult: ValidationResult;
  onAddOverride: (checkId: string, reason: string, userId: string) => void;
  onRemoveOverride: (checkId: string) => void;
  hasData: boolean;
}

const statusConfig = {
  pass: {
    icon: CheckCircle,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    label: 'Pass',
    badgeVariant: 'default' as const,
  },
  warn: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'Warning',
    badgeVariant: 'secondary' as const,
  },
  fail: {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Fail',
    badgeVariant: 'destructive' as const,
  },
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Pending',
    badgeVariant: 'outline' as const,
  },
};

function ValidationCheckItem({
  check,
  onOverride,
  onRemoveOverride,
}: {
  check: ValidationCheck;
  onOverride: () => void;
  onRemoveOverride: () => void;
}) {
  const config = statusConfig[check.status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${check.overridden ? 'border-primary/50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 ${config.bgColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{check.name}</h4>
              {check.overridden && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="mr-1 h-3 w-3" />
                  Overridden
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{check.description}</p>
            {check.message && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                {check.message}
              </p>
            )}
            {check.overridden && check.overrideReason && (
              <div className="mt-2 p-2 rounded bg-muted/50 text-sm">
                <span className="font-medium">Override reason: </span>
                {check.overrideReason}
                {check.overriddenAt && (
                  <span className="text-muted-foreground ml-2">
                    ({formatDistanceToNow(new Date(check.overriddenAt), { addSuffix: true })})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.badgeVariant}>{config.label}</Badge>
          {check.status !== 'pass' && check.status !== 'pending' && !check.overridden && (
            <Button variant="ghost" size="sm" onClick={onOverride}>
              Override
            </Button>
          )}
          {check.overridden && (
            <Button variant="ghost" size="sm" onClick={onRemoveOverride}>
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ValidationTab({
  validationResult,
  onAddOverride,
  onRemoveOverride,
  hasData,
}: ValidationTabProps) {
  const { user } = useAuth();
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<ValidationCheck | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const handleOverrideClick = (check: ValidationCheck) => {
    setSelectedCheck(check);
    setOverrideReason('');
    setOverrideDialogOpen(true);
  };

  const handleConfirmOverride = () => {
    if (selectedCheck && user && overrideReason.trim()) {
      onAddOverride(selectedCheck.id, overrideReason.trim(), user.id);
      setOverrideDialogOpen(false);
      setSelectedCheck(null);
      setOverrideReason('');
    }
  };

  if (!hasData) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Validation Checklist</CardTitle>
          <CardDescription>
            Data quality checks and validation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No validation run yet</h3>
            <p className="mt-1 text-muted-foreground">
              Fetch data first, then validation checks will run automatically
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallConfig = statusConfig[validationResult.overallStatus];
  const OverallIcon = overallConfig.icon;

  const passCount = validationResult.checks.filter(c => c.status === 'pass').length;
  const warnCount = validationResult.checks.filter(c => c.status === 'warn').length;
  const failCount = validationResult.checks.filter(c => c.status === 'fail').length;
  const overrideCount = validationResult.checks.filter(c => c.overridden).length;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Validation Summary
                <Badge variant={overallConfig.badgeVariant} className="ml-2">
                  <OverallIcon className="mr-1 h-3 w-3" />
                  {overallConfig.label}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {validationResult.lastValidatedAt && (
                  <>Last validated {formatDistanceToNow(new Date(validationResult.lastValidatedAt), { addSuffix: true })}</>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-500">{passCount}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-500">{warnCount}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{failCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{overrideCount}</p>
                <p className="text-xs text-muted-foreground">Overrides</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Checks */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Validation Checks</CardTitle>
          <CardDescription>
            Individual data quality and completeness checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {validationResult.checks.map(check => (
              <ValidationCheckItem
                key={check.id}
                check={check}
                onOverride={() => handleOverrideClick(check)}
                onRemoveOverride={() => onRemoveOverride(check.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override Validation Check</DialogTitle>
            <DialogDescription>
              Provide a reason for overriding the "{selectedCheck?.name}" check. 
              This will be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="override-reason">Reason for Override</Label>
              <Input
                id="override-reason"
                placeholder="e.g., Data verified manually with company filings"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmOverride}
              disabled={!overrideReason.trim()}
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
