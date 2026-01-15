import { useRef, useEffect, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../src/utils/cn';

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  lineStart?: number;
  highlightLines?: number[];
  className?: string;
  showLineNumbers?: boolean;
  showFilename?: boolean;
  autoScrollToHighlight?: boolean;
}

// Map file extensions to Prism language identifiers
function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    go: 'go',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    php: 'php',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    dockerfile: 'docker',
    makefile: 'makefile',
  };
  return languageMap[ext] || 'text';
}

// Detect if dark mode is active
function useIsDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * Code viewer with syntax highlighting, line numbers, and highlighted line support.
 *
 * @example
 * ```tsx
 * <CodeViewer
 *   code={sourceCode}
 *   filename="example.ts"
 *   highlightLines={[5, 6, 7]}
 *   lineStart={10}
 * />
 * ```
 */
export function CodeViewer({
  code,
  language,
  filename,
  lineStart = 1,
  highlightLines = [],
  className,
  showLineNumbers = true,
  showFilename = true,
  autoScrollToHighlight = true,
}: CodeViewerProps) {
  const isDark = useIsDarkMode();
  const detectedLanguage = language || (filename ? getLanguageFromFilename(filename) : 'text');
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Create a set for O(1) lookup of highlighted lines
  const highlightSet = new Set(highlightLines);

  // Auto-scroll to the first highlighted line
  const scrollToHighlight = useCallback(() => {
    if (!autoScrollToHighlight || highlightLines.length === 0 || !containerRef.current) return;
    if (hasScrolledRef.current) return;

    // Find the first highlighted line element
    // The line number in the DOM is relative to the code string (1-indexed)
    const firstHighlightLine = Math.min(...highlightLines);
    const lineIndex = firstHighlightLine - lineStart; // Convert to 0-based index in code string

    // react-syntax-highlighter renders lines as spans with class "linenumber" for numbers
    // and the code lines are siblings. We need to find the right line by counting.
    const container = containerRef.current;
    const preElement = container.querySelector('pre');
    if (!preElement) return;

    // Each line is wrapped in a span, find by index
    const codeElement = preElement.querySelector('code');
    if (!codeElement) return;

    // Lines are direct children of code element when wrapLines is true
    const lines = codeElement.children;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const targetLine = lines[lineIndex] as HTMLElement;
      if (targetLine) {
        // Scroll to show the line with some context above
        const lineHeight = targetLine.offsetHeight;
        const scrollTarget = targetLine.offsetTop - (lineHeight * 3); // 3 lines of context
        container.scrollTop = Math.max(0, scrollTarget);
        hasScrolledRef.current = true;
      }
    }
  }, [autoScrollToHighlight, highlightLines, lineStart]);

  // Reset scroll flag when code or highlights change
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [code, highlightLines.join(',')]);

  // Scroll after render
  useEffect(() => {
    // Small delay to ensure the syntax highlighter has rendered
    const timeout = setTimeout(scrollToHighlight, 100);
    return () => clearTimeout(timeout);
  }, [scrollToHighlight, code]);

  return (
    <div className={cn('rounded-lg border flex flex-col', className)}>
      {filename && showFilename && (
        <div className="px-3 py-2 bg-muted/50 border-b text-xs font-mono text-muted-foreground flex items-center gap-2 flex-shrink-0">
          <span className="truncate">{filename}</span>
          {lineStart > 1 && (
            <span className="text-muted-foreground/60">starting at line {lineStart}</span>
          )}
        </div>
      )}
      <div ref={containerRef} className="flex-1 overflow-auto">
        <SyntaxHighlighter
        language={detectedLanguage}
        style={isDark ? oneDark : oneLight}
        showLineNumbers={showLineNumbers}
        startingLineNumber={lineStart}
        wrapLines
        lineProps={(lineNumber) => {
          const style: React.CSSProperties = {
            display: 'block',
            width: '100%',
          };
          if (highlightSet.has(lineNumber)) {
            style.backgroundColor = isDark ? 'rgba(255, 255, 0, 0.1)' : 'rgba(255, 255, 0, 0.2)';
            style.borderLeft = '3px solid #f59e0b';
            style.paddingLeft = '0.5rem';
            style.marginLeft = '-0.5rem';
          }
          return { style };
        }}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
          backgroundColor: isDark ? '#1e1e1e' : '#fafafa',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
      </div>
    </div>
  );
}

export type { CodeViewerProps };

/**
 * Compact version for inline code snippets without line numbers.
 */
export function CodeSnippet({
  code,
  language,
  filename,
  className,
}: {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}) {
  return (
    <CodeViewer
      code={code}
      language={language}
      filename={filename}
      showLineNumbers={false}
      className={cn('text-sm', className)}
    />
  );
}
