import { useId } from 'react';
import { DRAW_SOUNDS, useSound } from '../lib/sound';
import { ToggleSwitch } from './ToggleSwitch';
import { Button } from './ui';

/** 효과음 켜기/끄기, 음량, 카드 가져오는 소리, 소리 들어보기. 닉네임 메뉴 안에 들어가므로 글자 크기를 작게 쓴다. */
export function SoundSettings() {
  const { play, muted, toggleMuted, volume, setVolume, drawSound, setDrawSound } = useSound();
  const drawLabelId = useId();
  return (
    <section aria-label="소리" className="flex flex-col gap-3 text-sm">
      <ToggleSwitch checked={!muted} onChange={toggleMuted} label="효과음" />
      <div className="flex items-center gap-3">
        <label htmlFor="volume" className="text-sm font-semibold text-wood-700">음량</label>
        <input id="volume" type="range" min={0} max={100} step={1} value={volume} disabled={muted}
          onChange={(e) => setVolume(Number(e.target.value))} className="min-w-0 flex-1 accent-mustard-400 disabled:opacity-40" />
        <span aria-hidden="true" className="w-8 text-right tabular-nums text-wood-800">{volume}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={drawLabelId} className="text-sm font-semibold text-wood-700">카드 가져오는 소리</span>
        {/* 고르면 바로 그 소리를 한 번 들려준다(setDrawSound). */}
        <div role="radiogroup" aria-labelledby={drawLabelId} className="grid grid-cols-4 gap-1.5">
          {DRAW_SOUNDS.map((sound) => {
            const selected = sound.id === drawSound;
            return (
              <button key={sound.id} type="button" role="radio" aria-checked={selected} disabled={muted}
                onClick={() => setDrawSound(sound.id)}
                className={`press-3d rounded-[10px] border py-1.5 text-sm font-extrabold disabled:opacity-40 ${
                  selected ? 'border-mustard-600 bg-mustard-400 text-wood-800' : 'border-cream-200 bg-cream text-wood-700 hover:bg-cream-200/60'}`}>
                {sound.label}
              </button>
            );
          })}
        </div>
      </div>
      <Button variant="secondary" onClick={() => play('myTurn')}>소리 들어보기</Button>
    </section>
  );
}
