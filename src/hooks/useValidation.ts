import { useMemo, useState, useCallback } from 'react';
import { NormalizedFinancials, ValidationCheck, ValidationResult } from '@/types/financials';

// Validation rules configuration
const VALIDATION_RULES = [
  {
    id: 'has_revenue',
    name: 'Revenue Data Available',
    description: 'At least one fiscal year has revenue data',
    check: (data: NormalizedFinancials) => {
      const hasRevenue = data.fiscalYears.some(fy => fy.revenue !== null);
      return {
        status: hasRevenue ? 'pass' : 'fail',
        message: hasRevenue 
          ? `Revenue found for ${data.fiscalYears.filter(fy => fy.revenue !== null).length} fiscal years`
          : 'No revenue data found in SEC filings',
      } as const;
    },
  },
  {
    id: 'has_net_income',
    name: 'Net Income Data Available',
    description: 'At least one fiscal year has net income data',
    check: (data: NormalizedFinancials) => {
      const hasData = data.fiscalYears.some(fy => fy.netIncome !== null);
      return {
        status: hasData ? 'pass' : 'warn',
        message: hasData 
          ? `Net income found for ${data.fiscalYears.filter(fy => fy.netIncome !== null).length} fiscal years`
          : 'No net income data found - some metrics may be unavailable',
      } as const;
    },
  },
  {
    id: 'has_balance_sheet',
    name: 'Balance Sheet Data Available',
    description: 'Total assets and liabilities data present',
    check: (data: NormalizedFinancials) => {
      const hasAssets = data.fiscalYears.some(fy => fy.totalAssets !== null);
      const hasLiabilities = data.fiscalYears.some(fy => fy.totalLiabilities !== null);
      
      if (hasAssets && hasLiabilities) {
        return { status: 'pass', message: 'Balance sheet data complete' } as const;
      } else if (hasAssets || hasLiabilities) {
        return { status: 'warn', message: 'Partial balance sheet data available' } as const;
      }
      return { status: 'fail', message: 'No balance sheet data found' } as const;
    },
  },
  {
    id: 'has_cash_flow',
    name: 'Cash Flow Data Available',
    description: 'Operating cash flow data present',
    check: (data: NormalizedFinancials) => {
      const hasData = data.fiscalYears.some(fy => fy.operatingCashFlow !== null);
      return {
        status: hasData ? 'pass' : 'warn',
        message: hasData 
          ? 'Cash flow statement data available'
          : 'No cash flow data found - liquidity metrics may be incomplete',
      } as const;
    },
  },
  {
    id: 'data_completeness',
    name: 'Data Completeness Check',
    description: 'All requested fiscal years have data',
    check: (data: NormalizedFinancials) => {
      const yearsWithData = data.fiscalYears.filter(fy => 
        fy.revenue !== null || fy.netIncome !== null || fy.totalAssets !== null
      ).length;
      const totalYears = data.fiscalYears.length;
      const completeness = totalYears > 0 ? (yearsWithData / totalYears) * 100 : 0;
      
      if (completeness >= 80) {
        return { status: 'pass', message: `${completeness.toFixed(0)}% data completeness` } as const;
      } else if (completeness >= 50) {
        return { status: 'warn', message: `${completeness.toFixed(0)}% data completeness - some years missing` } as const;
      }
      return { status: 'fail', message: `Only ${completeness.toFixed(0)}% data completeness` } as const;
    },
  },
  {
    id: 'has_sic_code',
    name: 'Industry Classification',
    description: 'SIC code available for peer comparison',
    check: (data: NormalizedFinancials) => {
      return {
        status: data.sicCode ? 'pass' : 'warn',
        message: data.sicCode 
          ? `SIC Code: ${data.sicCode}`
          : 'No SIC code found - peer benchmarking may be limited',
      } as const;
    },
  },
  {
    id: 'no_negative_assets',
    name: 'Asset Data Quality',
    description: 'No negative asset values detected',
    check: (data: NormalizedFinancials) => {
      const hasNegative = data.fiscalYears.some(fy => 
        (fy.totalAssets !== null && fy.totalAssets < 0) ||
        (fy.currentAssets !== null && fy.currentAssets < 0)
      );
      return {
        status: hasNegative ? 'fail' : 'pass',
        message: hasNegative 
          ? 'Negative asset values detected - data quality issue'
          : 'Asset values are valid',
      } as const;
    },
  },
  {
    id: 'revenue_trend',
    name: 'Revenue Trend Analysis',
    description: 'Check for significant revenue volatility',
    check: (data: NormalizedFinancials) => {
      const revenueYears = data.fiscalYears
        .filter(fy => fy.revenue !== null)
        .sort((a, b) => a.year - b.year);
      
      if (revenueYears.length < 2) {
        return { status: 'warn', message: 'Insufficient data for trend analysis' } as const;
      }

      // Check for extreme YoY changes (>50%)
      let hasExtremeChange = false;
      for (let i = 1; i < revenueYears.length; i++) {
        const prev = revenueYears[i - 1].revenue!;
        const curr = revenueYears[i].revenue!;
        const change = Math.abs((curr - prev) / prev);
        if (change > 0.5) {
          hasExtremeChange = true;
          break;
        }
      }

      return {
        status: hasExtremeChange ? 'warn' : 'pass',
        message: hasExtremeChange 
          ? 'Significant revenue volatility detected (>50% YoY change)'
          : 'Revenue trend is stable',
      } as const;
    },
  },
];

interface Override {
  checkId: string;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
}

export function useValidation(data: NormalizedFinancials | null | undefined) {
  const [overrides, setOverrides] = useState<Map<string, Override>>(new Map());

  const validationResult = useMemo((): ValidationResult => {
    if (!data) {
      return {
        checks: VALIDATION_RULES.map(rule => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          status: 'pending' as const,
        })),
        overallStatus: 'pending',
        lastValidatedAt: null,
      };
    }

    const checks: ValidationCheck[] = VALIDATION_RULES.map(rule => {
      const result = rule.check(data);
      const override = overrides.get(rule.id);

      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        status: override ? 'pass' : result.status,
        message: result.message,
        overridden: !!override,
        overriddenBy: override?.overriddenBy,
        overriddenAt: override?.overriddenAt,
        overrideReason: override?.reason,
      };
    });

    // Calculate overall status
    const hasFailure = checks.some(c => c.status === 'fail');
    const hasWarning = checks.some(c => c.status === 'warn');
    const overallStatus = hasFailure ? 'fail' : hasWarning ? 'warn' : 'pass';

    return {
      checks,
      overallStatus,
      lastValidatedAt: new Date().toISOString(),
    };
  }, [data, overrides]);

  const addOverride = useCallback((checkId: string, reason: string, userId: string) => {
    setOverrides(prev => {
      const next = new Map(prev);
      next.set(checkId, {
        checkId,
        reason,
        overriddenBy: userId,
        overriddenAt: new Date().toISOString(),
      });
      return next;
    });
  }, []);

  const removeOverride = useCallback((checkId: string) => {
    setOverrides(prev => {
      const next = new Map(prev);
      next.delete(checkId);
      return next;
    });
  }, []);

  return {
    validationResult,
    addOverride,
    removeOverride,
  };
}
