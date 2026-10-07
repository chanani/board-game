import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AVATAR_KEYS } from '../lib/avatars';
import { AvatarFace, MemberAvatar } from './Avatar';

const EMOJI = /\p{Extended_Pictographic}/u;

describe('AvatarFace', () => {
  it('12종 모두 이모지 없이 원형 SVG 그림으로 그린다', () => {
    const { container } = render(<>{AVATAR_KEYS.map((key) => <AvatarFace key={key} avatar={key} size={20} />)}</>);
    const faces = screen.getAllByTestId('avatar');
    expect(faces).toHaveLength(12);
    expect(faces.map((face) => face.getAttribute('data-avatar'))).toEqual([...AVATAR_KEYS]);
    faces.forEach((face) => {
      expect(face.tagName.toLowerCase()).toBe('svg');
      expect(face).toHaveAttribute('width', '20');
      expect(face.querySelector('clipPath circle')).not.toBeNull();
    });
    expect(container.textContent ?? '').not.toMatch(EMOJI);
  });

  it('이름이 없으면 장식이라 숨기고, title을 주면 이름 있는 이미지다', () => {
    render(<><AvatarFace avatar="CAT" /><AvatarFace avatar="DOG" title="밥님의 프로필 사진" /></>);
    const [plain, named] = screen.getAllByTestId('avatar');
    expect(plain).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('img', { name: '밥님의 프로필 사진' })).toBe(named);
  });

  it('여러 개를 그려도 잘라내기 id가 겹치지 않는다', () => {
    const { container } = render(<><AvatarFace avatar="CAT" /><AvatarFace avatar="CAT" /></>);
    const ids = Array.from(container.querySelectorAll('clipPath')).map((clip) => clip.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('MemberAvatar는 키가 없으면 회원 id로 정한 기본 그림이다', () => {
    render(<MemberAvatar memberId={4} />);
    expect(screen.getByTestId('avatar')).toHaveAttribute('data-avatar', 'PANDA');
  });
});
