import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import Owner from './Owner';
import Activity from './Activity';
import Access from './Access';
import Recovery from './Recovery';
import { Logo } from '../site/Logo';
import './admin.css';
const data=JSON.parse(document.getElementById('admin-bootstrap')!.textContent!) as {page:string;userName:string;factorEnabled:boolean};
function Admin(){
 const {page,userName,factorEnabled}=data;
 if(['','calendar','reservations','finance'].includes(page))return <Owner userName={userName} page={(page||'summary') as 'summary'|'calendar'|'reservations'|'finance'}/>;
 if(page==='history'||page==='sessions')return <Activity userName={userName} page={page}/>;
 return <main className="access-layout"><a className="brand" href="/"><Logo titulo="Casas do Beco, Ladoeiro"/><small>Área de gestão</small></a>{page==='recover'||page==='reset-password'?<Recovery reset={page==='reset-password'}/>:<Access mode={page==='security'?'security':'login'} factorEnabled={factorEnabled}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Admin/></StrictMode>);
