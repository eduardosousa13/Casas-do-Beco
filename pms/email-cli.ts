import {randomUUID} from 'node:crypto';
import {deliverEmail,emailConfiguration} from '../server/email';

// Operator-only diagnostic. Never opens a database or creates a reservation.
const mode=process.argv[2]||'--status';
if(process.argv.length>3||!['--status','--test'].includes(mode)){
  process.stderr.write('Usage: email-cli [--status|--test]\n');process.exitCode=1;
}else if(mode==='--status'){
  const config=emailConfiguration();
  process.stdout.write(JSON.stringify({configured:!!config,provider:config?.provider||null})+'\n');
}else{
  try{
    const recipient=process.env.CONTACT_TO_EMAIL;
    if(!recipient)throw Error('Configure CONTACT_TO_EMAIL');
    await deliverEmail({to:recipient,subject:'Casas do Beco — TESTE de envio',text:'Teste técnico do serviço de email das Casas do Beco.\n\nConfirme a receção na caixa de entrada ou no spam.\nNão existe nenhuma reserva ou pagamento associado a este teste.',idempotencyKey:'diagnostic/'+randomUUID()});
    process.stdout.write('Provider accepted the test email. Confirm receipt in the configured contact inbox.\n');
  }catch{
    process.stderr.write('Email test failed. Check protected provider settings and sender-domain verification.\n');process.exitCode=1;
  }
}
