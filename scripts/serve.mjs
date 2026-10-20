import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'publicacion');
const port=Number(process.env.PORT||4173);
const build=()=>execFileSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});
build();
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let target=path.resolve(base,'.'+pathname);
  if(!target.startsWith(base+path.sep)&&target!==base){res.writeHead(403);return res.end('Acceso no permitido');}
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  let status=200;if(!fs.existsSync(target)){target=path.join(base,'404.html');status=404;}
  res.writeHead(status,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  fs.createReadStream(target).pipe(res);
 }catch{res.writeHead(400);res.end('Solicitud inválida');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));
let timer;let building=false;
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(building)return;building=true;try{build()}catch(e){console.error('No se pudo reconstruir. Se conserva la última salida.')}finally{building=false}},300);}
for(const folder of ['manuscrito','lector','datos'])fs.watch(path.join(root,folder),{recursive:true},(_,name)=>{if(name&&!name.endsWith('build-report.json'))schedule()});
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
