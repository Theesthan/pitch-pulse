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
import { CheckSquare, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function Approvals() {
  const { data: pendingRuns, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('runs')
        .select(`
          id,
          name,
          created_at,
          companies (ticker, name)
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Approvals</h1>
        <p className="mt-1 text-muted-foreground">
          Review and approve submitted analysis runs
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Pending Review</CardTitle>
          <CardDescription>
            Runs awaiting your approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !pendingRuns?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">All caught up!</h3>
              <p className="mt-1 text-muted-foreground">
                No runs pending review at this time
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.name}</TableCell>
                    <TableCell>
                      <span className="font-mono">{run.companies?.ticker}</span>
                      <span className="ml-2 text-muted-foreground">{run.companies?.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      —
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(run.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/runs/${run.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Review
                        </Link>
                      </Button>
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
