import type { ReactNode } from 'react';
import type { EmoteId } from './emotes';

const FACE = '#ffd45c';
const RIM = '#e5a51f';
const INK = '#3b2a20';
const BLUSH = '#ff8fa3';
const TONGUE = '#ff7a8a';
const TEAR = '#5ab4f0';
const RED = '#e5484d';

const line = { fill: 'none', stroke: INK, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** 둥근 노란 얼굴 바탕(40x40). 화남은 얼굴이 달아오른 주황빛을 쓴다. */
const Base = ({ fill = FACE, rim = RIM }: { fill?: string; rim?: string }) => (
  <>
    <circle cx="20" cy="20.5" r="17" fill={fill} stroke={rim} strokeWidth="1.6" />
    <ellipse cx="13.5" cy="10.5" rx="5" ry="2.4" fill="#fff" opacity="0.5" transform="rotate(-28 13.5 10.5)" />
  </>
);
const DotEyes = ({ y = 17.5, r = 2.1 }: { y?: number; r?: number }) => (
  <>
    <circle cx="14" cy={y} r={r} fill={INK} />
    <circle cx="26" cy={y} r={r} fill={INK} />
  </>
);
const Cheeks = ({ y = 23.5 }: { y?: number }) => (
  <>
    <ellipse cx="10.2" cy={y} rx="2.6" ry="1.6" fill={BLUSH} opacity="0.8" />
    <ellipse cx="29.8" cy={y} rx="2.6" ry="1.6" fill={BLUSH} opacity="0.8" />
  </>
);
const heart = (cx: number, cy: number) =>
  `M${cx} ${cy + 3.2}L${cx - 3.5} ${cy - 0.3}A2.1 2.1 0 0 1 ${cx} ${cy - 2.6}A2.1 2.1 0 0 1 ${cx + 3.5} ${cy - 0.3}Z`;
const drop = (cx: number, top: number, size = 1) =>
  `M${cx} ${top}c${-1.7 * size} ${3 * size} ${-2.6 * size} ${4.5 * size} ${-2.6 * size} ${5.8 * size}a${2.6 * size} ${2.6 * size} 0 0 0 ${5.2 * size} 0c0 ${-1.3 * size} ${-0.9 * size} ${-2.8 * size} ${-2.6 * size} ${-5.8 * size}z`;

const ART: Record<EmoteId, ReactNode> = {
  SMILE: (
    <>
      <Base />
      <DotEyes />
      <Cheeks />
      <path d="M13.5 24.5Q20 30.5 26.5 24.5" {...line} />
    </>
  ),
  LAUGH: (
    <>
      <Base />
      <path d="M10.8 18.5Q14 14 17.2 18.5M22.8 18.5Q26 14 29.2 18.5" {...line} />
      <path d="M11.8 22.5H28.2Q28 31.8 20 31.8Q12 31.8 11.8 22.5Z" fill={INK} />
      <path d="M15.6 29.2Q20 26 24.4 29.2Q22.6 31.8 20 31.8Q17.4 31.8 15.6 29.2Z" fill={TONGUE} />
      <Cheeks y={23} />
    </>
  ),
  HEART_EYES: (
    <>
      <Base />
      <path d={heart(13.6, 16.8)} fill={RED} />
      <path d={heart(26.4, 16.8)} fill={RED} />
      <path d="M13 23.8Q20 32 27 23.8Z" fill={INK} />
      <path d="M16.6 28Q20 26.2 23.4 28Q21.8 29.6 20 29.6Q18.2 29.6 16.6 28Z" fill={TONGUE} />
    </>
  ),
  WINK: (
    <>
      <Base />
      <circle cx="14" cy="17.5" r="2.1" fill={INK} />
      <path d="M22.8 17.8Q26 14.6 29.2 17.8" {...line} />
      <Cheeks />
      <path d="M13.5 24.5Q20 30.5 26.5 24.5" {...line} />
      <path d="M21.4 27.7q2.6 4 4.6.4" fill={TONGUE} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  SURPRISED: (
    <>
      <Base />
      <path d="M10.4 11.4Q14 8.8 17.4 10.8M22.6 10.8Q26 8.8 29.6 11.4" {...line} />
      <circle cx="14" cy="17.5" r="3.6" fill="#fff" stroke={INK} strokeWidth="1.3" />
      <circle cx="26" cy="17.5" r="3.6" fill="#fff" stroke={INK} strokeWidth="1.3" />
      <circle cx="14" cy="17.8" r="1.7" fill={INK} />
      <circle cx="26" cy="17.8" r="1.7" fill={INK} />
      <ellipse cx="20" cy="28" rx="3.2" ry="3.9" fill={INK} />
    </>
  ),
  SAD: (
    <>
      <Base />
      <path d="M10.8 13.6L16.6 11.4M23.4 11.4L29.2 13.6" {...line} />
      <DotEyes y={18} />
      <path d="M14 28.4Q20 22.8 26 28.4" {...line} />
    </>
  ),
  CRY: (
    <>
      <Base />
      <path d="M10.8 13.2L16.6 11.2M23.4 11.2L29.2 13.2" {...line} />
      <path d="M10.8 16.8Q14 19.8 17.2 16.8M22.8 16.8Q26 19.8 29.2 16.8" {...line} />
      <path d="M14.4 29.2Q20 21.6 25.6 29.2Z" fill={INK} />
      <path d={drop(11.6, 19.6, 1.1)} fill={TEAR} />
      <path d={drop(28.4, 19.6, 1.1)} fill={TEAR} />
    </>
  ),
  ANGRY: (
    <>
      <Base fill="#ffac5f" rim="#e07b2a" />
      <path d="M10.4 12.2L17 14.8M29.6 12.2L23 14.8" {...line} strokeWidth={2.3} />
      <DotEyes y={18.4} />
      <path d="M14.6 27.6Q20 23.4 25.4 27.6" {...line} />
      <path d="M28 4.6v2.2a1 1 0 0 1-1 1h-2.2M32 4.6v2.2a1 1 0 0 0 1 1h2.2M28 12.4v-2.2a1 1 0 0 0-1-1h-2.2M32 12.4v-2.2a1 1 0 0 1 1-1h2.2"
        fill="none" stroke={RED} strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  SWEAT: (
    <>
      <Base />
      <path d="M10.8 13.2L16.6 11.6M23.4 11.6L29.2 13.2" {...line} />
      <DotEyes y={18} />
      <path d="M13 26.6q1.75-2 3.5 0t3.5 0t3.5 0t3.5 0" {...line} />
      <path d={drop(31.4, 4.4, 1.15)} fill={TEAR} stroke="#fff" strokeWidth="0.9" />
    </>
  ),
  THINKING: (
    <>
      <Base />
      <path d="M10.4 11.2Q14 7.8 17.6 10.4M22.8 12.8L29 12.2" {...line} />
      <circle cx="15.2" cy="16.6" r="2.1" fill={INK} />
      <circle cx="27.2" cy="16.6" r="2.1" fill={INK} />
      <path d="M15.2 26.4L23 24.8" {...line} />
      <ellipse cx="25.6" cy="31.4" rx="4.4" ry="3.2" fill="#ffc23d" stroke={RIM} strokeWidth="1.3" />
      <path d="M22.6 30.4h5.4" stroke={RIM} strokeWidth="1.1" strokeLinecap="round" />
    </>
  ),
};

/** 감정 표현 얼굴. 이름은 버튼·말풍선이 따로 읽히게 하므로 그림 자체는 장식으로 숨긴다. */
export function EmoteFace({ emote, size = 32, className }: { emote: EmoteId; size?: number; className?: string }) {
  return (
    <svg data-testid={`emote-face-${emote}`} viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden="true">
      {ART[emote]}
    </svg>
  );
}
