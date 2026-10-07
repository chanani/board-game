import type { TableLayout } from '../lib/useTableLayout';

const FAN_STEP = 5;
const FAN_MAX = 30;
/** 부채 끝 카드가 기울 수 있는 가장 큰 각도(장수가 많을 때 ±15°). */
export const FAN_EDGE_MAX = FAN_MAX / 2;
// 부채꼴 호의 반지름(카드 폭의 배수). 가장자리 카드일수록 이 원을 따라 아래로 내려앉는다.
// 눕힌 휴대폰은 손패까지 한 화면 높이(약 390px)에 들어가야 해서 호를 납작하게 둔다.
export const FAN_RADIUS: Record<TableLayout, number> = { pc: 5, portrait: 5, landscape: 2.5 };
// 내려앉은 가장자리 카드 아래로 남겨 두는 여유(새 카드 테두리 몫).
const FAN_BOTTOM_ROOM = 4;

/** 카드(폭 width, 높이 1.5배)가 angle도 기울면 원래 자리보다 옆으로 삐져나오는 폭. */
export function fanOverhang(width: number, angle: number): number {
  const radians = (Math.abs(angle) * Math.PI) / 180;
  const extent = width * Math.cos(radians) + width * 1.5 * Math.sin(radians);
  return Math.max(0, (extent - width) / 2);
}

/** 부채꼴 호를 따라 angle도 기운 카드가 가운데 카드보다 내려앉는 높이(px). */
export function fanDrop(width: number, angle: number, radius = FAN_RADIUS.pc): number {
  const radians = (Math.abs(angle) * Math.PI) / 180;
  return width * radius * (1 - Math.cos(radians));
}

/** 카드가 angle도 기울면 아래로 더 삐져나오는 높이(px). */
export function fanUnderhang(width: number, angle: number): number {
  const radians = (Math.abs(angle) * Math.PI) / 180;
  const height = width * 1.5;
  return Math.max(0, (width * Math.sin(radians) + height * Math.cos(radians) - height) / 2);
}

/** 가장자리 카드(edgeAngle)가 호를 따라 내려앉고 기울어도 줄 아래로 잘리지 않게 남겨 둘 높이. */
export function fanRoom(width: number, edgeAngle: number, radius = FAN_RADIUS.pc): number {
  return Math.ceil(fanDrop(width, edgeAngle, radius) + fanUnderhang(width, edgeAngle)) + FAN_BOTTOM_ROOM;
}

/** 낼 수 있는 카드의 빛(drop-shadow 6px)이 위로 번지는 폭. */
export const HAND_GLOW = 6;

/**
 * 손패 줄 위쪽 여백: 가장 많이 들어 올린 카드의 진짜 윗끝(호를 따라 내려앉은 만큼 빼고, 기울어 모서리가 올라간 만큼 더하고,
 * 빛까지 더한 값)이 줄 위로 넘치지 않는 최소 높이. 스크롤 줄(overflow-x-auto)은 세로도 잘라 내므로 넉넉히 잡아야 한다.
 */
export function handHeadroom(width: number, angles: number[], radius: number, maxLift: number): number {
  const need = angles.map((angle) => maxLift + HAND_GLOW + fanUnderhang(width, angle) - fanDrop(width, angle, radius));
  return Math.ceil(Math.max(maxLift + HAND_GLOW, ...need));
}

// 장수와 상관없는 높이를 잴 때 0°~최대 각도를 이 간격으로 훑는다(실제 각도는 그 사이 아무 값이나 될 수 있다).
const ANGLE_SAMPLE_STEP = 0.5;

/**
 * 장수와 상관없이 고정한 부채 줄의 위 여백과 아래 여백: 어떤 장수에서 나올 수 있는 기울기라도 들린 카드·가장자리 카드가 잘리지 않는 높이.
 * 장수가 바뀔 때 줄 높이가 출렁이지 않게 한다(도둑잡기 스펙 6.4 "손패 줄 높이 고정").
 */
export function fixedFanRoom(width: number, radius: number, maxLift: number): { headroom: number; room: number } {
  const samples = Math.round(FAN_EDGE_MAX / ANGLE_SAMPLE_STEP);
  const angles = Array.from({ length: samples + 1 }, (_, index) => index * ANGLE_SAMPLE_STEP);
  return { headroom: handHeadroom(width, angles, radius, maxLift), room: fanRoom(width, FAN_EDGE_MAX, radius) };
}

/** 모든 배치의 손패 부채꼴: 카드마다 최대 ±15° 안에서 고르게 기울인다(장수가 적으면 덜 벌린다). */
export function fanAngle(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  const spread = Math.min(FAN_MAX, (count - 1) * FAN_STEP);
  return -spread / 2 + (spread * index) / (count - 1);
}

const GAP = 6;
// 빛 테두리·새 카드 테두리가 줄 끝에서 잘리지 않게 남겨 두는 폭.
const GLOW_ROOM = 6;
// 가로 스크롤 줄은 양끝 16px을 흐리게 하므로 끝 카드를 그 밖으로 민다.
const FADE_ROOM = 16;
/** 가로 스크롤 줄의 양끝 FADE_ROOM(16px)을 흐리게 하는 마스크. */
export const EDGE_FADE = `linear-gradient(to right, transparent, black ${FADE_ROOM}px, black calc(100% - ${FADE_ROOM}px), transparent)`;

/**
 * 부채 카드 왼쪽 끝 사이 간격과 양끝 여백. 폭에 맞춰 겹치다가 최소 보이는 폭보다 좁아지면 그 폭으로 두고 가로 스크롤.
 * 여백(inset)은 기운 카드가 삐져나오는 폭과 빛 테두리를 품는다.
 */
export function fanSpacing(count: number, containerWidth: number, cardWidth: number, minVisible: number, angle = 0): { step: number; scroll: boolean; inset: number } {
  const loose = cardWidth + GAP;
  const inset = Math.ceil(fanOverhang(cardWidth, angle)) + GLOW_ROOM;
  if (count <= 1 || containerWidth <= 0) {
    return { step: loose, scroll: false, inset };
  }
  const fit = Math.floor((containerWidth - inset * 2 - cardWidth) / (count - 1));
  if (fit < minVisible) {
    return { step: minVisible, scroll: true, inset: inset + FADE_ROOM };
  }
  return { step: Math.min(loose, fit), scroll: false, inset };
}
