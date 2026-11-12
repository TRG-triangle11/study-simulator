/**
 * app.js — 自习模拟器（Study Simulator）核心交互逻辑
 */

(function () {
  "use strict";

  /* ===== 预设默认背景 (自习书桌/田野/高楼俯瞰 · 白天/夜空/晴天/雨天 · 动漫/写实) ===== */
  const DEFAULT_BGS = [
    { id: 'black',             name: '纯黑极简',       url: 'black' },
    { id: 'desk_sunny_real',   name: '书桌·晴天·写实', url: 'assets/desk_sunny_real.jpg' },
    { id: 'desk_sunny_anime',  name: '书桌·晴天·动漫', url: 'assets/desk_sunny_anime.jpg' },
    { id: 'desk_rainy_real',   name: '书桌·雨天·写实', url: 'assets/desk_rainy_real.jpg' },
    { id: 'desk_rainy_anime',  name: '书桌·雨天·动漫', url: 'assets/desk_rainy_anime.jpg' },
    { id: 'desk_sunset_real',  name: '书桌·黄昏·写实', url: 'assets/desk_sunset_real.jpg' },
    { id: 'desk_sunset_anime', name: '书桌·黄昏·动漫', url: 'assets/desk_sunset_anime.jpg' },
    { id: 'desk_city_night2',  name: '书桌·高楼夜景',   url: 'assets/test_city_night2.jpg' },
    { id: 'desk_city_night1',  name: '城市·皓月夜景',   url: 'assets/test_city_night.jpg' },
    { id: 'desk_field_day',    name: '窗前·碧绿田野',   url: 'assets/test_field_day.jpg' },
    { id: 'desk_window_dusk',  name: '书桌·高楼黄昏',   url: 'assets/test_desk_window.jpg' },
    { id: 'city_sunny',        name: '高楼俯瞰·白天',   url: 'assets/city_sunny_real.jpg' },
    { id: 'city_night',        name: '高楼俯瞰·夜空',   url: 'assets/city_night_real.jpg' },
    { id: 'field_sunny',       name: '田野·晴空·自然', url: 'assets/field_sunny_real.jpg' },
    { id: 'field_sunny_anime', name: '田野·晴空·动漫', url: 'assets/field_sunny_anime.jpg' },
    { id: 'field_night',       name: '田野·星夜·自然', url: 'assets/field_night_real.jpg' }
  ];

  /* ===== 字体方案 ===== */
  const FONTS = [
    { id: 'modern',   name: '现代无衬线 (HarmonyOS)', css: '"HarmonyOS Sans SC", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif', sample: '1234567890' },
    { id: 'orbitron', name: '未来科技 (Orbitron)',    css: '"Orbitron", "Consolas", monospace', sample: '1234567890' },
    { id: 'cinzel',   name: '古典衬线 (Cinzel)',      css: '"Cinzel", "Times New Roman", serif', sample: '1234567890' },
    { id: 'dsd7',     name: '七段数码 (DSEG7)',       css: '"DSD7", "Consolas", monospace', sample: '1234567890' }
  ];

  /* ===== 励志/专注寄语 (52条精练名言，短小有力) ===== */
  const MOTTO_LIST = [
    "追光的人，终会万丈光芒。",
    "耐得住寂寞，才守得住繁华。",
    "星光不问赶路人，时光不负有心人。",
    "行远自迩，笃行不怠。",
    "书山有路勤为径，学海无涯苦作舟。",
    "每一个专注的当下，都在构筑未来的你。",
    "保持热爱，奔赴山海。",
    "宁静致远，淡泊明志。",
    "心有所向，日复一日，必有精进。",
    "沉下心来，把一件事做到极致。",
    "慢慢来，谁不是翻山越岭去相见。",
    "种一棵树最好的时间是十年前，其次是现在。",
    "不积跬步，无以至千里。",
    "追风赶月莫停留，平芜尽处是春山。",
    "答案在路上，自由在风里。",
    "乾坤未定，你我皆是黑马。",
    "坚持很难，但放弃会更遗憾。",
    "既然选择了远方，便只顾风雨兼程。",
    "少年何妨梦摘星，敢挽桑弓射玉衡。",
    "愿你历尽千帆，归来仍是少年。",
    "凡是过往，皆为序章。",
    "莫道桑榆晚，为霞尚满天。",
    "业精于勤荒于嬉，行成于思毁于随。",
    "行百里者半九十，越接近成功越需坚持。",
    "每一个不曾起舞的日子，都是对生命的辜负。",
    "悟已往之不谏，知来者之可追。",
    "博观而约取，厚积而薄发。",
    "自律是通往自由的唯一途径。",
    "日拱一卒无懈怠，功不唐捐终成器。",
    "生活的泥沙俱下，但依然要奔赴山海。",
    "今日事今日毕，莫把光阴空蹉跎。",
    "远方有灯，脚下有路，眼前有光。",
    "专注当下，不负韶华。",
    "读书百遍，其义自见。",
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
    "默默努力，悄悄拔尖。",
    "心之所向，无问西东。",
    "纵有疾风起，人生不言弃。",
    "一步一个脚印，终能踏上顶峰。",
    "流水不争先，争的是滔滔不绝。"
  ];

  /* ===== 状态与持久化 ===== */
  const SKEY = 'studySimSettings', TKEY = 'studySimTodos';

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SKEY));
      return s || {};
    } catch (e) {
      return {};
    }
  }

  function loadTodos() {
    try {
      const t = JSON.parse(localStorage.getItem(TKEY));
      if (t && typeof t === 'object' && !Array.isArray(t)) {
        return { L: Array.isArray(t.L) ? t.L : [], R: Array.isArray(t.R) ? t.R : [] };
      }
      return { L: [], R: [] };
    } catch (e) {
      return { L: [], R: [] };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SKEY, JSON.stringify(state.settings));
    } catch (e) {
      console.warn('localStorage 保存设置失败:', e);
    }
  }

  function saveTodos() {
    try {
      localStorage.setItem(TKEY, JSON.stringify(state.todos));
    } catch (e) {
      console.warn('localStorage 保存待办失败:', e);
    }
  }

  const initialSettings = Object.assign({
    mode: 'clock',            // clock | pomodoro | stopwatch | target
    font: 'modern',
    size: 120,
    flip: false,
    bg: 'desk_sunny_real',
    dim: 0.62,
    showSec: true,
    secStyle: 'compact',
    showDate: true,
    dateSize: 22,
    dateSpacing: 0.22,
    showYear: true,
    showMonthDay: true,
    showWeekday: true,
    todoSize: 14,
    todoOpacity: 0.6,
    showMotto: true,
    soundEnabled: true,
    pomoWorkMin: 25,
    pomoBreakMin: 5,
    targetTitle: '距离 目标日 还有',
    targetDate: getDefaultTargetDate(),
    particleEffect: 'none',
    rainSpeed: 2,
    rainDensity: 2
  }, loadSettings());

  // 兼容迁移已废弃的历史壁纸设置
  const obsoleteBgMap = {
    nature_valley:      'desk_sunny_real',
    city_night_anime:   'desk_city_night2',
    classroom_anime:    'desk_sunny_anime',
    classroom_real:     'desk_sunny_real',
    library_anime:      'desk_rainy_anime',
    library_real:       'desk_rainy_real',
    desk_anime:         'desk_rainy_anime',
    desk_real:          'desk_sunny_real',
    window_anime:       'desk_sunny_anime',
    window_real:        'desk_rainy_real',
    window_sunny_anime: 'desk_sunny_anime',
    window_sunny_real:  'desk_sunny_real',
    window_rainy_anime: 'desk_rainy_anime',
    window_rainy_real:  'desk_rainy_real'
  };
  if (obsoleteBgMap[initialSettings.bg]) {
    initialSettings.bg = obsoleteBgMap[initialSettings.bg];
  }

  const state = {
    settings: initialSettings,
    todos: loadTodos(),
    customBgs: [],              // IndexedDB 存储的自定义背景
    // 计时器运行时状态
    pomodoro: {
      status: 'work',           // work | break
      remaining: 25 * 60,
      isRunning: false,
      timerId: null,
      rounds: 0
    },
    stopwatch: {
      elapsed: 0,
      isRunning: false,
      timerId: null
    },
    mottoIndex: 0,
    zenMode: false
  };

  function getDefaultTargetDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  }

  /* ===== DOM 元素快速获取 ===== */
  const $ = (s) => document.querySelector(s);
  const elBg = $('#bg'), elVignette = $('#vignette'),
        elClock = $('#clock'), elDate = $('#date'),
        elTH = $('#tH'), elTM = $('#tM'), elTS = $('#tS'),
        elSecWrap = $('.sec-wrap'), elTime = $('#time'),
        zoneL = $('#todoZoneLeft'), zoneR = $('#todoZoneRight'),
        remindL = $('#todoRemindL'), remindR = $('#todoRemindR'),
        settingsEl = $('#settings'), settingsBox = $('#settingsBox'),
        fontDetail = $('#fontDetail'), fdGrid = $('#fdGrid'),
        fontEntry = $('#fontEntry'), feCurName = $('#feCurName'),
        fsBtn = $('#fsBtn'), fileInput = $('#fileInput');

  // 扩展控件元素
  const modeBar = $('#modeBar'),
        zenExitBtn = $('#zenExitBtn'),
        timerBadge = $('#timerBadge'),
        targetTitle = $('#targetTitle'),
        timerControls = $('#timerControls'),
        timerToggleBtn = $('#timerToggleBtn'),
        timerResetBtn = $('#timerResetBtn'),
        timerSkipBtn = $('#timerSkipBtn'),
        mottoWrap = $('#mottoWrap'),
        mottoText = $('#mottoText');

  /* ===== IndexedDB 背景加载与老数据迁移 ===== */
  async function initBackgroundStorage() {
    if (window.StudyDB) {
      try {
        // 自动迁移老版本存放在 localStorage 中的 customBgs（若有）
        const oldBgs = state.settings.customBgs;
        if (Array.isArray(oldBgs) && oldBgs.length > 0) {
          for (let bg of oldBgs) {
            await window.StudyDB.saveBg(bg);
          }
          delete state.settings.customBgs;
          saveSettings();
        }

        // 从 IndexedDB 读取全量自定义背景
        const storedBgs = await window.StudyDB.getAllBgs();
        state.customBgs = storedBgs || [];
      } catch (err) {
        console.warn('读取/迁移 IndexedDB 背景失败，使用空自定义背景列表:', err);
        state.customBgs = [];
      }
    }
    buildBgGrid();
    applyBg();
  }

  /* ===== 背景渲染 ===== */
  function resolveBg(bgId) {
    const c = state.customBgs || [];
    for (let i = 0; i < c.length; i++) {
      if (c[i].id === bgId) return c[i].url;
    }
    for (let j = 0; j < DEFAULT_BGS.length; j++) {
      if (DEFAULT_BGS[j].id === bgId) return DEFAULT_BGS[j].url;
    }
    return DEFAULT_BGS[1].url;
  }

  let _appliedBg = null;
  function applyBg() {
    const url = resolveBg(state.settings.bg);
    const d = Math.min(1, Math.max(0.15, state.settings.dim || 0.62));
    elVignette.style.opacity = d;

    if (url === _appliedBg) return;
    _appliedBg = url;

    if (url === 'black') {
      elBg.style.backgroundImage = 'none';
      elBg.style.backgroundColor = '#0a0c10';
    } else {
      elBg.style.backgroundColor = '';
      elBg.style.backgroundImage = 'none';
      const img = new Image();
      img.onload = () => { elBg.style.backgroundImage = `url(${url})`; };
      img.src = url;
    }
  }

  function buildBgGrid() {
    const grid = $('#bgGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const customCards = (state.customBgs || []).map((b) => ({
      id: b.id, name: '自定义', url: b.url, custom: true
    }));
    const all = customCards.concat(DEFAULT_BGS);

    all.forEach((b) => {
      const div = document.createElement('div');
      div.className = 'bgCard' + (b.id === state.settings.bg ? ' active' : '');

      if (b.url === 'black') {
        div.style.backgroundColor = '#0a0c10';
      } else {
        div.style.backgroundImage = `url(${b.url})`;
      }

      if (b.custom) {
        div.innerHTML = `<span class="tag">自定义</span><button class="rm" title="删除此背景">✕</button>`;
        div.onclick = (e) => {
          if (e.target.classList.contains('rm')) return;
          state.settings.bg = b.id;
          saveSettings();
          buildBgGrid();
          applyBg();
        };
        div.querySelector('.rm').onclick = async (e) => {
          e.stopPropagation();
          if (window.StudyDB) {
            await window.StudyDB.deleteBg(b.id);
          }
          state.customBgs = state.customBgs.filter((x) => x.id !== b.id);
          if (state.settings.bg === b.id) state.settings.bg = DEFAULT_BGS[1].id;
          saveSettings();
          buildBgGrid();
          applyBg();
        };
      } else {
        div.innerHTML = `<span class="tag">${b.name}</span>`;
        div.onclick = () => {
          state.settings.bg = b.id;
          saveSettings();
          buildBgGrid();
          applyBg();
        };
      }
      grid.appendChild(div);
    });

    // 紧跟在所有预设与自定义背景之后的“添加自定义背景”按钮，无须另起一行
    const upCard = document.createElement('div');
    upCard.className = 'bgCard upload';
    upCard.id = 'bgUpload';
    upCard.title = '上传自定义壁纸 (永久保存在本地数据库)';
    upCard.innerHTML = `
      <span class="upPlus">＋</span>
      <span class="upLabel">自定义壁纸</span>
    `;
    upCard.onclick = () => {
      if (fileInput) fileInput.click();
    };
    grid.appendChild(upCard);
  }

  /* 上传自定义背景并保存到 IndexedDB */
  if (fileInput) {
    fileInput.addEventListener('change', function (ev) {
      const f = ev.target.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) {
        alert('请选择有效的图片文件');
        return;
      }
      const reader = new FileReader();
      reader.onload = async function () {
        const id = 'custom_' + Date.now();
        const bgItem = { id, name: '自定义', url: reader.result, created_at: Date.now() };

        if (window.StudyDB) {
          await window.StudyDB.saveBg(bgItem);
        }
        state.customBgs.push(bgItem);
        state.settings.bg = id;
        saveSettings();
        buildBgGrid();
        applyBg();
      };
      reader.readAsDataURL(f);
      ev.target.value = '';
    });
  }

  /* ===== 字体应用 ===== */
  function applyFont() {
    const fn = FONTS.find((x) => x.id === state.settings.font) || FONTS[0];
    elTime.style.fontFamily = fn.css;
    if (feCurName) feCurName.textContent = fn.name;
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
      pre.className = 'fdPre';
      pre.textContent = fn.sample;
      pre.style.fontFamily = fn.css;
      const name = document.createElement('div');
      name.className = 'fdName';
      name.textContent = fn.name;
      c.appendChild(pre);
      c.appendChild(name);
      c.onclick = () => {
        state.settings.font = fn.id;
        saveSettings();
        applyFont();
        buildFdGrid();
        buildFonts();
        closeFontDetail();
      };
      fdGrid.appendChild(c);
    });
  }

  function openFontDetail() {
    buildFdGrid();
    if (fontDetail) fontDetail.classList.add('show');
  }
  function closeFontDetail() {
    if (fontDetail) fontDetail.classList.remove('show');
  }

  function applyFlip() {
    elTime.classList.toggle('flip', !!state.settings.flip);
  }

  function setupSize() {
    const range = $('#sizeRange');
    if (!range) return;
    range.value = state.settings.size;
    const sync = (v) => {
      elTime.style.fontSize = v + 'px';
      $('#sizeVal').textContent = v + 'px';
      $('#sizeOut').textContent = v;
    };
    sync(state.settings.size);
    range.addEventListener('input', () => sync(range.value));
    range.addEventListener('change', () => {
      state.settings.size = parseInt(range.value, 10);
      saveSettings();
    });
  }

  /* ===== 辅助函数 ===== */
  const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const pad = (n) => (n < 10 ? '0' : '') + n;

  /* ===== 模式切换与渲染主引擎 ===== */
  function setMode(mode) {
    state.settings.mode = mode;
    saveSettings();

    // 更新顶部栏样式
    document.querySelectorAll('.modeBtn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    showModeBarTemporarily(1800);

    // 状态与显示控制
    if (mode === 'clock') {
      if (timerBadge) timerBadge.style.display = 'none';
      if (targetTitle) targetTitle.style.display = 'none';
      if (timerControls) timerControls.style.display = 'none';
      elDate.style.display = state.settings.showDate ? '' : 'none';
      elSecWrap.style.display = state.settings.showSec ? '' : 'none';
    } else if (mode === 'pomodoro') {
      if (timerBadge) {
        timerBadge.style.display = 'inline-flex';
        updatePomoBadge();
      }
      if (targetTitle) targetTitle.style.display = 'none';
      if (timerControls) {
        timerControls.style.display = 'flex';
        timerSkipBtn.style.display = 'inline-flex';
        updateTimerControls();
      }
      elDate.style.display = 'none';
      elSecWrap.style.display = 'none';
    } else if (mode === 'stopwatch') {
      if (timerBadge) {
        timerBadge.style.display = 'inline-flex';
        timerBadge.className = '';
        timerBadge.textContent = '正向专注计时';
      }
      if (targetTitle) targetTitle.style.display = 'none';
      if (timerControls) {
        timerControls.style.display = 'flex';
        timerSkipBtn.style.display = 'none'; // 正计时不需要跳过，重置或记录即可
        updateTimerControls();
      }
      elDate.style.display = 'none';
      elSecWrap.style.display = '';
    } else if (mode === 'target') {
      if (timerBadge) timerBadge.style.display = 'none';
      if (targetTitle) {
        targetTitle.style.display = 'block';
        targetTitle.textContent = state.settings.targetTitle || '距离 目标 还有';
      }
      if (timerControls) timerControls.style.display = 'none';
      elDate.style.display = 'none';
      elSecWrap.style.display = 'none';
    }

    renderCurrentMode();
  }

  function renderCurrentMode() {
    const m = state.settings.mode;
    if (m === 'clock') {
      renderClockTime();
    } else if (m === 'pomodoro') {
      renderPomodoroTime();
    } else if (m === 'stopwatch') {
      renderStopwatchTime();
    } else if (m === 'target') {
      renderTargetCountdown();
    }
  }

  /* 1. 实时时钟渲染 */
  function renderClockTime() {
    const now = new Date();
    elTH.textContent = pad(now.getHours());
    elTM.textContent = pad(now.getMinutes());
    elTS.textContent = pad(now.getSeconds());

    if (state.settings.showDate) {
      const parts = [];
      if (state.settings.showYear) parts.push(now.getFullYear() + ' 年');
      if (state.settings.showMonthDay) parts.push((now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日');
      if (state.settings.showWeekday) parts.push('\u3000' + WEEK[now.getDay()]);
      elDate.textContent = parts.join(' ');
    }
  }

  /* 2. 番茄钟系统 */
  function updatePomoBadge() {
    if (!timerBadge) return;
    const isWork = state.pomodoro.status === 'work';
    timerBadge.className = isWork ? '' : 'break';
    timerBadge.textContent = isWork
      ? `专注中 · 第 ${state.pomodoro.rounds + 1} 轮`
      : `小憩休息中 · 舒展一下`;
  }

  function renderPomodoroTime() {
    const rem = state.pomodoro.remaining;
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    elTH.textContent = pad(m);
    elTM.textContent = pad(s);
  }

  function togglePomodoro() {
    if (state.pomodoro.isRunning) {
      pausePomodoro();
    } else {
      startPomodoro();
    }
    updateTimerControls();
  }

  function startPomodoro() {
    if (state.pomodoro.isRunning) return;
    state.pomodoro.isRunning = true;
    if (window.StudySound && state.settings.soundEnabled) {
      window.StudySound.playSoftTick();
    }
    state.pomodoro.timerId = setInterval(() => {
      if (state.pomodoro.remaining > 0) {
        state.pomodoro.remaining--;
        renderPomodoroTime();
      } else {
        // 本阶段结束！
        handlePomodoroStageEnd();
      }
    }, 1000);
  }

  function pausePomodoro() {
    state.pomodoro.isRunning = false;
    clearInterval(state.pomodoro.timerId);
    state.pomodoro.timerId = null;
  }

  function resetPomodoro() {
    pausePomodoro();
    state.pomodoro.status = 'work';
    state.pomodoro.remaining = (state.settings.pomoWorkMin || 25) * 60;
    updatePomoBadge();
    renderPomodoroTime();
    updateTimerControls();
  }

  function skipPomodoroStage() {
    pausePomodoro();
    handlePomodoroStageEnd(true);
  }

  function handlePomodoroStageEnd(isSkip = false) {
    pausePomodoro();

    // 播放禅意空灵铃声
    if (window.StudySound && state.settings.soundEnabled) {
      window.StudySound.playFocusChime();
    }

    if (state.pomodoro.status === 'work') {
      // 记录专注历史
      if (!isSkip && window.StudyDB) {
        const dur = state.settings.pomoWorkMin || 25;
        window.StudyDB.addFocusRecord({
          type: 'pomodoro',
          durationMinutes: dur,
          timestamp: Date.now()
        });
      }
      state.pomodoro.rounds++;
      state.pomodoro.status = 'break';
      state.pomodoro.remaining = (state.settings.pomoBreakMin || 5) * 60;
    } else {
      state.pomodoro.status = 'work';
      state.pomodoro.remaining = (state.settings.pomoWorkMin || 25) * 60;
    }

    updatePomoBadge();
    renderPomodoroTime();
    updateTimerControls();
  }

  /* 3. 正向计时系统 */
  function renderStopwatchTime() {
    const total = state.stopwatch.elapsed;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    elTH.textContent = pad(h);
    elTM.textContent = pad(m);
    elTS.textContent = pad(s);
  }

  function toggleStopwatch() {
    if (state.stopwatch.isRunning) {
      pauseStopwatch();
    } else {
      startStopwatch();
    }
    updateTimerControls();
  }

  function startStopwatch() {
    if (state.stopwatch.isRunning) return;
    state.stopwatch.isRunning = true;
    if (window.StudySound && state.settings.soundEnabled) {
      window.StudySound.playSoftTick();
    }
    state.stopwatch.timerId = setInterval(() => {
      state.stopwatch.elapsed++;
      renderStopwatchTime();
    }, 1000);
  }

  function pauseStopwatch() {
    state.stopwatch.isRunning = false;
    clearInterval(state.stopwatch.timerId);
    state.stopwatch.timerId = null;
  }

  function resetStopwatch() {
    // 若已有计时，记录入历史
    if (state.stopwatch.elapsed >= 60 && window.StudyDB) {
      const mins = Math.round(state.stopwatch.elapsed / 60);
      window.StudyDB.addFocusRecord({
        type: 'stopwatch',
        durationMinutes: mins,
        timestamp: Date.now()
      });
    }
    pauseStopwatch();
    state.stopwatch.elapsed = 0;
    renderStopwatchTime();
    updateTimerControls();
  }

  /* 4. 目标倒计时渲染 */
  function renderTargetCountdown() {
    const target = new Date(state.settings.targetDate + 'T00:00:00').getTime();
    const now = Date.now();
    let diff = Math.max(0, Math.floor((target - now) / 1000));

    const days = Math.floor(diff / 86400);
    diff %= 86400;
    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const mins = Math.floor(diff / 60);

    elTH.textContent = days;
    elTM.textContent = pad(hours);
    elTS.textContent = pad(mins);
  }

  function updateTimerControls() {
    const m = state.settings.mode;
    if (m === 'pomodoro') {
      timerToggleBtn.textContent = state.pomodoro.isRunning ? '⏸ 暂停' : '▶ 开始专注';
      timerToggleBtn.classList.toggle('primary', !state.pomodoro.isRunning);
    } else if (m === 'stopwatch') {
      timerToggleBtn.textContent = state.stopwatch.isRunning ? '⏸ 暂停' : '▶ 开始计时';
      timerToggleBtn.classList.toggle('primary', !state.stopwatch.isRunning);
    }
  }

  /* ===== 每日寄语 / Quotes 交互 ===== */
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
    if (mottoWrap) {
      mottoWrap.style.display = state.settings.showMotto ? 'flex' : 'none';
      if (mottoText && !mottoText.textContent) {
        mottoText.textContent = `“${MOTTO_LIST[0]}”`;
      }
    }
  }

  /* ===== 禅意极简模式 (Zen Mode) ===== */
  function toggleZenMode() {
    state.zenMode = !state.zenMode;
    document.body.classList.toggle('zen-mode', state.zenMode);
    if (!state.zenMode && zenExitBtn) {
      zenExitBtn.classList.remove('show');
    }
  }

  /* ===== 日期与格式配置 ===== */
  function applyDate() {
    elDate.style.display = state.settings.showDate && state.settings.mode === 'clock' ? '' : 'none';
    elSecWrap.style.display = state.settings.showSec ? '' : 'none';
    elDate.style.fontSize = (state.settings.dateSize || 22) + 'px';
    $('#dateSizeVal').textContent = (state.settings.dateSize || 22) + 'px';
    $('#dateSizeOut').textContent = state.settings.dateSize || 22;

    let sp = state.settings.dateSpacing;
    if (sp === undefined) sp = 0.22;
    elDate.style.letterSpacing = sp + 'em';
    $('#dateSpacingVal').textContent = sp + 'em';
    $('#dateSpacingOut').textContent = sp;
    $('#dateSpacingRange').value = Math.round(sp * 100);

    $('#dateSpacingGroup').style.display = state.settings.showDate ? '' : 'none';
    if (!state.settings.showDate) elDate.textContent = '';
    renderCurrentMode();
  }

  function applySecStyle() {
    elTime.classList.toggle('sec-eq', state.settings.secStyle === 'equal');
  }

  /* ===== 设置弹窗交互与分栏切换 ===== */
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
        if (btn.dataset.tab === 'stats') {
          renderStatsTab();
        }
      });
    });
  }

  async function renderStatsTab() {
    if (!window.StudyDB) return;
    const records = await window.StudyDB.getFocusRecords();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRecords = records.filter((r) => r.dateStr === todayStr);

    const todayMins = todayRecords.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
    const totalPomos = records.filter((r) => r.type === 'pomodoro').length;

    // 完成待办总数
    let doneTodos = 0;
    ['L', 'R'].forEach((s) => {
      doneTodos += (state.todos[s] || []).filter((t) => t.done).length;
    });

    const elTodayTime = $('#statTodayTime');
    const elTotalPomos = $('#statTotalPomos');
    const elDoneTodos = $('#statDoneTodos');
    const elRecordList = $('#statRecordList');

    if (elTodayTime) elTodayTime.textContent = todayMins + ' 分钟';
    if (elTotalPomos) elTotalPomos.textContent = totalPomos;
    if (elDoneTodos) elDoneTodos.textContent = doneTodos;

    // 渲染 63 天（9周）打卡热力图
    const heatmapGrid = $('#heatmapGrid');
    if (heatmapGrid) {
      heatmapGrid.innerHTML = '';
      const map = {};
      records.forEach((r) => {
        if (!map[r.dateStr]) map[r.dateStr] = 0;
        map[r.dateStr] += (r.durationMinutes || 0);
      });

      const today = new Date();
      const days = [];
      for (let i = 62; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        days.push({
          dateStr,
          dayOfWeek: d.getDay(),
          minutes: map[dateStr] || 0
        });
      }

      let col = document.createElement('div');
      col.className = 'heatmapCol';
      days.forEach((day, idx) => {
        const cell = document.createElement('div');
        cell.className = 'heatmapCell';
        let level = 0;
        if (day.minutes >= 90) level = 4;
        else if (day.minutes >= 50) level = 3;
        else if (day.minutes >= 25) level = 2;
        else if (day.minutes > 0) level = 1;

        if (level > 0) cell.dataset.level = level;
        cell.title = `${day.dateStr}：${day.minutes} 分钟专注`;
        col.appendChild(cell);

        if ((idx + 1) % 7 === 0 || idx === days.length - 1) {
          heatmapGrid.appendChild(col);
          col = document.createElement('div');
          col.className = 'heatmapCol';
        }
      });
    }

    if (elRecordList) {
      elRecordList.innerHTML = '';
      if (!records.length) {
        elRecordList.innerHTML = '<div style="color:rgba(255,255,255,.4);text-align:center;padding:16px 0;font-size:12px">暂无自习记录，开启一次番茄钟试试吧！</div>';
      } else {
        const recent = records.slice(-15).reverse();
        recent.forEach((r) => {
          const item = document.createElement('div');
          item.className = 'statItem';
          const typeName = r.type === 'pomodoro' ? '番茄钟专注' : '正向自习';
          const timeStr = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          item.innerHTML = `
            <div>
              <b>${typeName}</b>
              <span class="stTime">(${r.dateStr} ${timeStr})</span>
            </div>
            <div class="stDur">+${r.durationMinutes} min</div>
          `;
          elRecordList.appendChild(item);
        });
      }
    }
  }

  function refreshSettings() {
    applyBg();
    applyFont();
    setupSize();
    buildBgGrid();
    buildFonts();

    $('#swSec').checked = !!state.settings.showSec;
    $('#swDate').checked = !!state.settings.showDate;
    $('#swYear').checked = !!state.settings.showYear;
    $('#swMonthDay').checked = !!state.settings.showMonthDay;
    $('#swWeekday').checked = !!state.settings.showWeekday;
    $('#swFlip').checked = !!state.settings.flip;
    if ($('#swMotto')) $('#swMotto').checked = !!state.settings.showMotto;
    if ($('#swSound')) $('#swSound').checked = !!state.settings.soundEnabled;

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

    $('#dateSubRow').style.display = state.settings.showDate ? '' : 'none';
    $('#dateSizeGroup').style.display = state.settings.showDate ? '' : 'none';
    $('#dateSpacingGroup').style.display = state.settings.showDate ? '' : 'none';

    document.querySelectorAll('#secStyleOpts .posOpt').forEach((b) => {
      b.classList.toggle('active', b.dataset.sec === state.settings.secStyle);
    });

    applySecStyle();
    applyFlip();
    renderRemind('L');
    renderRemind('R');
    applyDate();
    applyMottoSetting();
  }

  function openSettings() {
    refreshSettings();
    settingsEl.classList.add('show');
  }
  function closeSettings() {
    settingsEl.classList.remove('show');
    const dpPopover = $('#datePickerPopover');
    if (dpPopover) dpPopover.classList.remove('show');
  }

  /* ===== 待办逻辑 ===== */
  const typingLock = { L: false, R: false };
  function getTodos(side) { return state.todos[side] || []; }

  function renderRemind(side) {
    const rem = side === 'L' ? remindL : remindR;
    const list = getTodos(side);
    rem.style.fontSize = (state.settings.todoSize || 14) + 'px';
    rem.innerHTML = '';
    if (!list.length) {
      rem.classList.remove('show');
      return;
    }
    const label = document.createElement('div');
    label.className = 'rmLabel';
    label.textContent = '今日待办';
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

  function renderTodos() {
    ['L', 'R'].forEach((z) => {
      const sideTodos = getTodos(z);
      const list = z === 'L' ? $('#todoListL') : $('#todoListR');
      const cnt = z === 'L' ? $('#todoCntL') : $('#todoCntR');
      list.innerHTML = '';
      const undone = sideTodos.filter((t) => !t.done).length;
      cnt.textContent = undone;
      if (!sideTodos.length) {
        const tip = document.createElement('div');
        tip.className = 'emptyTip';
        tip.textContent = '还没有待办，点击下方添加';
        list.appendChild(tip);
      } else {
        sideTodos.forEach((t, idx) => {
          const row = document.createElement('div');
          row.className = 'todoItem';
          const ck = document.createElement('span');
          ck.className = 'ck' + (t.done ? ' done' : '');
          ck.onclick = () => {
            state.todos[z][idx].done = !state.todos[z][idx].done;
            saveTodos();
            renderTodos();
          };
          const tx = document.createElement('span');
          tx.className = 'txt' + (t.done ? ' done' : '');
          tx.textContent = t.text;
          const del = document.createElement('button');
          del.className = 'del';
          del.textContent = '✕';
          del.onclick = () => {
            state.todos[z].splice(idx, 1);
            saveTodos();
            renderTodos();
          };
          row.appendChild(ck);
          row.appendChild(tx);
          row.appendChild(del);
          list.appendChild(row);
        });
      }
      renderRemind(z);
    });
  }

  /* 鼠标感应展开待办 */
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
    zone.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimer[key]);
      const rem = key === 'L' ? remindL : remindR;
      rem.classList.remove('show');
      hoverTimer[key] = setTimeout(() => showPanel(zone), HOVER_DELAY);
    });
    zone.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer[key]);
      if (!typingLock[key]) {
        hidePanel(zone);
        renderRemind(key);
      }
    });
  }

  function bindAdd(zoneKey) {
    const zone = zoneKey === 'L' ? zoneL : zoneR;
    const btn = zone.querySelector('.addBtn'),
          inp = zone.querySelector('.addInput'),
          go = zone.querySelector('.addGo');

    function openInput() {
      btn.style.display = 'none';
      inp.style.display = 'block';
      go.style.display = 'block';
      inp.focus();
    }
    function commit() {
      const v = inp.value.trim();
      if (!v) { reset(); return; }
      if (!state.todos[zoneKey]) state.todos[zoneKey] = [];
      state.todos[zoneKey].push({ text: v, done: false });
      saveTodos();
      renderTodos();
      reset();
    }
    function reset() {
      inp.value = '';
      inp.style.display = 'none';
      go.style.display = 'none';
      btn.style.display = 'block';
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

  /* ===== 顶部模式栏与底部全屏按钮悬浮感应 ===== */
  let modeBarTimer = null;
  let _lastMouseY = 999;

  function showModeBarTemporarily(ms = 2000) {
    if (!modeBar || state.zenMode) return;
    modeBar.classList.add('show');
    clearTimeout(modeBarTimer);
    modeBarTimer = setTimeout(() => {
      if (_lastMouseY >= 75) {
        modeBar.classList.remove('show');
      }
    }, ms);
  }

  document.addEventListener('mousemove', (e) => {
    _lastMouseY = e.clientY;

    // 顶部模式栏：靠近屏幕顶部 75px 浮现，移开后自动隐藏（非禅意模式）
    if (modeBar) {
      const nearTop = e.clientY < 75;
      if (nearTop && !state.zenMode) {
        modeBar.classList.add('show');
        clearTimeout(modeBarTimer);
      } else if (!nearTop) {
        modeBar.classList.remove('show');
      }
    }

    // 禅意极简模式退出按钮：仅在禅意模式下且鼠标靠近屏幕顶部 75px 时浮现
    if (zenExitBtn) {
      if (state.zenMode && e.clientY < 75) {
        zenExitBtn.classList.add('show');
      } else {
        zenExitBtn.classList.remove('show');
      }
    }

    // 底部全屏按钮
    if (fsBtn) {
      const nearBottom = e.clientY > (window.innerHeight - 80);
      const nearCenter = Math.abs(e.clientX - window.innerWidth / 2) < 260;
      if (nearBottom && nearCenter && !state.zenMode) {
        fsBtn.classList.add('show');
      } else {
        fsBtn.classList.remove('show');
      }
    }
  });

  function updateFsBtn() {
    if (document.fullscreenElement) {
      fsBtn.textContent = '退出全屏';
      fsBtn.title = '退出全屏';
    } else {
      fsBtn.textContent = '全屏显示';
      fsBtn.title = '全屏显示';
    }
  }

  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', updateFsBtn);

  /* ===== 鼠标空闲自动隐藏 ===== */
  const IDLE_TIME = 3000;
  let hideTimer = null, cursorHidden = false;
  function showCursor() { document.body.style.cursor = 'default'; cursorHidden = false; }
  function hideCursor() { document.body.style.cursor = 'none'; cursorHidden = true; }
  function armHide() {
    clearTimeout(hideTimer);
    if (cursorHidden) showCursor();
    hideTimer = setTimeout(hideCursor, IDLE_TIME);
  }
  document.addEventListener('mousemove', armHide);
  document.addEventListener('mousedown', armHide);

  /* ===== 新手引导 ===== */
  const OBKEY = 'studySimOnboardSeen';
  const onboardEl = $('#onboard');
  function showOnboard() { if (onboardEl) onboardEl.classList.add('show'); }
  function hideOnboard() { if (onboardEl) onboardEl.classList.remove('show'); }
  function closeOnboard() {
    hideOnboard();
    try { localStorage.setItem(OBKEY, '1'); } catch (e) {}
  }

  function setupOnboard() {
    let seen = false;
    try { seen = localStorage.getItem(OBKEY) === '1'; } catch (e) {}
    const closeBtn = $('#obClose'), reopenBtn = $('#obReopen');
    if (closeBtn) closeBtn.addEventListener('click', closeOnboard);
    if (reopenBtn) reopenBtn.addEventListener('click', showOnboard);
    if (onboardEl) {
      onboardEl.addEventListener('click', (e) => {
        if (e.target === onboardEl || e.target === onboardEl.querySelector('#onboardBox')) {
          closeOnboard();
        }
      });
    }
    if (!seen) setTimeout(showOnboard, 400);
  }

  /* ===== 全局快捷键绑定 ===== */
  function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      // 在输入框中输入时不触发全局快捷键
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.settings.mode === 'pomodoro') togglePomodoro();
        if (state.settings.mode === 'stopwatch') toggleStopwatch();
      } else if (e.key === 'z' || e.key === 'Z') {
        toggleZenMode();
      } else if (e.key === 'f' || e.key === 'F') {
        fsBtn.click();
      } else if (e.key === 'Escape') {
        if (state.zenMode) toggleZenMode();
        closeSettings();
        closeFontDetail();
      } else if (e.key === '1') {
        setMode('clock');
      } else if (e.key === '2') {
        setMode('pomodoro');
      } else if (e.key === '3') {
        setMode('stopwatch');
      } else if (e.key === '4') {
        setMode('target');
      }
    });
  }

  /* ===== 事件绑定与初始化 ===== */
  function bindEvents() {
    // 顶部模式切换按钮
    document.querySelectorAll('.modeBtn').forEach((btn) => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
    const zenBtn = $('#modeZenBtn');
    if (zenBtn) zenBtn.addEventListener('click', toggleZenMode);
    if (zenExitBtn) zenExitBtn.addEventListener('click', toggleZenMode);

    // 计时器控制按钮
    if (timerToggleBtn) {
      timerToggleBtn.addEventListener('click', () => {
        if (state.settings.mode === 'pomodoro') togglePomodoro();
        if (state.settings.mode === 'stopwatch') toggleStopwatch();
      });
    }
    if (timerResetBtn) {
      timerResetBtn.addEventListener('click', () => {
        if (state.settings.mode === 'pomodoro') resetPomodoro();
        if (state.settings.mode === 'stopwatch') resetStopwatch();
      });
    }
    if (timerSkipBtn) {
      timerSkipBtn.addEventListener('click', skipPomodoroStage);
    }

    // 每日寄语 (点击文字直接切换下一句)
    if (mottoWrap) mottoWrap.addEventListener('click', showNextMotto);

    // 设置浮窗触发与关闭
    elClock.addEventListener('click', (e) => {
      // 避免点中 timerControls 按钮时误打开设置
      if (e.target.closest('#timerControls') || e.target.closest('#mottoWrap')) return;
      openSettings();
    });
    $('#sClose').addEventListener('click', closeSettings);
    settingsEl.addEventListener('click', (e) => {
      if (e.target === settingsEl) closeSettings();
    });

    // 开关绑定
    $('#swSec').addEventListener('change', function () {
      state.settings.showSec = this.checked;
      saveSettings();
      applyDate();
    });
    $('#swDate').addEventListener('change', function () {
      state.settings.showDate = this.checked;
      saveSettings();
      refreshSettings();
    });
    $('#swYear').addEventListener('change', function () {
      state.settings.showYear = this.checked;
      saveSettings();
      applyDate();
    });
    $('#swMonthDay').addEventListener('change', function () {
      state.settings.showMonthDay = this.checked;
      saveSettings();
      applyDate();
    });
    $('#swWeekday').addEventListener('change', function () {
      state.settings.showWeekday = this.checked;
      saveSettings();
      applyDate();
    });
    $('#swFlip').addEventListener('change', function () {
      state.settings.flip = this.checked;
      saveSettings();
      applyFlip();
    });

    const swMotto = $('#swMotto');
    if (swMotto) {
      swMotto.addEventListener('change', function () {
        state.settings.showMotto = this.checked;
        saveSettings();
        applyMottoSetting();
      });
    }

    const swSound = $('#swSound');
    if (swSound) {
      swSound.addEventListener('change', function () {
        state.settings.soundEnabled = this.checked;
        saveSettings();
      });
    }

    const testChimeBtn = $('#testChimeBtn');
    if (testChimeBtn) {
      testChimeBtn.addEventListener('click', () => {
        if (window.StudySound) window.StudySound.playFocusChime();
      });
    }

    // 番茄钟时长输入与步进微调
    const pomoWorkInput = $('#pomoWorkInput');
    const pomoWorkUp = $('#pomoWorkUp');
    const pomoWorkDown = $('#pomoWorkDown');

    function updatePomoWork(val) {
      const v = Math.min(120, Math.max(1, val));
      state.settings.pomoWorkMin = v;
      if (pomoWorkInput) pomoWorkInput.value = v;
      saveSettings();
      if (state.pomodoro.status === 'work' && !state.pomodoro.isRunning) {
        state.pomodoro.remaining = v * 60;
        renderPomodoroTime();
      }
    }

    if (pomoWorkInput) {
      pomoWorkInput.addEventListener('change', function () {
        updatePomoWork(parseInt(this.value, 10) || 25);
      });
    }
    if (pomoWorkUp) {
      pomoWorkUp.addEventListener('click', () => {
        updatePomoWork((state.settings.pomoWorkMin || 25) + 1);
      });
    }
    if (pomoWorkDown) {
      pomoWorkDown.addEventListener('click', () => {
        updatePomoWork((state.settings.pomoWorkMin || 25) - 1);
      });
    }

    const pomoBreakInput = $('#pomoBreakInput');
    const pomoBreakUp = $('#pomoBreakUp');
    const pomoBreakDown = $('#pomoBreakDown');

    function updatePomoBreak(val) {
      const v = Math.min(60, Math.max(1, val));
      state.settings.pomoBreakMin = v;
      if (pomoBreakInput) pomoBreakInput.value = v;
      saveSettings();
      if (state.pomodoro.status === 'break' && !state.pomodoro.isRunning) {
        state.pomodoro.remaining = v * 60;
        renderPomodoroTime();
      }
    }

    if (pomoBreakInput) {
      pomoBreakInput.addEventListener('change', function () {
        updatePomoBreak(parseInt(this.value, 10) || 5);
      });
    }
    if (pomoBreakUp) {
      pomoBreakUp.addEventListener('click', () => {
        updatePomoBreak((state.settings.pomoBreakMin || 5) + 1);
      });
    }
    if (pomoBreakDown) {
      pomoBreakDown.addEventListener('click', () => {
        updatePomoBreak((state.settings.pomoBreakMin || 5) - 1);
      });
    }

    // 倒数日目标配置
    const targetTitleInput = $('#targetTitleInput');
    if (targetTitleInput) {
      targetTitleInput.addEventListener('input', function () {
        state.settings.targetTitle = this.value;
        saveSettings();
        if (targetTitle) targetTitle.textContent = this.value;
      });
    }
    const targetDateInput = $('#targetDateInput');
    if (targetDateInput) {
      targetDateInput.addEventListener('change', function () {
        state.settings.targetDate = this.value;
        saveSettings();
        renderTargetCountdown();
      });
    }

    // 滑块联动与暗化
    const dateSizeRange = $('#dateSizeRange');
    dateSizeRange.addEventListener('input', () => {
      elDate.style.fontSize = dateSizeRange.value + 'px';
      $('#dateSizeVal').textContent = dateSizeRange.value + 'px';
      $('#dateSizeOut').textContent = dateSizeRange.value;
    });
    dateSizeRange.addEventListener('change', () => {
      state.settings.dateSize = parseInt(dateSizeRange.value, 10);
      saveSettings();
      applyDate();
    });

    const dateSpacingRange = $('#dateSpacingRange');
    dateSpacingRange.addEventListener('input', () => {
      elDate.style.letterSpacing = (dateSpacingRange.value / 100) + 'em';
      $('#dateSpacingVal').textContent = (dateSpacingRange.value / 100) + 'em';
      $('#dateSpacingOut').textContent = (dateSpacingRange.value / 100);
    });
    dateSpacingRange.addEventListener('change', () => {
      state.settings.dateSpacing = dateSpacingRange.value / 100;
      saveSettings();
      applyDate();
    });

    const todoSizeRange = $('#todoSizeRange');
    todoSizeRange.addEventListener('input', () => {
      const px = parseInt(todoSizeRange.value, 10);
      $('#todoSizeVal').textContent = px + 'px';
      $('#todoSizeOut').textContent = px;
      remindL.style.fontSize = px + 'px';
      remindR.style.fontSize = px + 'px';
    });
    todoSizeRange.addEventListener('change', () => {
      state.settings.todoSize = parseInt(todoSizeRange.value, 10);
      saveSettings();
      renderRemind('L');
      renderRemind('R');
    });

    const todoOpacityRange = $('#todoOpacityRange');
    todoOpacityRange.addEventListener('input', () => {
      const op = todoOpacityRange.value / 100;
      document.querySelectorAll('.todoRemind .rmLine').forEach((el) => { el.style.opacity = op; });
      $('#todoOpacityVal').textContent = todoOpacityRange.value + '%';
      $('#todoOpacityOut').textContent = todoOpacityRange.value;
    });
    todoOpacityRange.addEventListener('change', () => {
      state.settings.todoOpacity = todoOpacityRange.value / 100;
      saveSettings();
      renderRemind('L');
      renderRemind('R');
    });

    // 拖动滑块时浮窗半透明
    const ranges = document.querySelectorAll('#settingsBox input[type=range]');
    ranges.forEach((r) => {
      r.addEventListener('input', () => settingsBox.classList.add('dim'));
      r.addEventListener('change', () => settingsBox.classList.remove('dim'));
    });
    settingsBox.addEventListener('mouseleave', () => settingsBox.classList.remove('dim'));

    // 秒针样式选择
    document.querySelectorAll('#secStyleOpts .posOpt').forEach((b) => {
      b.addEventListener('click', function () {
        state.settings.secStyle = this.dataset.sec;
        saveSettings();
        applySecStyle();
        document.querySelectorAll('#secStyleOpts .posOpt').forEach((x) => {
          x.classList.toggle('active', x.dataset.sec === state.settings.secStyle);
        });
      });
    });

    // 字体详情
    fontEntry.addEventListener('click', openFontDetail);
    $('#fdBack').addEventListener('click', closeFontDetail);
    fontDetail.addEventListener('click', (e) => {
      if (e.target === fontDetail) closeFontDetail();
    });

    // 待办感应与添加
    bindZone(zoneL, 'L');
    bindZone(zoneR, 'R');
    bindAdd('L');
    bindAdd('R');
  }

  /* ===== 氛围白噪音混音台交互 ===== */
  function initAmbientMixer() {
    const ambientBtn = $('#ambientBtn');
    const ambientPanel = $('#ambientPanel');
    const masterToggle = $('#ambMasterToggle');
    const trackList = $('#ambTrackList');
    if (!ambientBtn || !ambientPanel || !window.StudyAmbient) return;

    const ambState = window.StudyAmbient.getState();
    masterToggle.checked = !!ambState.enabled;
    ambientBtn.classList.toggle('playing', !!ambState.enabled);

    ambientBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      ambientPanel.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!ambientPanel.contains(e.target) && e.target !== ambientBtn && !ambientBtn.contains(e.target)) {
        ambientPanel.classList.remove('show');
      }
    });

    masterToggle.addEventListener('change', function () {
      const isPlaying = window.StudyAmbient.toggleMasterSound(this.checked);
      ambientBtn.classList.toggle('playing', isPlaying);
    });

    trackList.innerHTML = '';
    const tracks = window.StudyAmbient.tracks;
    Object.keys(tracks).forEach((key) => {
      const tr = tracks[key];
      const row = document.createElement('div');
      row.className = 'ambTrack';
      const vol = ambState.tracks[key] || 0;
      row.innerHTML = `
        <span class="trLbl"><span>${tr.icon}</span><span>${tr.name}</span></span>
        <input type="range" min="0" max="100" value="${vol}" data-track="${key}">
        <span style="font-size:11px;color:rgba(255,255,255,.5);width:32px;text-align:right" id="ambVal_${key}">${vol}%</span>
      `;
      const slider = row.querySelector('input');
      slider.addEventListener('input', function () {
        const v = parseInt(this.value, 10);
        const vEl = $(`#ambVal_${key}`);
        if (vEl) vEl.textContent = v + '%';
        window.StudyAmbient.setTrackVolume(key, v);
        if (!masterToggle.checked && v > 0) {
          masterToggle.checked = true;
          window.StudyAmbient.toggleMasterSound(true);
          ambientBtn.classList.add('playing');
        }
      });
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
          const vl = $(`#ambVal_${k}`);
          if (vl) vl.textContent = target[k] + '%';
        });
        masterToggle.checked = true;
        window.StudyAmbient.toggleMasterSound(true);
        ambientBtn.classList.add('playing');
      });
    });
  }

  /* ===== 氛围微动粒子特效交互 ===== */
  function initParticles() {
    if (!window.StudyParticles) return;
    window.StudyParticles.init();

    const speedLabels = ['', '极慢静谧 (1档)', '舒缓细雨 (2档)', '适中雨势 (3档)', '较快降雨 (4档)', '急雨 (5档)'];
    const densityLabels = ['', '零星微雨 (1档)', '疏朗细雨 (2档)', '标准降雨 (3档)', '密集降雨 (4档)', '密雨倾盆 (5档)'];

    const rainBox = $('#rainParamsBox');
    const rainSpeedRange = $('#rainSpeedRange');
    const rainDensityRange = $('#rainDensityRange');
    const rainSpeedVal = $('#rainSpeedVal');
    const rainDensityVal = $('#rainDensityVal');

    function syncRainParamsUI() {
      const sp = state.settings.rainSpeed || 2;
      const den = state.settings.rainDensity || 2;
      if (rainSpeedRange) rainSpeedRange.value = sp;
      if (rainDensityRange) rainDensityRange.value = den;
      if (rainSpeedVal) rainSpeedVal.textContent = speedLabels[sp] || `${sp}档`;
      if (rainDensityVal) rainDensityVal.textContent = densityLabels[den] || `${den}档`;
      if (rainBox) {
        rainBox.style.display = state.settings.particleEffect === 'rain' ? 'block' : 'none';
      }
    }

    // 设置初始粒子参数
    window.StudyParticles.setConfig({
      rainSpeed: state.settings.rainSpeed || 2,
      rainDensity: state.settings.rainDensity || 2
    });

    const eff = state.settings.particleEffect || 'none';
    window.StudyParticles.setEffect(eff);
    syncRainParamsUI();

    document.querySelectorAll('#particleOpts .particleOpt').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.effect === eff);
      btn.addEventListener('click', function () {
        const chosen = this.dataset.effect;
        state.settings.particleEffect = chosen;
        saveSettings();
        window.StudyParticles.setEffect(chosen);
        document.querySelectorAll('#particleOpts .particleOpt').forEach((b) => {
          b.classList.toggle('active', b.dataset.effect === chosen);
        });
        syncRainParamsUI();
      });
    });

    if (rainSpeedRange) {
      rainSpeedRange.addEventListener('input', function () {
        const val = parseInt(this.value, 10) || 2;
        state.settings.rainSpeed = val;
        saveSettings();
        if (rainSpeedVal) rainSpeedVal.textContent = speedLabels[val] || `${val}档`;
        window.StudyParticles.setConfig({ rainSpeed: val });
      });
    }

    if (rainDensityRange) {
      rainDensityRange.addEventListener('input', function () {
        const val = parseInt(this.value, 10) || 2;
        state.settings.rainDensity = val;
        saveSettings();
        if (rainDensityVal) rainDensityVal.textContent = densityLabels[val] || `${val}档`;
        window.StudyParticles.setConfig({ rainDensity: val });
      });
    }
  }

  /* ===== 自定义暗黑主题目标日期选择器与年月日微调 ===== */
  function initCustomDatePicker() {
    const wrap = $('#customDateWrap');
    const btn = $('#customDateBtn');
    const popover = $('#datePickerPopover');
    const monthTitle = $('#dpMonthTitle');
    const prevBtn = $('#dpPrevMonth');
    const nextBtn = $('#dpNextMonth');
    const daysGrid = $('#dpDaysGrid');
    const hiddenInput = $('#targetDateInput');

    const yearInput = $('#dpYearInput');
    const yearUp = $('#dpYearUp');
    const yearDown = $('#dpYearDown');

    const monthInput = $('#dpMonthInput');
    const monthUp = $('#dpMonthUp');
    const monthDown = $('#dpMonthDown');

    const dayInput = $('#dpDayInput');
    const dayUp = $('#dpDayUp');
    const dayDown = $('#dpDayDown');

    if (!btn || !popover || !daysGrid) return;

    let curYear = 2026, curMonth = 10;

    function parseTargetDate() {
      const d = state.settings.targetDate;
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const parts = d.split('-').map(Number);
        return { y: parts[0], m: parts[1] - 1, d: parts[2] };
      }
      const now = new Date();
      return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
    }

    function formatYMD(y, m, d) {
      const mm = String(m + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }

    function renderCalendar() {
      if (monthTitle) monthTitle.textContent = `${curYear}年 ${curMonth + 1}月`;
      daysGrid.innerHTML = '';

      const targetStr = state.settings.targetDate;
      const today = new Date();
      const todayStr = formatYMD(today.getFullYear(), today.getMonth(), today.getDate());

      // 当月第一天星期 (0~6)
      const firstDayWeek = new Date(curYear, curMonth, 1).getDay();
      // 当月总天数
      const totalDays = new Date(curYear, curMonth + 1, 0).getDate();
      // 上月总天数
      const prevMonthDays = new Date(curYear, curMonth, 0).getDate();

      // 上月填充
      for (let i = firstDayWeek - 1; i >= 0; i--) {
        const span = document.createElement('span');
        span.className = 'dpDay other-month';
        span.textContent = prevMonthDays - i;
        daysGrid.appendChild(span);
      }

      // 当月日期
      for (let day = 1; day <= totalDays; day++) {
        const btnDay = document.createElement('button');
        btnDay.type = 'button';
        btnDay.className = 'dpDay';
        btnDay.textContent = day;

        const dateStr = formatYMD(curYear, curMonth, day);
        if (dateStr === targetStr) {
          btnDay.classList.add('active');
        }
        if (dateStr === todayStr) {
          btnDay.classList.add('today');
        }

        btnDay.addEventListener('click', (e) => {
          e.stopPropagation();
          selectDate(dateStr, true);
        });

        daysGrid.appendChild(btnDay);
      }
    }

    function selectDate(dateStr, closeAfterSelect = false) {
      state.settings.targetDate = dateStr;
      saveSettings();
      syncDisplay();
      renderTargetCountdown();
      if (popover.classList.contains('show')) {
        const t = parseTargetDate();
        curYear = t.y;
        curMonth = t.m;
        renderCalendar();
      }
      if (closeAfterSelect) {
        closePopover();
      }
    }

    function syncDisplay() {
      const d = state.settings.targetDate;
      const t = parseTargetDate();
      if (hiddenInput) hiddenInput.value = d || '';
      if (yearInput) yearInput.value = t.y;
      if (monthInput) monthInput.value = t.m + 1;
      if (dayInput) dayInput.value = t.d;
    }

    function adjustDatePart(part, delta) {
      const curr = parseTargetDate();
      if (part === 'year') {
        curr.y = Math.min(2099, Math.max(2020, curr.y + delta));
      } else if (part === 'month') {
        curr.m += delta;
        if (curr.m < 0) {
          curr.m = 11;
          curr.y = Math.max(2020, curr.y - 1);
        } else if (curr.m > 11) {
          curr.m = 0;
          curr.y = Math.min(2099, curr.y + 1);
        }
      } else if (part === 'day') {
        const dt = new Date(curr.y, curr.m, curr.d + delta);
        curr.y = dt.getFullYear();
        curr.m = dt.getMonth();
        curr.d = dt.getDate();
      }
      // 纠正月份超出天数（如 2月30日 纠正为当月最大天数）
      const maxDays = new Date(curr.y, curr.m + 1, 0).getDate();
      if (curr.d > maxDays) curr.d = maxDays;
      if (curr.d < 1) curr.d = 1;

      selectDate(formatYMD(curr.y, curr.m, curr.d), false);
    }

    function handleDateInputsManual() {
      let y = parseInt(yearInput ? yearInput.value : '2026', 10);
      let m = parseInt(monthInput ? monthInput.value : '1', 10);
      let d = parseInt(dayInput ? dayInput.value : '1', 10);
      if (isNaN(y) || y < 2020) y = 2026;
      if (y > 2099) y = 2099;
      if (isNaN(m) || m < 1) m = 1;
      if (m > 12) m = 12;
      const maxDays = new Date(y, m, 0).getDate();
      if (isNaN(d) || d < 1) d = 1;
      if (d > maxDays) d = maxDays;

      selectDate(formatYMD(y, m - 1, d), false);
    }

    // 绑定年月日步进按钮及手动输入
    if (yearUp) yearUp.addEventListener('click', () => adjustDatePart('year', 1));
    if (yearDown) yearDown.addEventListener('click', () => adjustDatePart('year', -1));
    if (yearInput) yearInput.addEventListener('change', handleDateInputsManual);

    if (monthUp) monthUp.addEventListener('click', () => adjustDatePart('month', 1));
    if (monthDown) monthDown.addEventListener('click', () => adjustDatePart('month', -1));
    if (monthInput) monthInput.addEventListener('change', handleDateInputsManual);

    if (dayUp) dayUp.addEventListener('click', () => adjustDatePart('day', 1));
    if (dayDown) dayDown.addEventListener('click', () => adjustDatePart('day', -1));
    if (dayInput) dayInput.addEventListener('change', handleDateInputsManual);

    function openPopover() {
      const t = parseTargetDate();
      curYear = t.y;
      curMonth = t.m;
      renderCalendar();

      popover.classList.add('show');

      // 基于按钮位置动态计算浮窗坐标，保证不被顶部或边界裁剪
      const rect = btn.getBoundingClientRect();
      const popoverWidth = popover.offsetWidth || 270;
      const popoverHeight = popover.offsetHeight || 310;

      let left = rect.right - popoverWidth;
      if (left < 14) left = 14;
      if (left + popoverWidth > window.innerWidth - 14) {
        left = window.innerWidth - popoverWidth - 14;
      }

      // 优先在按钮下方显示；若下方空间不够且上方充足，则在上方显示
      let top;
      if (rect.bottom + 8 + popoverHeight <= window.innerHeight - 16) {
        top = rect.bottom + 8;
      } else if (rect.top - 8 - popoverHeight >= 16) {
        top = rect.top - 8 - popoverHeight;
      } else {
        top = Math.max(16, Math.round((window.innerHeight - popoverHeight) / 2));
      }

      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    }

    function closePopover() {
      popover.classList.remove('show');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (popover.classList.contains('show')) {
        closePopover();
      } else {
        openPopover();
      }
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        curMonth--;
        if (curMonth < 0) {
          curMonth = 11;
          curYear--;
        }
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        curMonth++;
        if (curMonth > 11) {
          curMonth = 0;
          curYear++;
        }
        renderCalendar();
      });
    }

    popover.querySelectorAll('.dpPill').forEach((pill) => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        const days = parseInt(pill.dataset.days, 10);
        if (days) {
          const target = new Date();
          target.setDate(target.getDate() + days);
          const dateStr = formatYMD(target.getFullYear(), target.getMonth(), target.getDate());
          selectDate(dateStr, true);
        }
      });
    });

    popover.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', (e) => {
      if (popover.classList.contains('show')) {
        if (!popover.contains(e.target) && !btn.contains(e.target)) {
          closePopover();
        }
      }
    });

    const sBody = document.querySelector('.sBody');
    if (sBody) {
      sBody.addEventListener('scroll', () => {
        if (popover.classList.contains('show')) closePopover();
      });
    }
    window.addEventListener('resize', () => {
      if (popover.classList.contains('show')) closePopover();
    });

    syncDisplay();
  }

  /* ===== 主初始化入口 ===== */
  async function init() {
    bindEvents();
    initSettingsTabs();
    initAmbientMixer();
    initParticles();
    initCustomDatePicker();
    setupShortcuts();
    setupOnboard();
    armHide();

    applyFont();
    setupSize();
    applyFlip();
    applySecStyle();
    applyDate();
    applyMottoSetting();
    renderTodos();

    // 初始化 IndexedDB 异步加载背景
    await initBackgroundStorage();

    // 初始化番茄钟工作时间
    state.pomodoro.remaining = (state.settings.pomoWorkMin || 25) * 60;

    // 激活保存的模式
    setMode(state.settings.mode || 'clock');

    // 启动全局主心跳 (每秒 tick 刷新)
    setInterval(renderCurrentMode, 1000);
    renderCurrentMode();
  }

  init();
})();
