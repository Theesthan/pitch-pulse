import type { NormalizedFinancials } from '@/types/financials';

interface CreditMemoPrintContentProps {
  data: NormalizedFinancials | null;
  content: {
    summary?: string;
    creditScore?: number;
    creditCategory?: string;
    ratios?: Array<{ name: string; value: number; benchmark: number; status: string }>;
    riskFlags?: Array<{ severity: string; category: string; description: string }>;
  } | null;
}

export function CreditMemoPrintContent({ data, content }: CreditMemoPrintContentProps) {
  const fiscalYears = data?.fiscalYears || [];
  const latestYear = fiscalYears[fiscalYears.length - 1];

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  // Calculate ratios from data
  const currentRatio = latestYear?.currentAssets && latestYear?.currentLiabilities
    ? (latestYear.currentAssets / latestYear.currentLiabilities).toFixed(2)
    : 'N/A';
  
  const debtToEquity = latestYear?.longTermDebt && latestYear?.stockholdersEquity
    ? (latestYear.longTermDebt / latestYear.stockholdersEquity).toFixed(2)
    : 'N/A';
  
  // Estimate interest coverage using operating income as proxy
  const interestCoverage = latestYear?.ebitda && latestYear?.longTermDebt && latestYear.longTermDebt > 0
    ? (latestYear.ebitda / (latestYear.longTermDebt * 0.05)).toFixed(2) // Assume ~5% interest rate
    : 'N/A';

  const netProfitMargin = latestYear?.netIncome && latestYear?.revenue
    ? ((latestYear.netIncome / latestYear.revenue) * 100).toFixed(1) + '%'
    : 'N/A';

  return (
    <div className="space-y-8">
      {/* Credit Summary */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Credit Summary
        </h3>
        <div className="flex gap-8">
          <div className="text-center p-4 border-2 border-gray-300 rounded-lg">
            <p className="text-4xl font-bold text-gray-900">
              {content?.creditScore || '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Credit Score</p>
            <p className="text-xs font-medium text-gray-700 mt-1">
              {content?.creditCategory || 'Not Rated'}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-gray-700 leading-relaxed">
              {content?.summary || 'Credit analysis summary not available. Complete the analysis to generate a comprehensive credit assessment.'}
            </p>
          </div>
        </div>
      </section>

      {/* Key Credit Ratios */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Key Credit Ratios
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 font-semibold">Ratio</th>
              <th className="text-right py-2 font-semibold">Value</th>
              <th className="text-right py-2 font-semibold">Industry Benchmark</th>
              <th className="text-right py-2 font-semibold">Assessment</th>
            </tr>
          </thead>
          <tbody>
            <RatioRow label="Current Ratio" value={currentRatio} benchmark="1.5x" />
            <RatioRow label="Debt to Equity" value={debtToEquity} benchmark="1.0x" />
            <RatioRow label="Interest Coverage" value={interestCoverage} benchmark="3.0x" />
            <RatioRow label="Net Profit Margin" value={netProfitMargin} benchmark="10.0%" />
          </tbody>
        </table>
      </section>

      {/* Balance Sheet Summary */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Balance Sheet Summary (FY{latestYear?.year || 'N/A'})
        </h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Assets</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Current Assets</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(latestYear?.currentAssets)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Total Assets</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(latestYear?.totalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Liabilities & Equity</h4>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Current Liabilities</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(latestYear?.currentLiabilities)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Long-Term Debt</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(latestYear?.longTermDebt)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1 text-gray-600">Stockholders' Equity</td>
                  <td className="py-1 text-right font-mono">{formatCurrency(latestYear?.stockholdersEquity)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Risk Factors */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Identified Risk Factors
        </h3>
        {content?.riskFlags && content.riskFlags.length > 0 ? (
          <div className="space-y-3">
            {content.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  flag.severity === 'high' ? 'bg-red-100 text-red-700' :
                  flag.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {flag.severity.toUpperCase()}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{flag.category}</p>
                  <p className="text-sm text-gray-600">{flag.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No significant risk factors identified.</p>
        )}
      </section>

      {/* Recommendation */}
      <section className="border-2 border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Credit Recommendation
        </h3>
        <p className="text-gray-700">
          Based on the analysis of financial statements and credit metrics, a comprehensive 
          credit assessment has been conducted. Final credit decisions should consider additional 
          qualitative factors and market conditions not captured in this automated analysis.
        </p>
      </section>
    </div>
  );
}

function RatioRow({ label, value, benchmark }: { label: string; value: string; benchmark: string }) {
  const numValue = parseFloat(value);
  const numBenchmark = parseFloat(benchmark);
  
  let assessment = 'N/A';
  let assessmentColor = 'text-gray-500';
  
  if (!isNaN(numValue) && !isNaN(numBenchmark)) {
    if (label.includes('Debt')) {
      // Lower is better for debt ratios
      assessment = numValue <= numBenchmark ? 'Healthy' : numValue <= numBenchmark * 1.5 ? 'Moderate' : 'Elevated';
      assessmentColor = numValue <= numBenchmark ? 'text-green-600' : numValue <= numBenchmark * 1.5 ? 'text-yellow-600' : 'text-red-600';
    } else {
      // Higher is better for other ratios
      assessment = numValue >= numBenchmark ? 'Healthy' : numValue >= numBenchmark * 0.7 ? 'Moderate' : 'Weak';
      assessmentColor = numValue >= numBenchmark ? 'text-green-600' : numValue >= numBenchmark * 0.7 ? 'text-yellow-600' : 'text-red-600';
    }
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 text-gray-700">{label}</td>
      <td className="py-2 text-right font-mono text-gray-900">{value}</td>
      <td className="py-2 text-right text-gray-500">{benchmark}</td>
      <td className={`py-2 text-right font-medium ${assessmentColor}`}>{assessment}</td>
    </tr>
  );
}
