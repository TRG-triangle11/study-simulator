/**
 * particles.js — 轻量 Canvas 沉浸式动态粒子氛围特效
 * 支持细雨飘落、静谧飘雪、深夜书桌微尘与夏夜萤火，性能极高且后台自动休眠
 */

(function () {
  "use strict";

  let canvas = null, ctx = null;
  let particles = [];
  let animId = null;
  let currentEffect = 'none'; // 'none' | 'rain' | 'snow' | 'dust' | 'fireflies'
  let width = 0, height = 0;

  function initCanvas() {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'particleCanvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.zIndex = '1'; // 介于背景图(#bg)与主时钟之间
      canvas.style.pointerEvents = 'none';
      canvas.style.transition = 'opacity .6s ease';
      document.body.insertBefore(canvas, document.getElementById('clockWrap'));
    }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    createParticles();
  }

  const config = {
    rainSpeed: 2,   // 1 (很慢/静谧) ~ 5 (较快)，默认 2（平缓柔和，避免视觉干扰）
    rainDensity: 2  // 1 (零星/稀疏) ~ 5 (密集)，默认 2（疏朗细雨）
  };

  function createParticles() {
    particles = [];
    if (currentEffect === 'none') return;

    if (currentEffect === 'rain') {
      const densityRatios = [0.025, 0.05, 0.085, 0.13, 0.19];
      const speedRanges = [
        { min: 2.0, span: 1.5 },  // 1档: 2.0 ~ 3.5 px (极慢/静谧)
        { min: 3.5, span: 2.2 },  // 2档: 3.5 ~ 5.7 px (默认：轻柔舒缓细雨)
        { min: 6.0, span: 3.2 },  // 3档: 6.0 ~ 9.2 px (中速自习雨)
        { min: 9.5, span: 4.5 },  // 4档: 9.5 ~ 14.0 px (较快降雨)
        { min: 14.0, span: 6.0 }  // 5档: 14.0 ~ 20.0 px (急雨)
      ];

      const densityIdx = Math.max(0, Math.min(4, Math.round(config.rainDensity) - 1));
      const speedIdx = Math.max(0, Math.min(4, Math.round(config.rainSpeed) - 1));

      const count = Math.max(15, Math.floor(width * densityRatios[densityIdx]));
      const sp = speedRanges[speedIdx];

      for (let i = 0; i < count; i++) {
        const speed = Math.random() * sp.span + sp.min;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: speed,
          len: Math.random() * 8 + speed * 2.2,
          opacity: Math.random() * 0.28 + 0.12,
          tilt: -1.2
        });
      }
    } else if (currentEffect === 'snow') {
      const count = Math.floor(width * 0.08);
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
      // 深夜微尘
      const count = 40;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.8 + 0.8,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.4 + 0.1,
          pulse: Math.random() * 0.03
        });
      }
    } else if (currentEffect === 'fireflies') {
      const count = 25;
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
    if (currentEffect === 'none') {
      if (ctx) ctx.clearRect(0, 0, width, height);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    if (currentEffect === 'rain') {
      ctx.strokeStyle = 'rgba(210, 230, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let p of particles) {
        ctx.strokeStyle = `rgba(210, 230, 255, ${p.opacity})`;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.len);
        p.y += p.speed;
        p.x += p.tilt;
        if (p.y > height) {
          p.y = -p.len;
          p.x = Math.random() * width;
        }
      }
      ctx.stroke();
    } else if (currentEffect === 'snow') {
      for (let p of particles) {
        p.swayOffset += p.sway;
        p.x += Math.sin(p.swayOffset) * 0.8;
        p.y += p.speed;
        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (currentEffect === 'dust') {
      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
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
      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.glow;
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
    cancelAnimationFrame(animId);
    if (currentEffect !== 'none') {
      loop();
    } else {
      if (ctx) ctx.clearRect(0, 0, width, height);
    }
  }

  function setConfig(newConfig) {
    if (newConfig) {
      if (typeof newConfig.rainSpeed === 'number') config.rainSpeed = newConfig.rainSpeed;
      if (typeof newConfig.rainDensity === 'number') config.rainDensity = newConfig.rainDensity;
      if (currentEffect === 'rain') {
        createParticles();
      }
    }
  }

  function getConfig() {
    return Object.assign({}, config);
  }

  window.StudyParticles = {
    init: initCanvas,
    setEffect,
    getEffect: () => currentEffect,
    setConfig,
    getConfig
  };
})();
