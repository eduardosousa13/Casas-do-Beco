import type { RouteHandler } from '../../types';
import { database } from '../../../pms/db';
import { publicReservationStatus } from '../../../pms/status';
import { apiError, json } from '../../../pms/http';


export const GET: RouteHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return json(400, { ok: false, error: 'Referência inválida.' });
    }
    const result=await publicReservationStatus(database(),id,url.searchParams.get('command'));
    if(!result)return json(404,{ok:false,error:'Reserva não encontrada.'});
    return json(200,{ok:true,...result});
  } catch (error) {
    return apiError(error);
  }
};
