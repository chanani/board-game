import { describe, expect, it } from 'vitest';
import type { TableLayout } from '../../lib/useTableLayout';
import { fitBoard } from './fit';

describe('fitBoard 확인 값(스펙 6.4)', () => {
  it('PC 844×660, 상대 4명', () => {
    const fit = fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'play', big: 1, mini: 4 });
    expect(fit).toEqual({ bigWidth: 400, miniWidth: 196, bigCols: 1, miniCols: 2 });
    expect(fit.bigWidth + fit.miniCols * (fit.miniWidth + 12)).toBe(816);
  });

  it('세로 328×500(360×640 화면), 상대 4명', () => {
    expect(fitBoard({ layout: 'portrait', box: { w: 328, h: 500 }, mode: 'play', big: 1, mini: 4 })).toEqual({ bigWidth: 220, miniWidth: 53, bigCols: 1, miniCols: 4 });
  });

  it('세로 328×660, 상대 4명', () => {
    expect(fitBoard({ layout: 'portrait', box: { w: 328, h: 660 }, mode: 'play', big: 1, mini: 4 })).toEqual({ bigWidth: 310, miniWidth: 70, bigCols: 1, miniCols: 4 });
  });

  it('가로 632×326, 상대 4명', () => {
    const fit = fitBoard({ layout: 'landscape', box: { w: 632, h: 326 }, mode: 'play', big: 1, mini: 4 });
    expect(fit).toEqual({ bigWidth: 217, miniWidth: 91, bigCols: 1, miniCols: 2 });
    expect(64 + 12 + fit.bigWidth + 12 + 2 * fit.miniWidth + 8).toBe(495);
  });

  it('상대가 한 명이면 PC는 오른쪽 한 줄, 가로는 한 칸이다', () => {
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'play', big: 1, mini: 1 })).toEqual({ bigWidth: 400, miniWidth: 200, bigCols: 1, miniCols: 1 });
    expect(fitBoard({ layout: 'landscape', box: { w: 632, h: 326 }, mode: 'play', big: 1, mini: 1 }).miniCols).toBe(1);
  });

  it('지켜보기: 살아 있는 사람 수에 따라 큰 판 칸 수가 정해진다', () => {
    const cols = (layout: TableLayout, big: number) => fitBoard({ layout, box: { w: 844, h: 660 }, mode: 'watch', big, mini: 1 }).bigCols;
    expect([1, 2, 3, 4, 5].map((big) => cols('pc', big))).toEqual([1, 2, 3, 2, 3]);
    expect([1, 2, 3, 4, 5].map((big) => cols('portrait', big))).toEqual([1, 2, 2, 2, 2]);
    expect([1, 2, 3, 4, 5].map((big) => cols('landscape', big))).toEqual([1, 2, 3, 4, 5]);
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'watch', big: 1, mini: 1 })).toEqual({ bigWidth: 317, miniWidth: 48, bigCols: 1, miniCols: 1 });
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'watch', big: 2, mini: 0 }).bigWidth).toBe(388);
  });

  it('어느 배치·모드·인원에서도 전체가 상자 안에 들어간다', () => {
    const boxes: Record<TableLayout, { w: number; h: number }> = { pc: { w: 844, h: 660 }, portrait: { w: 328, h: 500 }, landscape: { w: 632, h: 326 } };
    (['pc', 'portrait', 'landscape'] as TableLayout[]).forEach((layout) => {
      [1, 2, 3, 4].forEach((mini) => {
        const fit = fitBoard({ layout, box: boxes[layout], mode: 'play', big: 1, mini });
        const sideWidth = layout === 'portrait' ? 0 : fit.miniCols * (fit.miniWidth + 12);
        expect(fit.bigWidth).toBeGreaterThanOrEqual(150);
        expect(fit.miniWidth).toBeGreaterThanOrEqual(40);
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
