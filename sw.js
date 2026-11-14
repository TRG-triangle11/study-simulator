/**
 * sw.js — 自习模拟器 Service Worker (v1.9.2)
 *
 * 目标：装到手机主屏后离线也能打开、断网不白屏。
 * 策略：
 *   - 安装时预缓存「应用外壳」（页面、样式、脚本、字体、图标），保证首屏离线可用
 *   - 页面导航：网络优先（有网就拿到最新版），失败回落缓存
 *   - 其它同源资源：缓存优先（`?v=` 带版本号，内容不变），命中不到再走网络并顺手缓存
 *   - 壁纸等大图不预缓存，按需缓存，避免首次安装就下载十几 MB
 *   - assets/vendor/raindrop-fx.min.js（180KB，仅窗户雨滴用到）同样按需缓存：
 *     不启用窗户雨滴的用户不会被这笔下载拖慢首装，用过之后离线依然可用。
 *
 * 注意：File 协议（双击 index.html）下浏览器不注册 Service Worker，
 * 页面里已做协议判断，不会报错。
 */
'use strict';

const VERSION = '1.9.2';
const CACHE = 'study-sim-' + VERSION;
/* v1.7.3：壁纸等图片放独立媒体缓存，跨版本持久——
   版本更新只重建外壳缓存，不再把几十 MB 的壁纸一起清掉重新下载 */
const MEDIA_CACHE = 'study-sim-media';

const SHELL = [
  './',
  './index.html',
  './style.css?v=1.9.2',
  './util.js?v=1.9.2',
  './db.js?v=1.9.2',
  './sound.js?v=1.9.2',
  './ambient.js?v=1.9.2',
  './particles.js?v=1.9.2',
  './window-rain.js?v=1.9.2',
  './app.js?v=1.9.2a',
  './manifest.webmanifest',
  './assets/icons/app-icon-192.png',
  './assets/icons/app-icon-512.png',
  './assets/icons/app-icon-maskable-512.png',
  './assets/icons/apple-touch-icon-180.png',
  /* v1.9.0：HarmonyOS 6 档真实字重 + Outfit 可变字体（按需加载，未用到的字重不会预下载） */
  './assets/fonts/harmonyos-sans-sc-thin.woff2?v=1.9.2',
  './assets/fonts/harmonyos-sans-sc-light.woff2?v=1.9.2',
  './assets/fonts/harmonyos-sans-sc-regular.woff2?v=1.9.2',
  './assets/fonts/harmonyos-sans-sc-medium.woff2?v=1.9.2',
  './assets/fonts/harmonyos-sans-sc-bold.woff2?v=1.9.2',
  './assets/fonts/harmonyos-sans-sc-black.woff2?v=1.9.2',
  './assets/fonts/dseg7-classic-700.woff2',
  './assets/fonts/dseg7-classic-400-normal.woff2',
  './assets/fonts/space-mono-700.woff2',
  './assets/fonts/ibm-plex-mono-700.woff2',
  './assets/fonts/outfit-variable.woff2?v=1.9.2'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 单个资源失败不阻断安装，避免某个文件缺失导致整个离线能力失效
    await Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE || k === MEDIA_CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，断网回落缓存首页
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // 其它资源：缓存优先
  event.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        // 图片（壁纸等大文件）进跨版本持久的媒体缓存，其余进版本缓存
        const name = req.destination === 'image' ? MEDIA_CACHE : CACHE;
        if (['image', 'font', 'style', 'script'].indexOf(req.destination) >= 0) {
          const cache = await caches.open(name);
          cache.put(req, res.clone());
        }
      }
      return res;
    } catch (err) {
      const loose = await caches.match(req, { ignoreSearch: true });
      return loose || Response.error();
    }
  })());
});
