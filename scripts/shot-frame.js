const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8173;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(400);
await pg.click('.big');await pg.waitForTimeout(300);
const info=await pg.evaluate(()=>{const E=window.__EMBER;E.game.banner=null;
  // move survivor to the far corner of the frame to prove reachability
  E.survivor.x=E.__b?0:E.survivor.x; return {bound: (function(){try{return JSON.stringify(window.__EMBER.bound||null)}catch(e){return null}})(), trees:E.trees.length};});
// place survivor at a top-corner tree if any
await pg.evaluate(()=>{const E=window.__EMBER;E.game.banner=null;let top=E.trees[0];for(const t of E.trees)if(t.y<top.y)top=t;E.survivor.x=top.x;E.survivor.y=top.y+10;for(let i=0;i<3;i++)E.step(1/30);});
await pg.waitForTimeout(150);await pg.screenshot({path:path.join(ROOT,'scripts/shots/F1-frame.png')});
console.log('trees:',info.trees);
await b.close();await new Promise(r=>s.close(r));})();
