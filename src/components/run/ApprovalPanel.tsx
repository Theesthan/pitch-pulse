import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Clock,
  User,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { useSubmitForReview, useReviewDecision, useResubmit } from '@/hooks/useApprovalWorkflow';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Run {
  id: string;
  status: string;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_by: string;
}

interface ApprovalPanelProps {
  run: Run;
  hasVersions: boolean;
}

export function ApprovalPanel({ run, hasVersions }: ApprovalPanelProps) {
  const { role, user } = useAuth();
  const submitForReview = useSubmitForReview();
  const reviewDecision = useReviewDecision();
  const resubmit = useResubmit();
  
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');

  const canReview = role === 'admin' || role === 'reviewer';
  const isOwner = user?.id === run.created_by;

  const handleSubmitForReview = () => {
    submitForReview.mutate({ runId: run.id });
  };

  const handleReviewDecision = () => {
    reviewDecision.mutate({
      runId: run.id,
      decision: reviewAction,
      notes: reviewNotes,
    });
    setReviewDialogOpen(false);
    setReviewNotes('');
  };

  const handleResubmit = () => {
    resubmit.mutate({ runId: run.id });
  };

  const openReviewDialog = (action: 'approved' | 'rejected') => {
    setReviewAction(action);
    setReviewDialogOpen(true);
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Approval Workflow</CardTitle>
          <StatusBadge status={run.status} />
        </div>
        <CardDescription>
          {getStatusDescription(run.status, canReview, isOwner)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Review Notes Display */}
        {run.review_notes && (
          <div className="mb-4 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Review Notes
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{run.review_notes}</p>
            {run.reviewed_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Reviewed on {format(new Date(run.reviewed_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Draft - Submit for Review */}
          {run.status === 'draft' && isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!hasVersions || submitForReview.isPending}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit for Review
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit for Review?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will lock the current version and send it for reviewer approval. 
                    You won't be able to make changes until the review is complete.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitForReview}>
                    Submit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Pending Review - Approve/Reject (Reviewers only) */}
          {run.status === 'pending_review' && canReview && (
            <>
              <Button 
                variant="default" 
                onClick={() => openReviewDialog('approved')}
                disabled={reviewDecision.isPending}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => openReviewDialog('rejected')}
                disabled={reviewDecision.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}

          {/* Rejected - Return to Draft (Owner only) */}
          {run.status === 'rejected' && isOwner && (
            <Button variant="outline" onClick={handleResubmit} disabled={resubmit.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Return to Draft
            </Button>
          )}
        </div>

        {/* Info messages */}
        {run.status === 'draft' && !hasVersions && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Save a version before submitting for review
          </div>
        )}

        {run.status === 'pending_review' && !canReview && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Waiting for reviewer approval
          </div>
        )}

        {run.status === 'approved' && (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            This run has been approved and is ready for export
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewAction === 'approved' ? 'Approve Run' : 'Reject Run'}
              </DialogTitle>
              <DialogDescription>
                {reviewAction === 'approved' 
                  ? 'Provide approval notes (optional). This will lock all versions.'
                  : 'Please provide a reason for rejection (required for audit trail).'}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder={reviewAction === 'approved' ? 'Approval notes...' : 'Reason for rejection...'}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant={reviewAction === 'approved' ? 'default' : 'destructive'}
                onClick={handleReviewDecision}
                disabled={reviewAction === 'rejected' && !reviewNotes.trim()}
              >
                {reviewAction === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    pending_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const labels: Record<string, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  const icons: Record<string, React.ReactNode> = {
    draft: null,
    pending_review: <Clock className="mr-1 h-3 w-3" />,
    approved: <CheckCircle className="mr-1 h-3 w-3" />,
    rejected: <XCircle className="mr-1 h-3 w-3" />,
  };

  return (
    <Badge className={styles[status] || styles.draft}>
      {icons[status]}
      {labels[status] || status}
    </Badge>
  );
}

function getStatusDescription(status: string, canReview: boolean, isOwner: boolean): string {
  switch (status) {
    case 'draft':
      return isOwner 
        ? 'Make changes and submit for review when ready'
        : 'This run is being prepared by the analyst';
    case 'pending_review':
      return canReview
        ? 'Review the analysis and approve or reject'
        : 'Awaiting reviewer approval';
    case 'approved':
      return 'This run has been approved and locked';
    case 'rejected':
      return isOwner
        ? 'Address the feedback and resubmit for review'
        : 'This run was rejected by a reviewer';
    default:
      return '';
  }
}
