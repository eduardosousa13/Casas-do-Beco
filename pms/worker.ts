import { setTimeout } from 'node:timers/promises';
import { database,transaction } from './db';
import { paymentServiceConfigured,processPaymentCommand,reconcileCheckout,reconcilePayment,recoverInitialCheckout } from './payment-worker';
import { deliverReservationEmail,sendReservationEmail } from './reservation-email';
import { deliverRecoveryEmail,sendRecoveryEmail,recoveryMailConfigured } from './auth-email';
import {deliverContactEmail} from './contact-email';
import {telegramConfig,telegramSender} from './telegram';
import {deliverAlerts,technicalAlerts} from './alert-worker';
export async function runWorker(signal:AbortSignal,once=false){
let lastReconcile=0,lastCleanup=0;
const destinations=([telegramConfig(),telegramConfig(process.env,'technical')]).filter(c=>c!==null);
const technical=destinations.find(c=>c.destination==='technical');
const report=technical?technicalAlerts(telegramSender(technical),technical.site):null;
if(process.env.TELEGRAM_ALERTS_ENABLED==='true'&&destinations.length!==2)process.stderr.write('Telegram: destino operacional ou técnico incompleto/inválido.\n');
try {
  do {
    try {
      if(Date.now()-lastCleanup>3600000){
        await database().query("DELETE FROM public_request_limits WHERE window_start<now()-interval '1 day'");
        await database().query("DELETE FROM alert_events WHERE created_at<now()-interval '30 days' AND delivery_status IN ('sent','skipped','dead')");
        lastCleanup=Date.now();
      }
      if(recoveryMailConfigured()) {
        await transaction(db=>deliverRecoveryEmail(db,sendRecoveryEmail));
        await transaction(db=>deliverReservationEmail(db,sendReservationEmail));
        await transaction(db=>deliverContactEmail(db));
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
      await database().query("INSERT INTO worker_health(id,last_seen) VALUES('operations',now()) ON CONFLICT(id) DO UPDATE SET last_seen=now()");
      await report?.(true);
    } catch {process.stderr.write('Tarefa não concluída; nova tentativa no próximo ciclo.\n');await report?.(false);}
    // Telegram cannot block reservation/payment work or make readiness fail.
    for(const alerts of destinations){if(signal.aborted)break;try{await deliverAlerts(database(),alerts,telegramSender(alerts));}catch{process.stderr.write('Fila Telegram pendente; nova tentativa no próximo ciclo.\n');}}
    if(once||signal.aborted) break;
    try{await setTimeout(30000,undefined,{signal});}catch{break;}
  }while(!signal.aborted);
}finally{/* The caller owns the shared database pool. */}
}
