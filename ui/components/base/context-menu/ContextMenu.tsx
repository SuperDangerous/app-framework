import { useEffect, useCallback, useState, useRef, useLayoutEffect, type ReactNode } from 'react';
import { cn } from '../../../src/utils/cn';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  position: ContextMenuPosition;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Base context menu container with positioning, close-on-outside-click,
 * and close-on-scroll behavior. Automatically adjusts position to stay within viewport.
 */
export function ContextMenu({ position, onClose, children, className }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to keep menu within viewport
  useLayoutEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8; // Padding from viewport edges

    let newX = position.x;
    let newY = position.y;

    // Check right edge
    if (position.x + rect.width > viewportWidth - padding) {
      newX = Math.max(padding, viewportWidth - rect.width - padding);
    }

    // Check bottom edge
    if (position.y + rect.height > viewportHeight - padding) {
      newY = Math.max(padding, viewportHeight - rect.height - padding);
    }

    // Check left edge
    if (newX < padding) {
      newX = padding;
    }

    // Check top edge
    if (newY < padding) {
      newY = padding;
    }

    if (newX !== position.x || newY !== position.y) {
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  // Close on click outside or scroll
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleScroll = () => onClose();

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      className={cn(
        "fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
      style={{
        top: adjustedPosition.y,
        left: adjustedPosition.x,
      }}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
