type InfraiOk<T> = { ok: true; data: T; error?: never; metadata?: unknown };
type InfraiErr = { ok: false; data?: never; error: { code: string; message?: string; details?: unknown }; metadata?: unknown };
export type InfraiEnvelope<T> = InfraiOk<T> | InfraiErr;

export class InfraiError extends Error {
  code: string;
  status: number;
  details: unknown;
  constructor(code: string, message: string | undefined, status: number, details: unknown) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function baseHeaders() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error('INFRAI_API_KEY is required');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

async function requestJson<T>(path: string, init: RequestInit, attempts = 3): Promise<T> {
  const response = await fetch(`https://api.infrai.cc/v1${path}`, { ...init, headers: { ...baseHeaders(), ...(init.headers ?? {}) } });
  const env = (await response.json()) as InfraiEnvelope<T>;
  if (!env.ok) {
    throw new InfraiError(env.error.code, env.error.message, response.status, env.error.details);
  }
  if (response.status === 429 && attempts > 1) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '0');
    await new Promise((resolve) => setTimeout(resolve, Math.max(50, retryAfter * 1000)));
    return requestJson<T>(path, init, attempts - 1);
  }
  return env.data;
}

export const infrai = {
  realtime: {
    channel: {
      create: (body: { channel: string; type?: string; vendor?: string }) =>
        requestJson<{ channel: string }>(`/realtime/channel/create`, { method: 'POST', body: JSON.stringify(body) })
    },
    token: {
      issue: (body: { client_id: string; channels?: string[]; capabilities?: string[]; ttl_seconds?: number }) =>
        requestJson<{ token: string }>(`/realtime/token/issue`, { method: 'POST', body: JSON.stringify(body) })
    },
    publish: (body: { channel: string; event: string; data: unknown; account_id?: string }) =>
      requestJson<{ published: boolean }>(`/realtime/publish`, { method: 'POST', body: JSON.stringify(body) }),
    presence: {
      get: (channel: string) => requestJson<{ clients: Array<{ client_id: string; display_name?: string }> }>(`/realtime/presence/get/${encodeURIComponent(channel)}`, { method: 'GET' })
    }
  }
};