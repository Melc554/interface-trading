export function parisSlot(date=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(date).map(p=>[p.type,p.value]));
 return {day:`${parts.year}-${parts.month}-${parts.day}`,slot:['Sat','Sun'].includes(parts.weekday)?null:({'08':'08:00','15':'15:00'}[parts.hour]||null)};
}
export function extractDecisions(response,day){
 if(response.status!=='completed')throw Error('Analyse incomplète');
 const urls=new Set();let body='';let searched=false;
 for(const item of response.output||[]){
  if(item.type==='web_search_call'){searched=true;for(const s of item.action?.sources||[])if(s.url)urls.add(s.url)}
  for(const c of item.content||[]){if(c.type==='output_text')body+=c.text;for(const a of c.annotations||[])if(a.type==='url_citation')urls.add(a.url)}
 }
 if(!searched)throw Error('Recherche web absente');
 const result=JSON.parse(body);
 if(!Array.isArray(result.decisions)||!result.decisions.length||result.decisions.length>6)throw Error('Format invalide');
 return result.decisions.map(d=>{
  if(!['Attendre','Acheter','Vendre','Conserver','Réexaminer'].includes(d.action)||['asset','reason','risk'].some(k=>typeof d[k]!=='string'||!d[k].trim()||d[k].length>12000))throw Error('Décision invalide');
  if(!Array.isArray(d.sources)||!d.sources.length||d.sources.some(s=>!urls.has(s.url)||!/^https:\/\//.test(s.url)||typeof s.title!=='string'))throw Error('Sources non vérifiables');
  return {date:day,asset:d.asset,action:d.action,status:'À étudier',reason:d.reason,risk:d.risk,source:d.sources.map(s=>`${s.title} — ${s.url}`).join('\n'),sources:d.sources};
 });
}
export const schema={
  "type": "object",
  "additionalProperties": false,
  "required": [
    "decisions"
  ],
  "properties": {
    "decisions": {
      "type": "array",
      "minItems": 1,
      "maxItems": 6,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "asset",
          "action",
          "reason",
          "risk",
          "sources"
        ],
        "properties": {
          "asset": {
            "type": "string"
          },
          "action": {
            "type": "string",
            "enum": [
              "Attendre",
              "Acheter",
              "Vendre",
              "Conserver",
              "Réexaminer"
            ]
          },
          "reason": {
            "type": "string"
          },
          "risk": {
            "type": "string"
          },
          "sources": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "title",
                "url"
              ],
              "properties": {
                "title": {
                  "type": "string"
                },
                "url": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  }
};
