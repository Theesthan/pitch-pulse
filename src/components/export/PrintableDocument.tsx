import { forwardRef } from 'react';
import { format } from 'date-fns';

interface PrintableDocumentProps {
  type: 'pitchbook' | 'credit-memo';
  run: {
    name: string;
    status: string;
    companies: { ticker: string; name: string } | null;
    fiscal_year_start: number;
    fiscal_year_end: number;
  };
  content: Record<string, unknown> | null;
  children?: React.ReactNode;
}

export const PrintableDocument = forwardRef<HTMLDivElement, PrintableDocumentProps>(
  ({ type, run, content, children }, ref) => {
    const isApproved = run.status === 'approved';
    const documentTitle = type === 'pitchbook' ? 'Investment Pitchbook' : 'Credit Memorandum';

    return (
      <div ref={ref} className="print-document bg-white text-black p-8 min-h-screen">
        {/* Watermark for non-approved documents */}
        {!isApproved && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-10 print:fixed">
            <span className="text-[120px] font-bold text-gray-200 rotate-[-45deg] select-none opacity-50">
              DRAFT
            </span>
          </div>
        )}

        {/* Header */}
        <header className="border-b-2 border-gray-900 pb-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{documentTitle}</h1>
              <h2 className="text-xl text-gray-700 mt-1">{run.name}</h2>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="font-semibold">{run.companies?.name}</p>
              <p className="font-mono">{run.companies?.ticker}</p>
              <p className="mt-2">FY{run.fiscal_year_start} - FY{run.fiscal_year_end}</p>
              <p className="mt-1">{format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
          </div>
          {!isApproved && (
            <div className="mt-4 px-3 py-1 bg-yellow-100 border border-yellow-400 text-yellow-800 text-sm inline-block rounded">
              ⚠️ DRAFT - Not approved for distribution
            </div>
          )}
        </header>

        {/* Content */}
        <main className="space-y-8 relative z-20">
          {children}
        </main>

        {/* Footer with Sources */}
        <footer className="mt-12 pt-6 border-t border-gray-300 text-xs text-gray-500">
          <h4 className="font-semibold text-gray-700 mb-2">Data Sources</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Financial data sourced from SEC EDGAR filings</li>
            <li>Market data from public exchanges</li>
            <li>Industry benchmarks based on SIC code classification</li>
          </ul>
          <p className="mt-4 text-center text-gray-400">
            Generated on {format(new Date(), 'MMMM d, yyyy at h:mm a')} | Confidential
          </p>
        </footer>
      </div>
    );
  }
);

PrintableDocument.displayName = 'PrintableDocument';
