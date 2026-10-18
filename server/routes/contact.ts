import type { RouteHandler } from '../types';
import { validateContact } from '../contact';
import {transaction} from '../../pms/db';
import {queueContactMessage} from '../../pms/contact-email';
import type {ContactMessage} from '../contact';


const maxBodyBytes = 12_000;
const windowMs = 10 * 60 * 1000;
const maxMessages = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function response(status: number, error?: string): Response {
  return new Response(JSON.stringify(error ? { ok: false, error } : { ok: true }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBodyBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export const contactHandler=(store:(message:ContactMessage)=>Promise<unknown>):RouteHandler=>async ({ request, clientAddress }) => {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return response(415, 'Formato de pedido inválido.');
  }

  const body = await readBody(request);
  if (body === null) return response(413, 'Mensagem demasiado longa.');

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return response(400, 'Dados inválidos.');
  }

  const message = validateContact(payload);
  if (!message) return response(400, 'Verifica os dados do formulário.');

  // An invisible field catches simple bots without changing the visible form.
  if ((payload as Record<string, unknown>).website) return response(200);

  const now = Date.now();
  if (attempts.size > 1000) {
    for (const [address, entry] of attempts) {
      if (entry.resetAt <= now) attempts.delete(address);
    }
  }
  const key = clientAddress || 'unknown';
  const previous = attempts.get(key);
  const current = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + windowMs };
  if (current.count >= maxMessages) return response(429, 'Demasiadas mensagens. Tenta novamente mais tarde.');
  current.count += 1;
  attempts.set(key, current);

  try {
    await store(message);
    return response(200);
  } catch {
    console.error('Contact message storage failed');
    return response(503, 'Não foi possível guardar a mensagem. Tenta novamente mais tarde.');
  }
};
export const POST=contactHandler(message=>transaction(db=>queueContactMessage(db,message)));
