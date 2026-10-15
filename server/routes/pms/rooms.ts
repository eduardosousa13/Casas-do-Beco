import type { RouteHandler } from '../../types';
import { database } from '../../../pms/db';
import { apiError, json } from '../../../pms/http';


export const GET: RouteHandler = async ({ url }) => {
  try {
    const slug = url.searchParams.get('house');
    if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) return json(400, { ok: false, error: 'Casa inválida.' });
    const result = await database().query(`SELECT r.id, r.slug, r.name, r.max_adults, r.max_children, r.max_babies,
        r.max_occupancy, r.min_nights, r.max_nights
      FROM rooms r JOIN houses h ON h.id = r.house_id
      WHERE h.slug = $1 AND h.status = 'active' AND r.status = 'active'
      ORDER BY r.name`, [slug]);
    return json(200, { ok: true, rooms: result.rows });
  } catch (error) {
    return apiError(error);
  }
};
