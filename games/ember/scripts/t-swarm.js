const http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8210;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=http.createServer((q,s)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fp.startsWith(ROOT)||!fs.existsSync(fp)){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'text/plain'});fs.createReadStream(fp).pipe(s);});
(async()=>{await new Promise(r=>server.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:'+PORT+'/index.html',{waitUntil:'load'});await pg.click('.big');await pg.waitForTimeout(150);
const res=await pg.evaluate(()=>{const E=window.__EMBER;
 function peak(night){E.game.night=night;E.game.phase='night';E.game.phaseTime=E.cfg.nightLen;E.game.nightSpawnAcc=0;E.shades.length=0;E.game.fuel=100;E.survivor.x=E.cfg.fireX;E.survivor.y=E.cfg.fireY;let mx=0;for(let k=0;k<300;k++){E.step(1/30);if(E.shades.length>mx)mx=E.shades.length;}return mx;}
 return {n1:peak(1),n2:peak(2),n3:peak(3),n5:peak(5)};});
await b.close();await new Promise(r=>server.close(r));
console.log('peak on-screen shades — night1:'+res.n1+' night2:'+res.n2+' night3:'+res.n3+' night5:'+res.n5,'| errors:',errs.length);
})();
