// ═══ MODULE: skills.js ═══
// ══ СКОЛЬЗЯЩИЙ ЦИКЛ ══════════════════════════════════════
// Паттерн: A-1-B-2-C-3-D-4 (буква физ, цифра умст, чередуются)
// Если букв/цифр больше 4 — цикл расширяется: A-1-B-2-C-3-D-4-E-1-A-2...
// Отдых назначается вручную через cycleOverrides

const CYCLE_WORKOUTS = [
  {key:'A', name:'Грудь + Трицепс + Пресс', color:'#378ADD', bg:'rgba(55,138,221,0.12)', exs:['Отжимания с рюкзаком (грудь) — 3–4×8–12','Отжимания узким хватом (трицепс) — 3×10–15','Скручивания на полу (пресс) — 2–3×15–20']},
  {key:'B', name:'Спина + Бицепс + Пресс', color:'#1D9E75', bg:'rgba(29,158,117,0.12)', exs:['Подтягивания средним хватом — 3–4×макс','Вис на турнике — 2×15–20 сек','Подъём согнутых ног лёжа (пресс) — 2–3×12–15']},
  {key:'C', name:'Плечи + Предплечья + Пресс', color:'#7F77DD', bg:'rgba(127,119,221,0.12)', exs:['Разведения в стороны (бутылки) — 3×15–20','Сгибание/разгибание кистей — 3×15–20','Планка — 2–3×20–30 сек']},
  {key:'D', name:'Ноги лёгкие + Пресс', color:'#BA7517', bg:'rgba(186,117,23,0.12)', exs:['Приседания с рюкзаком — 3–4×12–15','Ягодичный мост — 3×15–20','Подъёмы на носки — 3×15–20','Вакуум живота — 3×5–10 сек']},
];
const CYCLE_MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

let cycleStartDate = LS.g('cycleStartDate', '2026-04-07');
let cycleStartSlot = LS.g('cycleStartSlot', 0);
let cycleFirstWeekHeavy = LS.g('cycleFirstWeekHeavy', true);
let _cycleView = 'list';
let _cycleCalMonth = null;
// Временные слоты добавленные через + в модалке (до сохранения шаблона)
let _tempCycleLetters = [];
let _tempCycleDigits = [];
// Ручные переопределения: {dk: 'rest'|'A'|'B'|'1'|...}
let cycleOverrides = LS.g('cycleOverrides', {});

function _getCycleSlots(){
  const letters=['A','B','C','D'];
  const digits=['1','2','3','4'];
  (skillTemplates||[]).forEach(t=>{
    if(!t.cycleSlot)return;
    if(/^[A-Z]$/.test(t.cycleSlot)&&!letters.includes(t.cycleSlot))letters.push(t.cycleSlot);
    if(/^\d+$/.test(t.cycleSlot)&&!digits.includes(t.cycleSlot))digits.push(t.cycleSlot);
  });
  // Временные слоты из модалки (до сохранения шаблона)
  (_tempCycleLetters||[]).forEach(l=>{if(!letters.includes(l))letters.push(l);});
  (_tempCycleDigits||[]).forEach(d=>{if(!digits.includes(d))digits.push(d);});
  // Паттерн A-1-B-2-C-3-D-4-E-1-A-2...
  const maxLen=Math.max(letters.length,digits.length);
  const pattern=[];
  for(let i=0;i<maxLen;i++){pattern.push(letters[i%letters.length]);pattern.push(digits[i%digits.length]);}
  return {letters,digits,pattern};
}

function _dkFromStr(isoStr){const [y,m,d]=isoStr.split('-').map(Number);return `${y}-${m-1}-${d}`;}

function _cycleDayIndex(dkStr){
  const [sy,sm,sd]=cycleStartDate.split('-').map(Number);
  const start=new Date(sy,sm-1,sd);
  const parts=dkStr.split('-').map(Number);
  const d=new Date(parts[0],parts[1],parts[2]);
  const diff=Math.round((d-start)/86400000);
  const {pattern}=_getCycleSlots();
  return ((cycleStartSlot+diff)%pattern.length+pattern.length)%pattern.length;
}

function _cycleInfoForDate(dkStr){
  if(cycleOverrides[dkStr]==='rest')return null;
  if(cycleOverrides[dkStr])return _slotMeta(cycleOverrides[dkStr]);
  const {pattern}=_getCycleSlots();
  const idx=_cycleDayIndex(dkStr);
  return _slotMeta(pattern[idx]);
}

function _slotMeta(slotKey){
  if(!slotKey)return null;
  if(/^[A-Z]$/.test(slotKey)){
    const preset=CYCLE_WORKOUTS.find(w=>w.key===slotKey);
    const colors=['#378ADD','#1D9E75','#E86C3A','#C97DE8','#E8C23A','#E84A6C','#3AE8C2','#E8803A'];
    const bgs=['rgba(55,138,221,0.13)','rgba(29,158,117,0.13)','rgba(232,108,58,0.13)','rgba(201,125,232,0.13)','rgba(232,194,58,0.13)','rgba(232,74,108,0.13)','rgba(58,232,194,0.13)','rgba(232,128,58,0.13)'];
    const ci=['A','B','C','D','E','F','G','H'].indexOf(slotKey);
    const color=preset?preset.color:(colors[ci%colors.length]||'#888');
    const bg=preset?preset.bg:(bgs[ci%bgs.length]||'rgba(128,128,128,0.12)');
    return {key:slotKey,name:preset?preset.name:'Тренировка '+slotKey,color,bg,exs:preset?preset.exs:[],type:'physical'};
  }
  if(/^\d+$/.test(slotKey)){
    const numColors=['#A78BFA','#F472B6','#34D399','#FBBF24','#60A5FA','#F87171'];
    const numBgs=['rgba(167,139,250,0.13)','rgba(244,114,182,0.13)','rgba(52,211,153,0.13)','rgba(251,191,36,0.13)','rgba(96,165,250,0.13)','rgba(248,113,113,0.13)'];
    const ci=(parseInt(slotKey)-1)%numColors.length;
    return {key:slotKey,name:'Умственная '+slotKey,color:numColors[ci],bg:numBgs[ci],exs:[],type:'mental'};
  }
  return null;
}

function _getWeekIntensity(dateStr){
  // cycleStartDate stored as YYYY-MM-DD (1-indexed month), subtract 1
  const [sy,sm,sd]=cycleStartDate.split('-').map(Number);
  const start=new Date(sy,sm-1,sd);
  // dateStr comes from dk() which uses getMonth() (0-indexed), use as-is
  const parts=dateStr.split('-').map(Number);
  const d=new Date(parts[0],parts[1],parts[2]);
  // Normalize both to Monday so all days Mon-Sun share the same weekNum
  const toMonday=(dt)=>{const day=dt.getDay();const m=new Date(dt);m.setDate(dt.getDate()-(day===0?6:day-1));return m;};
  const weekNum=Math.round((toMonday(d)-toMonday(start))/(7*24*60*60*1000));
  const isEven=weekNum%2===0;
  return (isEven===cycleFirstWeekHeavy)?'heavy':'light';
}

function _intensityBadge(dateStr,slotType){
  if(slotType!=='physical')return '';
  const intensity=_getWeekIntensity(dateStr);
  const isHeavy=intensity==='heavy';
  return `<div title="${isHeavy?'тяжёлая неделя':'лёгкая неделя'}" style="font-family:var(--mono);font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;flex-shrink:0;background:${isHeavy?'rgba(232,108,58,0.12)':'rgba(45,212,191,0.08)'};border:0.5px solid ${isHeavy?'rgba(232,108,58,0.35)':'rgba(45,212,191,0.25)'};color:${isHeavy?'#E86C3A':'#2dd4bf'}">${isHeavy?'▲ тяж':'▽ лёгк'}</div>`;
}

function skillsSetWeekIntensity(val){
  // Сохраняем старый textarea, подгружаем новый
  const prev=document.getElementById('skillsModalWeekIntensity').value||'none';
  const ta=document.getElementById('skillsModalEx');
  if(ta)_modalEx[prev]=ta.value;
  document.getElementById('skillsModalWeekIntensity').value=val;
  if(ta)ta.value=_modalEx[val]||'';
  const ids={heavy:'skillsIntensityHeavy',light:'skillsIntensityLight',none:'skillsIntensityNone'};
  const activeColors={heavy:{border:'rgba(232,108,58,0.5)',bg:'rgba(232,108,58,0.12)',color:'#E86C3A'},light:{border:'rgba(45,212,191,0.4)',bg:'rgba(45,212,191,0.08)',color:'#2dd4bf'},none:{border:'var(--ab)',bg:'var(--a2)',color:'var(--a)'}};
  Object.keys(ids).forEach(k=>{
    const el=document.getElementById(ids[k]);if(!el)return;
    if(k===val){el.style.borderColor=activeColors[k].border;el.style.background=activeColors[k].bg;el.style.color=activeColors[k].color;}
    else{el.style.borderColor='var(--bd)';el.style.background='var(--c2)';el.style.color='var(--t2)';}
  });
}
function _updateIntensityRowVisibility(){
  const row=document.getElementById('skillsIntensityRow');if(!row)return;
  const type=document.getElementById('skillsModalType').value;
  const slot=document.getElementById('skillsModalCycleSlot').value;
  row.style.display=(type==='physical'&&slot)?'block':'none';
}
// Возвращает true если в слоте есть И тяж И лёгк упражнения
function _slotHasIntensityPair(slotKey){
  if(!slotKey)return false;
  const tpls=skillTemplates.filter(t=>t.cycleSlot===slotKey);
  // Новый формат: один шаблон с обоими exercisesHeavy+exercisesLight
  if(tpls.some(t=>t.exercisesHeavy&&t.exercisesHeavy.length&&t.exercisesLight&&t.exercisesLight.length))return true;
  // Старый формат: два отдельных шаблона
  return tpls.some(t=>t.weekIntensity==='heavy')&&tpls.some(t=>t.weekIntensity==='light');
}
// Возвращает шаблоны для слота с учётом текущей недели (тяж/лёгк)
function _getVisibleTplsForSlot(slotKey, dateStr){
  const all=skillTemplates.filter(t=>t.cycleSlot===slotKey);
  const wType=_getWeekIntensity(dateStr); // 'heavy' | 'light'
  // Новый формат: один шаблон с exercisesHeavy+exercisesLight
  const newFmt=all.find(t=>t.exercisesHeavy&&t.exercisesHeavy.length&&t.exercisesLight&&t.exercisesLight.length);
  if(newFmt){
    const exs=wType==='heavy'?newFmt.exercisesHeavy:newFmt.exercisesLight;
    return [{...newFmt,exercises:exs}];
  }
  // Старый формат: два отдельных шаблона
  if(_slotHasIntensityPair(slotKey)){
    const matched=all.filter(t=>t.weekIntensity===wType);
    return matched.length?matched:all.filter(t=>!t.weekIntensity||t.weekIntensity==='none');
  }
  return all;
}

function syncWeekDaysFromCycle(){
  if(!skillTemplates||!skillTemplates.length)return;
  // Сброс weekDays у всех навыков у которых есть cycleSlot
  skillTemplates.forEach(t=>{if(t.cycleSlot)t.weekDays=[];});
  // Проходим по ближайшим 14 дням (2 недели) и назначаем дни по слоту
  const today=new Date();
  for(let i=0;i<14;i++){
    const d=new Date(today);d.setDate(today.getDate()+i);
    const ds=dk(d);
    const dow=(d.getDay()+6)%7; // 0=Пн...6=Вс
    const w=_cycleInfoForDate(ds);
    if(!w)continue;
    skillTemplates.forEach(t=>{
      if(!t.cycleSlot||t.cycleSlot!==w.key)return;
      if(!Array.isArray(t.weekDays))t.weekDays=[];
      if(!t.weekDays.includes(dow))t.weekDays.push(dow);
    });
  }
  LS.s('sportTemplates',skillTemplates);
}

function cycleResetToday(){
  const n=new Date();
  cycleStartDate=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
  cycleStartSlot=0;
  LS.s('cycleStartDate',cycleStartDate);LS.s('cycleStartSlot',cycleStartSlot);
  syncWeekDaysFromCycle();
  renderCycleBlock();renderSkills();flash('Цикл сброшен — сегодня слот A');
}

function cycleSetDayOverride(dkStr,val){
  if(val==='auto'){delete cycleOverrides[dkStr];}else{cycleOverrides[dkStr]=val;}
  LS.s('cycleOverrides',cycleOverrides);
  syncWeekDaysFromCycle();
  renderCycleBlock();renderSkills();
  if(_cycleView==='cal')renderCycleCal();
}

function cycleOpenDayMenu(dkStr,e){
  e&&e.stopPropagation();
  const existing=document.getElementById('cycleDayMenu');
  if(existing){existing.remove();if(existing.dataset.dk===dkStr)return;}
  const {pattern}=_getCycleSlots();
  const current=cycleOverrides[dkStr]||'auto';
  const menu=document.createElement('div');
  menu.id='cycleDayMenu';menu.dataset.dk=dkStr;
  menu.style.cssText='position:fixed;z-index:300;background:var(--c1);border:1px solid var(--bd);border-radius:10px;padding:6px;min-width:160px;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
  if(e){
    const t=e.currentTarget?e.currentTarget.getBoundingClientRect():e.target.getBoundingClientRect();
    menu.style.top=(t.bottom+4)+'px';menu.style.left=Math.min(t.left,window.innerWidth-180)+'px';
  } else {menu.style.top='50%';menu.style.left='50%';menu.style.transform='translate(-50%,-50%)';}
  const opts=[{val:'rest',label:'😌 отдых'},{val:'auto',label:'↺ авто'},...pattern.map(k=>{const m=_slotMeta(k);return{val:k,label:(m?m.key+' — '+m.name:k)};})];
  menu.innerHTML=opts.map(o=>{
    const isActive=o.val===current;
    return `<div onclick="cycleSetDayOverride('${dkStr}','${o.val}');document.getElementById('cycleDayMenu').remove()" style="padding:7px 10px;border-radius:7px;cursor:pointer;font-family:var(--mono);font-size:11px;background:${isActive?'var(--a2)':'transparent'};color:${isActive?'var(--a)':'var(--t2)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${o.label}</div>`;
  }).join('');
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',function h(){menu.remove();document.removeEventListener('click',h);},{once:true}),50);
}

function cycleSetView(v){
  _cycleView=v;
  document.getElementById('cycle-list-view').style.display=v==='list'?'block':'none';
  document.getElementById('cycle-cal-view').style.display=v==='cal'?'block':'none';
  document.getElementById('cycle-tab-list').style.cssText=v==='list'?'background:var(--a2);border-color:var(--ab);color:var(--a)':'';;
  document.getElementById('cycle-tab-cal').style.cssText=v==='cal'?'background:var(--a2);border-color:var(--ab);color:var(--a)':'';;
  if(v==='cal')renderCycleCal();
}

function cycleCalPrev(){if(!_cycleCalMonth)return;_cycleCalMonth.m--;if(_cycleCalMonth.m<0){_cycleCalMonth.m=11;_cycleCalMonth.y--;}renderCycleCal();}
function cycleCalNext(){if(!_cycleCalMonth)return;_cycleCalMonth.m++;if(_cycleCalMonth.m>11){_cycleCalMonth.m=0;_cycleCalMonth.y++;}renderCycleCal();}

function renderCycleCal(){
  const today=nowDK();
  if(!_cycleCalMonth){const n=new Date();_cycleCalMonth={y:n.getFullYear(),m:n.getMonth()};}
  const{y,m}=_cycleCalMonth;
  document.getElementById('cycle-cal-title').textContent=CYCLE_MONTHS_RU[m]+' '+y;
  const firstDay=new Date(y,m,1);const lastDay=new Date(y,m+1,0);
  const startDow=(firstDay.getDay()+6)%7;
  const grid=document.getElementById('cycle-cal-grid');
  let cells='';
  for(let i=0;i<startDow;i++)cells+='<div></div>';
  for(let d=1;d<=lastDay.getDate();d++){
    const ds=dk(new Date(y,m,d));const w=_cycleInfoForDate(ds);const isToday=ds===today;
    const hasOverride=cycleOverrides[ds]!==undefined;
    const borderStyle=isToday?'1.5px solid var(--a)':'1px solid var(--bd)';
    const overrideDot=hasOverride?'<div style="position:absolute;top:2px;right:2px;width:4px;height:4px;border-radius:50%;background:var(--amber)"></div>':'';;
    if(w){
      const hasPair=_slotHasIntensityPair(w.key)&&w.type==='physical';
      const intens=hasPair?_getWeekIntensity(ds):null;
      const calBadge=intens?`<div style="font-family:var(--mono);font-size:7px;font-weight:700;color:${intens==='heavy'?'#E86C3A':'#2dd4bf'};margin-top:1px">${intens==='heavy'?'▲тяж':'▽лёгк'}</div>`:'';
      cells+=`<div onclick="cycleOpenDayMenu('${ds}',event)" style="position:relative;border-radius:6px;padding:4px 2px;border:${borderStyle};background:${w.bg};text-align:center;cursor:pointer">${overrideDot}<div style="font-family:var(--mono);font-size:8px;color:var(--t3)">${d}</div><div style="font-family:var(--mono);font-size:10px;color:${w.color};font-weight:500">${w.key}</div>${calBadge}</div>`;
    }else{
      cells+=`<div onclick="cycleOpenDayMenu('${ds}',event)" style="position:relative;border-radius:6px;padding:4px 2px;border:${borderStyle};background:${isToday?'var(--c3)':'var(--c2)'};text-align:center;cursor:pointer">${overrideDot}<div style="font-family:var(--mono);font-size:8px;color:var(--t3)">${d}</div><div style="font-size:8px;color:var(--t3)">—</div></div>`;
    }
  }
  grid.innerHTML=cells;
}

function renderCycleBlock(){
  const today=nowDK();const todayW=_cycleInfoForDate(today);
  const todayCard=document.getElementById('cycle-today-card');
  if(todayCard){
    if(todayW){
      const userTpls=_getVisibleTplsForSlot(todayW.key, today);
      const _todayTpl=userTpls.length?userTpls[0]:null;
      const _todayTplName=(_todayTpl&&_todayTpl.name)?_todayTpl.name:'';
      if(!_todayTplName){todayCard.innerHTML='';}else{
      const userExsHtml=userTpls.length
        ?userTpls.map(tpl=>`<div style="margin-top:6px"><div style="font-family:var(--mono);font-size:8px;color:${todayW.color};letter-spacing:.5px;margin-bottom:3px">${tpl.name}</div>${tpl.exercises.map(e=>`<div style="display:flex;gap:7px;align-items:flex-start;font-size:12px;color:var(--t2)"><span style="color:${todayW.color};margin-top:1px">▸</span>${e}</div>`).join('')}</div>`).join('')
        :todayW.exs.map(e=>`<div style="display:flex;gap:7px;align-items:flex-start;font-size:12px;color:var(--t2)"><span style="color:${todayW.color};margin-top:1px">▸</span>${e}</div>`).join('');
      const typeLabel=todayW.type==='mental'?'УМСТВЕННАЯ':'ТРЕНИРОВКА';
      const _todaySlotHasIntensity=_slotHasIntensityPair(todayW.key);
      const intensityBadge=_todaySlotHasIntensity?_intensityBadge(today,todayW.type):'';
      todayCard.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:36px;height:36px;border-radius:9px;background:${todayW.bg};border:1.5px solid ${todayW.color};display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-family:var(--hd);font-size:22px;color:${todayW.color}">${todayW.key}</span></div><div style="flex:1"><div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;margin-bottom:2px">СЕГОДНЯ — ${typeLabel}</div><div style="display:flex;align-items:center;gap:6px"><div style="font-size:14px;font-weight:500">${_todayTplName}</div>${intensityBadge}</div></div><button onclick="cycleOpenDayMenu('${today}',event)" title="Изменить" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t3);font-size:13px;padding:4px 8px;cursor:pointer;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div><div style="display:flex;flex-direction:column;gap:4px">${userExsHtml}</div>`;
      }
    }else{
      todayCard.innerHTML=`<div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:9px;background:var(--c2);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:18px">😌</span></div><div style="flex:1"><div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;margin-bottom:2px">СЕГОДНЯ</div><div style="font-size:14px;font-weight:500">День отдыха</div></div><button onclick="cycleOpenDayMenu('${today}',event)" title="Изменить" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t3);font-size:13px;padding:4px 8px;cursor:pointer;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div>`;
    }
  }
  const listEl=document.getElementById('cycle-list');
  if(listEl){
    let rows='';
    for(let i=0;i<14;i++){
      const d=new Date();d.setDate(d.getDate()+i);
      const ds=dk(d);
      const dow=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(d.getDay()+6)%7];
      const dayNum=d.getDate()+' '+['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][d.getMonth()];
      const w=_cycleInfoForDate(ds);const isToday=i===0;
      const hasOverride=cycleOverrides[ds]!==undefined;
      let rightHtml='';
      if(w){
        const userTpls=_getVisibleTplsForSlot(w.key, ds);
        const filledTpls=userTpls.filter(t=>t.exercises&&t.exercises.length>0);
        const namesStr=filledTpls.length?filledTpls.map(t=>t.name).join(', '):'';
        const _daySlotHasIntensity=_slotHasIntensityPair(w.key);
        const intBadge=_daySlotHasIntensity?_intensityBadge(ds,w.type):'';
        rightHtml=`<div style="font-family:var(--mono);font-size:10px;font-weight:500;padding:2px 7px;border-radius:5px;border:1px solid ${w.color}44;background:${w.bg};color:${w.color};flex-shrink:0">${w.key}</div>${intBadge}<div style="font-size:12px;color:var(--t2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${namesStr}</div>`;
      }else{
        rightHtml='<div style="font-size:11px;color:var(--t3);flex:1">отдых</div>';
      }
      rows+=`<div onclick="cycleOpenDayMenu('${ds}',event)" style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--bd)${i===13?';border-bottom:none':''};opacity:${isToday?'1':'0.75'};cursor:pointer"><div style="font-family:var(--mono);font-size:9px;color:${isToday?'var(--a)':'var(--t3)'};min-width:24px;text-align:right">${dow}</div><div style="font-family:var(--mono);font-size:9px;color:var(--t3);min-width:38px">${dayNum}</div>${rightHtml}${hasOverride?'<div style="width:5px;height:5px;border-radius:50%;background:var(--amber);flex-shrink:0"></div>':''}</div>`;
    }
    listEl.innerHTML=rows;
  }
  if(_cycleView==='cal')renderCycleCal();
}

// ══ SKILLS ══════════════════════════════════════════════
const SKILLS_WDAYS=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
let _skillsModalFiles=[];
let _modalEx={heavy:'',light:'',none:''};

const CYCLE_SLOT_META=new Proxy({},{get(target,key){const m=_slotMeta(key);return m?{color:m.color,bg:m.bg}:{color:'var(--t2)',bg:'var(--c2)'}}});

function skillsModalSelectSlot(s){
  _renderModalSlotButtons(s);
  document.getElementById('skillsModalCycleSlot').value=s;
  const row=document.getElementById('skillsCycleSetupRow');
  if(row)row.style.display=s?'block':'none';
  if(s)renderSkillsCycleSetup(s);
  _updateIntensityRowVisibility();
}

function _canRemoveLetterSlot(k){
  // Базовые A-D нельзя убрать
  if(['A','B','C','D'].includes(k))return false;
  // Можно убрать если нет сохранённых шаблонов с этим слотом
  return !(skillTemplates||[]).some(t=>t.cycleSlot===k);
}
function _canRemoveDigitSlot(k){
  if(['1','2','3','4'].includes(k))return false;
  return !(skillTemplates||[]).some(t=>t.cycleSlot===k);
}
function _removeCycleLetterSlot(letter,e){
  e.stopPropagation();
  _tempCycleLetters=_tempCycleLetters.filter(l=>l!==letter);
  // Убрать из переопределений цикла если там есть
  Object.keys(cycleOverrides).forEach(dkKey=>{if(cycleOverrides[dkKey]===letter)delete cycleOverrides[dkKey];});
  LS.s('cycleOverrides',cycleOverrides);
  const cur=document.getElementById('skillsModalCycleSlot').value;
  skillsModalSelectSlot(cur===letter?'':cur);
}
function _removeCycleDigitSlot(digit,e){
  e.stopPropagation();
  _tempCycleDigits=_tempCycleDigits.filter(d=>d!==digit);
  Object.keys(cycleOverrides).forEach(dkKey=>{if(cycleOverrides[dkKey]===digit)delete cycleOverrides[dkKey];});
  LS.s('cycleOverrides',cycleOverrides);
  const cur=document.getElementById('skillsModalCycleSlot').value;
  skillsModalSelectDigitSlot(cur===digit?'':cur);
}

function _renderModalSlotButtons(activeSlot){
  const wrap=document.getElementById('skillsModalSlotWrap');if(!wrap)return;
  const{letters}=_getCycleSlots();
  let html=letters.map(k=>{
    const m=_slotMeta(k);const isActive=k===activeSlot;const canRm=_canRemoveLetterSlot(k);
    const rmBtn=canRm?`<span onclick="_removeCycleLetterSlot('${k}',event)" style="position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:var(--c3);color:var(--t3);font-size:9px;line-height:14px;text-align:center;display:none;cursor:pointer;z-index:1">✕</span>`:'';
    return `<div id="skillsModalSlot${k}" onclick="skillsModalSelectSlot('${k}')" onmouseenter="this.querySelector('span')&&(this.querySelector('span').style.display='block')" onmouseleave="this.querySelector('span')&&(this.querySelector('span').style.display='none')" style="position:relative;flex:1;min-width:30px;text-align:center;padding:10px 0;border-radius:var(--rm);border:1px solid ${isActive?(m?m.color+'88':'var(--ab)'):'var(--bd)'};background:${isActive?(m?m.bg:'var(--a2)'):'var(--c2)'};font-family:var(--mono);font-size:15px;color:${isActive?(m?m.color:'var(--a)'):'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">${rmBtn}${k}</div>`;
  }).join('');
  // Next letter button
  const nextLetter=String.fromCharCode(65+letters.length);
  if(letters.length<8){
    html+=`<div onclick="_addCycleLetterSlot('${nextLetter}')" title="Добавить слот ${nextLetter}" style="flex:0 0 auto;min-width:32px;text-align:center;padding:10px 6px;border-radius:var(--rm);border:1px dashed var(--bd);background:transparent;font-family:var(--mono);font-size:13px;color:var(--t3);cursor:pointer;user-select:none;transition:.12s">+</div>`;
  }
  html+=`<div id="skillsModalSlotNone" onclick="skillsModalSelectSlot('')" style="flex:1;min-width:30px;text-align:center;padding:10px 0;border-radius:var(--rm);border:1px solid ${activeSlot===''?'var(--ab)':'var(--bd)'};background:${activeSlot===''?'var(--a2)':'var(--c2)'};font-family:var(--mono);font-size:11px;color:${activeSlot===''?'var(--a)':'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">нет</div>`;
  wrap.innerHTML=html;
}

function _renderModalDigitButtons(activeSlot){
  const wrap=document.getElementById('skillsModalDigitWrap');if(!wrap)return;
  const{digits}=_getCycleSlots();
  let html=digits.map(k=>{
    const m=_slotMeta(k);const isActive=k===activeSlot;const canRm=_canRemoveDigitSlot(k);
    const rmBtn=canRm?`<span onclick="_removeCycleDigitSlot('${k}',event)" style="position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:var(--c3);color:var(--t3);font-size:9px;line-height:14px;text-align:center;display:none;cursor:pointer;z-index:1">✕</span>`:'';
    return `<div onclick="skillsModalSelectDigitSlot('${k}')" onmouseenter="this.querySelector('span')&&(this.querySelector('span').style.display='block')" onmouseleave="this.querySelector('span')&&(this.querySelector('span').style.display='none')" style="position:relative;flex:1;min-width:30px;text-align:center;padding:10px 0;border-radius:var(--rm);border:1px solid ${isActive?(m?m.color+'88':'var(--ab)'):'var(--bd)'};background:${isActive?(m?m.bg:'var(--a2)'):'var(--c2)'};font-family:var(--mono);font-size:15px;color:${isActive?(m?m.color:'var(--a)'):'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">${rmBtn}${k}</div>`;
  }).join('');
  // Next digit button
  const nextDigit=String(digits.length+1);
  if(digits.length<8){
    html+=`<div onclick="_addCycleDigitSlot('${nextDigit}')" title="Добавить слот ${nextDigit}" style="flex:0 0 auto;min-width:32px;text-align:center;padding:10px 6px;border-radius:var(--rm);border:1px dashed var(--bd);background:transparent;font-family:var(--mono);font-size:13px;color:var(--t3);cursor:pointer;user-select:none;transition:.12s">+</div>`;
  }
  html+=`<div onclick="skillsModalSelectDigitSlot('')" style="flex:1;min-width:30px;text-align:center;padding:10px 0;border-radius:var(--rm);border:1px solid ${activeSlot===''?'var(--ab)':'var(--bd)'};background:${activeSlot===''?'var(--a2)':'var(--c2)'};font-family:var(--mono);font-size:11px;color:${activeSlot===''?'var(--a)':'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">нет</div>`;
  wrap.innerHTML=html;
}

function _addCycleLetterSlot(letter){
  if(!_tempCycleLetters.includes(letter))_tempCycleLetters.push(letter);
  skillsModalSelectSlot(letter);
}
function _addCycleDigitSlot(digit){
  if(!_tempCycleDigits.includes(digit))_tempCycleDigits.push(digit);
  skillsModalSelectDigitSlot(digit);
}

function skillsModalSelectDigitSlot(s){
  document.getElementById('skillsModalCycleSlot').value=s;
  _renderModalDigitButtons(s);
  const row=document.getElementById('skillsCycleSetupRow');if(row)row.style.display=s?'block':'none';
  if(s)renderSkillsCycleSetupDigit(s);
}

let _cycleSetupWday=null,_cycleSetupSlot=null;

function renderSkillsCycleSetup(preSlot){
  _cycleSetupSlot=preSlot||null;_cycleSetupWday=null;
  const wdayWrap=document.getElementById('skillsCycleWdayPicker');
  if(wdayWrap)wdayWrap.innerHTML=SKILLS_WDAYS.map((d,i)=>`<div onclick="skillsCyclePickWday(${i})" id="scw${i}" style="flex:1;min-width:0;text-align:center;padding:7px 2px;border-radius:7px;border:1px solid var(--bd);background:var(--c2);font-family:var(--mono);font-size:10px;color:var(--t2);cursor:pointer;user-select:none;transition:.12s">${d}</div>`).join('');
  const slotWrap=document.getElementById('skillsCycleSlotPicker');
  if(slotWrap){
    const{letters}=_getCycleSlots();
    slotWrap.innerHTML=letters.map(s=>{const m=_slotMeta(s);const active=s===preSlot;return `<div onclick="skillsCyclePickSlot('${s}')" id="scs${s}" style="width:36px;text-align:center;padding:7px 0;border-radius:7px;border:1px solid ${active?(m?m.color+'88':'var(--ab)'):'var(--bd)'};background:${active?(m?m.bg:'var(--a2)'):'var(--c2)'};font-family:var(--mono);font-size:13px;color:${active?(m?m.color:'var(--a)'):'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">${s}</div>`;}).join('');
  }
  if(preSlot)_cycleSetupSlot=preSlot;
  // Sync first-week toggle to current saved value
  const fwEl=document.getElementById('cycleFirstWeekToggle');
  if(fwEl){
    const isH=cycleFirstWeekHeavy;
    fwEl.dataset.val=isH?'heavy':'light';
    const hw=document.getElementById('cfwHeavy');const lw=document.getElementById('cfwLight');
    if(hw){hw.style.background=isH?'rgba(232,108,58,0.12)':'var(--c2)';hw.style.borderColor=isH?'rgba(232,108,58,0.5)':'var(--bd)';hw.style.color=isH?'#E86C3A':'var(--t2)';}
    if(lw){lw.style.background=isH?'var(--c2)':'rgba(45,212,191,0.08)';lw.style.borderColor=isH?'var(--bd)':'rgba(45,212,191,0.4)';lw.style.color=isH?'var(--t2)':'#2dd4bf';}
  }
  updateSkillsCyclePreview();
}

function renderSkillsCycleSetupDigit(preSlot){
  _cycleSetupSlot=preSlot||null;_cycleSetupWday=null;
  const wdayWrap=document.getElementById('skillsCycleWdayPicker');
  if(wdayWrap)wdayWrap.innerHTML=SKILLS_WDAYS.map((d,i)=>`<div onclick="skillsCyclePickWday(${i})" id="scw${i}" style="flex:1;min-width:0;text-align:center;padding:7px 2px;border-radius:7px;border:1px solid var(--bd);background:var(--c2);font-family:var(--mono);font-size:10px;color:var(--t2);cursor:pointer;user-select:none;transition:.12s">${d}</div>`).join('');
  const slotWrap=document.getElementById('skillsCycleSlotPicker');
  if(slotWrap){
    const{digits}=_getCycleSlots();
    slotWrap.innerHTML=digits.map(s=>{const m=_slotMeta(s);const active=s===preSlot;return `<div onclick="skillsCyclePickSlotDigit('${s}')" id="scsd${s}" style="width:36px;text-align:center;padding:7px 0;border-radius:7px;border:1px solid ${active?(m?m.color+'88':'var(--ab)'):'var(--bd)'};background:${active?(m?m.bg:'var(--a2)'):'var(--c2)'};font-family:var(--mono);font-size:13px;color:${active?(m?m.color:'var(--a)'):'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">${s}</div>`;}).join('');
  }
  if(preSlot)_cycleSetupSlot=preSlot;
  // Sync first-week toggle to current saved value
  const fwElD=document.getElementById('cycleFirstWeekToggle');
  if(fwElD){
    const isH=cycleFirstWeekHeavy;
    fwElD.dataset.val=isH?'heavy':'light';
    const hw=document.getElementById('cfwHeavy');const lw=document.getElementById('cfwLight');
    if(hw){hw.style.background=isH?'rgba(232,108,58,0.12)':'var(--c2)';hw.style.borderColor=isH?'rgba(232,108,58,0.5)':'var(--bd)';hw.style.color=isH?'#E86C3A':'var(--t2)';}
    if(lw){lw.style.background=isH?'var(--c2)':'rgba(45,212,191,0.08)';lw.style.borderColor=isH?'var(--bd)':'rgba(45,212,191,0.4)';lw.style.color=isH?'var(--t2)':'#2dd4bf';}
  }
  updateSkillsCyclePreviewDigit();
}

function skillsCyclePickSlotDigit(s){
  _cycleSetupSlot=s;
  const{digits}=_getCycleSlots();
  digits.forEach(k=>{const el=document.getElementById('scsd'+k);if(!el)return;const on=k===s;const m=_slotMeta(k);el.style.background=on?(m?m.bg:'var(--a2)'):'var(--c2)';el.style.borderColor=on?(m?m.color+'88':'var(--ab)'):'var(--bd)';el.style.color=on?(m?m.color:'var(--a)'):'var(--t2)';});
  updateSkillsCyclePreviewDigit();
}

function updateSkillsCyclePreviewDigit(){
  const el=document.getElementById('skillsCyclePreview');if(!el)return;
  if(_cycleSetupWday===null||!_cycleSetupSlot){el.textContent='← выбери день и номер';el.style.color='var(--t3)';return;}
  const{pattern}=_getCycleSlots();
  const startIdx=pattern.indexOf(_cycleSetupSlot);
  const preview=[];let si=startIdx<0?0:startIdx;let wi=_cycleSetupWday;
  for(let step=0;step<Math.min(pattern.length,7);step++){const m=_slotMeta(pattern[si%pattern.length]);preview.push(SKILLS_WDAYS[wi%7]+'='+(m?m.key:'?'));si++;wi++;}
  el.textContent=preview.join('  ');el.style.color='var(--a)';
}

function skillsCyclePickWday(i){
  _cycleSetupWday=i;
  SKILLS_WDAYS.forEach((_,j)=>{const el=document.getElementById('scw'+j);if(!el)return;const on=j===i;el.style.background=on?'var(--a2)':'var(--c2)';el.style.borderColor=on?'var(--ab)':'var(--bd)';el.style.color=on?'var(--a)':'var(--t2)';});
  const t=document.getElementById('skillsModalType');
  if(t&&t.value==='mental')updateSkillsCyclePreviewDigit();else updateSkillsCyclePreview();
}

function skillsCyclePickSlot(s){
  _cycleSetupSlot=s;
  const{letters}=_getCycleSlots();
  letters.forEach(k=>{const el=document.getElementById('scs'+k);if(!el)return;const on=k===s;const m=_slotMeta(k);el.style.background=on?(m?m.bg:'var(--a2)'):'var(--c2)';el.style.borderColor=on?(m?m.color+'88':'var(--ab)'):'var(--bd)';el.style.color=on?(m?m.color:'var(--a)'):'var(--t2)';});
  updateSkillsCyclePreview();
}

function updateSkillsCyclePreview(){
  const el=document.getElementById('skillsCyclePreview');if(!el)return;
  if(_cycleSetupWday===null||!_cycleSetupSlot){el.textContent='← выбери день и букву';el.style.color='var(--t3)';return;}
  const{pattern}=_getCycleSlots();
  const startIdx=pattern.indexOf(_cycleSetupSlot);
  const preview=[];let si=startIdx<0?0:startIdx;let wi=_cycleSetupWday;
  for(let step=0;step<Math.min(pattern.length,7);step++){const m=_slotMeta(pattern[si%pattern.length]);preview.push(SKILLS_WDAYS[wi%7]+'='+(m?m.key:'?'));si++;wi++;}
  el.textContent=preview.join('  ');el.style.color='var(--a)';
}

function applySkillsCycleSetup(){
  if(_cycleSetupWday===null||!_cycleSetupSlot){flash('Выбери день недели и букву');return;}
  const today=new Date();const todayDow=(today.getDay()+6)%7;
  let diff=(_cycleSetupWday-todayDow+7)%7;
  const target=new Date(today);target.setDate(today.getDate()+diff);
  const{pattern}=_getCycleSlots();const slotIdx=pattern.indexOf(_cycleSetupSlot);
  cycleStartDate=target.getFullYear()+'-'+String(target.getMonth()+1).padStart(2,'0')+'-'+String(target.getDate()).padStart(2,'0');
  cycleStartSlot=slotIdx<0?0:slotIdx;
  const fwEl=document.getElementById('cycleFirstWeekToggle');
  if(fwEl)cycleFirstWeekHeavy=fwEl.dataset.val==='heavy';
  LS.s('cycleStartDate',cycleStartDate);LS.s('cycleStartSlot',cycleStartSlot);LS.s('cycleFirstWeekHeavy',cycleFirstWeekHeavy);
  syncWeekDaysFromCycle();
  flash(`✓ Цикл: ${SKILLS_WDAYS[_cycleSetupWday]} = ${_cycleSetupSlot}`);
  renderCycleBlock();
  renderSkills();
}

let _savedLetterSlot=''; // сохраняем букву при переключении типа

function skillsSelectType(type){
  document.getElementById('skillsModalType').value=type;
  const phys=document.getElementById('skillsTypePhysical');const ment=document.getElementById('skillsTypeMental');
  if(!phys||!ment)return;
  const lw=document.getElementById('skillsSlotLettersRow');const dw=document.getElementById('skillsSlotDigitsRow');
  const exLabel=document.getElementById('skillsModalExLabel');const exInp=document.getElementById('skillsModalEx');
  if(type==='physical'){
    phys.style.border='1px solid var(--ab)';phys.style.background='var(--a2)';phys.style.color='var(--a)';
    ment.style.border='1px solid var(--bd)';ment.style.background='var(--c2)';ment.style.color='var(--t2)';
    if(lw)lw.style.display='';if(dw)dw.style.display='none';
    const cr=document.getElementById('skillsCycleSetupRow');if(cr)cr.style.display='none';
    // Восстанавливаем сохранённую букву (если была)
    skillsModalSelectSlot(_savedLetterSlot||'');
    if(exLabel)exLabel.textContent='Упражнения (через запятую или нумерованным списком)';
    if(exInp)exInp.placeholder='Жим, Разводка, Трицепс...\nили:\n1) Жим\n2) Разводка\n3) Трицепс';
  }else{
    // Сохраняем текущую букву перед переходом на умственный
    const curSlot=document.getElementById('skillsModalCycleSlot').value;
    if(/^[A-Z]$/.test(curSlot))_savedLetterSlot=curSlot;
    ment.style.border='1px solid var(--ab)';ment.style.background='var(--a2)';ment.style.color='var(--a)';
    phys.style.border='1px solid var(--bd)';phys.style.background='var(--c2)';phys.style.color='var(--t2)';
    if(lw)lw.style.display='none';if(dw)dw.style.display='';
    const cr=document.getElementById('skillsCycleSetupRow');if(cr)cr.style.display='none';
    const ir=document.getElementById('skillsIntensityRow');if(ir)ir.style.display='none';
    skillsModalSelectDigitSlot('');
    if(exLabel)exLabel.textContent='Шаги / подзадачи (через запятую или нумерованным списком)';
    if(exInp)exInp.placeholder='Прочитать главу 1, сделать конспект, повторить...\nили:\n1) Прочитать главу\n2) Конспект\n3) Повторение';
  }
}

function openSkillsModal(editId){const skb=document.getElementById('skillsDelBtn');if(skb)skb.style.display=editId?'':'none';
  _skillsModalFiles=[];_cycleSetupWday=null;_cycleSetupSlot=null;
  _tempCycleLetters=[];_tempCycleDigits=[];_savedLetterSlot='';
  _modalEx={heavy:'',light:'',none:''};
  document.getElementById('skillsModalId').value=editId||'';
  document.getElementById('skillsModalTitle').textContent=editId?'редактировать шаблон':'новый шаблон';
  document.getElementById('skillsModalName').value='';
  document.getElementById('skillsModalEx').value='';
  document.getElementById('skillsModalPreviews').innerHTML='';
  document.getElementById('skillsModalFiles').value='';
  _renderModalSlotButtons('');_renderModalDigitButtons('');
  skillsSelectType('physical');
  if(editId){
    const t=skillTemplates.find(x=>x.id===+editId);
    if(t){
      document.getElementById('skillsModalName').value=t.name||'';
      // Загружаем упражнения во все 3 слота
      function _toStr(arr){if(!arr||!arr.length)return '';return /^\d+[.)]/.test(arr[0])?arr.join('\n'):arr.join(', ');}
      _modalEx.heavy=_toStr(t.exercisesHeavy||[]);
      _modalEx.light=_toStr(t.exercisesLight||[]);
      _modalEx.none=_toStr(t.exercisesNone||(t.weekIntensity==='none'||!t.weekIntensity?t.exercises||[]:[]) );
      // Если старый формат — кладём exercises в нужный слот
      if(!t.exercisesHeavy&&!t.exercisesLight&&!t.exercisesNone){
        const wi=t.weekIntensity||'none';
        _modalEx[wi]=_toStr(t.exercises||[]);
      }
      const _wi=t.weekIntensity||'none';
      document.getElementById('skillsModalEx').value=_modalEx[_wi]||'';
      _skillsModalFiles=(t.media||[]).map(m=>({...m}));renderSkillsModalPreviews();
      skillsSelectType(t.skillType||'physical');
      if(t.skillType==='mental'){skillsModalSelectDigitSlot(t.cycleSlot||'');}
      else{_savedLetterSlot=t.cycleSlot||'';skillsModalSelectSlot(t.cycleSlot||'');}
      skillsSetWeekIntensity(t.weekIntensity||'none');
    }
  }
  openModal('skillsModal');
}
function closeSkillsModal(){_tempCycleLetters=[];_tempCycleDigits=[];closeModal('skillsModal');}
function onSkillsModalFiles(inp){
  Array.from(inp.files).forEach(f=>{const r=new FileReader();r.onload=e=>{_skillsModalFiles.push({dataUrl:e.target.result,type:f.type.startsWith('video')?'video':'image',name:f.name});renderSkillsModalPreviews();};r.readAsDataURL(f);});inp.value='';
}
function renderSkillsModalPreviews(){
  const wrap=document.getElementById('skillsModalPreviews');if(!wrap)return;wrap.innerHTML='';
  _skillsModalFiles.forEach((m,i)=>{
    const box=document.createElement('div');box.style.cssText='position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--bd);background:var(--c2);flex-shrink:0';
    box.innerHTML=m.type==='video'?`<video src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(0,0,0,0.35)">▶</div>`:`<img src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover">`;
    const del=document.createElement('button');del.style.cssText='position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);border:none;color:#fff;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:10px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0';del.textContent='✕';del.onclick=()=>{_skillsModalFiles.splice(i,1);renderSkillsModalPreviews();};box.appendChild(del);wrap.appendChild(box);
  });
}
function _parseExStr(raw){if(!raw||!raw.trim())return [];const r=raw.trim();if(/\d+[.)]\s/.test(r))return r.split(/\n/).map(s=>s.trim()).filter(Boolean);return r.split(',').map(s=>s.trim()).filter(Boolean);}
function confirmSkillsModal(){
  const name=document.getElementById('skillsModalName').value.trim();
  if(!name){flash('Заполни название');return;}
  // Сохраняем текущий textarea в _modalEx перед сбором данных
  const curI=document.getElementById('skillsModalWeekIntensity').value||'none';
  const ta=document.getElementById('skillsModalEx');if(ta)_modalEx[curI]=ta.value;
  // Парсим все три варианта
  const exercisesHeavy=_parseExStr(_modalEx.heavy);
  const exercisesLight=_parseExStr(_modalEx.light);
  const exercisesNone=_parseExStr(_modalEx.none);
  // exercises для совместимости — берём активный вариант (или heavy если есть)
  const exercises=exercisesHeavy.length?exercisesHeavy:exercisesLight.length?exercisesLight:exercisesNone;
  const editId=document.getElementById('skillsModalId').value;
  const cycleSlot=document.getElementById('skillsModalCycleSlot').value;
  const skillType=document.getElementById('skillsModalType').value||'physical';
  const weekIntensity=curI;
  const media=_skillsModalFiles.map(m=>({dataUrl:m.dataUrl,type:m.type,name:m.name}));
  if(editId){const t=skillTemplates.find(x=>x.id===+editId);if(t){t.name=name;t.exercises=exercises;t.exercisesHeavy=exercisesHeavy;t.exercisesLight=exercisesLight;t.exercisesNone=exercisesNone;t.media=media;t.cycleSlot=cycleSlot;t.skillType=skillType;t.weekIntensity=weekIntensity;}}
  else{skillTemplates.push({id:nid++,name,exercises,exercisesHeavy,exercisesLight,exercisesNone,media,cycleSlot,skillType,weekIntensity,created:nowDK(),days:[]});LS.s('nid',nid);}
  syncWeekDaysFromCycle();LS.s('sportTemplates',skillTemplates);_tempCycleLetters=[];_tempCycleDigits=[];closeSkillsModal();syncSkillsToToday();renderSkills();renderCycleBlock();
}

function delSkillsTemplate(id) { deleteItem(skillTemplates, 'sportTemplates', id, renderSkills); }
let skillsDayPanels={};
function toggleSkillsDay(tplId,dayIdx){const t=skillTemplates.find(x=>x.id===tplId);if(!t)return;if(!Array.isArray(t.weekDays))t.weekDays=[];const i=t.weekDays.indexOf(dayIdx);if(i>=0)t.weekDays.splice(i,1);else t.weekDays.push(dayIdx);LS.s('sportTemplates',skillTemplates);renderSkills();if(curPage==='week')buildWeek();}
function toggleSkillsDayPanel(tplId){skillsDayPanels[tplId]=!skillsDayPanels[tplId];renderSkills();}

function syncSkillsToToday(){
  // навыки теперь отображаются через шаблонный вид карточки, не через tasks
  LS.s('sportTemplates',skillTemplates);
}

function sdmToggle(i){const sel=window._sdmSelected||(window._sdmSelected=[]);const idx=sel.indexOf(i);if(idx>=0)sel.splice(idx,1);else sel.push(i);document.querySelectorAll('#sdm-days [data-di]').forEach(el=>{const d=parseInt(el.dataset.di);const on=sel.includes(d);el.style.background=on?'var(--a2)':'var(--c2)';el.style.borderColor=on?'var(--ab)':'var(--bd)';el.style.color=on?'var(--a)':'var(--t2)';});}
function sdmConfirm(id){const tmpl=skillTemplates.find(x=>x.id===id);if(!tmpl)return;const sel=window._sdmSelected||[];if(!sel.length){flash('Выбери хотя бы один день');return;}const mon=getWeekMonday(weekOffset);sel.forEach(idx=>{const d=new Date(mon);d.setDate(mon.getDate()+idx);const key=dk(d);if(!tasks[key])tasks[key]=[];tmpl.exercises.forEach(ex=>{const already=tasks[key].find(t=>t._sportTplId===tmpl.id&&t.name===ex);if(!already)tasks[key].push({id:nid++,name:ex,done:false,emoji:'💪',_sportTplId:tmpl.id});});});LS.s('tasks',tasks);LS.s('nid',nid);const names=sel.map(i=>SKILLS_WDAYS[i]).join(', ');flash(`«${tmpl.name}» → ${names}`);const _sdmEl=document.getElementById('skillsDayModal');if(_sdmEl)_sdmEl.remove();if(curPage==='week')buildWeek();}

let skillsCollapsed={};
function toggleSkillsCollapse(id){skillsCollapsed[id]=!skillsCollapsed[id];renderSkills();}
function skillsOpenMedia(tplId,mi){const t=skillTemplates.find(x=>x.id===tplId);if(!t||!t.media)return;const m=t.media[mi];if(!m)return;const existing=document.getElementById('skillsMediaLB');if(existing)existing.remove();const lb=document.createElement('div');lb.id='skillsMediaLB';lb.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:500;display:flex;align-items:center;justify-content:center';lb.onclick=()=>lb.remove();lb.innerHTML=m.type==='video'?`<video src="${m.dataUrl}" controls autoplay style="max-width:96vw;max-height:88vh;border-radius:10px"></video>`:`<img src="${m.dataUrl}" style="max-width:96vw;max-height:88vh;border-radius:10px;object-fit:contain">`;document.body.appendChild(lb);}
function goToSkillsTemplate(tplId){goPage('skills',getNavBtn('skills'));setTimeout(()=>{skillsCollapsed[tplId]=false;renderSkills();const el=document.getElementById('skills-tpl-'+tplId);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.borderColor='var(--a)';setTimeout(()=>{el.style.borderColor='';},1200);}},80);}
function navToWeekToday(){const btn=getNavBtn('week');goPage('week',btn);if(typeof weekOffset!=='undefined'&&weekOffset!==0){weekOffset=0;buildWeek();}else{setTimeout(()=>{const dow=(new Date().getDay()+6)%7;if(typeof scrollToCard==='function')scrollToCard(dow);},200);}}
function navToWeekTplItem(elId){
  const btn=getNavBtn('week');
  goPage('week',btn);
  if(typeof weekOffset!=='undefined'&&weekOffset!==0){weekOffset=0;}
  if(typeof buildWeek==='function')buildWeek();
  setTimeout(()=>{
    const dow=(new Date().getDay()+6)%7;
    if(typeof scrollToCard==='function')scrollToCard(dow);
    const todayKey=dk2(new Date());
    if(typeof cardTplView!=='undefined'){cardTplView[todayKey]=true;}
    if(typeof buildWeek==='function')buildWeek();
    setTimeout(()=>{
      const el=document.getElementById(elId);
      if(el){
        el.scrollIntoView({behavior:'smooth',block:'center'});
        el.style.background='var(--a2,rgba(45,212,191,0.15))';
        setTimeout(()=>el.style.background='',1400);
      }
    },350);
  },420);
}
function goToRoutineWeekday(idx){const btn=getNavBtn('routine');goPage('routine',btn);setTimeout(()=>{const dow=(new Date().getDay()+6)%7;if(typeof curWdayTab!=='undefined'&&curWdayTab!==dow){curWdayTab=dow;if(typeof renderRoutine==='function')renderRoutine();}setTimeout(()=>{const el=document.querySelectorAll('.rt-wday-item')[idx];if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.style.background='var(--a2,rgba(45,212,191,0.15))';setTimeout(()=>el.style.background='',1200);}},120);},200);}
function goToHabit(habId){const btn=getNavBtn('habits');goPage('habits',btn);setTimeout(()=>{const el=document.getElementById('hab-item-'+habId);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});const inner=el.querySelector('div');if(inner){inner.style.background='var(--a2,rgba(45,212,191,0.15))';setTimeout(()=>inner.style.background='',1200);}else{el.style.background='var(--a2,rgba(45,212,191,0.15))';setTimeout(()=>el.style.background='',1200);}}},200);}

// ══ ПАРАМЕТРЫ ТРЕНИРОВКИ ════════════════════════════
// ── Контекст модала параметров ──────────────────────────
let _trainParamEditId   = null;
let _trainParamCategory = 'physical'; // 'physical' | 'mental'

// Вспомогательная функция: возвращает правильный массив по категории
function _getParamArray(cat) {
  return cat === 'mental' ? mentalParams : physParams;
}
function _setParamArray(cat, arr) {
  if (cat === 'mental') { mentalParams = arr; LS.s('mentalParams', arr); }
  else                   { physParams   = arr; LS.s('physParams',   arr); }
}

function renderTrainParams(containerId, includeDiseases, category){
  const wrap = document.getElementById(containerId); if(!wrap) return;
  const cat = category || 'physical';
  const params = _getParamArray(cat);
  let html = '';
  // Болезни из мед карты (только для физических)
  if(includeDiseases && physDiseases && physDiseases.length){
    physDiseases.forEach(d=>{
      html += `<div class="phys-disease" onclick="this.classList.toggle('open')">
        <div class="phys-disease-head">
          <span style="font-size:14px">🩺</span>
          <div class="phys-disease-name" style="font-size:12px;color:var(--t2)">${d.name}</div>
          <div style="font-family:var(--mono);font-size:8px;color:var(--t3);flex-shrink:0;padding:1px 5px;border-radius:4px;border:1px solid var(--bd);background:var(--c3)">мед карта</div>
          <div class="phys-disease-arr">▸</div>
        </div>
        <div class="phys-disease-body">${d.notes||'Рекомендации не добавлены'}</div>
      </div>`;
    });
  }
  // Пользовательские параметры конкретной категории
  if(params && params.length){
    params.forEach(p=>{
      html += `<div class="phys-disease" onclick="this.classList.toggle('open')">
        <div class="phys-disease-head">
          <span style="font-size:14px">📌</span>
          <div class="phys-disease-name" style="font-size:12px">${p.name}</div>
          <div style="display:flex;gap:4px;flex-shrink:0" onclick="event.stopPropagation()">
            <button onclick="openTrainParamModal(${p.id},'${cat}')" style="background:none;border:none;color:var(--t3);font-size:12px;cursor:pointer;padding:2px 4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          </div>
          <div class="phys-disease-arr">▸</div>
        </div>
        <div class="phys-disease-body">${p.notes||'Описание не добавлено'}</div>
      </div>`;
    });
  }
  if(!html && !includeDiseases){
    html = '<div style="font-size:11px;color:var(--t3);font-family:var(--mono);padding:2px 0 6px">Нет параметров — нажми + параметр</div>';
  }
  if(!html && includeDiseases && (!physDiseases||!physDiseases.length)){
    html = '<div style="font-size:11px;color:var(--t3);font-family:var(--mono);padding:2px 0 6px">Нет параметров — нажми + параметр</div>';
  }
  wrap.innerHTML = html;
}

// editId — id существующего параметра или undefined/null (новый)
// cat    — 'physical' | 'mental' (обязательно для новых)
function openTrainParamModal(editId, cat){
  // Устанавливаем категорию: при редактировании ищем в обоих массивах, при создании берём из аргумента
  if(editId){
    const inPhys   = physParams.find(x=>x.id===editId);
    const inMental = mentalParams.find(x=>x.id===editId);
    _trainParamCategory = inMental ? 'mental' : 'physical';
  } else {
    _trainParamCategory = (cat === 'mental') ? 'mental' : 'physical';
  }

  const tpb = document.getElementById('trainParamDelBtn');
  if(tpb) tpb.style.display = editId ? '' : 'none';
  _trainParamEditId = editId || null;

  const modal = document.getElementById('trainParamModal'); if(!modal) return;

  // Скрытое поле категории в модале (помогает при confirmTrainParam)
  let catField = document.getElementById('trainParamCategory');
  if(!catField){
    catField = document.createElement('input');
    catField.type = 'hidden'; catField.id = 'trainParamCategory';
    modal.appendChild(catField);
  }
  catField.value = _trainParamCategory;

  if(editId){
    const arr = _getParamArray(_trainParamCategory);
    const p   = arr.find(x=>x.id===editId);
    if(p){
      document.getElementById('trainParamName').value  = p.name;
      document.getElementById('trainParamNotes').value = p.notes||'';
    }
    document.getElementById('trainParamModalTitle').textContent = 'изменить параметр';
  } else {
    document.getElementById('trainParamName').value  = '';
    document.getElementById('trainParamNotes').value = '';
    document.getElementById('trainParamModalTitle').textContent = 'добавить параметр';
  }
  modal.classList.add('show');
  setTimeout(()=>document.getElementById('trainParamName').focus(), 100);
}

function closeTrainParamModal(){
  closeModal('trainParamModal');
  _trainParamEditId   = null;
  // Не сбрасываем категорию — не нужно
}

function confirmTrainParam(){
  const name  = document.getElementById('trainParamName').value.trim();
  const notes = document.getElementById('trainParamNotes').value.trim();
  if(!name){flash('Введи название');return;}

  // Читаем категорию из скрытого поля (устойчиво к асинхронным вызовам)
  const catField = document.getElementById('trainParamCategory');
  const cat = (catField && catField.value === 'mental') ? 'mental' : _trainParamCategory;

  const arr = _getParamArray(cat);

  if(_trainParamEditId !== null){
    const p = arr.find(x=>x.id===_trainParamEditId);
    if(p){ p.name=name; p.notes=notes; }
  } else {
    arr.push({id:nid++, name, notes});
    LS.s('nid', nid);
  }
  _setParamArray(cat, arr);
  closeTrainParamModal();
  renderSkills();
}

function delTrainParam(id){
  // Удаляем из правильного массива
  const cat = _trainParamCategory;
  const arr = _getParamArray(cat).filter(x=>x.id!==id);
  _setParamArray(cat, arr);
  renderSkills();
}

function renderSkills(){
  const list=document.getElementById('skillsTemplates');if(!list)return;
  const todayW=_cycleInfoForDate(nowDK());const todaySlot=todayW?todayW.key:null;const isRestDay=!todaySlot;

  const renderTpl=t=>{
    const collapsed=!!skillsCollapsed[t.id];const cs=t.cycleSlot||'';const meta=cs?_slotMeta(cs):null;const isActive=cs&&cs===todaySlot;const sType=t.skillType||'physical';
    const slotBadge=cs&&meta?`<div style="font-family:var(--mono);font-size:10px;font-weight:500;min-width:20px;height:20px;padding:0 5px;border-radius:5px;border:0.5px solid ${meta.color}66;background:${meta.bg};color:${meta.color};flex-shrink:0;display:flex;align-items:center;justify-content:center">${cs}</div>`:`<div style="font-family:var(--mono);font-size:10px;min-width:20px;height:20px;padding:0 5px;border-radius:5px;border:0.5px solid var(--bd);background:var(--c2);color:var(--t3);flex-shrink:0;display:flex;align-items:center;justify-content:center">—</div>`;
    const typeBadgeStyle=sType==='mental'?`border:0.5px solid rgba(167,139,250,0.35);background:rgba(167,139,250,0.08);color:var(--purple)`:`border:0.5px solid rgba(45,212,191,0.3);background:var(--a3);color:var(--a)`;
    const typeBadge=`<div style="font-family:var(--mono);font-size:9px;font-weight:700;width:20px;height:20px;border-radius:5px;${typeBadgeStyle};flex-shrink:0;display:flex;align-items:center;justify-content:center">T</div>`;
    const wdayBtns=SKILLS_WDAYS.map((d,i)=>'<div onclick="toggleSkillsDay('+t.id+','+i+')" style="font-family:var(--mono);font-size:10px;padding:4px 10px;border-radius:7px;cursor:pointer;user-select:none;transition:.12s;background:'+((t.weekDays||[]).includes(i)?'var(--a2)':'var(--c2)')+';border:1px solid '+((t.weekDays||[]).includes(i)?'var(--ab)':'var(--bd)')+';color:'+((t.weekDays||[]).includes(i)?'var(--a)':'var(--t3)')+'">'+d+'</div>').join('');
    const wdayPanel=skillsDayPanels[t.id]?'<div style="margin-bottom:6px"><div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:5px">дни в шаблоне НЕДЕЛЯ:</div><div style="display:flex;gap:5px;flex-wrap:wrap">'+wdayBtns+'</div></div>':'';
    const activeBorder=isActive&&meta?`;border-color:${meta.color}55`:'';
    return `<div id="skills-tpl-${t.id}" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:0.5px solid rgba(255,255,255,0.05);cursor:default;transition:background .1s${activeBorder}" onmouseenter="this.style.background='rgba(45,212,191,0.03)'" onmouseleave="this.style.background=''">
      ${typeBadge}
      ${slotBadge}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:#d0d0d0;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
        ${!collapsed&&t.exercises.length?`<div style="font-size:10px;color:#383838;margin-top:1px;font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.exercises.join(' · ')}</div>`:''}
        ${sType==='physical'&&cs&&_slotHasIntensityPair(cs)?`<div style="margin-top:3px">${_intensityBadge(nowDK(),'physical')}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <button onclick="toggleSkillsCollapse(${t.id})" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);color:#2a2a2a;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .12s" onmouseenter="this.style.background='rgba(45,212,191,0.1)';this.style.borderColor='rgba(45,212,191,0.3)';this.style.color='#2dd4bf'" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)';this.style.color='#2a2a2a'">${collapsed?'▸':'▾'}</button>
        <button onclick="openSkillDashboard(${t.id})" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);color:#555;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .12s" onmouseenter="this.style.background='rgba(45,212,191,0.1)';this.style.borderColor='rgba(45,212,191,0.3)';this.style.color='#2dd4bf'" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)';this.style.color='#555'" title="Дашборд">◧</button>
        <button onclick="openSkillsModal(${t.id})" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);color:#2a2a2a;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .12s" onmouseenter="this.style.background='rgba(45,212,191,0.1)';this.style.borderColor='rgba(45,212,191,0.3)';this.style.color='#2dd4bf'" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)';this.style.color='#2a2a2a'">⊞</button>

      </div>
    </div>
    ${!collapsed?`<div style="padding-left:30px">${wdayPanel}${(t.media&&t.media.length)?`<div style="display:flex;flex-wrap:wrap;gap:5px;padding-bottom:6px">${t.media.map((m,mi)=>`<div onclick="skillsOpenMedia(${t.id},${mi})" style="width:52px;height:52px;border-radius:7px;overflow:hidden;border:1px solid var(--bd);cursor:pointer;flex-shrink:0;background:var(--c2);position:relative">${m.type==='video'?`<video src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(0,0,0,0.3)">▶</div>`:`<img src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover">`}</div>`).join('')}</div>`:''}</div>`:''}`;
  };

  // Секция параметров — category: 'physical' | 'mental'
  const renderParamSection = (includeDiseases, category) => {
    const cat    = category || 'physical';
    const params = _getParamArray(cat);
    let items = '';
    if(includeDiseases && physDiseases && physDiseases.length){
      physDiseases.forEach(d=>{
        items += `<div class="phys-disease" onclick="this.classList.toggle('open')" style="margin-top:5px">
          <div class="phys-disease-head">
            <span style="font-size:12px">🩺</span>
            <div class="phys-disease-name" style="font-size:12px;color:var(--t2)">${d.name}</div>
            <div style="font-family:var(--mono);font-size:8px;color:var(--t3);flex-shrink:0;padding:1px 5px;border-radius:4px;border:1px solid var(--bd);background:var(--c3)">мед карта</div>
            <div class="phys-disease-arr">▸</div>
          </div>
          <div class="phys-disease-body">${d.notes||'Рекомендации не добавлены'}</div>
        </div>`;
      });
    }
    if(params && params.length){
      params.forEach(p=>{
        items += `<div class="phys-disease" onclick="this.classList.toggle('open')" style="margin-top:5px">
          <div class="phys-disease-head">
            <span style="font-size:12px">📌</span>
            <div class="phys-disease-name" style="font-size:12px">${p.name}</div>
            <div style="display:flex;gap:4px;flex-shrink:0" onclick="event.stopPropagation()">
              <button onclick="openTrainParamModal(${p.id},'${cat}')" style="background:none;border:none;color:var(--t3);font-size:12px;cursor:pointer;padding:2px 4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            </div>
            <div class="phys-disease-arr">▸</div>
          </div>
          <div class="phys-disease-body">${p.notes||'Описание не добавлено'}</div>
        </div>`;
      });
    }
    const noParams = !items;
    return `<div style="padding:6px 0 2px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:${noParams?'4':'2'}px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;flex:1">параметры</div>
        <button onclick="openTrainParamModal(null,'${cat}')" style="display:flex;align-items:center;gap:4px;background:rgba(45,212,191,0.07);border:0.5px solid rgba(45,212,191,0.2);border-radius:6px;color:rgba(45,212,191,0.6);font-family:var(--mono);font-size:9px;letter-spacing:0.05em;padding:3px 9px;cursor:pointer;transition:all .12s" onmouseenter="this.style.background='rgba(45,212,191,0.14)';this.style.borderColor='rgba(45,212,191,0.45)'" onmouseleave="this.style.background='rgba(45,212,191,0.07)';this.style.borderColor='rgba(45,212,191,0.2)'">+ параметр</button>
      </div>
      ${noParams?`<div style="font-family:var(--mono);font-size:10px;color:#222;text-align:center;padding:2px 0 8px;letter-spacing:0.08em">нет параметров</div>`:items}
    </div>`;
  };

  const physical=skillTemplates.filter(t=>(t.skillType||'physical')==='physical');
  const mental=skillTemplates.filter(t=>t.skillType==='mental');
  const fg=isRestDay?mental:physical; const sg=isRestDay?physical:mental;
  const fLabel=isRestDay?'умственные':'физические';
  const sLabel=isRestDay?'физические':'умственные';
  const fDis=!isRestDay;
  const sDis=isRestDay;

  // ── Разделитель-заголовок ──
  const sepHtml=(label,extraTop=0)=>`<div style="display:flex;align-items:center;gap:10px;margin:${extraTop}px 0 2px">
    <div style="flex:1;height:0.5px;background:rgba(255,255,255,0.1)"></div>
    <div style="width:5px;height:5px;border-radius:50%;background:#2dd4bf;flex-shrink:0;opacity:0.8"></div>
    <span style="font-family:var(--mono);font-size:9px;color:rgba(45,212,191,0.7);letter-spacing:0.2em;text-transform:uppercase;white-space:nowrap">${label}</span>
    <div style="width:5px;height:5px;border-radius:50%;background:#2dd4bf;flex-shrink:0;opacity:0.8"></div>
    <div style="flex:1;height:0.5px;background:rgba(255,255,255,0.1)"></div>
  </div>`;

  let html='';

  html+=sepHtml(fLabel,14);
  html+=renderParamSection(fDis, isRestDay?'mental':'physical');
  if(fg.length){html+=fg.map(renderTpl).join('');}
  else{html+=`<div style="font-size:12px;color:#1e1e1e;font-family:var(--mono);padding:4px 0 2px;text-align:center;letter-spacing:0.08em">шаблонов нет</div>`;}

  html+=`<div style="height:20px"></div>`;
  html+=sepHtml(sLabel);
  html+=renderParamSection(sDis, isRestDay?'physical':'mental');
  if(sg.length){html+=sg.map(renderTpl).join('');}
  else{html+=`<div style="font-size:12px;color:#1e1e1e;font-family:var(--mono);padding:4px 0 2px;text-align:center;letter-spacing:0.08em">шаблонов нет</div>`;}

  list.innerHTML=html;
}

function openSkillDashboard(id){
  const t=skillTemplates.find(x=>x.id===id);if(!t)return;
  const existing=document.getElementById('skillDashOverlay');if(existing)existing.remove();
  const cs=t.cycleSlot||'';const meta=cs?_slotMeta(cs):null;
  const sType=t.skillType||'physical';
  const accentColor=meta?meta.color:(sType==='mental'?'#A78BFA':'#2dd4bf');
  const accentBg=meta?meta.bg:(sType==='mental'?'rgba(167,139,250,0.1)':'rgba(45,212,191,0.08)');
  const typeLabel=sType==='mental'?'умственный':'физический';
  const WDAY_NAMES=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  const exHtml=(t.exercises&&t.exercises.length)
    ?t.exercises.map(e=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:0.5px solid rgba(255,255,255,0.04)">
        <span style="color:${accentColor};font-size:12px;margin-top:1px;flex-shrink:0">▸</span>
        <span style="font-size:13px;color:#c8c8c8;line-height:1.45">${e}</span>
      </div>`).join('')
    :`<div style="font-size:12px;color:#444;font-family:var(--mono);padding:6px 0">упражнения не добавлены</div>`;

  const wdayHtml=WDAY_NAMES.map((d,i)=>`<div style="font-family:var(--mono);font-size:11px;padding:4px 10px;border-radius:7px;background:${(t.weekDays||[]).includes(i)?accentBg:'rgba(255,255,255,0.03)'};border:0.5px solid ${(t.weekDays||[]).includes(i)?accentColor+'55':'rgba(255,255,255,0.07)'};color:${(t.weekDays||[]).includes(i)?accentColor:'#444'}">${d}</div>`).join('');

  const mediaHtml=(t.media&&t.media.length)
    ?`<div style="margin-top:14px"><div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">медиа</div>
       <div style="display:flex;flex-wrap:wrap;gap:6px">${t.media.map((m,mi)=>`<div onclick="skillsOpenMedia(${id},${mi})" style="width:60px;height:60px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);cursor:pointer;flex-shrink:0;background:#1a1a1a;position:relative">${m.type==='video'?`<video src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(0,0,0,0.35)">▶</div>`:`<img src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover">`}</div>`).join('')}</div></div>`
    :'';

  const savedDesc=t.desc||'';

  const overlay=document.createElement('div');
  overlay.id='skillDashOverlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:400;display:flex;align-items:flex-end;justify-content:center;touch-action:none';
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  overlay.innerHTML=`
    <div style="background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:18px 18px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:20px 18px 32px;animation:su .2s ease">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <div style="width:40px;height:40px;border-radius:10px;background:${accentBg};border:0.5px solid ${accentColor}44;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px;font-weight:700;color:${accentColor};flex-shrink:0">${cs||'T'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:500;color:#e0e0e0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
          <div style="font-size:11px;color:#555;font-family:var(--mono);margin-top:2px">${typeLabel}${cs?' · слот '+cs:''}</div>
        </div>
        <button onclick="document.getElementById('skillDashOverlay').remove()" style="width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);color:#555;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">
        <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">тип</div>
          <div style="font-size:14px;font-weight:500;color:${accentColor}">${typeLabel}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">упражнений</div>
          <div style="font-size:14px;font-weight:500;color:#e0e0e0">${(t.exercises||[]).length}</div>
        </div>
      </div>

      <div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">дни недели</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:18px">${wdayHtml}</div>

      <div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">упражнения / шаги</div>
      <div style="margin-bottom:18px">${exHtml}</div>

      <div style="font-family:var(--mono);font-size:9px;color:#444;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">заметки</div>
      <textarea id="skillDashDesc_${id}" placeholder="Цель, план, прогресс, ссылки..." style="width:100%;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;font-size:13px;color:#c8c8c8;font-family:var(--sans);resize:none;min-height:90px;outline:none;box-sizing:border-box" oninput="saveSkillDashDesc(${id},this.value)">${savedDesc}</textarea>

      ${mediaHtml}

      <div style="margin-top:18px">
        <button onclick="openSkillsModal(${id});document.getElementById('skillDashOverlay').remove()" style="width:100%;padding:10px;border-radius:10px;background:rgba(45,212,191,0.07);border:0.5px solid rgba(45,212,191,0.2);color:rgba(45,212,191,0.7);font-size:13px;cursor:pointer;transition:.12s" onmouseenter="this.style.background='rgba(45,212,191,0.14)'" onmouseleave="this.style.background='rgba(45,212,191,0.07)'">редактировать шаблон</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function saveSkillDashDesc(id,val){
  const t=skillTemplates.find(x=>x.id===id);if(!t)return;
  t.desc=val;
  LS.s('sportTemplates',skillTemplates);
}
