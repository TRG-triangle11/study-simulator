/**
 * smoke.js — 自习模拟器 v1.3 离线自测（零依赖，Node 原生运行）
 *
 *   node tests/smoke.js
 *
 * 覆盖：
 *   1. util.js 纯函数（本地日期、计时状态机、时长换算）
 *   2. index.html 中 DOM id 与 JS 引用的静态一致性
 *   3. 资源引用（CSS 字体 / 壁纸路径）是否全部存在
 *   4. 在最小 DOM stub 中依次加载全部脚本，验证初始化链路不抛错
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let passed = 0, failed = 0;

function check(name, fn) {
  try { fn(); console.log('  PASS  ' + name); passed++; }
  catch (e) { console.error('  FAIL  ' + name + ' :: ' + (e && e.message)); failed++; }
}

console.log('\n[1] util.js 纯函数');
const U = require(path.join(ROOT, 'util.js'));
check('版本号为 1.4.2', () => assert.strictEqual(U.VERSION, '1.4.2'));
check('本地日期在 UTC+8 凌晨不跨日', () => {
  assert.strictEqual(U.localDateKey(new Date(2026, 10, 13, 0, 30)), '2026-11-13');
  assert.strictEqual(U.localDateKey(new Date(2026, 0, 1, 7, 59)), '2026-01-01');
});
check('非法日期被拒绝', () => {
  assert.strictEqual(U.parseLocalDate('2026-02-30'), null);
  assert.strictEqual(U.parseLocalDate('bad'), null);
  const d = U.parseLocalDate('2026-12-12');
  assert.strictEqual(d.getMonth(), 11);
});
check('addDays 跨月正确', () => {
  assert.strictEqual(U.localDateKey(U.addDays(new Date(2026, 0, 31), 1)), '2026-02-01');
});
check('番茄钟剩余时间由绝对时间戳推导', () => {
  const now = 1700000000000;
  assert.strictEqual(U.pomodoroRemaining({ isRunning: true, endAt: now + 65000 }, now), 65);
  assert.strictEqual(U.pomodoroRemaining({ isRunning: true, endAt: now - 100 }, now), 0);
  assert.strictEqual(U.pomodoroRemaining({ isRunning: false, remaining: 42 }, now), 42);
});
check('目标倒数只按自然日计算', () => {
  assert.strictEqual(U.daysUntil(U.localDateKey(U.addDays(new Date(), 287))), 287);
  assert.strictEqual(U.daysUntil(U.localDateKey(new Date())), 0);
  assert.strictEqual(U.daysUntil(U.localDateKey(U.addDays(new Date(), -5))), 0);
  assert.strictEqual(U.daysUntil('bad'), 0);
});
check('时长格式化与 1.2 记录兼容', () => {
  assert.strictEqual(U.recordSeconds({ durationMinutes: 25 }), 1500);
  assert.strictEqual(U.recordSeconds({ durationSeconds: 90 }), 90);
  assert.strictEqual(U.formatDuration(3600), '1 小时');
  assert.strictEqual(U.formatDuration(1500), '25 分钟');
});
check('正计时由墙钟差推导（不逐秒累加）', () => {
  const now = 1700000000000;
  assert.strictEqual(U.stopwatchElapsed({ baseElapsed: 10, startedAt: now - 3000, isRunning: true }, now), 13);
  assert.strictEqual(U.stopwatchElapsed({ baseElapsed: 90, isRunning: false }, now), 90);
  assert.deepStrictEqual(U.splitHMS(3600 + 120 + 3), { h: 1, m: 2, s: 3 });
});
check('clamp 对非法值回退', () => {
  assert.strictEqual(U.clamp(undefined, 1, 5, 2), 2);
  assert.strictEqual(U.clamp(99, 1, 5, 2), 5);
});

console.log('\n[2] DOM 引用一致性');
check('JS 中引用的 #id 均存在于 index.html', () => {
  const html = read('index.html');
  const js = ['app.js', 'particles.js', 'ambient.js', 'db.js'].map(read).join('\n');
  const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), (m) => m[1]));
  const refs = new Set(Array.from(js.matchAll(/\$\('#([A-Za-z0-9_-]+)'\)/g), (m) => m[1]));
  const runtimeCreated = new Set(['particleCanvas']); // 运行时由 JS 创建
  const missing = [...refs].filter((id) => !ids.has(id) && !runtimeCreated.has(id));
  assert.deepStrictEqual(missing, []);
});
check('index.html 脚本加载顺序正确（util 最先）', () => {
  const html = read('index.html');
  const order = Array.from(html.matchAll(/<script src="([^"]+)"/g), (m) => m[1].split('?')[0]);
  assert.deepStrictEqual(order, ['util.js', 'db.js', 'sound.js', 'ambient.js', 'particles.js', 'app.js']);
});
check('模式栏为时钟 / 番茄钟 / 正计时 / 禅意，大时钟常驻', () => {
  const html = read('index.html');
  const bar = html.match(/<div id="modeBar"[\s\S]*?<\/div>/);
  assert.ok(bar, '未找到模式栏');
  assert.ok(bar[0].includes('data-mode="stopwatch"'), '正计时按钮缺失');
  assert.ok(bar[0].includes('>正计时</button>'), '正计时按钮文案缺失');
  assert.ok(!bar[0].includes('data-mode="target"'), '倒数日按钮仍存在');
  assert.ok(!/\(\d\)/.test(bar[0]), '按钮文案仍含括号数字');
  assert.ok(bar[0].includes('>时钟</button>'));
  assert.ok(bar[0].includes('>番茄钟</button>'));
  assert.ok(html.includes('id="countdownLine"'), '缺少倒数文字行');
  assert.ok(!html.includes('id="targetTitle"'), '旧倒数标题元素未移除');
  const css = read('style.css');
  assert.ok(!css.includes('[data-mode="target"]'), 'CSS 仍存在隐藏大时钟的倒数日规则');
  const app = read('app.js');
  assert.ok(app.includes("elDate.style.display = state.settings.showDate ? '' : 'none'"), '日期仍受计时模式限制');
  assert.ok(app.includes("if (!['clock', 'pomodoro', 'stopwatch'].includes(initialSettings.mode))"), '旧设置未做模式回落兼容');
});
check('正计时链路完整（渲染 / 控制 / 归档 / 旧数据兼容）', () => {
  const app = read('app.js');
  ['function renderStopwatchTime', 'function startStopwatch', 'function pauseStopwatch',
    'function resetStopwatch', "queuePendingRecord('stopwatch', delta, now)",
    'stopwatch: persisted.stopwatch', 'const p = t.pomodoro || t, s = t.stopwatch || {};']
    .forEach((frag) => assert.ok(app.includes(frag), '缺少 ' + frag));
  assert.ok(app.includes("elTS.textContent = '00'; // 从正计时切回时清掉残留秒数"), '番茄钟未清理残留秒数');
});
check('目标倒计时配置集中在「日期待办」页', () => {
  const html = read('index.html');
  const start = html.indexOf('<div class="sTabPane" id="tab-date-todo">');
  const end = html.indexOf('<!-- Tab 4', start);
  const focusStart = html.indexOf('<div class="sTabPane" id="tab-focus">');
  assert.ok(focusStart > 0 && start > focusStart && end > start, '设置页结构异常');
  const pane = html.slice(start, end), focusPane = html.slice(focusStart, start);
  assert.ok(pane.includes('目标倒计时'), '缺少目标倒计时分组');
  ['swCountdown', 'targetTitleInput', 'dpYearInput', 'dpMonthInput', 'dpDayInput', 'targetDateInput']
    .forEach((id) => assert.ok(pane.includes('id="' + id + '"'), id + ' 不在日期待办页'));
  assert.ok(!focusPane.includes('targetTitleInput'), '目标名称仍留在专注计时页');
  assert.ok(!focusPane.includes('swCountdown'), '倒计时开关仍留在专注计时页');
  assert.strictEqual((html.match(/id="swCountdown"/g) || []).length, 1, '倒计时开关重复');
});

check('静态资源带版本参数，避免改完仍用旧缓存', () => {
  const html = read('index.html');
  assert.ok(/style\.css\?v=/.test(html), '样式表未带版本参数');
  const scripts = Array.from(html.matchAll(/<script src="([^"]+)"/g), (m) => m[1]);
  assert.ok(scripts.length >= 6 && scripts.every((s) => /\?v=/.test(s)), '存在未带版本参数的脚本');
});
check('秒数样式带实时预览', () => {
  const html = read('index.html');
  const app = read('app.js');
  assert.ok(html.includes('id="secPreview"'), '缺少秒样式预览');
  assert.ok(app.includes("$('#secPreview')"), '预览未与秒样式联动');
  assert.ok(app.includes('syncSecStyleButtons();'), '初始未同步按钮选中态');
});

check('设置搜索框存在且可跨分类跳转', () => {
  const html = read('index.html');
  const app = read('app.js');
  assert.ok(html.includes('id="settingsSearch"'), '缺少搜索输入框');
  assert.ok(html.includes('id="sSearchResults"'), '缺少搜索结果容器');
  assert.ok(app.includes('function initSettingsSearch'), '缺少搜索逻辑');
  assert.ok(app.includes("querySelectorAll('.sTabPane')"), '未跨分类收集设置项');
  assert.ok(app.includes('scrollIntoView'), '搜索结果未定位到目标');
  assert.ok(app.includes('function resetSettingsSearch'), '关闭设置未重置搜索');
});

check('秒数样式切换立即生效（v1.4.1 回归）', () => {
  const app = read('app.js');
  const from = app.indexOf('function updateVisibility');
  const body = app.slice(from, app.indexOf('function setMode', from));
  assert.ok(body.length > 0, '未找到 updateVisibility');
  assert.ok(/applySecStyle\(\)/.test(body), 'updateVisibility 未应用秒数样式，切换会延迟生效');
  assert.ok(!/^\s*syncGhostSeconds\(\);/m.test(body), '仍停留在只同步暗段、不更新 sec-eq 状态');
});

check('v1.4.0 新增：名句库 / 关闭秒针 / 壁纸浮窗 / 分组折叠', () => {
  const app = read('app.js');
  const html = read('index.html');
  const from = app.indexOf('const MOTTO_LIST');
  const block = app.slice(from, app.indexOf('];', from));
  const items = block.split('\n').filter((l) => /^\s*"/.test(l))
    .map((l) => l.trim().replace(/^"/, '').replace(/",?$/, ''));
  assert.ok(items.length >= 100, '名句不足 100 条，当前 ' + items.length);
  assert.ok(items.every((m) => m.length <= 40), '存在过长名句');
  assert.ok(html.includes('data-sec="off"'), '缺少关闭秒针选项');
  assert.ok(app.includes("v === 'off'"), '关闭秒针逻辑缺失');
  assert.ok(html.includes('id="bgEntry"') && html.includes('id="bgDetail"'), '壁纸未改为入口 + 浮窗');
  assert.ok(app.includes('initGroupCollapse'), '缺少分组折叠逻辑');
  assert.ok(!html.includes('（自动补天数）') && !html.includes('（支持上下键调节或点击日历）'), '括号备注未删除');
  assert.ok(app.includes('preloadFonts'), '缺少字体预加载');
});

console.log('\n[3] 资源文件完整性');
check('CSS 引用的字体文件均存在', () => {
  const css = read('style.css');
  const urls = Array.from(css.matchAll(/url\('(assets\/[^']+)'\)/g), (m) => m[1]);
  assert.ok(urls.length >= 6);
  urls.forEach((p) => assert.ok(fs.existsSync(path.join(ROOT, p)), '缺少 ' + p));
});
check('自托管字体均为有效 woff2，旧字体已移除', () => {
  const css = read('style.css');
  const urls = [...new Set(Array.from(css.matchAll(/url\('(assets\/fonts\/[^']+)'\)/g), (m) => m[1]))];
  assert.ok(urls.length >= 7, '字体声明过少');
  urls.forEach((p) => {
    const buf = fs.readFileSync(path.join(ROOT, p));
    assert.strictEqual(buf.slice(0, 4).toString('ascii'), 'wOF2', p + ' 不是有效 woff2');
  });
  ['orbitron-500-latin.woff2', 'orbitron-700-latin.woff2', 'cinzel-600-latin.woff2',
    'share-tech-mono-400.woff2', 'roboto-mono-700.woff2', 'dseg7-modern-700.woff2'].forEach((f) => {
    assert.ok(!fs.existsSync(path.join(ROOT, 'assets/fonts', f)), '旧字体未删除: ' + f);
  });
});
check('字体方案已更新且倒计时开关存在', () => {
  const app = read('app.js');
  const html = read('index.html');
  assert.ok(!/id: '(orbitron|cinzel|dsd7|sharetech|robotomono)'/.test(app), '仍引用已删除字体');
  ['modern', 'dseg7', 'spacemono', 'plexmono', 'outfit'].forEach((id) => {
    assert.ok(app.includes(`id: '${id}'`), '缺少字体 ' + id);
  });
  assert.ok(app.includes('DSEG7 Classic'), '数码管未切换到 DSEG7 Classic');
  assert.ok(html.includes('id="swCountdown"'), '缺少倒计时开关');
  assert.ok(html.includes('id="timeGhost"'), '缺少七段暗段底层');
  assert.ok(app.includes('showCountdown: true'), '缺少默认开启设置');
});
check('DEFAULT_BGS 引用的壁纸均存在', () => {
  const app = read('app.js');
  const urls = Array.from(app.matchAll(/url: '(assets\/[^']+)'/g), (m) => m[1]);
  assert.ok(urls.length >= 15);
  urls.forEach((p) => assert.ok(fs.existsSync(path.join(ROOT, p)), '缺少 ' + p));
});
check('1.2 历史版本快照完整', () => {
  ['README.md', 'app.js', 'db.js', 'index.html', 'style.css', 'ambient.js', 'particles.js', 'sound.js']
    .forEach((f) => assert.ok(fs.existsSync(path.join(ROOT, 'history/1.2', f)), '缺少 ' + f));
  // 顶层 17 项（15 张壁纸 + 1 个字体副本 + fonts/ 子目录）
  const entries = fs.readdirSync(path.join(ROOT, 'history/1.2/assets'));
  assert.ok(entries.length >= 16, '快照 assets 文件数异常：' + entries.length);
  assert.ok(entries.includes('fonts'), '缺少 fonts 子目录');
});

console.log('\n[4] 初始化链路（最小 DOM 环境）');

function makeEl(tag) {
  const classes = new Set();
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    id: '', className: '', textContent: '', value: '', checked: false,
    title: '', style: {}, dataset: {}, children: [],
    offsetWidth: 270, offsetHeight: 310,
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      }
    },
    appendChild(child) { this.children.push(child); return child; },
    insertBefore(child) { this.children.push(child); return child; },
    removeChild() {},
    setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return makeEl('div'); },
    querySelectorAll(sel) { return queryAll(sel); },
    closest() { return null; }, contains() { return false; },
    getBoundingClientRect() { return { left: 0, right: 100, top: 0, bottom: 30, width: 100, height: 30 }; },
    focus() {}, click() {}, blur() {},
    getContext() { return ctx2d; },
    toDataURL() { return 'data:image/png;base64,'; },
    toBlob(cb) { cb(null); }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return ''; },
    set() { el.children = []; }
  });
  return el;
}

const ctx2d = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : (typeof k === 'string' ? () => {} : undefined)),
  set: (t, k, v) => { t[k] = v; return true; }
});

function preset(sel, keys, prop) {
  return keys.map((k) => {
    const e = makeEl('button');
    e.dataset[prop] = k;
    return e;
  });
}
function queryAll(sel) {
  if (sel === '.modeBtn') return preset(sel, ['clock', 'pomodoro', 'stopwatch'], 'mode');
  if (sel === '.sTabBtn') return preset(sel, ['appearance', 'focus', 'date-todo', 'stats'], 'tab');
  if (sel === '.sTabPane') return preset(sel, [1, 2, 3, 4], 'x');
  if (sel === '#secStyleOpts .posOpt') return preset(sel, ['compact', 'equal'], 'sec');
  if (sel === '#particleOpts .particleOpt') return preset(sel, ['none', 'rain', 'snow', 'dust', 'fireflies'], 'effect');
  if (sel === '.ambPresetBtn') return preset(sel, ['rain', 'fire', 'library', 'waves'], 'preset');
  if (sel === '.dpPill') return preset(sel, ['7', '30', '100', '365'], 'days');
  return [];
}

const elCache = new Map();
function byKey(kind, key) {
  const k = kind + ':' + key;
  if (!elCache.has(k)) {
    const e = makeEl('div');
    if (kind === 'id') e.id = key;
    elCache.set(k, e);
  }
  return elCache.get(k);
}

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const documentStub = {
  body: makeEl('body'),
  documentElement: makeEl('html'),
  hidden: false,
  fullscreenElement: null,
  querySelector: (sel) => (sel.startsWith('#') ? byKey('id', sel.slice(1)) : byKey('sel', sel)),
  querySelectorAll: queryAll,
  getElementById: (id) => (id === 'particleCanvas' ? null : byKey('id', id)),
  createElement: (tag) => makeEl(tag),
  addEventListener() {}, removeEventListener() {},
  exitFullscreen() {}
};
documentStub.documentElement.requestFullscreen = () => {};

const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
  localStorage, document: documentStub,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  alert: () => {}, confirm: () => true,
  addEventListener() {}, removeEventListener() {},
  Image: class { set src(v) {} },
  URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
  Blob: class Blob {},
  AudioContext: undefined
};
const ctx = vm.createContext(sandbox);
ctx.window = ctx;
ctx.globalThis = ctx;

check('全部脚本加载并初始化无异常', () => {
  ['util.js', 'db.js', 'sound.js', 'ambient.js', 'particles.js', 'app.js'].forEach((f) => {
    vm.runInContext(read(f), ctx, { filename: f });
  });
  assert.ok(ctx.StudyUtil, 'StudyUtil 未挂载');
  assert.ok(ctx.StudyDB, 'StudyDB 未挂载');
  assert.ok(ctx.StudyAmbient, 'StudyAmbient 未挂载');
  assert.ok(ctx.StudyParticles, 'StudyParticles 未挂载');
  assert.ok(ctx.StudySound, 'StudySound 未挂载');
});
check('所有 JS 文件语法可解析', () => {
  ['util.js', 'db.js', 'sound.js', 'ambient.js', 'particles.js', 'app.js'].forEach((f) => {
    new vm.Script(read(f), { filename: f });
  });
});

// 给异步初始化（IndexedDB 降级探测、待写队列）一次微任务机会再退出
setImmediate(() => {
  console.log(`\n结果：${passed} 通过，${failed} 失败\n`);
  process.exit(failed ? 1 : 0);
});
