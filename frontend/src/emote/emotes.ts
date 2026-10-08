/** 서버의 Emote enum과 같은 이름·순서. 패널은 이 순서대로 5개씩 두 줄로 놓는다. */
export const EMOTE_IDS = ['SMILE', 'LAUGH', 'HEART_EYES', 'WINK', 'SURPRISED', 'SAD', 'CRY', 'ANGRY', 'SWEAT', 'THINKING'] as const;

export type EmoteId = (typeof EMOTE_IDS)[number];

/** 화면에 읽히는 이름(버튼 aria-label·title). */
export const EMOTE_LABELS: Record<EmoteId, string> = {
  SMILE: '웃음',
  LAUGH: '크게 웃음',
  HEART_EYES: '하트 눈',
  WINK: '윙크',
  SURPRISED: '놀람',
  SAD: '슬픔',
  CRY: '울음',
  ANGRY: '화남',
  SWEAT: '당황',
  THINKING: '생각 중',
};

export function isEmoteId(value: unknown): value is EmoteId {
  return typeof value === 'string' && (EMOTE_IDS as readonly string[]).includes(value);
}
