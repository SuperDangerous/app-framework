import { Card } from '../base/card';
import { Badge } from '../base/badge';

export interface LogStatsProps {
  stats: {
    total?: number;
    error?: number;
    warn?: number;
    info?: number;
    debug?: number;
    fileSize?: string | number;
    oldestEntry?: string;
    newestEntry?: string;
    [key: string]: any;
  } | null;
}

export function LogStats({ stats }: LogStatsProps) {
  if (!stats) return null;

  const { total, error, warn, info, debug, fileSize, oldestEntry, newestEntry } = stats as any;

  return (
    <Card className="p-4 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-xl font-semibold">{total ?? 0}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Errors</div>
          <Badge variant="destructive">{error ?? 0}</Badge>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Warnings</div>
          <Badge variant="secondary">{warn ?? 0}</Badge>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Info</div>
          <Badge variant="outline">{info ?? 0}</Badge>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Debug</div>
          <Badge variant="outline">{debug ?? 0}</Badge>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">File Size</div>
          <div className="text-xl font-semibold">{String(fileSize ?? '-')}</div>
        </div>
      </div>
      {(oldestEntry || newestEntry) && (
        <div className="mt-3 text-xs text-muted-foreground">
          {oldestEntry && <span>Oldest: {oldestEntry} </span>}
          {newestEntry && <span>Newest: {newestEntry}</span>}
        </div>
      )}
    </Card>
  );
}

export default LogStats;

