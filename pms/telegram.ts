// Server only: never expose configuration or provider responses to clients/logs.
export type AlertDestination='operations'|'technical';
export type TelegramConfig={token:string;chatId:string;threadId?:number;from:Date;site:string;destination?:AlertDestination};
export type SendResult={ok:true}|{ok:false;code:'network'|'rate_limit'|'unauthorized'|'forbidden'|'group_migrated'|'invalid_request'|'provider';retryAfter?:number;permanent?:boolean};
export type TelegramSender=(text:string)=>Promise<SendResult>;

export function telegramConfig(env:NodeJS.ProcessEnv=process.env,destination:AlertDestination='operations'):TelegramConfig|null{
  if(env.TELEGRAM_ALERTS_ENABLED!=='true')return null;
  const token=env.TELEGRAM_BOT_TOKEN||'',chatId=(destination==='technical'?env.TELEGRAM_TECH_CHAT_ID:env.TELEGRAM_CHAT_ID)||'';
  if(destination==='technical'&&chatId===env.TELEGRAM_CHAT_ID)return null;
  const from=new Date(env.TELEGRAM_ALERTS_FROM||'');
  const topic=destination==='technical'?env.TELEGRAM_TECH_THREAD_ID:env.TELEGRAM_THREAD_ID;
  const threadId=topic?Number(topic):undefined;
  let site:URL;try{site=new URL(env.PUBLIC_SITE_URL||'');}catch{return null;}
  if(!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)||!/^-[1-9]\d{0,15}$/.test(chatId)||!Number.isSafeInteger(Number(chatId))||!Number.isFinite(from.getTime())||!/^https?:$/.test(site.protocol)||site.username||site.password||site.search||site.hash||(threadId!==undefined&&(!Number.isSafeInteger(threadId)||threadId<1)))return null;
  if(env.NODE_ENV==='production'&&site.protocol!=='https:')return null;
  return{token,chatId,threadId,from,site:site.origin,destination};
}

export function telegramSender(config:TelegramConfig,request:typeof fetch=fetch):TelegramSender{
  return async text=>{
    try{
      const response=await request(`https://api.telegram.org/bot${config.token}/sendMessage`,{
        method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(8000),
        body:JSON.stringify({chat_id:config.chatId,...(config.threadId?{message_thread_id:config.threadId}:{}),text,link_preview_options:{is_disabled:true},protect_content:true}),
      });
      const data=await response.json() as {ok?:boolean;error_code?:number;parameters?:{retry_after?:number;migrate_to_chat_id?:number}};
      if(response.ok&&data.ok===true)return{ok:true};
      if(data.parameters?.migrate_to_chat_id)return{ok:false,code:'group_migrated',permanent:true};
      const code=data.error_code||response.status;
      if(code===429)return{ok:false,code:'rate_limit',retryAfter:Math.max(30,Number.isFinite(data.parameters?.retry_after)?Number(data.parameters!.retry_after):60)};
      if(code===401)return{ok:false,code:'unauthorized',permanent:true};
      if(code===403)return{ok:false,code:'forbidden',permanent:true};
      if(code===400)return{ok:false,code:'invalid_request',permanent:true};
      return{ok:false,code:'provider'};
    }catch{return{ok:false,code:'network'};}
  };
}
