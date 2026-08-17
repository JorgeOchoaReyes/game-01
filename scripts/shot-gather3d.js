const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8187;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(500);
await pg.click('.big');await pg.waitForTimeout(400);
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=85;E.game.carry=2;E.game.banner=null;
  let best=E.trees[0];for(const t of E.trees){if(Math.hypot(t.x-E.cfg.fireX,t.y-E.cfg.fireY)<Math.hypot(best.x-E.cfg.fireX,best.y-E.cfg.fireY))best=t;}
  E.survivor.x=best.x-6;E.survivor.y=best.y+22;E.survivor.face=-1.3;E.survivor.moving=false;best.chop=0.45;
  for(let i=0;i<3;i++)E.step(1/30);E.game.banner=null;best.chop=0.5;});
await pg.waitForTimeout(200);await pg.screenshot({path:path.join(ROOT,'scripts/shots/40-gather3d.png')});
await b.close();await new Promise(r=>s.close(r));console.log('done');})();
