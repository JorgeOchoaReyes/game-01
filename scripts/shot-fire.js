const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8192;
const MIME={'.html':'text/html'};
const s=http.createServer((rq,rs)=>{let p=rq.url.split('?')[0];if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':'text/html'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));const b=await chromium.launch({executablePath:EXEC});const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'load'});await pg.click('.big');await pg.waitForTimeout(400);
// HIGH fuel + move survivor + spawn shades to show new art
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=100;E.survivor.x=E.cfg.fireX-70;E.survivor.y=E.cfg.fireY+40;E.survivor.face=0.4;E.survivor.moving=true;E.survivor.walk=1;E.game.carry=3;E.game.phase='night';for(let i=0;i<200;i++)E.step(1/30);E.game.fuel=100;});
await pg.waitForTimeout(300);await pg.screenshot({path:path.join(ROOT,'scripts/shots/13-hi-fuel.png')});
// LOW fuel — dying fire
await pg.evaluate(()=>{window.__EMBER.game.fuel=8;});await pg.waitForTimeout(400);
await pg.screenshot({path:path.join(ROOT,'scripts/shots/14-lo-fuel.png')});
await b.close();await new Promise(r=>s.close(r));console.log('fire shots done');})();
