import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../src/utils/cn';

// ============================================================================
// Sidebar Context
// ============================================================================

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  isMobile: boolean;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
  collapsible = false
}: SidebarProviderProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const update = (matches: boolean) => {
      setIsMobile(matches);
    };

    update(mq.matches);
    const handler = (event: MediaQueryListEvent) => update(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = React.useCallback(() => {
    if (collapsible) {
      setCollapsed(prev => !prev);
    }
  }, [collapsible]);

  const value = React.useMemo(() => ({ collapsed, toggle, isMobile }), [collapsed, toggle, isMobile]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

function useSidebarContext(component: string) {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error(`${component} must be used within a <SidebarProvider />`);
  }
  return context;
}

export function useSidebar() {
  return useSidebarContext('useSidebar');
}

// ============================================================================
// Sidebar Components
// ============================================================================

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsible?: 'icon' | 'none';
  width?: number;
}

export function Sidebar({
  className,
  collapsible = 'none',
  width = 260,
  ...props
}: SidebarProps) {
  const { collapsed } = useSidebarContext('Sidebar');
  const dataState = collapsed ? 'collapsed' : 'expanded';

  return (
    <div
      data-collapsible={collapsible}
      data-state={dataState}
      className={cn(
        'group/sidebar-wrapper relative flex h-screen flex-col border-r border-border bg-background transition-[max-width] duration-200 ease-linear overflow-hidden',
        collapsible === 'icon' && 'data-[state=collapsed]:max-w-[72px]',
        className,
      )}
      style={{ maxWidth: collapsed && collapsible === 'icon' ? 72 : width }}
    >
      {/* Content wrapper */}
      <div className="relative z-10 flex h-full flex-col" {...props} />
    </div>
  );
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggle } = useSidebarContext('SidebarTrigger');

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm shadow-sm transition-colors hover:bg-muted',
        className
      )}
      {...props}
    >
      <span className="sr-only">Toggle Sidebar</span>
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          d="M4 6h16M4 12h16M4 18h16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function SidebarInset({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-1 flex-col overflow-hidden', className)} {...props} />;
}

export function SidebarRail({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { collapsed } = useSidebarContext('SidebarRail');
  if (!collapsed) return null;

  return <div className={cn('mx-auto mt-2 h-8 w-12 rounded-full bg-muted', className)} {...props} />;
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-3 border-b border-border', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-auto px-2 py-4 border-t border-border', className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 space-y-2 overflow-y-auto px-2 py-4', className)} {...props} />;
}

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarGroup({ className, ...props }, ref) {
    return <div ref={ref} className={cn('space-y-2 px-2', className)} {...props} />;
  }
);

export const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarGroupLabel({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('px-2 text-xs font-medium uppercase text-muted-foreground tracking-wider', className)}
        {...props}
      />
    );
  }
);

export const SidebarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarMenu({ className, ...props }, ref) {
    return <div ref={ref} className={cn('space-y-1', className)} {...props} />;
  }
);

export const SidebarMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarMenuItem({ className, ...props }, ref) {
    return <div ref={ref} className={cn('group/sidebar-item relative', className)} {...props} />;
  }
);

const sidebarMenuButtonVariants = cva(
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  {
    variants: {
      variant: {
        default: 'text-foreground/80 hover:bg-muted hover:text-foreground',
        active: 'bg-primary text-primary-foreground hover:bg-primary/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  function SidebarMenuButton({ className, variant, asChild, isActive, tooltip, children, ...props }, ref) {
    const effectiveVariant = isActive ? 'active' : variant;

    if (asChild) {
      const child = React.Children.only(children);
      return (
        <Slot
          ref={ref as React.ForwardedRef<HTMLElement>}
          className={cn(sidebarMenuButtonVariants({ variant: effectiveVariant }), className)}
          {...props}
        >
          {child}
        </Slot>
      );
    }

    return (
      <button ref={ref} className={cn(sidebarMenuButtonVariants({ variant: effectiveVariant }), className)} {...props}>
        {children}
        {tooltip && <span className="sr-only">{tooltip}</span>}
      </button>
    );
  }
);

export const SidebarMenuAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function SidebarMenuAction({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted',
          className,
        )}
        {...props}
      />
    );
  }
);

export const SidebarMenuSub = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarMenuSub({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('mt-1 space-y-1 pl-6 text-sm border-l border-border/50 ml-3', className)}
        {...props}
      />
    );
  }
);

export const SidebarMenuSubItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarMenuSubItem({ className, ...props }, ref) {
    return <div ref={ref} className={cn('group/sidebar-sub-item relative', className)} {...props} />;
  }
);

export const SidebarMenuSubButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  function SidebarMenuSubButton({ className, asChild, isActive, ...props }, ref) {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(
          'flex w-full items-center rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive
            ? 'text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          className
        )}
        {...props}
      />
    );
  }
);

export const SidebarSection = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarSection({ className, ...props }, ref) {
    return <div ref={ref} className={cn('px-2', className)} {...props} />;
  }
);

export const SidebarSeparator = React.forwardRef<HTMLHRElement, React.HTMLAttributes<HTMLHRElement>>(
  function SidebarSeparator({ className, ...props }, ref) {
    return <hr ref={ref} className={cn('my-3 border-border', className)} {...props} />;
  }
);

// ============================================================================
// Sidebar Menu Badge
// ============================================================================

interface SidebarMenuBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive';
}

export const SidebarMenuBadge = React.forwardRef<HTMLSpanElement, SidebarMenuBadgeProps>(
  function SidebarMenuBadge({ className, variant = 'secondary', ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          'ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium',
          variant === 'default' && 'bg-primary text-primary-foreground',
          variant === 'secondary' && 'bg-muted text-muted-foreground',
          variant === 'destructive' && 'bg-destructive text-destructive-foreground',
          className,
        )}
        {...props}
      />
    );
  }
);
