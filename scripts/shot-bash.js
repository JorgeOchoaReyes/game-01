const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8176;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(400);
await pg.click('.big');await pg.waitForTimeout(300);
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=60;E.game.phase='night';E.game.phaseTime=20;E.game.night=3;E.game.banner=null;E.game.warmth=100;
  // survivor out in the dark meeting shades away from the fire
  E.survivor.x=E.cfg.fireX+150;E.survivor.y=E.cfg.fireY-60;E.survivor.face=0.6;
  for(let i=0;i<3;i++){const a=0.6+(i-1)*0.5;E.shades.push({x:E.survivor.x+Math.cos(a)*30,y:E.survivor.y+Math.sin(a)*30,r:12,hp:30,maxHp:30,spd:6,biteCd:0,wob:i,hitFlash:0,kind:'shade',bite:4});}
  // step through a swing so a downstroke bash lands
  for(let k=0;k<10;k++)E.step(1/30);E.game.banner=null;});
await pg.waitForTimeout(120);await pg.screenshot({path:path.join(ROOT,'scripts/shots/C1-bash.png')});
await b.close();await new Promise(r=>s.close(r));console.log('done');})();
