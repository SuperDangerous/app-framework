/**
 * Number and byte formatting utilities
 */

/**
 * Formats bytes to human-readable size
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.50 KB", "2.30 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Formats large numbers with K/M suffixes
 * @param num - Number to format
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatNumber(num: number): string {
  if (num < 1000) return String(num);
  if (num < 1000000) {
    const value = num / 1000;
    return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}K`;
  }
  const value = num / 1000000;
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Formats duration in milliseconds to human-readable format
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "2h 15m", "45s")
 */
export function formatDurationMs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
