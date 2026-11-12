/**
 * util.js — 自习模拟器公共工具层 (v1.3)
 *
 * 职责：
 *   1. 统一「本地时区日期」口径，杜绝 toISOString() 在 UTC+8 凌晨的跨日错误
 *   2. 计时状态机的纯函数（可脱离 DOM 单测）
 *   3. 全局共享唯一 AudioContext（sound.js 与 ambient.js 复用）
 *
 * 以普通脚本加载（保持 file:// 双击可用），同时兼容 Node require 以便自测。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StudyUtil = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var VERSION = '1.3.3';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** 本地时区 YYYY-MM-DD；绝不使用 UTC 的 toISOString().slice(0,10) */
  function localDateKey(date) {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** 'YYYY-MM-DD' -> 本地零点 Date；非法日期（如 2 月 30 日）返回 null */
  function parseLocalDate(str) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str || '')) return null;
    var parts = str.split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    if (dt.getFullYear() !== parts[0] || dt.getMonth() !== parts[1] - 1 || dt.getDate() !== parts[2]) return null;
    return dt;
  }

  function addDays(date, n) {
    var d = new Date(date instanceof Date ? date.getTime() : date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function clamp(n, min, max, fallback) {
    var v = Number(n);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  }

  /* ===== 计时状态机（纯函数） =====
   * 番茄钟：运行时用 endAt 绝对时间戳推导剩余秒；暂停时用冻结的 remaining。
   */
  function pomodoroRemaining(p, now) {
    if (!p) return 0;
    if (p.isRunning) {
      return Math.max(0, Math.ceil((p.endAt - now) / 1000));
    }
    return Math.max(0, Math.floor(p.remaining || 0));
  }

  /** 距目标日期的自然日天数：本地零点对齐，只按天计，过期按 0 处理 */
  function daysUntil(dateStr) {
    var target = parseLocalDate(dateStr);
    if (!target) return 0;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  }

  /** 秒 -> 中文展示文本 */
  function formatDuration(seconds) {
    var mins = Math.round((seconds || 0) / 60);
    if (mins < 60) return mins + ' 分钟';
    var h = Math.floor(mins / 60), m = mins % 60;
    return m ? h + ' 小时 ' + m + ' 分' : h + ' 小时';
  }

  /** 兼容 1.2 记录的 durationMinutes 与 1.3 的 durationSeconds */
  function recordSeconds(r) {
    if (!r) return 0;
    if (typeof r.durationSeconds === 'number') return r.durationSeconds;
    return Math.round((r.durationMinutes || 0) * 60);
  }

  /* ===== 全局唯一 AudioContext ===== */
  var _audioCtx = null;
  function getAudioContext() {
    if (!_audioCtx) {
      var Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
      if (!Ctx) return null;
      try { _audioCtx = new Ctx(); } catch (e) { return null; }
    }
    if (_audioCtx.state === 'suspended') {
      // 浏览器自动播放策略：仅在用户手势调用链中 resume 才会生效
      try { _audioCtx.resume(); } catch (e) {}
    }
    return _audioCtx;
  }

  return {
    VERSION: VERSION,
    pad2: pad2,
    localDateKey: localDateKey,
    parseLocalDate: parseLocalDate,
    addDays: addDays,
    clamp: clamp,
    pomodoroRemaining: pomodoroRemaining,
    daysUntil: daysUntil,
    formatDuration: formatDuration,
    recordSeconds: recordSeconds,
    getAudioContext: getAudioContext
  };
});
