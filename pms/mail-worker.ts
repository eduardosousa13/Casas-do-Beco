import { setTimeout } from 'node:timers/promises';
import { database, transaction } from './db';
import { deliverRecoveryEmail, recoveryMailConfigured, sendRecoveryEmail } from './auth-email';
import { deliverReservationEmail,sendReservationEmail } from './reservation-email';
if (!recoveryMailConfigured()) throw new Error('Configure SMTP before starting the recovery email worker.');
let stopped=false;
process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
try {
  do {
    const processed=await transaction(db=>deliverRecoveryEmail(db,sendRecoveryEmail));
    const reservationProcessed=await transaction(db=>deliverReservationEmail(db,sendReservationEmail));
    if (process.argv.includes('--once')) break;
    if (!processed && !reservationProcessed && !stopped) await setTimeout(2000);
  } while(!stopped);
} catch { process.stderr.write('Recovery email worker failed. Check database and configuration.\n'); process.exitCode=1; }
finally { await database().end(); }
