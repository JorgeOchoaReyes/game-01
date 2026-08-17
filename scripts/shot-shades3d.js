const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8188;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(500);
await pg.click('.big');await pg.waitForTimeout(400);
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=70;E.game.phase='night';E.game.phaseTime=20;E.game.night=3;
  E.survivor.x=E.cfg.fireX+40;E.survivor.y=E.cfg.fireY+30;
  // hand-place a few shades at varied ranges
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;E.shades.push({x:E.cfg.fireX+Math.cos(a)*(120+i*15),y:E.cfg.fireY+Math.sin(a)*(120+i*15),r:12,hp:i%2?2:3,maxHp:3,spd:30,biteCd:0,wob:i,hitFlash:0});}
  for(let k=0;k<60;k++)E.step(1/30);E.game.fuel=70;E.game.phaseTime=18;});
await pg.waitForTimeout(400);await pg.screenshot({path:path.join(ROOT,'scripts/shots/34-shades3d.png')});
await b.close();await new Promise(r=>s.close(r));console.log('done');})();
