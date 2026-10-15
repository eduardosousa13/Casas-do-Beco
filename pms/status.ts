import type { Sql } from './core';
import { PmsError } from './core';
import { uuid } from './owner';
// Only opaque lifecycle states are public; never contacts or financial details.
export async function publicReservationStatus(db:Sql,id:string,command?:string|null){
 uuid(id);const r=(await db.query('SELECT status FROM reservations WHERE id=$1',[id])).rows[0];
 if(!r)return null;
 if(command){uuid(command);const c=(await db.query("SELECT status FROM payment_commands WHERE id=$1 AND reservation_id=$2 AND kind='balance'",[command,id])).rows[0];if(!c)throw new PmsError('invalid','Referência de pagamento inválida.');return {status:r.status,paymentStatus:c.status};}
 return {status:r.status};
}
