import type { RouteHandler } from '../../types';
import { publicQuote } from '../../../pms/checkout';
import { apiError, json, readJson } from '../../../pms/http';
import type { Stay } from '../../../pms/core';


export const POST: RouteHandler = async ({ request }) => {
  try {
    const payload = await readJson(request) as { stay?: Stay; locale?: 'pt' | 'en' };
    if (!payload || typeof payload !== 'object' || !payload.stay) return json(400, { ok: false, error: 'Pedido inválido.' });
    const quote = await publicQuote(payload.stay, payload.locale === 'en' ? 'en' : 'pt');
    return json(200, { ok: true, quote });
  } catch (error) {
    return apiError(error);
  }
};
