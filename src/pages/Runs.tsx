import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, FileText, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

type RunStatus = 'all' | 'draft' | 'pending_review' | 'approved' | 'rejected';

export default function Runs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RunStatus>('all');

  const { data: runs, isLoading, error } = useQuery({
    queryKey: ['runs', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('runs')
        .select(`
          id,
          name,
          status,
          fiscal_year_start,
          fiscal_year_end,
          created_at,
          updated_at,
          companies (id, ticker, name)
        `)
        .order('updated_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,companies.ticker.ilike.%${search}%,companies.name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Runs</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your financial analysis runs
          </p>
        </div>
        <Button asChild className="glow-hover">
          <Link to="/runs/new">
            <Plus className="mr-2 h-4 w-4" />
            New Run
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ticker, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RunStatus)}>
              <SelectTrigger className="w-full bg-background sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Runs Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Analysis Runs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-destructive">Failed to load runs</p>
              <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            </div>
          ) : !runs?.length ? (
            <EmptyState search={search} statusFilter={statusFilter} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Fiscal Years</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link 
                        to={`/runs/${run.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {run.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-mono text-sm">{run.companies?.ticker}</span>
                        <span className="ml-2 text-muted-foreground">
                          {run.companies?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {run.fiscal_year_start} - {run.fiscal_year_end}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(run.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ search, statusFilter }: { search: string; statusFilter: RunStatus }) {
  if (search || statusFilter !== 'all') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No matching runs found</h3>
        <p className="mt-1 text-muted-foreground">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">No runs yet</h3>
      <p className="mt-1 text-muted-foreground">
        Get started by creating your first analysis run
      </p>
      <Button asChild className="mt-4">
        <Link to="/runs/new">
          <Plus className="mr-2 h-4 w-4" />
          Create Run
        </Link>
      </Button>
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
