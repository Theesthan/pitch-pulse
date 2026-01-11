import { useMemo } from 'react';
import { NormalizedFinancials } from '@/types/financials';

export interface CreditRatio {
  name: string;
  value: number | null;
  benchmark: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
  formula: string;
}

export interface RiskFlag {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  impact: string;
}

export interface PeerComparison {
  metric: string;
  company: number | null;
  peerAverage: number | null;
  percentile: number | null;
  status: 'above' | 'at' | 'below';
}

export interface CreditAnalysis {
  overallScore: number;
  scoreCategory: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  ratios: CreditRatio[];
  riskFlags: RiskFlag[];
  peerComparisons: PeerComparison[];
}

// SIC code industry benchmarks (simplified)
const INDUSTRY_BENCHMARKS: Record<string, { currentRatio: number; debtToEquity: number; grossMargin: number; netMargin: number }> = {
  '73': { currentRatio: 1.8, debtToEquity: 0.5, grossMargin: 0.45, netMargin: 0.12 }, // Business Services
  '35': { currentRatio: 2.0, debtToEquity: 0.6, grossMargin: 0.35, netMargin: 0.08 }, // Industrial Machinery
  '36': { currentRatio: 2.2, debtToEquity: 0.4, grossMargin: 0.42, netMargin: 0.10 }, // Electronics
  '28': { currentRatio: 1.5, debtToEquity: 0.7, grossMargin: 0.55, netMargin: 0.15 }, // Chemicals
  '60': { currentRatio: 1.2, debtToEquity: 8.0, grossMargin: 0.70, netMargin: 0.20 }, // Banking
  '62': { currentRatio: 1.5, debtToEquity: 3.0, grossMargin: 0.65, netMargin: 0.18 }, // Securities
  '20': { currentRatio: 1.4, debtToEquity: 0.8, grossMargin: 0.28, netMargin: 0.05 }, // Food Products
  '49': { currentRatio: 0.9, debtToEquity: 1.2, grossMargin: 0.40, netMargin: 0.10 }, // Utilities
  default: { currentRatio: 1.5, debtToEquity: 1.0, grossMargin: 0.35, netMargin: 0.08 },
};

function getBenchmarks(sicCode: string | null) {
  if (!sicCode) return INDUSTRY_BENCHMARKS.default;
  const prefix = sicCode.substring(0, 2);
  return INDUSTRY_BENCHMARKS[prefix] || INDUSTRY_BENCHMARKS.default;
}

function getLatestYearData(data: NormalizedFinancials) {
  const sortedYears = [...data.fiscalYears].sort((a, b) => b.year - a.year);
  if (sortedYears.length === 0) return null;
  return { year: sortedYears[0].year, data: sortedYears[0] };
}

function getPreviousYearData(data: NormalizedFinancials) {
  const sortedYears = [...data.fiscalYears].sort((a, b) => b.year - a.year);
  if (sortedYears.length < 2) return null;
  return { year: sortedYears[1].year, data: sortedYears[1] };
}

function calculateRatioStatus(value: number | null, benchmark: number, higherIsBetter: boolean, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'critical' {
  if (value === null) return 'warning';
  
  if (higherIsBetter) {
    if (value >= benchmark * thresholds.good) return 'good';
    if (value >= benchmark * thresholds.warning) return 'warning';
    return 'critical';
  } else {
    if (value <= benchmark * thresholds.good) return 'good';
    if (value <= benchmark * thresholds.warning) return 'warning';
    return 'critical';
  }
}

export function useCreditAnalysis(data: NormalizedFinancials | null): CreditAnalysis | null {
  return useMemo(() => {
    if (!data) return null;

    const latest = getLatestYearData(data);
    const previous = getPreviousYearData(data);
    
    if (!latest) return null;

    const benchmarks = getBenchmarks(data.sicCode);
    const ratios: CreditRatio[] = [];
    const riskFlags: RiskFlag[] = [];

    // Calculate Credit Ratios
    const { revenue, netIncome, totalAssets, totalLiabilities, currentAssets, currentLiabilities, longTermDebt, cashAndEquivalents } = latest.data;
    
    // Shareholders' equity approximation
    const equity = totalAssets && totalLiabilities ? totalAssets - totalLiabilities : null;
    
    // Current Ratio
    const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : null;
    ratios.push({
      name: 'Current Ratio',
      value: currentRatio,
      benchmark: benchmarks.currentRatio,
      status: calculateRatioStatus(currentRatio, benchmarks.currentRatio, true, { good: 0.9, warning: 0.6 }),
      description: 'Measures short-term liquidity',
      formula: 'Current Assets / Current Liabilities',
    });

    // Debt-to-Equity Ratio
    const debtToEquity = longTermDebt && equity && equity > 0 ? longTermDebt / equity : null;
    ratios.push({
      name: 'Debt-to-Equity',
      value: debtToEquity,
      benchmark: benchmarks.debtToEquity,
      status: calculateRatioStatus(debtToEquity, benchmarks.debtToEquity, false, { good: 1.0, warning: 1.5 }),
      description: 'Measures financial leverage',
      formula: 'Long-term Debt / Shareholders\' Equity',
    });

    // Net Profit Margin
    const netMargin = revenue && netIncome ? netIncome / revenue : null;
    ratios.push({
      name: 'Net Profit Margin',
      value: netMargin,
      benchmark: benchmarks.netMargin,
      status: calculateRatioStatus(netMargin, benchmarks.netMargin, true, { good: 0.8, warning: 0.5 }),
      description: 'Measures profitability',
      formula: 'Net Income / Revenue',
    });

    // Return on Assets (ROA)
    const roa = totalAssets && netIncome ? netIncome / totalAssets : null;
    ratios.push({
      name: 'Return on Assets',
      value: roa,
      benchmark: 0.05,
      status: calculateRatioStatus(roa, 0.05, true, { good: 1.0, warning: 0.6 }),
      description: 'Measures asset efficiency',
      formula: 'Net Income / Total Assets',
    });

    // Return on Equity (ROE)
    const roe = equity && netIncome && equity > 0 ? netIncome / equity : null;
    ratios.push({
      name: 'Return on Equity',
      value: roe,
      benchmark: 0.15,
      status: calculateRatioStatus(roe, 0.15, true, { good: 0.9, warning: 0.5 }),
      description: 'Measures return to shareholders',
      formula: 'Net Income / Shareholders\' Equity',
    });

    // Quick Ratio (Acid Test)
    const quickRatio = currentAssets && currentLiabilities && cashAndEquivalents
      ? (cashAndEquivalents + (currentAssets - cashAndEquivalents) * 0.5) / currentLiabilities
      : null;
    ratios.push({
      name: 'Quick Ratio',
      value: quickRatio,
      benchmark: 1.0,
      status: calculateRatioStatus(quickRatio, 1.0, true, { good: 0.9, warning: 0.6 }),
      description: 'Measures immediate liquidity',
      formula: '(Cash + Receivables) / Current Liabilities',
    });

    // Generate Risk Flags
    
    // Liquidity risks
    if (currentRatio !== null && currentRatio < 1.0) {
      riskFlags.push({
        id: 'low-current-ratio',
        severity: currentRatio < 0.5 ? 'critical' : 'high',
        category: 'Liquidity',
        title: 'Low Current Ratio',
        description: `Current ratio of ${currentRatio.toFixed(2)} indicates potential difficulty meeting short-term obligations.`,
        impact: 'May struggle to pay suppliers and creditors on time.',
      });
    }

    // Leverage risks
    if (debtToEquity !== null && debtToEquity > benchmarks.debtToEquity * 1.5) {
      riskFlags.push({
        id: 'high-leverage',
        severity: debtToEquity > benchmarks.debtToEquity * 2.5 ? 'critical' : 'high',
        category: 'Leverage',
        title: 'High Debt Levels',
        description: `Debt-to-equity of ${debtToEquity.toFixed(2)} exceeds industry benchmark of ${benchmarks.debtToEquity.toFixed(2)}.`,
        impact: 'Increased interest expense burden and reduced financial flexibility.',
      });
    }

    // Profitability risks
    if (netMargin !== null && netMargin < 0) {
      riskFlags.push({
        id: 'negative-margin',
        severity: 'critical',
        category: 'Profitability',
        title: 'Negative Profit Margin',
        description: `Net margin of ${(netMargin * 100).toFixed(1)}% indicates operating losses.`,
        impact: 'Company is burning cash and may require additional financing.',
      });
    } else if (netMargin !== null && netMargin < benchmarks.netMargin * 0.5) {
      riskFlags.push({
        id: 'low-margin',
        severity: 'medium',
        category: 'Profitability',
        title: 'Below-Average Profit Margin',
        description: `Net margin of ${(netMargin * 100).toFixed(1)}% is significantly below industry benchmark.`,
        impact: 'Limited ability to reinvest in growth or weather economic downturns.',
      });
    }

    // Revenue trend risks
    if (previous && revenue && previous.data.revenue) {
      const revenueGrowth = (revenue - previous.data.revenue) / previous.data.revenue;
      if (revenueGrowth < -0.1) {
        riskFlags.push({
          id: 'revenue-decline',
          severity: revenueGrowth < -0.2 ? 'critical' : 'high',
          category: 'Growth',
          title: 'Declining Revenue',
          description: `Revenue declined ${(Math.abs(revenueGrowth) * 100).toFixed(1)}% year-over-year.`,
          impact: 'May indicate loss of market share or weakening demand.',
        });
      }
    }

    // Cash position risk
    if (cashAndEquivalents && totalAssets) {
      const cashRatio = cashAndEquivalents / totalAssets;
      if (cashRatio < 0.02) {
        riskFlags.push({
          id: 'low-cash',
          severity: 'high',
          category: 'Liquidity',
          title: 'Low Cash Reserves',
          description: `Cash represents only ${(cashRatio * 100).toFixed(1)}% of total assets.`,
          impact: 'Limited buffer for unexpected expenses or opportunities.',
        });
      }
    }

    // Data quality flag
    if (!revenue || !totalAssets || !totalLiabilities) {
      riskFlags.push({
        id: 'incomplete-data',
        severity: 'medium',
        category: 'Data Quality',
        title: 'Incomplete Financial Data',
        description: 'Some key financial metrics are missing from SEC filings.',
        impact: 'Limited ability to perform comprehensive credit analysis.',
      });
    }

    // Peer Comparisons
    const peerComparisons: PeerComparison[] = [
      {
        metric: 'Current Ratio',
        company: currentRatio,
        peerAverage: benchmarks.currentRatio,
        percentile: currentRatio ? Math.min(99, Math.max(1, (currentRatio / benchmarks.currentRatio) * 50)) : null,
        status: currentRatio && currentRatio >= benchmarks.currentRatio ? 'above' : currentRatio ? 'below' : 'at',
      },
      {
        metric: 'Debt-to-Equity',
        company: debtToEquity,
        peerAverage: benchmarks.debtToEquity,
        percentile: debtToEquity !== null ? Math.min(99, Math.max(1, 100 - (debtToEquity / benchmarks.debtToEquity) * 50)) : null,
        status: debtToEquity !== null && debtToEquity <= benchmarks.debtToEquity ? 'above' : debtToEquity !== null ? 'below' : 'at',
      },
      {
        metric: 'Net Margin',
        company: netMargin,
        peerAverage: benchmarks.netMargin,
        percentile: netMargin ? Math.min(99, Math.max(1, (netMargin / benchmarks.netMargin) * 50)) : null,
        status: netMargin && netMargin >= benchmarks.netMargin ? 'above' : netMargin ? 'below' : 'at',
      },
      {
        metric: 'Return on Assets',
        company: roa,
        peerAverage: 0.05,
        percentile: roa ? Math.min(99, Math.max(1, (roa / 0.05) * 50)) : null,
        status: roa && roa >= 0.05 ? 'above' : roa ? 'below' : 'at',
      },
    ];

    // Calculate Overall Score
    const ratioScores = ratios.map(r => {
      if (r.status === 'good') return 100;
      if (r.status === 'warning') return 60;
      return 20;
    });
    
    const riskPenalties = riskFlags.reduce((acc, flag) => {
      if (flag.severity === 'critical') return acc + 15;
      if (flag.severity === 'high') return acc + 10;
      if (flag.severity === 'medium') return acc + 5;
      return acc + 2;
    }, 0);

    const averageRatioScore = ratioScores.reduce((a, b) => a + b, 0) / ratioScores.length;
    const overallScore = Math.max(0, Math.min(100, averageRatioScore - riskPenalties));

    let scoreCategory: CreditAnalysis['scoreCategory'];
    if (overallScore >= 80) scoreCategory = 'excellent';
    else if (overallScore >= 65) scoreCategory = 'good';
    else if (overallScore >= 50) scoreCategory = 'fair';
    else if (overallScore >= 35) scoreCategory = 'poor';
    else scoreCategory = 'critical';

    return {
      overallScore,
      scoreCategory,
      ratios,
      riskFlags,
      peerComparisons,
    };
  }, [data]);
}
