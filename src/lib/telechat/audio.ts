// Audio helper for default notification tones and ringtones

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** Play default message notification sound */
export function playNotificationTone() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    // Play a dual-tone message chime (880Hz -> 1760Hz)
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

    osc2.frequency.setValueAtTime(1320, now + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.4);

    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch {
    /* Audio context might require user interaction first */
  }
}

/** Play ringtone loop for incoming call */
let ringtoneInterval: number | null = null;

export function startRingtone() {
  if (ringtoneInterval) return;

  const playPulse = () => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Phone ring pulse: 440Hz + 480Hz dual frequency standard phone ring
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.setValueAtTime(0.3, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.4);
      osc2.stop(now + 1.4);

      if ("vibrate" in navigator) {
        navigator.vibrate([1000, 500, 1000, 500]);
      }
    } catch {
      /* ignore */
    }
  };

  playPulse();
  ringtoneInterval = window.setInterval(playPulse, 3000);
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}
