import type { RouteHandler } from '../../types';
import { AccessError, checkOrigin, staffSession } from '../../../pms/auth';
import { database, transaction } from '../../../pms/db';
import { calendarData, financeData, operate, ownerRooms, previewStay, reservationDetail, reservationList, summaryData, csvCell } from '../../../pms/owner';
import { paymentServiceConfigured } from '../../../pms/payment-worker';
import { recoveryMailConfigured } from '../../../pms/auth-email';
import { apiError,json,readJson } from '../../../pms/http';
export const ALL:RouteHandler=async({request,url})=>{
  try {
    if(!['GET','POST'].includes(request.method)) return json(405,{error:'Método inválido.'});
    if(request.method==='POST') checkOrigin(request);
    const actor=await staffSession(request);
    if(request.method==='POST') {
      const body=await readJson(request,16000);
      if(!body || typeof body!=='object' || Array.isArray(body)) return json(400,{error:'Pedido inválido.'});
      const input=body as Record<string,unknown>;
      if(['balance','refund'].includes(String(input.action)) && !paymentServiceConfigured()) return json(503,{error:'Pagamentos indisponíveis. Contacte o suporte para ativar o serviço.'});
      return json(200,await transaction(db=>input.action==='preview'?previewStay(db,input):operate(db,actor.user.id,input)));
    }
    const mode=url.searchParams.get('view')||'summary',db=database();
    if(mode==='rooms') {const health=(await db.query("SELECT last_seen>now()-interval '2 minutes' AS active FROM worker_health WHERE id='operations'")).rows[0];return json(200,{rooms:await ownerRooms(db),services:{payments:paymentServiceConfigured(),email:recoveryMailConfigured(),worker:health?.active===true}});}
    if(mode==='detail') return json(200,await reservationDetail(db,url.searchParams.get('id')||''));
    if(mode==='calendar') return json(200,await calendarData(db,url.searchParams.get('month')||'',url.searchParams.get('house')||''));
    if(mode==='reservations') return json(200,await reservationList(db,url.searchParams));
    if(mode==='finance' || mode==='export') {
      const data=await financeData(db,url.searchParams.get('from')||'',url.searchParams.get('until')||'',url.searchParams.get('house')||'');
      if(mode==='export') {
        const rows=[['Referência','Titular','Casa','Quarto','Entrada','Saída','Estado','Contratado (cêntimos)','Recebido acumulado (cêntimos)','Por receber (cêntimos)'],...data.reservations.map(r=>[r.id,r.guest_name,r.house_name,r.room_name,r.check_in,r.check_out,r.status,r.total_cents,r.received_cents,r.balance_cents])];
        return new Response('\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="reservas.csv"','Cache-Control':'no-store'}});
      }
      return json(200,data);
    }
    if(mode==='summary') return json(200,await summaryData(db));
    return json(400,{error:'Vista inválida.'});
  }catch(error){if(error instanceof AccessError)return json(error.status,{error:error.message});return apiError(error);}
};
