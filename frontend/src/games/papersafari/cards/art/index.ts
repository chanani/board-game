import type { ComponentType } from 'react';
import type { CardView } from '../../../../api/types';
import { Cheetah } from './Cheetah';
import { Crocodile } from './Crocodile';
import { Elephant } from './Elephant';
import { Fox } from './Fox';
import { Giraffe } from './Giraffe';
import { Hippo } from './Hippo';
import { Lion } from './Lion';
import { Monkey } from './Monkey';
import { Mouse } from './Mouse';
import { Rabbit } from './Rabbit';
import { Rhino } from './Rhino';
import { Tarzan } from './Tarzan';
import { Wild } from './Wild';
import { Zebra } from './Zebra';

export type ArtKey = 'mouse' | 'rabbit' | 'monkey' | 'zebra' | 'giraffe' | 'cheetah' | 'hippo' | 'crocodile' | 'rhino'
  | 'lion' | 'elephant' | 'tarzan' | 'fox' | 'wild';

const NUMBER_KEYS: ArtKey[] = ['mouse', 'rabbit', 'monkey', 'zebra', 'giraffe', 'cheetah', 'hippo', 'crocodile', 'rhino', 'lion'];
const SPECIAL_KEYS = { ELEPHANT: 'elephant', TARZAN: 'tarzan', FOX: 'fox', WILD: 'wild' } as const;

export const ART_BY_KEY: Record<ArtKey, ComponentType> = {
  mouse: Mouse, rabbit: Rabbit, monkey: Monkey, zebra: Zebra, giraffe: Giraffe, cheetah: Cheetah, hippo: Hippo,
  crocodile: Crocodile, rhino: Rhino, lion: Lion, elephant: Elephant, tarzan: Tarzan, fox: Fox, wild: Wild,
};

export function artKeyOf(card: CardView): ArtKey {
  if (card.kind === 'NUMBER') {
    return NUMBER_KEYS[card.value] ?? 'wild';
  }
  return SPECIAL_KEYS[card.kind];
}
