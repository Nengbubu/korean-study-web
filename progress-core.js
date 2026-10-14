'use strict';
window.KoreanProgressCore=(() => {
 const KEY='korean-21-day-plan-v1';
 function create({library,storage,now=()=>new Date(),onChange=()=>{}}){
  const ids=new Set(library.map(a=>a.id)),planner=window.KoreanDailyPlanner;
  let error='',state={schema:1,startDate:planner.dateKey(now()),scope:0,records:[]};
  function validate(raw){if(!raw||raw.schema!==1||![0,3,4,5,6].includes(raw.scope)||!Array.isArray(raw.records)||raw.records.length>library.length)throw Error('不是有效的21天学习备份');planner.dayNumber(raw.startDate);const records=raw.records.map(r=>{if(!ids.has(r.id)||typeof r.listened!=='boolean'||typeof r.practiced!=='boolean'||typeof r.updatedAt!=='string'||!Number.isFinite(Date.parse(r.updatedAt)))throw Error('备份中的文章或进度无效');return {id:r.id,listened:r.listened,practiced:r.practiced,updatedAt:new Date(r.updatedAt).toISOString()}});if(new Set(records.map(r=>r.id)).size!==records.length)throw Error('备份中存在重复文章');return {schema:1,startDate:raw.startDate,scope:raw.scope,records}}
  try{const saved=storage.getItem(KEY);if(saved)state=validate(JSON.parse(saved));else storage.setItem(KEY,JSON.stringify(state))}catch{error='无法读取或保存本机进度，请及时导出学习备份。'}
  function save(){try{storage.setItem(KEY,JSON.stringify(state));error=''}catch{error='浏览器未能保存进度，关闭页面前请导出备份。'}onChange()}
  const selected=()=>library.filter(a=>!state.scope||a.level===state.scope).slice().sort((a,b)=>a.level-b.level||a.id.localeCompare(b.id));
  const record=id=>state.records.find(r=>r.id===id)||{id,listened:false,practiced:false,updatedAt:''};
  const complete=id=>{const r=record(id);return r.listened&&r.practiced};
  function tasks(day){if(!Number.isInteger(day)||day<1||day>21)throw Error('计划天数应为1–21');const rows=selected();return rows.slice(Math.floor((day-1)*rows.length/21),Math.floor(day*rows.length/21))}
  function dayInfo(){const diff=planner.dayNumber(planner.dateKey(now()))-planner.dayNumber(state.startDate),endNumber=planner.dayNumber(state.startDate)+20,end=new Date(endNumber*86400000);return {day:Math.max(1,Math.min(21,diff+1)),started:diff>=0,expired:diff>=21,endDate:end.toISOString().slice(0,10)}}
  function stats(){const rows=selected(),done=rows.filter(a=>complete(a.id)).length;return {total:rows.length,done,remaining:rows.length-done,percent:rows.length?Math.round(done/rows.length*100):0,listen:rows.filter(a=>record(a.id).listened).length,practice:rows.filter(a=>record(a.id).practiced).length}}
  function configure(scope,startDate){if(![0,3,4,5,6].includes(scope))throw Error('请选择3–6级或其中一级');planner.dayNumber(startDate);state.scope=scope;state.startDate=startDate;save()}
  function setRecord(id,field,value){if(!ids.has(id)||!['listened','practiced'].includes(field)||typeof value!=='boolean')throw Error('进度设置无效');let row=state.records.find(r=>r.id===id);if(row&&row[field]===value)return;if(!row){row={id,listened:false,practiced:false,updatedAt:''};state.records.push(row)}row[field]=value;row.updatedAt=now().toISOString();save()}
  function merge(input){const incoming=validate(input);for(const row of incoming.records){const index=state.records.findIndex(r=>r.id===row.id);if(index<0)state.records.push(row);else if(row.updatedAt>state.records[index].updatedAt)state.records[index]=row}state.scope=incoming.scope;state.startDate=incoming.startDate;save()}
  function replaceExternal(raw){state=validate(raw);error='';onChange()}
  return {key:KEY,record,complete,tasks,selected,dayInfo,stats,configure,setRecord,merge,replaceExternal,snapshot:()=>JSON.parse(JSON.stringify(state)),error:()=>error};
 }
 return {create};
})();
