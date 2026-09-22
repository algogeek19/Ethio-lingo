/**
 * Birrend Asynchronous IndexedDB Client-Side Storage Service
 * Provides a high-capacity, non-blocking asynchronous storage engine using native IndexedDB
 * with automatic fallback to localStorage for private browsing compatibility.
 */

const DB_NAME = 'birrend_db';
const STORE_NAME = 'birrend_kv_store';
const DB_VERSION = 1;

let dbPromise = null;

// Initialize native IndexedDB database connection
const getDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = () => {
      // Fallback gracefully if IndexedDB access is restricted (e.g. strict private mode)
      resolve(null);
    };
  });

  return dbPromise;
};

export const storage = {
  /**
   * Retrieve item asynchronously from IndexedDB with localStorage fallback
   */
  async getItem(key) {
    try {
      const db = await getDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);

          req.onsuccess = () => {
            if (req.result !== undefined) {
              resolve(req.result);
            } else {
              // Check fallback localStorage
              const lsVal = localStorage.getItem(key);
              try {
                resolve(lsVal ? JSON.parse(lsVal) : null);
              } catch {
                resolve(lsVal);
              }
            }
          };

          req.onerror = () => {
            const lsVal = localStorage.getItem(key);
            resolve(lsVal ? JSON.parse(lsVal) : null);
          };
        });
      }

      // Fallback if IndexedDB unavailable
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return null;
    }
  },

  /**
   * Store item asynchronously in IndexedDB with localStorage sync
   */
  async setItem(key, value) {
    try {
      // Always sync to localStorage for instant synchronous token access if needed
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      try {
        localStorage.setItem(key, serialized);
      } catch {}

      const db = await getDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(value, key);

          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Remove item asynchronously from IndexedDB and localStorage
   */
  async removeItem(key) {
    try {
      try {
        localStorage.removeItem(key);
      } catch {}

      const db = await getDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);

          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clear all items from IndexedDB and localStorage
   */
  async clear() {
    try {
      try {
        localStorage.clear();
      } catch {}

      const db = await getDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();

          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      }
      return true;
    } catch {
      return false;
    }
  },
};

export default storage;
