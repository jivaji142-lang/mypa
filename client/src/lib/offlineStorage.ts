const DB_NAME = 'mypa-offline';
const DB_VERSION = 1;

const STORES = {
  alarms: 'alarms',
  medicines: 'medicines',
  meetings: 'meetings',
  dismissed: 'dismissed',
  meta: 'meta',
} as const;

let dbInstance: IDBDatabase | null = null;

export async function initOfflineDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.alarms)) {
        db.createObjectStore(STORES.alarms, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.medicines)) {
        db.createObjectStore(STORES.medicines, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.meetings)) {
        db.createObjectStore(STORES.meetings, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.dismissed)) {
        const dismissedStore = db.createObjectStore(STORES.dismissed, { keyPath: 'key' });
        dismissedStore.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database:', request.error);
      reject(request.error);
    };
  });
}

function getDB(): IDBDatabase {
  if (!dbInstance) throw new Error('[OfflineDB] Database not initialized. Call initOfflineDB() first.');
  return dbInstance;
}

// --- Generic helpers ---

function putAll(storeName: string, items: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    // Clear existing and write new
    store.clear();
    for (const item of items) {
      store.put(item);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getAll<T>(storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

// --- Alarms ---

export async function cacheAlarms(alarms: any[]): Promise<void> {
  try {
    await putAll(STORES.alarms, alarms);
  } catch (e) {
    console.warn('[OfflineDB] Failed to cache alarms:', e);
  }
}

export async function getCachedAlarms(): Promise<any[]> {
  try {
    return await getAll(STORES.alarms);
  } catch (e) {
    console.warn('[OfflineDB] Failed to get cached alarms:', e);
    return [];
  }
}

// --- Medicines ---

export async function cacheMedicines(medicines: any[]): Promise<void> {
  try {
    await putAll(STORES.medicines, medicines);
  } catch (e) {
    console.warn('[OfflineDB] Failed to cache medicines:', e);
  }
}

export async function getCachedMedicines(): Promise<any[]> {
  try {
    return await getAll(STORES.medicines);
  } catch (e) {
    console.warn('[OfflineDB] Failed to get cached medicines:', e);
    return [];
  }
}

// --- Meetings ---

export async function cacheMeetings(meetings: any[]): Promise<void> {
  try {
    await putAll(STORES.meetings, meetings);
  } catch (e) {
    console.warn('[OfflineDB] Failed to cache meetings:', e);
  }
}

export async function getCachedMeetings(): Promise<any[]> {
  try {
    return await getAll(STORES.meetings);
  } catch (e) {
    console.warn('[OfflineDB] Failed to get cached meetings:', e);
    return [];
  }
}

// --- Dismissed records ---

interface DismissedRecord {
  key: string;       // "{type}-{id}-{time}"
  type: string;      // 'alarm' | 'medicine' | 'meeting'
  id: number;
  time: string;      // HH:mm when it was dismissed
  date: string;      // YYYY-MM-DD
  dismissedAt: number; // timestamp
}

function getTodayDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function markDismissed(type: string, id: number, time: string): Promise<void> {
  try {
    const db = getDB();
    const tx = db.transaction(STORES.dismissed, 'readwrite');
    const store = tx.objectStore(STORES.dismissed);
    const today = getTodayDateStr();
    const record: DismissedRecord = {
      key: `${type}-${id}-${time}-${today}`,
      type,
      id,
      time,
      date: today,
      dismissedAt: Date.now(),
    };
    store.put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[OfflineDB] Failed to mark dismissed:', e);
  }
}

export async function isDismissed(type: string, id: number, time: string): Promise<boolean> {
  try {
    const db = getDB();
    const tx = db.transaction(STORES.dismissed, 'readonly');
    const store = tx.objectStore(STORES.dismissed);
    const today = getTodayDateStr();
    const key = `${type}-${id}-${time}-${today}`;
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[OfflineDB] Failed to check dismissed:', e);
    return false;
  }
}

export async function getTodayDismissals(): Promise<Map<string, Map<number, string>>> {
  const result = new Map<string, Map<number, string>>();
  result.set('alarm', new Map());
  result.set('medicine', new Map());
  result.set('meeting', new Map());

  try {
    const db = getDB();
    const tx = db.transaction(STORES.dismissed, 'readonly');
    const store = tx.objectStore(STORES.dismissed);
    const index = store.index('date');
    const today = getTodayDateStr();
    const request = index.getAll(today);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const records = request.result as DismissedRecord[];
        for (const rec of records) {
          const typeMap = result.get(rec.type);
          if (typeMap) {
            typeMap.set(rec.id, rec.time);
          }
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[OfflineDB] Failed to get today dismissals:', e);
    return result;
  }
}

export async function clearExpiredDismissals(): Promise<void> {
  try {
    const db = getDB();
    const tx = db.transaction(STORES.dismissed, 'readwrite');
    const store = tx.objectStore(STORES.dismissed);
    const index = store.index('date');
    const today = getTodayDateStr();

    const request = store.openCursor();
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value as DismissedRecord;
          if (record.date !== today) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('[OfflineDB] Failed to clear expired dismissals:', e);
  }
}
