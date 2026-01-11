import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface PitchbookContent {
  companyOverview: string;
  industryLandscape: string;
  keyRisks: string;
  investmentHighlights: string;
}

export interface CreditMemoContent {
  summary: string;
  riskAssessment: string;
  recommendation: string;
}

export interface RunVersion {
  id: string;
  run_id: string;
  version_number: number;
  kpis: Record<string, number | string | null> | null;
  pitchbook_content: PitchbookContent | null;
  credit_memo_content: CreditMemoContent | null;
  created_at: string;
  created_by: string;
  is_locked: boolean;
  creator_profile?: {
    full_name: string | null;
    email: string;
  };
}

// Helper to transform database row to RunVersion
function transformToRunVersion(row: {
  id: string;
  run_id: string;
  version_number: number;
  kpis: Json | null;
  pitchbook_content: Json | null;
  credit_memo_content: Json | null;
  created_at: string;
  created_by: string;
  is_locked: boolean;
  creator_profile?: { full_name: string | null; email: string } | null;
}): RunVersion {
  return {
    id: row.id,
    run_id: row.run_id,
    version_number: row.version_number,
    kpis: row.kpis as unknown as Record<string, number | string | null> | null,
    pitchbook_content: row.pitchbook_content as unknown as PitchbookContent | null,
    credit_memo_content: row.credit_memo_content as unknown as CreditMemoContent | null,
    created_at: row.created_at,
    created_by: row.created_by,
    is_locked: row.is_locked,
    creator_profile: row.creator_profile ?? undefined,
  };
}

export function useVersions(runId: string | undefined) {
  return useQuery({
    queryKey: ['run-versions', runId],
    queryFn: async (): Promise<RunVersion[]> => {
      if (!runId) throw new Error('No run ID');
      
      // Fetch without join for simplicity
      const { data, error } = await supabase
        .from('run_versions')
        .select('*')
        .eq('run_id', runId)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(row => transformToRunVersion(row));
    },
    enabled: !!runId,
  });
}

export function useLatestVersion(runId: string | undefined) {
  return useQuery({
    queryKey: ['latest-version', runId],
    queryFn: async (): Promise<RunVersion | null> => {
      if (!runId) return null;
      
      const { data, error } = await supabase
        .from('run_versions')
        .select('*')
        .eq('run_id', runId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data ? transformToRunVersion(data) : null;
    },
    enabled: !!runId,
  });
}

interface SaveVersionParams {
  runId: string;
  kpis: Record<string, number | string | null> | null;
  pitchbookContent: RunVersion['pitchbook_content'];
  creditMemoContent: RunVersion['credit_memo_content'];
}

export function useSaveVersion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ runId, kpis, pitchbookContent, creditMemoContent }: SaveVersionParams) => {
      if (!user) throw new Error('Not authenticated');

      // Get the latest version number
      const { data: latestVersion } = await supabase
        .from('run_versions')
        .select('version_number')
        .eq('run_id', runId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newVersionNumber = (latestVersion?.version_number || 0) + 1;

      const { data, error } = await supabase
        .from('run_versions')
        .insert([{
          run_id: runId,
          version_number: newVersionNumber,
          kpis: kpis as Json,
          pitchbook_content: pitchbookContent as unknown as Json,
          credit_memo_content: creditMemoContent as unknown as Json,
          created_by: user.id,
          is_locked: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return transformToRunVersion(data);
    },
    onSuccess: (_, { runId }) => {
      queryClient.invalidateQueries({ queryKey: ['run-versions', runId] });
      queryClient.invalidateQueries({ queryKey: ['latest-version', runId] });
      toast.success('Version saved successfully');
    },
    onError: (error) => {
      console.error('Save version error:', error);
      toast.error('Failed to save version');
    },
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ version }: { version: RunVersion }) => {
      if (!user) throw new Error('Not authenticated');

      // Get the latest version number
      const { data: latestVersion } = await supabase
        .from('run_versions')
        .select('version_number')
        .eq('run_id', version.run_id)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newVersionNumber = (latestVersion?.version_number || 0) + 1;

      // Create a new version with the restored content
      const { data, error } = await supabase
        .from('run_versions')
        .insert([{
          run_id: version.run_id,
          version_number: newVersionNumber,
          kpis: version.kpis as Json,
          pitchbook_content: version.pitchbook_content as unknown as Json,
          credit_memo_content: version.credit_memo_content as unknown as Json,
          created_by: user.id,
          is_locked: false,
        }])
        .select()
        .single();

      if (error) throw error;
      return transformToRunVersion(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run-versions', data.run_id] });
      queryClient.invalidateQueries({ queryKey: ['latest-version', data.run_id] });
      toast.success(`Restored to version ${data.version_number}`);
    },
    onError: (error) => {
      console.error('Restore version error:', error);
      toast.error('Failed to restore version');
    },
  });
}
