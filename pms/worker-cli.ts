import {runWorker} from './worker';
import {database} from './db';
const stop=new AbortController();
process.on('SIGINT',()=>stop.abort());process.on('SIGTERM',()=>stop.abort());
try{await runWorker(stop.signal,process.argv.includes('--once'));}finally{await database().end();}
