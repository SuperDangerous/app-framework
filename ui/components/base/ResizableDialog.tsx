import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './dialog';
import { Button } from './button';
import { Maximize2, Minimize2, X, GripVertical } from 'lucide-react';
import { cn } from '../../src/utils/cn';

interface ResizableDialogRenderProps {
  isFullscreen: boolean;
}

interface ResizableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  titleExtra?: React.ReactNode;
  children: React.ReactNode | ((props: ResizableDialogRenderProps) => React.ReactNode);
  footer?: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export function ResizableDialog({
  open,
  onOpenChange,
  title,
  titleExtra,
  children,
  footer,
  defaultWidth = 800,
  defaultHeight = 600,
  minWidth = 400,
  minHeight = 300,
  className,
  onFullscreenChange,
}: ResizableDialogProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  // Initialize size with viewport constraints
  const [size, setSize] = useState<Size>(() => ({
    width: Math.min(defaultWidth, typeof window !== 'undefined' ? window.innerWidth - 32 : defaultWidth),
    height: Math.min(defaultHeight, typeof window !== 'undefined' ? window.innerHeight - 32 : defaultHeight),
  }));
  const [isInteracting, setIsInteracting] = useState(false); // Combined drag/resize state for class

  const dialogRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    type: 'drag' | 'resize' | null;
    direction: string | null;
    startMouseX: number;
    startMouseY: number;
    startPosX: number;
    startPosY: number;
    startWidth: number;
    startHeight: number;
  }>({
    type: null,
    direction: null,
    startMouseX: 0,
    startMouseY: 0,
    startPosX: 0,
    startPosY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  // Center dialog on open and constrain to viewport
  useEffect(() => {
    if (open && !isFullscreen) {
      // Recalculate size to fit viewport
      const constrainedWidth = Math.min(defaultWidth, window.innerWidth - 32);
      const constrainedHeight = Math.min(defaultHeight, window.innerHeight - 32);
      setSize({ width: constrainedWidth, height: constrainedHeight });

      const centerX = (window.innerWidth - constrainedWidth) / 2;
      const centerY = (window.innerHeight - constrainedHeight) / 2;
      setPosition({ x: centerX, y: Math.max(16, centerY) });
    }
  }, [open, isFullscreen, defaultWidth, defaultHeight]);

  // Direct DOM manipulation for drag - avoids React re-renders
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isFullscreen || !dialogRef.current) return;
      e.preventDefault();

      interactionRef.current = {
        type: 'drag',
        direction: null,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
        startWidth: size.width,
        startHeight: size.height,
      };

      setIsInteracting(true);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    },
    [isFullscreen, position, size]
  );

  // Direct DOM manipulation for resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: string) => {
      if (isFullscreen || !dialogRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      interactionRef.current = {
        type: 'resize',
        direction,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPosX: position.x,
        startPosY: position.y,
        startWidth: size.width,
        startHeight: size.height,
      };

      setIsInteracting(true);
      document.body.style.userSelect = 'none';
    },
    [isFullscreen, position, size]
  );

  // Combined mouse move handler - updates DOM directly for performance
  useEffect(() => {
    if (!isInteracting) return;

    const handleMouseMove = (e: MouseEvent) => {
      const ref = interactionRef.current;
      const dialog = dialogRef.current;
      if (!ref.type || !dialog) return;

      const deltaX = e.clientX - ref.startMouseX;
      const deltaY = e.clientY - ref.startMouseY;

      if (ref.type === 'drag') {
        // Direct style manipulation for drag
        const newX = ref.startPosX + deltaX;
        const newY = Math.max(0, ref.startPosY + deltaY);
        dialog.style.left = `${newX}px`;
        dialog.style.top = `${newY}px`;
      } else if (ref.type === 'resize' && ref.direction) {
        // Direct style manipulation for resize
        let newWidth = ref.startWidth;
        let newHeight = ref.startHeight;
        let newX = ref.startPosX;
        let newY = ref.startPosY;

        if (ref.direction.includes('e')) {
          newWidth = Math.max(minWidth, ref.startWidth + deltaX);
        }
        if (ref.direction.includes('w')) {
          const widthDelta = Math.min(deltaX, ref.startWidth - minWidth);
          newWidth = ref.startWidth - widthDelta;
          newX = ref.startPosX + widthDelta;
        }
        if (ref.direction.includes('s')) {
          newHeight = Math.max(minHeight, ref.startHeight + deltaY);
        }
        if (ref.direction.includes('n')) {
          const heightDelta = Math.min(deltaY, ref.startHeight - minHeight);
          newHeight = ref.startHeight - heightDelta;
          newY = Math.max(0, ref.startPosY + heightDelta);
        }

        dialog.style.width = `${newWidth}px`;
        dialog.style.height = `${newHeight}px`;
        dialog.style.left = `${newX}px`;
        dialog.style.top = `${newY}px`;
      }
    };

    const handleMouseUp = () => {
      const ref = interactionRef.current;
      const dialog = dialogRef.current;

      if (dialog && ref.type) {
        // Sync React state with final DOM values
        const rect = dialog.getBoundingClientRect();
        setPosition({ x: rect.left, y: rect.top });
        setSize({ width: rect.width, height: rect.height });
      }

      interactionRef.current.type = null;
      interactionRef.current.direction = null;
      setIsInteracting(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isInteracting, minWidth, minHeight]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const newValue = !prev;
      onFullscreenChange?.(newValue);
      return newValue;
    });
  }, [onFullscreenChange]);

  // Memoize style to avoid object recreation
  const dialogStyle = useMemo<React.CSSProperties>(() =>
    isFullscreen
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          borderRadius: 0,
          transform: 'none',
        }
      : {
          position: 'fixed',
          top: position.y,
          left: position.x,
          width: size.width,
          height: size.height,
          maxWidth: 'none',
          maxHeight: 'none',
          transform: 'none',
          willChange: isInteracting ? 'left, top, width, height' : 'auto',
        },
    [isFullscreen, position.x, position.y, size.width, size.height, isInteracting]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={dialogRef}
        style={dialogStyle}
        hideCloseButton
        className={cn(
          'flex flex-col p-0 gap-0',
          // Disable transitions during interaction for instant feedback
          isInteracting && 'transition-none duration-0 [&_*]:transition-none',
          isFullscreen ? 'rounded-none' : 'rounded-lg',
          className
        )}
      >
        {/* Header with drag handle */}
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b bg-muted/30 flex-shrink-0',
            !isFullscreen && 'cursor-grab active:cursor-grabbing'
          )}
          onMouseDown={handleDragStart}
        >
          {!isFullscreen && (
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 group flex items-center gap-2">
            {title && (
              <DialogHeader className="p-0 space-y-0 min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold leading-tight truncate">
                  {title}
                </DialogTitle>
              </DialogHeader>
            )}
            {titleExtra && (
              <div className="flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
                {titleExtra}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {typeof children === 'function' ? children({ isFullscreen }) : children}
        </div>

        {/* Footer */}
        {footer && (
          <DialogFooter className="px-4 py-3 border-t bg-muted/30 flex-shrink-0">
            {footer}
          </DialogFooter>
        )}

        {/* Resize handles (only when not fullscreen) */}
        {!isFullscreen && (
          <>
            {/* Edges */}
            <div
              className="absolute top-0 left-2 right-2 h-1 cursor-n-resize"
              onMouseDown={(e) => handleResizeStart(e, 'n')}
            />
            <div
              className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize"
              onMouseDown={(e) => handleResizeStart(e, 's')}
            />
            <div
              className="absolute left-0 top-2 bottom-2 w-1 cursor-w-resize"
              onMouseDown={(e) => handleResizeStart(e, 'w')}
            />
            <div
              className="absolute right-0 top-2 bottom-2 w-1 cursor-e-resize"
              onMouseDown={(e) => handleResizeStart(e, 'e')}
            />
            {/* Corners */}
            <div
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
