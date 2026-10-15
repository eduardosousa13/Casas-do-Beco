import type { RouteHandler } from '../../types';
import { applyStripeEvent, verifyStripeEvent } from '../../../pms/webhook';
import { json, readBody } from '../../../pms/http';


export const POST: RouteHandler = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return json(400, { ok: false });
  let body: string;
  try { body = await readBody(request, 256_000); }
  catch { return json(413, { ok: false }); }
  let event;
  try {
    event = verifyStripeEvent(body, signature);
  } catch {
    return json(400, { ok: false });
  }
  try {
    await applyStripeEvent(event);
    return json(200, { ok: true });
  } catch (error) {
    console.error('Stripe event processing failed', error);
    return json(500, { ok: false });
  }
};
