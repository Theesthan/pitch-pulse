import type { NormalizedFinancials, FiscalYearData } from '@/types/financials';

interface PitchbookPrintContentProps {
  data: NormalizedFinancials | null;
  content: {
    companyOverview?: string;
    investmentHighlights?: string;
    industryLandscape?: string;
    keyRisks?: string;
  } | null;
  company: { ticker: string; name: string; description?: string | null } | null;
}

export function PitchbookPrintContent({ data, content, company }: PitchbookPrintContentProps) {
  const fiscalYears = data?.fiscalYears || [];
  const latestYear = fiscalYears[fiscalYears.length - 1];

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-8">
      {/* Executive Summary */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Executive Summary
        </h3>
        <p className="text-gray-700 leading-relaxed">
          {content?.companyOverview || company?.description || 'Company overview not available.'}
        </p>
      </section>

      {/* Key Metrics */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Key Financial Metrics (FY{latestYear?.year || 'N/A'})
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <MetricBox label="Revenue" value={formatCurrency(latestYear?.revenue)} />
          <MetricBox label="Net Income" value={formatCurrency(latestYear?.netIncome)} />
          <MetricBox label="EBITDA" value={formatCurrency(latestYear?.ebitda)} />
          <MetricBox 
            label="Gross Margin" 
            value={formatPercent(
              latestYear?.revenue && latestYear?.grossProfit 
                ? latestYear.grossProfit / latestYear.revenue 
                : null
            )} 
          />
        </div>
      </section>

      {/* Financial Trends */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Historical Financial Performance
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 font-semibold">Metric</th>
              {fiscalYears.map(fy => (
                <th key={fy.year} className="text-right py-2 font-semibold">FY{fy.year}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <FinancialRow label="Revenue" years={fiscalYears} accessor="revenue" format={formatCurrency} />
            <FinancialRow label="Gross Profit" years={fiscalYears} accessor="grossProfit" format={formatCurrency} />
            <FinancialRow label="Net Income" years={fiscalYears} accessor="netIncome" format={formatCurrency} />
            <FinancialRow label="EBITDA" years={fiscalYears} accessor="ebitda" format={formatCurrency} />
            <FinancialRow label="Total Assets" years={fiscalYears} accessor="totalAssets" format={formatCurrency} />
            <FinancialRow label="Long-Term Debt" years={fiscalYears} accessor="longTermDebt" format={formatCurrency} />
          </tbody>
        </table>
      </section>

      {/* Investment Highlights */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Investment Highlights
        </h3>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content?.investmentHighlights || 'Investment highlights not provided.'}
        </p>
      </section>

      {/* Industry Analysis */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Industry Landscape
        </h3>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content?.industryLandscape || 'Industry analysis not provided.'}
        </p>
      </section>

      {/* Risk Factors */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Key Risk Factors
        </h3>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content?.keyRisks || 'Risk factors not provided.'}
        </p>
      </section>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 rounded p-3 text-center">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function FinancialRow({ 
  label, 
  years, 
  accessor, 
  format 
}: { 
  label: string; 
  years: FiscalYearData[]; 
  accessor: keyof FiscalYearData;
  format: (v: number | null | undefined) => string;
}) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 text-gray-700">{label}</td>
      {years.map((fy, i) => (
        <td key={i} className="py-2 text-right font-mono text-gray-900">
          {format(fy[accessor] as number | null | undefined)}
        </td>
      ))}
    </tr>
  );
}
