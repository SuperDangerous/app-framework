import { useState, useEffect, useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { Card } from '../base/card';
import { Button } from '../base/button';
import { Badge } from '../base/badge';
import { Alert, AlertDescription } from '../base/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../base/select';
import { Switch } from '../base/switch';
import { Label } from '../base/label';
import { ConfirmDialog } from '../base/ConfirmDialog';
import {
  Terminal, Archive, Download, Trash2, Search, Copy as CopyIcon,
  AlertCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '../../src/utils/cn';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose' | string;
  category?: string;
  source?: string;
  message: string;
  metadata?: Record<string, any>;
}

interface PartialLogEntry {
  id?: string;
  timestamp?: string;
  level?: 'error' | 'warn' | 'info' | 'debug' | 'verbose' | string;
  category?: string;
  source?: string;
  message?: string;
  metadata?: Record<string, any>;
}

export interface LogFile {
  filename?: string;
  name?: string;
  size: number;
  modified: string;
}

export interface LogCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

export interface LogViewerProps {
  // Data
  logs?: LogEntry[];
  logFiles?: LogFile[];


  // Callbacks
  onFetchLogs?: () => Promise<LogEntry[]>;
  onFetchArchives?: () => Promise<LogFile[]>;
  onClearLogs?: () => Promise<void>;
  onExportLogs?: () => Promise<void>;
  onDownloadArchive?: (filename: string) => void;
  onDeleteArchive?: (filename: string) => Promise<void>;

  // WebSocket handlers
  onLogReceived?: (handler: (log: LogEntry) => void) => () => void;

  // Behavior
  autoRefreshMs?: number;
  maxEntries?: number;
  defaultCategory?: 'current' | 'archives' | string;
  enableLiveUpdates?: boolean;
  enableAutoScroll?: boolean;
  autoScrollDefault?: boolean;
  newestFirst?: boolean;

  // Configuration
  categories?: LogCategory[];
  levelBadgeColors?: Record<string, string>;
  currentLogLevel?: string;

  // UI Options
  /** Display mode: 'full' shows sidebar, 'logs' shows only live logs, 'archives' shows only archives */
  mode?: 'full' | 'logs' | 'archives';
  /** Show the header with title. Set to false when embedded in settings. */
  showHeader?: boolean;
  showCategories?: boolean;
  showArchives?: boolean;
  height?: string;
  enableSearch?: boolean;
  enableFilter?: boolean;
  enableExport?: boolean;
  enableClear?: boolean;
  enableCopy?: boolean;

  // Styling
  className?: string;
}

const defaultCategories: LogCategory[] = [
  {
    id: 'current',
    label: 'Current',
    icon: Terminal,
    description: 'View live system logs',
  },
  {
    id: 'archives',
    label: 'Archives',
    icon: Archive,
    description: 'Download archived log files',
  }
];

const defaultLevelBadgeColors: Record<string, string> = {
  error: 'bg-red-500 text-white',
  warn: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
  debug: 'bg-gray-500 text-white',
  verbose: 'bg-gray-400 text-white'
};

export function LogViewer({
  logs: externalLogs = [],
  logFiles: externalLogFiles = [],
  onFetchLogs,
  onFetchArchives,
  onClearLogs,
  onExportLogs,
  onDownloadArchive,
  onDeleteArchive,
  onLogReceived,
  autoRefreshMs = 0,
  maxEntries = 1000,
  defaultCategory = 'current',
  enableLiveUpdates = true,
  enableAutoScroll = false,
  autoScrollDefault = false,
  newestFirst = true,
  enableSearch = true,
  enableFilter = true,
  enableExport = true,
  enableClear = true,
  enableCopy = true,
  categories = defaultCategories,
  levelBadgeColors = defaultLevelBadgeColors,
  currentLogLevel = 'info',
  mode = 'full',
  showHeader = true,
  showCategories = true,
  showArchives = true,
  height = 'calc(100vh - 320px)',
  className,
}: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(externalLogs);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [logFiles, setLogFiles] = useState<LogFile[]>(externalLogFiles);
  const [loading, setLoading] = useState(false);
  // In 'logs' or 'archives' mode, force the category
  const effectiveCategory = mode === 'logs' ? 'current' : mode === 'archives' ? 'archives' : defaultCategory;
  const [activeCategory, setActiveCategory] = useState(effectiveCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const [autoRefreshOn, setAutoRefreshOn] = useState(autoRefreshMs > 0);
  const [autoScroll, setAutoScroll] = useState<boolean>(autoScrollDefault ?? false);
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveToDelete, setArchiveToDelete] = useState<string | null>(null);
  const [archiveSortField, setArchiveSortField] = useState<'filename' | 'size' | 'modified'>('modified');
  const [archiveSortOrder, setArchiveSortOrder] = useState<'asc' | 'desc'>('desc');

  const LevelChip = ({ level }: { level: string }) => {
    return (
      <span className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
        levelBadgeColors[level] || levelBadgeColors.info
      )}>
        {level.toUpperCase()}
      </span>
    );
  };

  // Normalize log entries
  const normalizeLog = (log: PartialLogEntry | LogEntry): LogEntry => {
    let { timestamp, level, message, category, source, metadata } = log;
    const embedded = message ? message.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+(\w+)\s+\[([^\]]+)\]\s+(.*)$/) : null;
    if (embedded) {
      const [, tsMatch, levelMatch, sourceMatch, msgMatch] = embedded;
      timestamp = tsMatch || timestamp;
      level = (levelMatch || level || 'info').toLowerCase();
      source = sourceMatch || source;
      category = category || source;
      message = msgMatch || message;
    }
    if (message && (/^\s*Error[:\s]/i.test(message) || /uncaught exception/i.test(message))) {
      level = 'error';
    }
    const finalTimestamp = timestamp || new Date().toISOString();
    return {
      ...log,
      id: log.id || `${finalTimestamp}-${Math.random().toString(36).slice(2)}`,
      timestamp: finalTimestamp,
      level: level || 'info',
      message: message || '',
      category: category || source,
      source,
      metadata
    };
  };

  const enforceMax = (entries: LogEntry[]) => {
    if (!maxEntries || entries.length <= maxEntries) return entries;
    return entries.slice(-maxEntries);
  };

  // Coalesce stack traces
  const coalesceStackTraces = (entries: Array<PartialLogEntry | LogEntry>): LogEntry[] => {
    const out: LogEntry[] = [];
    for (const e of entries) {
      const normalized = normalizeLog(e);
      if (/^\s*at\s/.test(normalized.message) && out.length > 0) {
        const prev = out[out.length - 1];
        if (prev) {
          const stack = prev.metadata?.stack ? `${prev.metadata.stack}\n${normalized.message}` : normalized.message;
          prev.metadata = { ...(prev.metadata || {}), stack };
        } else {
          out.push(normalized);
        }
      } else {
        out.push(normalized);
      }
    }
    return out;
  };

  // Update logs from external source
  useEffect(() => {
    if (externalLogs.length === 0) return;
    const normalized = coalesceStackTraces(externalLogs);
    const sorted = normalized.sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return newestFirst ? -diff : diff;
    });
    setLogs(enforceMax(sorted));
    const cats = Array.from(new Set(sorted.map(l => l.category || l.source || '').filter(Boolean))).sort();
    setAvailableCategories(cats);
  }, [externalLogs, maxEntries, newestFirst]);

  useEffect(() => {
    setLogFiles(externalLogFiles);
  }, [externalLogFiles]);

  // Update available categories when logs change
  useEffect(() => {
    const cats = Array.from(new Set(logs.map(l => (l.category || l.source || '')).filter(Boolean))).sort();
    setAvailableCategories(cats);
  }, [logs]);

  // Filter logs
  useEffect(() => {
    let filtered = [...logs];

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(log => {
        const logCategory = log.category || log.source || '';
        return logCategory === categoryFilter;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.metadata)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, categoryFilter, searchTerm]);

  // Auto-scroll when enabled
  useEffect(() => {
    if (!autoScroll || !virtuosoRef.current || filteredLogs.length === 0) return;
    virtuosoRef.current.scrollToIndex({ index: filteredLogs.length - 1, align: 'end' });
  }, [filteredLogs, autoScroll]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefreshRef.current && (!autoRefreshOn || autoRefreshMs <= 0 || !onFetchLogs)) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
    if (!autoRefreshOn || autoRefreshMs <= 0 || !onFetchLogs) return;
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);

    autoRefreshRef.current = setInterval(() => {
      onFetchLogs()
        .then((fetched) => {
          if (!fetched) return;
          const normalized = coalesceStackTraces(fetched);
          const sorted = normalized.sort((a, b) => {
            const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            return newestFirst ? -diff : diff;
          });
          setLogs(enforceMax(sorted));
        })
        .catch((err) => {
          console.error('Auto-refresh failed:', err);
        });
    }, autoRefreshMs);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    };
  }, [autoRefreshOn, autoRefreshMs, onFetchLogs, maxEntries, newestFirst]);

  const archivesFetchedRef = useRef(false);

  // Fetch data on category changes; guard against infinite loops
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (activeCategory === 'current' && onFetchLogs) {
        setLoading(true);
        try {
          const fetchedLogs = await onFetchLogs();
          if (cancelled || !fetchedLogs) return;
          const normalized = coalesceStackTraces(fetchedLogs);
          const sorted = normalized.sort((a, b) => {
            const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            return newestFirst ? -diff : diff;
          });
          setLogs(enforceMax(sorted));
        } catch (error) {
          console.error('Failed to fetch logs:', error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else if (
        activeCategory === 'archives' &&
        onFetchArchives &&
        !archivesFetchedRef.current
      ) {
        setLoading(true);
        try {
          const archives = await onFetchArchives();
          if (cancelled || !archives) return;
          setLogFiles(archives);
          archivesFetchedRef.current = true;
        } catch (error) {
          console.error('Failed to fetch archives:', error);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, onFetchLogs, onFetchArchives, maxEntries, newestFirst]);

  // Subscribe to log updates
  useEffect(() => {
    if (!onLogReceived || !enableLiveUpdates) return;

    const handleLog = (raw: PartialLogEntry | LogEntry) => {
      const log = normalizeLog(raw);
      setLogs(prev => {
        const currentLogs = prev || [];
        if (/^\s*at\s/.test(log.message) && currentLogs.length > 0) {
          const last = currentLogs[currentLogs.length - 1];
          if (!last) return currentLogs;
          const stack = last.metadata?.stack ? `${last.metadata.stack}\n${log.message}` : log.message;
          const merged: LogEntry = {
            ...last,
            metadata: { ...(last.metadata || {}), stack }
          };
          const next = [...currentLogs.slice(0, -1), merged];
          return enforceMax(next);
        }
        const entry = { ...log, id: `${Date.now()}-${Math.random()}` };
        const next = [...currentLogs, entry];
        return enforceMax(next);
      });
    };

    return onLogReceived(handleLog);
  }, [onLogReceived, enableLiveUpdates, maxEntries]);

  // Remove fetchLogs and fetchArchives functions as they cause infinite loops
  // We'll call onFetchLogs/onFetchArchives directly in the useEffect

  const handleDeleteLogs = async () => {
    if (!onClearLogs) return;
    try {
      await onClearLogs();
      setLogs([]);
      toast.success('Logs deleted successfully');
    } catch (error) {
      toast.error('Failed to delete logs');
    }
    setDeleteDialogOpen(false);
  };

  const handleExportLogs = async () => {
    try {
      if (onExportLogs) {
        await onExportLogs();
      } else {
        // Default export implementation
        const text = filteredLogs.map(l => {
          const ts = formatTimestamp(l.timestamp);
          const src = l.category || l.source ? ` [${l.category || l.source}]` : '';
          const head = `${ts} ${l.level.toUpperCase()}${src} ${l.message}`;
          const stack = l.metadata?.stack ? `\n${l.metadata.stack}` : '';
          return head + stack;
        }).join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success('Logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const handleCopyLogs = async () => {
    try {
      const text = filteredLogs.map(l => {
        const ts = formatTimestamp(l.timestamp);
        const src = l.category || l.source ? ` [${l.category || l.source}]` : '';
        const head = `${ts} ${l.level.toUpperCase()}${src} ${l.message}`;
        const stack = l.metadata?.stack ? `\n${l.metadata.stack}` : '';
        return head + stack;
      }).join('\n');
      await navigator.clipboard.writeText(text);
      toast.success('Logs copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy logs');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, 'yyyy-MM-dd HH:mm:ss.SSS');
    } catch {
      return timestamp;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Strip ANSI color codes from log messages
  const stripAnsiCodes = (str: string): string => {
    if (!str) return '';
    // Remove all ANSI escape sequences
    return str
      .replace(/\x1b\[[0-9;]*m/g, '')     // Standard ANSI escape sequences
      .replace(/\u001b\[[0-9;]*m/g, '')   // Unicode escape sequences
      .replace(/\x1b\[[0-9;]*m/g, '')     // Octal escape sequences expressed in hex
      .replace(/\[[0-9;]+m/g, '')         // Bracket notation without escape
      .replace(/\[[\d;]*m/g, '');         // Any remaining bracket patterns
  };

  const renderLogEntry = (log: LogEntry) => (
    <div
      key={log.id}
      className="px-3 py-2 font-mono text-xs border-b border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      <div className="flex items-start gap-2">
        <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatTimestamp(log.timestamp)}
        </span>
        <span className="flex-shrink-0"><LevelChip level={log.level} /></span>
        {(log.category || log.source) && (
          <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
            [{log.category || log.source}]
          </span>
        )}
        <span className="whitespace-pre-wrap break-all">{stripAnsiCodes(log.message)}</span>
      </div>
      {log.metadata?.stack && (
        <pre className="ml-[180px] whitespace-pre overflow-x-auto text-[10px] leading-snug mt-1 text-gray-500 dark:text-gray-400">
          {stripAnsiCodes(log.metadata.stack)}
        </pre>
      )}
      {log.metadata && !log.metadata.stack && Object.keys(log.metadata).length > 0 && (
        <div className="ml-[180px] mt-1 text-gray-500 dark:text-gray-400">
          {Object.entries(log.metadata).map(([key, value]) => (
            <span key={key} className="mr-4">
              <span className="font-medium">{key}:</span>{' '}
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  // Sort archives
  const sortedArchives = [...logFiles].sort((a, b) => {
    const aFilename = a.filename || a.name || '';
    const bFilename = b.filename || b.name || '';

    let comparison = 0;
    switch (archiveSortField) {
      case 'filename':
        comparison = aFilename.localeCompare(bFilename);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'modified':
        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
    }
    return archiveSortOrder === 'asc' ? comparison : -comparison;
  });

  const handleArchiveSort = (field: 'filename' | 'size' | 'modified') => {
    if (archiveSortField === field) {
      setArchiveSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setArchiveSortField(field);
      setArchiveSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'filename' | 'size' | 'modified' }) => {
    if (archiveSortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return archiveSortOrder === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const handleDeleteArchive = async () => {
    if (!archiveToDelete || !onDeleteArchive) return;
    try {
      await onDeleteArchive(archiveToDelete);
      setLogFiles(prev => prev.filter(f => (f.filename || f.name) !== archiveToDelete));
      toast.success('Archive deleted successfully');
    } catch (error) {
      toast.error('Failed to delete archive');
    }
    setArchiveToDelete(null);
  };

  const filteredCategories = showArchives ? categories : categories.filter(c => c.id !== 'archives');
  const shouldShowSidebar = mode === 'full' && showCategories;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header - only shown when showHeader is true */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold">Logs</h1>
            <div className="text-muted-foreground flex items-center">
              View system logs and diagnostic information • Current level:{' '}
              <Badge className={cn('ml-1 text-xs px-2 py-0', levelBadgeColors[currentLogLevel] || levelBadgeColors.info)}>
                {currentLogLevel.toUpperCase()}
              </Badge>
            </div>
          </div>
          {activeCategory === 'current' && (
            <div className="flex items-center gap-4">
              {/* Toggle switches */}
              {autoRefreshMs > 0 && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefreshOn}
                    onCheckedChange={setAutoRefreshOn}
                  />
                  <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                    Auto-refresh
                  </Label>
                </div>
              )}
              {enableAutoScroll && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-scroll"
                    checked={autoScroll}
                    onCheckedChange={setAutoScroll}
                  />
                  <Label htmlFor="auto-scroll" className="text-sm cursor-pointer">
                    Auto-scroll
                  </Label>
                </div>
              )}

              {/* Divider */}
              <div className="h-6 w-px bg-border" />

              {/* Action buttons */}
              {onFetchLogs && (
                <Button variant="outline" size="sm" onClick={() => onFetchLogs().then((l) => l && setLogs(enforceMax(coalesceStackTraces(l))))}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
              {enableCopy && (
                <Button variant="outline" size="sm" onClick={handleCopyLogs}>
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              )}
              {enableExport && (
                <Button variant="outline" size="sm" onClick={handleExportLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              {onClearLogs && enableClear && (
                <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toolbar for embedded mode (no header) */}
      {!showHeader && activeCategory === 'current' && (
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-4">
            {autoRefreshMs > 0 && (
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh-embedded"
                  checked={autoRefreshOn}
                  onCheckedChange={setAutoRefreshOn}
                />
                <Label htmlFor="auto-refresh-embedded" className="text-sm cursor-pointer">
                  Auto-refresh
                </Label>
              </div>
            )}
            {enableAutoScroll && (
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-scroll-embedded"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                />
                <Label htmlFor="auto-scroll-embedded" className="text-sm cursor-pointer">
                  Auto-scroll
                </Label>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onFetchLogs && (
              <Button variant="outline" size="sm" onClick={() => onFetchLogs().then((l) => l && setLogs(enforceMax(coalesceStackTraces(l))))}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
            {enableCopy && (
              <Button variant="outline" size="sm" onClick={handleCopyLogs}>
                <CopyIcon className="h-4 w-4 mr-2" />
                Copy
              </Button>
            )}
            {enableExport && (
              <Button variant="outline" size="sm" onClick={handleExportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {onClearLogs && enableClear && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        {shouldShowSidebar && (
          <Card className="w-64 h-fit">
            <div className="p-4">
              <h3 className="font-semibold mb-4">Categories</h3>
              <div className="space-y-1">
                {filteredCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        activeCategory === category.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-left">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        <div className="flex-1 min-h-0 flex flex-col">
          {activeCategory === 'archives' ? (
            <Card className="p-0 overflow-hidden flex-1 flex flex-col min-h-0">
              {/* Only show header in full mode */}
              {mode === 'full' && (
                <div className="px-6 py-4 border-b shrink-0">
                  <h2 className="text-xl font-semibold">Log Archives</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Download or manage archived log files • {sortedArchives.length} file{sortedArchives.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              {/* File count for embedded mode */}
              {mode !== 'full' && (
                <div className="px-4 py-2 border-b shrink-0 text-sm text-muted-foreground">
                  {sortedArchives.length} archive{sortedArchives.length !== 1 ? 's' : ''} available
                </div>
              )}
              {sortedArchives.length === 0 ? (
                <div className="p-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No archived log files available
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: height }}>
                  <table className="w-full">
                    <thead className="bg-background sticky top-0 z-10 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-sm">
                          <button
                            className="flex items-center hover:text-foreground"
                            onClick={() => handleArchiveSort('filename')}
                          >
                            Name
                            <SortIcon field="filename" />
                          </button>
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-sm w-28">
                          <button
                            className="flex items-center justify-end hover:text-foreground ml-auto"
                            onClick={() => handleArchiveSort('size')}
                          >
                            Size
                            <SortIcon field="size" />
                          </button>
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-sm w-36">
                          <button
                            className="flex items-center justify-end hover:text-foreground ml-auto"
                            onClick={() => handleArchiveSort('modified')}
                          >
                            Modified
                            <SortIcon field="modified" />
                          </button>
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-sm w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedArchives.map((file) => {
                        const filename = file.filename || file.name || 'unknown';
                        return (
                          <tr key={filename} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Archive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-mono text-sm truncate">{filename}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-muted-foreground font-mono">
                              {formatFileSize(file.size)}
                            </td>
                            <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                              {format(new Date(file.modified), 'MMM d, yyyy HH:mm')}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {onDownloadArchive && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => onDownloadArchive(filename)}
                                    title="Download"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                {onDeleteArchive && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setArchiveToDelete(filename)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {enableFilter && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Level:</span>
                      <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue>
                            {levelFilter === 'all' ? (
                              <span>All Levels</span>
                            ) : (
                              <LevelChip level={levelFilter} />
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="error">
                            <LevelChip level="error" />
                          </SelectItem>
                          <SelectItem value="warn">
                            <LevelChip level="warn" />
                          </SelectItem>
                          <SelectItem value="info">
                            <LevelChip level="info" />
                          </SelectItem>
                          <SelectItem value="debug">
                            <LevelChip level="debug" />
                          </SelectItem>
                          <SelectItem value="verbose">
                            <LevelChip level="verbose" />
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {enableFilter && availableCategories.length > 0 && (
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-44 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {enableSearch && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-sm border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={cn('bg-white dark:bg-gray-900')} style={{ height }}>
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Terminal className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No logs to display</p>
                      <p className="text-xs mt-1">Logs will appear here as they are generated</p>
                    </div>
                  </div>
                ) : (
                  <Virtuoso
                    ref={virtuosoRef}
                    data={filteredLogs}
                    followOutput={autoScroll ? 'smooth' : false}
                    overscan={200}
                    itemContent={(_, log) => renderLogEntry(log)}
                    style={{ height: '100%' }}
                  />
                )}
              </div>

              <div className="border-t bg-muted/50 px-4 py-2 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {filteredLogs.length} {filteredLogs.length === 1 ? 'line' : 'lines'}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Delete logs confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Logs"
        description="Are you sure you want to delete all logs? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteLogs}
      />

      {/* Delete archive confirmation dialog */}
      <ConfirmDialog
        open={!!archiveToDelete}
        onOpenChange={(open) => !open && setArchiveToDelete(null)}
        title="Delete Archive"
        description={`Are you sure you want to delete "${archiveToDelete}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteArchive}
      />
    </div>
  );
}
