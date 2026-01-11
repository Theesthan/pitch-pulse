import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Constants } from '@/integrations/supabase/types';

type RunStatus = typeof Constants.public.Enums.run_status[number];

interface SubmitForReviewParams {
  runId: string;
}

interface ReviewDecisionParams {
  runId: string;
  decision: 'approved' | 'rejected';
  notes: string;
}

export function useSubmitForReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ runId }: SubmitForReviewParams) => {
      if (!user) throw new Error('Not authenticated');

      // First lock the current version
      const { data: latestVersion } = await supabase
        .from('run_versions')
        .select('id')
        .eq('run_id', runId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestVersion) {
        await supabase
          .from('run_versions')
          .update({ is_locked: true })
          .eq('id', latestVersion.id);
      }

      // Update run status
      const { data, error } = await supabase
        .from('runs')
        .update({
          status: 'pending_review' as RunStatus,
        })
        .eq('id', runId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run', data.id] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Submitted for review');
    },
    onError: (error) => {
      console.error('Submit for review error:', error);
      toast.error('Failed to submit for review');
    },
  });
}

export function useReviewDecision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ runId, decision, notes }: ReviewDecisionParams) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('runs')
        .update({
          status: decision as RunStatus,
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq('id', runId)
        .select()
        .single();

      if (error) throw error;

      // Lock all versions on approval
      if (decision === 'approved') {
        await supabase
          .from('run_versions')
          .update({ is_locked: true })
          .eq('run_id', runId);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run', data.id] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success(data.status === 'approved' ? 'Run approved' : 'Run rejected');
    },
    onError: (error) => {
      console.error('Review decision error:', error);
      toast.error('Failed to submit review decision');
    },
  });
}

export function useResubmit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ runId }: { runId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('runs')
        .update({
          status: 'draft' as RunStatus,
          reviewer_id: null,
          reviewed_at: null,
          review_notes: null,
        })
        .eq('id', runId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['run', data.id] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toast.success('Run returned to draft');
    },
    onError: (error) => {
      console.error('Resubmit error:', error);
      toast.error('Failed to return to draft');
    },
  });
}
