import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, Printer, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PrintableDocument } from '@/components/export/PrintableDocument';
import { PitchbookPrintContent } from '@/components/export/PitchbookPrintContent';
import { CreditMemoPrintContent } from '@/components/export/CreditMemoPrintContent';
import { useExport } from '@/hooks/useExport';
import type { NormalizedFinancials } from '@/types/financials';

export default function Exports() {
  const { handlePrint } = useExport();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'pitchbook' | 'credit-memo'>('pitchbook');
  const [selectedRun, setSelectedRun] = useState<{
    run: {
      id: string;
      name: string;
      status: string;
      fiscal_year_start: number;
      fiscal_year_end: number;
      companies: { ticker: string; name: string; description?: string | null } | null;
    };
    data: NormalizedFinancials | null;
    content: Record<string, unknown> | null;
  } | null>(null);

  const { data: approvedRuns, isLoading } = useQuery({
    queryKey: ['approved-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('runs')
        .select(`
          id,
          name,
          status,
          reviewed_at,
          fiscal_year_start,
          fiscal_year_end,
          companies (ticker, name, description)
        `)
        .in('status', ['approved', 'draft', 'pending_review'])
        .order('reviewed_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data;
    },
  });

  const handlePreview = async (run: typeof approvedRuns extends (infer T)[] | null | undefined ? T : never, type: 'pitchbook' | 'credit-memo') => {
    // Fetch the run's data and latest version
    const [dataResult, versionResult] = await Promise.all([
      supabase
        .from('run_data_cache')
        .select('raw_data')
        .eq('run_id', run.id)
        .eq('data_type', 'sec_financials')
        .maybeSingle(),
      supabase
        .from('run_versions')
        .select('pitchbook_content, credit_memo_content')
        .eq('run_id', run.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const financialData = dataResult.data?.raw_data as unknown as NormalizedFinancials | null;
    const versionContent = type === 'pitchbook' 
      ? versionResult.data?.pitchbook_content 
      : versionResult.data?.credit_memo_content;

    setSelectedRun({
      run: {
        id: run.id,
        name: run.name,
        status: run.status,
        fiscal_year_start: run.fiscal_year_start,
        fiscal_year_end: run.fiscal_year_end,
        companies: run.companies,
      },
      data: financialData,
      content: versionContent as Record<string, unknown> | null,
    });
    setPreviewType(type);
    setPreviewOpen(true);
  };

  const handleExport = (type: 'pitchbook' | 'credit-memo') => {
    if (!selectedRun) return;
    const title = type === 'pitchbook' 
      ? `${selectedRun.run.name} - Pitchbook`
      : `${selectedRun.run.name} - Credit Memo`;
    
    handlePrint('export-preview-content', title);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Exports</h1>
        <p className="mt-1 text-muted-foreground">
          Download PDF exports of your analysis runs
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Available Exports</CardTitle>
          <CardDescription>
            Approved runs can be exported without watermark. Drafts will include a DRAFT watermark.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !approvedRuns?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Download className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No runs available</h3>
              <p className="mt-1 text-muted-foreground">
                Create and complete analysis runs to export them
              </p>
              <Button asChild className="mt-4">
                <Link to="/runs/new">Create Run</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.name}</TableCell>
                    <TableCell>
                      <span className="font-mono">{run.companies?.ticker}</span>
                      <span className="ml-2 text-muted-foreground">{run.companies?.name}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {run.reviewed_at 
                        ? format(new Date(run.reviewed_at), 'MMM d, yyyy')
                        : '—'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(run, 'pitchbook')}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Pitchbook
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handlePreview(run, 'credit-memo')}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Credit Memo
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>
                {previewType === 'pitchbook' ? 'Pitchbook Preview' : 'Credit Memo Preview'}
                {selectedRun?.run.status !== 'approved' && (
                  <span className="ml-2 text-sm font-normal text-yellow-500">
                    (Draft - will include watermark)
                  </span>
                )}
              </span>
              <Button onClick={() => handleExport(previewType)} className="ml-4">
                <Printer className="mr-2 h-4 w-4" />
                Print / Save PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {selectedRun && (
              <div id="export-preview-content">
                <PrintableDocument
                  type={previewType}
                  run={selectedRun.run}
                  content={selectedRun.content}
                >
                  {previewType === 'pitchbook' ? (
                    <PitchbookPrintContent
                      data={selectedRun.data}
                      content={selectedRun.content as { companyOverview?: string; investmentHighlights?: string; industryLandscape?: string; keyRisks?: string } | null}
                      company={selectedRun.run.companies}
                    />
                  ) : (
                    <CreditMemoPrintContent
                      data={selectedRun.data}
                      content={selectedRun.content as { summary?: string; creditScore?: number; creditCategory?: string; ratios?: Array<{ name: string; value: number; benchmark: number; status: string }>; riskFlags?: Array<{ severity: string; category: string; description: string }> } | null}
                    />
                  )}
                </PrintableDocument>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    draft: 'status-draft',
    pending_review: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] || 'status-draft'}`}>
      {statusLabels[status] || status}
    </span>
  );
}
