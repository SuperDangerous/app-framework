import React, { useState } from 'react';
import { Link, useLocation as useRouterLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { ConnectionStatus } from '../connections/ConnectionStatus';
import { cn } from '../../src/utils/cn';

export interface NavItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

export interface AppLayoutProps {
  appName: string;
  appVersion?: string;
  navigation: NavItem[];
  children: React.ReactNode;
  logoSrc?: string;
  /** Custom CSS class for logo (default: "h-8 w-auto") */
  logoClassName?: string;
  /** Offset for logo positioning, e.g., { top: -4, left: 0 } */
  logoOffset?: { top?: number; left?: number };
  /** Custom header height class (default: "h-16") */
  headerHeight?: string;
  showLogout?: boolean;
  onLogout?: () => void;
  authenticated?: boolean;
  connectionStatusUrl?: string;
  className?: string;
  primaryColor?: string;
  /** 'stacked' = current two-row layout (default), 'inline' = nav beside logo in one row */
  navLayout?: 'stacked' | 'inline';
  /** 'bar' = current full-width bg block (default), 'pill' = rounded pill highlight */
  navActiveStyle?: 'bar' | 'pill';
  /** Custom class for the <header> element (replaces default 'bg-black') */
  headerClassName?: string;
  /** Custom class for the <nav> element (replaces default 'bg-[#444444]'); unused in inline mode */
  navClassName?: string;
}

/**
 * Standardized application layout for web apps
 * Provides consistent header, navigation, and connection status
 */
export function AppLayout({
  appName,
  appVersion,
  navigation,
  children,
  logoSrc = '/assets/logo.png',
  logoClassName = 'h-8 w-auto',
  logoOffset,
  headerHeight = 'h-16',
  showLogout = false,
  onLogout,
  authenticated = true,
  connectionStatusUrl,
  className,
  primaryColor = '#3b82f6',
  navLayout = 'stacked',
  navActiveStyle = 'bar',
  headerClassName,
  navClassName
}: AppLayoutProps) {
  // Safe useLocation - returns a default if not in Router context
  let location = { pathname: '/' };
  try {
    // Try to use the router location
    const routerLocation = useRouterLocation();
    if (routerLocation) {
      location = routerLocation;
    }
  } catch (error) {
    // Silently fallback to default if not in router context
  }
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const isInline = navLayout === 'inline';
  const isPill = navActiveStyle === 'pill';

  const getNavLinkClasses = (isActive: boolean) => {
    if (isPill) {
      return cn(
        "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "text-white"
          : "text-gray-300 hover:bg-white/10"
      );
    }
    // bar style (default)
    return cn(
      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
      isActive
        ? "text-white"
        : "text-gray-300 hover:bg-[#555555] hover:text-white"
    );
  };

  const getMobileLinkClasses = (isActive: boolean) => {
    if (isPill) {
      return cn(
        "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
        isActive
          ? "text-white"
          : "text-gray-300 hover:bg-white/10"
      );
    }
    return cn(
      "flex items-center gap-2 px-3 py-2 rounded text-sm font-medium",
      isActive
        ? "text-white"
        : "text-gray-300 hover:text-white hover:bg-[#555555]"
    );
  };

  const renderNavLinks = (mobile: boolean) =>
    navigation.map((item) => {
      const isActive = location.pathname === item.href ||
        (item.href === '/' && location.pathname === '/') ||
        (item.href !== '/' && location.pathname.startsWith(item.href));

      return (
        <Link
          key={item.href}
          to={item.href}
          className={mobile ? getMobileLinkClasses(isActive) : getNavLinkClasses(isActive)}
          style={isActive ? { backgroundColor: primaryColor } : undefined}
          onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
        >
          {item.icon}
          {item.name}
        </Link>
      );
    });

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <header className={headerClassName ?? "bg-black"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={cn("flex items-center", headerHeight)}>
            {/* Logo + version */}
            <div className="flex items-center">
              <img
                src={logoSrc}
                alt="Logo"
                className={cn(logoClassName, "mr-3")}
                style={logoOffset ? {
                  position: 'relative',
                  top: logoOffset.top ?? 0,
                  left: logoOffset.left ?? 0
                } : undefined}
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {appName && (
                <h1 className="text-xl font-semibold text-white">
                  {appName}
                </h1>
              )}
              {appVersion && (
                <span className="ml-2 text-xs text-gray-400">v{appVersion}</span>
              )}
            </div>

            {/* Connection status — before spacer in inline mode, after in stacked */}
            {isInline && (
              <div className="flex items-center ml-4">
                <ConnectionStatus
                  url={connectionStatusUrl}
                  className="text-xs text-gray-400"
                />
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Inline nav links (desktop only) — right-aligned */}
            {isInline && (
              <div className="hidden md:flex items-center gap-1 mr-4">
                {renderNavLinks(false)}
              </div>
            )}

            {/* Right-side controls */}
            <div className="flex items-center space-x-4">
              {!isInline && (
                <ConnectionStatus
                  url={connectionStatusUrl}
                  className="text-xs text-gray-400"
                />
              )}
              {showLogout && authenticated && (
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile navigation (inline mode — renders inside header) */}
          {isInline && mobileMenuOpen && (
            <div className="md:hidden py-2 space-y-1">
              {renderNavLinks(true)}
            </div>
          )}
        </div>
      </header>

      {/* Navigation — separate bar (stacked mode only) */}
      {!isInline && (
        <nav className={navClassName ?? "bg-[#444444]"}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Desktop navigation */}
            <div className={cn("hidden md:flex", isPill ? "gap-1 py-2" : "space-x-0")}>
              {renderNavLinks(false)}
            </div>

            {/* Mobile navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden py-2 space-y-1">
                {renderNavLinks(true)}
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

/**
 * Layout with sidebar navigation (alternative layout style)
 */
export interface SidebarLayoutProps extends Omit<AppLayoutProps, 'primaryColor'> {
  sidebarWidth?: number;
}

export function SidebarLayout({
  appName,
  appVersion,
  navigation,
  children,
  logoSrc = '/assets/logo.png',
  logoClassName = 'h-8 w-auto',
  logoOffset,
  headerHeight = 'h-16',
  showLogout = false,
  onLogout,
  authenticated = true,
  connectionStatusUrl,
  sidebarWidth = 256,
  className
}: SidebarLayoutProps) {
  // Safe useLocation - returns a default if not in Router context
  let location = { pathname: '/' };
  try {
    location = useRouterLocation();
  } catch (error) {
    console.warn('SidebarLayout: useLocation called outside Router context, using default pathname');
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

  return (
    <div className={cn("h-screen flex flex-col bg-background", className)}>
      {/* Header */}
      <header className="bg-black">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className={cn("flex justify-between items-center", headerHeight)}>
            <div className="flex items-center">
              <img
                src={logoSrc}
                alt="Logo"
                className={cn(logoClassName, "mr-3")}
                style={logoOffset ? {
                  position: 'relative',
                  top: logoOffset.top ?? 0,
                  left: logoOffset.left ?? 0
                } : undefined}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {appName && (
                <h1 className="text-xl font-semibold text-white">
                  {appName}
                </h1>
              )}
              {appVersion && (
                <span className="ml-2 text-xs text-gray-400">v{appVersion}</span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <ConnectionStatus
                url={connectionStatusUrl}
                className="text-white"
              />
              {showLogout && authenticated && (
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white flex items-center gap-2 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav 
          className="bg-white border-r border-gray-200"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="p-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                               (item.href === '/' && location.pathname === '/') ||
                               (item.href !== '/' && location.pathname.startsWith(item.href));
                
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors',
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}