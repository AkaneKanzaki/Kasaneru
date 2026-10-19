import { useState, useCallback } from 'react';
import { syncAll, hasPendingSync } from './syncService';
import { apiClient } from './api';

export interface UseSyncReturn {
  isSyncing: boolean;
  syncError: string | null;
  lastSyncAt: number | null;
  hasPending: boolean;
  sync: () => Promise<void>;
  clearError: () => void;
}

export function useSync(): UseSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const stored = localStorage.getItem('last_sync_at');
    return stored ? parseInt(stored, 10) : null;
  });

  const sync = useCallback(async () => {
    if (!apiClient.getAccessToken()) {
      setSyncError('Not authenticated');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncAll();
      setLastSyncAt(Date.now());
      localStorage.setItem('last_sync_at', Date.now().toString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setSyncError(msg);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const clearError = useCallback(() => setSyncError(null), []);

  return {
    isSyncing,
    syncError,
    lastSyncAt,
    hasPending: hasPendingSync(),
    sync,
    clearError,
  };
}
