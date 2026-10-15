import { PmsError } from './core';

export function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function readJson(request: Request, maxBytes = 10_000): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    throw new PmsError('invalid', 'Formato do pedido inválido.');
  }
  const body = await readBody(request, maxBytes);
  try { return JSON.parse(body); } catch { throw new PmsError('invalid', 'Dados inválidos.'); }
}

export async function readBody(request: Request, maxBytes: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new PmsError('invalid', 'Pedido vazio.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new PmsError('invalid', 'Pedido demasiado longo.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function apiError(error: unknown): Response {
  if (error instanceof PmsError) {
    const status = error.code === 'invalid' ? 400 : error.code === 'conflict' ? 409
      : error.code === 'unavailable' ? 409 : 503;
    return json(status, { ok: false, code: error.code, error: error.message });
  }
  console.error('PMS request failed', error instanceof Error ? error.name : 'UnknownError');
  return json(503, { ok: false, code: 'service_unavailable', error: 'Serviço temporariamente indisponível.' });
}
