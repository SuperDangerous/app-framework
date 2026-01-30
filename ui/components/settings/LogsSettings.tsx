import { LogViewer, LogEntry, LogFile } from '../logs/LogViewer';
import type { SettingsCategoryComponentProps } from './SettingsFramework';

export interface LiveLogsSettingsProps extends SettingsCategoryComponentProps {
  /** Fetch current log entries */
  onFetchLogs: () => Promise<LogEntry[]>;
  /** Clear current logs */
  onClearLogs?: () => Promise<void>;
  /** Auto-refresh interval in ms (default: 3000) */
  autoRefreshMs?: number;
  /** Height of the log viewer (default: 100%) */
  height?: string;
}

export interface LogArchivesSettingsProps extends SettingsCategoryComponentProps {
  /** Fetch log archive files */
  onFetchArchives: () => Promise<LogFile[]>;
  /** Download an archive file */
  onDownloadArchive?: (filename: string) => void;
  /** Delete an archive file */
  onDeleteArchive?: (filename: string) => Promise<void>;
  /** Height of the archives viewer (default: 100%) */
  height?: string;
}

/**
 * Live logs settings component for use in SettingsFramework categories.
 * Shows only the live log viewer without archives or internal navigation.
 *
 * @example
 * ```tsx
 * const categories = [
 *   {
 *     id: 'liveLogs',
 *     label: 'Live Logs',
 *     icon: Terminal,
 *     description: 'View real-time application logs',
 *     component: (props) => (
 *       <LiveLogsSettings
 *         {...props}
 *         onFetchLogs={fetchLogs}
 *         onClearLogs={clearLogs}
 *       />
 *     ),
 *   },
 * ];
 * ```
 */
export function LiveLogsSettings({
  onFetchLogs,
  onClearLogs,
  autoRefreshMs = 3000,
  height = '100%',
}: LiveLogsSettingsProps) {
  return (
    <LogViewer
      mode="logs"
      showHeader={false}
      onFetchLogs={onFetchLogs}
      onClearLogs={onClearLogs}
      enableAutoScroll
      autoRefreshMs={autoRefreshMs}
      enableSearch
      enableFilter
      enableExport
      enableClear={!!onClearLogs}
      height={height}
    />
  );
}

/**
 * Log archives settings component for use in SettingsFramework categories.
 * Shows only the archived log files without live logs or internal navigation.
 *
 * @example
 * ```tsx
 * const categories = [
 *   {
 *     id: 'logArchives',
 *     label: 'Log Archives',
 *     icon: Archive,
 *     description: 'Download and manage archived log files',
 *     component: (props) => (
 *       <LogArchivesSettings
 *         {...props}
 *         onFetchArchives={fetchArchives}
 *         onDownloadArchive={downloadArchive}
 *         onDeleteArchive={deleteArchive}
 *       />
 *     ),
 *   },
 * ];
 * ```
 */
export function LogArchivesSettings({
  onFetchArchives,
  onDownloadArchive,
  onDeleteArchive,
  height = '100%',
}: LogArchivesSettingsProps) {
  return (
    <LogViewer
      mode="archives"
      showHeader={false}
      onFetchArchives={onFetchArchives}
      onDownloadArchive={onDownloadArchive}
      onDeleteArchive={onDeleteArchive}
      height={height}
    />
  );
}

// Legacy export for backwards compatibility
export interface LogsSettingsProps extends SettingsCategoryComponentProps {
  onFetchLogs: () => Promise<LogEntry[]>;
  onFetchArchives?: () => Promise<LogFile[]>;
  onClearLogs?: () => Promise<void>;
  onDownloadArchive?: (filename: string) => void;
  onDeleteArchive?: (filename: string) => Promise<void>;
  autoRefreshMs?: number;
  height?: string;
}

/** @deprecated Use LiveLogsSettings and LogArchivesSettings instead */
export function LogsSettings({
  onFetchLogs,
  onFetchArchives,
  onClearLogs,
  onDownloadArchive,
  onDeleteArchive,
  autoRefreshMs = 3000,
  height = '100%',
}: LogsSettingsProps) {
  return (
    <LogViewer
      mode="full"
      showHeader={false}
      onFetchLogs={onFetchLogs}
      onFetchArchives={onFetchArchives}
      onClearLogs={onClearLogs}
      onDownloadArchive={onDownloadArchive}
      onDeleteArchive={onDeleteArchive}
      enableAutoScroll
      autoRefreshMs={autoRefreshMs}
      enableSearch
      enableFilter
      enableExport
      enableClear={!!onClearLogs}
      showArchives={!!onFetchArchives}
      height={height}
    />
  );
}
