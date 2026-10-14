'use strict';
(() => {
 let selectedDay=null;
 const model=window.KoreanProgressCore.create({library,storage:localStorage,onChange:()=>{render();document.dispatchEvent(new Event('korean-planchange'))}});
 const activeDay=()=>selectedDay||model.dayInfo().day,activeTasks=()=>model.tasks(activeDay());
 function btn(text,fn){const b=node('button','progress-button',text);b.type='button';b.onclick=fn;return b}
 function flag(label,id,field,value){const l=node('label'),i=document.createElement('input');i.type='checkbox';i.checked=value;i.setAttribute('aria-label',id+' '+label);i.onchange=()=>model.setRecord(id,field,i.checked);l.append(i,document.createTextNode(label));return l}
 function taskList(container,rows){container.replaceChildren();for(const a of rows){const r=model.record(a.id),card=node('article','plan-task'),head=node('div','plan-task-head');head.append(btn(a.title,()=>choose(a.id)),node('span',model.complete(a.id)?'已完成':a.level+'级','plan-task-state'));card.append(head);const controls=node('div','plan-task-flags');controls.append(flag('已听读',a.id,'listened',r.listened),flag('已练习',a.id,'practiced',r.practiced));card.append(controls);container.append(card)}}
 function readerStatus(){if(!DATA)return;const r=model.record(DATA.id);$('article-listened').checked=r.listened;$('article-practiced').checked=r.practiced;$('article-progress-state').textContent=model.complete(DATA.id)?'本篇已完成':'两项均完成后计入计划进度'}
 function render(){const s=model.stats(),d=model.dayInfo();$('korean-plan-storage-banner').textContent=model.error();$('plan-scope').value=String(model.snapshot().scope);$('plan-start').value=model.snapshot().startDate;$('plan-total').textContent=s.done+' / '+s.total+' 篇';$('plan-percent').textContent=s.percent+'%';$('plan-bar').value=s.done;$('plan-bar').max=s.total;$('plan-end').textContent=d.endDate;$('plan-summary').textContent=(d.started?(d.expired?'计划已到期':'今天是第 '+d.day+' / 21 天'):'计划尚未开始')+' · 已听读 '+s.listen+' 篇 · 已练习 '+s.practice+' 篇 · 还剩 '+s.remaining+' 篇';
  $('plan-days').replaceChildren();for(let n=1;n<=21;n++){const tasks=model.tasks(n),done=tasks.filter(a=>model.complete(a.id)).length,b=btn('第 '+n+' 天 · '+done+'/'+tasks.length,()=>{selectedDay=n;openDaily()});b.classList.toggle('selected',n===activeDay());b.classList.toggle('finished',tasks.length>0&&done===tasks.length);$('plan-days').append(b)}
  const tasks=activeTasks();$('plan-day-title').textContent='第 '+activeDay()+' 天的任务';taskList($('plan-task-list'),tasks);
  const priorIds=new Set(Array.from({length:Math.max(0,d.started?d.day-1:0)},(_,i)=>i+1).flatMap(day=>model.tasks(day).map(a=>a.id))),overdue=model.selected().filter(a=>priorIds.has(a.id)&&!model.complete(a.id));
  $('plan-overdue-count').textContent='未完成的前日内容：'+overdue.length+' 篇';taskList($('plan-overdue-list'),overdue);readerStatus();
  $('daily-plan-caption').textContent='第 '+activeDay()+' / 21 天 · 本日 '+tasks.length+' 篇 · 音频约 '+Math.round(tasks.reduce((sum,a)=>sum+(a.tracks[0]?.duration||0),0)/60)+' 分钟';$('daily-plan-total').textContent='已完成 '+s.done+' / '+s.total+' 篇';taskList($('daily-task-list'),tasks);$('daily-task-count').textContent=tasks.filter(a=>model.complete(a.id)).length+' / '+tasks.length+' 篇已完成';
 }
 function openDaily(){document.body.classList.remove('progress-view');$('progress-module').hidden=true;document.dispatchEvent(new Event('korean-open-daily'))}
 function openProgress(){stop();document.dispatchEvent(new Event('korean-show-progress'));$('reader').hidden=true;$('grammar-browser').hidden=true;$('daily-module').hidden=true;document.body.classList.remove('grammar-view');document.body.classList.add('progress-view');$('progress-module').hidden=false;document.body.classList.remove('nav-open');render();document.title='21天计划与进度 · 韩语点读';window.scrollTo(0,0)}
 const originalChoose=choose;choose=function(id){document.body.classList.remove('progress-view');$('progress-module').hidden=true;return originalChoose(id)};
 const originalRender=renderStudy;renderStudy=function(a){originalRender(a);readerStatus()};
 const originalGrammar=$('open-grammar').onclick;$('open-grammar').onclick=()=>{document.body.classList.remove('progress-view');$('progress-module').hidden=true;return originalGrammar()};
 $('open-progress').onclick=openProgress;$('daily-open-progress').onclick=openProgress;$('plan-open-daily').onclick=openDaily;$('plan-today').onclick=()=>{selectedDay=null;openDaily()};
 $('plan-settings').onsubmit=e=>{e.preventDefault();try{selectedDay=null;model.configure(Number($('plan-scope').value),$('plan-start').value);$('plan-message').textContent='计划已更新，已学记录继续保留。'}catch(err){$('plan-message').textContent=err.message}};
 $('article-listened').onchange=()=>model.setRecord(DATA.id,'listened',$('article-listened').checked);$('article-practiced').onchange=()=>model.setRecord(DATA.id,'practiced',$('article-practiced').checked);
 audio.addEventListener('ended',()=>{if(mode==='whole'&&DATA)model.setRecord(DATA.id,'listened',true)});
 $('plan-export').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(model.snapshot(),null,2)],{type:'application/json'}));a.href=url;a.download='korean-21-day-progress-'+window.KoreanDailyPlanner.dateKey()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 $('plan-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('备份超过1 MB');selectedDay=null;model.merge(JSON.parse(await file.text()));$('plan-message').textContent='计划与进度已导入，相同文章保留较新的记录。'}catch(err){$('plan-message').textContent='导入失败：'+err.message}finally{e.target.value=''}};
 window.addEventListener('storage',e=>{if(e.key===model.key&&e.newValue)try{selectedDay=null;model.replaceExternal(JSON.parse(e.newValue))}catch{}});
 window.KoreanProgress={model,activeDay,activeTasks,render,open:openProgress,openDaily};render();
})();
