const http=require('http'),fs=require('fs'),path=require('path');const{chromium}=require('playwright');
const ROOT=path.join(__dirname,'..'),EXEC='/opt/pw-browsers/chromium-1194/chrome-linux/chrome',PORT=8172;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);if(!fs.existsSync(fp)){rs.writeHead(404);rs.end();return;}rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);});
(async()=>{await new Promise(r=>s.listen(PORT,r));
const b=await chromium.launch({executablePath:EXEC,args:['--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:440,height:820},deviceScaleFactor:2});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:'+PORT,{waitUntil:'load'});await pg.waitForTimeout(300);
await pg.click('.big');await pg.waitForTimeout(300);
const r=await pg.evaluate(()=>{const E=window.__EMBER;const out={};
  // TOOLBELT: permanent +2 carry
  const cap0=E.carryCap(); E.drops.length=0; E.survivor.x=E.cfg.fireX; E.survivor.y=E.cfg.fireY;
  E.drops.push({x:E.survivor.x,y:E.survivor.y,type:'toolbelt',life:13,bob:0});
  for(let i=0;i<3;i++)E.step(1/30);
  out.toolbelt = E.carryCap() - cap0;   // expect +2
  // CHAINSAW: one-shots a tree
  E.game.buffs={chainsaw:10}; E.game.carry=0;
  let t=E.trees[0]; t.wood=5; E.survivor.x=t.x-8; E.survivor.y=t.y+18; E.survivor.face=-1.2;
  const woodBefore=E.game.woodPopped; E.step(1/30);
  out.chainsawGrab = E.game.woodPopped - woodBefore;  // expect ~5 in one step
  return out;});
await pg.evaluate(()=>{const E=window.__EMBER;E.game.buffs={chainsaw:10};E.game.banner=null;let t=E.trees[1]||E.trees[0];E.survivor.x=t.x-10;E.survivor.y=t.y+18;E.survivor.face=-1.2;for(let i=0;i<2;i++)E.step(1/30);E.game.banner=null;});
await pg.waitForTimeout(120);await pg.screenshot({path:path.join(ROOT,'scripts/shots/G1-chainsaw.png')});
await b.close();await new Promise(x=>s.close(x));
console.log('toolbelt +carry:',r.toolbelt,'| chainsaw grab in 1 step:',r.chainsawGrab,'| errors:',errs.length);
})();
