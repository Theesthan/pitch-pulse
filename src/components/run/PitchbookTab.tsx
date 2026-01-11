import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  FileText,
  Scale,
  Wallet,
  Activity
} from 'lucide-react';
import { KPITile } from './pitchbook/KPITile';
import { FinancialChart } from './pitchbook/FinancialChart';
import { EditableSection } from './pitchbook/EditableSection';
import { NormalizedFinancials, FiscalYearData } from '@/types/financials';

interface PitchbookTabProps {
  data: NormalizedFinancials | null;
  company: {
    ticker: string;
    name: string;
    sicCode?: string | null;
    description?: string | null;
  } | null;
  pitchbookContent: PitchbookContent | null;
  onContentChange: (content: PitchbookContent) => void;
  readOnly?: boolean;
}

interface PitchbookContent {
  companyOverview: string;
  industryLandscape: string;
  keyRisks: string;
  investmentHighlights: string;
}

const CHART_COLORS = {
  revenue: 'hsl(var(--primary))',
  netIncome: 'hsl(142, 76%, 36%)',
  assets: 'hsl(217, 91%, 60%)',
  liabilities: 'hsl(0, 84%, 60%)',
  equity: 'hsl(142, 76%, 36%)',
  operatingCashFlow: 'hsl(280, 67%, 56%)',
  ebitda: 'hsl(38, 92%, 50%)',
  grossProfit: 'hsl(199, 89%, 48%)',
};

function calculateKPIs(fiscalYears: FiscalYearData[]) {
  if (!fiscalYears.length) return null;
  
  const latest = fiscalYears[fiscalYears.length - 1];
  const previous = fiscalYears.length > 1 ? fiscalYears[fiscalYears.length - 2] : null;
  
  const getTrend = (current: number | null, prev: number | null): 'up' | 'down' | 'neutral' => {
    if (!current || !prev) return 'neutral';
    return current > prev ? 'up' : current < prev ? 'down' : 'neutral';
  };

  const getChangePercent = (current: number | null, prev: number | null): string => {
    if (!current || !prev || prev === 0) return '';
    const change = ((current - prev) / Math.abs(prev)) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}% YoY`;
  };

  // Calculate ratios
  const currentRatio = latest.currentAssets && latest.currentLiabilities 
    ? latest.currentAssets / latest.currentLiabilities 
    : null;
  
  const debtToEquity = latest.longTermDebt && latest.stockholdersEquity 
    ? latest.longTermDebt / latest.stockholdersEquity 
    : null;

  const grossMargin = latest.grossProfit && latest.revenue 
    ? latest.grossProfit / latest.revenue 
    : null;

  const netMargin = latest.netIncome && latest.revenue 
    ? latest.netIncome / latest.revenue 
    : null;

  const roa = latest.netIncome && latest.totalAssets 
    ? latest.netIncome / latest.totalAssets 
    : null;

  const roe = latest.netIncome && latest.stockholdersEquity 
    ? latest.netIncome / latest.stockholdersEquity 
    : null;

  return {
    revenue: {
      value: latest.revenue,
      trend: getTrend(latest.revenue, previous?.revenue ?? null),
      change: getChangePercent(latest.revenue, previous?.revenue ?? null),
    },
    netIncome: {
      value: latest.netIncome,
      trend: getTrend(latest.netIncome, previous?.netIncome ?? null),
      change: getChangePercent(latest.netIncome, previous?.netIncome ?? null),
    },
    ebitda: {
      value: latest.ebitda,
      trend: getTrend(latest.ebitda, previous?.ebitda ?? null),
      change: getChangePercent(latest.ebitda, previous?.ebitda ?? null),
    },
    totalAssets: {
      value: latest.totalAssets,
      trend: getTrend(latest.totalAssets, previous?.totalAssets ?? null),
      change: getChangePercent(latest.totalAssets, previous?.totalAssets ?? null),
    },
    currentRatio: { value: currentRatio, trend: 'neutral' as const, change: '' },
    debtToEquity: { value: debtToEquity, trend: 'neutral' as const, change: '' },
    grossMargin: { value: grossMargin, trend: 'neutral' as const, change: '' },
    netMargin: { value: netMargin, trend: 'neutral' as const, change: '' },
    roa: { value: roa, trend: 'neutral' as const, change: '' },
    roe: { value: roe, trend: 'neutral' as const, change: '' },
    operatingCashFlow: {
      value: latest.operatingCashFlow,
      trend: getTrend(latest.operatingCashFlow, previous?.operatingCashFlow ?? null),
      change: getChangePercent(latest.operatingCashFlow, previous?.operatingCashFlow ?? null),
    },
  };
}

export function PitchbookTab({ data, company, pitchbookContent, onContentChange, readOnly = false }: PitchbookTabProps) {
  const [content, setContent] = useState<PitchbookContent>(pitchbookContent ?? {
    companyOverview: company?.description || '',
    industryLandscape: '',
    keyRisks: '',
    investmentHighlights: '',
  });

  const kpis = useMemo(() => {
    if (!data?.fiscalYears?.length) return null;
    return calculateKPIs(data.fiscalYears);
  }, [data]);

  const handleContentChange = useCallback((field: keyof PitchbookContent, value: string) => {
    const updated = { ...content, [field]: value };
    setContent(updated);
    onContentChange(updated);
  }, [content, onContentChange]);

  if (!data || !data.fiscalYears?.length) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Pitchbook Builder</CardTitle>
          <CardDescription>Company snapshot, KPIs, and financial analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Data Available</h3>
            <p className="mt-1 text-muted-foreground">
              Fetch SEC data in the Data tab to generate the pitchbook
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestYear = data.fiscalYears[data.fiscalYears.length - 1]?.year;

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <Card className="glass-card border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{company?.name || data.entityName}</h2>
                  <p className="text-muted-foreground">
                    <span className="font-mono">{company?.ticker || data.ticker}</span>
                    {(company?.sicCode || data.sicCode) && (
                      <span> • SIC {company?.sicCode || data.sicCode}</span>
                    )}
                    {latestYear && <span> • Latest FY{latestYear}</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Key Performance Indicators
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPITile
            title="Revenue"
            value={kpis?.revenue.value ?? 'N/A'}
            format="currency"
            icon={<DollarSign className="h-5 w-5" />}
            trend={kpis?.revenue.trend}
            trendValue={kpis?.revenue.change}
          />
          <KPITile
            title="Net Income"
            value={kpis?.netIncome.value ?? 'N/A'}
            format="currency"
            icon={<TrendingUp className="h-5 w-5" />}
            trend={kpis?.netIncome.trend}
            trendValue={kpis?.netIncome.change}
          />
          <KPITile
            title="EBITDA"
            value={kpis?.ebitda.value ?? 'N/A'}
            format="currency"
            icon={<BarChart3 className="h-5 w-5" />}
            trend={kpis?.ebitda.trend}
            trendValue={kpis?.ebitda.change}
          />
          <KPITile
            title="Total Assets"
            value={kpis?.totalAssets.value ?? 'N/A'}
            format="currency"
            icon={<Wallet className="h-5 w-5" />}
            trend={kpis?.totalAssets.trend}
            trendValue={kpis?.totalAssets.change}
          />
        </div>
      </div>

      {/* Financial Ratios */}
      <div>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Financial Ratios
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KPITile title="Gross Margin" value={kpis?.grossMargin.value ?? 'N/A'} format="percent" />
          <KPITile title="Net Margin" value={kpis?.netMargin.value ?? 'N/A'} format="percent" />
          <KPITile title="ROA" value={kpis?.roa.value ?? 'N/A'} format="percent" />
          <KPITile title="ROE" value={kpis?.roe.value ?? 'N/A'} format="percent" />
          <KPITile title="Current Ratio" value={kpis?.currentRatio.value ?? 'N/A'} format="ratio" />
          <KPITile title="Debt/Equity" value={kpis?.debtToEquity.value ?? 'N/A'} format="ratio" />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Financial Charts */}
      <div>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          Financial Trends
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <FinancialChart
            title="Revenue & Profitability"
            description="Revenue, gross profit, and net income trends"
            data={data.fiscalYears}
            metrics={[
              { key: 'revenue', label: 'Revenue', color: CHART_COLORS.revenue },
              { key: 'grossProfit', label: 'Gross Profit', color: CHART_COLORS.grossProfit },
              { key: 'netIncome', label: 'Net Income', color: CHART_COLORS.netIncome },
            ]}
            chartType="area"
          />
          <FinancialChart
            title="Balance Sheet"
            description="Assets, liabilities, and equity composition"
            data={data.fiscalYears}
            metrics={[
              { key: 'totalAssets', label: 'Total Assets', color: CHART_COLORS.assets },
              { key: 'totalLiabilities', label: 'Liabilities', color: CHART_COLORS.liabilities },
              { key: 'stockholdersEquity', label: 'Equity', color: CHART_COLORS.equity },
            ]}
            chartType="bar"
          />
          <FinancialChart
            title="Operating Performance"
            description="EBITDA and operating cash flow"
            data={data.fiscalYears}
            metrics={[
              { key: 'ebitda', label: 'EBITDA', color: CHART_COLORS.ebitda },
              { key: 'operatingCashFlow', label: 'Operating Cash Flow', color: CHART_COLORS.operatingCashFlow },
            ]}
            chartType="line"
          />
          <FinancialChart
            title="Income Breakdown"
            description="Operating income progression"
            data={data.fiscalYears}
            metrics={[
              { key: 'operatingIncome', label: 'Operating Income', color: CHART_COLORS.revenue },
              { key: 'netIncome', label: 'Net Income', color: CHART_COLORS.netIncome },
            ]}
            chartType="area"
          />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Editable Sections */}
      <div>
        <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Analysis Sections
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <EditableSection
            title="Company Overview"
            content={content.companyOverview}
            placeholder="Enter company overview, business model, and key products/services..."
            onChange={(value) => handleContentChange('companyOverview', value)}
            minHeight="min-h-[150px]"
          />
          <EditableSection
            title="Investment Highlights"
            content={content.investmentHighlights}
            placeholder="Enter key investment highlights and competitive advantages..."
            onChange={(value) => handleContentChange('investmentHighlights', value)}
            minHeight="min-h-[150px]"
          />
          <EditableSection
            title="Industry Landscape"
            content={content.industryLandscape}
            placeholder="Describe industry dynamics, market position, and competitive environment..."
            onChange={(value) => handleContentChange('industryLandscape', value)}
            minHeight="min-h-[150px]"
          />
          <EditableSection
            title="Key Risks"
            content={content.keyRisks}
            placeholder="Outline key risks including operational, financial, and regulatory concerns..."
            onChange={(value) => handleContentChange('keyRisks', value)}
            minHeight="min-h-[150px]"
          />
        </div>
      </div>
    </div>
  );
}
