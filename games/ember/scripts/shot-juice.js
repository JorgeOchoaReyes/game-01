const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8177;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(400);
await pg.click('.big');await pg.waitForTimeout(300);
// DUMP: full pack, stand in bank ring, trigger auto-dump, capture wood flying
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=80;E.game.banner=null;E.game.carry=6;E.survivor.x=E.cfg.fireX-60;E.survivor.y=E.cfg.fireY+40;for(let i=0;i<3;i++)E.step(1/30);E.game.banner=null;});
await pg.waitForTimeout(120);await pg.screenshot({path:path.join(ROOT,'scripts/shots/B1-dump.png')});
// FELL: put survivor on a tree with wood=1 and chop it down, capture topple
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=80;E.game.carry=0;E.game.banner=null;
  let best=E.trees[0];for(const tr of E.trees){if(Math.hypot(tr.x-E.cfg.fireX,tr.y-E.cfg.fireY)<Math.hypot(best.x-E.cfg.fireX,best.y-E.cfg.fireY))best=tr;}
  best.wood=1;best.chop=0.6;E.survivor.x=best.x-8;E.survivor.y=best.y+20;E.survivor.face=-1.2;
  for(let i=0;i<6;i++)E.step(1/30);   // chop the last wood -> felling starts
  E.game.banner=null;});
await pg.waitForTimeout(120);await pg.screenshot({path:path.join(ROOT,'scripts/shots/B2-fell.png')});
await b.close();await new Promise(r=>s.close(r));console.log('done');})();
