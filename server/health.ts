import type {Sql} from '../pms/core';
export async function readiness(db:Sql,workerRequired:boolean):Promise<Response>{
 try{
  const {rows}=await db.query(`SELECT EXISTS(SELECT 1 FROM pms_migrations WHERE version=14) AS migrated, EXISTS(SELECT 1 FROM worker_health WHERE id='operations' AND last_seen>now()-interval '2 minutes') AS worker`);
  const ok=rows[0]?.migrated===true&&(!workerRequired||rows[0]?.worker===true);
  return Response.json({ok},{status:ok?200:503,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({ok:false},{status:503,headers:{'Cache-Control':'no-store'}});}
}
