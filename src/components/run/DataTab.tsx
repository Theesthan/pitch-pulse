import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Database, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { NormalizedFinancials, SECDataResponse } from '@/types/financials';
import { formatDistanceToNow } from 'date-fns';

interface DataTabProps {
  data: SECDataResponse | null | undefined;
  isLoading: boolean;
  isFetching: boolean;
  onFetchData: (forceRefresh?: boolean) => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return '—';
  
  const absValue = Math.abs(value);
  if (absValue >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (absValue >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (absValue >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (absValue >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function FinancialTable({ data }: { data: NormalizedFinancials }) {
  const metrics = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'grossProfit', label: 'Gross Profit' },
    { key: 'operatingIncome', label: 'Operating Income' },
    { key: 'netIncome', label: 'Net Income' },
    { key: 'totalAssets', label: 'Total Assets' },
    { key: 'currentAssets', label: 'Current Assets' },
    { key: 'totalLiabilities', label: 'Total Liabilities' },
    { key: 'currentLiabilities', label: 'Current Liabilities' },
    { key: 'stockholdersEquity', label: "Stockholders' Equity" },
    { key: 'longTermDebt', label: 'Long-Term Debt' },
    { key: 'operatingCashFlow', label: 'Operating Cash Flow' },
  ] as const;

  const years = data.fiscalYears.map(fy => fy.year).sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background/95 backdrop-blur min-w-[180px]">
              Metric
            </TableHead>
            {years.map(year => (
              <TableHead key={year} className="text-right min-w-[120px]">
                FY{year}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {metrics.map(metric => {
            const hasAnyData = data.fiscalYears.some(
              fy => fy[metric.key] !== null
            );
            
            return (
              <TableRow key={metric.key} className={!hasAnyData ? 'opacity-50' : ''}>
                <TableCell className="sticky left-0 bg-background/95 backdrop-blur font-medium">
                  {metric.label}
                </TableCell>
                {years.map(year => {
                  const fyData = data.fiscalYears.find(fy => fy.year === year);
                  const value = fyData?.[metric.key] ?? null;
                  
                  return (
                    <TableCell 
                      key={year} 
                      className={`text-right font-mono ${
                        value !== null && value < 0 ? 'text-destructive' : ''
                      }`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RawDataViewer({ data }: { data: NormalizedFinancials }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());

  const toggleMetric = (metric: string) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  const metricCount = Object.keys(data.rawMetrics).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto">
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">Raw XBRL Data</span>
            <Badge variant="secondary" className="ml-2">
              {metricCount} metrics
            </Badge>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Object.entries(data.rawMetrics)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([metric, values]) => (
              <Collapsible 
                key={metric}
                open={expandedMetrics.has(metric)}
                onOpenChange={() => toggleMetric(metric)}
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-between text-left font-mono text-xs h-8"
                  >
                    <span className="truncate">{metric}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {values.length}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-1 mb-2 p-2 rounded bg-muted/50 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(values, null, 2)}</pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DataTab({ data, isLoading, isFetching, onFetchData }: DataTabProps) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>
            Financial data fetched from SEC EDGAR and other sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Database className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No data fetched yet</h3>
            <p className="mt-1 text-muted-foreground max-w-md">
              Click "Fetch Data" to retrieve SEC filings and financial data for this company
            </p>
            <Button 
              className="mt-4" 
              onClick={() => onFetchData(false)}
              disabled={isFetching}
            >
              {isFetching ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Fetch Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const financials = data.data;

  return (
    <div className="space-y-4">
      {/* Data Source Info */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                SEC EDGAR Data
                <Badge 
                  variant={data.source === 'live' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {data.source === 'live' ? (
                    <>
                      <Zap className="mr-1 h-3 w-3" />
                      Live
                    </>
                  ) : (
                    <>
                      <Clock className="mr-1 h-3 w-3" />
                      Cached
                    </>
                  )}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                <span className="font-mono">{financials.ticker}</span> • {financials.entityName} • 
                CIK: {financials.cik}
                {financials.sicCode && ` • SIC: ${financials.sicCode}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(data.fetchedAt), { addSuffix: true })}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onFetchData(true)}
                disabled={isFetching}
              >
                {isFetching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Financial Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Normalized Financial Data
          </CardTitle>
          <CardDescription>
            Key financial metrics extracted from 10-K annual filings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialTable data={financials} />
        </CardContent>
      </Card>

      {/* Raw Data Viewer */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <RawDataViewer data={financials} />
        </CardContent>
      </Card>
    </div>
  );
}
