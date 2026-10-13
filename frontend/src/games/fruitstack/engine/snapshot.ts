import { BOARD_H, BOARD_W, MAX_LEVEL, MAX_SNAPSHOT_FRUITS, type BoardFrame, type FrameFruit } from './constants';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const WORD = 5;
const TAU = Math.PI * 2;

const quantize = (value: number, span: number) => Math.min(1023, Math.max(0, Math.round((value / span) * 1023)));
const quantizeAngle = (angle: number) => Math.round(((((angle % TAU) + TAU) % TAU) / TAU) * 64) % 64;

function write(word: number): string {
  let text = '';
  for (let shift = 24; shift >= 0; shift -= 6) {
    text += ALPHABET[(word >>> shift) & 63];
  }
  return text;
}

function read(text: string, at: number): number | null {
  let word = 0;
  for (let index = at; index < at + WORD; index += 1) {
    const value = ALPHABET.indexOf(text[index]);
    if (value < 0) {
      return null;
    }
    word = word * 64 + value;
  }
  return word;
}

/** R23. */
export function encodeBoard(frame: BoardFrame): string {
  const head = ((frame.held << 26) | (quantize(frame.aimX, BOARD_W) << 16) | ((frame.danger ? 1 : 0) << 15)) >>> 0;
  const fruits = frame.fruits.slice(0, MAX_SNAPSHOT_FRUITS).map((fruit) =>
    ((fruit.level << 26) | (quantize(fruit.x, BOARD_W) << 16) | (quantize(fruit.y, BOARD_H) << 6) | quantizeAngle(fruit.angle)) >>> 0);
  return [head, ...fruits].map(write).join('');
}

function fruitOf(word: number): FrameFruit | null {
  const level = word >>> 26;
  if (level < 1 || level > MAX_LEVEL) {
    return null;
  }
  return { level, x: (((word >>> 16) & 1023) / 1023) * BOARD_W, y: (((word >>> 6) & 1023) / 1023) * BOARD_H, angle: ((word & 63) / 64) * TAU };
}

export function decodeBoard(text: string): BoardFrame | null {
  if (text.length < WORD || text.length % WORD !== 0) {
    return null;
  }
  const words: number[] = [];
  for (let at = 0; at < text.length; at += WORD) {
    const word = read(text, at);
    if (word === null) {
      return null;
    }
    words.push(word);
  }
  const [head, ...rest] = words;
  return {
    held: head >>> 26, aimX: (((head >>> 16) & 1023) / 1023) * BOARD_W, danger: ((head >>> 15) & 1) === 1,
    fruits: rest.flatMap((word) => fruitOf(word) ?? []),
  };
}
