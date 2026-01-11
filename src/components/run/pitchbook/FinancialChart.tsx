import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FiscalYearData } from '@/types/financials';

interface FinancialChartProps {
  title: string;
  description?: string;
  data: FiscalYearData[];
  metrics: {
    key: keyof FiscalYearData;
    label: string;
    color: string;
  }[];
  chartType?: 'area' | 'bar' | 'line';
  stacked?: boolean;
  formatValue?: (value: number) => string;
}

const defaultFormat = (value: number) => {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label, formatValue }: any) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 shadow-xl">
      <p className="mb-2 font-medium text-foreground">FY {label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="h-2.5 w-2.5 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.value !== null ? formatValue(entry.value) : 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
};

export function FinancialChart({
  title,
  description,
  data,
  metrics,
  chartType = 'area',
  stacked = false,
  formatValue = defaultFormat,
}: FinancialChartProps) {
  const chartData = useMemo(() => {
    return data.map(fy => ({
      year: fy.year,
      ...metrics.reduce((acc, m) => {
        acc[m.label] = fy[m.key];
        return acc;
      }, {} as Record<string, any>),
    }));
  }, [data, metrics]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 10, left: 10, bottom: 0 },
    };

    const xAxisProps = {
      dataKey: 'year',
      stroke: 'hsl(var(--muted-foreground))',
      fontSize: 12,
      tickLine: false,
      axisLine: false,
      tickFormatter: (value: number) => `FY${value}`,
    };

    const yAxisProps = {
      stroke: 'hsl(var(--muted-foreground))',
      fontSize: 12,
      tickLine: false,
      axisLine: false,
      tickFormatter: formatValue,
      width: 60,
    };

    const gridProps = {
      strokeDasharray: '3 3',
      stroke: 'hsl(var(--border))',
      opacity: 0.3,
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid {...gridProps} vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
            {metrics.map((m, i) => (
              <Bar
                key={m.key as string}
                dataKey={m.label}
                fill={m.color}
                radius={[4, 4, 0, 0]}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
            {metrics.map((m, i) => (
              <Line
                key={m.key as string}
                type="monotone"
                dataKey={m.label}
                stroke={m.color}
                strokeWidth={2}
                dot={{ fill: m.color, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: m.color }}
              />
            ))}
          </LineChart>
        );
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              {metrics.map(m => (
                <linearGradient key={m.key as string} id={`gradient-${m.key as string}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...gridProps} vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
            <Legend 
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
            {metrics.map((m, i) => (
              <Area
                key={m.key as string}
                type="monotone"
                dataKey={m.label}
                stroke={m.color}
                strokeWidth={2}
                fill={`url(#gradient-${m.key as string})`}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </AreaChart>
        );
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
