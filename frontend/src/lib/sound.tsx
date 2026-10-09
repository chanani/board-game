import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SoundName = 'draw' | 'place' | 'flip' | 'myTurn' | 'roundWin' | 'roundLose' | 'click' | 'tick' | 'uno' | 'chat' | 'gameOverWin' | 'gameOverEnd' | 'heartbeat' | 'suddenDeath';
/** 카드를 가져오거나 내려놓을 때(그리고 사이트 버튼을 누를 때) 나는 소리. 닉네임 메뉴에서 고른다. */
export type DrawSound = 'swish' | 'pop' | 'tock' | 'chime';
export type SoundApi = {
  play: (name: SoundName) => void;
  muted: boolean;
  toggleMuted: () => void;
  volume: number;
  setVolume: (value: number) => void;
  drawSound: DrawSound;
  /** 고른 소리를 저장하고 바로 한 번 들려준다. */
  setDrawSound: (sound: DrawSound) => void;
};

export const DRAW_SOUNDS: { id: DrawSound; label: string }[] = [
  { id: 'swish', label: '슥' },
  { id: 'pop', label: '뽁' },
  { id: 'tock', label: '톡' },
  { id: 'chime', label: '띵' },
];

const STORAGE_KEY = 'bg.muted';
const VOLUME_KEY = 'bg.volume';
const DRAW_SOUND_KEY = 'bg.drawSound';
const DEFAULT_VOLUME = 70;
const DEFAULT_DRAW_SOUND: DrawSound = 'swish';
/** Provider 밖(또는 테스트)에서 쓰는 소리 없는 기본값. */
export const SILENT_SOUND: SoundApi = {
  play: () => undefined, muted: false, toggleMuted: () => undefined, volume: DEFAULT_VOLUME, setVolume: () => undefined,
  drawSound: DEFAULT_DRAW_SOUND, setDrawSound: () => undefined,
};
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

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_VOLUME;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function readVolume(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    return raw === null ? DEFAULT_VOLUME : clampVolume(Number(raw));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function writeVolume(value: number): void {
  try {
    window.localStorage.setItem(VOLUME_KEY, String(clampVolume(value)));
  } catch {
    // 저장할 수 없는 환경이면 이번 방문 동안만 기억한다.
  }
}

export function readDrawSound(): DrawSound {
  try {
    const raw = window.localStorage.getItem(DRAW_SOUND_KEY);
    return DRAW_SOUNDS.find((sound) => sound.id === raw)?.id ?? DEFAULT_DRAW_SOUND;
  } catch {
    return DEFAULT_DRAW_SOUND;
  }
}

export function writeDrawSound(sound: DrawSound): void {
  try {
    window.localStorage.setItem(DRAW_SOUND_KEY, sound);
  } catch {
    // 저장할 수 없는 환경이면 이번 방문 동안만 기억한다.
  }
}

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | null {
  const holder = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return holder.AudioContext ?? holder.webkitAudioContext ?? null;
}

function tone(ctx: AudioContext, out: AudioNode, frequency: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.18) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
  amp.gain.setValueAtTime(gain, ctx.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(amp).connect(out);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

function noise(ctx: AudioContext, out: AudioNode, duration: number, frequency: number, gain = 0.25) {
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
  source.connect(filter).connect(amp).connect(out);
  source.start();
}

type Recipe = (ctx: AudioContext, out: AudioNode) => void;

/** 짧게 커졌다 작아지는 음. 끝 주파수를 주면 그쪽으로 미끄러진다. */
function glide(ctx: AudioContext, out: AudioNode, from: number, to: number, start: number, duration: number, gain: number) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const at = ctx.currentTime + start;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + duration);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.001, at + duration);
  osc.connect(amp).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** 낮은 소리만 남긴 바람 소리. 천천히 커졌다 사라져 종이가 미끄러지는 느낌을 낸다. */
function swish(ctx: AudioContext, out: AudioNode) {
  const duration = 0.22;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  amp.gain.setValueAtTime(0.0001, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.06);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(filter).connect(amp).connect(out);
  source.start();
}

const DRAW_RECIPES: Record<DrawSound, Recipe> = {
  swish,
  pop: (ctx, out) => glide(ctx, out, 380, 820, 0, 0.09, 0.22),
  tock: (ctx, out) => { glide(ctx, out, 640, 640, 0, 0.07, 0.22); tone(ctx, out, 1280, 0, 0.04, 'triangle', 0.05); },
  chime: (ctx, out) => { glide(ctx, out, 1046, 1046, 0, 0.16, 0.13); glide(ctx, out, 1568, 1568, 0.07, 0.2, 0.11); },
};

/** 카드가 움직이는 소리(가져오기 draw, 내려놓기·내기 place). 닉네임 메뉴에서 고른 소리 하나로 낸다. */
type CardMoveSound = Extract<SoundName, 'draw' | 'place'>;

function isCardMove(name: SoundName): name is CardMoveSound {
  return name === 'draw' || name === 'place';
}

const RECIPES: Record<Exclude<SoundName, CardMoveSound>, Recipe> = {
  flip: (ctx, out) => { noise(ctx, out, 0.06, 4000, 0.2); tone(ctx, out, 900, 0.03, 0.04, 'square', 0.05); },
  myTurn: (ctx, out) => { tone(ctx, out, 784, 0, 0.18); tone(ctx, out, 1047, 0.15, 0.25); },
  roundWin: (ctx, out) => { tone(ctx, out, 523, 0, 0.15); tone(ctx, out, 659, 0.12, 0.15); tone(ctx, out, 784, 0.24, 0.3); },
  roundLose: (ctx, out) => { tone(ctx, out, 392, 0, 0.2, 'triangle'); tone(ctx, out, 330, 0.18, 0.3, 'triangle'); },
  click: (ctx, out) => tone(ctx, out, 1200, 0, 0.03, 'square', 0.04),
  // 우노 외침·잡힘: 밝은 두 음(C6 → G6, 삼각파, 0.25초).
  uno: (ctx, out) => { tone(ctx, out, 1047, 0, 0.12, 'triangle', 0.22); tone(ctx, out, 1568, 0.1, 0.15, 'triangle', 0.22); },
  tick: (ctx, out) => { tone(ctx, out, 660, 0, 0.09, 'square', 0.06); tone(ctx, out, 660, 0.16, 0.09, 'square', 0.06); },
  // 남의 채팅 도착: 짧고 부드러운 '톡'(사인파가 살짝 올라가며 0.08초에 사라지고, 위에 아주 작은 맑은 음을 얹는다).
  chat: (ctx, out) => { glide(ctx, out, 988, 1319, 0, 0.08, 0.11); tone(ctx, out, 2637, 0.01, 0.04, 'sine', 0.025); },
  gameOverWin,
  gameOverEnd,
  heartbeat,
  suddenDeath,
};

/** 도둑잡기 서든데스 동안 되풀이하는 심장 소리: 낮게 떨어지는 두 번의 쿵(쿵-쿵), 약 0.4초. */
function heartbeat(ctx: AudioContext, out: AudioNode) {
  glide(ctx, out, 90, 48, 0, 0.16, 0.32);
  glide(ctx, out, 80, 44, 0.2, 0.18, 0.24);
}

/** 서든데스 알림: 낮은 두 음이 겹쳐 내려가는 무거운 울림(약 1초). */
function suddenDeath(ctx: AudioContext, out: AudioNode) {
  glide(ctx, out, 220, 110, 0, 0.9, 0.16);
  glide(ctx, out, 233, 116, 0.02, 0.9, 0.09);
  glide(ctx, out, 70, 40, 0, 0.5, 0.3);
}

/** 게임 끝 · 이긴 사람: 밝게 올라가는 아르페지오(C5·E5·G5 → C6)에 위로 반짝이는 음을 얹어 약 1.3초 울린다. */
function gameOverWin(ctx: AudioContext, out: AudioNode) {
  [523, 659, 784].forEach((frequency, index) => tone(ctx, out, frequency, index * 0.1, 0.2, 'triangle', 0.14));
  tone(ctx, out, 1047, 0.3, 0.95, 'triangle', 0.16);
  tone(ctx, out, 784, 0.3, 0.95, 'sine', 0.07);
  tone(ctx, out, 1319, 0.42, 0.8, 'sine', 0.06);
  tone(ctx, out, 2093, 0.54, 0.6, 'sine', 0.03);
}

/** 게임 끝 · 그 밖의 모두(진 사람·무승부·관전자): 낮고 느리게 올라가는 부드러운 종소리(G4·C5 → E5), 약 1.2초. */
function gameOverEnd(ctx: AudioContext, out: AudioNode) {
  tone(ctx, out, 392, 0, 0.35, 'sine', 0.11);
  tone(ctx, out, 523, 0.16, 0.4, 'sine', 0.11);
  tone(ctx, out, 659, 0.32, 0.85, 'sine', 0.11);
  tone(ctx, out, 523, 0.32, 0.85, 'sine', 0.045);
}

function recipeOf(name: SoundName, drawSound: DrawSound): Recipe {
  return isCardMove(name) ? DRAW_RECIPES[drawSound] : RECIPES[name];
}

/** 재생마다 음량(0~100) 노드를 하나 거쳐 내보낸다. 소리가 꺼졌거나 음량이 0이면 아무것도 하지 않는다. */
function emit(ctx: AudioContext | null, volume: number, recipe: Recipe): void {
  if (!ctx || volume === 0) {
    return;
  }
  try {
    const out = ctx.createGain();
    out.gain.value = volume / 100;
    out.connect(ctx.destination);
    recipe(ctx, out);
  } catch {
    // 오디오 오류는 게임 진행에 영향을 주지 않는다.
  }
}

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
  const [volume, setVolumeState] = useState(readVolume);
  const [drawSound, setDrawSoundState] = useState(readDrawSound);
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
    emit(ctxRef.current, muted ? 0 : volume, recipeOf(name, drawSound));
  }, [muted, volume, drawSound]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      writeMuted(!current);
      return !current;
    });
  }, []);

  const setVolume = useCallback((value: number) => {
    const next = clampVolume(value);
    writeVolume(next);
    setVolumeState(next);
  }, []);

  // 고르는 순간 바로 들려주려고, 상태가 바뀌기를 기다리지 않고 고른 소리로 직접 재생한다.
  const setDrawSound = useCallback((sound: DrawSound) => {
    writeDrawSound(sound);
    setDrawSoundState(sound);
    emit(ctxRef.current, muted ? 0 : volume, DRAW_RECIPES[sound]);
  }, [muted, volume]);

  const api = useMemo(() => ({ play, muted, toggleMuted, volume, setVolume, drawSound, setDrawSound }),
    [play, muted, toggleMuted, volume, setVolume, drawSound, setDrawSound]);
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  return useContext(SoundContext) ?? SILENT_SOUND;
}
