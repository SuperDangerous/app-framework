import { LogViewer } from './LogViewer';

export interface LogsPageProps {
  apiUrl?: string;
  title?: string;
  description?: string;
}

/**
 * A complete logs page component with file list and live log viewer
 * 
 * @example
 * ```tsx
 * import { LogsPage } from '@episensor/ui-framework';
 * 
 * function App() {
 *   return <LogsPage apiUrl="/api/logs" />;
 * }
 * ```
 */
export function LogsPage({ 
  apiUrl = '/api/logs',
  title = 'System Logs',
  description = 'Monitor application logs and system events'
}: LogsPageProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-500">{description}</p>
      </div>

      {/* Log Viewer with all features enabled */}
      <LogViewer
        apiUrl={apiUrl}
        enableFileList={true}
        enableSearch={true}
        enableFilter={true}
        enableExport={true}
        enableClear={false}
        enableAutoScroll={true}
        enablePause={true}
        enableRawView={true}
        height="calc(100vh - 250px)"
        containerClassName="shadow-lg"
      />
    </div>
  );
}
