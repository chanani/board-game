import { describe, expect, it } from 'vitest';
import type { TableLayout } from '../../lib/useTableLayout';
import { fitBoard } from './fit';

describe('fitBoard 확인 값(스펙 6.4)', () => {
  it('PC 844×660, 상대 4명', () => {
    const fit = fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'play', big: 1, mini: 4 });
    expect(fit).toEqual({ bigWidth: 400, miniWidth: 196, bigCols: 1, miniCols: 2, hudBeside: false });
    expect(fit.bigWidth + fit.miniCols * (fit.miniWidth + 12)).toBe(816);
  });

  const portrait = (w: number, h: number, mini: number) => fitBoard({ layout: 'portrait', box: { w, h }, mode: 'play', big: 1, mini });

  it('세로 342×584(360×640 화면): 높이가 모자라 점수 칸을 작은 판 옆에 두고, 내 판이 폭의 93%(334px)를 쓴다', () => {
    expect(portrait(342, 584, 1)).toEqual({ bigWidth: 334, miniWidth: 36, bigCols: 1, miniCols: 1, hudBeside: true });
    expect(portrait(342, 584, 4)).toEqual({ bigWidth: 334, miniWidth: 36, bigCols: 1, miniCols: 4, hudBeside: true });
    // 예전 배치(작은 판 줄, 점수 띠, 내 판을 세 줄로)에서는 같은 화면에서 161px이었다.
    expect(334 / 360).toBeGreaterThan(0.92);
  });

  it('세로 372×788(390×844 화면): 높이가 남아 점수 띠 한 줄 아래 작은 판 줄을 두고, 내 판이 상자 폭을 다 쓴다', () => {
    expect(portrait(372, 788, 1)).toEqual({ bigWidth: 372, miniWidth: 101, bigCols: 1, miniCols: 1, hudBeside: false });
    expect(portrait(372, 788, 4)).toEqual({ bigWidth: 372, miniWidth: 87, bigCols: 1, miniCols: 4, hudBeside: false });
  });

  it('세로 394×859(412×915 화면): 내 판이 상자 폭을 다 쓰고 작은 판은 높이 180까지만 커진다', () => {
    expect(portrait(394, 859, 1)).toEqual({ bigWidth: 394, miniWidth: 120, bigCols: 1, miniCols: 1, hudBeside: false });
    expect(portrait(394, 859, 4)).toEqual({ bigWidth: 394, miniWidth: 92, bigCols: 1, miniCols: 4, hudBeside: false });
  });

  it('세로: 주소창이 높이를 더 가져간 화면(342×504)에서도 내 판이 가장 큰 쪽을 쓴다', () => {
    expect(portrait(342, 504, 4)).toEqual({ bigWidth: 281, miniWidth: 36, bigCols: 1, miniCols: 4, hudBeside: true });
  });

  it('세로: 상대 판이 없으면 점수 띠 한 줄과 내 판뿐이다', () => {
    expect(portrait(342, 584, 0)).toEqual({ bigWidth: 342, miniWidth: 0, bigCols: 1, miniCols: 0, hudBeside: false });
    expect(portrait(342, 500, 0)).toEqual({ bigWidth: 300, miniWidth: 0, bigCols: 1, miniCols: 0, hudBeside: false });
  });

  it('세로: 어느 화면·인원에서도 윗줄과 내 판이 상자 안에 들어간다', () => {
    const boxes = [[342, 440], [342, 504], [342, 584], [357, 620], [372, 788], [394, 859], [420, 700], [520, 900], [740, 500]];
    boxes.forEach(([w, h]) => {
      [1, 2, 3, 4].forEach((mini) => {
        const fit = portrait(w, h, mini);
        const miniRow = Math.ceil(fit.miniWidth * 1.5) + 22;
        const above = fit.hudBeside ? Math.max(miniRow, 72) : 44 + 6 + miniRow;
        const minisWidth = mini * fit.miniWidth + (mini - 1) * 8;
        expect({ w, h, mini, height: above + 6 + fit.bigWidth * 1.5 <= h }).toEqual({ w, h, mini, height: true });
        expect(minisWidth + (fit.hudBeside ? 148 + 8 : 0)).toBeLessThanOrEqual(w);
        expect(fit.bigWidth).toBeLessThanOrEqual(w);
        expect(fit.miniWidth).toBeGreaterThanOrEqual(36);
        expect(fit.miniWidth).toBeLessThanOrEqual(120);
      });
    });
  });

  it('가로 632×326, 상대 4명', () => {
    const fit = fitBoard({ layout: 'landscape', box: { w: 632, h: 326 }, mode: 'play', big: 1, mini: 4 });
    expect(fit).toEqual({ bigWidth: 217, miniWidth: 91, bigCols: 1, miniCols: 2, hudBeside: false });
    expect(64 + 12 + fit.bigWidth + 12 + 2 * fit.miniWidth + 8).toBe(495);
  });

  it('상대가 한 명이면 PC는 오른쪽 한 줄, 가로는 한 칸이다', () => {
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'play', big: 1, mini: 1 })).toEqual({ bigWidth: 400, miniWidth: 200, bigCols: 1, miniCols: 1, hudBeside: false });
    expect(fitBoard({ layout: 'landscape', box: { w: 632, h: 326 }, mode: 'play', big: 1, mini: 1 }).miniCols).toBe(1);
  });

  it('지켜보기: 살아 있는 사람 수에 따라 큰 판 칸 수가 정해진다', () => {
    const cols = (layout: TableLayout, big: number) => fitBoard({ layout, box: { w: 844, h: 660 }, mode: 'watch', big, mini: 1 }).bigCols;
    // 넓고 낮은 상자(844×660)에서는 2줄로 접는 것보다 한 줄이 판이 더 커서 한 줄로 놓는다.
    expect([1, 2, 3, 4, 5].map((big) => cols('pc', big))).toEqual([1, 2, 3, 4, 5]);
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'watch', big: 4, mini: 1 }).bigWidth).toBe(202);
    // 좁고 높은 상자에서는 접는 쪽이 더 크다(PC 4명 → 2칸 2줄).
    expect(fitBoard({ layout: 'pc', box: { w: 500, h: 1200 }, mode: 'watch', big: 4, mini: 1 }).bigCols).toBe(2);
    expect(fitBoard({ layout: 'pc', box: { w: 700, h: 900 }, mode: 'watch', big: 5, mini: 0 }).bigCols).toBe(3);
    const phone = (big: number) => fitBoard({ layout: 'portrait', box: { w: 328, h: 500 }, mode: 'watch', big, mini: 1 }).bigCols;
    expect([1, 2, 3, 4, 5].map(phone)).toEqual([1, 2, 3, 2, 3]);
    expect([1, 2, 3, 4, 5].map((big) => cols('landscape', big))).toEqual([1, 2, 3, 4, 5]);
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'watch', big: 1, mini: 1 })).toEqual({ bigWidth: 317, miniWidth: 48, bigCols: 1, miniCols: 1, hudBeside: false });
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'watch', big: 2, mini: 0 }).bigWidth).toBe(388);
  });

  it('어느 배치·모드·인원에서도 전체가 상자 안에 들어간다', () => {
    const boxes: Record<TableLayout, { w: number; h: number }> = { pc: { w: 844, h: 660 }, portrait: { w: 328, h: 500 }, landscape: { w: 632, h: 326 } };
    (['pc', 'portrait', 'landscape'] as TableLayout[]).forEach((layout) => {
      [1, 2, 3, 4].forEach((mini) => {
        const fit = fitBoard({ layout, box: boxes[layout], mode: 'play', big: 1, mini });
        const sideWidth = layout === 'portrait' ? 0 : fit.miniCols * (fit.miniWidth + 12);
        expect(fit.bigWidth).toBeGreaterThanOrEqual(150);
        expect(fit.miniWidth).toBeGreaterThanOrEqual(layout === 'portrait' ? 36 : 40);
        expect(fit.bigWidth + sideWidth + (layout === 'landscape' ? 76 : 0)).toBeLessThanOrEqual(boxes[layout].w);
        expect(fit.bigWidth * 1.5).toBeLessThanOrEqual(boxes[layout].h);
        if (layout === 'portrait') {
          expect(mini * fit.miniWidth + (mini - 1) * 8).toBeLessThanOrEqual(boxes[layout].w);
        }
      });
      [1, 2, 3, 4, 5].forEach((big) => {
        const fit = fitBoard({ layout, box: boxes[layout], mode: 'watch', big, mini: 5 - big });
        expect(fit.bigWidth).toBeGreaterThan(40);
        expect(fit.bigCols * fit.bigWidth + (fit.bigCols - 1) * 12).toBeLessThanOrEqual(boxes[layout].w);
      });
    });
  });

  it('지켜보기: 점수 띠·작은 판 줄·큰 판 줄과 그 사이 간격까지 더한 높이가 상자 안이다', () => {
    const boxes: Record<TableLayout, { w: number; h: number }> = { pc: { w: 844, h: 660 }, portrait: { w: 328, h: 500 }, landscape: { w: 632, h: 326 } };
    const cases = [1, 2, 3, 4, 5].flatMap((big) => [0, 1, 2, 3, 4].filter((mini) => big + mini <= 5).map((mini) => ({ big, mini })));
    (['pc', 'portrait'] as TableLayout[]).forEach((layout) => {
      cases.forEach(({ big, mini }) => {
        const fit = fitBoard({ layout, box: boxes[layout], mode: 'watch', big, mini });
        const rows = Math.ceil(big / fit.bigCols);
        const miniRow = mini > 0 ? fit.miniWidth * 1.5 + 22 + 12 : 0;
        expect(44 + 12 + miniRow + rows * (fit.bigWidth * 1.5 + 22) + (rows - 1) * 12).toBeLessThanOrEqual(boxes[layout].h);
      });
    });
    cases.forEach(({ big, mini }) => {
      const { w, h } = boxes.landscape;
      const fit = fitBoard({ layout: 'landscape', box: boxes.landscape, mode: 'watch', big, mini });
      const perColumn = fit.miniCols === 0 ? 0 : Math.ceil(mini / fit.miniCols);
      expect(28 + 4 + fit.bigWidth * 1.5 + 22).toBeLessThanOrEqual(h);
      expect(28 + 4 + perColumn * (60 + 22) + Math.max(0, perColumn - 1) * 8).toBeLessThanOrEqual(h);
      const side = fit.miniCols === 0 ? 0 : fit.miniCols * 40 + (fit.miniCols - 1) * 8 + 12;
      expect(big * fit.bigWidth + (big - 1) * 12 + side).toBeLessThanOrEqual(w);
    });
  });
});
