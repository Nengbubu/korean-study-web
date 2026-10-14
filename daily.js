'use strict';
(() => {
 const planner=window.KoreanDailyPlanner,course=window.KoreanProgress,CHOICE='korean-daily-choice-v1';
 let dailyActive=false,internalChoose=false,plan=null,choice={key:'',offset:null};
 try{const parsed=JSON.parse(localStorage.getItem(CHOICE)||'null');if(parsed&&typeof parsed.key==='string'&&(parsed.offset===null||Number.isInteger(parsed.offset)))choice=parsed}catch{}
 function makePlan(){const day=planner.dateKey(),rows=course.activeTasks(),key=day+':'+course.model.snapshot().scope+':'+course.activeDay();if(choice.key!==key)choice={key,offset:null};const explicit=Number.isInteger(choice.offset)&&choice.offset>=0&&choice.offset<rows.length?rows[choice.offset]:null,article=explicit||rows.find(a=>!course.model.complete(a.id))||rows[0];if(!article)throw Error('今天没有安排文章');plan=planner.build({library,study,grammars,day,level:article.level,articleId:article.id});return plan}
 function button(label,fn,primary=false){const b=node('button',primary?'daily-button primary':'daily-button',label);b.type='button';b.onclick=fn;return b}
 function exitDaily(){dailyActive=false;$('daily-module').hidden=true;$('open-daily').classList.remove('selected');document.body.classList.remove('daily-view')}
 const originalChoose=choose;choose=function(id){if(!internalChoose)exitDaily();return originalChoose(id)};
 const originalRender=renderStudy;renderStudy=function(a){originalRender(a);if(dailyActive){$('reader').hidden=true;$('grammar-browser').hidden=true;document.body.classList.remove('grammar-view')}};
 const originalGrammar=$('open-grammar').onclick;$('open-grammar').onclick=()=>{exitDaily();return originalGrammar()};
 function preparePlayback(){if(DATA.id!==plan.article.id){internalChoose=true;try{choose(plan.article.id)}finally{internalChoose=false}}}
 async function listenSentence(index){preparePlayback();$('loop').checked=$('daily-repeat').checked;await playSentence(index);highlight()}
 function highlight(){for(const b of $('daily-sentences').querySelectorAll('button[data-index]'))b.classList.toggle('active',DATA?.id===plan?.article.id&&Number(b.dataset.index)===current)}
 audio.addEventListener('timeupdate',()=>{if(dailyActive&&plan)highlight()});
 function readArticle(memory=false){const id=plan.article.id;choose(id);if(memory)$('mode-memory').onclick();else jump('sentences')}
 function render(){
  const previous=plan?.article.id;makePlan();if(previous&&previous!==plan.article.id)stop();
  const date=new Date();$('daily-date').textContent=new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(date);
  $('daily-level-caption').textContent=plan.article.level+'级 · 从本日清单选一篇精练';$('daily-article-title').textContent=plan.article.title;
  $('daily-article-meta').textContent=plan.article.section+' · '+(plan.article.kind==='dialogue'?'对话':'文章')+' · 全文 '+plan.article.sentences.length+' 句';
  $('daily-topic').textContent=study[plan.article.id].topic?'今天的话题：'+study[plan.article.id].topic:'先听，再读，最后试着说出来。';
  $('daily-sentences').replaceChildren();
  for(const s of plan.sentences){const card=node('article','daily-sentence'),head=node('div','daily-sentence-head'),play=button('▶ 原文第 '+(s.index+1)+' 句',()=>listenSentence(s.index));play.dataset.index=String(s.index);head.append(play);const ko=node('p','daily-korean',s.korean);ko.lang='ko';card.append(head,ko,node('p','daily-chinese',s.chinese));const detail=study[plan.article.id].sentences[s.index];if(detail?.breakdown){const fold=node('details','daily-breakdown');fold.append(node('summary','','查看拆解'),node('p','',detail.breakdown.replace(/\*\*/g,'')));card.append(fold)}$('daily-sentences').append(card)}
  $('daily-sentences').classList.toggle('daily-hide-korean',$('daily-hide-korean').checked);
  $('daily-grammar').replaceChildren();if(plan.grammar){$('daily-grammar-origin').textContent=plan.grammarFromArticle?'本篇语法':'同级语法复习';$('daily-grammar').append(grammarCard(plan.grammar))}else{$('daily-grammar-origin').textContent='';$('daily-grammar').append(node('p','empty-note','今天可以先专注听读。'))}
  $('daily-vocabulary').replaceChildren();for(const v of plan.vocabulary){const row=node('tr'),ko=node('td','',v.korean);ko.lang='ko';row.append(ko,node('td','daily-vocab-meaning',v.chinese||''),node('td','daily-vocab-meaning',v.expression||''));$('daily-vocabulary').append(row)}
  $('daily-vocab-table').classList.toggle('daily-hide-meaning',$('daily-hide-meaning').checked);$('daily-vocabulary-count').textContent=plan.vocabulary.length+' 组词汇与搭配';highlight();
 }
 function showDaily(){stop();if($('mode-reading').onclick)$('mode-reading').onclick();dailyActive=true;document.body.classList.remove('grammar-view','progress-view');document.body.classList.add('daily-view');$('reader').hidden=true;$('grammar-browser').hidden=true;$('progress-module').hidden=true;$('daily-module').hidden=false;$('open-grammar').classList.remove('selected');$('open-daily').classList.add('selected');document.body.classList.remove('nav-open');course.render();render();$('status').textContent='今日精练 · 点击句子或整篇开始听';$('time').textContent='00:00 / '+time(plan.article.tracks[0]?.duration);document.title='每日学习 · 韩语点读';window.scrollTo(0,0)}
 $('open-daily').onclick=showDaily;
 $('daily-return').onclick=()=>{exitDaily();renderStudy(DATA);document.title=DATA.title+' · 韩语点读';window.scrollTo(0,0)};
 $('daily-swap').onclick=()=>{stop();const rows=course.activeTasks(),index=rows.findIndex(a=>a.id===plan.article.id);choice.offset=(index+1)%rows.length;render();try{localStorage.setItem(CHOICE,JSON.stringify(choice));$('daily-save-status').textContent=''}catch{$('daily-save-status').textContent='浏览器未能记住精练篇目。'}};
 $('daily-read').onclick=()=>readArticle(false);$('daily-memory').onclick=()=>readArticle(true);
 $('daily-whole').onclick=()=>{preparePlayback();start(0,true)};
 $('daily-hide-korean').onchange=()=>{$('daily-sentences').classList.toggle('daily-hide-korean',$('daily-hide-korean').checked)};
 $('daily-hide-meaning').onchange=()=>{$('daily-vocab-table').classList.toggle('daily-hide-meaning',$('daily-hide-meaning').checked)};
 $('daily-repeat').onchange=()=>{$('loop').checked=$('daily-repeat').checked};
 for(const id of ['play','previous','next','pause']){const original=$(id).onclick;$(id).onclick=()=>{if(dailyActive)preparePlayback();return original()}};
 document.addEventListener('korean-planchange',()=>{if(dailyActive)render()});document.addEventListener('korean-open-daily',showDaily);document.addEventListener('korean-show-progress',exitDaily);
 function checkNewDay(){if(dailyActive&&plan?.day!==planner.dateKey()){stop();course.render();render()}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNewDay()});window.addEventListener('focus',checkNewDay);const timer=setInterval(checkNewDay,60000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 showDaily();
})();
