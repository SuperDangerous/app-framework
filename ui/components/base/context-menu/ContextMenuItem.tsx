import { type ReactNode, type MouseEvent } from 'react';
import { cn } from '../../../src/utils/cn';

export interface ContextMenuItemProps {
 onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
 onMouseEnter?: () => void;
 icon?: ReactNode;
 children: ReactNode;
 /** Use 'default' for standard items, or specify a color variant */
 variant?: 'default' | 'success' | 'warning' | 'destructive' | 'purple';
 disabled?: boolean;
 className?: string;
}

const variantStyles = {
 default: 'hover:bg-accent hover:text-accent-foreground',
 success: 'text-green-600 hover:bg-green-50 hover:text-green-700:bg-green-950',
 warning: 'text-amber-600 hover:bg-amber-50 hover:text-amber-700:bg-amber-950',
 destructive: 'text-destructive hover:bg-destructive hover:text-destructive-foreground',
 purple: 'text-purple-600 hover:bg-purple-50 hover:text-purple-700:bg-purple-950',
};

/**
 * A single menu item for the context menu.
 */
export function ContextMenuItem({
 onClick,
 onMouseEnter,
 icon,
 children,
 variant = 'default',
 disabled = false,
 className,
}: ContextMenuItemProps) {
 return (
 <button
 role="menuitem"
 onClick={onClick}
 onMouseEnter={onMouseEnter}
 disabled={disabled}
 aria-disabled={disabled}
 className={cn(
 "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
 variantStyles[variant],
 disabled && "opacity-50 cursor-not-allowed",
 className
 )}
 >
 {icon && <span className="mr-2 h-4 w-4 flex items-center justify-center" aria-hidden="true">{icon}</span>}
 {children}
 </button>
 );
}

/**
 * Horizontal separator for context menu sections.
 */
export function ContextMenuSeparator() {
 return <div role="separator" className="h-px bg-border my-1" />;
}
