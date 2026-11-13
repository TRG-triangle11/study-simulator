/**
 * app.js — 自习模拟器（Study Simulator）核心交互逻辑 (v1.3)
 *
 * v1.3 主要变更：
 *   - 计时器改为 Date.now() 绝对时间戳 + 单一心跳，消除后台漂移与跨模式渲染竞争
 *   - 计时状态持久化，刷新/关闭页面可恢复；专注记录经待写队列保证不丢失
 *   - 统一显隐控制 updateVisibility()；倒数日正确显示 天/时/分
 *   - 日期全部采用本地时区（StudyUtil），统计按秒记录并兼容 1.2 数据
 *   - 自定义壁纸压缩为 Blob、错误回退、删除确认；IndexedDB 初始化不再阻塞渲染
 *   - 触摸设备常显入口、Esc 优先处理、可访问性增强
 */
(function () {
  "use strict";

  const U = window.StudyUtil;
  const TOUCH = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ===== 预设默认背景 ===== */
  const DEFAULT_BGS = [
    { id: 'black',             name: '默认·纯黑',      url: 'black' },
    { id: 'desk_city_night2',  name: '高楼夜景',       url: 'assets/desk_city_night_real.jpg' },
    { id: 'desk_city_night1',  name: '沿江高楼',       url: 'assets/city_moon_night_real.jpg' },
    { id: 'desk_window_dusk',  name: '高楼黄昏',       url: 'assets/desk_city_dusk_real.jpg' },
    { id: 'city_sunny',        name: '高楼俯瞰',       url: 'assets/city_sunny_real.jpg' },
    { id: 'city_night',        name: '高楼俯瞰·夜空',  url: 'assets/city_night_real.jpg' },
    /* v1.8.0：以下壁纸暂下架（图片待重新制作），保留名字占位，不可选 */
    { id: 'desk_sunny_real',   name: '书桌·晴天·写实', unavailable: true },
    { id: 'desk_sunny_anime',  name: '书桌·晴天·动漫', unavailable: true },
    { id: 'desk_rainy_real',   name: '书桌·雨天·写实', unavailable: true },
    { id: 'desk_rainy_anime',  name: '书桌·雨天·动漫', unavailable: true },
    { id: 'desk_sunset_real',  name: '书桌·黄昏·写实', unavailable: true },
    { id: 'desk_sunset_anime', name: '书桌·黄昏·动漫', unavailable: true },
    { id: 'desk_field_day',    name: '窗前·碧绿田野',  unavailable: true },
    { id: 'field_sunny',       name: '田野·晴空·自然', unavailable: true },
    { id: 'field_sunny_anime', name: '田野·晴空·动漫', unavailable: true },
    { id: 'field_night',       name: '田野·星夜·自然', unavailable: true }
  ];

  /* ===== 字体方案 ===== */
  const FONTS = [
    { id: 'modern',     name: '现代无衬线 (HarmonyOS)',    css: '"HarmonyOS Sans SC", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif', sample: '12:34:56' },
    { id: 'dseg7',      name: '数码管 (DSEG7 Classic)',    css: '"DSEG7 Classic", "Consolas", monospace', sample: '12:34:56', segment: true },
    { id: 'spacemono',  name: '几何等宽 (Space Mono)',      css: '"Space Mono", "Consolas", monospace', sample: '12:34:56' },
    { id: 'plexmono',   name: '工业等宽 (IBM Plex Mono)',   css: '"IBM Plex Mono", "Consolas", monospace', sample: '12:34:56' },
    { id: 'outfit',     name: '圆润数字 (Outfit)',          css: '"Outfit", "Segoe UI", sans-serif', sample: '12:34:56' }
  ];

  /* ===== 励志/专注寄语 ===== */
  const MOTTO_LIST = [
    "追光的人，终会万丈光芒。",
    "星光不问赶路人，时光不负有心人。",
    "行远自迩，笃行不怠。",
    "不积跬步，无以至千里。",
    "千里之行，始于足下。",
    "宁静致远，淡泊明志。",
    "博观而约取，厚积而薄发。",
    "读书百遍，其义自见。",
    "业精于勤荒于嬉。",
    "行百里者半九十。",
    "锲而不舍，金石可镂。",
    "精诚所至，金石为开。",
    "工欲善其事，必先利其器。",
    "天行健，君子以自强不息。",
    "地势坤，君子以厚德载物。",
    "苟日新，日日新，又日新。",
    "士不可以不弘毅，任重而道远。",
    "君子藏器于身，待时而动。",
    "路漫漫其修远兮，吾将上下而求索。",
    "知之者不如好之者，好之者不如乐之者。",
    "莫道桑榆晚，为霞尚满天。",
    "悟已往之不谏，知来者之可追。",
    "少壮不努力，老大徒伤悲。",
    "及时当勉励，岁月不待人。",
    "盛年不重来，一日难再晨。",
    "一寸光阴一寸金。",
    "莫等闲，白了少年头，空悲切。",
    "三更灯火五更鸡，正是男儿读书时。",
    "黑发不知勤学早，白首方悔读书迟。",
    "学如逆水行舟，不进则退。",
    "宝剑锋从磨砺出，梅花香自苦寒来。",
    "长风破浪会有时，直挂云帆济沧海。",
    "会当凌绝顶，一览众山小。",
    "天生我材必有用。",
    "山重水复疑无路，柳暗花明又一村。",
    "沉舟侧畔千帆过，病树前头万木春。",
    "千磨万击还坚劲，任尔东西南北风。",
    "文章千古事，得失寸心知。",
    "腹有诗书气自华。",
    "问渠那得清如许，为有源头活水来。",
    "纸上得来终觉浅，绝知此事要躬行。",
    "高山仰止，景行行止。",
    "心之所向，素履以往。",
    "念念不忘，必有回响。",
    "书山有路勤为径，学海无涯苦作舟。",
    "少年何妨梦摘星，敢挽桑弓射玉衡。",
    "追风赶月莫停留，平芜尽处是春山。",
    "乾坤未定，你我皆是黑马。",
    "凡是过往，皆为序章。",
    "愿你历尽千帆，归来仍是少年。",
    "每一个专注的当下，都在构筑未来的你。",
    "保持热爱，奔赴山海。",
    "心有所向，日复一日，必有精进。",
    "沉下心来，把一件事做到极致。",
    "慢慢来，谁不是翻山越岭去相见。",
    "种一棵树最好的时间是十年前，其次是现在。",
    "坚持很难，但放弃会更遗憾。",
    "既然选择了远方，便只顾风雨兼程。",
    "答案在路上，自由在风里。",
    "自律是通往自由的唯一途径。",
    "日拱一卒无懈怠，功不唐捐终成器。",
    "今日事今日毕，莫把光阴空蹉跎。",
    "远方有灯，脚下有路，眼前有光。",
    "专注当下，不负韶华。",
    "每一个不曾起舞的日子，都是对生命的辜负。",
    "耐得住寂寞，才守得住繁华。",
    "与其临渊羡鱼，不如退而结网。",
    "你只管努力，剩下的交给时间。",
    "把今天过好，明天自然不会差。",
    "你走过的每一步，都算数。",
    "别怕走得慢，只怕站着不动。",
    "认真的人，运气不会太差。",
    "所有的自律，都是在给未来铺路。",
    "安静地变强，是给自己最好的礼物。",
    "把喜欢的事做到极致，就是天赋。",
    "心若有所向往，何惧道阻且长。",
    "今天多学一点，明天就多一份底气。",
    "所有伟大，都源于一个勇敢的开始。",
    "与其抱怨黑暗，不如点亮蜡烛。",
    "光会照进来，只要你把窗打开。",
    "我思故我在。—— 笛卡尔",
    "人是一根会思想的芦苇。—— 帕斯卡",
    "知识就是力量。—— 培根",
    "凡不能杀死我的，必使我更强大。—— 尼采",
    "知道自己为什么而活，就能忍受任何一种生活。—— 尼采",
    "想到达高处，就用自己的双腿。—— 尼采",
    "最重要的不是位置，而是方向。—— 霍姆斯",
    "你的时间有限，不要为别人而活。—— 乔布斯",
    "求知若饥，虚心若愚。—— 乔布斯",
    "天才是一分灵感加九十九分汗水。—— 爱迪生",
    "世上只有一种英雄主义，是看清生活后仍热爱它。—— 罗曼·罗兰",
    "冬天来了，春天还会远吗？—— 雪莱",
    "我们都在阴沟里，但仍有人仰望星空。—— 王尔德",
    "生命不止，奋斗不息。—— 卡莱尔",
    "梦想还是要有的，万一实现了呢。",
    "慢一点没关系，方向对就好。",
    "今天比昨天好，就是希望。",
    "热爱可抵岁月漫长。",
    "你若盛开，清风自来。",
    "越努力，越幸运。",
    "没有一朵花，从一开始就是花。",
    "山高自有客行路，水深自有渡船人。",
    "只要路是对的，就不怕路远。",
    "熬过无人问津的时光，才有诗和远方。",
    "欲穷千里目，更上一层楼。",
    "向光而行，一路繁花相送。",
    "读书是最低门槛的高贵。",
    "你所坚持的，终将美好呈现。",
    "静水流深，厚积薄发。",
    "聚沙成塔，集腋成裘。",
    "把普通的每一天过得热气腾腾。",
    "流年不负，岁月可期。",
    "星光会照亮赶路的人。",
    "静下心来，听见自己成长的声音。",
  ];

  /* ===== 持久化 ===== */
  const SKEY = 'studySimSettings', TKEY = 'studySimTodos',
        TIMER_KEY = 'studySimTimers', PENDING_KEY = 'studySimPendingRecords',
        OBKEY = 'studySimOnboardSeen';

  function readJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v == null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { console.warn('本地保存失败:', key, e); }
  }
  function loadSettings() {
    const s = readJSON(SKEY, {});
    return (s && typeof s === 'object' && !Array.isArray(s)) ? s : {};
  }
  function loadTodos() {
    const t = readJSON(TKEY, null);
    if (t && typeof t === 'object' && !Array.isArray(t)) {
      return { L: Array.isArray(t.L) ? t.L : [], R: Array.isArray(t.R) ? t.R : [] };
    }
    return { L: [], R: [] };
  }
  function saveSettings() { writeJSON(SKEY, state.settings); }
  function saveTodos() { writeJSON(TKEY, state.todos); }

  function getDefaultTargetDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setHours(0, 0, 0, 0);
    return U.localDateKey(d); // v1.3：本地日期，避免 UTC 少一天
  }

  const initialSettings = Object.assign({
    mode: 'clock', font: 'modern', size: 120, flip: true,
    bg: 'black', dim: 0.62,
    showSec: true, secStyle: 'equal',
    showDate: true, dateSize: 22, dateSpacing: 0.22,
    showYear: true, showMonthDay: true, showWeekday: true,
    todoSize: 14, todoOpacity: 0.6, todoSide: 'L', showMotto: true, showCountdown: false,
    soundEnabled: true, pomoWorkMin: 25, pomoBreakMin: 5,
    targetTitle: '距离 目标 还有', targetDate: getDefaultTargetDate(),
    particleEffect: 'rain', rainSpeed: 2, rainDensity: 2, screenFx: false,
    pomoTimeStyle: 'adaptive', swTimeStyle: 'adaptive'
  }, loadSettings());

  // 兼容迁移历史版本废弃的壁纸 id
  const obsoleteBgMap = {
    nature_valley: 'desk_sunny_real', city_night_anime: 'desk_city_night2',
    classroom_anime: 'desk_sunny_anime', classroom_real: 'desk_sunny_real',
    library_anime: 'desk_rainy_anime', library_real: 'desk_rainy_real',
    desk_anime: 'desk_rainy_anime', desk_real: 'desk_sunny_real',
    window_anime: 'desk_sunny_anime', window_real: 'desk_rainy_real',
    window_sunny_anime: 'desk_sunny_anime', window_sunny_real: 'desk_sunny_real',
    window_rainy_anime: 'desk_rainy_anime', window_rainy_real: 'desk_rainy_real'
  };
  if (obsoleteBgMap[initialSettings.bg]) initialSettings.bg = obsoleteBgMap[initialSettings.bg];

  // v1.3.2 字体方案变更：让旧设置平滑迁移，不出现「选中项为空」
  // v1.4.0 再次精简字体：屏显等宽、简洁等宽已移除，旧设置迁移到相近的等宽方案
  const obsoleteFontMap = {
    orbitron: 'spacemono', cinzel: 'modern', dsd7: 'dseg7',
    sharetech: 'spacemono', robotomono: 'plexmono', dsegmodern: 'dseg7'
  };
  if (obsoleteFontMap[initialSettings.font]) initialSettings.font = obsoleteFontMap[initialSettings.font];

  // v1.3.4：倒数日模式已移除，旧设置回落到时钟；正计时重新作为独立模式
  if (!['clock', 'pomodoro', 'stopwatch'].includes(initialSettings.mode)) initialSettings.mode = 'clock';

  // v1.6.0：特效改为「屏幕效果开关 + 同级选项」，旧的独立「玻璃雨滴」开关迁移为「窗户雨滴」选项
  const FX_LIST = ['rain', 'snow', 'dust', 'fireflies', 'windowRain'];
  if (initialSettings.glassRain) {
    initialSettings.screenFx = true;
    initialSettings.particleEffect = 'windowRain';
  }
  if (FX_LIST.indexOf(initialSettings.particleEffect) < 0) initialSettings.particleEffect = 'rain';
  delete initialSettings.glassRain;

  /* ===== 计时器持久化状态 ===== */
  function defaultTimers(workSec) {
    return {
      pomodoro: { status: 'work', remaining: workSec, endAt: 0, isRunning: false, rounds: 0, phaseTotal: workSec },
      stopwatch: { baseElapsed: 0, startedAt: 0, isRunning: false, archivedSeconds: 0, autoPaused: false }
    };
  }
  function loadTimers() {
    const t = readJSON(TIMER_KEY, null);
    if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
    // 兼容 v1.3.1~v1.3.3 的 { pomodoro } 结构、v1.3.0 的 { pomodoro, stopwatch } 与更早期扁平结构
    const p = t.pomodoro || t, s = t.stopwatch || {};
    const workSec = (initialSettings.pomoWorkMin || 25) * 60;
    return {
      pomodoro: {
        status: p.status === 'break' ? 'break' : 'work',
        remaining: U.clamp(p.remaining, 0, 7200, workSec),
        endAt: Number.isFinite(Number(p.endAt)) ? Number(p.endAt) : 0,
        isRunning: !!p.isRunning,
        rounds: U.clamp(p.rounds, 0, 9999, 0),
        phaseTotal: U.clamp(p.phaseTotal, 1, 7200, workSec)
      },
      stopwatch: {
        baseElapsed: U.clamp(s.baseElapsed, 0, 864000, 0),
        startedAt: Number.isFinite(Number(s.startedAt)) ? Number(s.startedAt) : 0,
        isRunning: !!s.isRunning,
        archivedSeconds: U.clamp(s.archivedSeconds, 0, 864000, 0),
        autoPaused: !!s.autoPaused
      }
    };
  }
  function saveTimers() {
    writeJSON(TIMER_KEY, { pomodoro: state.pomodoro, stopwatch: state.stopwatch });
  }

  /* ===== 专注记录待写队列（保证刷新 / 关闭不丢数据） ===== */
  function queuePendingRecord(type, seconds, timestamp) {
    const list = readJSON(PENDING_KEY, []);
    const arr = Array.isArray(list) ? list : [];
    arr.push({ type: type, durationSeconds: Math.round(seconds), timestamp: timestamp || Date.now() });
    writeJSON(PENDING_KEY, arr.slice(-30));
  }
  async function flushPendingRecords() {
    if (!window.StudyDB) return;
    const list = readJSON(PENDING_KEY, []);
    if (!Array.isArray(list) || !list.length) return;
    for (const r of list) {
      const ok = await window.StudyDB.addFocusRecord(r);
      if (!ok) return; // 数据库不可用：保留队列，下次重试
    }
    try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
  }
  function recordFocus(type, seconds) {
    if (seconds < 60) return;
    queuePendingRecord(type, seconds, Date.now());
    flushPendingRecords();
  }

  const persisted = loadTimers() || defaultTimers((initialSettings.pomoWorkMin || 25) * 60);
  const state = {
    settings: initialSettings,
    todos: loadTodos(),
    customBgs: [],
    dbAvailable: true,
    pomodoro: persisted.pomodoro,
    stopwatch: persisted.stopwatch,
    mottoIndex: 0,
    zenMode: false
  };

  /* ===== DOM 元素 ===== */
  const $ = (s) => document.querySelector(s);
  const elBg = $('#bg'), elVignette = $('#vignette'),
        elClock = $('#clock'), elDate = $('#date'),
        elTH = $('#tH'), elTM = $('#tM'), elTS = $('#tS'),
        elSecWrap = $('#time > .sec-wrap'), elTime = $('#time'),
        zoneL = $('#todoZoneLeft'), zoneR = $('#todoZoneRight'),
        remindL = $('#todoRemindL'), remindR = $('#todoRemindR'),
        settingsEl = $('#settings'), settingsBox = $('#settingsBox'),
        fontDetail = $('#fontDetail'), fdGrid = $('#fdGrid'),
        fontEntry = $('#fontEntry'), feCurName = $('#feCurName'),
        fsBtn = $('#fsBtn'), fileInput = $('#fileInput');

  const modeBar = $('#modeBar'),
        timerBadge = $('#timerBadge'), countdownLine = $('#countdownLine'),
        timerControls = $('#timerControls'), timerToggleBtn = $('#timerToggleBtn'),
        timerResetBtn = $('#timerResetBtn'), timerSkipBtn = $('#timerSkipBtn'),
        mottoWrap = $('#mottoWrap'), mottoText = $('#mottoText');

  /* ===== 背景：异步加载，绝不阻塞主渲染 ===== */
  let _appliedBg = null;
  let lazyObserver = null;

  /* v1.7.4：App 模式启动页在壁纸就绪后淡出（网页模式 splash 从不显示，调用无副作用） */
  let _splashGone = false;
  function dismissSplash() {
    if (_splashGone) return;
    _splashGone = true;
    const sp = document.getElementById('splash');
    if (!sp) return;
    sp.classList.add('gone');
    setTimeout(() => { try { sp.remove(); } catch (e) { /* 忽略 */ } }, 600);
  }

  /* v1.8.0：壁纸改版——只保留 6 张在用壁纸；其余暂下架（图片待重新制作），
     保留名字占位且不可选。unavailable 条目 resolveBg 返回 null */
  function resolveBg(bgId) {
    const c = state.customBgs || [];
    for (let i = 0; i < c.length; i++) if (c[i].id === bgId) return c[i].url;
    for (let j = 0; j < DEFAULT_BGS.length; j++) {
      if (DEFAULT_BGS[j].id === bgId) return DEFAULT_BGS[j].unavailable ? null : DEFAULT_BGS[j].url;
    }
    return 'black';
  }

  function applyBg() {
    let url = resolveBg(state.settings.bg);
    /* v1.8.0：当前壁纸已下架（图片待重制）则自动回落到默认·纯黑 */
    if (url === null) {
      state.settings.bg = 'black';
      saveSettings();
      url = 'black';
    }
    elVignette.style.opacity = U.clamp(state.settings.dim, 0.15, 1, 0.62);
    syncWindowRainBackdrop();
    if (url === _appliedBg) return;

    if (url === 'black') {
      elBg.style.backgroundImage = 'none';
      elBg.style.backgroundColor = '#0a0c10';
      _appliedBg = 'black';
      dismissSplash();
      return;
    }
    elBg.style.backgroundColor = '';
    /* v1.7.3：先用 IndexedDB 里的本地副本秒显壁纸，不等网络——
       版本更新后网络慢时不再黑屏干等 */
    if (window.StudyDB && window.StudyDB.kvGet) {
      window.StudyDB.kvGet('bg:' + url).then((blob) => {
        if (blob && resolveBg(state.settings.bg) === url) {
          elBg.style.backgroundImage = `url("${URL.createObjectURL(blob)}")`;
          _appliedBg = url;
          dismissSplash();
        }
      }).catch(() => {});
    }
    const img = new Image();
    img.onload = () => {
      elBg.style.backgroundImage = `url("${url}")`;
      _appliedBg = url;
      dismissSplash();
      /* 顺手把壁纸存一份到本地（经 SW 媒体缓存命中，开销极小），供下次秒显 */
      if (window.StudyDB && window.StudyDB.kvPut && !/^(blob:|data:)/.test(url)) {
        fetch(url).then((r) => (r.ok ? r.blob() : null))
          .then((b) => { if (b) return window.StudyDB.kvPut('bg:' + url, b); })
          .catch(() => {});
      }
    };
    img.onerror = () => {
      // v1.3：加载失败回退默认壁纸，不再留下永久空白
      console.warn('壁纸加载失败，回退默认壁纸:', url);
      _appliedBg = null;
      if (state.settings.bg !== 'black') {
        state.settings.bg = 'black';
        saveSettings();
      }
      applyBg();
    };
    img.src = url;
  }

  function updateDbHint() {
    const hint = $('#dbHint');
    if (!hint) return;
    hint.style.display = state.dbAvailable ? 'none' : 'block';
    hint.textContent = state.dbAvailable
      ? ''
      : '⚠️ 当前环境无法使用本地数据库（IndexedDB）。自定义壁纸与专注统计仅在本次会话内有效，建议通过本地静态服务器打开。';
  }

  async function initBackgroundStorage() {
    let stored = [];
    if (window.StudyDB) {
      state.dbAvailable = await window.StudyDB.probe();
      if (state.dbAvailable) {
        const oldBgs = state.settings.customBgs;
        if (Array.isArray(oldBgs) && oldBgs.length) {
          for (const bg of oldBgs) await window.StudyDB.saveBg(bg);
          delete state.settings.customBgs;
          saveSettings();
        }
        stored = await window.StudyDB.getAllBgs();
      }
    }
    state.customBgs = (stored || []).map((b) => {
      const item = Object.assign({}, b);
      if (item.blob && typeof Blob !== 'undefined' && item.blob instanceof Blob) {
        item.url = URL.createObjectURL(item.blob);
        item.objectUrl = item.url;
      }
      return item;
    });
    buildBgGrid();
    applyBg();
    updateDbHint();
  }

  function buildBgGrid() {
    const grid = $('#bgGrid');
    if (!grid) return;
    grid.innerHTML = '';
    if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
    if ('IntersectionObserver' in window) {
      lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const url = entry.target.dataset.bgUrl;
          if (url) entry.target.style.backgroundImage = `url("${url}")`;
          lazyObserver.unobserve(entry.target);
        });
      }, { root: document.querySelector('#bgDetailBox') || null });
    }

    const customCards = (state.customBgs || []).map((b) => ({
      id: b.id, name: '自定义', url: b.url, custom: true, objectUrl: b.objectUrl
    }));
    const all = customCards.concat(DEFAULT_BGS);

    // 入口行显示当前壁纸名称
    const curBg = all.find((b) => b.id === state.settings.bg);
    const curNameEl = $('#bgCurName');
    if (curNameEl) curNameEl.textContent = curBg ? (curBg.custom ? '自定义壁纸' : curBg.name) : '默认壁纸';

    all.forEach((b) => {
      const div = document.createElement('div');
      div.className = 'bgCard' + (b.id === state.settings.bg ? ' active' : '');
      if (b.url === 'black') {
        div.style.backgroundColor = '#0a0c10';
      } else if (b.url) {
        if (lazyObserver) { div.dataset.bgUrl = b.url; lazyObserver.observe(div); }
        else div.style.backgroundImage = `url("${b.url}")`;
      }

      if (b.custom) {
        div.innerHTML = '<span class="tag">自定义</span><button class="rm" title="删除此背景" aria-label="删除此自定义壁纸">✕</button>';
        div.onclick = (e) => {
          if (e.target.classList.contains('rm')) return;
          state.settings.bg = b.id; saveSettings(); buildBgGrid(); applyBg();
        };
        div.querySelector('.rm').onclick = async (e) => {
          e.stopPropagation();
          if (!window.confirm('确定删除这张自定义壁纸吗？此操作不可撤销。')) return;
          if (window.StudyDB) await window.StudyDB.deleteBg(b.id);
          if (b.objectUrl) URL.revokeObjectURL(b.objectUrl);
          state.customBgs = state.customBgs.filter((x) => x.id !== b.id);
          if (state.settings.bg === b.id) { state.settings.bg = 'black'; _appliedBg = null; }
          saveSettings(); buildBgGrid(); applyBg();
        };
      } else {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = b.name;
        div.appendChild(tag);
        /* v1.8.0：暂下架的壁纸只保留名字占位，不可选 */
        if (b.unavailable) {
          div.classList.add('off');
          const note = document.createElement('span');
          note.className = 'offNote';
          note.textContent = '待重制';
          div.appendChild(note);
        } else {
          div.onclick = () => {
            state.settings.bg = b.id; saveSettings(); buildBgGrid(); applyBg();
          };
        }
      }
      grid.appendChild(div);
    });

    const upCard = document.createElement('div');
    upCard.className = 'bgCard upload';
    upCard.id = 'bgUpload';
    upCard.title = '上传自定义壁纸（压缩后保存在本地数据库）';
    upCard.innerHTML = '<span class="upPlus">＋</span><span class="upLabel">自定义壁纸</span>';
    upCard.onclick = () => { if (fileInput) fileInput.click(); };
    grid.appendChild(upCard);
  }

  /* 上传：校验 → 压缩为 Blob → 存入 IndexedDB */
  const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
  const SUPPORTS_WEBP = (() => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      return c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const srcUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const maxSide = 1920;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(srcUrl);
        c.toBlob((blob) => {
          if (!blob) return reject(new Error('图片压缩失败'));
          resolve({ blob: blob, url: URL.createObjectURL(blob) });
        }, SUPPORTS_WEBP ? 'image/webp' : 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(srcUrl); reject(new Error('图片解码失败')); };
      img.src = srcUrl;
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', function (ev) {
      const f = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) { alert('请选择有效的图片文件'); return; }
      if (f.size > MAX_UPLOAD_BYTES) { alert('图片过大（上限 20 MB），请压缩后再上传'); return; }

      compressImage(f).then((result) => {
        const id = 'custom_' + Date.now();
        const item = { id: id, name: '自定义', blob: result.blob, created_at: Date.now() };
        const saving = window.StudyDB ? window.StudyDB.saveBg(item) : Promise.resolve(null);
        return Promise.resolve(saving).then((ok) => {
          if (!ok) state.dbAvailable = false;
          state.customBgs.push(Object.assign({}, item, { url: result.url, objectUrl: result.url }));
          state.settings.bg = id;
          saveSettings(); buildBgGrid(); applyBg(); updateDbHint();
        });
      }).catch((err) => {
        console.warn('自定义壁纸处理失败:', err);
        alert('图片处理失败，请换一张重试');
      });
    });
  }

  /* ===== 字体 ===== */
  function isSegmentFont() {
    const fn = FONTS.find((x) => x.id === state.settings.font);
    return !!(fn && fn.segment);
  }
  function syncGhostSeconds() {
    const ghost = $('#timeGhost');
    if (!ghost) return;
    const ghostSec = ghost.querySelector('.sec-wrap');
    if (ghostSec) ghostSec.style.display = elSecWrap.style.display;
  }
  function applyFont() {
    const fn = FONTS.find((x) => x.id === state.settings.font) || FONTS[0];
    elTime.style.fontFamily = fn.css;
    if (feCurName) feCurName.textContent = fn.name;
    applySecStyle();
  }
  function buildFonts() {
    const fn = FONTS.find((x) => x.id === state.settings.font) || FONTS[0];
    if (feCurName) feCurName.textContent = fn.name;
  }
  function buildFdGrid() {
    if (!fdGrid) return;
    fdGrid.innerHTML = '';
    FONTS.forEach((fn) => {
      const c = document.createElement('div');
      c.className = 'fdCard' + (fn.id === state.settings.font ? ' active' : '');
      const pre = document.createElement('div');
      pre.className = 'fdPre' + (fn.segment ? ' segment' : ''); pre.textContent = fn.sample; pre.style.fontFamily = fn.css;
      const name = document.createElement('div');
      name.className = 'fdName'; name.textContent = fn.name;
      c.appendChild(pre); c.appendChild(name);
      c.onclick = () => {
        state.settings.font = fn.id; saveSettings(); applyFont();
        buildFdGrid(); buildFonts(); closeFontDetail();
      };
      fdGrid.appendChild(c);
    });
  }
  function openFontDetail() { buildFdGrid(); if (fontDetail) fontDetail.classList.add('show'); }
  function closeFontDetail() { if (fontDetail) fontDetail.classList.remove('show'); }
  function openBgDetail() {
    buildBgGrid();
    const el = $('#bgDetail');
    if (el) el.classList.add('show');
  }
  function closeBgDetail() {
    const el = $('#bgDetail');
    if (el) el.classList.remove('show');
  }
  function applyFlip() { elTime.classList.toggle('flip', !!state.settings.flip); }

  /* ===== 字号（监听器只绑定一次） ===== */
  let sizeBound = false;

  /* 窄屏自适应：先按基准字号渲染，实测超宽再等比回缩，
     避免手机上「大时钟 / 日期」超出屏幕被裁掉。 */
  function fitToWidth(el, basePx, minPx) {
    if (!el) return;
    el.style.fontSize = basePx + 'px';
    const avail = Math.max(80, window.innerWidth - 40);
    const w = el.scrollWidth || 0;
    if (w > avail) {
      el.style.fontSize = Math.max(minPx, Math.floor(basePx * avail / w)) + 'px';
    }
  }

  function applyClockSize() {
    fitToWidth(elTime, U.clamp(state.settings.size, 48, 200, 120), 30);
  }

  /* 竖屏窄屏下统一重排一次字号（旋转屏幕、拖动窗口也会触发） */
  let relayoutTimer = null;
  function relayoutForViewport() {
    applyClockSize();
    applyDate();
    renderCountdownLine();
  }
  function syncSize() {
    const px = U.clamp(state.settings.size, 48, 200, 120);
    const range = $('#sizeRange');
    if (range) range.value = px;
    $('#sizeVal').textContent = px + 'px';
    $('#sizeOut').textContent = px;
    applyClockSize();
  }
  function bindSizeControl() {
    const range = $('#sizeRange');
    if (!range || sizeBound) return;
    sizeBound = true;
    range.addEventListener('input', () => {
      elTime.style.fontSize = range.value + 'px';
      $('#sizeVal').textContent = range.value + 'px';
      $('#sizeOut').textContent = range.value;
    });
    range.addEventListener('change', () => {
      state.settings.size = parseInt(range.value, 10);
      saveSettings(); applyClockSize();
    });
  }

  /* ===== 辅助 ===== */
  const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const pad = (n) => (n < 10 ? '0' : '') + n;

  /* ===== 统一显隐 / 模式 ===== */
  function updateVisibility() {
    const m = state.settings.mode;
    elClock.dataset.mode = m;
    elTime.dataset.mode = m;
    // v1.7.8：日期只在时钟模式显示（用户要求正计时/番茄钟隐藏日期）；
    // 倒计时行仍由各自开关控制
    elDate.style.display = (state.settings.showDate && m === 'clock') ? '' : 'none';
    countdownLine.style.display = state.settings.showCountdown !== false ? '' : 'none';
    // 正计时以秒为主要信息，忽略「显示秒数」开关；其余模式尊重开关
    elSecWrap.style.display = (state.settings.showSec || m === 'stopwatch') ? '' : 'none';
    timerBadge.style.display = (m === 'pomodoro' || m === 'stopwatch') ? 'inline-flex' : 'none';
    timerControls.style.display = (m === 'pomodoro' || m === 'stopwatch') ? 'flex' : 'none';
    timerSkipBtn.style.display = m === 'pomodoro' ? 'inline-flex' : 'none';
    renderCountdownLine();
    // 秒区显隐与「缩小 / 等大」必须一起应用：只同步暗段而不更新 class，
    // 会让切换按钮看起来无效（要等下次打开设置刷新时才生效）
    applySecStyle();
    if (m === 'pomodoro') updatePomoBadge();
    else if (m === 'stopwatch') { timerBadge.className = ''; timerBadge.textContent = '正向专注计时'; }
    updateTimerControls();
    applyClockSize();
  }

  function setMode(mode, silent) {
    if (!['clock', 'pomodoro', 'stopwatch'].includes(mode)) mode = 'clock';
    state.settings.mode = mode;
    saveSettings();
    document.querySelectorAll('.modeBtn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    // v1.7.8：设置面板里的显示模式按钮同步高亮
    document.querySelectorAll('#modeSwitchGroup .sideOpt').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    updateVisibility();
    renderCurrentMode();
    if (!silent) showModeBarTemporarily(1800);
  }

  function renderCurrentMode() {
    // 时钟模式显示实时时间，番茄钟显示剩余时间，正计时显示累计时长；三种情况大时钟都在
    const m = state.settings.mode;
    if (m === 'pomodoro') renderPomodoroTime();
    else if (m === 'stopwatch') renderStopwatchTime();
    else renderClockTime();
  }

  // 日期文字独立于时钟渲染：番茄钟模式下也要能跨零点 / 跨天更新
  function renderDateText() {
    if (!state.settings.showDate) return;
    const now = new Date();
    const parts = [];
    if (state.settings.showYear) parts.push(now.getFullYear() + ' 年');
    if (state.settings.showMonthDay) parts.push((now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日');
    if (state.settings.showWeekday) parts.push('\u3000' + WEEK[now.getDay()]);
    const text = parts.join(' ');
    if (elDate.textContent !== text) elDate.textContent = text;
  }

  function renderClockTime() {
    const now = new Date();
    /* v1.7.10：时钟永远显示小时段——番茄钟/正计时的「两段」标记会残留在容器上，
       不清除的话切回时钟只剩分钟和秒（如 1:09 只显示 09） */
    elTime.classList.remove('no-hour');
    elTH.textContent = pad(now.getHours());
    elTM.textContent = pad(now.getMinutes());
    elTS.textContent = pad(now.getSeconds());
    renderDateText();
  }

  /* ===== 番茄钟（绝对时间戳） ===== */
  function updatePomoBadge() {
    if (!timerBadge) return;
    const isWork = state.pomodoro.status === 'work';
    timerBadge.className = isWork ? '' : 'break';
    timerBadge.textContent = isWork
      ? `专注中 · 第 ${state.pomodoro.rounds + 1} 轮`
      : '小憩休息中 · 舒展一下';
  }
  function renderPomodoroTime() {
    const rem = U.pomodoroRemaining(state.pomodoro, Date.now());
    applyDurationParts(rem, 'pomoTimeStyle');
  }
  function togglePomodoro() {
    if (state.pomodoro.isRunning) pausePomodoro(); else startPomodoro();
    updateTimerControls();
  }
  function startPomodoro() {
    const p = state.pomodoro;
    if (p.isRunning) return;
    p.isRunning = true;
    p.endAt = Date.now() + p.remaining * 1000;
    saveTimers();
    if (window.StudySound && state.settings.soundEnabled) window.StudySound.playSoftTick();
    updateTimerControls();
  }
  function pausePomodoro() {
    const p = state.pomodoro;
    if (p.isRunning) p.remaining = U.pomodoroRemaining(p, Date.now());
    p.isRunning = false; p.endAt = 0;
    saveTimers(); updateTimerControls();
  }
  function resetPomodoro() {
    const p = state.pomodoro;
    p.isRunning = false; p.endAt = 0; p.status = 'work';
    p.remaining = (state.settings.pomoWorkMin || 25) * 60;
    p.phaseTotal = p.remaining;
    saveTimers(); updatePomoBadge(); renderCurrentMode(); updateTimerControls();
  }
  function switchPomodoroStage(isSkip) {
    const p = state.pomodoro;
    if (p.status === 'work') {
      if (!isSkip) {
        recordFocus('pomodoro', p.phaseTotal); // 按本阶段实际总秒数归档
        p.rounds++;
      }
      p.status = 'break';
      p.remaining = (state.settings.pomoBreakMin || 5) * 60;
    } else {
      p.status = 'work';
      p.remaining = (state.settings.pomoWorkMin || 25) * 60;
    }
    p.phaseTotal = p.remaining;
    p.isRunning = false; p.endAt = 0;
    saveTimers(); updatePomoBadge(); renderCurrentMode(); updateTimerControls();
  }
  function handlePomodoroStageEnd(isSkip) {
    pausePomodoro();
    if (!isSkip && window.StudySound && state.settings.soundEnabled) window.StudySound.playFocusChime();
    switchPomodoroStage(!!isSkip);
  }
  function skipPomodoroStage() {
    pausePomodoro();
    switchPomodoroStage(true); // 跳过不归档、不计轮数
  }

  /* ===== 正计时（绝对时间戳，不逐秒累加） ===== */
  function currentStopwatchSeconds() { return U.stopwatchElapsed(state.stopwatch, Date.now()); }
  function renderStopwatchTime() {
    applyDurationParts(currentStopwatchSeconds(), 'swTimeStyle');
  }

  /* ===== v1.7.8：时长两段/三段自适应渲染 =====
   * adaptive（默认）：< 1 小时显示 MM:SS；达到 1 小时自动变 H:MM:SS
   * totalMinutes：始终 MM:SS，MM 为总分钟（可超过 59，如 75:00 表示 75 分钟）
   * 隐藏小时段时同步隐藏翻页框暗段，避免数码管模式下错位 */
  function applyDurationParts(totalSeconds, styleKey) {
    const style = state.settings[styleKey] || 'adaptive';
    const total = Math.max(0, Math.floor(totalSeconds));
    const showH = style === 'totalMinutes' ? false : total >= 3600;
    const h = Math.floor(total / 3600);
    const m = showH ? Math.floor((total % 3600) / 60) : Math.floor(total / 60);
    const s = total % 60;
    elTime.classList.toggle('no-hour', !showH);
    elTH.textContent = pad(showH ? h : 0);
    elTM.textContent = pad(m);
    elTS.textContent = pad(s);
  }
  function toggleStopwatch() {
    if (state.stopwatch.isRunning) pauseStopwatch(); else startStopwatch();
    updateTimerControls();
  }
  function startStopwatch() {
    const s = state.stopwatch;
    if (s.isRunning) return;
    s.startedAt = Date.now(); s.isRunning = true; s.autoPaused = false;
    saveTimers();
    if (window.StudySound && state.settings.soundEnabled) window.StudySound.playSoftTick();
    updateTimerControls();
  }
  function pauseStopwatch() {
    const s = state.stopwatch;
    if (s.isRunning) s.baseElapsed = currentStopwatchSeconds();
    s.isRunning = false; s.startedAt = 0;
    saveTimers(); updateTimerControls();
  }
  function resetStopwatch() {
    const s = state.stopwatch;
    const total = currentStopwatchSeconds();
    const delta = Math.max(0, total - (s.archivedSeconds || 0));
    if (delta >= 60) recordFocus('stopwatch', delta);
    s.isRunning = false; s.startedAt = 0; s.baseElapsed = 0;
    s.archivedSeconds = 0; s.autoPaused = false;
    saveTimers(); renderCurrentMode(); updateTimerControls();
  }

  /* ===== 目标倒数日：主界面一行文字，只按天计 ===== */
  function renderCountdownLine() {
    const days = U.daysUntil(state.settings.targetDate);
    const title = (state.settings.targetTitle || '距离 目标 还有').trim();
    countdownLine.textContent = `${title}${days}天`;
  }

  function updateTimerControls() {
    const m = state.settings.mode;
    if (m === 'pomodoro') {
      timerToggleBtn.textContent = state.pomodoro.isRunning ? '⏸ 暂停' : '▶ 开始专注';
      timerToggleBtn.classList.toggle('primary', !state.pomodoro.isRunning);
    } else if (m === 'stopwatch') {
      timerToggleBtn.textContent = state.stopwatch.isRunning
        ? '⏸ 暂停'
        : (state.stopwatch.autoPaused ? '▶ 继续计时' : '▶ 开始计时');
      timerToggleBtn.classList.toggle('primary', !state.stopwatch.isRunning);
    }
  }

  /* ===== 单一心跳（对齐整秒，渲染只在这里发生） ===== */
  let heartbeatId = null;
  function scheduleTick() {
    clearTimeout(heartbeatId);
    const delay = 1000 - (Date.now() % 1000) + 20;
    heartbeatId = setTimeout(tick, delay);
  }
  function tick() {
    const now = Date.now();
    if (state.pomodoro.isRunning && state.pomodoro.endAt && now >= state.pomodoro.endAt) {
      handlePomodoroStageEnd(false);
    }
    renderCurrentMode();
    renderDateText();      // 番茄钟模式下日期同样跨零点更新
    renderCountdownLine(); // 跨零点时自动更新天数
    scheduleTick();
  }

  /* ===== 刷新恢复与离开结算 ===== */
  function hydrateTimers() {
    const p = state.pomodoro;
    if (p.isRunning && p.endAt && Date.now() >= p.endAt) {
      // 页面关闭期间本阶段已结束：补结算一次（不重复响铃）
      pausePomodoro();
      switchPomodoroStage(false);
    }
    flushPendingRecords();
  }
  function onPageHide() {
    const now = Date.now();
    const s = state.stopwatch;
    const total = U.stopwatchElapsed(s, now);
    if (s.isRunning) {
      s.baseElapsed = total; s.isRunning = false; s.startedAt = 0; s.autoPaused = true;
    }
    const delta = Math.max(0, total - (s.archivedSeconds || 0));
    if (delta >= 60) {
      // 自动归档未结算的专注时长，进入待写队列，下次启动补写
      queuePendingRecord('stopwatch', delta, now);
      s.archivedSeconds = total;
    }
    saveTimers();
  }

  /* ===== 每日寄语 ===== */
  function showNextMotto() {
    state.mottoIndex = (state.mottoIndex + 1) % MOTTO_LIST.length;
    if (mottoText) {
      mottoText.style.opacity = '0';
      setTimeout(() => {
        mottoText.textContent = `“${MOTTO_LIST[state.mottoIndex]}”`;
        mottoText.style.opacity = '1';
      }, 200);
    }
  }
  function applyMottoSetting() {
    if (!mottoWrap) return;
    mottoWrap.style.display = state.settings.showMotto ? 'flex' : 'none';
    if (mottoText && !mottoText.textContent) mottoText.textContent = `“${MOTTO_LIST[0]}”`;
  }

  /* ===== 禅意极简模式 ===== */
  /* v1.7.9：退出改为「连点时钟中间三下」，进入时短暂提示；顶部常驻退出按钮已删除 */
  let zenTapTimes = [];
  let zenToastTimer = null;
  function showZenToast(ms) {
    const t = $('#zenToast');
    if (!t) return;
    t.classList.add('show');
    clearTimeout(zenToastTimer);
    zenToastTimer = setTimeout(() => t.classList.remove('show'), ms || 3800);
  }
  function registerZenTap() {
    const now = Date.now();
    zenTapTimes = zenTapTimes.filter((t) => now - t < 1600);
    zenTapTimes.push(now);
    if (zenTapTimes.length >= 3) {
      zenTapTimes = [];
      toggleZenMode();
    } else if (zenTapTimes.length === 1) {
      showZenToast(2200); // 点了第一下还没退，再提醒一次怎么退
    }
  }
  function toggleZenMode() {
    state.zenMode = !state.zenMode;
    document.body.classList.toggle('zen-mode', state.zenMode);
    if (state.zenMode) { closeSettings(); closeFontDetail(); closeBgDetail(); showZenToast(); }
    if (!state.zenMode) zenTapTimes = [];
  }

  /* ===== 日期与格式配置 ===== */
  function applyDate() {
    const dateBase = state.settings.dateSize || 22;
    fitToWidth(elDate, dateBase, 11);
    $('#dateSizeVal').textContent = (state.settings.dateSize || 22) + 'px';
    $('#dateSizeOut').textContent = state.settings.dateSize || 22;
    let sp = state.settings.dateSpacing;
    if (sp === undefined) sp = 0.22;
    // 窄屏收紧字距，否则一行日期会横向溢出
    const spEff = window.innerWidth < 560 ? Math.min(sp, 0.1) : sp;
    elDate.style.letterSpacing = spEff + 'em';
    $('#dateSpacingVal').textContent = sp + 'em';
    $('#dateSpacingOut').textContent = sp;
    $('#dateSpacingRange').value = Math.round(sp * 100);
    $('#dateSubRow').style.display = state.settings.showDate ? '' : 'none';
    $('#dateSizeGroup').style.display = state.settings.showDate ? '' : 'none';
    $('#dateSpacingGroup').style.display = state.settings.showDate ? '' : 'none';
    if (!state.settings.showDate) elDate.textContent = '';
    updateVisibility();
    renderCurrentMode();
  }
  function applySecStyle() {
    const segment = isSegmentFont();
    const showSec = state.settings.showSec !== false;
    elTime.classList.toggle('segment', segment);
    // 缩小 / 等大完全由用户选择决定（数码管也遵循，暗段同比缩放仍对齐）
    elTime.classList.toggle('sec-eq', state.settings.secStyle === 'equal');

    // 开关与选项联动：关闭时把「缩小/等大 + 预览」整块收起
    const sw = $('#swSec');
    if (sw && sw.checked !== showSec) sw.checked = showSec;
    const body = $('#secBody');
    if (body) body.classList.toggle('collapsed', !showSec);

    // 设置面板会盖住主时钟，同步一份缩略预览，点完立刻能看到差异
    const pv = $('#secPreview');
    if (pv) {
      pv.classList.toggle('eq', state.settings.secStyle === 'equal');
      if (elTime.style.fontFamily) pv.style.fontFamily = elTime.style.fontFamily;
    }
    syncGhostSeconds();
  }

  /* 秒数样式开关 + 两档：缩小 / 等大 */
  function syncSecStyleButtons() {
    // 关闭秒针时保留上次选择，重新打开还是原来那档
    const opt = state.settings.secStyle === 'equal' ? 'equal' : 'compact';
    document.querySelectorAll('#secStyleOpts .posOpt').forEach((b) => {
      b.classList.toggle('active', b.dataset.sec === opt);
    });
  }

  /* 字体预加载：避免切换字体时先回退再替换造成的闪烁 */
  function preloadFonts() {
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    FONTS.forEach((fn) => {
      try {
        const p = document.fonts.load('700 120px ' + fn.css, '0123456789:');
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    });
  }

  /* ===== 设置弹窗 ===== */
  /* 次级标题折叠：每个分组标题前加小三角，点击收起 / 展开 */
  function initGroupCollapse() {
    const box = settingsBox;
    if (!box || typeof box.querySelectorAll !== 'function') return;
    box.querySelectorAll('.sGroup').forEach((group) => {
      const label = group.querySelector(':scope > .sLabel');
      if (!label || label.querySelector('.sCaret')) return;
      const caret = document.createElement('span');
      caret.className = 'sCaret';
      caret.setAttribute('aria-hidden', 'true');
      caret.textContent = '▾';
      label.insertBefore(caret, label.firstChild);
      label.classList.add('sLabelToggle');
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      const toggle = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const collapsed = group.classList.toggle('collapsed');
        caret.textContent = collapsed ? '▸' : '▾';
        label.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      };
      label.addEventListener('click', toggle);
      label.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.code === 'Space') toggle(e);
      });
    });
  }

  /* 清空搜索状态（关闭设置时也会调用） */
  function resetSettingsSearch() {
    const input = $('#settingsSearch');
    const results = $('#sSearchResults');
    const clearBtn = $('#settingsSearchClear');
    if (input) { input.value = ''; input.setAttribute('aria-expanded', 'false'); }
    if (results) results.innerHTML = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (settingsBox) settingsBox.classList.remove('searching');
  }

  /* 设置搜索：跨分类查找设置项，点击结果直接跳到对应位置 */
  function initSettingsSearch() {
    const input = $('#settingsSearch');
    const clearBtn = $('#settingsSearchClear');
    const results = $('#sSearchResults');
    if (!input || !results) return;

    const tabName = (pane) => {
      const id = pane.id.replace(/^tab-/, '');
      const btn = document.querySelector('.sTabBtn[data-tab="' + id + '"]');
      return btn ? btn.textContent.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').trim() : '';
    };

    /* 去掉折叠小三角与多余空白，结果行只显示干净的设置项名 */
    const clean = (t) => String(t || '')
      .replace(/[\u25BE\u25B8\u25B6\u25BC\u25B2\u25C0\uFE0E\uFE0F]/g, '')
      .replace(/\s+/g, ' ').trim();

    function collect() {
      const items = [];
      document.querySelectorAll('.sTabPane').forEach((pane) => {
        const tab = pane.id.replace(/^tab-/, '');
        const tabTitle = tabName(pane);
        pane.querySelectorAll('.toggleRow').forEach((row) => {
          const nameEl = row.querySelector('.tName');
          if (!nameEl) return;
          const descEl = row.querySelector('.tDesc');
          const group = row.closest('.sGroup');
          const gLabel = group ? group.querySelector(':scope > .sLabel') : null;
          const gText = gLabel ? clean(gLabel.textContent) : '';
          items.push({
            name: clean(nameEl.textContent),
            text: [nameEl.textContent, descEl ? descEl.textContent : '', gText, tabTitle].join(' '),
            path: tabTitle + (gText ? ' · ' + gText : ''),
            tab: tab, el: row
          });
        });
        pane.querySelectorAll('.sGroup').forEach((g) => {
          const label = g.querySelector(':scope > .sLabel');
          if (!label) return;
          // 滑块行（字号 / 间距 / 透明度）与「入口行」（字体 / 壁纸）都要能被搜到
          const hasSize = !!g.querySelector('.sizeRow');
          const entry = g.querySelector(':scope > .fontEntry');
          if (!hasSize && !entry) return;
          const curEl = entry ? entry.querySelector('.feCur') : null;
          const curText = curEl ? curEl.textContent.replace(/\s+/g, ' ').trim() : '';
          const parent = g.parentElement ? g.parentElement.closest('.sGroup') : null;
          const pLabel = parent && parent !== g ? parent.querySelector(':scope > .sLabel') : null;
          const pText = pLabel ? clean(pLabel.textContent) : '';
          items.push({
            name: clean(label.textContent),
            text: [label.textContent, pText, curText, tabTitle].join(' '),
            path: tabTitle + (pText ? ' · ' + pText : ''),
            tab: tab, el: g
          });
        });
        // 细雨 / 飘雪 / 窗户雨滴等效果选项按钮也要能被搜到
        pane.querySelectorAll('.particleOpt').forEach((btn) => {
          const group = btn.closest('.sGroup');
          const gLabel = group ? group.querySelector(':scope > .sLabel') : null;
          const gText = gLabel ? clean(gLabel.textContent) : '';
          const raw = (btn.textContent || '').replace(/\s+/g, ' ').trim();
          items.push({
            name: raw.replace(/^[^\u4e00-\u9fa5A-Za-z]+/, ''),
            text: [raw, gText, tabTitle].join(' '),
            path: tabTitle + (gText ? ' · ' + gText : ''),
            tab: tab, el: btn
          });
        });
      });
      // 预处理：小写文本 + 拼音全拼 + 拼音首字母，供中文 / 拼音 / 首字母 / 模糊匹配
      // 名称单独再算一份：模糊（跳字）只对名称生效，否则长描述里的个别字母会凑出误命中
      items.forEach((it) => {
        it.nameLower = (it.name || '').toLowerCase();
        it.textLower = (it.text || '').toLowerCase();
        it.py = U.toPinyin(it.text || '');
        it.pyi = U.toPinyinInitials(it.text || '');
        it.pyName = U.toPinyin(it.name || '');
        it.pyiName = U.toPinyinInitials(it.name || '');
      });
      return items;
    }

    function clearSearch() { resetSettingsSearch(); }

    /* 关键词归一：小写、去空格（「zi ti」「zi 体」都能命中 ziti） */
    function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s\u3000]+/g, ''); }

    /* 顺序包含（允许跳字）：「sjzt」可命中 shijianziti */
    function isSubseq(q, t) {
      if (!t) return false;
      let i = 0;
      for (let k = 0; k < t.length && i < q.length; k++) {
        if (t.charAt(k) === q.charAt(i)) i++;
      }
      return i === q.length;
    }

    /* 打分：数字越小越靠前，-1 表示不匹配
     * 名称优先于说明，整词包含优先于跳字模糊；跳字只在名称的拼音内做，避免长描述凑字母。 */
    function scoreOf(it, q) {
      if (!q) return -1;
      if (it.nameLower.startsWith(q)) return 0;
      if (it.nameLower.includes(q)) return 1;
      if (it.pyName.startsWith(q) || it.pyiName.startsWith(q)) return 2;
      if (it.pyiName.includes(q)) return 3;
      if (it.pyName.includes(q)) return 4;
      if (it.textLower.includes(q)) return 5;
      if (it.py.includes(q) || it.pyi.includes(q)) return 6;
      if (q.length >= 3 && isSubseq(q, it.pyiName)) return 7;
      if (q.length >= 3 && isSubseq(q, it.pyName)) return 8;
      return -1;
    }

    function go(item) {
      clearSearch();
      const btn = document.querySelector('.sTabBtn[data-tab="' + item.tab + '"]');
      if (btn) btn.click();
      // 目标可能被折叠（含祖先分组），逐层展开
      let node = item.el;
      while (node && node !== settingsBox) {
        if (node.classList && node.classList.contains('sGroup') && node.classList.contains('collapsed')) {
          const lb = node.querySelector(':scope > .sLabel');
          if (lb) lb.click();
        }
        node = node.parentElement;
      }
      setTimeout(() => {
        if (!item.el) return;
        if (typeof item.el.scrollIntoView === 'function') {
          item.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        // 先移除再强制回流，连续搜索同一个词也能重新闪
        item.el.classList.remove('searchHit');
        void item.el.offsetWidth;
        item.el.classList.add('searchHit');
        setTimeout(() => item.el.classList.remove('searchHit'), 1700);
      }, 90);
    }

    /* 结果行左侧分类图标：单色线性 SVG，与面板整体风格一致（emoji 在小于 16px 时会糊） */
    const ICON_ATTR = 'viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
    const TAB_ICONS = {
      appearance: '<svg ' + ICON_ATTR + '><circle cx="12" cy="12" r="7.6"/><path d="M12 7.6V12l3 1.9"/></svg>',
      focus: '<svg ' + ICON_ATTR + '><circle cx="12" cy="13.4" r="7"/><path d="M12 10v3.4l2.3 1.4M9.6 3h4.8M12 3v2.4"/></svg>',
      'date-todo': '<svg ' + ICON_ATTR + '><rect x="3.6" y="5.2" width="16.8" height="15" rx="2.6"/><path d="M3.6 9.6h16.8M8.2 3.2v3.4M15.8 3.2v3.4"/></svg>',
      stats: '<svg ' + ICON_ATTR + '><path d="M5.4 19.2V11M12 19.2V5M18.6 19.2v-5.4"/></svg>'
    };
    let hitItems = [];
    let activeIdx = -1;

    function setActive(idx) {
      const rows = results.querySelectorAll('.srItem');
      if (!rows.length) { activeIdx = -1; return; }
      activeIdx = (idx + rows.length) % rows.length;
      rows.forEach((r, i) => r.classList.toggle('active', i === activeIdx));
      const cur = rows[activeIdx];
      if (cur && typeof cur.scrollIntoView === 'function') {
        cur.scrollIntoView({ block: 'nearest' });
      }
    }

    function render(raw) {
      const q = norm(raw);
      if (!q) { clearSearch(); return; }
      results.innerHTML = '';
      hitItems = [];
      activeIdx = -1;
      const hits = [];
      collect().forEach((it) => {
        const s = scoreOf(it, q);
        if (s >= 0) hits.push({ it: it, s: s });
      });
      hits.sort((a, b) => a.s - b.s);
      // 结果浮在内容区之上，底下的设置保持原样不动
      settingsBox.classList.add('searching');
      input.setAttribute('aria-expanded', 'true');
      if (clearBtn) clearBtn.style.display = 'flex';
      if (!hits.length) {
        const empty = document.createElement('div');
        empty.className = 'srEmpty';
        empty.textContent = '没有找到相关设置，换个关键词试试';
        results.appendChild(empty);
        return;
      }
      hits.slice(0, 40).forEach(({ it }) => {
        hitItems.push(it);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'srItem';
        row.setAttribute('role', 'option');

        const ic = document.createElement('span');
        ic.className = 'srIcon';
        ic.innerHTML = TAB_ICONS[it.tab] || TAB_ICONS.appearance;
        ic.setAttribute('aria-hidden', 'true');

        const n = document.createElement('span');
        n.className = 'srName';
        n.textContent = it.name;

        const p = document.createElement('span');
        p.className = 'srPath';
        p.textContent = it.path;

        row.appendChild(ic); row.appendChild(n); row.appendChild(p);
        row.addEventListener('click', () => go(it));
        row.addEventListener('mouseenter', () => setActive(hitItems.indexOf(it)));
        results.appendChild(row);
      });
      setActive(0);
    }

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('search', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        if (input.value) clearSearch(); else input.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hitItems.length) setActive(activeIdx + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hitItems.length) setActive(activeIdx - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = hitItems[activeIdx >= 0 ? activeIdx : 0];
        if (target) go(target);
      }
    });
    // 点空白处（搜索框与结果之外）关闭结果层
    results.addEventListener('click', (e) => {
      if (e.target === results) clearSearch();
    });
    document.addEventListener('mousedown', (e) => {
      if (!settingsBox.classList.contains('searching')) return;
      const t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      if (t.closest('.sSearch') || t.closest('#sSearchResults')) return;
      clearSearch();
    }, true);
    if (clearBtn) clearBtn.addEventListener('click', clearSearch);
    document.querySelectorAll('.sTabBtn').forEach((b) => b.addEventListener('click', clearSearch));
  }

  function initSettingsTabs() {
    const tabBtns = document.querySelectorAll('.sTabBtn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.sTabPane').forEach((p) => p.classList.remove('active'));
        const dpPopover = $('#datePickerPopover');
        if (dpPopover) dpPopover.classList.remove('show');
        btn.classList.add('active');
        const targetPane = $(`#tab-${btn.dataset.tab}`);
        if (targetPane) targetPane.classList.add('active');
        if (btn.dataset.tab === 'stats') renderStatsTab();
      });
    });
  }

  async function renderStatsTab() {
    const fetched = window.StudyDB ? await window.StudyDB.getFocusRecords() : [];
    const records = Array.isArray(fetched) ? fetched : [];
    const todayStr = U.localDateKey(new Date());
    const todaySeconds = records.filter((r) => r.dateStr === todayStr)
      .reduce((sum, r) => sum + U.recordSeconds(r), 0);
    const totalPomos = records.filter((r) => r.type === 'pomodoro').length;
    let doneTodos = 0;
    ['L', 'R'].forEach((s) => { doneTodos += (state.todos[s] || []).filter((t) => t.done).length; });

    const elTodayTime = $('#statTodayTime'), elTotalPomos = $('#statTotalPomos'),
          elDoneTodos = $('#statDoneTodos'), elRecordList = $('#statRecordList');
    if (elTodayTime) elTodayTime.textContent = U.formatDuration(todaySeconds);
    if (elTotalPomos) elTotalPomos.textContent = totalPomos;
    if (elDoneTodos) elDoneTodos.textContent = doneTodos;

    // 60 天热力图，按周（周日起）对齐，兼容 1.2 的分钟记录
    const heatmapGrid = $('#heatmapGrid');
    if (heatmapGrid) {
      heatmapGrid.innerHTML = '';
      const map = {};
      records.forEach((r) => {
        const k = r.dateStr;
        if (!k) return;
        map[k] = (map[k] || 0) + U.recordSeconds(r);
      });
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const firstKey = U.localDateKey(U.addDays(today, -59));
      const endKey = U.localDateKey(today);
      let cursor = U.addDays(today, -59);
      cursor.setDate(cursor.getDate() - cursor.getDay()); // 回退到所在周周日
      let col = document.createElement('div');
      col.className = 'heatmapCol';
      let idx = 0;
      let guard = 0;
      while (U.localDateKey(cursor) <= endKey && guard++ < 80) {
        const key = U.localDateKey(cursor);
        const cell = document.createElement('div');
        cell.className = 'heatmapCell';
        if (key < firstKey) {
          cell.style.visibility = 'hidden'; // 仅为周对齐的占位
        } else {
          const mins = (map[key] || 0) / 60;
          let level = mins >= 90 ? 4 : mins >= 50 ? 3 : mins >= 25 ? 2 : mins > 0 ? 1 : 0;
          if (level > 0) cell.dataset.level = level;
          const label = `${key}：${U.formatDuration(map[key] || 0)}专注`;
          cell.title = label;
          cell.setAttribute('aria-label', label);
        }
        col.appendChild(cell);
        if (++idx % 7 === 0) {
          heatmapGrid.appendChild(col);
          col = document.createElement('div');
          col.className = 'heatmapCol';
        }
        cursor = U.addDays(cursor, 1);
      }
      if (col.children.length) heatmapGrid.appendChild(col);
    }

    if (elRecordList) {
      elRecordList.innerHTML = '';
      if (!records.length) {
        const tip = document.createElement('div');
        tip.style.cssText = 'color:rgba(255,255,255,.4);text-align:center;padding:16px 0;font-size:12px';
        tip.textContent = '暂无自习记录，开启一次番茄钟试试吧！';
        elRecordList.appendChild(tip);
      } else {
        records.slice(-15).reverse().forEach((r) => {
          const item = document.createElement('div');
          item.className = 'statItem';
          const left = document.createElement('div');
          const b = document.createElement('b');
          b.textContent = r.type === 'pomodoro' ? '番茄钟专注' : '正向自习';
          const span = document.createElement('span');
          span.className = 'stTime';
          const timeStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          span.textContent = `(${r.dateStr} ${timeStr})`;
          left.appendChild(b); left.appendChild(span);
          const dur = document.createElement('div');
          dur.className = 'stDur';
          dur.textContent = '+' + U.formatDuration(U.recordSeconds(r));
          item.appendChild(left); item.appendChild(dur);
          elRecordList.appendChild(item);
        });
      }
    }
  }

  function refreshSettings() {
    applyBg(); applyFont(); syncSize(); buildBgGrid(); buildFonts();
    $('#swDate').checked = !!state.settings.showDate;
    $('#swYear').checked = !!state.settings.showYear;
    $('#swMonthDay').checked = !!state.settings.showMonthDay;
    $('#swWeekday').checked = !!state.settings.showWeekday;
    $('#swFlip').checked = !!state.settings.flip;
    if ($('#swMotto')) $('#swMotto').checked = !!state.settings.showMotto;
    if ($('#swCountdown')) $('#swCountdown').checked = state.settings.showCountdown !== false;
    if ($('#swSound')) $('#swSound').checked = !!state.settings.soundEnabled;
    if ($('#swPomoTotalMin')) $('#swPomoTotalMin').checked = state.settings.pomoTimeStyle === 'totalMinutes';
    if ($('#swStopwatchTotalMin')) $('#swStopwatchTotalMin').checked = state.settings.swTimeStyle === 'totalMinutes';

    if ($('#pomoWorkInput')) $('#pomoWorkInput').value = state.settings.pomoWorkMin || 25;
    if ($('#pomoBreakInput')) $('#pomoBreakInput').value = state.settings.pomoBreakMin || 5;
    if ($('#targetTitleInput')) $('#targetTitleInput').value = state.settings.targetTitle || '距离 目标 还有';
    if ($('#targetDateInput')) $('#targetDateInput').value = state.settings.targetDate || '';
    if (state.settings.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(state.settings.targetDate)) {
      const parts = state.settings.targetDate.split('-');
      if ($('#dpYearInput')) $('#dpYearInput').value = parts[0];
      if ($('#dpMonthInput')) $('#dpMonthInput').value = parseInt(parts[1], 10);
      if ($('#dpDayInput')) $('#dpDayInput').value = parseInt(parts[2], 10);
    }

    $('#dateSizeRange').value = state.settings.dateSize || 22;
    $('#dateSpacingRange').value = Math.round((state.settings.dateSpacing || 0.22) * 100);
    $('#dateSpacingVal').textContent = (state.settings.dateSpacing || 0.22) + 'em';
    $('#dateSpacingOut').textContent = state.settings.dateSpacing || 0.22;
    $('#todoSizeRange').value = state.settings.todoSize || 14;
    $('#todoSizeVal').textContent = (state.settings.todoSize || 14) + 'px';
    $('#todoSizeOut').textContent = state.settings.todoSize || 14;

    const to = state.settings.todoOpacity !== undefined ? state.settings.todoOpacity : 0.6;
    $('#todoOpacityRange').value = Math.round(to * 100);
    $('#todoOpacityVal').textContent = Math.round(to * 100) + '%';
    $('#todoOpacityOut').textContent = Math.round(to * 100);

    const dim = U.clamp(state.settings.dim, 0.15, 1, 0.62);
    const dimRange = $('#dimRange');
    if (dimRange) dimRange.value = Math.round(dim * 100);
    if ($('#dimVal')) $('#dimVal').textContent = Math.round(dim * 100) + '%';
    if ($('#dimOut')) $('#dimOut').textContent = Math.round(dim * 100);

    syncSecStyleButtons();
    applySecStyle(); applyFlip();
    const swFx = $('#swScreenFx');
    if (swFx) swFx.checked = !!state.settings.screenFx;
    renderRemind('L'); renderRemind('R');
    applyDate(); applyMottoSetting(); updateVisibility(); updateDbHint();
    applyScreenFx();
  }

  function openSettings() { refreshSettings(); settingsEl.classList.add('show'); }
  function closeSettings() {
    settingsEl.classList.remove('show');
    closeBgDetail();
    resetSettingsSearch();
    const dpPopover = $('#datePickerPopover');
    if (dpPopover) dpPopover.classList.remove('show');
  }

  /* ===== 待办 ===== */
  const typingLock = { L: false, R: false };
  function getTodos(side) { return state.todos[side] || []; }

  function renderRemind(side) {
    const rem = side === 'L' ? remindL : remindR;
    /* 显示区域设置：只渲染用户选中的一侧，另一侧彻底清空（触摸与桌面统一生效） */
    if (side !== (state.settings.todoSide || 'L')) {
      rem.classList.remove('show'); rem.innerHTML = '';
      return;
    }
    const list = getTodos(side);
    rem.style.fontSize = (state.settings.todoSize || 14) + 'px';
    rem.innerHTML = '';
    if (!list.length) { rem.classList.remove('show'); return; }
    const label = document.createElement('div');
    label.className = 'rmLabel'; label.textContent = '今日待办';
    rem.appendChild(label);
    const op = state.settings.todoOpacity !== undefined ? state.settings.todoOpacity : 0.6;
    list.forEach((t) => {
      const line = document.createElement('div');
      line.className = 'rmLine' + (t.done ? ' done' : '');
      line.style.opacity = op;
      line.textContent = (t.done ? '✓ ' : '• ') + t.text;
      rem.appendChild(line);
    });
    rem.classList.add('show');
  }

  /* 设置面板内的待办管理：增删勾选都写回同一份 state.todos */
  function renderSetTodos() {
    const box = $('#stTodoList'), cnt = $('#todoCntSet');
    if (!box) return;
    const side = state.settings.todoSide || 'L';
    const list = getTodos(side);
    if (cnt) cnt.textContent = list.filter((t) => !t.done).length + ' 项';
    box.innerHTML = '';
    if (!list.length) {
      const tip = document.createElement('div');
      tip.className = 'emptyTip';
      tip.textContent = (side === 'R' ? '右侧' : '左侧') + '还没有待办，在下方添加';
      box.appendChild(tip);
    }
    list.forEach((t, idx) => {
      const row = document.createElement('div');
      row.className = 'stTodoItem' + (t.done ? ' done' : '');
      const ck = document.createElement('span');
      ck.className = 'ck' + (t.done ? ' done' : '');
      ck.onclick = () => { state.todos[side][idx].done = !state.todos[side][idx].done; saveTodos(); renderTodos(); renderSetTodos(); };
      const tx = document.createElement('span');
      tx.className = 'txt' + (t.done ? ' done' : '');
      tx.textContent = t.text;
      const del = document.createElement('button');
      del.className = 'del'; del.textContent = '✕'; del.setAttribute('aria-label', '删除这条待办');
      del.onclick = () => { state.todos[side].splice(idx, 1); saveTodos(); renderTodos(); renderSetTodos(); };
      row.appendChild(ck); row.appendChild(tx); row.appendChild(del);
      box.appendChild(row);
    });
  }

  function initSetTodos() {
    const inp = $('#stTodoInput'), btn = $('#stTodoAddBtn');
    const sideOpts = $('#todoSideOpts');
    if (!inp || !btn || !sideOpts) return;

    function addFromInput() {
      const side = state.settings.todoSide || 'L';
      const text = (inp.value || '').trim();
      if (!text) return;
      state.todos[side].push({ text: text, done: false });
      saveTodos(); renderTodos(); renderSetTodos();
      inp.value = ''; inp.focus();
    }
    btn.addEventListener('click', addFromInput);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addFromInput(); });

    sideOpts.querySelectorAll('.sideOpt').forEach((b) => {
      b.addEventListener('click', function () {
        state.settings.todoSide = this.dataset.side === 'R' ? 'R' : 'L';
        saveSettings();
        sideOpts.querySelectorAll('.sideOpt').forEach((x) =>
          x.classList.toggle('active', x.dataset.side === state.settings.todoSide));
        renderTodos(); renderSetTodos();
      });
    });
    sideOpts.querySelectorAll('.sideOpt').forEach((x) =>
      x.classList.toggle('active', x.dataset.side === (state.settings.todoSide || 'L')));
  }

  function renderTodos() {
    ['L', 'R'].forEach((z) => {
      const sideTodos = getTodos(z);
      const list = z === 'L' ? $('#todoListL') : $('#todoListR');
      const cnt = z === 'L' ? $('#todoCntL') : $('#todoCntR');
      list.innerHTML = '';
      cnt.textContent = sideTodos.filter((t) => !t.done).length;
      if (!sideTodos.length) {
        const tip = document.createElement('div');
        tip.className = 'emptyTip'; tip.textContent = '还没有待办，点击下方添加';
        list.appendChild(tip);
      } else {
        sideTodos.forEach((t, idx) => {
          const row = document.createElement('div');
          row.className = 'todoItem';
          const ck = document.createElement('span');
          ck.className = 'ck' + (t.done ? ' done' : '');
          ck.onclick = () => {
            state.todos[z][idx].done = !state.todos[z][idx].done;
            saveTodos(); renderTodos();
          };
          const tx = document.createElement('span');
          tx.className = 'txt' + (t.done ? ' done' : '');
          tx.textContent = t.text;
          const del = document.createElement('button');
          del.className = 'del'; del.textContent = '✕';
          del.setAttribute('aria-label', '删除待办：' + t.text);
          del.onclick = () => {
            state.todos[z].splice(idx, 1);
            saveTodos(); renderTodos();
          };
          row.appendChild(ck); row.appendChild(tx); row.appendChild(del);
          list.appendChild(row);
        });
      }
      renderRemind(z);
    });
    renderSetTodos();
  }

  const HOVER_DELAY = 500;
  function showPanel(zone) {
    zone.querySelector('.todoPanel').classList.add('show');
    zone.classList.add('hovered');
  }
  function hidePanel(zone) {
    zone.querySelector('.todoPanel').classList.remove('show');
    zone.classList.remove('hovered');
  }
  const hoverTimer = { L: null, R: null };
  function bindZone(zone, key) {
    if (TOUCH) {
      // 触摸设备：待办面板已隐藏，增删改查全部在设置内完成（v1.7.0）
      return;
    }
    zone.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer[key]);
      const rem = key === 'L' ? remindL : remindR;
      rem.classList.remove('show');
      hoverTimer[key] = setTimeout(() => showPanel(zone), HOVER_DELAY);
    });
    zone.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer[key]);
      if (!typingLock[key]) { hidePanel(zone); renderRemind(key); }
    });
  }

  function bindAdd(zoneKey) {
    const zone = zoneKey === 'L' ? zoneL : zoneR;
    const btn = zone.querySelector('.addBtn'),
          inp = zone.querySelector('.addInput'),
          go = zone.querySelector('.addGo');
    function openInput() {
      btn.style.display = 'none'; inp.style.display = 'block'; go.style.display = 'block'; inp.focus();
    }
    function commit() {
      const v = inp.value.trim();
      if (!v) { reset(); return; }
      if (!state.todos[zoneKey]) state.todos[zoneKey] = [];
      state.todos[zoneKey].push({ text: v, done: false });
      saveTodos(); renderTodos(); reset();
    }
    function reset() {
      inp.value = ''; inp.style.display = 'none'; go.style.display = 'none'; btn.style.display = 'block';
    }
    btn.addEventListener('click', openInput);
    go.addEventListener('click', commit);
    inp.addEventListener('focus', () => { typingLock[zoneKey] = true; showPanel(zone); });
    inp.addEventListener('blur', () => {
      typingLock[zoneKey] = false;
      if (!getTodos(zoneKey).length) hidePanel(zone);
      renderRemind(zoneKey);
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') reset();
    });
  }

  /* ===== 鼠标悬浮感应（触摸设备跳过） ===== */
  let modeBarTimer = null;
  let _lastMouseY = 999;
  function showModeBarTemporarily(ms = 2000) {
    if (!modeBar || state.zenMode || TOUCH) return;
    modeBar.classList.add('show');
    clearTimeout(modeBarTimer);
    modeBarTimer = setTimeout(() => {
      if (_lastMouseY >= 75) modeBar.classList.remove('show');
    }, ms);
  }
  if (!TOUCH) {
    document.addEventListener('mousemove', (e) => {
      _lastMouseY = e.clientY;
      const nearTop = e.clientY < 75;
      if (nearTop && !state.zenMode) { modeBar.classList.add('show'); clearTimeout(modeBarTimer); }
      else if (!nearTop) modeBar.classList.remove('show');
      const nearBottom = e.clientY > (window.innerHeight - 80);
      const nearCenter = Math.abs(e.clientX - window.innerWidth / 2) < 260;
      if (nearBottom && nearCenter && !state.zenMode) fsBtn.classList.add('show');
      else fsBtn.classList.remove('show');
    });
  }

  function updateFsBtn() {
    const on = !!document.fullscreenElement;
    fsBtn.textContent = on ? '退出全屏' : '全屏显示';
    fsBtn.title = on ? '退出全屏' : '全屏显示';
  }
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', updateFsBtn);

  /* ===== 触摸设备交互（v1.7.0 / v1.7.2）=====
   * - 模式栏不常驻：点按屏幕顶部边缘临时唤出，2.6 秒后自动隐藏；
   * - 右下角圆形全屏按钮 + 底部中央热区都可切换全屏；
   * - 桌面鼠标逻辑（mousemove 感应 + fsBtn 悬浮按钮）完全不受影响。 */
  const fsRoundBtn = $('#fsRoundBtn');
  function updateFsRound() {
    if (!fsRoundBtn) return;
    const on = !!document.fullscreenElement;
    fsRoundBtn.classList.toggle('on', on);
    fsRoundBtn.title = on ? '退出全屏' : '全屏显示';
    fsRoundBtn.setAttribute('aria-label', on ? '退出全屏' : '全屏显示');
  }
  if (TOUCH) {
    const toggleFullscreen = () => {
      if (state.zenMode) return;
      if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    };
    if (fsRoundBtn) {
      fsRoundBtn.addEventListener('click', toggleFullscreen);
      document.addEventListener('fullscreenchange', updateFsRound);
    }
    const topZone = document.createElement('div');
    topZone.id = 'topHotzone';
    topZone.addEventListener('click', () => {
      if (state.zenMode) return;
      modeBar.classList.add('show');
      clearTimeout(modeBarTimer);
      modeBarTimer = setTimeout(() => modeBar.classList.remove('show'), 2600);
    });
    const fsZone = document.createElement('div');
    fsZone.id = 'fsHotzone';
    fsZone.addEventListener('click', toggleFullscreen);
    document.body.appendChild(topZone);
    document.body.appendChild(fsZone);
  }

  /* ===== 鼠标空闲隐藏 ===== */
  const IDLE_TIME = 3000;
  let hideTimer = null;
  function armHide() {
    clearTimeout(hideTimer);
    document.body.style.cursor = 'default';
    hideTimer = setTimeout(() => { document.body.style.cursor = 'none'; }, IDLE_TIME);
  }
  if (!TOUCH) {
    document.addEventListener('mousemove', armHide);
    document.addEventListener('mousedown', armHide);
  }

  /* ===== 新手引导 ===== */
  const onboardEl = $('#onboard');
  function showOnboard() { if (onboardEl) onboardEl.classList.add('show'); }
  function hideOnboard() { if (onboardEl) onboardEl.classList.remove('show'); }
  function closeOnboard() { hideOnboard(); try { localStorage.setItem(OBKEY, '1'); } catch (e) {} }
  function setupOnboard() {
    let seen = false;
    try { seen = localStorage.getItem(OBKEY) === '1'; } catch (e) {}
    const closeBtn = $('#obClose'), reopenBtn = $('#obReopen');
    if (closeBtn) closeBtn.addEventListener('click', closeOnboard);
    if (reopenBtn) reopenBtn.addEventListener('click', showOnboard);
    if (!seen) setTimeout(showOnboard, 400);
  }

  /* ===== 全局快捷键 ===== */
  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = e.target && e.target.tagName;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) ||
                     !!(e.target && e.target.isContentEditable);
      // Esc 始终生效（输入框内也能关闭浮层 / 退出禅意）
      if (e.key === 'Escape') {
        if (state.zenMode) toggleZenMode();
        closeSettings(); closeFontDetail(); closeBgDetail();
        const pop = $('#datePickerPopover');
        if (pop) pop.classList.remove('show');
        return;
      }
      if (typing) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.settings.mode === 'pomodoro') togglePomodoro();
        if (state.settings.mode === 'stopwatch') toggleStopwatch();
      } else if (e.key === 'z' || e.key === 'Z') {
        toggleZenMode();
      } else if (e.key === 'f' || e.key === 'F') {
        fsBtn.click();
      } else if (e.key === '1') { setMode('clock'); }
      else if (e.key === '2') { setMode('pomodoro'); }
      else if (e.key === '3') { setMode('stopwatch'); }
    });
  }

  /* ===== 事件绑定 ===== */
  function bindEvents() {
    initGroupCollapse();
    initSettingsSearch();
    document.querySelectorAll('.modeBtn').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
    const zenBtn = $('#modeZenBtn');
    if (zenBtn) zenBtn.addEventListener('click', toggleZenMode);
    /* v1.7.9：顶部退出按钮已删除，禅意由键盘 Z/Esc 或连点时钟三下退出 */

    timerToggleBtn.addEventListener('click', () => {
      if (state.settings.mode === 'pomodoro') togglePomodoro();
      if (state.settings.mode === 'stopwatch') toggleStopwatch();
    });
    timerResetBtn.addEventListener('click', () => {
      if (state.settings.mode === 'pomodoro') resetPomodoro();
      if (state.settings.mode === 'stopwatch') resetStopwatch();
    });
    timerSkipBtn.addEventListener('click', skipPomodoroStage);
    if (mottoWrap) mottoWrap.addEventListener('click', showNextMotto);

    elClock.addEventListener('click', (e) => {
      if (e.target.closest('#timerControls') || e.target.closest('#mottoWrap')) return;
      /* v1.7.9：禅意模式下连点时钟三下退出（不开设置） */
      if (state.zenMode) { registerZenTap(); return; }
      openSettings();
    });
    elClock.addEventListener('keydown', (e) => {
      if (e.target !== elClock || e.key !== 'Enter') return;
      e.preventDefault(); openSettings();
    });
    $('#sClose').addEventListener('click', closeSettings);
    settingsEl.addEventListener('click', (e) => {
      if (e.target === settingsEl) closeSettings();
    });

    $('#swDate').addEventListener('change', function () {
      state.settings.showDate = this.checked; saveSettings(); refreshSettings();
    });
    $('#swYear').addEventListener('change', function () {
      state.settings.showYear = this.checked; saveSettings(); applyDate();
    });
    $('#swMonthDay').addEventListener('change', function () {
      state.settings.showMonthDay = this.checked; saveSettings(); applyDate();
    });
    $('#swWeekday').addEventListener('change', function () {
      state.settings.showWeekday = this.checked; saveSettings(); applyDate();
    });
    $('#swFlip').addEventListener('change', function () {
      state.settings.flip = this.checked; saveSettings(); applyFlip();
    });
    const swMotto = $('#swMotto');
    if (swMotto) swMotto.addEventListener('change', function () {
      state.settings.showMotto = this.checked; saveSettings(); applyMottoSetting();
    });
    const swCountdown = $('#swCountdown');
    if (swCountdown) swCountdown.addEventListener('change', function () {
      state.settings.showCountdown = this.checked;
      saveSettings(); updateVisibility();
    });
    const swSound = $('#swSound');
    if (swSound) swSound.addEventListener('change', function () {
      state.settings.soundEnabled = this.checked; saveSettings();
    });
    const testChimeBtn = $('#testChimeBtn');
    if (testChimeBtn) testChimeBtn.addEventListener('click', () => {
      if (window.StudySound) window.StudySound.playFocusChime();
    });

    /* 番茄钟时长 */
    const pomoWorkInput = $('#pomoWorkInput'), pomoBreakInput = $('#pomoBreakInput');
    function updatePomoWork(val) {
      const v = Math.min(120, Math.max(1, val));
      state.settings.pomoWorkMin = v;
      if (pomoWorkInput) pomoWorkInput.value = v;
      saveSettings();
      const p = state.pomodoro;
      if (p.status === 'work' && !p.isRunning) {
        p.remaining = v * 60; p.phaseTotal = p.remaining;
        saveTimers(); renderCurrentMode();
      }
    }
    function updatePomoBreak(val) {
      const v = Math.min(60, Math.max(1, val));
      state.settings.pomoBreakMin = v;
      if (pomoBreakInput) pomoBreakInput.value = v;
      saveSettings();
      const p = state.pomodoro;
      if (p.status === 'break' && !p.isRunning) {
        p.remaining = v * 60; p.phaseTotal = p.remaining;
        saveTimers(); renderCurrentMode();
      }
    }
    if (pomoWorkInput) pomoWorkInput.addEventListener('change', function () {
      updatePomoWork(parseInt(this.value, 10) || 25);
    });
    if ($('#pomoWorkUp')) $('#pomoWorkUp').addEventListener('click', () => updatePomoWork((state.settings.pomoWorkMin || 25) + 1));
    if ($('#pomoWorkDown')) $('#pomoWorkDown').addEventListener('click', () => updatePomoWork((state.settings.pomoWorkMin || 25) - 1));
    if (pomoBreakInput) pomoBreakInput.addEventListener('change', function () {
      updatePomoBreak(parseInt(this.value, 10) || 5);
    });
    if ($('#pomoBreakUp')) $('#pomoBreakUp').addEventListener('click', () => updatePomoBreak((state.settings.pomoBreakMin || 5) + 1));
    if ($('#pomoBreakDown')) $('#pomoBreakDown').addEventListener('click', () => updatePomoBreak((state.settings.pomoBreakMin || 5) - 1));

    /* v1.7.8：时长显示格式开关（总分钟 / 自适应）与触摸端显示模式切换 */
    const swPomoTotalMin = $('#swPomoTotalMin');
    if (swPomoTotalMin) swPomoTotalMin.addEventListener('change', function () {
      state.settings.pomoTimeStyle = this.checked ? 'totalMinutes' : 'adaptive';
      saveSettings(); renderCurrentMode();
    });
    const swStopwatchTotalMin = $('#swStopwatchTotalMin');
    if (swStopwatchTotalMin) swStopwatchTotalMin.addEventListener('change', function () {
      state.settings.swTimeStyle = this.checked ? 'totalMinutes' : 'adaptive';
      saveSettings(); renderCurrentMode();
    });
    const modeSwitchGroup = $('#modeSwitchGroup');
    if (modeSwitchGroup) {
      if (!TOUCH) modeSwitchGroup.style.display = 'none'; // 桌面端用顶部模式栏与快捷键
      modeSwitchGroup.querySelectorAll('.sideOpt').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.mode === state.settings.mode);
        btn.addEventListener('click', function () {
          const chosen = this.dataset.mode;
          setMode(chosen);
          modeSwitchGroup.querySelectorAll('.sideOpt').forEach((b) => {
            b.classList.toggle('active', b.dataset.mode === chosen);
          });
        });
      });
    }

    /* 倒数日配置 */
    const targetTitleInput = $('#targetTitleInput');
    if (targetTitleInput) targetTitleInput.addEventListener('input', function () {
      state.settings.targetTitle = this.value; saveSettings(); renderCountdownLine();
    });
    const targetDateInput = $('#targetDateInput');
    if (targetDateInput) targetDateInput.addEventListener('change', function () {
      state.settings.targetDate = this.value; saveSettings(); renderCountdownLine();
    });

    /* 滑块联动 */
    const dateSizeRange = $('#dateSizeRange');
    dateSizeRange.addEventListener('input', () => {
      elDate.style.fontSize = dateSizeRange.value + 'px';
      $('#dateSizeVal').textContent = dateSizeRange.value + 'px';
      $('#dateSizeOut').textContent = dateSizeRange.value;
    });
    dateSizeRange.addEventListener('change', () => {
      state.settings.dateSize = parseInt(dateSizeRange.value, 10); saveSettings(); applyDate();
    });
    const dateSpacingRange = $('#dateSpacingRange');
    dateSpacingRange.addEventListener('input', () => {
      elDate.style.letterSpacing = (dateSpacingRange.value / 100) + 'em';
      $('#dateSpacingVal').textContent = (dateSpacingRange.value / 100) + 'em';
      $('#dateSpacingOut').textContent = (dateSpacingRange.value / 100);
    });
    dateSpacingRange.addEventListener('change', () => {
      state.settings.dateSpacing = dateSpacingRange.value / 100; saveSettings(); applyDate();
    });
    const todoSizeRange = $('#todoSizeRange');
    todoSizeRange.addEventListener('input', () => {
      const px = parseInt(todoSizeRange.value, 10);
      $('#todoSizeVal').textContent = px + 'px';
      $('#todoSizeOut').textContent = px;
      remindL.style.fontSize = px + 'px'; remindR.style.fontSize = px + 'px';
    });
    todoSizeRange.addEventListener('change', () => {
      state.settings.todoSize = parseInt(todoSizeRange.value, 10); saveSettings();
      renderRemind('L'); renderRemind('R');
    });
    const todoOpacityRange = $('#todoOpacityRange');
    todoOpacityRange.addEventListener('input', () => {
      const op = todoOpacityRange.value / 100;
      document.querySelectorAll('.todoRemind .rmLine').forEach((el) => { el.style.opacity = op; });
      $('#todoOpacityVal').textContent = todoOpacityRange.value + '%';
      $('#todoOpacityOut').textContent = todoOpacityRange.value;
    });
    todoOpacityRange.addEventListener('change', () => {
      state.settings.todoOpacity = todoOpacityRange.value / 100; saveSettings();
      renderRemind('L'); renderRemind('R');
    });
    const dimRange = $('#dimRange');
    if (dimRange) {
      dimRange.addEventListener('input', () => {
        const pct = parseInt(dimRange.value, 10);
        state.settings.dim = pct / 100;
        elVignette.style.opacity = state.settings.dim;
        $('#dimVal').textContent = pct + '%';
        $('#dimOut').textContent = pct;
      });
      dimRange.addEventListener('change', () => {
        state.settings.dim = parseInt(dimRange.value, 10) / 100; saveSettings();
        syncWindowRainBackdrop();
      });
    }

    const ranges = document.querySelectorAll('#settingsBox input[type=range]');
    ranges.forEach((r) => {
      r.addEventListener('input', () => settingsBox.classList.add('dim'));
      r.addEventListener('change', () => settingsBox.classList.remove('dim'));
    });
    settingsBox.addEventListener('mouseleave', () => settingsBox.classList.remove('dim'));

    document.querySelectorAll('#secStyleOpts .posOpt').forEach((b) => {
      b.addEventListener('click', function () {
        state.settings.secStyle = this.dataset.sec === 'equal' ? 'equal' : 'compact';
        state.settings.showSec = true; // 选了样式就等于要显示秒
        saveSettings();
        syncSecStyleButtons();
        updateVisibility();
      });
    });

    const swSec = $('#swSec');
    if (swSec) swSec.addEventListener('change', function () {
      state.settings.showSec = this.checked;
      saveSettings();
      updateVisibility();
    });

    fontEntry.addEventListener('click', openFontDetail);
    fontEntry.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.code !== 'Space') return;
      e.preventDefault(); e.stopPropagation(); openFontDetail();
    });
    $('#fdBack').addEventListener('click', closeFontDetail);
    fontDetail.addEventListener('click', (e) => { if (e.target === fontDetail) closeFontDetail(); });

    const bgEntryEl = $('#bgEntry');
    if (bgEntryEl) {
      bgEntryEl.addEventListener('click', openBgDetail);
      bgEntryEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.code !== 'Space') return;
        e.preventDefault(); e.stopPropagation(); openBgDetail();
      });
    }
    const bgBackEl = $('#bgBack');
    if (bgBackEl) bgBackEl.addEventListener('click', closeBgDetail);
    const bgDetailEl = $('#bgDetail');
    if (bgDetailEl) bgDetailEl.addEventListener('click', (e) => { if (e.target === bgDetailEl) closeBgDetail(); });

    bindZone(zoneL, 'L'); bindZone(zoneR, 'R');
    bindAdd('L'); bindAdd('R');
  }

  /* ===== 氛围白噪音混音台 ===== */
  function initAmbientMixer() {
    const ambientBtn = $('#ambientBtn'), ambientPanel = $('#ambientPanel'),
          masterToggle = $('#ambMasterToggle'), trackList = $('#ambTrackList');
    if (!ambientBtn || !ambientPanel || !window.StudyAmbient) return;

    const ambState = window.StudyAmbient.getState();
    masterToggle.checked = !!ambState.enabled;
    ambientBtn.classList.toggle('playing', !!ambState.enabled);

    const masterVol = $('#ambMasterVol');
    if (masterVol) {
      masterVol.value = ambState.masterVol;
      $('#ambMasterVolVal').textContent = ambState.masterVol + '%';
      masterVol.addEventListener('input', function () {
        const v = parseInt(this.value, 10);
        window.StudyAmbient.setMasterVolume(v);
        $('#ambMasterVolVal').textContent = v + '%';
      });
    }

    ambientBtn.addEventListener('click', (e) => {
      e.stopPropagation(); ambientPanel.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
      if (!ambientPanel.contains(e.target) && e.target !== ambientBtn && !ambientBtn.contains(e.target)) {
        ambientPanel.classList.remove('show');
      }
    });
    masterToggle.addEventListener('change', function () {
      const isPlaying = window.StudyAmbient.toggleMasterSound(this.checked);
      if (!isPlaying) this.checked = false; // AudioContext 不可用时复位
      ambientBtn.classList.toggle('playing', isPlaying);
    });

    trackList.innerHTML = '';
    const tracks = window.StudyAmbient.tracks;
    Object.keys(tracks).forEach((key) => {
      const tr = tracks[key];
      const row = document.createElement('div');
      row.className = 'ambTrack';
      const vol = ambState.tracks[key] || 0;
      const lbl = document.createElement('span');
      lbl.className = 'trLbl';
      const icon = document.createElement('span'); icon.textContent = tr.icon;
      const name = document.createElement('span'); name.textContent = tr.name;
      lbl.appendChild(icon); lbl.appendChild(name);
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = vol;
      slider.dataset.track = key;
      slider.setAttribute('aria-label', tr.name + '音量');
      const val = document.createElement('span');
      val.style.cssText = 'font-size:11px;color:rgba(255,255,255,.5);width:32px;text-align:right';
      val.id = 'ambVal_' + key; val.textContent = vol + '%';
      slider.addEventListener('input', function () {
        const v = parseInt(this.value, 10);
        val.textContent = v + '%';
        window.StudyAmbient.setTrackVolume(key, v);
        if (!masterToggle.checked && v > 0) {
          masterToggle.checked = true;
          const ok = window.StudyAmbient.toggleMasterSound(true);
          if (!ok) masterToggle.checked = false;
          ambientBtn.classList.toggle('playing', ok);
        }
      });
      row.appendChild(lbl); row.appendChild(slider); row.appendChild(val);
      trackList.appendChild(row);
    });

    document.querySelectorAll('.ambPresetBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.preset;
        const presets = {
          rain: { rain: 75, fire: 0, library: 0, night: 20, waves: 0 },
          fire: { rain: 0, fire: 80, library: 20, night: 0, waves: 0 },
          library: { rain: 0, fire: 0, library: 85, night: 15, waves: 0 },
          waves: { rain: 20, fire: 0, library: 0, night: 0, waves: 80 }
        };
        const target = presets[p];
        if (!target) return;
        Object.keys(target).forEach((k) => {
          window.StudyAmbient.setTrackVolume(k, target[k]);
          const sl = trackList.querySelector(`input[data-track="${k}"]`);
          if (sl) sl.value = target[k];
          const vl = $('#ambVal_' + k);
          if (vl) vl.textContent = target[k] + '%';
        });
        masterToggle.checked = true;
        const ok = window.StudyAmbient.toggleMasterSound(true);
        if (!ok) masterToggle.checked = false;
        ambientBtn.classList.toggle('playing', ok);
      });
    });
  }

  /* ===== 氛围微动粒子 / 屏幕效果 ===== */
  const FX_SUPPORTED = ['rain', 'snow', 'dust', 'fireflies', 'windowRain'];
  const FX_HINT_DEFAULT = '前四种是轻量 Canvas 粒子；💧 窗户雨滴用 WebGL 实时折射，水滴里映出的是窗外壁纸，像隔着一层真玻璃';

  /* 当前真正生效的效果名：屏幕效果关闭时一律为 none */
  function activeFx() {
    if (!state.settings.screenFx) return 'none';
    const e = state.settings.particleEffect;
    return FX_SUPPORTED.indexOf(e) >= 0 ? e : 'rain';
  }

  /* 壁纸或暗化变化时，重新烘焙窗户雨滴的折射底图 */
  function syncWindowRainBackdrop() {
    if (!window.StudyWindowRain) return;
    const url = resolveBg(state.settings.bg);
    window.StudyWindowRain.setBackdrop(!url || url === 'black' ? '' : url, U.clamp(state.settings.dim, 0.15, 1, 0.62));
  }

  function windowRainUsable() {
    return !!(window.StudyWindowRain && window.StudyWindowRain.isSupported());
  }

  /* 统一入口：所有影响屏幕效果的设置变化都从这里刷新，避免「点了没反应」 */
  function applyScreenFx() {
    const fx = activeFx();
    const isWindow = fx === 'windowRain';

    if (window.StudyParticles) window.StudyParticles.setEffect(isWindow ? 'none' : fx);
    if (isWindow) syncWindowRainBackdrop();
    if (window.StudyWindowRain) window.StudyWindowRain.setEnabled(isWindow);

    const body = $('#fxBody');
    if (body) body.classList.toggle('collapsed', !state.settings.screenFx);

    document.querySelectorAll('#particleOpts .particleOpt').forEach((b) => {
      b.classList.toggle('active', b.dataset.effect === (state.settings.particleEffect || 'rain'));
    });

    const rainBox = $('#rainParamsBox');
    if (rainBox) {
      rainBox.style.display = (state.settings.screenFx && state.settings.particleEffect === 'rain') ? 'block' : 'none';
    }
  }

  /* WebGL2 不可用时给出就地说明，不让用户以为「坏了」 */
  function markWindowRainUnsupported() {
    const hint = $('#fxHint');
    if (!hint) return;
    hint.textContent = '当前浏览器不支持 WebGL2，窗户雨滴无法启用。可换用较新的浏览器，或改用细雨、飘雪等粒子效果。';
    hint.style.color = '#ffb4a2';
  }

  function initParticles() {
    if (window.StudyParticles) window.StudyParticles.init();
    if (window.StudyWindowRain) window.StudyWindowRain.init();
    syncWindowRainBackdrop();

    const speedLabels = ['', '极慢静谧 (1档)', '舒缓细雨 (2档)', '适中雨势 (3档)', '较快降雨 (4档)', '急雨 (5档)'];
    const densityLabels = ['', '零星微雨 (1档)', '疏朗细雨 (2档)', '标准降雨 (3档)', '密集降雨 (4档)', '密雨倾盆 (5档)'];
    const rainSpeedRange = $('#rainSpeedRange'),
          rainDensityRange = $('#rainDensityRange'), rainSpeedVal = $('#rainSpeedVal'),
          rainDensityVal = $('#rainDensityVal');

    function syncRainParamsUI() {
      const sp = state.settings.rainSpeed || 2, den = state.settings.rainDensity || 2;
      if (rainSpeedRange) rainSpeedRange.value = sp;
      if (rainDensityRange) rainDensityRange.value = den;
      if (rainSpeedVal) rainSpeedVal.textContent = speedLabels[sp] || `${sp}档`;
      if (rainDensityVal) rainDensityVal.textContent = densityLabels[den] || `${den}档`;
    }

    if (window.StudyParticles) {
      window.StudyParticles.setConfig({
        rainSpeed: state.settings.rainSpeed || 2,
        rainDensity: state.settings.rainDensity || 2
      });
    }
    syncRainParamsUI();

    const motionHint = $('#motionHint');
    if (motionHint && REDUCED) motionHint.style.display = 'block';

    /* 屏幕效果总开关：关掉后整块选项收起，画面完全静止 */
    const swFx = $('#swScreenFx');
    if (swFx) {
      swFx.checked = !!state.settings.screenFx;
      swFx.addEventListener('change', function () {
        state.settings.screenFx = this.checked;
        saveSettings();
        applyScreenFx();
      });
    }

    /* 效果选项：与「无」互斥的关系改由上面的总开关承担 */
    document.querySelectorAll('#particleOpts .particleOpt').forEach((btn) => {
      btn.addEventListener('click', function () {
        const chosen = this.dataset.effect;
        if (chosen === 'windowRain' && !windowRainUsable()) {
          markWindowRainUnsupported();
          return;
        }
        state.settings.particleEffect = chosen;
        state.settings.screenFx = true;   // 直接点选项即视为要开启
        saveSettings();
        applyScreenFx();
      });
    });

    if (rainSpeedRange) rainSpeedRange.addEventListener('input', function () {
      const val = parseInt(this.value, 10) || 2;
      state.settings.rainSpeed = val; saveSettings();
      if (rainSpeedVal) rainSpeedVal.textContent = speedLabels[val] || `${val}档`;
      if (window.StudyParticles) window.StudyParticles.setConfig({ rainSpeed: val });
    });
    if (rainDensityRange) rainDensityRange.addEventListener('input', function () {
      const val = parseInt(this.value, 10) || 2;
      state.settings.rainDensity = val; saveSettings();
      if (rainDensityVal) rainDensityVal.textContent = densityLabels[val] || `${val}档`;
      if (window.StudyParticles) window.StudyParticles.setConfig({ rainDensity: val });
    });

    applyScreenFx();
  }

  /* ===== 自定义暗黑主题目标日期选择器 ===== */
  function initCustomDatePicker() {
    const btn = $('#customDateBtn'), popover = $('#datePickerPopover'),
          monthTitle = $('#dpMonthTitle'), prevBtn = $('#dpPrevMonth'),
          nextBtn = $('#dpNextMonth'), daysGrid = $('#dpDaysGrid'),
          hiddenInput = $('#targetDateInput'),
          yearInput = $('#dpYearInput'), monthInput = $('#dpMonthInput'), dayInput = $('#dpDayInput');
    if (!btn || !popover || !daysGrid) return;

    const now0 = new Date();
    let curYear = now0.getFullYear(), curMonth = now0.getMonth();

    function parseTargetDate() {
      const d = state.settings.targetDate;
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const parts = d.split('-').map(Number);
        return { y: parts[0], m: parts[1] - 1, d: parts[2] };
      }
      const n = new Date();
      return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
    }
    function formatYMD(y, m, d) {
      return y + '-' + U.pad2(m + 1) + '-' + U.pad2(d);
    }
    function renderCalendar() {
      if (monthTitle) monthTitle.textContent = `${curYear}年 ${curMonth + 1}月`;
      daysGrid.innerHTML = '';
      const targetStr = state.settings.targetDate;
      const todayStr = U.localDateKey(new Date());
      const firstDayWeek = new Date(curYear, curMonth, 1).getDay();
      const totalDays = new Date(curYear, curMonth + 1, 0).getDate();
      const prevMonthDays = new Date(curYear, curMonth, 0).getDate();
      for (let i = firstDayWeek - 1; i >= 0; i--) {
        const span = document.createElement('span');
        span.className = 'dpDay other-month'; span.textContent = prevMonthDays - i;
        daysGrid.appendChild(span);
      }
      for (let day = 1; day <= totalDays; day++) {
        const btnDay = document.createElement('button');
        btnDay.type = 'button'; btnDay.className = 'dpDay'; btnDay.textContent = day;
        const dateStr = formatYMD(curYear, curMonth, day);
        if (dateStr === targetStr) btnDay.classList.add('active');
        if (dateStr === todayStr) btnDay.classList.add('today');
        btnDay.addEventListener('click', (e) => { e.stopPropagation(); selectDate(dateStr, true); });
        daysGrid.appendChild(btnDay);
      }
    }
    function selectDate(dateStr, closeAfterSelect = false) {
      state.settings.targetDate = dateStr; saveSettings(); syncDisplay();
      renderCountdownLine();
      if (popover.classList.contains('show')) {
        const t = parseTargetDate(); curYear = t.y; curMonth = t.m; renderCalendar();
      }
      if (closeAfterSelect) closePopover();
    }
    function syncDisplay() {
      const d = state.settings.targetDate, t = parseTargetDate();
      if (hiddenInput) hiddenInput.value = d || '';
      if (yearInput) yearInput.value = t.y;
      if (monthInput) monthInput.value = t.m + 1;
      if (dayInput) dayInput.value = t.d;
    }
    function adjustDatePart(part, delta) {
      const curr = parseTargetDate();
      if (part === 'year') curr.y = Math.min(2099, Math.max(2020, curr.y + delta));
      else if (part === 'month') {
        curr.m += delta;
        if (curr.m < 0) { curr.m = 11; curr.y = Math.max(2020, curr.y - 1); }
        else if (curr.m > 11) { curr.m = 0; curr.y = Math.min(2099, curr.y + 1); }
      } else if (part === 'day') {
        const dt = new Date(curr.y, curr.m, curr.d + delta);
        curr.y = dt.getFullYear(); curr.m = dt.getMonth(); curr.d = dt.getDate();
      }
      const maxDays = new Date(curr.y, curr.m + 1, 0).getDate();
      if (curr.d > maxDays) curr.d = maxDays;
      if (curr.d < 1) curr.d = 1;
      selectDate(formatYMD(curr.y, curr.m, curr.d), false);
    }
    function handleDateInputsManual() {
      let y = parseInt(yearInput ? yearInput.value : '', 10);
      let m = parseInt(monthInput ? monthInput.value : '', 10);
      let d = parseInt(dayInput ? dayInput.value : '', 10);
      if (isNaN(y) || y < 2020) y = new Date().getFullYear();
      if (y > 2099) y = 2099;
      if (isNaN(m) || m < 1) m = 1;
      if (m > 12) m = 12;
      const maxDays = new Date(y, m, 0).getDate();
      if (isNaN(d) || d < 1) d = 1;
      if (d > maxDays) d = maxDays;
      selectDate(formatYMD(y, m - 1, d), false);
    }
    if ($('#dpYearUp')) $('#dpYearUp').addEventListener('click', () => adjustDatePart('year', 1));
    if ($('#dpYearDown')) $('#dpYearDown').addEventListener('click', () => adjustDatePart('year', -1));
    if (yearInput) yearInput.addEventListener('change', handleDateInputsManual);
    if ($('#dpMonthUp')) $('#dpMonthUp').addEventListener('click', () => adjustDatePart('month', 1));
    if ($('#dpMonthDown')) $('#dpMonthDown').addEventListener('click', () => adjustDatePart('month', -1));
    if (monthInput) monthInput.addEventListener('change', handleDateInputsManual);
    if ($('#dpDayUp')) $('#dpDayUp').addEventListener('click', () => adjustDatePart('day', 1));
    if ($('#dpDayDown')) $('#dpDayDown').addEventListener('click', () => adjustDatePart('day', -1));
    if (dayInput) dayInput.addEventListener('change', handleDateInputsManual);

    function openPopover() {
      const t = parseTargetDate(); curYear = t.y; curMonth = t.m;
      renderCalendar(); popover.classList.add('show');
      const rect = btn.getBoundingClientRect();
      const popoverWidth = popover.offsetWidth || 270;
      const popoverHeight = popover.offsetHeight || 310;
      let left = rect.right - popoverWidth;
      if (left < 14) left = 14;
      if (left + popoverWidth > window.innerWidth - 14) left = window.innerWidth - popoverWidth - 14;
      let top;
      if (rect.bottom + 8 + popoverHeight <= window.innerHeight - 16) top = rect.bottom + 8;
      else if (rect.top - 8 - popoverHeight >= 16) top = rect.top - 8 - popoverHeight;
      else top = Math.max(16, Math.round((window.innerHeight - popoverHeight) / 2));
      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    }
    function closePopover() { popover.classList.remove('show'); }
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      if (popover.classList.contains('show')) closePopover(); else openPopover();
    });
    if (prevBtn) prevBtn.addEventListener('click', (e) => {
      e.stopPropagation(); curMonth--;
      if (curMonth < 0) { curMonth = 11; curYear--; }
      renderCalendar();
    });
    if (nextBtn) nextBtn.addEventListener('click', (e) => {
      e.stopPropagation(); curMonth++;
      if (curMonth > 11) { curMonth = 0; curYear++; }
      renderCalendar();
    });
    popover.querySelectorAll('.dpPill').forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const days = parseInt(pill.dataset.days, 10);
        if (days) {
          const target = U.addDays(new Date(), days);
          selectDate(U.localDateKey(target), true);
        }
      });
    });
    popover.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', (e) => {
      if (popover.classList.contains('show') && !popover.contains(e.target) && !btn.contains(e.target)) closePopover();
    });
    const sBody = document.querySelector('.sBody');
    if (sBody) sBody.addEventListener('scroll', () => { if (popover.classList.contains('show')) closePopover(); });
    window.addEventListener('resize', () => { if (popover.classList.contains('show')) closePopover(); });
    syncDisplay();
  }

  /* ===== 主初始化入口 ===== */
  function init() {
    bindEvents();
    initSettingsTabs();
    initAmbientMixer();
    initParticles();
    initSetTodos();
    initCustomDatePicker();
    setupShortcuts();
    setupOnboard();
    bindSizeControl();

    preloadFonts();
    applyFont(); syncSize(); applyFlip(); applySecStyle(); syncSecStyleButtons();
    applyDate(); applyMottoSetting(); renderTodos();
    window.addEventListener('resize', () => {
      clearTimeout(relayoutTimer);
      relayoutTimer = setTimeout(relayoutForViewport, 140);
      if (window.StudyWindowRain) window.StudyWindowRain.resize();
    });
    hydrateTimers();
    setMode(state.settings.mode || 'clock', true); // 启动时不弹出模式栏
    updateVisibility();
    tick(); // 立即渲染并启动唯一心跳

    initBackgroundStorage(); // 异步，不阻塞上面的渲染
    setTimeout(dismissSplash, 2800); // 兜底：壁纸迟迟未就绪也按时淡出启动页
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    if (!TOUCH) armHide();
  }

  init();
})();
