// Persistent Database Service using Native IndexedDB with LocalStorage metadata cache fallback
// Stores call metadata and heavy binary audio blobs in dedicated IndexedDB object stores.
import { PRELOADED_CALLS } from '../data/preloadedCalls';

const DB_NAME = 'SankarSalesBotDB_v3';
const DB_VERSION = 1;
const CALLS_STORE = 'calls';
const RECORDINGS_STORE = 'recordings';
const METADATA_CACHE_KEY = 'sankar_salesbot_calls_meta_v3';

class DbService {
  constructor() {
    this.db = null;
    this.initPromise = this.initIndexedDB();
    this.callsCache = this.loadMetadataCache();
  }

  // Initialize IndexedDB
  async initIndexedDB() {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB not available in this environment. Falling back to memory/localStorage.');
      return null;
    }

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(CALLS_STORE)) {
            const callsStore = db.createObjectStore(CALLS_STORE, { keyPath: 'id' });
            callsStore.createIndex('timestamp', 'timestamp', { unique: false });
            callsStore.createIndex('salesStatus', 'salesStatus', { unique: false });
          }
          if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
            db.createObjectStore(RECORDINGS_STORE, { keyPath: 'id' });
          }
        };

        request.onsuccess = async (event) => {
          this.db = event.target.result;
          // Seed if empty
          await this.seedInitialCalls();
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.warn('IndexedDB open error, falling back to cache:', event.target.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB initialization caught exception:', err);
        resolve(null);
      }
    });
  }

  async initDB() {
    return this.initPromise;
  }

  loadMetadataCache() {
    try {
      if (typeof window === 'undefined') return PRELOADED_CALLS;
      const cached = localStorage.getItem(METADATA_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(PRELOADED_CALLS));
      return PRELOADED_CALLS;
    } catch {
      return PRELOADED_CALLS;
    }
  }

  saveMetadataCache(calls) {
    try {
      this.callsCache = calls;
      if (typeof window !== 'undefined') {
        localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify(calls));
      }
    } catch (err) {
      console.warn('Could not save metadata cache to localStorage:', err);
    }
  }

  async seedInitialCalls() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(CALLS_STORE, 'readonly');
      const store = tx.objectStore(CALLS_STORE);
      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result === 0) {
          const writeTx = this.db.transaction(CALLS_STORE, 'readwrite');
          const writeStore = writeTx.objectStore(CALLS_STORE);
          PRELOADED_CALLS.forEach(call => {
            writeStore.put(call);
          });
        }
      };
    } catch (e) {
      console.warn('Error seeding initial calls in IndexedDB:', e);
    }
  }

  // Get all calls (synchronous from cache, sorted descending by timestamp)
  getAllCalls() {
    return [...this.callsCache].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Save new call record and optional binary audio Blob in IndexedDB
  async saveCall(callRecord, audioBlob = null) {
    // 1. Sanitize callRecord (strip heavy base64 strings from metadata)
    const cleanRecord = {
      ...callRecord,
      recording: {
        hasAudio: Boolean(audioBlob || callRecord.recording?.audioUrl || callRecord.recording?.blob),
        audioUrl: callRecord.recording?.audioUrl || null,
        mimeType: audioBlob?.type || callRecord.recording?.mimeType || 'audio/webm',
        sizeBytes: audioBlob?.size || callRecord.recording?.sizeBytes || 0,
        consentGranted: Boolean(callRecord.consentGranted),
        savedInIndexedDB: false
      }
    };

    // 2. Persist audio Blob to IndexedDB if consent granted and blob provided
    if (this.db && audioBlob && callRecord.consentGranted) {
      try {
        const recTx = this.db.transaction(RECORDINGS_STORE, 'readwrite');
        const recStore = recTx.objectStore(RECORDINGS_STORE);
        recStore.put({
          id: cleanRecord.id,
          blob: audioBlob,
          mimeType: audioBlob.type || 'audio/webm',
          sizeBytes: audioBlob.size,
          durationSeconds: cleanRecord.durationSeconds,
          createdAt: cleanRecord.timestamp
        });
        cleanRecord.recording.savedInIndexedDB = true;
      } catch (err) {
        console.warn('Could not persist audio blob to IndexedDB:', err);
      }
    }

    // 3. Persist metadata to IndexedDB
    if (this.db) {
      try {
        const callTx = this.db.transaction(CALLS_STORE, 'readwrite');
        const callStore = callTx.objectStore(CALLS_STORE);
        callStore.put(cleanRecord);
      } catch (err) {
        console.warn('Could not persist call record to IndexedDB:', err);
      }
    }

    // 4. Update memory and localStorage cache
    const updated = [cleanRecord, ...this.callsCache.filter(c => c.id !== cleanRecord.id)];
    this.saveMetadataCache(updated);
    return updated;
  }

  // Retrieve audio recording Blob from IndexedDB and generate a playable Object URL
  async getAudioRecordingUrl(callId) {
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction(RECORDINGS_STORE, 'readonly');
        const store = tx.objectStore(RECORDINGS_STORE);
        const req = store.get(callId);

        req.onsuccess = () => {
          if (req.result && req.result.blob) {
            const url = URL.createObjectURL(req.result.blob);
            resolve(url);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  // Delete call from both calls and recordings store
  async deleteCall(id) {
    if (this.db) {
      try {
        const tx = this.db.transaction([CALLS_STORE, RECORDINGS_STORE], 'readwrite');
        tx.objectStore(CALLS_STORE).delete(id);
        tx.objectStore(RECORDINGS_STORE).delete(id);
      } catch (e) {
        console.warn('Error deleting from IndexedDB:', e);
      }
    }

    const filtered = this.callsCache.filter(c => c.id !== id);
    this.saveMetadataCache(filtered);
    return filtered;
  }

  // Update call status
  async updateCallStatus(id, newStatus) {
    const updated = this.callsCache.map(c => {
      if (c.id === id) {
        return { ...c, salesStatus: newStatus };
      }
      return c;
    });

    if (this.db) {
      try {
        const target = updated.find(c => c.id === id);
        if (target) {
          const tx = this.db.transaction(CALLS_STORE, 'readwrite');
          tx.objectStore(CALLS_STORE).put(target);
        }
      } catch (e) {
        console.warn('Error updating status in IndexedDB:', e);
      }
    }

    this.saveMetadataCache(updated);
    return updated;
  }

  // Reset to default sample calls
  async resetToDefault() {
    if (this.db) {
      try {
        const tx = this.db.transaction([CALLS_STORE, RECORDINGS_STORE], 'readwrite');
        tx.objectStore(CALLS_STORE).clear();
        tx.objectStore(RECORDINGS_STORE).clear();
        const callStore = tx.objectStore(CALLS_STORE);
        PRELOADED_CALLS.forEach(c => callStore.put(c));
      } catch (e) {
        console.warn('Error resetting IndexedDB:', e);
      }
    }

    this.saveMetadataCache(PRELOADED_CALLS);
    return PRELOADED_CALLS;
  }

  // Calculate rich sales metrics
  getMetrics() {
    const calls = this.getAllCalls();
    const totalCalls = calls.length;
    
    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        connectedCalls: 0,
        conversionRate: 0,
        demoRequestedRate: 0,
        avgDurationSec: 0,
        statusCounts: {
          'Converted': 0,
          'Interested': 0,
          'Demo Requested': 0,
          'Follow-up Required': 0,
          'Not Interested': 0,
          'No Response': 0
        }
      };
    }

    const statusCounts = {
      'Converted': 0,
      'Interested': 0,
      'Demo Requested': 0,
      'Follow-up Required': 0,
      'Not Interested': 0,
      'No Response': 0
    };

    let totalDuration = 0;
    let connectedCalls = 0;

    calls.forEach(c => {
      totalDuration += (c.durationSeconds || 0);
      if (statusCounts[c.salesStatus] !== undefined) {
        statusCounts[c.salesStatus]++;
      }
      if (c.salesStatus !== 'No Response' && (c.durationSeconds || 0) > 10) {
        connectedCalls++;
      }
    });

    const conversionRate = totalCalls > 0 ? Math.round((statusCounts['Converted'] / totalCalls) * 100) : 0;
    const demoRequestedRate = totalCalls > 0 ? Math.round((statusCounts['Demo Requested'] / totalCalls) * 100) : 0;
    const avgDurationSec = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    return {
      totalCalls,
      connectedCalls,
      conversionRate,
      demoRequestedRate,
      avgDurationSec,
      statusCounts
    };
  }

  exportCallsJSON() {
    const calls = this.getAllCalls();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(calls, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `salesbot_call_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  exportCallsCSV() {
    const calls = this.getAllCalls();
    const headers = [
      'Call ID', 
      'Date & Time', 
      'Product', 
      'Language', 
      'Duration (sec)', 
      'Sales Status', 
      'Confidence', 
      'Recording Consent',
      'Overview', 
      'Customer Requirements',
      'Pain Points',
      'Objections',
      'Promised Actions',
      'Next Steps'
    ];

    const rows = calls.map(c => [
      `"${c.id}"`,
      `"${new Date(c.timestamp).toLocaleString()}"`,
      `"${c.productName || 'OmniFlow AI'}"`,
      `"${c.language || 'en'}"`,
      c.durationSeconds || 0,
      `"${c.salesStatus}"`,
      c.confidenceScore || 0.9,
      c.consentGranted ? '"Granted"' : '"Declined"',
      `"${(c.summary?.overview || '').replace(/"/g, '""')}"`,
      `"${(c.summary?.customerRequirements || '').replace(/"/g, '""')}"`,
      `"${(c.summary?.painPoints || '').replace(/"/g, '""')}"`,
      `"${(c.summary?.objections || '').replace(/"/g, '""')}"`,
      `"${(c.summary?.promisedActions || '').replace(/"/g, '""')}"`,
      `"${(c.summary?.nextSteps || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `salesbot_call_history_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

export const dbService = new DbService();
