import React from 'react';
import { Link, useLocation as useRouterLocation, matchPath } from 'react-router-dom';
import { LogOut, type LucideIcon } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarSeparator,
} from './sidebar';
import { ConnectionStatus } from '../connections/ConnectionStatus';
import { cn } from '../../src/utils/cn';

export interface SidebarNavItem {
  name: string;
  href: string;
  icon?: LucideIcon | React.ReactNode;
  badge?: number | string;
  /** Group label - items with the same group will be grouped together */
  group?: string;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

export interface SidebarAppLayoutProps {
  /** Application name displayed in the sidebar header */
  appName: string;
  /** Application version (optional) */
  appVersion?: string;
  /** Navigation items - can be flat array or grouped */
  navigation: SidebarNavItem[] | SidebarNavGroup[];
  /** Page content */
  children: React.ReactNode;
  /** Logo image source */
  logoSrc?: string;
  /** Custom CSS class for logo */
  logoClassName?: string;
  /** Show logout button */
  showLogout?: boolean;
  /** Custom logout handler */
  onLogout?: () => void;
  /** Whether user is authenticated (controls logout visibility) */
  authenticated?: boolean;
  /** WebSocket URL for connection status */
  connectionStatusUrl?: string;
  /** Custom sidebar width (default: 260px) */
  sidebarWidth?: number;
  /** Additional className for the layout container */
  className?: string;
  /** Custom header content (replaces default logo/name) */
  headerContent?: React.ReactNode;
  /** Custom footer content (replaces default logout) */
  footerContent?: React.ReactNode;
  /** Primary accent color for active states */
  primaryColor?: string;
}

/**
 * Full-featured application layout with sidebar navigation.
 * Based on the epi-edge-bms sidebar design pattern.
 *
 * @example
 * ```tsx
 * <SidebarAppLayout
 *   appName="My App"
 *   appVersion="1.0.0"
 *   navigation={[
 *     { name: 'Dashboard', href: '/', icon: LayoutDashboard },
 *     { name: 'Settings', href: '/settings', icon: Settings },
 *   ]}
 * >
 *   <Routes>...</Routes>
 * </SidebarAppLayout>
 * ```
 */
export function SidebarAppLayout({
  appName,
  appVersion,
  navigation,
  children,
  logoSrc = '/assets/logo.png',
  logoClassName = 'h-8 w-auto',
  showLogout = false,
  onLogout,
  authenticated = true,
  connectionStatusUrl,
  sidebarWidth = 260,
  className,
  headerContent,
  footerContent,
  primaryColor,
}: SidebarAppLayoutProps) {
  // Safe useLocation - returns a default if not in Router context
  let location = { pathname: '/', search: '' };
  try {
    const routerLocation = useRouterLocation();
    if (routerLocation) {
      location = routerLocation;
    }
  } catch {
    // Silently fallback to default if not in router context
  }

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  };

  // Check if a nav item is active
  const isActive = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    // Check for exact match or prefix match
    return !!matchPath({ path: href, end: false }, location.pathname);
  };

  // Normalize navigation to groups format
  const navGroups: SidebarNavGroup[] = React.useMemo(() => {
    if (navigation.length === 0) return [];

    // Check if it's already grouped (first item has 'items' property)
    const firstItem = navigation[0];
    if (firstItem && 'items' in firstItem) {
      return navigation as SidebarNavGroup[];
    }

    // It's a flat array - group by the 'group' property
    const items = navigation as SidebarNavItem[];
    const groups = new Map<string, SidebarNavItem[]>();

    items.forEach(item => {
      const groupKey = item.group || '';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    });

    return Array.from(groups.entries()).map(([label, groupItems]) => ({
      label,
      items: groupItems,
    }));
  }, [navigation]);

  // Helper to check if something is a React component (function or forwardRef)
  const isReactComponent = (icon: unknown): boolean => {
    if (!icon) return false;
    // Function components
    if (typeof icon === 'function') return true;
    // ForwardRef components (Lucide icons) - they have $$typeof symbol
    if (typeof icon === 'object' && icon !== null) {
      const iconObj = icon as { $$typeof?: symbol; render?: unknown };
      // Check for ForwardRef pattern
      if (iconObj.$$typeof && typeof iconObj.render === 'function') return true;
    }
    return false;
  };

  // Render a navigation item
  const renderNavItem = (item: SidebarNavItem) => {
    const active = isActive(item.href);

    // Render icon - handle Lucide icons (ForwardRef), function components, and ReactNode
    const renderIcon = () => {
      if (!item.icon) return null;

      // Check if it's a component we can render (function or ForwardRef)
      if (isReactComponent(item.icon)) {
        const IconComponent = item.icon as LucideIcon;
        return <IconComponent className="h-4 w-4 shrink-0" />;
      }

      // It's already a rendered ReactNode (JSX element)
      return <span className="h-4 w-4 shrink-0 flex items-center justify-center">{item.icon as React.ReactNode}</span>;
    };

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={active}>
          <Link to={item.href}>
            {renderIcon()}
            <span className="truncate">{item.name}</span>
            {item.badge !== undefined && (
              <SidebarMenuBadge variant={typeof item.badge === 'number' && item.badge > 0 ? 'destructive' : 'secondary'}>
                {item.badge}
              </SidebarMenuBadge>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarProvider>
      <div className={cn('flex h-screen w-full bg-muted/20', className)}>
        <Sidebar width={sidebarWidth}>
          {/* Header */}
          <SidebarHeader>
            {headerContent || (
              <div className="flex items-center gap-3">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className={cn(logoClassName)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{appName}</span>
                  {appVersion && (
                    <span className="text-xs text-muted-foreground">v{appVersion}</span>
                  )}
                </div>
              </div>
            )}
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent>
            {navGroups.map((group, index) => (
              <React.Fragment key={group.label || `group-${index}`}>
                {index > 0 && <SidebarSeparator />}
                <SidebarGroup>
                  {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                  <SidebarMenu>
                    {group.items.map(renderNavItem)}
                  </SidebarMenu>
                </SidebarGroup>
              </React.Fragment>
            ))}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter>
            {footerContent || (
              <div className="space-y-3">
                {connectionStatusUrl && (
                  <div className="px-2">
                    <ConnectionStatus url={connectionStatusUrl} className="text-xs" />
                  </div>
                )}
                {showLogout && authenticated && (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* Apply primary color as CSS variable if provided */}
      {primaryColor && (
        <style>{`
          :root {
            --sidebar-primary: ${primaryColor};
          }
          [data-state="expanded"] .bg-primary {
            background-color: ${primaryColor};
          }
        `}</style>
      )}
    </SidebarProvider>
  );
}
