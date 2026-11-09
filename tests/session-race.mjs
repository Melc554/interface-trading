import assert from 'node:assert/strict';
const originals={document:globalThis.document,sessionStorage:globalThis.sessionStorage,fetch:globalThis.fetch};
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{hidden:id==='workspace',value:'',textContent:'',innerHTML:'',replaceChildren(){},classList:{toggle(){}}});return elements.get(id)};
let resolveRead;
let stored=JSON.stringify({access_token:'test-only',refresh_token:'test-only',expires_at:Math.floor(Date.now()/1000)+3600});
globalThis.document={getElementById:element,querySelectorAll:()=>[],querySelector:()=>({classList:{toggle(){}}})};
globalThis.sessionStorage={getItem:()=>stored,setItem:(_,v)=>{stored=v},removeItem:()=>{stored=null}};
globalThis.fetch=async url=>url.endsWith('/logout')?{ok:true,status:204}:new Promise(resolve=>{resolveRead=resolve});
try{
 await import('../public/app.js');
 assert.equal(typeof resolveRead,'function','session restore starts a read');
 await element('logout').onclick();
 assert.equal(stored,null);
 resolveRead({ok:true,status:200,json:async()=>[{id:'test',kind:'valuation',data:{date:'2026-11-09',value:100}}]});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(element('workspace').hidden,true,'late response must not reopen private workspace');
 assert.equal(element('auth').hidden,false);
 assert.equal(element('sync').textContent,'Non connecté');
 console.log('PASS: logout discards late authenticated reads');
}finally{for(const [k,v] of Object.entries(originals)){if(v===undefined)delete globalThis[k];else globalThis[k]=v}}
