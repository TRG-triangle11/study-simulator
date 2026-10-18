/**
 * ambient.js — Web Audio API 纯原生程序化白噪音多轨混音引擎
 * 100% 离线可用，零音频文件下载，无缝循环无杂音
 */

(function () {
  "use strict";

  let _ctx = null;
  function getCtx() {
    if (!_ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) _ctx = new AudioCtx();
    }
    if (_ctx && _ctx.state === 'suspended') {
      _ctx.resume();
    }
    return _ctx;
  }

  // 共享主音量
  let _masterGain = null;
  function getMasterGain(ctx) {
    if (!_masterGain) {
      _masterGain = ctx.createGain();
      _masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
      _masterGain.connect(ctx.destination);
    }
    return _masterGain;
  }

  // 生成粉红噪声/白噪声数据缓冲（5秒无缝缓冲循环）
  let _pinkBuffer = null, _brownBuffer = null, _whiteBuffer = null;
  function initBuffers(ctx) {
    if (_pinkBuffer && _brownBuffer && _whiteBuffer) return;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 5;

    // 白噪声
    _whiteBuffer = ctx.createBuffer(1, length, sampleRate);
    const whiteData = _whiteBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // 粉红噪声 (Paul Kellet 算法)
    _pinkBuffer = ctx.createBuffer(1, length, sampleRate);
    const pinkData = _pinkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    // 棕色/布朗噪声 (积分器)
    _brownBuffer = ctx.createBuffer(1, length, sampleRate);
    const brownData = _brownBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      brownData[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = brownData[i];
      brownData[i] *= 3.5;
    }
  }

  /* ===== 各音轨实现 ===== */
  const TRACK_TYPES = {
    // 1. 细雨与窗前水滴 (Rain & Realistic Water Droplets)
    rain: {
      name: '窗外细雨 (含水滴)',
      icon: '🌧️',
      init(ctx, master) {
        initBuffers(ctx);

        // 1. 底层雨幕 (低沉柔和，避免干燥刺耳的高频白噪音，模拟穿过窗户的温润雨声)
        const rainBed = ctx.createBufferSource();
        rainBed.buffer = _pinkBuffer;
        rainBed.loop = true;

        const lp1 = ctx.createBiquadFilter();
        lp1.type = 'lowpass';
        lp1.frequency.value = 1100;

        const hp1 = ctx.createBiquadFilter();
        hp1.type = 'highpass';
        hp1.frequency.value = 260;

        // 细微风速起伏 LFO
        const rainLfo = ctx.createOscillator();
        rainLfo.type = 'sine';
        rainLfo.frequency.value = 0.12;
        const rainLfoGain = ctx.createGain();
        rainLfoGain.gain.value = 180;
        rainLfo.connect(rainLfoGain);
        rainLfoGain.connect(lp1.frequency);
        rainLfo.start(0);

        const bedGain = ctx.createGain();
        bedGain.gain.value = 0.35;

        rainBed.connect(lp1);
        lp1.connect(hp1);
        hp1.connect(bedGain);

        // 2. 主音轨增益
        const gain = ctx.createGain();
        gain.gain.value = 0;

        bedGain.connect(gain);
        gain.connect(master);
        rainBed.start(0);

        // 3. 仿真水滴生成器 (真实水滴落地/窗沿滴水：快速上升音调 + 高 Q 谐振衰减 + 随机声相)
        let dropTimer = null;
        let isStopped = false;

        function triggerWaterDrop() {
          if (isStopped) return;
          if (gain.gain.value > 0.01) {
            const now = ctx.currentTime;
            const currentVol = gain.gain.value;

            // 水滴基频随机在 1000Hz ~ 2600Hz（不同大小水滴）
            // 水滴在空气或窗户形成微气泡振荡时，频率会从 f0 向上微滑 10-25% (Minnaert bubble resonance)
            const isHeavyDrop = Math.random() < 0.28; // 28% 概率出现更清脆响亮的大水滴
            const baseFreq = isHeavyDrop 
              ? (Math.random() * 500 + 1000) 
              : (Math.random() * 1200 + 1400);

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.12 + Math.random() * 0.15), now + (isHeavyDrop ? 0.045 : 0.025));

            // 水滴极短的高 Q 滤波
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(baseFreq * 1.05, now);
            bp.Q.value = isHeavyDrop ? 16 : 10;

            // 水滴包络：超快敲击（1-2ms）+ 指数骤减（30-70ms）
            const dropGain = ctx.createGain();
            const peakGain = currentVol * (isHeavyDrop ? (Math.random() * 0.42 + 0.26) : (Math.random() * 0.22 + 0.12));
            const duration = isHeavyDrop ? (Math.random() * 0.04 + 0.05) : (Math.random() * 0.02 + 0.03);

            dropGain.gain.setValueAtTime(0.0001, now);
            dropGain.gain.linearRampToValueAtTime(peakGain, now + 0.002);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(bp);
            bp.connect(dropGain);

            // 空间立体声相（水滴随机落在窗户左右两侧不同位置）
            if (typeof ctx.createStereoPanner === 'function') {
              const panner = ctx.createStereoPanner();
              panner.pan.setValueAtTime(Math.random() * 1.6 - 0.8, now);
              dropGain.connect(panner);
              panner.connect(master);
            } else {
              dropGain.connect(master);
            }

            osc.start(now);
            osc.stop(now + duration + 0.02);
          }

          // 随机水滴间隔：密集小雨滴与间歇性屋檐滴水
          const nextInterval = Math.random() < 0.4 
            ? (Math.random() * 120 + 60)   // 密集水珠敲打窗户 (60~180ms)
            : (Math.random() * 350 + 200);  // 稍慢的水滴声 (200~550ms)

          dropTimer = setTimeout(triggerWaterDrop, nextInterval);
        }

        // 启动水滴生成器
        triggerWaterDrop();

        return {
          gain,
          setVolume(v) { gain.gain.setTargetAtTime(v * 0.65, ctx.currentTime, 0.05); },
          stop() {
            isStopped = true;
            clearTimeout(dropTimer);
            try { rainBed.stop(); rainLfo.stop(); } catch (e) {}
          }
        };
      }
    },

    // 2. 温暖篝火 (Campfire / Fireplace)
    fire: {
      name: '壁炉篝火',
      icon: '🔥',
      init(ctx, master) {
        initBuffers(ctx);
        // 低频暖流
        const rumble = ctx.createBufferSource();
        rumble.buffer = _brownBuffer;
        rumble.loop = true;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 450;

        const rumbleGain = ctx.createGain();
        rumbleGain.gain.value = 0.5;

        rumble.connect(lp);
        lp.connect(rumbleGain);

        // 总体控制
        const gain = ctx.createGain();
        gain.gain.value = 0;

        rumbleGain.connect(gain);
        gain.connect(master);
        rumble.start(0);

        // 随机木柴噼啪声定时器
        let crackleTimer = null;
        function scheduleCrackles() {
          const delay = Math.random() * 300 + 120;
          crackleTimer = setTimeout(() => {
            if (gain.gain.value > 0.01) {
              const now = ctx.currentTime;
              const osc = ctx.createOscillator();
              const cg = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(Math.random() * 1200 + 1800, now);
              cg.gain.setValueAtTime(gain.gain.value * (Math.random() * 0.35 + 0.1), now);
              cg.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
              osc.connect(cg);
              cg.connect(master);
              osc.start(now);
              osc.stop(now + 0.05);
            }
            scheduleCrackles();
          }, delay);
        }
        scheduleCrackles();

        return {
          gain,
          setVolume(v) { gain.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05); },
          stop() {
            clearTimeout(crackleTimer);
            try { rumble.stop(); } catch (e) {}
          }
        };
      }
    },

    // 3. 自习室氛围/宁静深空 (Library Room Tone)
    library: {
      name: '自习室底噪',
      icon: '📖',
      init(ctx, master) {
        initBuffers(ctx);
        const src = ctx.createBufferSource();
        src.buffer = _brownBuffer;
        src.loop = true;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 320;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        src.connect(lp);
        lp.connect(gain);
        gain.connect(master);
        src.start(0);

        return {
          gain,
          setVolume(v) { gain.gain.setTargetAtTime(v * 0.7, ctx.currentTime, 0.05); },
          stop() { try { src.stop(); } catch (e) {} }
        };
      }
    },

    // 4. 夏夜清风与微鸣 (Summer Night Wind)
    night: {
      name: '夏夜清风',
      icon: '🍃',
      init(ctx, master) {
        initBuffers(ctx);
        const src = ctx.createBufferSource();
        src.buffer = _pinkBuffer;
        src.loop = true;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.Q.value = 1.2;

        // 微风呼吸感 LFO
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.18; // 约 5 秒一个周期的轻柔微风起伏
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 350;
        lfo.connect(lfoGain);
        lfoGain.connect(bp.frequency);
        lfo.start(0);

        const gain = ctx.createGain();
        gain.gain.value = 0;

        src.connect(bp);
        bp.connect(gain);
        gain.connect(master);
        src.start(0);

        return {
          gain,
          setVolume(v) { gain.gain.setTargetAtTime(v * 0.45, ctx.currentTime, 0.05); },
          stop() {
            try { src.stop(); lfo.stop(); } catch (e) {}
          }
        };
      }
    },

    // 5. 舒缓海浪 (Ocean Waves)
    waves: {
      name: '远方潮汐',
      icon: '🌊',
      init(ctx, master) {
        initBuffers(ctx);
        const src = ctx.createBufferSource();
        src.buffer = _pinkBuffer;
        src.loop = true;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 600;

        // 潮汐涨落 LFO 增益调制
        const waveLfo = ctx.createOscillator();
        waveLfo.type = 'sine';
        waveLfo.frequency.value = 0.1; // 10秒一个潮起潮落

        const waveGainMod = ctx.createGain();
        waveGainMod.gain.value = 0.35;
        waveLfo.connect(waveGainMod.gain);
        waveLfo.start(0);

        const gain = ctx.createGain();
        gain.gain.value = 0;

        src.connect(lp);
        lp.connect(waveGainMod);
        waveGainMod.connect(gain);
        gain.connect(master);
        src.start(0);

        return {
          gain,
          setVolume(v) { gain.gain.setTargetAtTime(v * 0.55, ctx.currentTime, 0.05); },
          stop() {
            try { src.stop(); waveLfo.stop(); } catch (e) {}
          }
        };
      }
    }
  };

  /* ===== 混音台状态管理 ===== */
  const AMB_KEY = 'studySimAmbient';
  function loadAmbientState() {
    try {
      const s = JSON.parse(localStorage.getItem(AMB_KEY));
      return s || {
        enabled: false,
        masterVol: 80,
        tracks: {
          rain: 60,
          fire: 0,
          library: 0,
          night: 0,
          waves: 0
        }
      };
    } catch (e) {
      return { enabled: false, masterVol: 80, tracks: { rain: 60, fire: 0, library: 0, night: 0, waves: 0 } };
    }
  }

  function saveAmbientState() {
    try {
      localStorage.setItem(AMB_KEY, JSON.stringify(ambientState));
    } catch (e) {}
  }

  const ambientState = loadAmbientState();
  const activeNodes = {};

  function setMasterVolume(v) {
    ambientState.masterVol = v;
    saveAmbientState();
    if (_masterGain && _ctx) {
      _masterGain.gain.setTargetAtTime((v / 100), _ctx.currentTime, 0.05);
    }
  }

  function setTrackVolume(trackKey, v) {
    ambientState.tracks[trackKey] = v;
    saveAmbientState();
    if (activeNodes[trackKey]) {
      const actual = ambientState.enabled ? (v / 100) : 0;
      activeNodes[trackKey].setVolume(actual);
    } else if (v > 0 && ambientState.enabled) {
      ensureTrackStarted(trackKey);
    }
  }

  function ensureTrackStarted(trackKey) {
    if (activeNodes[trackKey] || !TRACK_TYPES[trackKey]) return;
    const ctx = getCtx();
    const master = getMasterGain(ctx);
    activeNodes[trackKey] = TRACK_TYPES[trackKey].init(ctx, master);
    const vol = ambientState.enabled ? (ambientState.tracks[trackKey] || 0) / 100 : 0;
    activeNodes[trackKey].setVolume(vol);
  }

  function toggleMasterSound(forceState) {
    ambientState.enabled = typeof forceState === 'boolean' ? forceState : !ambientState.enabled;
    saveAmbientState();

    const ctx = getCtx();
    const master = getMasterGain(ctx);

    Object.keys(TRACK_TYPES).forEach((key) => {
      if (ambientState.tracks[key] > 0) {
        if (!activeNodes[key]) {
          activeNodes[key] = TRACK_TYPES[key].init(ctx, master);
        }
        const vol = ambientState.enabled ? ambientState.tracks[key] / 100 : 0;
        activeNodes[key].setVolume(vol);
      }
    });

    return ambientState.enabled;
  }

  window.StudyAmbient = {
    tracks: TRACK_TYPES,
    getState: () => ambientState,
    setMasterVolume,
    setTrackVolume,
    toggleMasterSound,
    initTrack: ensureTrackStarted
  };
})();
