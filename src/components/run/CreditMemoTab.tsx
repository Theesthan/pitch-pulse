import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, FileDown, RefreshCw } from 'lucide-react';
import { NormalizedFinancials } from '@/types/financials';
import { useCreditAnalysis } from '@/hooks/useCreditAnalysis';
import { CreditScoreCard } from './creditmemo/CreditScoreCard';
import { RatiosTable } from './creditmemo/RatiosTable';
import { RiskFlags } from './creditmemo/RiskFlags';
import { PeerBenchmark } from './creditmemo/PeerBenchmark';

interface CreditMemoContent {
  summary: string;
  riskAssessment: string;
  recommendation: string;
}

interface CreditMemoTabProps {
  data: NormalizedFinancials | null;
  isLoading?: boolean;
  creditMemoContent?: CreditMemoContent | null;
  onContentChange?: (content: CreditMemoContent) => void;
  readOnly?: boolean;
}

export function CreditMemoTab({ data, isLoading, creditMemoContent, onContentChange, readOnly = false }: CreditMemoTabProps) {
  const analysis = useCreditAnalysis(data);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data || !analysis) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Credit Memo Builder</CardTitle>
          <CardDescription>Risk analysis, ratios, and credit assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <CreditCard className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No Financial Data</h3>
            <p className="mt-1 text-muted-foreground max-w-sm">
              Fetch SEC data from the Data tab to generate credit analysis and risk assessment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Credit Analysis</h2>
          <p className="text-sm text-muted-foreground">
            {data.entityName} ({data.ticker}) • SIC {data.sicCode || 'Unknown'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
          <Button size="sm" disabled>
            <FileDown className="mr-2 h-4 w-4" />
            Export Memo
          </Button>
        </div>
      </div>

      {/* Credit Score Card */}
      <CreditScoreCard 
        score={analysis.overallScore} 
        category={analysis.scoreCategory}
        sicCode={data.sicCode}
      />

      {/* Two Column Layout for Ratios and Risk Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RatiosTable ratios={analysis.ratios} />
        <RiskFlags flags={analysis.riskFlags} />
      </div>

      {/* Peer Benchmarking */}
      <PeerBenchmark 
        comparisons={analysis.peerComparisons} 
        sicCode={data.sicCode}
      />

      {/* Summary Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Credit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm prose-invert max-w-none">
            <p>
              <strong>{data.entityName}</strong> demonstrates a{' '}
              <span className={
                analysis.scoreCategory === 'excellent' || analysis.scoreCategory === 'good' 
                  ? 'text-success font-medium' 
                  : analysis.scoreCategory === 'fair' 
                    ? 'text-warning font-medium'
                    : 'text-destructive font-medium'
              }>
                {analysis.scoreCategory}
              </span>{' '}
              credit profile with an overall score of {Math.round(analysis.overallScore)}/100.
            </p>
            
            {analysis.riskFlags.length > 0 ? (
              <p>
                The analysis identified{' '}
                <strong>{analysis.riskFlags.length} risk flag{analysis.riskFlags.length > 1 ? 's' : ''}</strong>,
                including{' '}
                {analysis.riskFlags.filter(f => f.severity === 'critical').length > 0 && (
                  <span className="text-destructive">
                    {analysis.riskFlags.filter(f => f.severity === 'critical').length} critical
                  </span>
                )}
                {analysis.riskFlags.filter(f => f.severity === 'critical').length > 0 && 
                 analysis.riskFlags.filter(f => f.severity === 'high').length > 0 && ' and '}
                {analysis.riskFlags.filter(f => f.severity === 'high').length > 0 && (
                  <span className="text-orange-400">
                    {analysis.riskFlags.filter(f => f.severity === 'high').length} high-severity
                  </span>
                )}
                {' '}issue{analysis.riskFlags.length > 1 ? 's' : ''} requiring attention.
              </p>
            ) : (
              <p className="text-success">
                No significant risk factors were identified in the analysis.
              </p>
            )}

            <p className="text-muted-foreground text-sm mt-4">
              This analysis is based on SEC EDGAR filings and industry benchmarks for SIC code {data.sicCode || 'N/A'}.
              Manual review is recommended before making credit decisions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
