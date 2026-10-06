import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, messageOf, request, setUnauthorizedHandler } from './http';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('request', () => {
  afterEach(() => vi.restoreAllMocks());

  it('성공 응답의 JSON을 돌려준다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ id: 1 }, 200));

    await expect(request('/api/x')).resolves.toEqual({ id: 1 });
  });

  it('204 응답은 undefined를 돌려준다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(request('/api/x')).resolves.toBeUndefined();
  });

  it('서버 에러 본문을 ApiError로 바꾼다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ status: 409, code: 'ROOM_FULL', message: '방이 가득 찼습니다.' }, 409),
    );

    await expect(request('/api/x')).rejects.toMatchObject({ status: 409, code: 'ROOM_FULL', message: '방이 가득 찼습니다.' });
  });

  it('JSON이 아닌 에러 응답은 UNKNOWN 코드가 된다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>bad gateway</html>', { status: 502 }));

    await expect(request('/api/x')).rejects.toMatchObject({ status: 502, code: 'UNKNOWN' });
  });

  it('본문이 있으면 JSON으로 보내고 쿠키를 포함한다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 200));

    await request('/api/rooms', { method: 'POST', body: { name: '방' } });

    expect(fetchSpy).toHaveBeenCalledWith('/api/rooms', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '방' }),
    });
  });

  it('메시지는 ApiError면 서버 메시지, 아니면 네트워크 안내다', () => {
    expect(messageOf(new ApiError(400, 'X', '잘못됨'))).toBe('잘못됨');
    expect(messageOf(new TypeError('fetch failed'))).toBe('네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
  });
});

describe('세션 만료 처리', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setUnauthorizedHandler(null);
  });

  const unauthorized = () => jsonResponse({ status: 401, code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }, 401);

  it('일반 요청이 401이면 핸들러를 부르고 에러를 던진다', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(unauthorized());

    await expect(request('/api/rooms')).rejects.toMatchObject({ status: 401 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(undefined);
  });

  it('다른 곳에서 로그인해서 끊긴 401이면 그 이유를 넘긴다', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ status: 401, code: 'SESSION_REPLACED', message: '다른 곳에서 로그인해서 로그아웃됐어요.' }, 401),
    );

    await expect(request('/api/rooms/me')).rejects.toMatchObject({ code: 'SESSION_REPLACED' });

    expect(handler).toHaveBeenCalledWith('SESSION_REPLACED');
  });

  it('로그인과 내 정보 조회의 401은 핸들러를 부르지 않는다', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => unauthorized());

    await expect(request('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({ status: 401 });
    await expect(request('/api/members/me')).rejects.toMatchObject({ status: 401 });

    expect(handler).not.toHaveBeenCalled();
  });
});
