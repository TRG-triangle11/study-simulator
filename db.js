/**
 * db.js — 自习模拟器本地 IndexedDB 存储服务 (v1.3)
 *
 * v1.3 改进：
 *   - 打开数据库带超时 / onblocked / file:// 降级，绝不阻塞主界面渲染
 *   - dateStr 统一使用本地时区日期（StudyUtil.localDateKey）
 *   - 专注记录新增 durationSeconds，兼容 1.2 的 durationMinutes
 *   - 自定义壁纸支持 Blob 存储
 */
const DB_NAME = 'StudySimulatorDB';
const DB_VERSION = 1;
const OPEN_TIMEOUT_MS = 4000;

const U = window.StudyUtil;
let _db = null;
let _dbFailed = false;

function openDB() {
  if (_db) return Promise.resolve(_db);
  if (_dbFailed || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      _dbFailed = true;
      reject(e);
      return;
    }

    const timer = setTimeout(() => {
      _dbFailed = true;
      reject(new Error('IndexedDB open timeout'));
    }, OPEN_TIMEOUT_MS);

    const finish = (err, db) => {
      clearTimeout(timer);
      if (err) {
        _dbFailed = true;
        reject(err);
      } else {
        resolve(db);
      }
    };

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
      _db.onversionchange = () => {
        try { _db.close(); } catch (err) {}
        _db = null;
      };
      finish(null, _db);
    };
    req.onerror = (e) => finish(e.target.error || new Error('IndexedDB open failed'));
    req.onblocked = () => finish(new Error('IndexedDB open blocked by another tab'));
  });
}

/** 异步探测可用性，供 UI 显示降级提示 */
async function dbProbe() {
  try { await openDB(); return true; } catch (e) { return false; }
}

/** 保存自定义背景：{ id, name, blob?, url?, created_at } —— 失败返回 null */
async function dbSaveBg(bgItem) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('custom_bgs', 'readwrite');
      tx.objectStore('custom_bgs').put(bgItem);
      tx.oncomplete = () => resolve(bgItem);
      tx.onerror = (e) => reject(e.target.error || e);
      tx.onabort = (e) => reject(e.target.error || e);
    });
  } catch (e) {
    console.warn('保存自定义壁纸失败（将仅保留在本次会话）:', e);
    return null;
  }
}

async function dbGetAllBgs() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('custom_bgs', 'readonly');
      const req = tx.objectStore('custom_bgs').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error || e);
    });
  } catch (e) {
    return [];
  }
}

async function dbDeleteBg(id) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('custom_bgs', 'readwrite');
      tx.objectStore('custom_bgs').delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error || e);
    });
  } catch (e) {
    console.warn('删除自定义壁纸失败:', e);
    return false;
  }
}

/**
 * 记录一次自习专注
 * record: { type, durationSeconds, durationMinutes(兼容旧调用), timestamp, dateStr, note }
 */
async function dbAddFocusRecord(record) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('focus_records', 'readwrite');
      const durationSeconds = typeof record.durationSeconds === 'number'
        ? record.durationSeconds
        : Math.round((record.durationMinutes || 0) * 60);
      const stamp = record.timestamp || Date.now();
      tx.objectStore('focus_records').add({
        type: record.type || 'pomodoro',
        durationSeconds: durationSeconds,
        durationMinutes: Math.round(durationSeconds / 60 * 100) / 100,
        timestamp: stamp,
        dateStr: record.dateStr || U.localDateKey(new Date(stamp)),
        note: record.note || ''
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error || e);
    });
  } catch (e) {
    console.warn('写入专注记录失败:', e);
    return false;
  }
}

async function dbGetFocusRecords() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('focus_records', 'readonly');
      const req = tx.objectStore('focus_records').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error || e);
    });
  } catch (e) {
    return [];
  }
}

window.StudyDB = {
  openDB,
  probe: dbProbe,
  isUnavailable: () => _dbFailed,
  saveBg: dbSaveBg,
  getAllBgs: dbGetAllBgs,
  deleteBg: dbDeleteBg,
  addFocusRecord: dbAddFocusRecord,
  getFocusRecords: dbGetFocusRecords
};
