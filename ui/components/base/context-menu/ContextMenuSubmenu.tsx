import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../src/utils/cn';

export interface ContextMenuSubmenuProps {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Callback when this submenu opens (useful for closing other submenus) */
  onOpen?: () => void;
  /** External control for open state */
  isOpen?: boolean;
  /** External control for setting open state */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * A hoverable submenu that opens to the right of the trigger.
 * Can be controlled externally or manage its own state.
 */
export function ContextMenuSubmenu({
  label,
  icon,
  children,
  onOpen,
  isOpen: externalIsOpen,
  onOpenChange,
  className,
}: ContextMenuSubmenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  const handleMouseEnter = () => {
    if (isControlled) {
      onOpenChange?.(true);
    } else {
      setInternalIsOpen(true);
    }
    onOpen?.();
  };

  const handleMouseLeave = () => {
    if (isControlled) {
      onOpenChange?.(false);
    } else {
      setInternalIsOpen(false);
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
      >
        <span className="flex items-center">
          {icon && <span className="mr-2 h-4 w-4 flex items-center justify-center" aria-hidden="true">{icon}</span>}
          {label}
        </span>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {isOpen && (
        <div role="menu" aria-label={`${label} submenu`} className="absolute left-full top-0 ml-1 min-w-[160px] max-h-[300px] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {children}
        </div>
      )}
    </div>
  );
}
