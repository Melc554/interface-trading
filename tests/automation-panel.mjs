import assert from 'node:assert/strict';
const originals={document:globalThis.document,sessionStorage:globalThis.sessionStorage,fetch:globalThis.fetch};
try {
 let unavailable=false;
 {
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:id==='workspace',value:'',textContent:'',innerHTML:'',replaceChildren(){this.innerHTML=''},classList:{toggle(){}}});return elements.get(id)};
  globalThis.document={getElementById:element,querySelectorAll:()=>[],querySelector:()=>({classList:{toggle(){}}})};
  let stored=JSON.stringify({access_token:'test-only',refresh_token:'test-only',expires_at:Math.floor(Date.now()/1000)+3600});
  globalThis.sessionStorage={getItem:()=>stored,setItem:(_,v)=>{stored=v},removeItem:()=>{stored=null}};
  globalThis.fetch=async url=>{
   if(url.includes('/rpc/'))return unavailable?{ok:false,status:503}:{ok:true,status:200,json:async()=>[{enabled:true,monthly_limit_usd:6,accounted_usd:5,remaining_usd:1,budget_available:false,resets_on:'2026-12-01'}]};
   return {ok:true,status:200,json:async()=>url.includes('cap_analysis_runs')?[{id:'run',day:'2026-11-09',slot:'08:00',status:'completed'}]:[{id:'record',kind:'note',data:{title:'Private note',body:'Saved'}}]};
  };
  await import('../public/app.js');
  for(let i=0;i<20&&element('workspace').hidden;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(element('workspace').hidden,false,'analysis outage must not block journal access');
  let html=element('content').innerHTML;
  if(unavailable)assert.match(html,/État indisponible/);
  else {assert.match(html,/En pause · budget insuffisant/);assert.match(html,/Disponible/);assert.match(html,/Analyse enregistrée/)}
  unavailable=true;
  await element('refresh').onclick();
  assert.equal(element('workspace').hidden,false);
  assert.match(element('content').innerHTML,/État indisponible/);
  unavailable=false;
  await element('refresh').onclick();
  assert.match(element('content').innerHTML,/Analyse enregistrée/);
  element('demo').onclick();
  html=element('content').innerHTML;
  assert.match(html,/Aucune analyse payante/);
  assert.doesNotMatch(html,/Analyse enregistrée|Comptabilisé|2026-12-01/,'demo must never retain account analysis history or budget');
  await element('logout').onclick();
 }
 console.log('PASS: budget pause, analysis outage fallback and demo privacy isolation');
} finally {for(const [k,v] of Object.entries(originals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v}}
