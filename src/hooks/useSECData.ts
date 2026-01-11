import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SECDataResponse, NormalizedFinancials } from '@/types/financials';
import { toast } from 'sonner';

interface FetchSECDataParams {
  runId: string;
  ticker: string;
  fiscalYearStart: number;
  fiscalYearEnd: number;
  forceRefresh?: boolean;
}

export function useSECData(runId: string | undefined) {
  return useQuery({
    queryKey: ['sec-data', runId],
    queryFn: async (): Promise<SECDataResponse | null> => {
      if (!runId) return null;

      // Check if we have cached data
      const { data: cached, error } = await supabase
        .from('run_data_cache')
        .select('*')
        .eq('run_id', runId)
        .eq('data_type', 'sec_financials')
        .maybeSingle();

      if (error) throw error;

      if (cached) {
        return {
          data: cached.raw_data as unknown as NormalizedFinancials,
          source: 'cache',
          fetchedAt: cached.fetched_at,
        };
      }

      return null;
    },
    enabled: !!runId,
  });
}

export function useFetchSECData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchSECDataParams): Promise<SECDataResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-sec-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SEC data');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sec-data', variables.runId] });
      toast.success(
        data.source === 'cache' 
          ? 'Loaded cached SEC data' 
          : 'Successfully fetched SEC data'
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to fetch SEC data');
    },
  });
}
