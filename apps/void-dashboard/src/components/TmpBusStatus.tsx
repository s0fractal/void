import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Activity, Database, Zap, Clock, HardDrive, Users } from 'lucide-react';

interface TmpBusStats {
  session_id?: string;
  lease?: {
    created_at: string;
    updated_at: string;
  };
  relay_connected?: boolean;
  events_ingested?: number;
  events_forwarded?: number;
  events_spooled?: number;
  spool_depth?: number;
  uds_clients?: number;
  tcp_clients?: number;
  pulse?: {
    size_bytes: number;
    age_seconds: number;
    rotations?: Record<string, number>;
  };
}

interface TmpBusStatusProps {
  wsUrl?: string;
  pollInterval?: number;
}

export const TmpBusStatus: React.FC<TmpBusStatusProps> = ({
  wsUrl = 'ws://localhost:8787/ws',
  pollInterval = 5000,
}) => {
  const [stats, setStats] = useState<TmpBusStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('TmpBus status connected');
          setError(null);
          
          // Request initial stats
          ws?.send(JSON.stringify({
            type: 'tmpbus.stats.request',
            meta: { source: 'dashboard' }
          }));

          // Setup heartbeat
          heartbeatInterval = setInterval(() => {
            ws?.send(JSON.stringify({
              type: 'tmpbus.stats.request',
              meta: { source: 'dashboard' }
            }));
          }, pollInterval);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'tmpbus.stats' && data.stats) {
              setStats(data.stats);
              setLastUpdate(new Date());
              setLoading(false);
            }
          } catch (e) {
            console.error('Failed to parse tmpbus stats:', e);
          }
        };

        ws.onerror = (e) => {
          console.error('TmpBus WebSocket error:', e);
          setError('Connection error');
        };

        ws.onclose = () => {
          console.log('TmpBus status disconnected, reconnecting...');
          clearInterval(heartbeatInterval);
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (e) {
        setError('Failed to connect');
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(heartbeatInterval);
      ws?.close();
    };
  }, [wsUrl, pollInterval]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const getLeaseAge = (): number => {
    if (!stats.lease?.updated_at) return 0;
    const updated = new Date(stats.lease.updated_at).getTime();
    return (Date.now() - updated) / 1000;
  };

  const getSessionIdShort = (): string => {
    if (!stats.session_id) return '--------';
    return stats.session_id.slice(0, 8);
  };

  if (loading && !stats.session_id) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            TmpBus Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            TmpBus Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={stats.relay_connected ? 'default' : 'secondary'}>
              {stats.relay_connected ? 'Relay Connected' : 'Relay Offline'}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {getSessionIdShort()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Clients
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-2xl font-bold">{stats.uds_clients || 0}</span>
                <span className="text-xs text-muted-foreground ml-1">UDS</span>
              </div>
              <div>
                <span className="text-2xl font-bold">{stats.tcp_clients || 0}</span>
                <span className="text-xs text-muted-foreground ml-1">TCP</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Lease Age
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(getLeaseAge())}
            </div>
          </div>
        </div>

        {/* Event Flow */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              Event Flow
            </span>
            <span className="text-xs text-muted-foreground">
              {stats.events_forwarded || 0} / {stats.events_ingested || 0}
            </span>
          </div>
          <Progress 
            value={(stats.events_forwarded || 0) / Math.max(stats.events_ingested || 1, 1) * 100} 
            className="h-2"
          />
        </div>

        {/* Spool Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              Spool Depth
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats.spool_depth || 0}</span>
              {(stats.spool_depth || 0) > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Buffering
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              Pulse Log
            </div>
            <div className="text-sm">
              <div>{formatBytes(stats.pulse?.size_bytes || 0)}</div>
              <div className="text-xs text-muted-foreground">
                {formatDuration(stats.pulse?.age_seconds || 0)} old
              </div>
            </div>
          </div>
        </div>

        {/* Rotations */}
        {stats.pulse?.rotations && Object.keys(stats.pulse.rotations).length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">Log Rotations</div>
            <div className="flex gap-2">
              {Object.entries(stats.pulse.rotations).map(([reason, count]) => (
                <Badge key={reason} variant="outline" className="text-xs">
                  {reason}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Last Update */}
        <div className="text-xs text-muted-foreground text-right">
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};