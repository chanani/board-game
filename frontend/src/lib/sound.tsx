import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SoundName = 'draw' | 'place' | 'flip' | 'myTurn' | 'roundWin' | 'roundLose' | 'click' | 'tick';
export type SoundApi = { play: (name: SoundName) => void; muted: boolean; toggleMuted: () => void };

const STORAGE_KEY = 'bg.muted';
const SILENT: SoundApi = { play: () => undefined, muted: false, toggleMuted: () => undefined };
export const SoundContext = createContext<SoundApi | null>(null);

export function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // 저장할 수 없는 환경이면 이번 방문 동안만 기억한다.
  }
}

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | null {
  const holder = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return holder.AudioContext ?? holder.webkitAudioContext ?? null;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.18) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
  amp.gain.setValueAtTime(gain, ctx.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

function noise(ctx: AudioContext, duration: number, frequency: number, gain = 0.25) {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(ctx.destination);
  source.start();
}

const RECIPES: Record<SoundName, (ctx: AudioContext) => void> = {
  draw: (ctx) => noise(ctx, 0.12, 2500),
  place: (ctx) => tone(ctx, 180, 0, 0.08, 'triangle', 0.25),
  flip: (ctx) => { noise(ctx, 0.06, 4000, 0.2); tone(ctx, 900, 0.03, 0.04, 'square', 0.05); },
  myTurn: (ctx) => { tone(ctx, 784, 0, 0.18); tone(ctx, 1047, 0.15, 0.25); },
  roundWin: (ctx) => { tone(ctx, 523, 0, 0.15); tone(ctx, 659, 0.12, 0.15); tone(ctx, 784, 0.24, 0.3); },
  roundLose: (ctx) => { tone(ctx, 392, 0, 0.2, 'triangle'); tone(ctx, 330, 0.18, 0.3, 'triangle'); },
  click: (ctx) => tone(ctx, 1200, 0, 0.03, 'square', 0.04),
  tick: (ctx) => { tone(ctx, 660, 0, 0.09, 'square', 0.06); tone(ctx, 660, 0.16, 0.09, 'square', 0.06); },
};

function resumeIfSuspended(ctx: AudioContext): void {
  if (ctx.state !== 'suspended') {
    return;
  }
  try {
    ctx.resume().catch(() => undefined);
  } catch {
    // 재개할 수 없어도 게임 진행에는 영향이 없다.
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(readMuted);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      const existing = ctxRef.current;
      if (existing) {
        resumeIfSuspended(existing);
        return;
      }
      const Ctor = audioCtor();
      if (!Ctor) {
        return;
      }
      ctxRef.current = new Ctor();
      resumeIfSuspended(ctxRef.current);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback((name: SoundName) => {
    const ctx = ctxRef.current;
    if (muted || !ctx) {
      return;
    }
    try {
      RECIPES[name](ctx);
    } catch {
      // 오디오 오류는 게임 진행에 영향을 주지 않는다.
    }
  }, [muted]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      writeMuted(!current);
      return !current;
    });
  }, []);

  const api = useMemo(() => ({ play, muted, toggleMuted }), [play, muted, toggleMuted]);
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  return useContext(SoundContext) ?? SILENT;
}
