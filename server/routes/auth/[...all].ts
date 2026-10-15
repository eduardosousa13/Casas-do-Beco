import type { RouteHandler } from '../../types';
import { authentication } from '../../../pms/auth';
import { json } from '../../../pms/http';
export const ALL: RouteHandler = async ({ request, clientAddress }) => {
  try {
    // Never accept a client-supplied forwarding header for rate limiting.
    const headers = new Headers(request.headers);
    headers.set('x-forwarded-for', clientAddress);
    const response = await authentication().handler(new Request(request, { headers }));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return json(503, { error: 'Acesso administrativo temporariamente indisponível.' });
  }
};
