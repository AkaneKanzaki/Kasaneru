import { getProgress, saveProgress, type SrsState } from './store';
import { apiClient, getDeviceId, type CardState, type ReviewLog, type SyncRequest } from './api';
import { v4 as uuidv4 } from 'uuid';

interface SyncState {
  lastSyncAt: number;
  pendingReviews: ReviewLog[];
}

function getSyncState(): SyncState {
  const raw = localStorage.getItem('sync_state');
  if (!raw) return { lastSyncAt: 0, pendingReviews: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { lastSyncAt: 0, pendingReviews: [] };
  }
}

function saveSyncState(state: SyncState) {
  localStorage.setItem('sync_state', JSON.stringify(state));
}

/**
 * Convert local SRS state to CardState for backend.
 */
function toCardState(cardId: string, srsState: SrsState): CardState {
  const dueDate = new Date(srsState.due);
  return {
    cardId,
    easeFactor: srsState.ef,
    intervalDays: srsState.interval,
    repetitions: srsState.reps,
    dueDate: dueDate.toISOString().split('T')[0],
    updatedAt: Date.now(),
  };
}

/**
 * Apply CardState from backend to local store.
 * Last-write-wins: only update if backend updatedAt > local updatedAt.
 */
function applyCardState(cardId: string, backendCard: CardState, localLastUpdate: number) {
  if (backendCard.updatedAt <= localLastUpdate) {
    return; // local is newer, skip
  }

  const p = getProgress();
  const dueDate = new Date(`${backendCard.dueDate}T00:00:00Z`);

  p.srs[cardId] = {
    ef: backendCard.easeFactor,
    interval: backendCard.intervalDays,
    reps: backendCard.repetitions,
    due: dueDate.toISOString(),
  };

  saveProgress();
}

/**
 * Sync local changes to backend, then pull updates.
 */
export async function syncAll(): Promise<void> {
  const syncState = getSyncState();
  const p = getProgress();
  const deviceId = getDeviceId();

  // Build CardStates from local SRS
  const cardStates: CardState[] = [];
  for (const [cardId, srsState] of Object.entries(p.srs)) {
    cardStates.push(toCardState(cardId, srsState));
  }

  // Prepare ReviewLogs (pending + new ones)
  const reviewLogs = syncState.pendingReviews;

  // Push to backend
  const syncReq: SyncRequest = {
    deviceId,
    cardStates,
    reviewLogs,
  };

  try {
    await apiClient.push(syncReq);
    syncState.pendingReviews = []; // clear after successful push
  } catch (err) {
    console.error('Sync push failed:', err);
    throw err;
  }

  // Pull updates from backend
  try {
    const syncResp = await apiClient.pull(syncState.lastSyncAt);

    // Apply card state updates (conflict resolution: last-write-wins)
    for (const backendCard of syncResp.cardStates) {
      const localLastUpdate = (window as any).__cardUpdatedAt?.[backendCard.cardId] || 0;
      applyCardState(backendCard.cardId, backendCard, localLastUpdate);
    }

    // Merge review logs (append-only, idempotent via UUID)
    const existingIds = new Set(syncState.pendingReviews.map((r) => r.id));
    for (const remoteLog of syncResp.reviewLogs) {
      if (!existingIds.has(remoteLog.id)) {
        syncState.pendingReviews.push(remoteLog);
      }
    }

    syncState.lastSyncAt = Date.now();
    saveSyncState(syncState);
  } catch (err) {
    console.error('Sync pull failed:', err);
    throw err;
  }
}

/**
 * Add a review and queue it for sync.
 */
export async function addReviewForSync(
  cardId: string,
  quality: number
): Promise<void> {
  const syncState = getSyncState();

  const reviewLog: ReviewLog = {
    id: uuidv4(),
    cardId,
    quality,
    reviewedAt: Date.now(),
  };

  syncState.pendingReviews.push(reviewLog);
  saveSyncState(syncState);

  // Track when this card state was updated locally
  if (!(window as any).__cardUpdatedAt) {
    (window as any).__cardUpdatedAt = {};
  }
  (window as any).__cardUpdatedAt[cardId] = Date.now();
}

/**
 * Check if there are pending changes to sync.
 */
export function hasPendingSync(): boolean {
  const syncState = getSyncState();
  return syncState.pendingReviews.length > 0;
}
