import type { RouteHandler } from '../../types';
import { startCheckout } from '../../../pms/checkout';
import { apiError, json, readJson } from '../../../pms/http';
import { checkOrigin, AccessError } from '../../../pms/auth';
import { limitPublicRequest } from '../../../pms/public-limits';
import type { Guest, Stay, NewReservation } from '../../../pms/core';


export const POST: RouteHandler = async ({ request,clientAddress }) => {
  try {
    checkOrigin(request);
    await limitPublicRequest(clientAddress,'checkout',10);
    const payload = await readJson(request) as {
      requestKey?:string; stay?: Stay; guest?: Guest; policyVersion?: string;
      termsAccepted?: boolean; privacyAcknowledged?: boolean;
      expectedQuote?: NewReservation['expectedQuote'];
    };
    if (!payload || typeof payload !== 'object' || !payload.stay || !payload.guest ||
        typeof payload.requestKey!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(payload.requestKey) || typeof payload.policyVersion !== 'string' || payload.policyVersion.length > 80 || !payload.expectedQuote) {
      return json(400, { ok: false, error: 'Pedido inválido.' });
    }
    const result = await startCheckout({
      requestKey:payload.requestKey,
      stay: payload.stay,
      guest: payload.guest,
      policyVersion: payload.policyVersion,
      termsAccepted: payload.termsAccepted === true,
      privacyAcknowledged: payload.privacyAcknowledged === true,
      expectedQuote: payload.expectedQuote,
    }, request.url);
    return json(200, { ok: true, ...result });
  } catch (error) {
    if(error instanceof AccessError) return json(error.status,{error:error.message});
    return apiError(error);
  }
};
