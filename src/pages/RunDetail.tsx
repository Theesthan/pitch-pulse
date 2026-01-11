import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Database, 
  CheckCircle, 
  FileText, 
  CreditCard, 
  History,
  RefreshCw,
  Save
} from 'lucide-react';
import { DataTab } from '@/components/run/DataTab';
import { ValidationTab } from '@/components/run/ValidationTab';
import { PitchbookTab } from '@/components/run/PitchbookTab';
import { CreditMemoTab } from '@/components/run/CreditMemoTab';
import { VersionsTab } from '@/components/run/VersionsTab';
import { ApprovalPanel } from '@/components/run/ApprovalPanel';
import { useSECData, useFetchSECData } from '@/hooks/useSECData';
import { useValidation } from '@/hooks/useValidation';
import { useSaveVersion, useVersions, useLatestVersion, PitchbookContent, CreditMemoContent } from '@/hooks/useVersions';
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: run, isLoading, error } = useQuery({
    queryKey: ['run', id],
    queryFn: async () => {
      if (!id) throw new Error('No run ID provided');
      const { data, error } = await supabase
        .from('runs')
        .select(`*, companies (*)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: secData, isLoading: isLoadingSEC } = useSECData(id);
  const fetchSECData = useFetchSECData();
  const { validationResult, addOverride, removeOverride } = useValidation(secData?.data);
  const saveVersion = useSaveVersion();
  const { data: versions } = useVersions(id);
  const { data: latestVersion } = useLatestVersion(id);
  
  const [pitchbookContent, setPitchbookContent] = useState<PitchbookContent | null>(null);
  const [creditMemoContent, setCreditMemoContent] = useState<CreditMemoContent | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load content from latest version
  useEffect(() => {
    if (latestVersion) {
      if (latestVersion.pitchbook_content && !pitchbookContent) {
        setPitchbookContent(latestVersion.pitchbook_content);
      }
      if (latestVersion.credit_memo_content && !creditMemoContent) {
        setCreditMemoContent(latestVersion.credit_memo_content);
      }
    }
  }, [latestVersion]);

  const handlePitchbookChange = useCallback((content: PitchbookContent | null) => {
    setPitchbookContent(content);
    setHasUnsavedChanges(true);
  }, []);

  const handleCreditMemoChange = useCallback((content: CreditMemoContent | null) => {
    setCreditMemoContent(content);
    setHasUnsavedChanges(true);
  }, []);

  const handleSaveVersion = useCallback(() => {
    if (!id) return;
    
    // Build KPIs from financial data
    const kpis: Record<string, number | string | null> = {};
    if (secData?.data?.fiscalYears?.length) {
      const latestYear = secData.data.fiscalYears[secData.data.fiscalYears.length - 1];
      if (latestYear.revenue) kpis['revenue'] = latestYear.revenue;
      if (latestYear.netIncome) kpis['netIncome'] = latestYear.netIncome;
      if (latestYear.ebitda) kpis['ebitda'] = latestYear.ebitda;
      if (latestYear.totalAssets) kpis['totalAssets'] = latestYear.totalAssets;
    }

    saveVersion.mutate({
      runId: id,
      kpis: Object.keys(kpis).length > 0 ? kpis : null,
      pitchbookContent,
      creditMemoContent,
    }, {
      onSuccess: () => setHasUnsavedChanges(false),
    });
  }, [id, secData, pitchbookContent, creditMemoContent, saveVersion]);

  const handleFetchData = (forceRefresh = false) => {
    if (!id || !run?.companies?.ticker) return;
    fetchSECData.mutate({
      runId: id,
      ticker: run.companies.ticker,
      fiscalYearStart: run.fiscal_year_start,
      fiscalYearEnd: run.fiscal_year_end,
      forceRefresh,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive">Failed to load run</p>
        <Button variant="link" onClick={() => navigate('/runs')}>Back to Runs</Button>
      </div>
    );
  }

  const statusStyles: Record<string, string> = {
    draft: 'status-draft',
    pending_review: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  const canEdit = run.status === 'draft';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/runs')} className="mb-4 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Runs
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">{run.name}</h1>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyles[run.status]}`}>
              {statusLabels[run.status]}
            </span>
            {hasUnsavedChanges && (
              <span className="text-sm text-yellow-500">• Unsaved changes</span>
            )}
          </div>
          <p className="mt-1 text-muted-foreground">
            <span className="font-mono">{run.companies?.ticker}</span> • {run.companies?.name} • 
            FY{run.fiscal_year_start} - FY{run.fiscal_year_end}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleFetchData(true)} disabled={fetchSECData.isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${fetchSECData.isPending ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          {canEdit && (
            <Button 
              size="sm" 
              onClick={handleSaveVersion}
              disabled={saveVersion.isPending || (!hasUnsavedChanges && !!versions?.length)}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveVersion.isPending ? 'Saving...' : 'Save Version'}
            </Button>
          )}
        </div>
      </div>

      {/* Approval Panel */}
      <ApprovalPanel run={run} hasVersions={!!versions?.length} />

      <Tabs defaultValue="data" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="data" className="flex items-center gap-2"><Database className="h-4 w-4" /><span className="hidden sm:inline">Data</span></TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /><span className="hidden sm:inline">Validation</span></TabsTrigger>
          <TabsTrigger value="pitchbook" className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Pitchbook</span></TabsTrigger>
          <TabsTrigger value="credit-memo" className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Credit Memo</span></TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-2"><History className="h-4 w-4" /><span className="hidden sm:inline">Versions</span></TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <DataTab data={secData} isLoading={isLoadingSEC} isFetching={fetchSECData.isPending} onFetchData={handleFetchData} />
        </TabsContent>

        <TabsContent value="validation">
          <ValidationTab validationResult={validationResult} onAddOverride={addOverride} onRemoveOverride={removeOverride} hasData={!!secData} />
        </TabsContent>

        <TabsContent value="pitchbook">
          <PitchbookTab
            data={secData?.data ?? null}
            company={run.companies}
            pitchbookContent={pitchbookContent}
            onContentChange={handlePitchbookChange}
            readOnly={!canEdit}
          />
        </TabsContent>

        <TabsContent value="credit-memo">
          <CreditMemoTab 
            data={secData?.data ?? null} 
            isLoading={isLoadingSEC}
            creditMemoContent={creditMemoContent}
            onContentChange={handleCreditMemoChange}
            readOnly={!canEdit}
          />
        </TabsContent>

        <TabsContent value="versions">
          <VersionsTab runId={id!} runStatus={run.status} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
