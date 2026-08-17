const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8186;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(500);
await pg.click('.big');await pg.waitForTimeout(400);
// HIGH fuel light
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=100;E.game.banner=null;for(let i=0;i<30;i++)E.step(1/30);E.game.fuel=100;});
await pg.waitForTimeout(200);await pg.screenshot({path:path.join(ROOT,'scripts/shots/50-light-hi.png')});
// LOW fuel light (dying)
await pg.evaluate(()=>{window.__EMBER.game.fuel=7;});await pg.waitForTimeout(500);
await pg.screenshot({path:path.join(ROOT,'scripts/shots/51-light-lo.png')});
// burning shades: place a couple just inside the radius
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=90;E.game.phase='night';E.game.phaseTime=20;
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;E.shades.push({x:E.cfg.fireX+Math.cos(a)*130,y:E.cfg.fireY+Math.sin(a)*130,r:12,hp:3,maxHp:5,spd:20,biteCd:0,wob:i,hitFlash:0});}
  for(let k=0;k<20;k++)E.step(1/30);E.game.fuel=90;});
await pg.waitForTimeout(200);await pg.screenshot({path:path.join(ROOT,'scripts/shots/52-burning.png')});
await b.close();await new Promise(r=>s.close(r));console.log('done');})();
