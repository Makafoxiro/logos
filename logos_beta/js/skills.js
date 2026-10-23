// ═══ MODULE: skills.js ═══
// ══ РАСПИСАНИЕ ПО ДНЯМ НЕДЕЛИ ══════════════════════════════
// Шаблоны привязываются к дням недели (t.weekDays, 0=Пн..6=Вс), физ. и умств.
// могут накладываться на один день. Слот (A/B/C/D, 1/2/3...) — метка/цвет шаблона.
// Точечные правки конкретных дат — cycleOverrides ({dk: 'rest'|'A'|...}).
// Тяж/лёгк недели — от чётности ISO-недели года (без даты отсчёта).

const CYCLE_WORKOUTS = [
  {key:'A', name:'Грудь + Трицепс + Пресс', color:'#378ADD', bg:'rgba(55,138,221,0.12)', exs:['Отжимания с рюкзаком (грудь) — 3–4×8–12','Отжимания узким хватом (трицепс) — 3×10–15','Скручивания на полу (пресс) — 2–3×15–20']},
  {key:'B', name:'Спина + Бицепс + Пресс', color:'#1D9E75', bg:'rgba(29,158,117,0.12)', exs:['Подтягивания средним хватом — 3–4×макс','Вис на турнике — 2×15–20 сек','Подъём согнутых ног лёжа (пресс) — 2–3×12–15']},
  {key:'C', name:'Плечи + Предплечья + Пресс', color:'#7F77DD', bg:'rgba(127,119,221,0.12)', exs:['Разведения в стороны (бутылки) — 3×15–20','Сгибание/разгибание кистей — 3×15–20','Планка — 2–3×20–30 сек']},
  {key:'D', name:'Ноги лёгкие + Пресс', color:'#BA7517', bg:'rgba(186,117,23,0.12)', exs:['Приседания с рюкзаком — 3–4×12–15','Ягодичный мост — 3×15–20','Подъёмы на носки — 3×15–20','Вакуум живота — 3×5–10 сек']},
];

let cycleFirstWeekHeavy = LS.g('cycleFirstWeekHeavy', true);
let _cycleView = 'list';
let _cycleCalMonth = null;
// Временные слоты добавленные через + в модалке (до сохранения шаблона)
let _tempCycleLetters = [];
let _tempCycleDigits = [];
// Ручные переопределения: {dk: 'rest'|'A'|'B'|'1'|...}
let cycleOverrides = LS.g('cycleOverrides', {});

// ── Одноровная миграция из старого скользящего цикла ──────
// Проставляем weekDays шаблонам, у которых есть слот, но не проставлены дни недели.
(function _migrateWeekDaysFromCycle(){
  if(!skillTemplates||!skillTemplates.length)return;
  if(LS.g('weekDaysMigrated',false))return;
  const missing=skillTemplates.filter(t=>t.cycleSlot&&(!Array.isArray(t.weekDays)||!t.weekDays.length));
  if(missing.length){
    const startStr=LS.g('cycleStartDate','2026-04-07');
    const startSlot=LS.g('cycleStartSlot',0);
    const letters=['A','B','C','D'],digits=['1','2','3','4'];
    skillTemplates.forEach(t=>{
      if(!t.cycleSlot)return;
      if(/^[A-Z]$/.test(t.cycleSlot)&&!letters.includes(t.cycleSlot))letters.push(t.cycleSlot);
      if(/^\d+$/.test(t.cycleSlot)&&!digits.includes(t.cycleSlot))digits.push(t.cycleSlot);
    });
    letters.sort();digits.sort((a,b)=>Number(a)-Number(b));
    const maxLen=Math.max(letters.length,digits.length);
    const pattern=[];
    for(let i=0;i<maxLen;i++){pattern.push(letters[i%letters.length]);pattern.push(digits[i%digits.length]);}
    const [sy,sm,sd]=startStr.split('-').map(Number);
    const start=new Date(sy,sm-1,sd);
    const today=new Date();
    for(let i=0;i<14;i++){
      const d=new Date(today);d.setDate(today.getDate()+i);
      const diff=Math.round((d-start)/86400000);
      const idx=((startSlot+diff)%pattern.length+pattern.length)%pattern.length;
      const key=pattern[idx];
      const dow=(d.getDay()+6)%7;
      missing.forEach(t=>{
        if(t.cycleSlot!==key)return;
        if(!Array.isArray(t.weekDays))t.weekDays=[];
        if(!t.weekDays.includes(dow))t.weekDays.push(dow);
      });
    }
    LS.s('sportTemplates',skillTemplates);
  }
  LS.s('weekDaysMigrated',true);
})();

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
  // Сортируем чтобы порядок был всегда алфавитный/числовой
  letters.sort();
  digits.sort((a,b)=>Number(a)-Number(b));
  return {letters,digits};
}

// ── ДЕНЬ НЕДЕЛИ → ШАБЛОНЫ ────────────────────────────────
// День недели даты в формате dk(): 0=Пн..6=Вс
function _dowForDate(dkStr){
  const parts=dkStr.split('-').map(Number);
  const d=new Date(parts[0],parts[1],parts[2]);
  return (d.getDay()+6)%7;
}
// Шаблоны, привязанные к дню недели даты (без учёта override)
function _tplsForWeekday(dow){
  return (skillTemplates||[]).filter(t=>Array.isArray(t.weekDays)&&t.weekDays.includes(dow));
}
// Слоты дня: override > слоты привязанных шаблонов
function _slotsForDate(dkStr){
  if(cycleOverrides[dkStr]==='rest')return [];
  if(cycleOverrides[dkStr])return [cycleOverrides[dkStr]];
  return [...new Set(_tplsForWeekday(_dowForDate(dkStr)).map(t=>t.cycleSlot).filter(Boolean))];
}
// Шаблоны дня с учётом override и тяж/лёгк недели — основной источник для рендера
function templatesForDate(dkStr){
  if(cycleOverrides[dkStr]==='rest')return [];
  let list;
  if(cycleOverrides[dkStr])list=(skillTemplates||[]).filter(t=>t.cycleSlot===cycleOverrides[dkStr]);
  else list=_tplsForWeekday(_dowForDate(dkStr));
  return _applyIntensity(list,dkStr).map(t=>_applyWeekPattern(t,dkStr));
}
function _cycleInfoForDate(dkStr){
  const slots=_slotsForDate(dkStr);
  return slots.length?_slotMeta(slots[0]):null;
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

// Тяж/лёгк недели: ISO-номер недели в году, чётность + флаг cycleFirstWeekHeavy
function _isoWeekNum(d){
  const t=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const dayNum=(t.getDay()+6)%7;          // Пн=0..Вс=6
  t.setDate(t.getDate()-dayNum+3);         // четверг этой ISO-недели
  const firstThu=new Date(t.getFullYear(),0,4);
  const fDayNum=(firstThu.getDay()+6)%7;
  firstThu.setDate(firstThu.getDate()-fDayNum+3);
  return 1+Math.round((t-firstThu)/(7*24*60*60*1000));
}
function _getWeekIntensity(dateStr){
  const parts=dateStr.split('-').map(Number);
  const d=new Date(parts[0],parts[1],parts[2]);
  const isEven=_isoWeekNum(d)%2===0;
  return (isEven===cycleFirstWeekHeavy)?'heavy':'light';
}

function _hasLegacyIntensityPair(slotKey){
  if(!slotKey)return false;
  const tpls=(skillTemplates||[]).filter(t=>t.cycleSlot===slotKey);
  return tpls.some(t=>t.weekIntensity==='heavy')&&tpls.some(t=>t.weekIntensity==='light');
}

// Применяет к списку шаблонов упражнения текущей недели (тяж/лёгк)
function _applyIntensity(tpls,dateStr){
  if(!tpls||!tpls.length)return [];
  const wType=_getWeekIntensity(dateStr); // 'heavy' | 'light'
  return tpls.flatMap(t=>{
    // Новый формат: один шаблон с exercisesHeavy+exercisesLight
    if(t.exercisesHeavy&&t.exercisesHeavy.length&&t.exercisesLight&&t.exercisesLight.length){
      const exs=wType==='heavy'?t.exercisesHeavy:t.exercisesLight;
      return [{...t,exercises:exs}];
    }
    // Старые данные хранили тяжёлую и лёгкую версии отдельными шаблонами.
    if((t.weekIntensity==='heavy'||t.weekIntensity==='light')&&_hasLegacyIntensityPair(t.cycleSlot)){
      return t.weekIntensity===wType?[{...t,exercises:t.exercises||[]}]:[];
    }
    return [t];
  });
}

// ── Недельный паттерн для умственных навыков ───────────────────────────────
// tpl   — шаблон (skillType === 'mental')
// dateStr — дата в формате YYYY-MM-DD
function _resolveWeekPattern(tpl,dateStr){
  if(!tpl||tpl.skillType!=='mental')return {value:null,catIdx:0,weekIdx:0};
  const cats=(tpl.weekCategories||[]);
  const pat=(tpl.weekPattern||[]);
  if(!cats.length||!pat.length)return {value:null,catIdx:0,weekIdx:0};
  const n=Math.min(cats.length,pat.length);
  if(n===0)return {value:null,catIdx:0,weekIdx:0};
  const catsN=cats.slice(0,n),patN=pat.slice(0,n);
  const [year,month,day]=String(dateStr).split('-').map(Number);
  const date=new Date(year,month,day);
  const dateWeekStart=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  dateWeekStart.setDate(dateWeekStart.getDate()-((dateWeekStart.getDay()+6)%7));
  const anchorKey=typeof tpl.weekPatternStart==='string'&&/^\d{4}-\d{1,2}-\d{1,2}$/.test(tpl.weekPatternStart)
    ?tpl.weekPatternStart:tpl.created;
  let elapsed;
  if(typeof tpl.weekPatternStart==='number'&&Number.isFinite(tpl.weekPatternStart)){
    elapsed=_isoWeekNum(date)-tpl.weekPatternStart+1;
  }else if(anchorKey){
    const [anchorYear,anchorMonth,anchorDay]=String(anchorKey).split('-').map(Number);
    const anchorDate=new Date(anchorYear,anchorMonth,anchorDay);
    anchorDate.setDate(anchorDate.getDate()-((anchorDate.getDay()+6)%7));
    const dateUtc=Date.UTC(dateWeekStart.getFullYear(),dateWeekStart.getMonth(),dateWeekStart.getDate());
    const anchorUtc=Date.UTC(anchorDate.getFullYear(),anchorDate.getMonth(),anchorDate.getDate());
    elapsed=Math.round((dateUtc-anchorUtc)/(7*24*60*60*1000))+1;
  }else{
    elapsed=1;
  }
  const cycle=patN.reduce((a,b)=>a+b,0);
  if(!cycle)return {value:null,catIdx:0,weekIdx:0};
  const pos=((elapsed-1)%cycle+cycle)%cycle;
  let acc=0;
  for(let i=0;i<n;i++){
    acc+=patN[i];
    if(pos<acc)return {value:catsN[i],catIdx:i,weekIdx:pos+1};
  }
  return {value:null,catIdx:0,weekIdx:0};
}

function _applyWeekPattern(tpl,dateStr){
  if(!tpl||tpl.skillType!=='mental')return tpl;
  const res=_resolveWeekPattern(tpl,dateStr);
  if(!res.value)return tpl;
  const categorySteps=tpl.exercisesByCategory?.[res.catIdx];
  const exercises=Array.isArray(categorySteps)
    ?categorySteps
    :typeof categorySteps==='string'
      ?categorySteps.split(/\n/).map(s=>s.trim()).filter(Boolean)
      :[];
  return {...tpl,exercises,_activeWeekCategory:res.value};
}

function skillTplDoneKey(dateKey,tpl,exerciseIndex){
  const patternKey=tpl&&tpl._activeWeekCategory
    ?'__pattern__'+encodeURIComponent(tpl._activeWeekCategory)
    :'';
  return dateKey+'__sport__'+tpl.id+patternKey+'__'+exerciseIndex;
}

// Бейдж недельного паттерна вида «нед.3→английский» для умственного шаблона
function _patternBadge(tpl,dateStr){
  if(!tpl||tpl.skillType!=='mental')return '';
  const res=_resolveWeekPattern(tpl,dateStr);
  if(!res.value)return '';
  const meta=tpl.cycleSlot?_slotMeta(tpl.cycleSlot):null;
  const color=meta?meta.color:'#7C3AED';
  return `<div style="font-family:var(--mono);font-size:9px;font-weight:700;padding:2px 7px;margin-top:2px;border-radius:5px;background:${color}11;border:0.5px solid ${color}66;color:${color};flex-shrink:0">нед.${res.weekIdx}→${res.value}</div>`;
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
  return _hasLegacyIntensityPair(slotKey);
}

function cycleResetToday(){
  cycleOverrides={};
  LS.s('cycleOverrides',cycleOverrides);
  renderCycleBlock();renderSkills();
  if(_cycleView==='cal')renderCycleCal();
  flash('Расписание сброшено к дням недели');
}

function cycleSetDayOverride(dkStr,val){
  if(val==='auto'){delete cycleOverrides[dkStr];}else{cycleOverrides[dkStr]=val;}
  LS.s('cycleOverrides',cycleOverrides);
  renderCycleBlock();renderSkills();
  if(_cycleView==='cal')renderCycleCal();
}

function cycleOpenDayMenu(dkStr,e){
  e&&e.stopPropagation();
  const existing=document.getElementById('cycleDayMenu');
  if(existing){existing.remove();if(existing.dataset.dk===dkStr)return;}
  const {letters,digits}=_getCycleSlots();
  const allSlots=[...letters,...digits];
  const current=cycleOverrides[dkStr]||'auto';
  const menu=document.createElement('div');
  menu.id='cycleDayMenu';menu.dataset.dk=dkStr;
  menu.style.cssText='position:fixed;z-index:300;background:var(--c1);border:1px solid var(--bd);border-radius:10px;padding:6px;min-width:160px;box-shadow:0 4px 20px rgba(0,0,0,0.5)';
  if(e){
    const t=e.currentTarget?e.currentTarget.getBoundingClientRect():e.target.getBoundingClientRect();
    menu.style.top=(t.bottom+4)+'px';menu.style.left=Math.min(t.left,window.innerWidth-180)+'px';
  } else {menu.style.top='50%';menu.style.left='50%';menu.style.transform='translate(-50%,-50%)';}
  const opts=[{val:'rest',label:'отдых'},{val:'auto',label:'↺ авто (по дню недели)'},...allSlots.map(k=>{const m=_slotMeta(k);return{val:k,label:(m?m.key+' — '+m.name:k)};})];
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
  document.getElementById('cycle-cal-title').textContent=displayDate(new Date(y,m,1),{monthOnly:true,upper:true});
  const firstDay=new Date(y,m,1);const lastDay=new Date(y,m+1,0);
  const startDow=(firstDay.getDay()+6)%7;
  const grid=document.getElementById('cycle-cal-grid');
  let cells='';
  for(let i=0;i<startDow;i++)cells+='<div></div>';
  for(let d=1;d<=lastDay.getDate();d++){
    const ds=dk(new Date(y,m,d));
    const slots=_slotsForDate(ds);
    const dayTpls=templatesForDate(ds);
    const isToday=ds===today;
    const hasOverride=cycleOverrides[ds]!==undefined;
    const borderStyle=isToday?'1.5px solid var(--a)':'1px solid var(--bd)';
    const overrideDot=hasOverride?'<div style="position:absolute;top:2px;right:2px;width:4px;height:4px;border-radius:50%;background:var(--amber)"></div>':'';;
    if(slots.length||dayTpls.length){
      const firstMeta=slots.length?_slotMeta(slots[0]):null;
      const hasPair=slots.some(k=>_slotHasIntensityPair(k)&&_slotMeta(k)&&_slotMeta(k).type==='physical');
      const intens=hasPair?_getWeekIntensity(ds):null;
      let mentalCellBadges='';
      for(const tpl of dayTpls){
        if(tpl.skillType!=='mental')continue;
        const res=_resolveWeekPattern(tpl,ds);
        if(res.value){
          const meta=tpl.cycleSlot?_slotMeta(tpl.cycleSlot):null;
          const c=meta?meta.color:'#7C3AED';
          mentalCellBadges+=`<span style="font-family:var(--mono);font-size:8px;font-weight:700;padding:0 4px;margin-top:1px;background:${c}11;border:0.5px solid ${c}66;color:${c};border-radius:3px">${res.value}</span>`;
        }
      }
      const calBadge=intens?`<div style="font-family:var(--mono);font-size:7px;font-weight:700;color:${intens==='heavy'?'#E86C3A':'#2dd4bf'};margin-top:1px">${intens==='heavy'?'▲тяж':'▽лёгк'}</div>`:'';
      const slotTxt=slots.length?slots.join(''):'•';
      const slotColor=firstMeta?firstMeta.color:'var(--a)';
      const bg=firstMeta?firstMeta.bg:(isToday?'var(--c3)':'var(--c2)');
      cells+=`<div onclick="cycleOpenDayMenu('${ds}',event)" style="position:relative;border-radius:6px;padding:4px 2px;border:${borderStyle};background:${bg};text-align:center;cursor:pointer">${overrideDot}<div style="font-family:var(--mono);font-size:8px;color:var(--t3)">${d}</div><div style="font-family:var(--mono);font-size:10px;color:${slotColor};font-weight:500">${slotTxt}${calBadge}${mentalCellBadges}</div></div>`;
    }else{
      cells+=`<div onclick="cycleOpenDayMenu('${ds}',event)" style="position:relative;border-radius:6px;padding:4px 2px;border:${borderStyle};background:${isToday?'var(--c3)':'var(--c2)'};text-align:center;cursor:pointer">${overrideDot}<div style="font-family:var(--mono);font-size:8px;color:var(--t3)">${d}</div><div style="font-size:8px;color:var(--t3)">—</div></div>`;
    }
  }
  grid.innerHTML=cells;
}

function _editBtnHtml(dkStr){
  return `<button onclick="cycleOpenDayMenu('${dkStr}',event)" title="Изменить" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t3);font-size:13px;padding:4px 8px;cursor:pointer;flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`;
}

// Бейджи слотов дня (буквы/цифры с цветом)
function _slotBadgesHtml(slots){
  return slots.map(k=>{
    const m=_slotMeta(k);if(!m)return '';
    return `<div style="font-family:var(--mono);font-size:10px;font-weight:500;padding:2px 7px;border-radius:5px;border:1px solid ${m.color}44;background:${m.bg};color:${m.color};flex-shrink:0">${k}</div>`;
  }).join('');
}

function renderCycleBlock(){
  const today=nowDK();
  const todayCard=document.getElementById('cycle-today-card');
  if(todayCard){
    const dayTpls=templatesForDate(today);
    const slots=_slotsForDate(today);
    if(dayTpls.length||slots.length){
      const firstMeta=slots.length?_slotMeta(slots[0]):null;
      const color=firstMeta?firstMeta.color:'var(--a)';
      const bg=firstMeta?firstMeta.bg:'var(--a2)';
      const hasPair=slots.some(k=>_slotHasIntensityPair(k)&&_slotMeta(k)&&_slotMeta(k).type==='physical');
      const intensityBadge=hasPair?_intensityBadge(today,'physical'):'';
      const isMentalOnly=slots.length&&!slots.some(k=>_slotMeta(k)&&_slotMeta(k).type==='physical');
      const typeLabel=dayTpls.length
        ? (dayTpls.every(t=>(t.skillType||'physical')==='mental')?'УМСТВЕННАЯ':'ТРЕНИРОВКА')
        : (isMentalOnly?'УМСТВЕННАЯ':'ТРЕНИРОВКА');
      const iconHtml=slots.length?escHtml(slots.join('')):uiIconSvg(isMentalOnly?'brain':'dumbbell');
      // Тела: шаблоны дня (уже с упражнениями нужной интенсивности)
      let bodyHtml='';
      if(dayTpls.length){
        bodyHtml=dayTpls.map(tpl=>{
          if(tpl.skillType==='mental'){
            const res=_resolveWeekPattern(tpl,today);
            if(res.value){
              const exs=tpl.exercises||[];
              const meta=tpl.cycleSlot?_slotMeta(tpl.cycleSlot):null;
              const tc=meta?meta.color:color;
              return `<div style="margin-top:6px"><div style="font-family:var(--mono);font-size:8px;color:${tc};letter-spacing:.5px;margin-bottom:3px">нед.${res.weekIdx}→${res.value}</div>${exs.map(e=>`<div style="display:flex;gap:7px;align-items:flex-start;font-size:12px;color:var(--t2)"><span style="color:${tc};margin-top:1px">▸</span>${e}</div>`).join('')}</div>`;
            }
          }
          const tm=tpl.cycleSlot?_slotMeta(tpl.cycleSlot):null;
          const tc=tm?tm.color:color;
          return `<div style="margin-top:6px"><div style="font-family:var(--mono);font-size:8px;color:${tc};letter-spacing:.5px;margin-bottom:3px">${tpl.cycleSlot?tpl.cycleSlot+' · ':''}${tpl.name}</div>${(tpl.exercises||[]).map(e=>`<div style="display:flex;gap:7px;align-items:flex-start;font-size:12px;color:var(--t2)"><span style="color:${tc};margin-top:1px">▸</span>${e}</div>`).join('')}</div>`;
        }).join('');
      }else{
        // Override на слот без своих шаблонов — пресетные упражнения
        bodyHtml=slots.map(k=>{
          const m=_slotMeta(k);
          if(!m||!m.exs||!m.exs.length)return '';
          return `<div style="margin-top:6px">${m.exs.map(e=>`<div style="display:flex;gap:7px;align-items:flex-start;font-size:12px;color:var(--t2)"><span style="color:${m.color};margin-top:1px">▸</span>${e}</div>`).join('')}</div>`;
        }).join('');
      }
      // mental badges (нед. N → категория)
      let mentalBadges='';
      for(const tpl of dayTpls){
        if(tpl.skillType!=='mental')continue;
        const res=_resolveWeekPattern(tpl,today);
        if(res.value){
          const meta=tpl.cycleSlot?_slotMeta(tpl.cycleSlot):null;
          const c=meta?meta.color:color;
          mentalBadges+=`<div style="font-family:var(--mono);font-size:9px;font-weight:700;padding:2px 7px;margin-right:4px;border-radius:5px;background:${c}11;border:0.5px solid ${c}66;color:${c};flex-shrink:0">нед.${res.weekIdx}→${res.value}</div>`;
        }
      }
      todayCard.innerHTML=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:36px;height:36px;border-radius:9px;background:${bg};border:1.5px solid ${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;color:${color}">${iconHtml}</div><div style="flex:1"><div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;margin-bottom:2px">СЕГОДНЯ — ${typeLabel}</div><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${_slotBadgesHtml(slots)}${intensityBadge}${mentalBadges}</div></div>${_editBtnHtml(today)}</div><div style="display:flex;flex-direction:column;gap:4px">${bodyHtml}</div>`;
    }else{
      todayCard.innerHTML=`<div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:9px;background:var(--c2);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--t2)">${uiIconSvg('moon')}</div><div style="flex:1"><div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;margin-bottom:2px">СЕГОДНЯ</div><div style="font-size:14px;font-weight:500">День отдыха</div></div>${_editBtnHtml(today)}</div>`;
    }
  }
  // ── Список: те же даты текущей недели Пн–Вс, что и в календаре ──
  const listEl=document.getElementById('cycle-list');
  if(listEl){
    const now=new Date();
    const nowDow=(now.getDay()+6)%7;
    const weekStart=new Date(now);
    weekStart.setDate(now.getDate()-nowDow);
    let rows='';
    for(let i=0;i<7;i++){
      const d=new Date(weekStart);
      d.setDate(weekStart.getDate()+i);
      const ds=dk(d);
      const dow=DAYS7[i];
      const dayNum=displayDate(d,{noYear:true});
      const slots=_slotsForDate(ds);
      const dayTpls=templatesForDate(ds);
      const isToday=i===nowDow;
      const hasOverride=cycleOverrides[ds]!==undefined;
      let rightHtml='';
      if(slots.length||dayTpls.length){
        const hasPair=slots.some(k=>_slotHasIntensityPair(k)&&_slotMeta(k)&&_slotMeta(k).type==='physical');
        const intBadge=hasPair?_intensityBadge(ds,'physical'):'';
        const namesStr=dayTpls.length?dayTpls.map(t=>t.name).join(', '):'';
        rightHtml=`${_slotBadgesHtml(slots)}${intBadge}<div style="font-size:12px;color:var(--t2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${namesStr}</div>`;
      }else{
        rightHtml='<div style="font-size:11px;color:var(--t3);flex:1">отдых</div>';
      }
      rows+=`<div onclick="cycleOpenDayMenu('${ds}',event)" style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--bd)${i===6?';border-bottom:none':''};opacity:${isToday?'1':'0.75'};cursor:pointer"><div style="font-family:var(--mono);font-size:9px;color:${isToday?'var(--a)':'var(--t3)'};min-width:24px;text-align:right">${dow}</div><div style="font-family:var(--mono);font-size:9px;color:var(--t3);min-width:38px">${dayNum}</div>${rightHtml}${hasOverride?'<div style="width:5px;height:5px;border-radius:50%;background:var(--amber);flex-shrink:0"></div>':''}</div>`;
    }
    listEl.innerHTML=rows;
  }
  if(_cycleView==='cal')renderCycleCal();
}

// ══ SKILLS ══════════════════════════════════════════════
const SKILLS_WDAYS=DAYS7;
let _skillsModalFiles=[];
let _modalEx={heavy:'',light:'',none:''};
let _skillsPatternRows=[];
let _skillsPatternActiveIndex=-1;

// ── Управление категориями паттерна в модалке ───────────────────────────────
function _skillsPatternSaveActiveSteps(){
  const textarea=document.getElementById('skillsModalEx');
  if(textarea&&_skillsPatternRows[_skillsPatternActiveIndex]){
    _skillsPatternRows[_skillsPatternActiveIndex].steps=textarea.value;
  }
}
function skillsPatternSelectCategory(i){
  _skillsPatternSaveActiveSteps();
  _skillsPatternActiveIndex=i;
  _skillsPatternRender();
  const row=_skillsPatternRows[i];
  const textarea=document.getElementById('skillsModalEx');
  if(textarea)textarea.value=row?row.steps:'';
  const label=document.getElementById('skillsModalExLabel');
  if(label)label.textContent=row
    ?'Шаги / подзадачи — '+(row.label||'категория '+(i+1))
    :'Шаги / подзадачи';
}
function skillsPatternAddRow(){
  _skillsPatternSaveActiveSteps();
  _skillsPatternRows.push({label:'',steps:''});
  _skillsPatternActiveIndex=_skillsPatternRows.length-1;
  _skillsPatternRender();
  const textarea=document.getElementById('skillsModalEx');
  if(textarea)textarea.value='';
  const inp=document.getElementById('skillsPatternCat_'+(_skillsPatternRows.length-1));
  if(inp)inp.focus();
}
function skillsPatternRemoveRow(i){
  _skillsPatternSaveActiveSteps();
  _skillsPatternRows.splice(i,1);
  if(!_skillsPatternRows.length)_skillsPatternActiveIndex=-1;
  else if(_skillsPatternActiveIndex===i)_skillsPatternActiveIndex=Math.min(i,_skillsPatternRows.length-1);
  else if(_skillsPatternActiveIndex>i)_skillsPatternActiveIndex--;
  _skillsPatternRender();
  const textarea=document.getElementById('skillsModalEx');
  if(textarea)textarea.value=_skillsPatternRows[_skillsPatternActiveIndex]?.steps||'';
  const label=document.getElementById('skillsModalExLabel');
  const activeRow=_skillsPatternRows[_skillsPatternActiveIndex];
  if(label)label.textContent=activeRow
    ?'Шаги / подзадачи — '+(activeRow.label||'категория '+(_skillsPatternActiveIndex+1))
    :'Шаги / подзадачи';
}
function _skillsPatternRender(){
  const wrap=document.getElementById('skillsPatternWrap');
  if(!wrap)return;
  wrap.innerHTML='';
  if(!_skillsPatternRows.length){
    wrap.innerHTML=`<div style="font-family:var(--mono);font-size:10px;color:var(--t3);padding:8px 10px">Категорий пока нет — нажми «+ добавить категорию»</div>`;
    return;
  }
  _skillsPatternRows.forEach((row,i)=>{
    const Box=document.createElement('div');
    const active=i===_skillsPatternActiveIndex;
    Box.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px;border:0.5px solid '+(active?'var(--ab)':'var(--bd)')+';border-radius:8px;padding:6px 8px;background:'+(active?'var(--a2)':'var(--c2)');
    const select=document.createElement('button');
    select.type='button';
    select.textContent=active?'●':'○';
    select.title='Показать шаги этой категории сверху';
    select.style.cssText='flex:0 0 30px;height:30px;border-radius:7px;border:1px solid '+(active?'var(--ab)':'var(--bd)')+';background:'+(active?'var(--a2)':'var(--c1)')+';color:'+(active?'var(--a)':'var(--t3)')+';cursor:pointer';
    select.onclick=()=>skillsPatternSelectCategory(i);
    const index=document.createElement('div');
    index.textContent=(i+1)+'.';
    index.style.cssText='font-family:var(--mono);font-size:10px;color:var(--t3);flex:0 0 18px';
    const l2=document.createElement('input');
    l2.id='skillsPatternCat_'+i;
    l2.className='field-inp';
    l2.style.cssText='flex:1;min-width:0';
    l2.placeholder='Название категории';
    l2.maxLength=40;
    l2.value=row.label;
    l2.oninput=()=>{
      row.label=l2.value;
      if(active){
        const label=document.getElementById('skillsModalExLabel');
        if(label)label.textContent='Шаги / подзадачи — '+(row.label||'категория '+(i+1));
      }
    };
    const del=document.createElement('div');
    del.style.cssText='flex:0 0 26px;display:flex;align-items:center;justify-content:center';
    const db=document.createElement('button');
    db.style.cssText='width:24px;height:24px;border-radius:6px;background:var(--c3);border:0.5px solid var(--bd);color:var(--t3);font-family:var(--mono);font-size:12px;cursor:pointer';
    db.textContent='✕';
    db.onclick=function(){skillsPatternRemoveRow(i);};
    del.appendChild(db);
    Box.appendChild(select);Box.appendChild(index);Box.appendChild(l2);Box.appendChild(del);
    wrap.appendChild(Box);
  });
}

const CYCLE_SLOT_META=new Proxy({},{get(target,key){const m=_slotMeta(key);return m?{color:m.color,bg:m.bg}:{color:'var(--t2)',bg:'var(--c2)'}}});

function skillsModalSelectSlot(s){
  _renderModalSlotButtons(s);
  document.getElementById('skillsModalCycleSlot').value=s;
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
  const _allLetterSlots=['A','B','C','D','E','F','G','H'];
  const nextLetter=_allLetterSlots.find(l=>!letters.includes(l))||String.fromCharCode(65+letters.length);
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
}

// ── ДНИ НЕДЕЛИ В МОДАЛКЕ (мультивыбор) ───────────────────
let _modalWeekDays=[];
function _renderModalWeekDays(){
  const wrap=document.getElementById('skillsModalWeekDays');if(!wrap)return;
  wrap.innerHTML=SKILLS_WDAYS.map((d,i)=>{
    const on=_modalWeekDays.includes(i);
    return `<div onclick="skillsModalToggleWday(${i})" style="flex:1;min-width:0;text-align:center;padding:8px 2px;border-radius:var(--rm);border:1px solid ${on?'var(--ab)':'var(--bd)'};background:${on?'var(--a2)':'var(--c2)'};font-family:var(--mono);font-size:11px;color:${on?'var(--a)':'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">${d}</div>`;
  }).join('');
}
function skillsModalToggleWday(i){
  const idx=_modalWeekDays.indexOf(i);
  if(idx>=0)_modalWeekDays.splice(idx,1);else _modalWeekDays.push(i);
  _modalWeekDays.sort((a,b)=>a-b);
  _renderModalWeekDays();
}

let _savedLetterSlot=''; // сохраняем букву при переключении типа

function skillsSelectType(type){
  const previousType=document.getElementById('skillsModalType').value||'physical';
  const textarea=document.getElementById('skillsModalEx');
  const intensity=document.getElementById('skillsModalWeekIntensity')?.value||'none';
  if(previousType==='mental'&&type!=='mental')_skillsPatternSaveActiveSteps();
  else if(previousType!=='mental'&&type==='mental'&&textarea)_modalEx[intensity]=textarea.value;
  document.getElementById('skillsModalType').value=type;
  const phys=document.getElementById('skillsTypePhysical');const ment=document.getElementById('skillsTypeMental');
  if(!phys||!ment)return;
  const lw=document.getElementById('skillsSlotLettersRow');const dw=document.getElementById('skillsSlotDigitsRow');
  const exRow=document.getElementById('skillsModalExRow');
  const exLabel=document.getElementById('skillsModalExLabel');const exInp=document.getElementById('skillsModalEx');
  if(type==='physical'){
    phys.style.border='1px solid var(--ab)';phys.style.background='var(--a2)';phys.style.color='var(--a)';
    ment.style.border='1px solid var(--bd)';ment.style.background='var(--c2)';ment.style.color='var(--t2)';
    if(lw)lw.style.display='';if(dw)dw.style.display='none';
    if(exRow)exRow.style.display='';
    if(exLabel)exLabel.textContent='Упражнения (через запятую или нумерованным списком)';
    if(previousType==='mental'&&textarea)textarea.value=_modalEx[intensity]||'';
    // Восстанавливаем сохранённую букву (если была)
    skillsModalSelectSlot(_savedLetterSlot||'');
    if(exLabel)exLabel.textContent='Упражнения (через запятую или нумерованным списком)';
    if(exInp)exInp.placeholder='Жим, Разводка, Трицепс...\nили:\n1) Жим\n2) Разводка\n3) Трицепс';
    const ps=document.getElementById('skillsPatternSection');if(ps)ps.style.display='none';
  }else{
    // Сохраняем текущую букву перед переходом на умственный
    const curSlot=document.getElementById('skillsModalCycleSlot').value;
    if(/^[A-Z]$/.test(curSlot))_savedLetterSlot=curSlot;
    ment.style.border='1px solid var(--ab)';ment.style.background='var(--a2)';ment.style.color='var(--a)';
    phys.style.border='1px solid var(--bd)';phys.style.background='var(--c2)';phys.style.color='var(--t2)';
    if(lw)lw.style.display='none';if(dw)dw.style.display='';
    if(exRow)exRow.style.display='';
    if(exLabel)exLabel.textContent='Шаги / подзадачи';
    if(previousType!=='mental'&&textarea)textarea.value='';
    const ps=document.getElementById('skillsPatternSection');if(ps)ps.style.display='';
    const ir=document.getElementById('skillsIntensityRow');if(ir)ir.style.display='none';
    skillsModalSelectDigitSlot('');
    if(exInp)exInp.placeholder='Прочитать главу 1, сделать конспект, повторить...\nили:\n1) Прочитать главу\n2) Конспект\n3) Повторение';
  }
}

function openSkillsModal(editId){const skb=document.getElementById('skillsDelBtn');if(skb)skb.style.display=editId?'':'none';
  _skillsModalFiles=[];_modalWeekDays=[];
  _tempCycleLetters=[];_tempCycleDigits=[];_savedLetterSlot='';
  _modalEx={heavy:'',light:'',none:''};
  _skillsPatternRows=[];_skillsPatternActiveIndex=-1;
  const patternRatio=document.getElementById('skillsPatternRatio');
  if(patternRatio)patternRatio.value='';
  _skillsPatternRender();
  document.getElementById('skillsModalId').value=editId||'';
  document.getElementById('skillsModalTitle').textContent=editId?'редактировать шаблон':'новый шаблон';
  document.getElementById('skillsModalName').value='';
  document.getElementById('skillsModalEx').value='';
  document.getElementById('skillsModalPreviews').innerHTML='';
  document.getElementById('skillsModalFiles').value='';
  _renderModalSlotButtons('');_renderModalDigitButtons('');_renderModalWeekDays();
  // Синхронизируем переключатель тяж/лёгк с текущим значением
  const fwEl=document.getElementById('cycleFirstWeekToggle');
  if(fwEl){
    const isH=cycleFirstWeekHeavy;
    fwEl.dataset.val=isH?'heavy':'light';
    const hw=document.getElementById('cfwHeavy');const lw=document.getElementById('cfwLight');
    if(hw){hw.style.background=isH?'rgba(232,108,58,0.12)':'var(--c2)';hw.style.borderColor=isH?'rgba(232,108,58,0.5)':'var(--bd)';hw.style.color=isH?'#E86C3A':'var(--t2)';}
    if(lw){lw.style.background=isH?'var(--c2)':'rgba(45,212,191,0.08)';lw.style.borderColor=isH?'var(--bd)':'rgba(45,212,191,0.4)';lw.style.color=isH?'var(--t2)':'#2dd4bf';}
  }
  skillsSelectType('physical');
  if(editId){
    const t=skillTemplates.find(x=>x.id===+editId);
    if(t){
      document.getElementById('skillsModalName').value=t.name||'';
      // Загружаем упражнения во все 3 слота
      function _toStr(arr){if(!arr||!arr.length)return '';return /^\d+[.)]/.test(arr[0])?arr.join('\n'):arr.join('\n');}
      _modalEx.heavy=_toStr(t.exercisesHeavy||[]);
      _modalEx.light=_toStr(t.exercisesLight||[]);
      _modalEx.none=_toStr(t.exercisesNone||(t.weekIntensity==='none'||!t.weekIntensity?t.exercises||[]:[]) );
      // Если старый формат — кладём exercises в нужный слот
      if(!t.exercisesHeavy&&!t.exercisesLight&&!t.exercisesNone){
        const wi=t.weekIntensity||'none';
        _modalEx[wi]=_toStr(t.exercises||[]);
      }
      const _wi=t.weekIntensity||'none';
      document.getElementById('skillsModalWeekIntensity').value=_wi; // reset stale prev before skillsSetWeekIntensity
      document.getElementById('skillsModalEx').value=_modalEx[_wi]||'';
      _skillsModalFiles=(t.media||[]).map(m=>({...m}));renderSkillsModalPreviews();
      _modalWeekDays=Array.isArray(t.weekDays)?[...t.weekDays]:[];
      _renderModalWeekDays();
      skillsSelectType(t.skillType||'physical');
      if(t.skillType==='mental'){skillsModalSelectDigitSlot(t.cycleSlot||'');}
      else{_savedLetterSlot=t.cycleSlot||'';skillsModalSelectSlot(t.cycleSlot||'');}
      // Паттерн недели (умственное): наполняем модалку из шаблона
      const patternWrap=document.getElementById('skillsPatternWrap');
      const ratioInp=document.getElementById('skillsPatternRatio');
      if(patternWrap&&ratioInp&&t.skillType==='mental'){
        _skillsPatternRows=[];
        const cats=(t.weekCategories||[]);
        const pat=(t.weekPattern||[]);
        const n=Math.min(cats.length,pat.length);
        const exsByCat=(t.exercisesByCategory||[]);
        for(let i=0;i<n;i++){
          _skillsPatternRows.push({
            label:cats[i]||'',
            steps:Array.isArray(exsByCat[i])?exsByCat[i].join('\n'):(exsByCat[i]||'')
          });
        }
        if(!_skillsPatternRows.length&&(t.exercises||[]).length){
          _skillsPatternRows.push({label:'Основное',steps:t.exercises.join('\n')});
        }
        _skillsPatternActiveIndex=_skillsPatternRows.length?0:-1;
        _skillsPatternRender();
        ratioInp.value=(pat.length?pat.join(':'):_skillsPatternRows.length?'1':'');
        document.getElementById('skillsModalEx').value=_skillsPatternRows[0]?.steps||'';
        const label=document.getElementById('skillsModalExLabel');
        if(label)label.textContent=_skillsPatternRows.length
          ?'Шаги / подзадачи — '+(_skillsPatternRows[0].label||'категория 1')
          :'Шаги / подзадачи';
      }
      skillsSetWeekIntensity(t.weekIntensity||'none');
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
function _parseExStr(raw){if(!raw||!raw.trim())return [];const r=raw.trim();if(/\d+[.)]\s/.test(r))return r.split(/\n/).map(s=>s.trim()).filter(Boolean);return r.split(/\n|,/).map(s=>s.trim()).filter(Boolean);}
function confirmSkillsModal(){
  const name=document.getElementById('skillsModalName').value.trim();
  if(!name){flash('Заполни название');return;}
  // Сохраняем текущий textarea в _modalEx перед сбором данных
  const curI=document.getElementById('skillsModalWeekIntensity').value||'none';
  const skillType=document.getElementById('skillsModalType').value||'physical';
  const ta=document.getElementById('skillsModalEx');
  if(skillType==='mental')_skillsPatternSaveActiveSteps();
  else if(ta)_modalEx[curI]=ta.value;
  // Парсим все три варианта
  const exercisesHeavy=_parseExStr(_modalEx.heavy);
  const exercisesLight=_parseExStr(_modalEx.light);
  const exercisesNone=_parseExStr(_modalEx.none);
  const editId=document.getElementById('skillsModalId').value;
  const cycleSlot=document.getElementById('skillsModalCycleSlot').value;
  // Mental templates store steps inside pattern categories, not in the general list.
  const exercises=skillType==='mental'?[]:exercisesHeavy.length?exercisesHeavy:exercisesLight.length?exercisesLight:exercisesNone;
  const weekIntensity=curI;
  const weekDays=[..._modalWeekDays];
  const media=_skillsModalFiles.map(m=>({dataUrl:m.dataUrl,type:m.type,name:m.name}));
  // Паттерн недели (умственное) — собираем из модалки
  const catInps=document.querySelectorAll('#skillsPatternWrap input.field-inp');
  const tplCats=[];
  const tplSteps=[];
  for(let i=0;i<catInps.length;i++){
    tplCats.push(catInps[i].value.trim());
    _skillsPatternRows[i].label=catInps[i].value.trim();
    tplSteps.push(_skillsPatternRows[i]?.steps||'');
  }
  const ratioInp=document.getElementById('skillsPatternRatio');
  let tplRatio='';
  if(ratioInp)tplRatio=ratioInp.value.trim();
  const tplRatioArray=tplRatio.split(':').map(Number).filter(n=>!isNaN(n)&&n>0);
  if(editId){const t=skillTemplates.find(x=>x.id===+editId);if(t){t.name=name;t.exercises=exercises;t.exercisesHeavy=exercisesHeavy;t.exercisesLight=exercisesLight;t.exercisesNone=exercisesNone;t.media=media;t.cycleSlot=cycleSlot;t.skillType=skillType;t.weekIntensity=weekIntensity;t.weekDays=weekDays;t.weekCategories=tplCats;t.weekPattern=tplRatioArray;t.weekPatternStart=skillType==='mental'&&tplRatioArray.length?(t.weekPatternStart||nowDK()):'';t.exercisesByCategory=tplSteps.map(s=>s? s.split('\n').map(x=>x.trim()).filter(Boolean):[]);}}
  else{skillTemplates.push({id:nid++,name,exercises,exercisesHeavy,exercisesLight,exercisesNone,media,cycleSlot,skillType,weekIntensity,weekDays,created:nowDK(),days:[],weekCategories:tplCats,weekPattern:tplRatioArray,weekPatternStart:skillType==='mental'&&tplRatioArray.length?nowDK():'',exercisesByCategory:tplSteps.map(s=>s? s.split('\n').map(x=>x.trim()).filter(Boolean):[])});LS.s('nid',nid);}
  LS.s('sportTemplates',skillTemplates);_tempCycleLetters=[];_tempCycleDigits=[];closeSkillsModal();syncSkillsToToday();renderSkills();renderCycleBlock();
}

function delSkillsTemplate(id) { deleteItem(skillTemplates, 'sportTemplates', id, renderSkills); }
function toggleSkillsDay(tplId,dayIdx){const t=skillTemplates.find(x=>x.id===tplId);if(!t)return;if(!Array.isArray(t.weekDays))t.weekDays=[];const i=t.weekDays.indexOf(dayIdx);if(i>=0)t.weekDays.splice(i,1);else t.weekDays.push(dayIdx);LS.s('sportTemplates',skillTemplates);renderSkills();if(curPage==='week')buildWeek();}

function syncSkillsToToday(){
  // навыки теперь отображаются через шаблонный вид карточки, не через tasks
  LS.s('sportTemplates',skillTemplates);
}


let skillsCollapsed={};
function toggleSkillsCollapse(id){
  skillsCollapsed[id]=!skillsCollapsed[id];
  const card=document.getElementById('skills-tpl-'+id);
  const body=card?.nextElementSibling;
  const preview=card?.querySelector('.skills-ex-preview');
  const toggle=card?.querySelector('button');
  const collapsed=skillsCollapsed[id];
  animateCollapse(body,collapsed,'block');
  animateCollapse(preview,collapsed,'block');
  if(toggle)toggle.textContent=collapsed?'▸':'▾';
}
function skillsOpenMedia(tplId,mi){const t=skillTemplates.find(x=>x.id===tplId);if(!t||!t.media)return;const m=t.media[mi];if(!m)return;const existing=document.getElementById('skillsMediaLB');if(existing)existing.remove();const lb=document.createElement('div');lb.id='skillsMediaLB';lb.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.93);z-index:500;display:flex;align-items:center;justify-content:center';lb.onclick=()=>{lb.remove();unlockBodyScroll();};lb.innerHTML=m.type==='video'?`<video src="${m.dataUrl}" controls autoplay style="max-width:96vw;max-height:88vh;border-radius:10px"></video>`:`<img src="${m.dataUrl}" style="max-width:96vw;max-height:88vh;border-radius:10px;object-fit:contain">`;document.body.appendChild(lb);lockBodyScroll();}
function navToWeekTplItem(elId){
  const btn=getNavBtn('week');
  goPage('week',btn);
  if(typeof weekOffset!=='undefined'&&weekOffset!==0){weekOffset=0;}
  if(typeof buildWeek==='function')buildWeek();
  setTimeout(()=>{
    const dow=(new Date().getDay()+6)%7;
    if(typeof scrollToCard==='function')scrollToCard(dow);
    const todayKey=dk(new Date());
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
  openModal('trainParamModal');
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
  const _todayKey=nowDK();
  const _todaySlots=_slotsForDate(_todayKey);
  const _todayTpls=templatesForDate(_todayKey);
  const isRestDay=!_todaySlots.length&&!_todayTpls.length;

  const renderTpl=t=>{
    const collapsed=!!skillsCollapsed[t.id];const cs=t.cycleSlot||'';const meta=cs?_slotMeta(cs):null;
    const isActive=_todayTpls.some(x=>x.id===t.id)||(!isRestDay&&cs&&_todaySlots.includes(cs));
    const sType=t.skillType||'physical';
    const slotBadge=cs&&meta?`<div style="font-family:var(--mono);font-size:10px;font-weight:500;min-width:20px;height:20px;padding:0 5px;border-radius:5px;border:0.5px solid ${meta.color}66;background:${meta.bg};color:${meta.color};flex-shrink:0;display:flex;align-items:center;justify-content:center">${cs}</div>`:`<div style="font-family:var(--mono);font-size:10px;min-width:20px;height:20px;padding:0 5px;border-radius:5px;border:0.5px solid var(--bd);background:var(--c2);color:var(--t3);flex-shrink:0;display:flex;align-items:center;justify-content:center">—</div>`;
    const typeBadgeStyle=sType==='mental'?`border:0.5px solid rgba(167,139,250,0.35);background:rgba(167,139,250,0.08);color:var(--purple)`:`border:0.5px solid rgba(45,212,191,0.3);background:var(--a3);color:var(--a)`;
    const typeBadge=`<div style="font-family:var(--mono);font-size:9px;font-weight:700;width:20px;height:20px;border-radius:5px;${typeBadgeStyle};flex-shrink:0;display:flex;align-items:center;justify-content:center">T</div>`;
    const wdayBtns=SKILLS_WDAYS.map((d,i)=>'<div onclick="toggleSkillsDay('+t.id+','+i+')" style="font-family:var(--mono);font-size:10px;padding:4px 10px;border-radius:7px;cursor:pointer;user-select:none;transition:.12s;background:'+((t.weekDays||[]).includes(i)?'var(--a2)':'var(--c2)')+';border:1px solid '+((t.weekDays||[]).includes(i)?'var(--ab)':'var(--bd)')+';color:'+((t.weekDays||[]).includes(i)?'var(--a)':'var(--t3)')+'">'+d+'</div>').join('');
    const wType=_getWeekIntensity(nowDK());
    const curExs=t.exercisesHeavy&&t.exercisesHeavy.length&&t.exercisesLight&&t.exercisesLight.length
      ?(wType==='heavy'?t.exercisesHeavy:t.exercisesLight)
      :sType==='mental'?_applyWeekPattern(t,nowDK()).exercises:(t.exercises||[]);
    const activeBorder=isActive&&meta?`;border-color:${meta.color}55`:'';
    return `<div id="skills-tpl-${t.id}" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:0.5px solid rgba(255,255,255,0.05);cursor:default;transition:background .1s${activeBorder}" onmouseenter="this.style.background='rgba(45,212,191,0.03)'" onmouseleave="this.style.background=''">
      ${typeBadge}
      ${slotBadge}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:#d0d0d0;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
        ${curExs.length?`<div class="skills-ex-preview" style="display:${collapsed?'none':'block'};font-size:10px;color:#383838;margin-top:1px;font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${curExs.join(' · ')}</div>`:''}
        ${sType==='physical'&&cs&&_slotHasIntensityPair(cs)?`<div style="margin-top:3px">${_intensityBadge(nowDK(),'physical')}</div>`:''}
        ${sType==='mental'?_patternBadge(t,nowDK()):''}
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <button onclick="toggleSkillsCollapse(${t.id})" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);color:#2a2a2a;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .12s" onmouseenter="this.style.background='rgba(45,212,191,0.1)';this.style.borderColor='rgba(45,212,191,0.3)';this.style.color='#2dd4bf'" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)';this.style.color='#2a2a2a'">${collapsed?'▸':'▾'}</button>
        <button onclick="openSkillDashboard(${t.id})" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);color:#555;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .12s" onmouseenter="this.style.background='rgba(45,212,191,0.1)';this.style.borderColor='rgba(45,212,191,0.3)';this.style.color='#2dd4bf'" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)';this.style.color='#555'" title="Дашборд">◧</button>
        <button onclick="openSkillsModal(${t.id})" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);color:#2a2a2a;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:all .12s" onmouseenter="this.style.background='rgba(45,212,191,0.1)';this.style.borderColor='rgba(45,212,191,0.3)';this.style.color='#2dd4bf'" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.07)';this.style.color='#2a2a2a'">⊞</button>

      </div>
    </div>
    <div class="skills-collapse-body" style="display:${collapsed?'none':'block'};padding-left:30px">${(t.media&&t.media.length)?`<div style="display:flex;flex-wrap:wrap;gap:5px;padding-bottom:6px">${t.media.map((m,mi)=>`<div onclick="skillsOpenMedia(${t.id},${mi})" style="width:52px;height:52px;border-radius:7px;overflow:hidden;border:1px solid var(--bd);cursor:pointer;flex-shrink:0;background:var(--c2);position:relative">${m.type==='video'?`<video src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(0,0,0,0.3)">▶</div>`:`<img src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover">`}</div>`).join('')}</div>`:''}</div>`;
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
            ${uiIconSvg('stethoscope')}
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
            ${uiIconSvg('pin')}
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
  const WDAY_NAMES=DAYS7;

  const exHtml=(t.exercises&&t.exercises.length)
    ?t.exercises.map(e=>`<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:0.5px solid var(--bd)">
        <span style="color:${accentColor};font-size:12px;margin-top:1px;flex-shrink:0">▸</span>
        <span style="font-size:13px;color:var(--t2);line-height:1.45">${e}</span>
      </div>`).join('')
    :`<div style="font-size:12px;color:var(--t3);font-family:var(--mono);padding:6px 0">упражнения не добавлены</div>`;

  const wdayHtml=WDAY_NAMES.map((d,i)=>`<div style="font-family:var(--mono);font-size:11px;padding:4px 10px;border-radius:7px;background:${(t.weekDays||[]).includes(i)?accentBg:'var(--c2)'};border:0.5px solid ${(t.weekDays||[]).includes(i)?accentColor+'55':'var(--bd)'};color:${(t.weekDays||[]).includes(i)?accentColor:'var(--t3)'}">${d}</div>`).join('');

  const mediaHtml=(t.media&&t.media.length)
    ?`<div style="margin-top:14px"><div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">медиа</div>
       <div style="display:flex;flex-wrap:wrap;gap:6px">${t.media.map((m,mi)=>`<div onclick="skillsOpenMedia(${id},${mi})" style="width:60px;height:60px;border-radius:8px;overflow:hidden;border:1px solid var(--bd);cursor:pointer;flex-shrink:0;background:var(--c1);position:relative">${m.type==='video'?`<video src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover"></video><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(0,0,0,0.35)">▶</div>`:`<img src="${m.dataUrl}" style="width:100%;height:100%;object-fit:cover">`}</div>`).join('')}</div></div>`
    :'';

  const savedDesc=t.desc||'';

  const overlay=document.createElement('div');
  overlay.id='skillDashOverlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:400;display:flex;align-items:flex-end;justify-content:center;touch-action:pan-y';
  overlay.onclick=e=>{if(e.target===overlay)closeSkillDash();};
  overlay.innerHTML=`
    <div style="background:var(--c1);border:1px solid var(--bd);border-radius:18px 18px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:20px 18px 32px;animation:su .2s ease">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <div style="width:40px;height:40px;border-radius:10px;background:${accentBg};border:0.5px solid ${accentColor}44;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:13px;font-weight:700;color:${accentColor};flex-shrink:0">${cs||'T'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:500;color:var(--t);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.name}</div>
          <div style="font-size:11px;color:var(--t2);font-family:var(--mono);margin-top:2px">${typeLabel}${cs?' · слот '+cs:''}</div>
        </div>
        <button onclick="closeSkillDash()" style="width:28px;height:28px;border-radius:8px;background:var(--bd);border:0.5px solid var(--bd);color:var(--t2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">
        <div style="background:var(--c2);border-radius:10px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">тип</div>
          <div style="font-size:14px;font-weight:500;color:${accentColor}">${typeLabel}</div>
        </div>
        <div style="background:var(--c2);border-radius:10px;padding:10px 12px">
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">упражнений</div>
          <div style="font-size:14px;font-weight:500;color:var(--t)">${(t.exercises||[]).length}</div>
        </div>
      </div>

      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">дни недели</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:18px">${wdayHtml}</div>

      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">упражнения / шаги</div>
      <div style="margin-bottom:18px">${exHtml}</div>

      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">заметки</div>
      <textarea id="skillDashDesc_${id}" placeholder="Цель, план, прогресс, ссылки..." style="width:100%;background:var(--c2);border:0.5px solid var(--bd);border-radius:10px;padding:10px 12px;font-size:13px;color:var(--t2);font-family:var(--sans);resize:none;min-height:90px;outline:none;box-sizing:border-box" oninput="saveSkillDashDesc(${id},this.value)">${savedDesc}</textarea>

      ${mediaHtml}

      <div style="margin-top:18px;display:flex;flex-direction:column;gap:8px">
        <button onclick="saveSkillDashDescBtn(${id})" style="width:100%;padding:10px;border-radius:10px;background:rgba(45,212,191,0.15);border:0.5px solid rgba(45,212,191,0.4);color:rgba(45,212,191,1);font-size:13px;cursor:pointer;transition:.12s" onmouseenter="this.style.background='rgba(45,212,191,0.25)'" onmouseleave="this.style.background='rgba(45,212,191,0.15)'">сохранить</button>
        <button onclick="closeSkillDash();openSkillsModal(${id})" style="width:100%;padding:10px;border-radius:10px;background:rgba(45,212,191,0.07);border:0.5px solid rgba(45,212,191,0.2);color:rgba(45,212,191,0.7);font-size:13px;cursor:pointer;transition:.12s" onmouseenter="this.style.background='rgba(45,212,191,0.14)'" onmouseleave="this.style.background='rgba(45,212,191,0.07)'">редактировать шаблон</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  lockBodyScroll();
}

function closeSkillDash(){const m=document.getElementById('skillDashOverlay');if(m)m.remove();unlockBodyScroll();}

function saveSkillDashDesc(id,val){
  const t=skillTemplates.find(x=>x.id===id);if(!t)return;
  t.desc=val;
  LS.s('sportTemplates',skillTemplates);
}
function saveSkillDashDescBtn(id){
  const ta=document.getElementById('skillDashDesc_'+id);
  if(!ta)return;
  saveSkillDashDesc(id,ta.value);
  flash('сохранено');
}
