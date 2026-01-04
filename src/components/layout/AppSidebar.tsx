import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Building2,
  LayoutDashboard,
  Home,
  DoorOpen,
  Users,
  FileText,
  CreditCard,
  Wrench,
  Shield,
  LogOut,
  ChevronRight,
  BarChart3,
  Settings,
} from 'lucide-react';

const ownerNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Properties', url: '/properties', icon: Home },
  { title: 'Units', url: '/units', icon: DoorOpen },
  { title: 'Tenants', url: '/tenants', icon: Users },
  { title: 'Leases', url: '/leases', icon: FileText },
  { title: 'Payments', url: '/payments', icon: CreditCard },
  { title: 'Maintenance', url: '/maintenance', icon: Wrench },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
];

const adminNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'User Management', url: '/admin', icon: Users },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, hasRole, signOut } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;
  const isSuperAdmin = hasRole('super_admin');

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to={isSuperAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3 px-2 py-3">
          <div className="p-1.5 rounded-lg bg-sidebar-primary/20 shrink-0">
            <Building2 className="h-5 w-5 text-sidebar-primary" />
          </div>
          {!isCollapsed && (
            <span className="font-display font-bold text-sidebar-accent-foreground">
              PropertyHub
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {isSuperAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ownerNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2">
          <Link to="/profile">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-sidebar-foreground truncate">
                    {profile?.email}
                  </p>
                </div>
              )}
              {!isCollapsed && <Settings className="h-4 w-4 text-sidebar-foreground" />}
            </div>
          </Link>
          <Button
            variant="ghost"
            size={isCollapsed ? 'icon' : 'sm'}
            className="w-full mt-2 text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent justify-start"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
