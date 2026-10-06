import { useSound } from '../lib/sound';
import { ToggleSwitch } from './ToggleSwitch';
import { Button } from './ui';

/** 효과음 켜기/끄기, 음량, 소리 들어보기. 닉네임 메뉴 안에 들어가므로 글자 크기를 작게 쓴다. */
export function SoundSettings() {
  const { play, muted, toggleMuted, volume, setVolume } = useSound();
  return (
    <section aria-label="소리" className="flex flex-col gap-3 text-sm">
      <ToggleSwitch checked={!muted} onChange={toggleMuted} label="효과음" />
      <div className="flex items-center gap-3">
        <label htmlFor="volume" className="text-sm font-semibold text-wood-700">음량</label>
        <input id="volume" type="range" min={0} max={100} step={1} value={volume} disabled={muted}
          onChange={(e) => setVolume(Number(e.target.value))} className="min-w-0 flex-1 accent-mustard-400 disabled:opacity-40" />
        <span aria-hidden="true" className="w-8 text-right tabular-nums text-wood-800">{volume}</span>
      </div>
      <Button variant="secondary" onClick={() => play('myTurn')}>소리 들어보기</Button>
    </section>
  );
}
