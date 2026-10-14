'use strict';
window.KoreanDailyPlanner=(() => {
 function dayNumber(key){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(key);if(!m)throw Error('日期格式无效');const y=+m[1],month=+m[2]-1,d=+m[3],n=Date.UTC(y,month,d),check=new Date(n);if(check.getUTCFullYear()!==y||check.getUTCMonth()!==month||check.getUTCDate()!==d)throw Error('日期无效');return Math.floor(n/86400000)}
 function dateKey(date=new Date()){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')}
 const modulo=(n,len)=>((n%len)+len)%len;
 function takeRotating(rows,n,offset){if(!rows.length)return [];return Array.from({length:Math.min(n,rows.length)},(_,i)=>rows[modulo(offset+i,rows.length)])}
 function build({library,study,grammars,day,level,offset=0,articleId=null}){
  if(![3,4,5,6].includes(level)||!Number.isInteger(offset)||offset<0)throw Error('级别或篇目设置无效');
  const dayIndex=dayNumber(day)-dayNumber('2026-10-14');
  const all=library.filter(a=>a.level===level&&a.tracks?.length&&a.sentences?.length&&study[a.id]);
  const short=all.filter(a=>a.sentences.length>=3&&a.sentences.length<=30),pool=(short.length?short:all).slice().sort((a,b)=>a.id.localeCompare(b.id));
  if(!pool.length)throw Error('这个级别暂时没有可用的听读内容');
  const article=articleId?all.find(a=>a.id===articleId):pool[modulo(dayIndex+offset,pool.length)];if(!article)throw Error('计划中的文章暂不可用');const detail=study[article.id];
  let candidates=article.sentences.map((s,index)=>({index,...s})).filter(s=>s.korean.trim().length>=15&&s.chinese);
  if(candidates.length<3)candidates=article.sentences.map((s,index)=>({index,...s}));
  const sentences=takeRotating(candidates,3,modulo(dayIndex,candidates.length)).sort((a,b)=>a.index-b.index);
  const ownGrammar=(detail.grammar||[]).filter(g=>g.form&&g.form!=='-고'),fallback=grammars.filter(g=>g.entry_id?.startsWith('g'+level+'-')&&g.form&&g.form!=='-고');
  const grammar=takeRotating(ownGrammar.length?ownGrammar:fallback,1,dayIndex)[0]||null;
  const seen=new Set(),vocabulary=(detail.vocabulary||[]).filter(v=>{const k=v.korean?.trim();if(!k||seen.has(k))return false;seen.add(k);return true});
  return {day,level,article,sentences,grammar,grammarFromArticle:Boolean(ownGrammar.length),vocabulary:takeRotating(vocabulary,5,dayIndex),poolSize:pool.length};
 }
 return {dateKey,dayNumber,build};
})();
