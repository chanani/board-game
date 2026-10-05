export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = { method?: string; body?: unknown };

const NETWORK_MESSAGE = '네트워크 오류가 발생했어요. 잠시 후 다시 시도해 주세요.';

function parse(text: string): unknown {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function toApiError(status: number, data: unknown): ApiError {
  const body = data as { status?: number; code?: unknown; message?: string } | undefined;
  if (body && typeof body.code === 'string') {
    return new ApiError(body.status ?? status, body.code, body.message ?? NETWORK_MESSAGE);
  }
  return new ApiError(status, 'UNKNOWN', '알 수 없는 오류가 발생했어요.');
}

type UnauthorizedHandler = () => void;

const SESSION_PATHS = ['/api/members/me', '/api/auth/login'];
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const data = parse(await response.text());
  if (response.status === 401 && !SESSION_PATHS.includes(path)) {
    unauthorizedHandler?.();
  }
  if (!response.ok) {
    throw toApiError(response.status, data);
  }
  return data as T;
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return NETWORK_MESSAGE;
}
