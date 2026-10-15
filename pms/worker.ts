import { setTimeout } from 'node:timers/promises';
import { database,transaction } from './db';
import { paymentServiceConfigured,processPaymentCommand,reconcileCheckout,reconcilePayment,recoverInitialCheckout } from './payment-worker';
import { deliverReservationEmail,sendReservationEmail } from './reservation-email';
import { deliverRecoveryEmail,sendRecoveryEmail,recoveryMailConfigured } from './auth-email';
export async function runWorker(signal:AbortSignal,once=false){
let lastReconcile=0,lastCleanup=0;
try {
  do {
    try {
      await database().query("INSERT INTO worker_health(id,last_seen) VALUES('operations',now()) ON CONFLICT(id) DO UPDATE SET last_seen=now()");
      if(Date.now()-lastCleanup>3600000){
        await database().query("DELETE FROM public_request_limits WHERE window_start<now()-interval '1 day'");
        await database().query("DELETE FROM alert_events WHERE created_at<now()-interval '30 days'");
        lastCleanup=Date.now();
      }
      if(recoveryMailConfigured()) {
        await transaction(db=>deliverRecoveryEmail(db,sendRecoveryEmail));
        await transaction(db=>deliverReservationEmail(db,sendReservationEmail));
      }
      if(paymentServiceConfigured()) {
        await transaction(db=>recoverInitialCheckout(db));
        await transaction(db=>processPaymentCommand(db));
        if(Date.now()-lastReconcile>60000) {
          lastReconcile=Date.now();
          const sessions=(await database().query(`SELECT stripe_checkout_session_id AS id,updated_at AS seen FROM reservations WHERE status IN ('pending_checkout','awaiting_payment') AND stripe_checkout_session_id IS NOT NULL UNION ALL SELECT provider_id AS id,updated_at AS seen FROM payment_commands WHERE kind='balance' AND status='pending' AND provider_id IS NOT NULL ORDER BY seen ASC LIMIT 50`)).rows;
          for(const session of sessions) {try {await transaction(async db=>{await reconcileCheckout(db,String(session.id));await db.query('UPDATE reservations SET updated_at=now() WHERE stripe_checkout_session_id=$1',[session.id]);await db.query('UPDATE payment_commands SET updated_at=now() WHERE provider_id=$1',[session.id]);});}catch{process.stderr.write('Pagamento pendente de reconciliação.\n');}}
          const payments=(await database().query(`SELECT id,reservation_id FROM payments WHERE provider_payment_intent_id IS NOT NULL AND (status IN ('paid','partially_refunded','refunded','review')) ORDER BY updated_at ASC LIMIT 50`)).rows;
          for(const payment of payments) {try {await transaction(db=>reconcilePayment(db,payment));}catch{process.stderr.write('Movimento pendente de reconciliação.\n');}}
        }
      }
    } catch {process.stderr.write('Tarefa não concluída; nova tentativa no próximo ciclo.\n');}
    if(once||signal.aborted) break;
    try{await setTimeout(30000,undefined,{signal});}catch{break;}
  }while(!signal.aborted);
}finally{/* The caller owns the shared database pool. */}
}
