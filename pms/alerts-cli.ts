import{randomUUID}from'node:crypto';
import{database}from'./db';
import{telegramConfig}from'./telegram';
const command=process.argv[2];
if(!['status','test','reset'].includes(command)){
  console.log('Commands: status | test operations|technical | reset operations|technical (after fixing access)');
}else{
  const db=database();
  try{
    if(command==='status'){
      console.log(JSON.stringify({configured:{operations:!!telegramConfig(),technical:!!telegramConfig(process.env,'technical')},queue:(await db.query('SELECT destination,delivery_status,count(*)::int AS count FROM alert_events GROUP BY destination,delivery_status')).rows,channel:(await db.query('SELECT id,blocked_reason,last_success_at,next_attempt_at FROM alert_delivery_channels')).rows}));
    }else{
      const destination=process.argv[3];if(destination!=='operations'&&destination!=='technical')throw Error('Select an explicit destination');
      if(command==='test'){
        if(!telegramConfig(process.env,destination))throw Error('Telegram configuration missing or invalid');
        const result=await db.query("INSERT INTO alert_events(kind,entity_type,entity_id,state,destination) VALUES('system','system',$1,'test',$2) RETURNING id",[randomUUID(),destination]);
        console.log('Integration test queued: #'+result.rows[0].id+' ('+destination+'). No reservation/payment created.');
      }else{
        await db.query('UPDATE alert_delivery_channels SET blocked_reason=NULL,next_attempt_at=now() WHERE id=$1',['telegram:'+destination]);
        console.log('Telegram channel resumed. Exhausted events are not replayed automatically.');
      }
    }
  }catch{console.error('Alert command failed. Check configuration/database; no credentials were logged.');process.exitCode=1;}
  finally{await db.end();}
}
