import{randomUUID}from'node:crypto';
import{database}from'./db';
import{telegramConfig}from'./telegram';
const command=process.argv[2];
if(!['status','test','reset'].includes(command)){
  console.log('Commands: status | test (queue a clearly marked integration test) | reset (resume after fixing Telegram access)');
}else{
  const db=database();
  try{
    if(command==='status'){
      console.log(JSON.stringify({configured:!!telegramConfig(),queue:(await db.query('SELECT delivery_status,count(*)::int AS count FROM alert_events GROUP BY delivery_status')).rows,channel:(await db.query('SELECT blocked_reason,last_success_at,next_attempt_at FROM alert_delivery_channels')).rows}));
    }else if(command==='test'){
      if(!telegramConfig())throw Error('Telegram configuration missing or invalid');
      const result=await db.query("INSERT INTO alert_events(kind,entity_type,entity_id,state) VALUES('system','system',$1,'test') RETURNING id",[randomUUID()]);
      console.log('Integration test queued: #'+result.rows[0].id+'. No reservation/payment created.');
    }else{
      await db.query("UPDATE alert_delivery_channels SET blocked_reason=NULL,next_attempt_at=now() WHERE id='telegram'");
      console.log('Telegram channel resumed. Exhausted events are not replayed automatically.');
    }
  }catch{console.error('Alert command failed. Check configuration/database; no credentials were logged.');process.exitCode=1;}
  finally{await db.end();}
}
