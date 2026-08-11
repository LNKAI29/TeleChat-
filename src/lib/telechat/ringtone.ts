/** Pleasant looping ringtone + outgoing ring generated with the Web Audio API. */
type Handle = { stop: () => void };

function tone(ctx: AudioContext, freq: number, at: number, dur: number, gain: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, at);
  amp.gain.linearRampToValueAtTime(gain, at + 0.04);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

export function playRingtone(kind: "incoming" | "outgoing"): Handle {
  if (typeof window === "undefined") return { stop: () => {} };
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return { stop: () => {} };

  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return { stop: () => {} };
  }
  void ctx.resume();

  const cycle = kind === "incoming" ? 2.6 : 4;
  const ring = () => {
    const t = ctx.currentTime + 0.02;
    if (kind === "incoming") {
      tone(ctx, 987.77, t, 0.22, 0.16);
      tone(ctx, 1318.5, t + 0.2, 0.22, 0.14);
      tone(ctx, 1567.98, t + 0.4, 0.4, 0.12);
      tone(ctx, 1318.5, t + 0.9, 0.22, 0.12);
      tone(ctx, 987.77, t + 1.1, 0.45, 0.1);
    } else {
      tone(ctx, 440, t, 0.9, 0.07);
      tone(ctx, 480, t, 0.9, 0.05);
    }
  };

  ring();
  const timer = window.setInterval(ring, cycle * 1000);

  return {
    stop: () => {
      window.clearInterval(timer);
      void ctx.close().catch(() => {});
    },
  };
}