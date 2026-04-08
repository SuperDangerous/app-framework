import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, Database, RefreshCw, TerminalSquare } from 'lucide-react';
import { LogViewer, LogEntry, LogFile } from './LogViewer';
import { Badge } from '../base/badge';
import { Button } from '../base/button';
import { Card, CardContent, CardHeader, CardTitle } from '../base/card';
import { cn } from '../../src/utils/cn';
import { apiRequest } from '../../src/utils/apiRequest';
import { toast } from 'sonner';

export interface LogsPageStats {
  totalSize: number;
  totalSizeFormatted?: string;
  fileCount: number;
}

export interface LogsPageProps {
  apiUrl?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  compactAfterDays?: number;
  autoRefreshMs?: number;
  className?: string;
  viewerClassName?: string;
}

/**
 * Opinionated logs page for active apps.
 * Uses the shared logs router contract and wraps LogViewer with support stats
 * and maintenance actions rather than leaving each app to rebuild the shell.
 */
export function LogsPage({
  apiUrl = '/api/logs',
  eyebrow = 'Support',
  title = 'Logs',
  description = 'Operational logs, archive management, and release-support diagnostics.',
  compactAfterDays = 7,
  autoRefreshMs = 3000,
  className,
  viewerClassName,
}: LogsPageProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [archives, setArchives] = useState<LogFile[]>([]);
  const [stats, setStats] = useState<LogsPageStats | null>(null);
  const [maintenanceAction, setMaintenanceAction] = useState<'compact' | 'cleanup' | null>(null);

  const fetchLogs = useCallback(async (): Promise<LogEntry[]> => {
    try {
      const entries = await apiRequest<LogEntry[]>(`${apiUrl}/entries`);
      setLogs(entries);
      return entries;
    } catch (error) {
      console.warn('Failed to fetch logs:', error);
      setLogs([]);
      return [];
    }
  }, [apiUrl]);

  const fetchArchives = useCallback(async (): Promise<LogFile[]> => {
    try {
      const files = await apiRequest<LogFile[]>(`${apiUrl}/files`);
      const normalizedFiles = files.map((file) => ({
        ...file,
        filename: file.filename || file.name,
        name: file.name || file.filename,
      }));
      setArchives(normalizedFiles);
      return normalizedFiles;
    } catch (error) {
      console.warn('Failed to fetch archives:', error);
      setArchives([]);
      return [];
    }
  }, [apiUrl]);

  const fetchStats = useCallback(async (): Promise<LogsPageStats | null> => {
    try {
      const response = await apiRequest<{ stats?: LogsPageStats }>(`${apiUrl}/stats`);
      const nextStats = response?.stats || null;
      setStats(nextStats);
      return nextStats;
    } catch (error) {
      console.warn('Failed to fetch log stats:', error);
      setStats(null);
      return null;
    }
  }, [apiUrl]);

  const refreshSupportData = useCallback(async () => {
    await Promise.all([fetchLogs(), fetchArchives(), fetchStats()]);
  }, [fetchArchives, fetchLogs, fetchStats]);

  useEffect(() => {
    void refreshSupportData();
  }, [refreshSupportData]);

  const runMaintenanceAction = useCallback(
    async (
      action: 'compact' | 'cleanup',
      endpoint: string,
      body: Record<string, unknown> | undefined,
      successFallback: string,
    ) => {
      setMaintenanceAction(action);
      try {
        const response = await apiRequest<{ message?: string }>(endpoint, {
          method: 'POST',
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        toast.success(response.message || successFallback);
        await refreshSupportData();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update log maintenance state');
      } finally {
        setMaintenanceAction(null);
      }
    },
    [refreshSupportData],
  );

  const newestArchiveLabel = useMemo(() => {
    if (!archives.length) {
      return 'No archived files yet';
    }
    return archives[0]?.modified || 'Unknown';
  }, [archives]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge variant="secondary">{`${stats?.fileCount ?? archives.length} files`}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Live Stream</CardTitle>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm">
                <TerminalSquare className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Badge variant="outline" className="w-fit">
              {autoRefreshMs > 0 ? 'Auto-refreshing' : 'Manual refresh'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="text-2xl font-semibold text-foreground" data-testid="logs-live-count">
              {logs.length}
            </p>
            <p>Recent entries visible in the in-app viewer.</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Archive Footprint</CardTitle>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm">
                <Database className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Badge variant="secondary" className="w-fit" data-testid="logs-file-count">
              {stats?.fileCount ?? archives.length} files
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="text-2xl font-semibold text-foreground" data-testid="logs-total-size">
              {stats?.totalSizeFormatted ?? '0 B'}
            </p>
            <p>Most recent archive update: {newestArchiveLabel}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Maintenance</CardTitle>
              <div className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <Badge variant="outline" className="w-fit">
              Support Actions
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void refreshSupportData();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void runMaintenanceAction(
                  'compact',
                  `${apiUrl}/compact`,
                  { days: compactAfterDays },
                  `Archived logs older than ${compactAfterDays} days`,
                );
              }}
              disabled={maintenanceAction !== null}
            >
              {maintenanceAction === 'compact' ? 'Archiving…' : 'Archive older logs'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void runMaintenanceAction(
                  'cleanup',
                  `${apiUrl}/cleanup-zero`,
                  undefined,
                  'Cleaned up zero-length log files',
                );
              }}
              disabled={maintenanceAction !== null}
            >
              {maintenanceAction === 'cleanup' ? 'Cleaning…' : 'Cleanup zero-length'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="min-h-[34rem] rounded-xl border border-border/60 bg-card/80 p-4 shadow-sm">
        <LogViewer
          logs={logs}
          logFiles={archives}
          showHeader={false}
          enableSearch
          enableFilter
          enableExport
          enableClear
          enableAutoScroll
          autoRefreshMs={autoRefreshMs}
          onFetchLogs={fetchLogs}
          onFetchArchives={fetchArchives}
          onClearLogs={async () => {
            await apiRequest(`${apiUrl}/clear`, { method: 'POST' });
            setLogs([]);
            toast.success('Logs cleared');
          }}
          onExportLogs={async () => {
            const text = await apiRequest<string>(`${apiUrl}/export?level=all`);
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `logs-${new Date().toISOString()}.txt`;
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          onDownloadArchive={(filename) => {
            window.open(`${apiUrl}/download/${encodeURIComponent(filename)}`, '_blank', 'noopener,noreferrer');
          }}
          onDeleteArchive={async (filename) => {
            await apiRequest(`${apiUrl}/archive/${encodeURIComponent(filename)}`, { method: 'DELETE' });
            toast.success(`Deleted ${filename}`);
            await refreshSupportData();
          }}
          height="100%"
          className={cn('h-full', viewerClassName)}
        />
      </div>
    </div>
  );
}
