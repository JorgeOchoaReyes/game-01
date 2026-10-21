const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8174;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(400);
await pg.click('.big');await pg.waitForTimeout(300);
// show a strong fire after dumping + the fuel-priced upgrade dock
await pg.evaluate(()=>{const E=window.__EMBER;E.game.fuel=40;E.game.carry=6;E.game.banner=null;E.survivor.x=E.cfg.fireX-30;E.survivor.y=E.cfg.fireY+30;for(let i=0;i<6;i++)E.step(1/30);E.game.banner=null;});
await pg.waitForTimeout(150);await pg.screenshot({path:path.join(ROOT,'scripts/shots/E1-econ.png')});
await b.close();await new Promise(r=>s.close(r));console.log('done');})();
