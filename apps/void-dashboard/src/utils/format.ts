/**
 * Format timestamp for display
 */
export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If less than 1 minute ago, show seconds
  if (diff < 60000) {
    const seconds = Math.floor(diff / 1000);
    return `${seconds}s ago`;
  }
  
  // If less than 1 hour ago, show minutes
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  // Otherwise show date and time
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format frequency with Hz suffix
 */
export function formatFrequency(hz: number): string {
  return `${hz.toFixed(1)}Hz`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }
  
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}