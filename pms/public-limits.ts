import { createHmac } from 'node:crypto';
import { database } from './db';
import { AccessError } from './auth';
export async function limitPublicRequest(address:string,scope:string,max:number) {
 const secret=process.env.BETTER_AUTH_SECRET;if(!secret)throw new AccessError(503,'Serviço temporariamente indisponível.');
 const key=createHmac('sha256',secret).update(scope+':'+address).digest('hex');
 const result=await database().query(`INSERT INTO public_request_limits(key,window_start,hits) VALUES($1,now(),1) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN public_request_limits.window_start<now()-interval '1 minute' THEN 1 ELSE public_request_limits.hits+1 END,window_start=CASE WHEN public_request_limits.window_start<now()-interval '1 minute' THEN now() ELSE public_request_limits.window_start END RETURNING hits`,[key]);
 if(result.rows[0].hits>max)throw new AccessError(429,'Demasiados pedidos. Aguarde um minuto.');
}
