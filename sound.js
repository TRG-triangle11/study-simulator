/**
 * sound.js — Web Audio API 原生合成音效
 * 无需任何外部 mp3/wav 文件，100% 离线可用且无版权问题
 */

let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      _audioCtx = new AudioCtx();
    }
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

/**
 * 播放温润空灵的专注结束提示音（禅意风铃 / 西藏颂钵和弦）
 */
function playFocusChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // 和弦基频设计：平和宁静的五度和弦 (528Hz 爱与修复之频 + 792Hz + 1056Hz)
  const freqs = [528, 792, 1056];

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    // 平滑包络线：极快淡入，漫长泛音缓慢淡出（类似真铜铃）
    gain.gain.setValueAtTime(0, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + idx * 0.08 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 2.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 3.0);
  });
}

/**
 * 播放清脆短促的切换/按钮音
 */
function playSoftTick() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

window.StudySound = {
  playFocusChime,
  playSoftTick
};
