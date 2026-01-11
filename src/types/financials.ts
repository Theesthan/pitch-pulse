// SEC Financial data types

export interface FiscalYearData {
  year: number;
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  stockholdersEquity: number | null;
  operatingCashFlow: number | null;
  ebitda: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  longTermDebt: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  cashAndEquivalents: number | null;
}

export interface MetricData {
  end: string;
  val: number;
  fy: number;
  form: string;
  filed: string;
}

export interface NormalizedFinancials {
  cik: string;
  entityName: string;
  ticker: string;
  sicCode: string | null;
  fiscalYears: FiscalYearData[];
  rawMetrics: Record<string, MetricData[]>;
}

export interface SECDataResponse {
  data: NormalizedFinancials;
  source: 'cache' | 'live';
  fetchedAt: string;
}

export interface ValidationCheck {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'warn' | 'fail' | 'pending';
  message?: string;
  overridden?: boolean;
  overriddenBy?: string;
  overriddenAt?: string;
  overrideReason?: string;
}

export interface ValidationResult {
  checks: ValidationCheck[];
  overallStatus: 'pass' | 'warn' | 'fail' | 'pending';
  lastValidatedAt: string | null;
}
