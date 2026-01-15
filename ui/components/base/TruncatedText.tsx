import { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './tooltip';
import { cn } from '../../src/utils/cn';

interface TruncatedTextProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string | number;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

export function TruncatedText({
  children,
  className,
  maxWidth,
  tooltipSide = 'top',
}: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const checkTruncation = useCallback(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    // Initial check
    checkTruncation();

    // Use ResizeObserver for more accurate size change detection
    const resizeObserver = new ResizeObserver(() => {
      // Debounce the check slightly to avoid excessive updates
      requestAnimationFrame(checkTruncation);
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [checkTruncation, children]);

  const style = maxWidth ? { maxWidth } : undefined;

  // Always render the same structure, just conditionally enable the tooltip
  // This avoids the race condition of changing JSX structure based on isTruncated
  return (
    <Tooltip>
      <TooltipTrigger asChild disabled={!isTruncated}>
        <span
          ref={textRef}
          className={cn(
            'truncate block',
            isTruncated && 'cursor-help',
            className
          )}
          style={style}
        >
          {children}
        </span>
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent side={tooltipSide} className="max-w-md break-words">
          {children}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
