/**
 * rain-glass.js — 玻璃雨滴特效 (v1.5.0)
 *
 * 真实玻璃上雨滴的三层观感：
 *   1. 折射放大：每颗水滴内部显示「正下方背景的放大切片」（采样壁纸离屏画布），
 *      放大倍数约 1.35，形成透镜感；半透明叠加，让底下的文字仍能透出一点
 *   2. 体积：上缘亮边（天光）+ 下缘暗边（折射）+ 底部投影 + 左上高光点
 *   3. 流动：静态水珠停留一会儿后开始下滑，速度渐增并带轻微摆动，
 *      身后留下湿痕，路过小水珠时合并变大
 *
 * 性能与礼貌：
 *   - devicePixelRatio 上限 2；拖尾/描边用预生成 sprite，避免每帧新建渐变
 *   - 页面隐藏自动暂停；「减少动态效果」偏好下只保留静态水珠，密度减半
 *   - 只在开关打开时跑 requestAnimationFrame
 */
(function (root) {
  'use strict';

  var canvas = null, ctx = null;
  var W = 0, H = 0, dpr = 1;
  var drops = [];
  var enabled = false;
  var rafId = null;
  var lastTs = 0;
  var reduced = false;

  var backdrop = null;       // 壁纸离屏画布（CSS 像素）
  var backdropUrl = '';
  var backdropDim = 0.62;
  var backdropLoading = false;

  var spriteCache = {};

  var motionQuery = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery && motionQuery.matches) reduced = true;
  if (motionQuery && typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', function (e) {
      reduced = !!e.matches;
      reseed();
    });
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function targetCount() {
    // 按屏幕面积给密度，手机上自动少一些
    var base = Math.round((W * H) / 52000);
    base = Math.max(9, Math.min(20, base));
    if (reduced) base = Math.round(base * 0.5);
    return base;
  }

  function makeDrop(fromTop) {
    var small = Math.random() < 0.26;
    var r = (small ? rand(3, 7) : rand(14, 38)) * (W < 560 ? 0.72 : 1);
    return {
      x: rand(r + 6, W - r - 6),
      y: fromTop ? rand(-60, -r) : rand(r, H - r),
      r: r,
      vy: 0,
      drift: rand(-0.012, 0.012),
      phase: rand(0, Math.PI * 2),
      mode: Math.random() < 0.55 ? 'stuck' : 'run',
      hold: rand(900, 5200),
      trail: rand(10, 30)
    };
  }

  function reseed() {
    drops = [];
    var n = targetCount();
    for (var i = 0; i < n; i++) drops.push(makeDrop(false));
  }

  function initCanvas() {
    if (canvas) return;
    canvas = document.getElementById('rainGlass');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'rainGlass';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas || !ctx) return;
    W = root.innerWidth || document.documentElement.clientWidth;
    H = root.innerHeight || document.documentElement.clientHeight;
    dpr = Math.min(root.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 尺寸变化后水珠坐标需要重新分布，避免堆到角落
    drops.forEach(function (d) {
      d.x = Math.min(Math.max(d.x, d.r + 6), W - d.r - 6);
      d.y = Math.min(Math.max(d.y, d.r), H - d.r);
    });
    buildBackdrop();
  }

  /* ===== 背景采样（壁纸 → 离屏画布，按 cover 规则铺满） ===== */
  function buildBackdrop() {
    if (!backdropUrl || backdropUrl === 'black' || !W || !H) { backdrop = null; return; }
    if (backdropLoading) return;
    backdropLoading = true;
    var img = new Image();
    img.onload = function () {
      backdropLoading = false;
      // 用 0.8 倍分辨率烘焙：水滴里是放大绘制，天然带一点柔化，更像折射
      var q = 0.8;
      var c = document.createElement('canvas');
      c.width = Math.round(W * q);
      c.height = Math.round(H * q);
      var g = c.getContext('2d');
      var scale = Math.max(c.width / img.width, c.height / img.height);
      var w = img.width * scale, h = img.height * scale;
      g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      // 把页面上的暗化（#vignette）近似烘焙进来，让水滴里的画面与周围一致
      var dim = Math.max(0.15, Math.min(1, backdropDim));
      g.fillStyle = 'rgba(8,10,14,' + (dim * 0.42).toFixed(3) + ')';
      g.fillRect(0, 0, c.width, c.height);
      c._q = q;
      backdrop = c;
    };
    img.onerror = function () {
      backdropLoading = false;
      backdrop = null;
    };
    img.src = backdropUrl;
  }

  /* ===== 水滴 sprite：亮边 / 暗边 / 高光，按半径缓存，避免每帧建渐变 ===== */
  function getSprite(r) {
    var key = Math.round(r * 2) / 2;
    if (spriteCache[key]) return spriteCache[key];
    var pad = 2;
    var size = Math.ceil((key + pad) * 2);
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var g = c.getContext('2d');
    var cx = size / 2, cy = size / 2;

    // 底部投影，让水珠「浮」在玻璃上
    g.save();
    g.shadowColor = 'rgba(0,0,0,.34)';
    g.shadowBlur = key * 0.55;
    g.shadowOffsetY = key * 0.18;
    g.beginPath();
    g.arc(cx, cy, key - 0.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(10,14,20,.18)';
    g.fill();
    g.restore();

    var lw = Math.max(1, key * 0.1);
    // 细的暗接触边：让水珠有清晰轮廓，而不是气泡那种亮环
    g.beginPath();
    g.arc(cx, cy, key - lw * 0.5, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(0,0,0,.22)';
    g.lineWidth = lw;
    g.stroke();

    // 上缘偏暗：光从下方穿过水体
    g.beginPath();
    g.arc(cx, cy, key - lw * 1.4, Math.PI * 1.04, Math.PI * 1.96);
    g.strokeStyle = 'rgba(0,0,0,.26)';
    g.lineWidth = Math.max(1.2, key * 0.13);
    g.lineCap = 'round';
    g.stroke();

    // 下缘亮弧：内部反射聚光，这是水珠最标志性的特征
    g.beginPath();
    g.arc(cx, cy, key * 0.82, Math.PI * 0.14, Math.PI * 0.86);
    g.strokeStyle = 'rgba(255,255,255,.34)';
    g.lineWidth = Math.max(1.4, key * 0.16);
    g.lineCap = 'round';
    g.stroke();

    // 左上高光点（窗光反射）
    var hx = cx - key * 0.36, hy = cy - key * 0.46;
    var hg = g.createRadialGradient(hx, hy, 0, hx, hy, key * 0.26);
    hg.addColorStop(0, 'rgba(255,255,255,.62)');
    hg.addColorStop(0.55, 'rgba(255,255,255,.18)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.beginPath();
    g.arc(hx, hy, key * 0.26, 0, Math.PI * 2);
    g.fillStyle = hg;
    g.fill();

    spriteCache[key] = { canvas: c, size: size, r: key };
    return spriteCache[key];
  }

  function drawDrop(d) {
    var rx = d.r;
    // 下滑中的水珠被拉长，静止时偏圆
    var ry = d.r * (d.mode === 'run' ? 1.08 + Math.min(d.vy * 1.1, 0.4) : 1);

    // 拖尾湿痕：只在下滑时出现，越靠上越淡
    if (d.mode === 'run' && d.vy > 0.006 && rx > 4) {
      var len = Math.min(d.trail + d.vy * 380, 90);
      var gTop = d.y - ry - len;
      var grad = ctx.createLinearGradient(0, gTop, 0, d.y - ry * 0.2);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.7, 'rgba(255,255,255,.045)');
      grad.addColorStop(1, 'rgba(255,255,255,.10)');
      ctx.fillStyle = grad;
      ctx.fillRect(d.x - rx * 0.45, gTop, rx * 0.9, d.y - ry * 0.2 - gTop);
    }

    // 折射：不是整体等比放大，而是分圈采样——越靠边缘，采到越远、压缩越强的画面，
    // 这才是真实水珠「边缘把周围环境吸进来」的透镜感（整体放大在平整背景上几乎看不出来）
    if (backdrop) {
      var q = backdrop._q || 0.8;
      // 外缘取大范围环境、内侧把像压小并上下翻转——接近实拍里「水滴倒映一整个世界」
      var rings = [
        { t: 1.00, m: 3.2, flip: false },
        { t: 0.80, m: 1.9, flip: true },
        { t: 0.55, m: 1.35, flip: true },
        { t: 0.30, m: 1.08, flip: true }
      ];
      ctx.save();
      ctx.globalAlpha = 0.93;
      for (var ri = 0; ri < rings.length; ri++) {
        var ring = rings[ri];
        var tw = rx * ring.t, th = ry * ring.t;
        var ss = 2 * rx * ring.m * q;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, tw, th, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.translate(d.x, d.y);
        if (ring.flip) ctx.scale(1, -1);
        ctx.drawImage(backdrop, d.x * q - ss / 2, d.y * q - ss / 2, ss, ss,
                      -tw, -th, tw * 2, th * 2);
        ctx.restore();
      }
      // 水体自身的明暗：上缘受光、中心略暗、下缘反光
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      var lg = ctx.createLinearGradient(d.x, d.y - ry, d.x, d.y + ry);
      lg.addColorStop(0, 'rgba(6,10,16,.10)');
      lg.addColorStop(0.38, 'rgba(6,10,16,.20)');
      lg.addColorStop(0.72, 'rgba(6,10,16,.14)');
      lg.addColorStop(1, 'rgba(255,255,255,.12)');
      ctx.fillStyle = lg;
      ctx.fillRect(d.x - rx, d.y - ry, 2 * rx, 2 * ry);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      // 纯黑壁纸 / 图片未加载好：退化成半透明玻璃珠
      var bg = ctx.createRadialGradient(d.x - rx * 0.3, d.y - ry * 0.4, rx * 0.08, d.x, d.y, rx);
      bg.addColorStop(0, 'rgba(255,255,255,.22)');
      bg.addColorStop(0.65, 'rgba(200,220,240,.08)');
      bg.addColorStop(1, 'rgba(160,190,220,.04)');
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();
    }

    var sp = getSprite(rx);
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(1, ry / rx);
    ctx.drawImage(sp.canvas, -sp.size / 2, -sp.size / 2, sp.size, sp.size);
    ctx.restore();
  }

  function step(dt) {
    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      d.phase += dt * 0.0016;

      if (d.mode === 'stuck') {
        d.hold -= dt;
        if (d.hold <= 0 && !reduced) {
          d.mode = 'run';
          d.vy = 0.012;
        }
        continue;
      }

      // 下滑：先慢后快，接近底部略收
      d.vy = Math.min(d.vy + dt * 0.000026, 0.16);
      d.y += d.vy * dt;
      d.x += Math.sin(d.phase) * d.drift * dt * 0.06;

      // 与小水珠合并：变大、变慢
      for (var j = 0; j < drops.length; j++) {
        if (i === j) continue;
        var o = drops[j];
        if (o.mode !== 'stuck') continue;
        var dx = o.x - d.x, dy = o.y - d.y;
        if (dx * dx + dy * dy < Math.pow((d.r + o.r) * 0.62, 2)) {
          d.r = Math.min(Math.sqrt(d.r * d.r + o.r * o.r), 34);
          o.y = rand(-40, -10);
          o.x = rand(o.r + 6, Math.max(o.r + 8, W - o.r - 6));
          o.mode = 'stuck';
          o.hold = rand(1200, 6000);
          o.r = rand(9, 24);
          o.vy = 0;
        }
      }

      // 触底：回到顶部重新开始
      if (d.y - d.r > H) {
        d.y = rand(-80, -20);
        d.x = rand(d.r + 6, Math.max(d.r + 8, W - d.r - 6));
        d.r = rand(9, 26) * (W < 560 ? 0.82 : 1);
        d.vy = 0;
        d.mode = Math.random() < 0.5 ? 'stuck' : 'run';
        d.hold = rand(900, 5200);
        d.trail = rand(10, 30);
      }
    }
  }

  function frame(ts) {
    if (!enabled) return;
    var dt = Math.min(48, ts - lastTs || 16);
    lastTs = ts;
    ctx.clearRect(0, 0, W, H);
    step(dt);
    for (var i = 0; i < drops.length; i++) drawDrop(drops[i]);
    rafId = root.requestAnimationFrame(frame);
  }

  function start() {
    if (rafId != null || !enabled) return;
    initCanvas();
    if (!drops.length) reseed();
    lastTs = 0;
    rafId = root.requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId != null) {
      root.cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (ctx) ctx.clearRect(0, 0, W, H);
  }

  document.addEventListener('visibilitychange', function () {
    if (!enabled) return;
    if (document.hidden) stop();
    else start();
  });

  root.addEventListener('resize', function () {
    if (!enabled) return;
    resize();
  });

  root.StudyGlassRain = {
    init: function () {
      initCanvas();
    },
    setEnabled: function (on) {
      enabled = !!on;
      if (canvas) canvas.classList.toggle('on', enabled);
      if (enabled) {
        initCanvas();
        resize();               // 关闭期间可能改过窗口大小，打开时先对齐画布
        canvas.classList.add('on');
        reseed();
        start();
      } else {
        stop();
      }
    },
    isEnabled: function () { return enabled; },
    setBackdrop: function (url, dim) {
      backdropDim = typeof dim === 'number' ? dim : backdropDim;
      var next = url || '';
      if (next === backdropUrl) { buildBackdrop(); return; }
      backdropUrl = next;
      backdrop = null;
      buildBackdrop();
    }
  };
})(window);
