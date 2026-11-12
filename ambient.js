/**
 * ambient.js — Web Audio API 纯原生程序化白噪音多轨混音引擎 (v1.3)
 * 100% 离线可用，零音频文件下载，无缝循环无杂音
 *
 * v1.3 改进：
 *   - 与 sound.js 共享 util.js 持有的唯一 AudioContext
 *   - 关闭总开关 / 音轨归零时真正销毁节点与定时器（原先只把音量设为 0）
 *   - 水滴与噼啪声改挂到各自轨道增益，音量控制与平滑过渡一致
 *   - 海潮 LFO 增加深度控制，避免负增益造成相位反转
 *   - 主音量初值取自持久化设置，状态读取做字段校验
 */
(function () {
  "use strict";

  function getCtx() {
    return window.StudyUtil ? window.StudyUtil.getAudioContext() : null;
  }

  // 共享主音量
  let _masterGain = null;
  function getMasterGain(ctx) {
    if (!_masterGain) {
      _masterGain = ctx.createGain();
      _masterGain.gain.setValueAtTime((ambientState.masterVol || 80) / 100, ctx.currentTime);
      _masterGain.connect(ctx.destination);
    }
    return _masterGain;
  }

  // 生成粉红噪声/白噪声/布朗噪声缓冲（5 秒无缝循环）
  let _pinkBuffer = null, _brownBuffer = null, _whiteBuffer = null;
  function initBuffers(ctx) {
    if (_pinkBuffer && _brownBuffer && _whiteBuffer) return;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 5;

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

    // 棕色/布朗噪声（积分器）
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
    // 1. 细雨与窗前水滴
    rain: {
      name: '窗外细雨 (含水滴)',
      icon: '🌧️',
      init(ctx, master) {
        initBuffers(ctx);

        const rainBed = ctx.createBufferSource();
        rainBed.buffer = _pinkBuffer;
        rainBed.loop = true;

        const lp1 = ctx.createBiquadFilter();
        lp1.type = 'lowpass';
        lp1.frequency.value = 1100;

        const hp1 = ctx.createBiquadFilter();
        hp1.type = 'highpass';
        hp1.frequency.value = 260;

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

        const gain = ctx.createGain();
        gain.gain.value = 0;
        bedGain.connect(gain);
        gain.connect(master);
        rainBed.start(0);

        let trackVol = 0;
        let dropTimer = null;
        let isStopped = false;

        function triggerWaterDrop() {
          if (isStopped) return;
          if (trackVol > 0.01) {
            const now = ctx.currentTime;
            const isHeavyDrop = Math.random() < 0.28;
            const baseFreq = isHeavyDrop
              ? (Math.random() * 500 + 1000)
              : (Math.random() * 1200 + 1400);

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(
              baseFreq * (1.12 + Math.random() * 0.15),
              now + (isHeavyDrop ? 0.045 : 0.025)
            );

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(baseFreq * 1.05, now);
            bp.Q.value = isHeavyDrop ? 16 : 10;

            const dropGain = ctx.createGain();
            // 幅度不再乘轨道音量：水滴经轨道 gain 统一缩放
            const peakGain = isHeavyDrop
              ? (Math.random() * 0.42 + 0.26)
              : (Math.random() * 0.22 + 0.12);
            const duration = isHeavyDrop
              ? (Math.random() * 0.04 + 0.05)
              : (Math.random() * 0.02 + 0.03);

            dropGain.gain.setValueAtTime(0.0001, now);
            dropGain.gain.linearRampToValueAtTime(peakGain, now + 0.002);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(bp);
            bp.connect(dropGain);

            if (typeof ctx.createStereoPanner === 'function') {
              const panner = ctx.createStereoPanner();
              panner.pan.setValueAtTime(Math.random() * 1.6 - 0.8, now);
              dropGain.connect(panner);
              panner.connect(gain);
            } else {
              dropGain.connect(gain);
            }

            osc.start(now);
            osc.stop(now + duration + 0.02);
          }

          const nextInterval = Math.random() < 0.4
            ? (Math.random() * 120 + 60)
            : (Math.random() * 350 + 200);
          dropTimer = setTimeout(triggerWaterDrop, nextInterval);
        }

        triggerWaterDrop();

        return {
          gain,
          setVolume(v) {
            trackVol = v;
            gain.gain.setTargetAtTime(v * 0.65, ctx.currentTime, 0.05);
          },
          stop() {
            isStopped = true;
            clearTimeout(dropTimer);
            try { rainBed.stop(); rainLfo.stop(); } catch (e) {}
          }
        };
      }
    },

    // 2. 温暖篝火
    fire: {
      name: '壁炉篝火',
      icon: '🔥',
      init(ctx, master) {
        initBuffers(ctx);
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

        const gain = ctx.createGain();
        gain.gain.value = 0;
        rumbleGain.connect(gain);
        gain.connect(master);
        rumble.start(0);

        let trackVol = 0;
        let crackleTimer = null;
        let isStopped = false;

        function scheduleCrackles() {
          if (isStopped) return;
          const delay = Math.random() * 300 + 120;
          crackleTimer = setTimeout(() => {
            if (isStopped) return;
            if (trackVol > 0.01) {
              const now = ctx.currentTime;
              const osc = ctx.createOscillator();
              const cg = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(Math.random() * 1200 + 1800, now);
              cg.gain.setValueAtTime(Math.random() * 0.35 + 0.1, now);
              cg.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
              osc.connect(cg);
              cg.connect(gain);
              osc.start(now);
              osc.stop(now + 0.05);
            }
            scheduleCrackles();
          }, delay);
        }
        scheduleCrackles();

        return {
          gain,
          setVolume(v) {
            trackVol = v;
            gain.gain.setTargetAtTime(v * 0.5, ctx.currentTime, 0.05);
          },
          stop() {
            isStopped = true;
            clearTimeout(crackleTimer);
            try { rumble.stop(); } catch (e) {}
          }
        };
      }
    },

    // 3. 自习室底噪
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

    // 4. 夏夜清风
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

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.18;
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

    // 5. 舒缓海浪
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

        const waveLfo = ctx.createOscillator();
        waveLfo.type = 'sine';
        waveLfo.frequency.value = 0.1; // 10 秒一个潮起潮落

        // LFO 输出为 ±1，必须经深度节点缩放后再调制增益，
        // 否则增益会变负导致相位反转与音量突跳（v1.2 缺陷）
        const lfoDepth = ctx.createGain();
        lfoDepth.gain.value = 0.25;
        waveLfo.connect(lfoDepth);

        const waveGainMod = ctx.createGain();
        waveGainMod.gain.value = 0.5; // 实际范围 0.25 ~ 0.75，恒为正
        lfoDepth.connect(waveGainMod.gain);
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
  const DEFAULT_STATE = {
    enabled: false,
    masterVol: 80,
    tracks: { rain: 60, fire: 0, library: 0, night: 0, waves: 0 }
  };

  function loadAmbientState() {
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(AMB_KEY)); } catch (e) { parsed = null; }
    const base = {
      enabled: false,
      masterVol: 80,
      tracks: Object.assign({}, DEFAULT_STATE.tracks)
    };
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base;
    base.enabled = !!parsed.enabled;
    if (Number.isFinite(Number(parsed.masterVol))) {
      base.masterVol = Math.min(100, Math.max(0, Number(parsed.masterVol)));
    }
    if (parsed.tracks && typeof parsed.tracks === 'object') {
      Object.keys(base.tracks).forEach((k) => {
        const v = Number(parsed.tracks[k]);
        if (Number.isFinite(v)) base.tracks[k] = Math.min(100, Math.max(0, v));
      });
    }
    return base;
  }

  function saveAmbientState() {
    try { localStorage.setItem(AMB_KEY, JSON.stringify(ambientState)); } catch (e) {}
  }

  const ambientState = loadAmbientState();
  const activeNodes = {};

  function applyMasterVolume() {
    if (_masterGain && getCtx()) {
      _masterGain.gain.setTargetAtTime(ambientState.masterVol / 100, getCtx().currentTime, 0.05);
    }
  }

  function setMasterVolume(v) {
    ambientState.masterVol = Math.min(100, Math.max(0, v));
    saveAmbientState();
    applyMasterVolume();
  }

  /** 销毁单条音轨：停止 BufferSource / LFO / 定时器并释放引用 */
  function destroyTrack(trackKey) {
    const node = activeNodes[trackKey];
    if (!node) return;
    try { node.stop(); } catch (e) {}
    delete activeNodes[trackKey];
  }

  function stopAllTracks() {
    Object.keys(activeNodes).forEach(destroyTrack);
  }

  function ensureTrackStarted(trackKey) {
    if (activeNodes[trackKey] || !TRACK_TYPES[trackKey]) return;
    const ctx = getCtx();
    if (!ctx) return;
    const master = getMasterGain(ctx);
    activeNodes[trackKey] = TRACK_TYPES[trackKey].init(ctx, master);
    activeNodes[trackKey].setVolume(ambientState.tracks[trackKey] / 100);
  }

  function setTrackVolume(trackKey, v) {
    ambientState.tracks[trackKey] = Math.min(100, Math.max(0, Number(v) || 0));
    saveAmbientState();
    if (!ambientState.enabled || ambientState.tracks[trackKey] <= 0) {
      destroyTrack(trackKey);
      return;
    }
    ensureTrackStarted(trackKey);
    if (activeNodes[trackKey]) {
      activeNodes[trackKey].setVolume(ambientState.tracks[trackKey] / 100);
    }
  }

  function toggleMasterSound(forceState) {
    ambientState.enabled = typeof forceState === 'boolean' ? forceState : !ambientState.enabled;
    saveAmbientState();

    if (!ambientState.enabled) {
      stopAllTracks();
      return false;
    }

    const ctx = getCtx();
    if (!ctx) return false;
    getMasterGain(ctx);
    applyMasterVolume();
    Object.keys(TRACK_TYPES).forEach((key) => {
      if (ambientState.tracks[key] > 0) ensureTrackStarted(key);
      else destroyTrack(key);
    });
    return true;
  }

  window.StudyAmbient = {
    tracks: TRACK_TYPES,
    getState: () => ambientState,
    setMasterVolume,
    setTrackVolume,
    toggleMasterSound,
    stopAllTracks,
    initTrack: ensureTrackStarted
  };
})();
