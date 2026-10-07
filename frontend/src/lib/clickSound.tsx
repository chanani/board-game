import { useEffect, useRef } from 'react';
import { useSound } from './sound';

/** 누르면 소리가 나는 컨트롤. 글자 입력칸·선택 상자는 넣지 않는다. */
const CONTROL = [
  'button', 'a[href]', 'summary',
  '[role="button"]', '[role="tab"]', '[role="menuitem"]', '[role="menuitemradio"]', '[role="menuitemcheckbox"]',
  '[role="option"]', '[role="switch"]', '[role="radio"]', '[role="checkbox"]',
  'input[type="checkbox"]', 'input[type="radio"]', 'input[type="button"]', 'input[type="submit"]', 'input[type="reset"]',
].join(', ');
/** 이 속성이 붙은 컨트롤(과 그 안)은 자기 소리(카드 내기·뽑기, 소리 설정)가 따로 나므로 누름 소리를 내지 않는다. */
export const NO_CLICK_SOUND = 'data-no-click-sound';
/** 라벨 클릭이 입력칸 클릭으로 한 번 더 이어지는 것처럼, 거의 동시에 온 누름은 한 번만 들려준다. */
export const CLICK_SOUND_GAP_MS = 60;

/** 소리를 내야 하는 컨트롤이면 그 요소를, 아니면 null을 돌려준다. */
export function clickSoundTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const control = target.closest(CONTROL);
  if (!control || control.matches(':disabled') || control.closest('[aria-disabled="true"]')) {
    return null;
  }
  return control.closest(`[${NO_CLICK_SOUND}]`) ? null : control;
}

/**
 * 사이트 전체의 버튼 누름 소리. 앱 뿌리에 한 번만 둔다.
 * 닉네임 메뉴에서 고른 '카드 가져오는 소리'를 그대로 쓰고, 효과음 끄기·음량도 게임 소리와 똑같이 따른다(play('draw')).
 */
export function ClickSound() {
  const { play } = useSound();
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => {
    let last = -Infinity;
    const onClick = (event: MouseEvent) => {
      if (!clickSoundTarget(event.target)) {
        return;
      }
      const now = performance.now();
      if (now - last < CLICK_SOUND_GAP_MS) {
        return;
      }
      last = now;
      playRef.current('draw');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
