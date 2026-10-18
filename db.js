/**
 * db.js — 自习模拟器本地 IndexedDB 存储服务
 * 用于安全存储大体积自定义背景壁纸、自习专注历史记录，避免 localStorage 5MB 限制
 */

const DB_NAME = 'StudySimulatorDB';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('custom_bgs')) {
        db.createObjectStore('custom_bgs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('focus_records')) {
        const store = db.createObjectStore('focus_records', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'dateStr', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = (e) => {
      console.warn('IndexedDB 打开失败，将降级处理:', e);
      reject(e);
    };
  });
}

/**
 * 保存自定义背景
 */
async function dbSaveBg(bgItem) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('custom_bgs', 'readwrite');
      tx.objectStore('custom_bgs').put(bgItem);
      tx.oncomplete = () => resolve(bgItem);
      tx.onerror = (e) => reject(e);
    });
  } catch (e) {
    console.error('dbSaveBg error:', e);
  }
}

/**
 * 获取所有自定义背景
 */
async function dbGetAllBgs() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('custom_bgs', 'readonly');
      const req = tx.objectStore('custom_bgs').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  } catch (e) {
    return [];
  }
}

/**
 * 删除指定自定义背景
 */
async function dbDeleteBg(id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('custom_bgs', 'readwrite');
      tx.objectStore('custom_bgs').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  } catch (e) {
    console.error('dbDeleteBg error:', e);
  }
}

/**
 * 记录一次自习专注
 * record: { type: 'pomodoro' | 'stopwatch', durationMinutes, timestamp, dateStr }
 */
async function dbAddFocusRecord(record) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('focus_records', 'readwrite');
      tx.objectStore('focus_records').add({
        type: record.type || 'pomodoro',
        durationMinutes: record.durationMinutes || 0,
        timestamp: record.timestamp || Date.now(),
        dateStr: record.dateStr || new Date().toISOString().slice(0, 10),
        note: record.note || ''
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  } catch (e) {
    console.error('dbAddFocusRecord error:', e);
  }
}

/**
 * 获取所有专注记录
 */
async function dbGetFocusRecords() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('focus_records', 'readonly');
      const req = tx.objectStore('focus_records').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  } catch (e) {
    return [];
  }
}

window.StudyDB = {
  openDB,
  saveBg: dbSaveBg,
  getAllBgs: dbGetAllBgs,
  deleteBg: dbDeleteBg,
  addFocusRecord: dbAddFocusRecord,
  getFocusRecords: dbGetFocusRecords
};
