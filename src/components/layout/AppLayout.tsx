import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

export function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
