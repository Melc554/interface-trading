const kinds=['decision','valuation','trade','note','event','settings','reference'];
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validate(kind,data){
 if(!kinds.includes(kind)||!object(data))throw Error('Type de donnée inconnu.');
 if(data.history!==undefined&&(!Array.isArray(data.history)||data.history.some(h=>!object(h)||typeof h.at!=='string'||typeof h.from!=='string'||typeof h.to!=='string')))throw Error('Historique invalide.');
 if(JSON.stringify(data).length>50000)throw Error('Entrée trop volumineuse.');
 if(!['reference','event','settings'].includes(kind)&&!validDate(data.date))throw Error('Date invalide.');
 if(data.date&&!validDate(data.date))throw Error('Date invalide.');
 for(const key of ['value','quantity','price','fees'])if(key in data&&(!Number.isFinite(data[key])||data[key]<0))throw Error('Montant invalide.');
 if(kind==='valuation'&&(!Number.isFinite(data.value)||data.value>1e9))throw Error('Valorisation invalide.');
 if(kind==='trade'&&(!(data.quantity>0)||!(data.price>0)||!['Achat','Vente'].includes(data.side)))throw Error('Transaction invalide.');
 const required={decision:['asset','reason','risk'],trade:['asset','currency'],note:['title','body'],event:['title'],settings:['body']}[kind]||[];
 if(required.some(k=>typeof data[k]!=='string'||!data[k].trim()))throw Error('Champs obligatoires manquants.');
 if(kind==='decision'&&(!['Attendre','Acheter','Vendre','Conserver','Réexaminer'].includes(data.action)||!['À étudier','Validée','Exécutée','Écartée'].includes(data.status)))throw Error('Décision invalide.');
 if(kind==='reference'&&(!Array.isArray(data.positions)||data.positions.some(p=>!object(p)||typeof p.name!=='string'||!Number.isFinite(p.valueEUR)||p.valueEUR<0)))throw Error('Positions invalides.');
 return data;
}
export function parseBackup(value){
 let rows;
 if(value.version===2&&Array.isArray(value.records))rows=value.records;
 else if(value.version===1&&object(value.settings)&&Array.isArray(value.trades)){
  rows=value.trades.map(t=>({kind:'trade',data:{...t,quantity:Number(t.quantity),price:Number(t.price),fees:Number(t.fees)}}));
  rows.push({kind:'settings',data:{body:JSON.stringify(value.settings,null,2)}});
  if(value.memo)rows.push({kind:'note',data:{date:(value.memoUpdated||new Date().toISOString()).slice(0,10),title:'Notes de l’ancienne interface',body:value.memo}});
  for(const e of value.events||[])rows.push({kind:'event',data:e});
  if(value.reference)rows.push({kind:'reference',data:value.reference});
 }else throw Error('Sauvegarde CAP v1 ou v2 attendue.');
 if(rows.length>5000)throw Error('Maximum 5 000 entrées par import.');
 return rows.map(r=>({kind:r.kind,data:validate(r.kind,r.data)}));
}
export function latestValuations(records){const map=new Map();for(const r of [...records].filter(r=>r.kind==='valuation').sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||'')))if(!map.has(r.data.date))map.set(r.data.date,r);return [...map.values()].sort((a,b)=>a.data.date.localeCompare(b.data.date));}
export function risk(p,q,s,t,h=null){if(![p,q,s,t].every(Number.isFinite)||p<=0||q<=0||s<=0||s>=100||t<=0||h!==null&&(!Number.isFinite(h)||h<p))throw Error('Valeurs invalides ; le plus haut doit être au moins égal au prix de référence.');return {stop:p*(1-s/100),target:p*(1+t/100),loss:p*q*s/100,ratio:t/s,trailing:h===null?null:h*(1-s/100)}}
