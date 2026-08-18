/**
 * Durable outbox for writes made while offline.
 *
 * The service worker deliberately never caches Supabase traffic — serving a
 * stale task list would be worse than an honest offline state. That left writes
 * unhandled: complete a task on a train and the optimistic update rolled back
 * with an error toast.
 *
 * This queues failed mutations in IndexedDB and replays them in order once the
 * connection returns. IndexedDB rather than localStorage because the queue must
 * survive a tab crash and can hold more than a few kilobytes.
 *
 * Ordering is the whole game: creating a task and then completing it must never
 * replay the other way round, so entries carry a monotonic sequence and are
 * drained strictly in order.
 */

const DB_NAME = 'action-outbox';
const DB_VERSION = 1;
const STORE = 'mutations';

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // autoIncrement gives us the monotonic sequence replay depends on.
        db.createObjectStore(STORE, { keyPath: 'seq', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function transact(mode, run) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        try {
          result = run(store);
        } catch (error) {
          reject(error);
          return;
        }
        tx.oncomplete = () => resolve(result?.result ?? result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

/**
 * Queue one mutation.
 *
 * @param {{ kind: 'insert'|'update'|'delete', table?: string, id?: string,
 *           payload?: object, userId: string }} mutation
 */
export async function enqueue(mutation) {
  return transact('readwrite', (store) =>
    store.add({ ...mutation, queuedAt: Date.now() }),
  );
}

/** Everything waiting, oldest first. */
export async function pending(userId) {
  const all = await transact('readonly', (store) => store.getAll());
  const entries = Array.isArray(all) ? all : [];
  return entries
    .filter((entry) => !userId || entry.userId === userId)
    .sort((a, b) => a.seq - b.seq);
}

export async function remove(seq) {
  return transact('readwrite', (store) => store.delete(seq));
}

export async function clear(userId) {
  const entries = await pending(userId);
  await Promise.all(entries.map((entry) => remove(entry.seq)));
}

export async function count(userId) {
  return (await pending(userId)).length;
}

/**
 * Replay the queue in order.
 *
 * Stops at the first entry that fails for a reason worth retrying (still
 * offline, server down) so ordering is never broken by skipping ahead. An entry
 * the server actively rejects is dropped instead of blocking the queue forever
 * — it will never succeed, and a stuck queue is worse than a lost edit the user
 * can redo.
 *
 * @param {(entry: object) => Promise<{ ok: boolean, retriable?: boolean }>} send
 * @returns {Promise<{ sent: number, dropped: number, remaining: number }>}
 */
export async function drain(userId, send) {
  const entries = await pending(userId);
  let sent = 0;
  let dropped = 0;

  for (const entry of entries) {
    let outcome;
    try {
      outcome = await send(entry);
    } catch {
      // An exception is treated as retriable: it is almost always the network.
      break;
    }

    if (outcome.ok) {
      await remove(entry.seq);
      sent += 1;
      continue;
    }

    if (outcome.retriable) break;

    await remove(entry.seq);
    dropped += 1;
  }

  return { sent, dropped, remaining: (await pending(userId)).length };
}

/** True when the browser believes it has a connection. */
export const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);
