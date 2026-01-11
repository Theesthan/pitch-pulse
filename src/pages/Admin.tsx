import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Users, Save, Loader2, Activity, FileText, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { AppRole } from '@/lib/auth';

interface ActivityItem {
  id: string;
  type: 'run_created' | 'run_submitted' | 'run_approved' | 'run_rejected';
  runName: string;
  userName: string;
  timestamp: string;
}

export default function Admin() {
  const queryClient = useQueryClient();
  const [secContactEmail, setSecContactEmail] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      return profiles.map((profile) => ({
        ...profile,
        role: roles.find((r) => r.user_id === profile.user_id)?.role || 'analyst',
      }));
    },
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const { data: runs, error } = await supabase
        .from('runs')
        .select(`
          id,
          name,
          status,
          created_at,
          updated_at,
          reviewed_at
        `)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform runs into activity items
      const activities: ActivityItem[] = [];
      
      runs.forEach((run) => {
        const userName = 'User';
        
        // Add the most recent activity for each run
        if (run.status === 'approved' && run.reviewed_at) {
          activities.push({
            id: `${run.id}-approved`,
            type: 'run_approved',
            runName: run.name,
            userName,
            timestamp: run.reviewed_at,
          });
        } else if (run.status === 'rejected' && run.reviewed_at) {
          activities.push({
            id: `${run.id}-rejected`,
            type: 'run_rejected',
            runName: run.name,
            userName,
            timestamp: run.reviewed_at,
          });
        } else if (run.status === 'pending_review') {
          activities.push({
            id: `${run.id}-submitted`,
            type: 'run_submitted',
            runName: run.name,
            userName,
            timestamp: run.updated_at,
          });
        } else {
          activities.push({
            id: `${run.id}-created`,
            type: 'run_created',
            runName: run.name,
            userName,
            timestamp: run.created_at,
          });
        }
      });

      return activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 10);
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersResult, runsResult, pendingResult, approvedResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('runs').select('id', { count: 'exact', head: true }),
        supabase.from('runs').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('runs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalRuns: runsResult.count || 0,
        pendingReviews: pendingResult.count || 0,
        approvedRuns: approvedResult.count || 0,
      };
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // First, try to update existing role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'run_created':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'run_submitted':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'run_approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'run_rejected':
        return <Clock className="h-4 w-4 text-destructive" />;
    }
  };

  const getActivityLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'run_created':
        return 'created';
      case 'run_submitted':
        return 'submitted for review';
      case 'run_approved':
        return 'approved';
      case 'run_rejected':
        return 'rejected';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="mt-1 text-muted-foreground">
          Manage users, roles, and system settings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.totalRuns || 0}</div>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{stats?.pendingReviews || 0}</div>
            <p className="text-xs text-muted-foreground">Pending Reviews</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{stats?.approvedRuns || 0}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !recentActivity?.length ? (
            <p className="text-muted-foreground text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 text-sm">
                  {getActivityIcon(activity.type)}
                  <span>
                    <strong>{activity.runName}</strong> was {getActivityLabel(activity.type)}
                  </span>
                  <span className="ml-auto text-muted-foreground text-xs">
                    {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Settings
          </CardTitle>
          <CardDescription>
            Configure SEC EDGAR and other system settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="secEmail">SEC User-Agent Contact Email</Label>
            <div className="flex gap-2">
              <Input
                id="secEmail"
                type="email"
                placeholder="contact@company.com"
                value={secContactEmail}
                onChange={(e) => setSecContactEmail(e.target.value)}
                className="bg-background"
              />
              <Button variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Required by SEC EDGAR for API access. Must be a valid email address.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Users Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !users?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No users yet</h3>
              <p className="mt-1 text-muted-foreground">
                Users will appear here after signing up
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.user_id, value as AppRole)}
                        disabled={updateRoleMutation.isPending}
                      >
                        <SelectTrigger className="w-32 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="analyst">Analyst</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
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
