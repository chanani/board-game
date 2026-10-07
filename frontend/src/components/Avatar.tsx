import { useId, type ReactNode } from 'react';
import { avatarOf, type AvatarKey } from '../lib/avatars';

const INK = '#3b2a20';
const BLUSH = '#ff8fa3';
const WHITE = '#fffdf8';

/** 공통 얼굴 부품(40x40 기준). 작은 크기(20px)에서도 보이게 눈은 굵게, 볼터치는 진하게 둔다. */
const Eyes = ({ y = 23, gap = 4.6, r = 1.7, fill = INK }: { y?: number; gap?: number; r?: number; fill?: string }) => (
  <>
    <circle cx={20 - gap} cy={y} r={r} fill={fill} />
    <circle cx={20 + gap} cy={y} r={r} fill={fill} />
  </>
);
const Cheeks = ({ y = 27, gap = 7.6 }: { y?: number; gap?: number }) => (
  <>
    <ellipse cx={20 - gap} cy={y} rx={2.3} ry={1.5} fill={BLUSH} opacity={0.75} />
    <ellipse cx={20 + gap} cy={y} rx={2.3} ry={1.5} fill={BLUSH} opacity={0.75} />
  </>
);
const Smile = ({ y = 28.2, w = 1.8 }: { y?: number; w?: number }) => (
  <path d={`M${20 - w * 1.6} ${y}q${w * 0.8} ${w * 0.9} ${w * 1.6} 0q${w * 0.8} ${w * 0.9} ${w * 1.6} 0`} fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
);

type Art = { bg: string; draw: ReactNode };

export const AVATAR_ART: Record<AvatarKey, Art> = {
  CAT: {
    bg: '#e9ddfb',
    draw: (
      <>
        <path d="M8.5 19L10 6.5l9 7z" fill="#f4a04a" />
        <path d="M31.5 19L30 6.5l-9 7z" fill="#f4a04a" />
        <path d="M11 15l.8-5.6 4.4 3.6z" fill="#ffc2c9" />
        <path d="M29 15l-.8-5.6-4.4 3.6z" fill="#ffc2c9" />
        <ellipse cx="20" cy="24" rx="13" ry="11.5" fill="#f4a04a" />
        <path d="M17.5 13.5l1 3M20 13l0 3.2M22.5 13.5l-1 3" stroke="#d27a26" strokeWidth="1.3" strokeLinecap="round" />
        <Eyes />
        <Cheeks />
        <path d="M18.8 25.6h2.4L20 26.9z" fill="#e5607a" />
        <Smile y={27.4} w={1.5} />
        <path d="M5 24.5l5 .6M5.5 28l4.6-1" stroke={INK} strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
        <path d="M35 24.5l-5 .6M34.5 28l-4.6-1" stroke={INK} strokeWidth="0.8" strokeLinecap="round" opacity="0.55" />
      </>
    ),
  },
  DOG: {
    bg: '#d7eafb',
    draw: (
      <>
        <ellipse cx="20" cy="24" rx="12" ry="11.5" fill="#e0ad72" />
        <ellipse cx="8.6" cy="21" rx="4.2" ry="8.4" transform="rotate(18 8.6 21)" fill="#8b5a2b" />
        <ellipse cx="31.4" cy="21" rx="4.2" ry="8.4" transform="rotate(-18 31.4 21)" fill="#8b5a2b" />
        <ellipse cx="25.6" cy="20.5" rx="3.6" ry="3.2" fill="#c98a4b" />
        <ellipse cx="20" cy="28.2" rx="6.4" ry="4.8" fill="#f6e2c6" />
        <Eyes y={22} />
        <Cheeks y={26.5} gap={8.2} />
        <ellipse cx="20" cy="26" rx="2.3" ry="1.6" fill={INK} />
        <path d="M20 27.4v1.4m-2.2.4q2.2 1.8 4.4 0" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      </>
    ),
  },
  RABBIT: {
    bg: '#fadae6',
    draw: (
      <>
        <ellipse cx="14.5" cy="9" rx="3.6" ry="9.5" transform="rotate(-8 14.5 9)" fill={WHITE} />
        <ellipse cx="25.5" cy="9" rx="3.6" ry="9.5" transform="rotate(8 25.5 9)" fill={WHITE} />
        <ellipse cx="14.6" cy="9.5" rx="1.6" ry="6.8" transform="rotate(-8 14.6 9.5)" fill="#ffb3c4" />
        <ellipse cx="25.4" cy="9.5" rx="1.6" ry="6.8" transform="rotate(8 25.4 9.5)" fill="#ffb3c4" />
        <ellipse cx="20" cy="26" rx="12" ry="10.5" fill={WHITE} />
        <Eyes y={24.5} />
        <Cheeks y={28.5} />
        <path d="M18.6 27h2.8L20 28.3z" fill="#f07a95" />
        <path d="M20 28.3v1.2" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        <rect x="18.7" y="29.4" width="2.6" height="2.4" rx="0.6" fill="#ffffff" stroke={INK} strokeWidth="0.7" />
      </>
    ),
  },
  BEAR: {
    bg: '#ddf1d5',
    draw: (
      <>
        <circle cx="9.8" cy="12.5" r="5.2" fill="#9c6436" />
        <circle cx="30.2" cy="12.5" r="5.2" fill="#9c6436" />
        <circle cx="9.8" cy="12.5" r="2.6" fill="#d9a57a" />
        <circle cx="30.2" cy="12.5" r="2.6" fill="#d9a57a" />
        <circle cx="20" cy="24" r="12.5" fill="#9c6436" />
        <ellipse cx="20" cy="28" rx="6" ry="4.6" fill="#e8c39e" />
        <Eyes y={21.8} />
        <Cheeks y={26} gap={8.4} />
        <ellipse cx="20" cy="26.3" rx="2.2" ry="1.5" fill={INK} />
        <Smile y={28.6} w={1.4} />
      </>
    ),
  },
  PANDA: {
    bg: '#d3f0ec',
    draw: (
      <>
        <circle cx="10" cy="12.5" r="5" fill="#2b2b33" />
        <circle cx="30" cy="12.5" r="5" fill="#2b2b33" />
        <circle cx="20" cy="24" r="12.5" fill={WHITE} />
        <ellipse cx="14.8" cy="22.6" rx="3.4" ry="4.4" transform="rotate(30 14.8 22.6)" fill="#2b2b33" />
        <ellipse cx="25.2" cy="22.6" rx="3.4" ry="4.4" transform="rotate(-30 25.2 22.6)" fill="#2b2b33" />
        <Eyes y={22.4} gap={5} r={1.3} fill="#ffffff" />
        <Cheeks y={27.6} gap={8.6} />
        <ellipse cx="20" cy="26.6" rx="2" ry="1.4" fill="#2b2b33" />
        <Smile y={28.6} w={1.3} />
      </>
    ),
  },
  FOX: {
    bg: '#fff0c2',
    draw: (
      <>
        <path d="M7.5 20L9 4.5l10 8z" fill="#ee7b30" />
        <path d="M32.5 20L31 4.5l-10 8z" fill="#ee7b30" />
        <path d="M10.4 14.5l.6-6 4.6 3.8z" fill="#3b2a20" opacity="0.8" />
        <path d="M29.6 14.5l-.6-6-4.6 3.8z" fill="#3b2a20" opacity="0.8" />
        <path d="M6.5 20.5Q8 12 20 12.5Q32 12 33.5 20.5Q33 31 20 35.5Q7 31 6.5 20.5z" fill="#ee7b30" />
        <path d="M7.2 22.5Q13 24 20 35.5Q27 24 32.8 22.5Q33 31 20 35.5Q7 31 7.2 22.5z" fill={WHITE} />
        <Eyes y={21.6} gap={5} />
        <Cheeks y={25.4} gap={8.6} />
        <ellipse cx="20" cy="29" rx="1.9" ry="1.4" fill={INK} />
        <path d="M18.2 31.2q1.8 1.2 3.6 0" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      </>
    ),
  },
  FROG: {
    bg: '#ffe2cf',
    draw: (
      <>
        <circle cx="12.6" cy="14.5" r="5.6" fill="#6dbb4f" />
        <circle cx="27.4" cy="14.5" r="5.6" fill="#6dbb4f" />
        <ellipse cx="20" cy="26" rx="14" ry="10" fill="#6dbb4f" />
        <circle cx="12.6" cy="14.2" r="3.6" fill={WHITE} />
        <circle cx="27.4" cy="14.2" r="3.6" fill={WHITE} />
        <circle cx="13" cy="14.6" r="1.9" fill={INK} />
        <circle cx="27" cy="14.6" r="1.9" fill={INK} />
        <Cheeks y={27} gap={9} />
        <path d="M13.5 27.5Q20 33 26.5 27.5" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="18.4" cy="23" r="0.7" fill={INK} opacity="0.6" />
        <circle cx="21.6" cy="23" r="0.7" fill={INK} opacity="0.6" />
      </>
    ),
  },
  CHICK: {
    bg: '#dce0fa',
    draw: (
      <>
        <path d="M18 12.5Q17 7 19.6 6.5Q19.6 10 20.6 12.5Q21.8 8 24.4 8.6Q22.4 11 22 13z" fill="#f7c22f" />
        <circle cx="20" cy="24" r="12.6" fill="#ffd84a" />
        <Eyes y={22} />
        <Cheeks y={26.4} gap={8.2} />
        <path d="M17 25.4L20 23.8l3 1.6L20 28.6z" fill="#f28c28" />
        <path d="M17 25.4h6" stroke="#c8661a" strokeWidth="0.7" />
      </>
    ),
  },
  PIG: {
    bg: '#eaf5cc',
    draw: (
      <>
        <path d="M7.5 17L9 7.5l8 5z" fill="#ee8fa4" />
        <path d="M32.5 17L31 7.5l-8 5z" fill="#ee8fa4" />
        <circle cx="20" cy="24" r="12.6" fill="#f7b3c2" />
        <Eyes y={21} gap={5.4} />
        <Cheeks y={25.6} gap={9} />
        <ellipse cx="20" cy="27" rx="5" ry="3.6" fill="#ee8fa4" />
        <ellipse cx="18.2" cy="27" rx="1" ry="1.4" fill="#b8566c" />
        <ellipse cx="21.8" cy="27" rx="1" ry="1.4" fill="#b8566c" />
        <path d="M18.2 32.2q1.8 1 3.6 0" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      </>
    ),
  },
  KOALA: {
    bg: '#f5e1d8',
    draw: (
      <>
        <circle cx="8.4" cy="16" r="7" fill="#9aa5b1" />
        <circle cx="31.6" cy="16" r="7" fill="#9aa5b1" />
        <circle cx="8.6" cy="16.4" r="4.2" fill="#ece3e8" />
        <circle cx="31.4" cy="16.4" r="4.2" fill="#ece3e8" />
        <ellipse cx="20" cy="24.5" rx="11.6" ry="11.2" fill="#9aa5b1" />
        <Eyes y={22} gap={5.6} />
        <Cheeks y={28} gap={8} />
        <ellipse cx="20" cy="26" rx="3.1" ry="4.1" fill="#3f4652" />
        <path d="M18 32q2 1.2 4 0" fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round" />
      </>
    ),
  },
  TIGER: {
    bg: '#f2e3f5',
    draw: (
      <>
        <circle cx="10" cy="12.6" r="4.6" fill="#f59a3a" />
        <circle cx="30" cy="12.6" r="4.6" fill="#f59a3a" />
        <circle cx="10" cy="12.6" r="2.2" fill={WHITE} />
        <circle cx="30" cy="12.6" r="2.2" fill={WHITE} />
        <circle cx="20" cy="24" r="12.6" fill="#f59a3a" />
        <path d="M20 11.6v4.2M16.6 12.4l.9 3M23.4 12.4l-.9 3M7.8 22h4M7.8 26h3.6M32.2 22h-4M32.2 26h-3.6" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="20" cy="28.4" rx="6.2" ry="4.6" fill={WHITE} />
        <Eyes y={21.6} />
        <Cheeks y={25.8} gap={8.4} />
        <path d="M18.6 26.6h2.8L20 28z" fill="#e5607a" />
        <Smile y={28.8} w={1.4} />
      </>
    ),
  },
  PENGUIN: {
    bg: '#ddf4ff',
    draw: (
      <>
        <circle cx="20" cy="23" r="13.6" fill="#2f3e55" />
        <path d="M20 17.5Q16 12.5 12.4 15.6Q8.6 20 10.6 27Q13.4 34 20 34Q26.6 34 29.4 27Q31.4 20 27.6 15.6Q24 12.5 20 17.5z" fill={WHITE} />
        <Eyes y={22.4} gap={4.8} />
        <Cheeks y={26.4} gap={7.4} />
        <path d="M17.6 25.2h4.8L20 28.2z" fill="#f59a28" />
      </>
    ),
  },
};

type Props = {
  avatar: AvatarKey;
  /** 지름(px). 20px부터 알아볼 수 있게 그렸다. 없으면 감싼 상자를 꽉 채운다. */
  size?: number;
  className?: string;
  /** 주면 그림이 이름을 가진 이미지가 된다(없으면 장식이라 화면 낭독기가 건너뛴다). */
  title?: string;
};

/** 원형 파스텔 바탕 위에 그린 동물 얼굴. 테마와 상관없이 같은 색이고, 어두운 바탕에서도 보이게 얇은 흰 테두리를 두른다. */
export function AvatarFace({ avatar, size, className = '', title }: Props) {
  const clip = useId();
  const art = AVATAR_ART[avatar];
  return (
    <svg data-testid="avatar" data-avatar={avatar} viewBox="0 0 40 40" width={size} height={size} style={size ? undefined : { width: '100%', height: '100%' }}
      className={`inline-block shrink-0 rounded-full ${className}`}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={clip}><circle cx="20" cy="20" r="20" /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <circle cx="20" cy="20" r="20" fill={art.bg} />
        {art.draw}
      </g>
      <circle cx="20" cy="20" r="19.25" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.5" />
    </svg>
  );
}

/** 회원 id와 서버 키로 바로 그린다. */
export function MemberAvatar({ memberId, avatar, size, className, title }: { memberId: number; avatar?: string | null } & Omit<Props, 'avatar'>) {
  return <AvatarFace avatar={avatarOf(avatar, memberId)} size={size} className={className} title={title} />;
}
