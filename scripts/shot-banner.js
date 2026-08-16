const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8196;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=rq.url.split('?')[0];if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'text/plain'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));const b=await chromium.launch({executablePath:EXEC});const pg=await b.newPage({viewport:{width:420,height:820},deviceScaleFactor:2});
await pg.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'load'});await pg.click('.big');await pg.waitForTimeout(700);
await pg.screenshot({path:path.join(ROOT,'scripts/shots/8-banner.png')});
// force night start to catch NIGHT banner
await pg.evaluate(()=>{const g=window.__EMBER.game;g.phase='dawn';g.phaseTime=0.02;});await pg.waitForTimeout(400);
await pg.screenshot({path:path.join(ROOT,'scripts/shots/9-nightbanner.png')});
await b.close();await new Promise(r=>s.close(r));console.log('banner shots done');})();
