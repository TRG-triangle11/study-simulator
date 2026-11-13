/**
 * window-rain.js — 窗户雨滴特效（v1.6.0）
 *
 * 基于 raindrop-fx（MIT，https://github.com/SardineFish/raindrop-fx）的 WebGL2 雨滴渲染。
 * 本地副本位于 assets/vendor/raindrop-fx.min.js，已做一处改造：
 *   当 options.__overlay 为 true 时跳过背景合成并透明清屏，
 *   使该库输出「纯雨滴透明层」，因此可以叠在时钟之上——水滴里折射窗外壁纸，
 *   雨滴以外的区域完全透明，时钟文字照常清晰。
 *
 * 设计约束：
 *   - 库文件按需懒加载，不启用窗户雨滴的用户不会付出这 180KB。
 *   - 完全离线可用，无外部网络请求。
 *   - 不支持 WebGL2 的环境直接返回 false，由调用方给出提示并回退。
 */
(function (global) {
  'use strict';

  var LIB_SRC = 'assets/vendor/raindrop-fx.min.js';

  function libSrc() {
    var v = (global.U && global.U.VERSION) || '';
    return LIB_SRC + (v ? '?v=' + v : '');
  }
  var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var canvas = null;
  var fx = null;
  var libPromise = null;
  var enabled = false;
  var starting = false;
  var ready = false;

  var backdropUrl = null;
  var backdropDim = 0.62;

  var lastW = 0, lastH = 0;
  var resizeTimer = 0;
  var resumeHandlerBound = false;

  function isMobile() {
    return (navigator.maxTouchPoints || 0) > 0 && Math.min(global.innerWidth, global.innerHeight) < 900;
  }

  function dprCap() {
    // 雨滴是逐像素片元着色，高 DPR 收益小、代价大
    return Math.min(global.devicePixelRatio || 1, isMobile() ? 1.5 : 2);
  }

  function supportsWebGL2() {
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2');
      if (!gl) return false;
      // 主动丢弃上下文，避免白占一个 WebGL 句柄
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) {
      return false;
    }
  }

  function ensureCanvas() {
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.id = 'rainDropFx';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    return canvas;
  }

  function loadLib() {
    if (global.RaindropFX) return Promise.resolve();
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = libSrc();
      s.async = true;
      s.onload = function () {
        global.RaindropFX ? resolve() : reject(new Error('RaindropFX 未定义'));
      };
      s.onerror = function () {
        libPromise = null;
        reject(new Error('raindrop-fx 加载失败'));
      };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  /* 按 cover 规则把壁纸裁切并叠上与页面等效的暗化，作为雨滴折射的底图 */
  function bakeBackdrop(url, dim) {
    return new Promise(function (resolve) {
      var W = Math.min(1600, Math.max(480, Math.round(global.innerWidth)));
      var H = Math.round(W * (global.innerHeight / Math.max(1, global.innerWidth)));
      H = Math.max(320, H);

      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      if (!ctx) return resolve(cv);

      function paint(dark) {
        // 与 #vignette 近似的分层暗化：整体压暗 + 中心稍亮、四周更暗
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(8,10,14,' + (0.38 * dark).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);

        var g = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.12,
                                         W / 2, H * 0.48, Math.max(W, H) * 0.78);
        g.addColorStop(0, 'rgba(8,10,14,' + (0.15 * dark).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(8,10,14,' + (0.38 * dark).toFixed(3) + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      if (!url || url === 'black') {
        ctx.fillStyle = '#0b1016';
        ctx.fillRect(0, 0, W, H);
        paint(dim);
        return resolve(cv);
      }

      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        var iw = img.naturalWidth || img.width;
        var ih = img.naturalHeight || img.height;
        var scale = Math.max(W / iw, H / ih);
        var dw = iw * scale, dh = ih * scale;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        paint(dim);
        resolve(cv);
      };
      img.onerror = function () {
        ctx.fillStyle = '#0b1016';
        ctx.fillRect(0, 0, W, H);
        paint(dim);
        resolve(cv);
      };
      img.src = url;
    });
  }

  function applyOptions() {
    if (!fx) return;
    var o = fx.options;
    var mobile = isMobile();

    o.__overlay = true;          // 本项目的本地改造开关：输出纯雨滴透明层
    o.mist = false;              // 迷雾层在叠加模式下不可见，关掉省算力
    o.backgroundBlurSteps = mobile ? 2 : 3;
    o.backgroundWrapMode = 'clamp';

    /* 密度与快慢差异的调参依据（库的物理模型）：
       - 生成节奏 spawnInterval 越短、蒸发 evaporate 越低，同屏雨滴越多；
       - 滑落速度 = (重力×质量 − 随机阻力)/质量，阻力每隔 motionInterval 重新随机，
         质量差越大（spawnSize 范围越宽），大滴快、小滴挂壁的分层越明显；
       - motionInterval 拉长后，快滴会持续快、慢滴会持续慢，不会全体匀速。 */
    o.spawnLimit = REDUCED ? 140 : (mobile ? 260 : 520);
    o.spawnSize = mobile ? [18, 84] : [22, 120];
    o.spawnInterval = [0.05, 0.15];
    o.motionInterval = [0.6, 2.2];
    o.xShifting = [0.01, 0.06];
    o.slipRate = 0.5;
    o.colliderSize = 0.9;
    o.trailDropDensity = 0.2;
    o.trailDropSize = [0.28, 0.44];
    o.trailDistance = [26, 46];
    o.trailSpread = 0.5;
    o.initialSpread = 0.55;
    o.shrinkRate = 0.014;
    o.velocitySpread = 0.3;
    o.evaporate = 7;
    o.gravity = 2400;

    o.dropletsPerSeconds = REDUCED ? 30 : (mobile ? 40 : 70);
    o.dropletSize = [12, 30];
    o.smoothRaindrop = [0.94, 1.0];
    o.refractBase = 0.5;
    o.refractScale = 0.9;
    o.raindropCompose = 'smoother';
    o.raindropLightPos = [-0.35, -0.55, 1.2, 0];
    /* 亮度：雨滴的可见度 = 折射背景 + 漫反射 + 高光。
       黑色壁纸下折射项几乎为零，必须靠 diffuse/specular 把水珠「打亮」；
       shadowOffset 越高暗部越多，压低让整体更亮。 */
    o.raindropDiffuseLight = [0.22, 0.22, 0.24];
    o.raindropShadowOffset = 0.6;
    o.raindropEraserSize = [0.9, 1.0];
    o.raindropSpecularLight = [0.12, 0.12, 0.13];
    o.raindropSpecularShininess = 40;
    o.raindropLightBump = 0.62;
  }

  function sizeCanvas() {
    if (!canvas) return;
    var w = Math.max(1, Math.round(global.innerWidth));
    var h = Math.max(1, Math.round(global.innerHeight));
    var dpr = dprCap();
    var pw = Math.round(w * dpr);
    var ph = Math.round(h * dpr);
    if (pw === lastW && ph === lastH) return;
    lastW = pw; lastH = ph;
    canvas.width = pw;
    canvas.height = ph;
    if (fx) {
      try { fx.resize(pw, ph); } catch (e) { /* 尺寸未变化时的偶发异常忽略 */ }
    }
  }

  async function startFx() {
    if (starting || !enabled) return;
    if (
      !supportsWebGL2()
    ) return;
    starting = true;
    try {
      ensureCanvas();
      await loadLib();
      if (!enabled) return;

      sizeCanvas();
      if (!fx) {
        fx = new global.RaindropFX({ canvas: canvas });
        applyOptions();
      }
      if (backdropUrl !== undefined) {
        var baked = await bakeBackdrop(backdropUrl, backdropDim);
        if (!enabled) return;
        await fx.setBackground(baked);
      }
      try { fx.stop(); } catch (e) { /* 未启动时忽略 */ }
      await fx.start();          // start 内部会 await 着色器资源加载
      ready = true;
      canvas.classList.add('on');
    } catch (e) {
      ready = false;
      enabled = false;
      if (canvas) canvas.classList.remove('on');
    } finally {
      starting = false;
    }
  }

  function stopFx() {
    ready = false;
    if (canvas) canvas.classList.remove('on');
    if (fx) {
      try { fx.stop(); } catch (e) { /* 忽略 */ }
    }
  }

  function bindResume() {
    if (resumeHandlerBound) return;
    resumeHandlerBound = true;
    document.addEventListener('visibilitychange', function () {
      if (!fx || !enabled) return;
      try {
        if (document.hidden) {
          fx.stop();
        } else if (!ready) {
          startFx();
        } else {
          fx.stop();
          fx.start();
        }
      } catch (e) { /* 忽略 */ }
    });
  }

  var api = {
    init: function () {
      bindResume();
      return api;
    },
    isSupported: supportsWebGL2,
    setEnabled: function (on) {
      on = !!on;
      enabled = on;
      if (on) {
        startFx();
      } else {
        stopFx();
      }
      return on;
    },
    /* 壁纸或暗化变化时调用：重新烘焙折射底图 */
    setBackdrop: function (url, dim) {
      backdropUrl = url || '';
      backdropDim = typeof dim === 'number' ? dim : 0.62;
      if (!fx || !enabled) return;
      bakeBackdrop(backdropUrl, backdropDim).then(function (baked) {
        if (!enabled || !fx) return;
        try { fx.setBackground(baked); } catch (e) { /* 忽略 */ }
      });
    },
    resize: function () {
      if (!canvas || !fx) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        lastW = lastH = 0;   // 强制重设尺寸
        sizeCanvas();
        applyOptions();
      }, 160);
    },
    isReady: function () { return ready; }
  };

  global.StudyWindowRain = api;
})(window);
