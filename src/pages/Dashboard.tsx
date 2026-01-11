import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckSquare, TrendingUp, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { profile, role } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [runsResult, pendingResult] = await Promise.all([
        supabase.from('runs').select('id, status', { count: 'exact' }),
        supabase.from('runs').select('id', { count: 'exact' }).eq('status', 'pending_review'),
      ]);

      return {
        totalRuns: runsResult.count || 0,
        pendingReviews: pendingResult.count || 0,
        drafts: runsResult.data?.filter(r => r.status === 'draft').length || 0,
        approved: runsResult.data?.filter(r => r.status === 'approved').length || 0,
      };
    },
  });

  const statCards = [
    {
      title: 'Total Runs',
      value: stats?.totalRuns || 0,
      description: 'All analysis runs',
      icon: FileText,
      color: 'text-primary',
    },
    {
      title: 'Drafts',
      value: stats?.drafts || 0,
      description: 'In progress',
      icon: Clock,
      color: 'text-muted-foreground',
    },
    {
      title: 'Pending Review',
      value: stats?.pendingReviews || 0,
      description: 'Awaiting approval',
      icon: CheckSquare,
      color: 'text-warning',
    },
    {
      title: 'Approved',
      value: stats?.approved || 0,
      description: 'Ready to export',
      icon: TrendingUp,
      color: 'text-success',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Analyst'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's an overview of your financial analysis workspace
          </p>
        </div>
        <Button asChild className="glow-hover">
          <Link to="/runs/new">
            <Plus className="mr-2 h-4 w-4" />
            New Run
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/runs/new">
                <Plus className="mr-2 h-4 w-4" />
                Create New Analysis Run
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/runs">
                <FileText className="mr-2 h-4 w-4" />
                View All Runs
              </Link>
            </Button>
            {(role === 'reviewer' || role === 'admin') && (
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/approvals">
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Review Pending Approvals
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest analysis runs</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentRuns />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecentRuns() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['recent-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('runs')
        .select(`
          id,
          name,
          status,
          created_at,
          companies (ticker, name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!runs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No runs yet</p>
        <Button variant="link" size="sm" asChild className="mt-1">
          <Link to="/runs/new">Create your first run</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => (
        <Link
          key={run.id}
          to={`/runs/${run.id}`}
          className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
        >
          <div>
            <p className="font-medium">{run.name}</p>
            <p className="text-sm text-muted-foreground">
              {run.companies?.ticker} • {run.companies?.name}
            </p>
          </div>
          <StatusBadge status={run.status} />
        </Link>
      ))}
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
