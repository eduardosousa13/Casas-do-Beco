import type { RouteHandler } from '../../types';
import { AccessError, checkOrigin, staffSession } from '../../../pms/auth';
import { database, transaction } from '../../../pms/db';
import { sessionList, revokeSession } from '../../../pms/activity';
import { apiError, json, readJson } from '../../../pms/http';
export const ALL: RouteHandler = async ({ request }) => {
  try {
    if (!['GET','POST'].includes(request.method)) return json(405, { error: 'Método inválido.' });
    if (request.method === 'POST') checkOrigin(request);
    const actor = await staffSession(request);
    if (request.method === 'GET') return json(200, await sessionList(database(), actor.user.id, actor.sessionId));
    const body = await readJson(request, 1000);
    return json(200, await transaction(db => revokeSession(db, actor.user.id, actor.sessionId, body)));
  } catch (error) {
    if (error instanceof AccessError) return json(error.status, { error: error.message });
    return apiError(error);
  }
};
