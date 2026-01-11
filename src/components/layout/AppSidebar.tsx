import { 
  LayoutDashboard, 
  Plus, 
  FileText, 
  CheckSquare, 
  Download, 
  Settings,
  LogOut,
  ChevronLeft,
  Zap
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const mainNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'New Run', url: '/runs/new', icon: Plus },
  { title: 'Runs', url: '/runs', icon: FileText },
];

const workflowNavItems = [
  { title: 'Approvals', url: '/approvals', icon: CheckSquare, minRole: 'reviewer' as const },
  { title: 'Exports', url: '/exports', icon: Download },
];

const adminNavItems = [
  { title: 'Admin', url: '/admin', icon: Settings, minRole: 'admin' as const },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, role } = useAuth();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const isActive = (path: string) => {
    if (path === '/runs' && location.pathname === '/runs') return true;
    if (path === '/runs/new' && location.pathname === '/runs/new') return true;
    if (path !== '/runs' && path !== '/runs/new') {
      return location.pathname.startsWith(path);
    }
    return false;
  };

  const NavItem = ({ item }: { item: typeof mainNavItems[0] & { minRole?: 'reviewer' | 'admin' } }) => {
    if (item.minRole && !hasPermission(role, item.minRole)) return null;

    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink
            to={item.url}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isActive(item.url) && 'bg-sidebar-accent text-sidebar-primary'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : profile?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-semibold gradient-text">PitchPulse</span>
              <span className="text-xs text-muted-foreground">Financial Analysis</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && 'sr-only')}>
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className={cn(collapsed && 'sr-only')}>
            Workflow
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflowNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasPermission(role, 'admin') && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className={cn(collapsed && 'sr-only')}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <NavItem key={item.url} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">
                {profile?.full_name || profile?.email || 'User'}
              </span>
              <span className="truncate text-xs text-muted-foreground capitalize">
                {role}
              </span>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
