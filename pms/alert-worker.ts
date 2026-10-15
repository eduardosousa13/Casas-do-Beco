import{createHash,randomUUID}from'node:crypto';
import type{Sql}from'./core';
import type{TelegramConfig,TelegramSender,SendResult}from'./telegram';

export type AlertEvent={id:string;kind:string;entity_type:string;entity_id:string;state:string;created_at:Date|string;attempts:number};
const allowed:Record<string,string[]>={reservation:['confirmed','changed','checked_in','checked_out','cancelled','payment_review'],payment:['paid','failed','refunded','partially_refunded','review'],payment_command:['succeeded','failed','review'],reservation_email:['failed'],auth_email:['failed','expired'],system:['test']};
const entities:Record<string,string>={reservation:'reservations',payment:'payments',payment_command:'payment_commands',reservation_email:'reservation_emails',auth_email:'auth_email_jobs',system:'system'};
const labels:Record<string,string>={reservation:'Reserva',payment:'Pagamento',payment_command:'Operação financeira',reservation_email:'Email',auth_email:'Email de acesso',system:'TESTE',confirmed:'confirmada',changed:'alterada — consultar gestão',checked_in:'check-in registado',checked_out:'check-out registado',cancelled:'cancelada',payment_review:'pagamento por verificar',paid:'recebido',failed:'falhou — verificar',expired:'expirou sem entrega',refunded:'reembolsado',partially_refunded:'reembolso parcial',review:'por verificar',succeeded:'concluída',test:'integração operacional; sem reserva ou cobrança real'};
export function alertEligible(event:AlertEvent){return entities[event.kind]===event.entity_type&&allowed[event.kind]?.includes(event.state)===true&&/^\d+$/.test(String(event.id))&&/^[a-f0-9-]{36}$/i.test(event.entity_id);}
export function alertMessage(events:AlertEvent[],site:string){
  const lines=events.map(e=>{
    const date=new Date(e.created_at).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',dateStyle:'short',timeStyle:'short'});
    return `• ${labels[e.kind]}: ${labels[e.state]}\n  Ref. ${e.entity_id} · evento #${e.id} · ${date}`;
  });
  return `[CASAS DO BECO · PRODUÇÃO]\n${lines.join('\n\n')}\n\nGestão: ${site}/admin\nDetalhes pessoais apenas na área autenticada.`;
}
function retryDelay(events:AlertEvent[],result:Exclude<SendResult,{ok:true}>){return Math.max(result.retryAfter||0,Math.min(3600,30*2**Math.min(7,Math.max(...events.map(e=>e.attempts))-1)));}

// Lease the channel and rows atomically; never hold an SQL transaction while
// calling Telegram. The channel lease also enforces rate limits across replicas.
export async function deliverAlerts(db:Sql,config:TelegramConfig,send:TelegramSender){
  const hash=createHash('sha256').update(JSON.stringify([config.token,config.chatId,config.threadId,config.from.toISOString()])).digest('hex');
  await db.query(`INSERT INTO alert_delivery_channels(id,config_hash) VALUES('telegram',$1)
    ON CONFLICT(id) DO UPDATE SET config_hash=excluded.config_hash,blocked_reason=NULL,next_attempt_at=now()
    WHERE alert_delivery_channels.config_hash<>excluded.config_hash AND (alert_delivery_channels.lease_until IS NULL OR alert_delivery_channels.lease_until<now())`,[hash]);
  const lease=randomUUID();
  const acquired=await db.query(`UPDATE alert_delivery_channels SET lease_token=$1,lease_until=now()+interval '2 minutes'
    WHERE id='telegram' AND config_hash=$2 AND blocked_reason IS NULL AND next_attempt_at<=now()
    AND (lease_until IS NULL OR lease_until<now()) RETURNING id`,[lease,hash]);
  if(!acquired.rows.length)return;
  let result:SendResult={ok:false,code:'network'},events:AlertEvent[]=[];
  try{
    // Explicit activation watermark: old history is never replayed on startup.
    await db.query(`UPDATE alert_events SET delivery_status='skipped',last_error_code='before_activation'
      WHERE delivery_status='pending' AND created_at<$1`,[config.from]);
    await db.query(`UPDATE alert_events SET delivery_status='dead',last_error_code=COALESCE(last_error_code,'attempts_exhausted'),lease_token=NULL,lease_until=NULL
      WHERE attempts>=8 AND (delivery_status='pending' OR (delivery_status='sending' AND lease_until<now()))`);
    const claimed=await db.query<AlertEvent>(`WITH batch AS (
      SELECT id FROM alert_events WHERE created_at>=$1 AND attempts<8 AND available_at<=now()
      AND (delivery_status='pending' OR (delivery_status='sending' AND lease_until<now()))
      ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED
    ) UPDATE alert_events e SET delivery_status='sending',lease_token=$2,lease_until=now()+interval '2 minutes',attempts=attempts+1
      FROM batch WHERE e.id=batch.id RETURNING e.*`,[config.from,lease]);
    const skipped=claimed.rows.filter(e=>!alertEligible(e));
    if(skipped.length)await db.query("UPDATE alert_events SET delivery_status='skipped',lease_token=NULL,lease_until=NULL,last_error_code='filtered' WHERE lease_token=$1 AND id=ANY($2::bigint[])",[lease,skipped.map(e=>e.id)]);
    events=claimed.rows.filter(alertEligible).sort((a,b)=>Number(a.id)-Number(b.id));
    if(!events.length){result={ok:true};return;}
    result=await send(alertMessage(events,config.site));
    if(result.ok===true){
      await db.query("UPDATE alert_events SET delivery_status='sent',delivered_at=now(),lease_token=NULL,lease_until=NULL,last_error_code=NULL WHERE lease_token=$1 AND delivery_status='sending'",[lease]);
    }else{
      const delay=retryDelay(events,result);
      await db.query(`UPDATE alert_events SET delivery_status=CASE WHEN attempts>=8 THEN 'dead' ELSE 'pending' END,
        available_at=now()+$2*interval '1 second',last_error_code=$3,lease_token=NULL,lease_until=NULL WHERE lease_token=$1 AND delivery_status='sending'`,[lease,delay,result.code]);
      if(result.permanent)process.stderr.write('Telegram suspenso: '+result.code+'. Verificar configuração e executar alerts reset.\n');
    }
  }finally{
    const delay=result.ok===true?30:retryDelay(events.length?events:[{attempts:1} as AlertEvent],result);
    await db.query(`UPDATE alert_delivery_channels SET lease_token=NULL,lease_until=NULL,next_attempt_at=now()+$2*interval '1 second',
      blocked_reason=$3,last_success_at=CASE WHEN $4 THEN now() ELSE last_success_at END WHERE id='telegram' AND lease_token=$1`,[lease,delay,result.ok===false&&result.permanent?result.code:null,result.ok&&events.length>0]);
  }
}

// Survives a database outage while this process is alive. No SQL, exception
// text, credentials or guest details are included. Full process outages still
// require an independent external monitor.
export function technicalAlerts(send:TelegramSender,site:string,now:()=>number=Date.now){
  let failures=0,notified=false,lastAttempt=0;
  return async(healthy:boolean)=>{
    if(healthy&&!notified){failures=0;return;}
    if(!healthy)failures++;
    if(!healthy&&failures<2)return;
    if(lastAttempt&&now()-lastAttempt<(healthy?30000:notified?1800000:60000))return;
    lastAttempt=now();
    const result=await send(`[CASAS DO BECO · PRODUÇÃO]\n${healthy?'RECUPERADO — o ciclo de operações voltou a funcionar.':'ALERTA TÉCNICO — o ciclo de operações/base de dados falhou repetidamente. Verificar Railway e /healthz.'}\n${site}/admin\nSem dados pessoais. Este aviso não substitui monitorização externa.`);
    if(result.ok===true){notified=!healthy;if(healthy){failures=0;lastAttempt=0;}}
  };
}
