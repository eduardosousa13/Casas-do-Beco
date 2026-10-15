import type { RouteHandler } from '../../types';
import { AccessError, staffSession } from '../../../pms/auth';
import { database } from '../../../pms/db';
import { activityList } from '../../../pms/activity';
import { apiError, json } from '../../../pms/http';
export const ALL: RouteHandler = async ({ request }) => {
  try {
    if (request.method !== 'GET') return json(405, { error: 'Método inválido.' });
    await staffSession(request);
    return json(200, await activityList(database(), new URLSearchParams({kind:'staff',before:new URL(request.url).searchParams.get('before') || ''})));
  } catch (error) {
    if (error instanceof AccessError) return json(error.status, { error: error.message });
    return apiError(error);
  }
};
