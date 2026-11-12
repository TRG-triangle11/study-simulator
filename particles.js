/**
 * particles.js — 轻量 Canvas 沉浸式动态粒子氛围特效 (v1.3)
 * 支持细雨飘落、静谧飘雪、深夜书桌微尘与夏夜萤火
 *
 * v1.3 改进：
 *   - 雨丝按透明度分 3 组描边，修复「循环内设 strokeStyle 但只 stroke 一次」导致层次失效
 *   - 适配 devicePixelRatio，高分屏不再模糊
 *   - 监听 visibilitychange 显式暂停/恢复动画（原先仅依赖浏览器被动行为）
 *   - 支持 prefers-reduced-motion：降低粒子密度与绘制帧率
 */
(function () {
  "use strict";

  let canvas = null, ctx = null;
  let particles = [];
  let animId = null;
  let currentEffect = 'none';
  let width = 0, height = 0;
  let paused = false;
  let reducedMotion = false;
  let frameCount = 0;

  const config = {
    rainSpeed: 2,
    rainDensity: 2
  };

  const motionQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery && motionQuery.matches) reducedMotion = true;
  if (motionQuery && typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', (e) => {
      reducedMotion = !!e.matches;
      createParticles();
    });
  }

  function initCanvas() {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'particleCanvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.zIndex = '1';
      canvas.style.pointerEvents = 'none';
      canvas.style.transition = 'opacity .6s ease';
      document.body.insertBefore(canvas, document.getElementById('clockWrap'));
    }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        paused = true;
        if (animId) cancelAnimationFrame(animId);
        animId = null;
      } else {
        paused = false;
        if (currentEffect !== 'none') {
          if (animId) cancelAnimationFrame(animId);
          animId = null;
          loop();
        }
      }
    });
  }

  function resize() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticles();
  }

  function createParticles() {
    particles = [];
    if (currentEffect === 'none') return;
    const scale = reducedMotion ? 0.5 : 1;

    if (currentEffect === 'rain') {
      const densityRatios = [0.025, 0.05, 0.085, 0.13, 0.19];
      const speedRanges = [
        { min: 2.0, span: 1.5 },
        { min: 3.5, span: 2.2 },
        { min: 6.0, span: 3.2 },
        { min: 9.5, span: 4.5 },
        { min: 14.0, span: 6.0 }
      ];
      const densityIdx = Math.max(0, Math.min(4, Math.round(config.rainDensity) - 1));
      const speedIdx = Math.max(0, Math.min(4, Math.round(config.rainSpeed) - 1));
      const count = Math.max(15, Math.floor(width * densityRatios[densityIdx] * scale));
      const sp = speedRanges[speedIdx];

      for (let i = 0; i < count; i++) {
        const speed = Math.random() * sp.span + sp.min;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: speed,
          len: Math.random() * 8 + speed * 2.2,
          bucket: Math.floor(Math.random() * 3),
          tilt: -1.2
        });
      }
    } else if (currentEffect === 'snow') {
      const count = Math.floor(width * 0.08 * scale);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2.5 + 1.2,
          speed: Math.random() * 1.2 + 0.8,
          sway: Math.random() * 0.02 + 0.01,
          swayOffset: Math.random() * Math.PI * 2,
          opacity: Math.random() * 0.5 + 0.3
        });
      }
    } else if (currentEffect === 'dust') {
      const count = Math.floor(40 * scale);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.8 + 0.8,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.4 + 0.1
        });
      }
    } else if (currentEffect === 'fireflies') {
      const count = Math.floor(25 * scale);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 2.2 + 1.2,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          phase: Math.random() * Math.PI * 2,
          glow: Math.random() * 0.05 + 0.02
        });
      }
    }
  }

  function loop() {
    if (paused || currentEffect === 'none') {
      if (ctx) ctx.clearRect(0, 0, width, height);
      return;
    }

    // 减少动态效果时降到约 1/3 帧率
    const stride = reducedMotion ? 3 : 1;
    if (frameCount++ % stride !== 0) {
      animId = requestAnimationFrame(loop);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    if (currentEffect === 'rain') {
      // 按透明度分桶：每组一次 stroke，既保留层次又避免逐条 stroke 的开销
      const buckets = [[], [], []];
      for (const p of particles) buckets[p.bucket].push(p);
      const alphas = [0.14, 0.26, 0.40];
      ctx.lineWidth = 1.2;
      for (let b = 0; b < 3; b++) {
        if (!buckets[b].length) continue;
        ctx.strokeStyle = `rgba(210, 230, 255, ${alphas[b]})`;
        ctx.beginPath();
        for (const p of buckets[b]) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.len);
          p.y += p.speed * stride;
          p.x += p.tilt;
          if (p.y > height) {
            p.y = -p.len;
            p.x = Math.random() * width;
          }
        }
        ctx.stroke();
      }
    } else if (currentEffect === 'snow') {
      for (const p of particles) {
        p.swayOffset += p.sway * stride;
        p.x += Math.sin(p.swayOffset) * 0.8;
        p.y += p.speed * stride;
        if (p.y > height) { p.y = -10; p.x = Math.random() * width; }
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (currentEffect === 'dust') {
      for (const p of particles) {
        p.x += p.vx * stride;
        p.y += p.vy * stride;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        ctx.fillStyle = `rgba(255, 240, 200, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (currentEffect === 'fireflies') {
      for (const p of particles) {
        p.x += p.vx * stride;
        p.y += p.vy * stride;
        p.phase += p.glow * stride;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        const op = Math.max(0.05, (Math.sin(p.phase) + 1) * 0.45);
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#a3e635';
        ctx.fillStyle = `rgba(163, 230, 53, ${op})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    animId = requestAnimationFrame(loop);
  }

  function setEffect(effectName) {
    currentEffect = effectName || 'none';
    createParticles();
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    frameCount = 0;
    if (currentEffect !== 'none' && !paused) {
      loop();
    } else if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
  }

  function setConfig(newConfig) {
    if (!newConfig) return;
    if (typeof newConfig.rainSpeed === 'number') config.rainSpeed = newConfig.rainSpeed;
    if (typeof newConfig.rainDensity === 'number') config.rainDensity = newConfig.rainDensity;
    if (currentEffect === 'rain') createParticles();
  }

  function getConfig() { return Object.assign({}, config); }

  window.StudyParticles = {
    init: initCanvas,
    setEffect,
    getEffect: () => currentEffect,
    setConfig,
    getConfig,
    isReducedMotion: () => reducedMotion
  };
})();
