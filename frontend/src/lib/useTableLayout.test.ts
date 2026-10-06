import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setMediaMatches } from '../test/media';
import { LANDSCAPE_PHONE_QUERY, TABLE_PC_QUERY, useTableLayout } from './useTableLayout';

describe('useTableLayout', () => {
  it('폭 768 이상이고 높이도 넉넉하면(태블릿·PC) pc', () => {
    setMediaMatches((query) => query === TABLE_PC_QUERY);
    expect(renderHook(() => useTableLayout()).result.current).toBe('pc');
  });

  it('눕힌 휴대폰은 폭이 768 이상이어도 PC 쿼리(높이 541 이상)에 걸리지 않아 landscape', () => {
    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    expect(renderHook(() => useTableLayout()).result.current).toBe('landscape');
  });

  it('그 밖(세로 휴대폰, 640~767px)은 portrait', () => {
    setMediaMatches(false);
    expect(renderHook(() => useTableLayout()).result.current).toBe('portrait');
  });

  it('PC 쿼리는 폭 768과 높이 541을 함께 본다', () => {
    expect(TABLE_PC_QUERY).toBe('(min-width: 768px) and (min-height: 541px)');
  });
});
