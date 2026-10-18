import { setTimeout } from 'node:timers/promises';
import { database, transaction } from './db';
import { deliverRecoveryEmail, recoveryMailConfigured, sendRecoveryEmail } from './auth-email';
import { deliverReservationEmail,sendReservationEmail } from './reservation-email';
import {deliverContactEmail} from './contact-email';
if (!recoveryMailConfigured()) throw new Error('Configure the email provider before starting the recovery email worker.');
let stopped=false;
process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
try {
  do {
    const processed=await transaction(db=>deliverRecoveryEmail(db,sendRecoveryEmail));
    const reservationProcessed=await transaction(db=>deliverReservationEmail(db,sendReservationEmail));
    const contactProcessed=await transaction(db=>deliverContactEmail(db));
    if (process.argv.includes('--once')) break;
    if (!processed && !reservationProcessed && !contactProcessed && !stopped) await setTimeout(2000);
  } while(!stopped);
} catch { process.stderr.write('Recovery email worker failed. Check database and configuration.\n'); process.exitCode=1; }
finally { await database().end(); }
