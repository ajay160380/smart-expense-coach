/**
 * ═══════════════════════════════════════════════════════════════
 * PAISAMITRA — ZERO-LATENCY OFFLINE-FIRST SYNC ENGINE
 * Instant 0ms local mutation + resilient background sync queue
 * ═══════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import api from '../api/config';

const MUTATION_QUEUE_KEY = '@offline_mutation_queue_v1';
const DASHBOARD_CACHE_KEY = 'dashboard_cache';

let isSyncing = false;

/**
 * Returns safe local date string (YYYY-MM-DD) avoiding midnight UTC offset errors
 */
export function getLocalDateString(d = new Date()) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
}

/**
 * Generates a unique client transaction ID
 */
export function generateClientTxnId() {
  return `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Reads pending mutation queue from persistent storage
 */
export async function getMutationQueue() {
  try {
    const raw = await AsyncStorage.getItem(MUTATION_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[OfflineSync] Failed to read queue:', e);
    return [];
  }
}

/**
 * Saves mutation queue to persistent storage
 */
async function saveMutationQueue(queue) {
  try {
    await AsyncStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[OfflineSync] Failed to save queue:', e);
  }
}

/**
 * Optimistically applies an ADD expense to the local dashboard cache in 0ms
 */
async function applyOptimisticAdd(expenseItem) {
  try {
    const rawCache = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!rawCache) return;
    const cache = JSON.parse(rawCache);

    const amt = parseFloat(expenseItem.amount) || 0;
    const todayStr = getLocalDateString();
    const isToday = String(expenseItem.date).startsWith(todayStr);

    // 1. Update stats
    if (cache.stats) {
      cache.stats.total_spent = (parseFloat(cache.stats.total_spent) || 0) + amt;
      cache.stats.remaining = Math.max(0, (parseFloat(cache.stats.remaining) || 0) - amt);
      if (isToday) {
        cache.stats.spent_today = (parseFloat(cache.stats.spent_today) || 0) + amt;
      }
      cache.stats.tx_count = (parseInt(cache.stats.tx_count, 10) || 0) + 1;

      // Update recent expenses list
      const recents = Array.isArray(cache.stats.recent_expenses) ? cache.stats.recent_expenses : [];
      cache.stats.recent_expenses = [expenseItem, ...recents.filter(e => e.id !== expenseItem.id)].slice(0, 50);
    }

    // 2. Update top-level recent array if present
    if (Array.isArray(cache.recent)) {
      cache.recent = [expenseItem, ...cache.recent.filter(e => e.id !== expenseItem.id)].slice(0, 50);
    }

    await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('[OfflineSync] Optimistic add error:', err);
  }
}

/**
 * Optimistically applies a DELETE expense to the local dashboard cache in 0ms
 */
async function applyOptimisticDelete(expenseId) {
  try {
    const rawCache = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!rawCache) return;
    const cache = JSON.parse(rawCache);

    let deletedAmt = 0;
    let deletedWasToday = false;
    const todayStr = getLocalDateString();

    const findAndRemove = (list) => {
      if (!Array.isArray(list)) return [];
      const match = list.find(e => String(e.id) === String(expenseId));
      if (match) {
        deletedAmt = parseFloat(match.amount) || 0;
        deletedWasToday = String(match.date).startsWith(todayStr);
      }
      return list.filter(e => String(e.id) !== String(expenseId));
    };

    if (cache.stats) {
      if (Array.isArray(cache.stats.recent_expenses)) {
        cache.stats.recent_expenses = findAndRemove(cache.stats.recent_expenses);
      }
      if (deletedAmt > 0) {
        cache.stats.total_spent = Math.max(0, (parseFloat(cache.stats.total_spent) || 0) - deletedAmt);
        cache.stats.remaining = (parseFloat(cache.stats.remaining) || 0) + deletedAmt;
        if (deletedWasToday) {
          cache.stats.spent_today = Math.max(0, (parseFloat(cache.stats.spent_today) || 0) - deletedAmt);
        }
        cache.stats.tx_count = Math.max(0, (parseInt(cache.stats.tx_count, 10) || 1) - 1);
      }
    }

    if (Array.isArray(cache.recent)) {
      cache.recent = findAndRemove(cache.recent);
    }

    await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('[OfflineSync] Optimistic delete error:', err);
  }
}

/**
 * Enqueues an expense to be added: updates local state in 0ms, then syncs in background
 */
export async function addExpenseOfflineFirst(payload) {
  const clientTxnId = payload.client_txn_id || generateClientTxnId();
  const todayStr = getLocalDateString();

  const optimisticItem = {
    id: clientTxnId,
    client_txn_id: clientTxnId,
    amount: parseFloat(payload.amount),
    category: payload.category || 'other',
    description: payload.description || '',
    date: payload.date || todayStr,
    source: payload.source || 'manual',
    is_pending_sync: true,
    created_at: Date.now(),
  };

  // 1. Instant 0ms local mutation
  await applyOptimisticAdd(optimisticItem);

  // 2. Emit UI event so all screens (Dashboard, Analytics, etc.) refresh instantly!
  DeviceEventEmitter.emit('EXPENSE_UPDATED');

  // 3. Enqueue mutation
  const queue = await getMutationQueue();
  queue.push({
    id: clientTxnId,
    type: 'ADD',
    payload: {
      ...payload,
      client_txn_id: clientTxnId,
      date: optimisticItem.date,
    },
    attempts: 0,
    queuedAt: Date.now(),
  });
  await saveMutationQueue(queue);

  // 4. Trigger background processor asynchronously (non-blocking)
  processMutationQueue().catch(() => {});

  return optimisticItem;
}

/**
 * Enqueues an expense to be deleted: removes from local state in 0ms, then syncs in background
 */
export async function deleteExpenseOfflineFirst(expenseId) {
  if (!expenseId) return;

  // 1. Instant 0ms local mutation
  await applyOptimisticDelete(expenseId);

  // 2. Emit UI event so UI updates instantly!
  DeviceEventEmitter.emit('EXPENSE_UPDATED');

  // 3. Handle queue
  let queue = await getMutationQueue();

  // If this item was an unsynced temp ADD, cancel both the ADD and avoid DELETE call
  const isPendingTemp = queue.some(m => m.id === expenseId && m.type === 'ADD');
  if (isPendingTemp) {
    queue = queue.filter(m => m.id !== expenseId);
    await saveMutationQueue(queue);
    return;
  }

  // Otherwise enqueue DELETE for server
  queue.push({
    id: expenseId,
    type: 'DELETE',
    attempts: 0,
    queuedAt: Date.now(),
  });
  await saveMutationQueue(queue);

  // 4. Trigger background processor asynchronously
  processMutationQueue().catch(() => {});
}

/**
 * Sequentially executes pending mutations in background with automatic retries and deduplication
 */
export async function processMutationQueue() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    let queue = await getMutationQueue();
    if (queue.length === 0) return;

    const remainingQueue = [];

    for (const mutation of queue) {
      try {
        if (mutation.type === 'ADD') {
          const res = await api.post('/api/quick-add/', mutation.payload);
          if (res.status === 200 || res.status === 201) {
            const serverId = res.data?.expense_id;
            if (serverId) {
              // Update local cache to replace temp client ID with permanent server ID
              const rawCache = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
              if (rawCache) {
                const cache = JSON.parse(rawCache);
                const swapId = (list) => {
                  if (!Array.isArray(list)) return [];
                  return list.map(item => {
                    if (item.client_txn_id === mutation.id || item.id === mutation.id) {
                      return { ...item, id: serverId, is_pending_sync: false };
                    }
                    return item;
                  });
                };
                if (cache.stats?.recent_expenses) cache.stats.recent_expenses = swapId(cache.stats.recent_expenses);
                if (cache.recent) cache.recent = swapId(cache.recent);
                await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cache));
              }
            }
            // Successfully processed, do not add to remainingQueue
            continue;
          }
        } else if (mutation.type === 'DELETE') {
          await api.post(`/api/delete-expense/${mutation.id}/`);
          // Successfully processed
          continue;
        }
      } catch (err) {
        const status = err.response?.status;
        console.log(`[OfflineSync] Error processing mutation ${mutation.id}:`, err.message);

        // 404 on delete means it's already deleted on server - considered complete
        if (mutation.type === 'DELETE' && status === 404) {
          continue;
        }

        // 400 Bad Request indicates malformed item; discard to avoid infinite poison pill
        if (status === 400) {
          console.warn(`[OfflineSync] Discarding invalid mutation ${mutation.id}`);
          continue;
        }

        // Network error, timeout, or server cold-start (500/502/503/504): retain in queue for next cycle
        mutation.attempts = (mutation.attempts || 0) + 1;
        remainingQueue.push(mutation);

        // If offline or network aborted, stop processing rest of queue right now to save battery/bandwidth
        if (!err.response || err.code === 'ECONNABORTED' || status >= 500) {
          // Push remaining mutations without trying them all right now
          const currentIndex = queue.indexOf(mutation);
          for (let i = currentIndex + 1; i < queue.length; i++) {
            remainingQueue.push(queue[i]);
          }
          break;
        }
      }
    }

    await saveMutationQueue(remainingQueue);

    if (remainingQueue.length === 0) {
      DeviceEventEmitter.emit('OFFLINE_SYNC_COMPLETED');
    }
  } catch (outerErr) {
    console.warn('[OfflineSync] Queue processor error:', outerErr);
  } finally {
    isSyncing = false;
  }
}
