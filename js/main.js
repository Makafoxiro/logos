// ═══ MODULE: main.js (calendar + settings + nav + init + theme + lang) ═══

// ══ CALENDAR ═══════════════════════════════════════════
function openCal(){calVD=new Date();renderCal();openModal('calModal');}
function closeCal(){closeModal('calModal');}
function shiftCalM(n){calVD.setMonth(calVD.getMonth()+n);renderCal();}
function renderCal(){
  const y=calVD.getFullYear(),m=calVD.getMonth();
  document.getElementById('calML').textContent=`${MSHORT[m].toUpperCase()} ${y}`;
  const grid=document.getElementById('calGrid');
  grid.innerHTML=DAYS7.map(d=>`<div class="clbl">${d}</div>`).join('');
  const first=new Date(y,m,1),startDow=(first.getDay()+6)%7;
  // Use selected week (weekOffset) not real current week
  const selectedMon=getWeekMonday(weekOffset);
  const selWeekKeys=[];for(let i=0;i<7;i++){const d=new Date(selectedMon);d.setDate(selectedMon.getDate()+i);selWeekKeys.push(dk(d));}
  for(let i=0;i<startDow;i++){const p=new Date(y,m,1-startDow+i);grid.innerHTML+=`<div class="cday other">${p.getDate()}</div>`;}
  const days=new Date(y,m+1,0).getDate();
  for(let d=1;d<=days;d++){
    const date=new Date(y,m,d),key=dk(date);
    const inSelWeek=selWeekKeys.includes(key);
    const isT=key===nowDK();
    const has=(comp[key]&&Object.values(comp[key]).filter(Boolean).length>0)||(tasks[key]&&(tasks[key].length>0));
    const cls=['cday',isT?'ctoday':'',inSelWeek?'crow':'',has?'has':''].filter(Boolean).join(' ');
    grid.innerHTML+=`<div class="${cls}" onclick="calPickWeekRow(${y},${m},${d})">${d}</div>`;
  }
}
function calPickWeekRow(y,m,d){
  const clicked=new Date(y,m,d);
  const clickedMon=getMonday(clicked);
  const curMon=getMonday(new Date());
  // Calculate week offset
  const diffMs=clickedMon.getTime()-curMon.getTime();
  const diffWeeks=Math.round(diffMs/(7*24*60*60*1000));
  closeCal();
  weekOffset=diffWeeks;
  if(curPage!=='week')goPage('week',getNavBtn('week'));
  else buildWeek();
}

// ══ SETTINGS ═══════════════════════════════════════════
function toggleAutoSave(){
  autoSaveOn=!autoSaveOn;
  LS.s('autoSaveOn',autoSaveOn);
  if(autoSaveOn){
    if(typeof gdriveIsAuthed==='function'&&gdriveIsAuthed()){
      startAutoSave();
      flash('Автосохранение в Drive включено');
    } else {
      flash('Войдите в Google Drive для автосохранения');
      autoSaveOn=false;
      LS.s('autoSaveOn',false);
    }
  } else {
    stopAutoSave();
    flash('Автосохранение выключено');
  }
  renderSettings();
}
function renderSettings(){
  const mt=document.getElementById('morningT');
  const et=document.getElementById('eveningT');
  if(mt&&mt.type!=='hidden') mt.value=mTime;
  if(et&&et.type!=='hidden') et.value=eTime;
  const nt=document.getElementById('notifyTgl');
  if(nt&&nt.classList) nt.className='tgl'+(notifyOn?' on':'');
  // Синхронизируем кнопки темы с реальным состоянием
  const db=document.getElementById('themeDarkBtn');
  const lb=document.getElementById('themeLightBtn');
  if(db){db.style.background=appTheme!=='light'?'var(--a2)':'var(--c2)';db.style.borderColor=appTheme!=='light'?'var(--ab)':'var(--bd)';db.style.color=appTheme!=='light'?'var(--a)':'var(--t2)';}
  if(lb){lb.style.background=appTheme==='light'?'var(--a2)':'var(--c2)';lb.style.borderColor=appTheme==='light'?'var(--ab)':'var(--bd)';lb.style.color=appTheme==='light'?'var(--a)':'var(--t2)';}
  // Синхронизируем кнопки шрифта
  document.querySelectorAll('.font-opt').forEach(el=>{
    el.classList.toggle('active', el.dataset.font===appFont);
  });
  // Синхронизируем автосохранение
  const asTgl=document.getElementById('autoSaveTgl');
  if(asTgl) asTgl.className='tgl'+(autoSaveOn?' on':'');
  renderNotifSettings();
  renderRemindersCard();
}


function yearlyCleanup(){
  const now=new Date();
  const m=now.getMonth(); // 0=Jan
  const d=now.getDate();
  // Run only Jan 1 – Feb 15
  if(!((m===0)||(m===1&&d<=15)))return;
  const prevYear=now.getFullYear()-1;
  const prevYearStr=String(prevYear);
  let changed=false;
  // Clean comp
  Object.keys(comp).forEach(k=>{if(k.startsWith(prevYearStr)){delete comp[k];changed=true;}});
  if(changed)LS.s('comp',comp);
  // Clean tasks
  let tChanged=false;
  Object.keys(tasks).forEach(k=>{if(k.startsWith(prevYearStr)){delete tasks[k];tChanged=true;}});
  if(tChanged)LS.s('tasks',tasks);
  if(changed||tChanged)console.log('ЛОГОС: данные за '+prevYear+' год удалены');
}
yearlyCleanup();


function clearToday(){showConfirm('Сбросить задачи сегодня?',()=>{tasks[nowDK()]=[];LS.s('tasks',tasks);buildWeek();});}
function clearAll(){showConfirm('⚠️ Сбросить АБСОЛЮТНО ВСЁ? Все данные, настройки и история будут удалены безвозвратно.',()=>{localStorage.clear();location.reload();});}
const WATCH_TYPES=[
  {v:'film',l:'🎬 Фильм'},{v:'series',l:'📺 Сериал'},{v:'anime',l:'✨ Аниме'},
  {v:'cartoon',l:'🎨 Мульт'},{v:'manga',l:'📖 Манга'},{v:'dorama',l:'🌸 Дорама'},{v:'book',l:'📚 Книги'}
];
const WATCH_STATUSES=[
  {v:'want',l:'🔖 Хочу'},{v:'watching',l:'▶ Смотрю'},{v:'done',l:'✅ Готово'}
];
function watchPickType(val,prefix){
  const hid=document.getElementById(prefix+'Type');if(hid)hid.value=val;
  WATCH_TYPES.forEach(t=>{
    const el=document.getElementById(prefix+'TypeBtn_'+t.v);if(!el)return;
    el.classList.toggle('active',t.v===val);
  });
}
function watchPickStatus(val,prefix){
  const hid=document.getElementById(prefix+'Status');if(hid)hid.value=val;
  WATCH_STATUSES.forEach(s=>{
    const el=document.getElementById(prefix+'StatusBtn_'+s.v);if(!el)return;
    el.classList.toggle('active',s.v===val);
  });
}
function openWatchModal(){
  document.getElementById('watchName').value='';
  document.getElementById('watchDate').value='';
  watchPickType('film','watch');
  watchPickStatus('want','watch');
  openModal('watchModal');
}
function closeWatchModal(){closeModal('watchModal');}
function confirmAddWatch(){
  const name=document.getElementById('watchName').value.trim();if(!name)return;
  watchlist.push({id:nid++,name,type:document.getElementById('watchType').value,status:document.getElementById('watchStatus').value,date:document.getElementById('watchDate').value||null});
  LS.s('watchlist',watchlist);LS.s('nid',nid);closeWatchModal();renderMemoBody();
}
function openWatchEditModal(id){
  const w=watchlist.find(x=>x.id===id);if(!w)return;
  document.getElementById('watchEditId').value=id;
  document.getElementById('watchEditName').value=w.name;
  document.getElementById('watchEditDate').value=w.date||'';
  watchPickType(w.type||'film','watchEdit');
  watchPickStatus(w.status||'want','watchEdit');
  openModal('watchEditModal');
}
function closeWatchEditModal(){closeModal('watchEditModal');}
function saveWatchEdit(){
  const id=+document.getElementById('watchEditId').value;
  const w=watchlist.find(x=>x.id===id);if(!w)return;
  w.name=document.getElementById('watchEditName').value.trim()||w.name;
  w.date=document.getElementById('watchEditDate').value||null;
  w.type=document.getElementById('watchEditType').value;
  w.status=document.getElementById('watchEditStatus').value;
  LS.s('watchlist',watchlist);
  closeWatchEditModal();renderMemoBody();
}
function delWatch(id) { deleteItem(watchlist, 'watchlist', id, renderMemoBody); }
function updateWatchStatus(id,status){const w=watchlist.find(x=>x.id===id);if(w){w.status=status;LS.s('watchlist',watchlist);}renderMemoBody();}


// ══ WATCH SEARCH ═══════════════════════════════════════
let watchSearchIgnore=[];
function openWatchSearchModal(){
  document.getElementById('watchSearchInp').value='';
  document.getElementById('watchSearchResults').innerHTML='';
  openModal('watchSearchModal');
  setTimeout(()=>document.getElementById('watchSearchInp').focus(),100);
}
function closeWatchSearchModal(){closeModal('watchSearchModal');}
function doWatchSearch(q){
  const res=document.getElementById('watchSearchResults');
  if(!q.trim()){res.innerHTML='';return;}
  const ql=q.toLowerCase();
  const found=watchlist.filter(w=>w.name.toLowerCase().includes(ql));
  if(!found.length){res.innerHTML='<div style="font-size:13px;color:var(--t3);padding:6px 0">Не найдено</div>';return;}
  // Detect duplicates by normalized name
  const nameMap={};
  found.forEach(w=>{const n=w.name.toLowerCase().trim();if(!nameMap[n])nameMap[n]=[];nameMap[n].push(w);});
  const typeLabel={film:'Фильм',series:'Сериал',anime:'Аниме',cartoon:'Мульт',manga:'Манга',dorama:'Дорама'};
  const sColor={want:'var(--t2)',watching:'var(--amber)',done:'var(--a)'};
  const sLabel={want:'хочу',watching:'смотрю',done:'посмотрел'};
  let html='';
  found.forEach(w=>{
    const dupes=nameMap[w.name.toLowerCase().trim()];
    const isDupe=dupes&&dupes.length>1;
    const ignored=watchSearchIgnore.includes(w.id);
    html+=`<div style="background:var(--c1);border:1px solid ${isDupe&&!ignored?'var(--amber)':'var(--bd)'};border-radius:12px;padding:10px 12px;margin-bottom:7px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${w.name}</div>
          <div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:9px;color:var(--t3)">${typeLabel[w.type]||w.type}</span>
            <span style="font-family:var(--mono);font-size:9px;color:${sColor[w.status]}">${sLabel[w.status]}</span>
            ${isDupe&&!ignored?'<span style="font-family:var(--mono);font-size:9px;color:var(--amber)">⚠ дубликат</span>':''}
          </div>
        </div>
        <button onclick="delWatchFromSearch(${w.id})" style="background:none;border:none;color:var(--t3);font-size:16px;cursor:pointer;padding:2px 5px">✕</button>
      </div>
      ${isDupe&&!ignored?`<div style="display:flex;gap:6px;margin-top:7px"><button onclick="delWatchFromSearch(${w.id})" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);border-radius:7px;color:var(--red);font-family:var(--mono);font-size:9px;padding:4px 10px;cursor:pointer">удалить</button><button onclick="ignoreWatchDupe(${w.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t2);font-family:var(--mono);font-size:9px;padding:4px 10px;cursor:pointer">оставить</button></div>`:''}
    </div>`;
  });
  res.innerHTML=html;
}
function delWatchFromSearch(id){
  watchlist=watchlist.filter(x=>x.id!==id);
  LS.s('watchlist',watchlist);
  const q=document.getElementById('watchSearchInp').value;
  doWatchSearch(q);
}
function ignoreWatchDupe(id){
  if(!watchSearchIgnore.includes(id))watchSearchIgnore.push(id);
  const q=document.getElementById('watchSearchInp').value;
  doWatchSearch(q);
}

// ══ HOMEWORK EDIT ═══════════════════════════════════════
let hwEditId=null;
function openHwEditModal(id){
  const h=homework.find(x=>x.id===id);if(!h)return;
  hwEditId=id;
  document.getElementById('hwEditSubj').value=h.subj;
  document.getElementById('hwEditTask').value=h.task;
  document.getElementById('hwEditDate').value=h.date||'';
  _hwEditPhotoData=h.photo||null;
  const prev=document.getElementById('hwEditPhotoPreview');
  const img=document.getElementById('hwEditPhotoImg');
  if(_hwEditPhotoData){prev.style.display='block';img.src=_hwEditPhotoData;}
  else{prev.style.display='none';}
  document.getElementById('hwEditPhotoInput').value='';
  openModal('hwEditModal');
}
function closeHwEditModal(){closeModal('hwEditModal');hwEditId=null;_hwEditPhotoData=null;}
function confirmEditHw(){
  if(!hwEditId)return;
  const h=homework.find(x=>x.id===hwEditId);if(!h)return;
  h.subj=document.getElementById('hwEditSubj').value.trim()||h.subj;
  h.task=document.getElementById('hwEditTask').value.trim()||h.task;
  h.date=document.getElementById('hwEditDate').value||'';
  h.photo=_hwEditPhotoData||null;
  LS.s('homework',homework);
  closeHwEditModal();
  renderMemoBody();
}

function exportJSON(){const data={habits,comp,habEnabled:[...habEnabled],tasks,mg,goals,freeGoals,annuals,routine,routineLog,weekRtLog,monthRtLog,yearRtLog,tplDone,health,hLog,supps,meds,weights,passwords,birthdays,homework,notes,watchlist,sportTemplates:skillTemplates,skillTemplates,finLog,finTpl,finPurchases,finDebts,finPieSlices,patches,nid,physDiseases,physParams,mentalParams,morningTime:mTime,eveningTime:eTime,sleepSchedule:LS.g('sleepSchedule',{bed:'23:00',wake:'05:00',naps:[]}),cycleStartDate,cycleStartSlot,cycleFirstWeekHeavy,cycleOverrides,notifCfg:LS.g('notifCfg',{}),remindersCfg:LS.g('remindersCfg',{}),interests:LS.g('interests',{cats:[],items:[]}),finBudget:LS.g('finBudget',0),sleepRem:LS.g('sleepRem',{on:false,time:'22:30'}),aiProfile:LS.g('aiProfile',{}),appTheme,appFont,appLang,autoSaveOn,notifyOn};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`logos_${new Date().toISOString().slice(0,10)}.json`;a.click();}
function importJSON(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);['habits','comp','tasks','mg','goals','freeGoals','annuals','routine','routineLog','weekRtLog','monthRtLog','yearRtLog','tplDone','health','hLog','supps','meds','weights','passwords','birthdays','homework','notes','watchlist','finLog','finTpl','finPurchases','finDebts','finPieSlices','patches','nid','physDiseases','physParams','mentalParams'].forEach(k=>{if(d[k]!==undefined){window[k]=d[k];LS.s(k,d[k]);}});
// ── skillTemplates: fix key mismatch (exported as skillTemplates, stored as sportTemplates) ──
const _tpls=d.sportTemplates||d.skillTemplates;
if(_tpls!==undefined){skillTemplates=_tpls;LS.s('sportTemplates',_tpls);LS.s('skillTemplates',_tpls);}
if(d.habEnabled!==undefined){habEnabled=new Set(d.habEnabled);LS.s('habEnabled',d.habEnabled);}if(d.morningTime!==undefined){mTime=d.morningTime;LS.s('morningTime',mTime);}if(d.eveningTime!==undefined){eTime=d.eveningTime;LS.s('eveningTime',eTime);}if(d.sleepSchedule!==undefined){LS.s('sleepSchedule',d.sleepSchedule);}
if(d.cycleStartDate!==undefined){cycleStartDate=d.cycleStartDate;LS.s('cycleStartDate',cycleStartDate);}
if(d.cycleStartSlot!==undefined){cycleStartSlot=d.cycleStartSlot;LS.s('cycleStartSlot',cycleStartSlot);}
if(d.cycleFirstWeekHeavy!==undefined){cycleFirstWeekHeavy=d.cycleFirstWeekHeavy;LS.s('cycleFirstWeekHeavy',cycleFirstWeekHeavy);}
if(d.cycleOverrides!==undefined){cycleOverrides=d.cycleOverrides;LS.s('cycleOverrides',cycleOverrides);}
if(d.notifCfg!==undefined){LS.s('notifCfg',d.notifCfg);}
if(d.remindersCfg!==undefined){LS.s('remindersCfg',d.remindersCfg);}
if(d.interests!==undefined){LS.s('interests',d.interests);}
if(d.finBudget!==undefined){LS.s('finBudget',d.finBudget);}
if(d.sleepRem!==undefined){LS.s('sleepRem',d.sleepRem);}
if(d.aiProfile!==undefined){LS.s('aiProfile',d.aiProfile);}
if(d.appTheme!==undefined){appTheme=d.appTheme;LS.s('appTheme',d.appTheme);setTheme(d.appTheme);}
if(d.appFont!==undefined){appFont=d.appFont;LS.s('appFont',d.appFont);setFont(d.appFont);}
if(d.appLang!==undefined){appLang=d.appLang;LS.s('appLang',d.appLang);setLang(d.appLang);}
if(d.autoSaveOn!==undefined){autoSaveOn=d.autoSaveOn;LS.s('autoSaveOn',d.autoSaveOn);}
if(d.notifyOn!==undefined){notifyOn=d.notifyOn;LS.s('notifyOn',d.notifyOn);}flash('✓ Данные импортированы');renderCurrent();setTimeout(initNapSessions,100);}catch{flash('Ошибка импорта');}};r.readAsText(f);}

// ══ NAV ════════════════════════════════════════════════
function goPage(name,btn){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  const pg=document.getElementById('pg-'+name);if(pg)pg.classList.add('on');
  if(btn)btn.classList.add('on');
  curPage=name;
  if(name==='memo'&&pinState==='enter'){memoUnlocked=false;curMemoTab='birthdays';}
  renderCurrent();
}
function renderCurrent(){
  updateHeader();
  if(curPage==='today'){if(typeof renderTodayPage==='function')renderTodayPage();}
  else if(curPage==='week')buildWeek();
  else if(curPage==='routine')renderRoutine();
  else if(curPage==='habits')renderHabits();
  else if(curPage==='goals')renderGoals();
  else if(curPage==='health'){renderHealth();checkWeightReminder();}
  else if(curPage==='memo'){renderMemoTabs();renderMemoBody();}
  else if(curPage==='skills'){renderCycleBlock();renderSkills();}
  else if(curPage==='interests')renderInterests();
  else if(curPage==='finance')renderFinance();
  else if(curPage==='settings')renderSettings();
}



function scheduleSleepRem(){if(Notification.permission!=='granted')return;const rem=LS.g('sleepRem',{on:false,time:'22:30'});if(!rem.on)return;const[h,m]=rem.time.split(':').map(Number);const now=new Date();const tgt=new Date(now);tgt.setHours(h,m,0,0);if(tgt<=now)tgt.setDate(tgt.getDate()+1);setTimeout(()=>{new Notification('ЛОГОС',{body:'Время ложиться спать'});scheduleSleepRem();},tgt-now);}

// ══ SWIPE NAVIGATION ═══════════════════════════════════
(function initSwipe(){
  const pages=['today','routine','week','goals','habits','health','skills','interests','finance','memo','settings'];
  let touchStartY=0,touchStartX=0,touchStartTime=0,touchStartEl=null;
  document.addEventListener('touchstart',e=>{
    touchStartY=e.touches[0].clientY;
    touchStartX=e.touches[0].clientX;
    touchStartTime=Date.now();
    touchStartEl=e.target;
  },{passive:true});
  document.addEventListener('touchend',e=>{
    const dy=touchStartY-e.changedTouches[0].clientY;
    const dx=touchStartX-e.changedTouches[0].clientX;
    const dt=Date.now()-touchStartTime;
    // Don't trigger page-swipe if touch started inside the week scroll (user is scrolling day cards)
    if(touchStartEl&&touchStartEl.closest('#weekScroll'))return;
    // horizontal swipe: left = next page, right = prev page
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5&&dt<450){
      const idx=pages.indexOf(curPage);
      const next=dx>0?Math.min(pages.length-1,idx+1):Math.max(0,idx-1);
      if(next!==idx){
        const btn=getNavBtn(pages[next]);
        goPage(pages[next],btn);
      }
    }
  },{passive:true});
})();

// ══ WEIGHT GOAL EDIT ═══════════════════════════════════
function openGoalEdit(){
  const row=document.getElementById('wGoalEditRow');
  const tag=document.getElementById('wTargetTag');
  if(!row)return;
  document.getElementById('wGoalMin').value=health.wMin||71;
  document.getElementById('wGoalMax').value=health.wMax||72;
  tag.style.display='none';
  row.style.display='flex';
  document.getElementById('wGoalMin').focus();
}
function saveGoalEdit(){
  const minV=parseFloat(document.getElementById('wGoalMin').value)||health.wMin;
  const maxV=parseFloat(document.getElementById('wGoalMax').value)||health.wMax;
  health.wMin=Math.min(minV,maxV);
  health.wMax=Math.max(minV,maxV);
  LS.s('health',health);
  cancelGoalEdit();
  renderHealth();
  flash('Цель обновлена');
}
function cancelGoalEdit(){
  const row=document.getElementById('wGoalEditRow');
  const tag=document.getElementById('wTargetTag');
  if(row)row.style.display='none';
  if(tag)tag.style.display='';
}

// ══ CUSTOM SPINNER ══════════════════════════════════════
function spinStep(id,step,dir){
  const el=document.getElementById(id);
  if(!el)return;
  const v=parseFloat(el.value)||0;
  const min=el.min!==''?parseFloat(el.min):-Infinity;
  const max=el.max!==''?parseFloat(el.max):Infinity;
  const dec=String(step).includes('.')?String(step).split('.')[1].length:0;
  const nv=Math.min(max,Math.max(min,+(v+step*dir).toFixed(dec)));
  el.value=nv;
  el.dispatchEvent(new Event('input',{bubbles:true}));
}

// ══ WEIGHT GHOST TEXT ══════════════════════════════════
function updateWeightGhost(){
  const inp=document.getElementById('wInp');
  const ghost=document.getElementById('weightGhost');
  if(!ghost)return;
  ghost.style.display=(inp&&inp.value)?'none':'flex';
}

// ══ DEADLINE NOTIFICATIONS ═════════════════════════════
// Долгосрочная цель = дедлайн > 30 дней от сегодня (или цели жизни с дедлайном)
// Обычная = дедлайн ≤ 30 дней (ежегодные, ДР, ДЗ)

// Цвет для долгосрочных: 30д=зелёный, 15д=лайм, 7д=бледно-жёлтый, 3д=жёлтый, 1д=оранжевый, 0=тёмно-оранж, просроч=красный
// Цвет для обычных: 10д=зелёный, 7д=лайм, 5д=бледно-жёлтый, 3д=жёлтый, 1д=оранжевый, 0=тёмно-оранж, просроч=красный

function getDeadlineColor(days, scale){
  // scale: 'long'(30д), false/'short'(10д), 'week'(7д — вотчлист/патчи), 'hw'(3д — дз)
  if(days===null||days===undefined)return null;
  if(days<0)return '#ef4444';   // красный — просрочено
  if(days===0)return '#ef4444'; // красный — сегодня
  const isLong=scale===true||scale==='long';
  const isWeek=scale==='week';
  const isHW=scale==='hw';
  if(isLong){
    if(days<=1)return '#f97316';  // тёмно-оранжевый
    if(days<=3)return '#fb923c';  // оранжевый
    if(days<=7)return '#fbbf24';  // жёлтый
    if(days<=15)return '#bef264'; // лайм
    if(days<=30)return '#4ade80'; // зелёный
    return null;
  } else if(isHW){
    // ДЗ: шкала 3 дня — 3д=🟢, 2д=🟡, 1д=🟠, 0д=🔴
    if(days===1)return '#f97316'; // тёмно-оранжевый
    if(days===2)return '#fbbf24'; // жёлтый
    if(days===3)return '#4ade80'; // зелёный
    return null;
  } else if(isWeek){
    // Вотчлист, Патчи: шкала 7 дней
    if(days<=1)return '#f97316';  // тёмно-оранжевый
    if(days<=3)return '#fb923c';  // оранжевый
    if(days===4)return '#fbbf24'; // жёлтый
    if(days===5)return '#bef264'; // лайм
    if(days<=7)return '#4ade80';  // зелёный
    return null;
  } else {
    // Обычные краткосрочные (10д)
    if(days<=1)return '#f97316';
    if(days<=3)return '#fb923c';
    if(days<=5)return '#fbbf24';
    if(days<=7)return '#bef264';
    if(days<=10)return '#4ade80';
    return null;
  }
}

function getWorstColor(colors){
  // Порядок от плохого к хорошему
  const order=['#ef4444','#f97316','#fb923c','#fbbf24','#bef264','#4ade80'];
  for(const c of order){
    if(colors.includes(c))return c;
  }
  return colors[0]||'#4ade80';
}

// Собираем все уведомления
function collectNotifications(){
  const now=new Date();
  const notifs=[];

  // ── ДОЛГОСРОЧНЫЕ (шкала 30д): Цели жизни, ДР, Ежегодные ──

  // Цели жизни
  goals.forEach(g=>{
    if(!g.deadline)return;
    const days=daysToDeadline(g.deadline,now);
    if(days===null)return;
    if(days>30)return;
    const color=getDeadlineColor(days,true);
    if(!color)return;
    notifs.push({
      id:'goal_'+g.id, name:g.name, days, color, type:'longterm', icon:'🎯',
      label:days<0?'просрочено':days===0?'сегодня дедлайн':days===1?'завтра дедлайн':'до дедлайна '+days+'д.'
    });
  });

  // Дни рождения — за 15 дней (шкала 'long')
  birthdays.forEach(b=>{
    if(!b.date)return;
    const days=daysToAnnual(b.date,now);
    if(days===null||days===undefined)return;
    if(days>15)return;
    const color=getDeadlineColor(days,true);
    if(!color)return;
    notifs.push({
      id:'bd_'+b.id, name:b.name, days, color, type:'longterm', icon:'🎂',
      label:days===0?'🎉 сегодня ДР!':days===1?'завтра ДР':'через '+days+'д. ДР'
    });
  });

  // Ежегодные напоминания (долгосрочные — шкала 30д)
  annuals.forEach(a=>{
    if(!a.date)return;
    const pd=parseLocalDate(a.date);
    const isFutureYear=pd&&pd.getFullYear()>now.getFullYear();
    const days=isFutureYear?daysToDeadline(a.date,now):daysToAnnual(a.date,now);
    if(days===null||days===undefined)return;
    if(days>30)return;
    const color=getDeadlineColor(days,true);
    if(!color)return;
    notifs.push({
      id:'annual_'+a.id, name:a.name, days, color, type:'longterm', icon:'📅',
      label:days<0?'просрочено':days===0?'сегодня':days===1?'завтра':days+'д.'
    });
  });

  // ── КРАТКОСРОЧНЫЕ (шкала 7д): ДЗ, Вотчлист, Патчи ──

  // Домашние задания (шкала 3 дня)
  homework.forEach(h=>{
    if(!h.date)return;
    const days=daysToDeadline(h.date,now);
    if(days===null)return;
    if(days>3)return;
    const color=getDeadlineColor(days,'hw');
    if(!color)return;
    notifs.push({
      id:'hw_'+h.id, name:h.subj+': '+h.task.slice(0,30), days, color, type:'shortterm', icon:'📚',
      label:days<0?'просрочено':days===0?'сегодня сдать':days===1?'завтра сдать':days+'д. до сдачи'
    });
  });

  // Цели месяца (mg) — недовыполненные, показываем в конце месяца (≤10 дней до конца)
  // При ≤5 днях вместо этого показывается сводное уведомление (см. блок «конец месяца» ниже)
  (function(){
    const monthGoals=getMG().filter(g=>!g.done);
    if(!monthGoals.length)return;
    // Дней до конца текущего месяца
    const endOfMonth=new Date(now.getFullYear(),now.getMonth()+1,0);
    const daysLeft=Math.round((endOfMonth-new Date(now.getFullYear(),now.getMonth(),now.getDate()))/(1000*60*60*24));
    if(daysLeft>10||daysLeft<=5)return; // ≤5 — отдаёт сводный блок «конец месяца»
    const color=getDeadlineColor(daysLeft,false);
    if(!color)return;
    monthGoals.forEach(g=>{
      notifs.push({
        id:'mg_'+g.id, name:g.name, days:daysLeft, color, type:'shortterm', icon:'📌',
        label:daysLeft===0?'конец месяца сегодня':daysLeft===1?'последний день':daysLeft+'д. до конца месяца'
      });
    });
  })();

  // Вотчлист с дедлайном (шкала 7 дней)
  watchlist.forEach(w=>{
    if(!w.date||w.status==='done')return;
    const days=daysToDeadline(w.date,now);
    if(days===null)return;
    if(days>7)return;
    const color=getDeadlineColor(days,'week');
    if(!color)return;
    notifs.push({
      id:'watch_'+w.id, name:w.name, days, color, type:'shortterm', icon:'🎬',
      label:days<0?'просрочено':days===0?'дедлайн сегодня':days===1?'дедлайн завтра':days+'д. до дедлайна'
    });
  });

  // Патчи с датой (шкала 7 дней)
  patches.forEach(p=>{
    if(!p.date||p.done)return;
    const days=daysToDeadline(p.date,now);
    if(days===null)return;
    if(days>7)return;
    const color=getDeadlineColor(days,'week');
    if(!color)return;
    notifs.push({
      id:'patch_'+p.id, name:p.text.slice(0,40), days, color, type:'shortterm', icon:'🔧',
      label:days<0?'просрочено':days===0?'срок сегодня':days===1?'срок завтра':days+'д. до срока'
    });
  });

  // ── НОВЫЙ ГОД (25 дек — 5 янв) ──
  (function(){
    const mo=now.getMonth(),d=now.getDate();
    if(!((mo===11&&d>=25)||(mo===0&&d<=5)))return;
    let msg,color;
    if(mo===11){
      const daysToNY=32-d; // до 1 янв: 32-d (напр. 25 дек → 7д.)
      if(daysToNY===1){msg='Завтра Новый год!';color='#ef4444';}
      else if(daysToNY<=3){msg=daysToNY+'д. до Нового года';color='#fb923c';}
      else{msg=daysToNY+'д. до Нового года';color='#4ade80';}
    } else {
      const left=5-d;
      if(d===1){msg='С Новым годом! 🎉';color='#ef4444';}
      else if(left<=0){msg='Конец каникул сегодня';color='#ef4444';}
      else{msg='Каникулы: ещё '+left+'д.';color='#4ade80';}
    }
    notifs.push({id:'newyear',name:msg,days:mo===11?32-d:5-d,color,type:'shortterm',icon:'🎄',label:'Новый год'});
  })();

  // ── НОВАЯ НЕДЕЛЯ (сб/вс/пн) ──
  (function(){
    const dow=now.getDay(); // 0=вс,1=пн,...,6=сб
    if(dow===6){
      // Суббота — зелёное предупреждение
      notifs.push({
        id:'week_sat', name:'Новая неделя приближается', days:2, color:'#4ade80', type:'shortterm', icon:'📅',
        label:'послезавтра новая неделя'
      });
    } else if(dow===0){
      // Воскресенье — жёлтое предупреждение
      notifs.push({
        id:'week_sun', name:'Завтра новая неделя', days:1, color:'#fbbf24', type:'shortterm', icon:'📅',
        label:'завтра начинается новая неделя'
      });
    } else if(dow===1){
      // Понедельник — красное, начало недели
      notifs.push({
        id:'week_mon', name:'Начало новой недели!', days:0, color:'#ef4444', type:'shortterm', icon:'🚀',
        label:'сегодня начало новой недели'
      });
    }
  })();

  // ── КОНЕЦ МЕСЯЦА (цели, деньги, рутина) — 5/3/1/0 дней ──
  (function(){
    const endOfMonth=new Date(now.getFullYear(),now.getMonth()+1,0);
    const todayClean=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const daysLeft=Math.round((endOfMonth-todayClean)/(1000*60*60*24));
    if(daysLeft>5)return;
    let color,label;
    if(daysLeft<=0){color='#ef4444';label='сегодня конец месяца!';}
    else if(daysLeft===1){color='#f97316';label='1 день до конца месяца';}
    else if(daysLeft<=3){color='#fbbf24';label=daysLeft+'д. до конца месяца';}
    else{color='#4ade80';label=daysLeft+'д. до конца месяца';}
    // Цели месяца незавершённые
    const undoneMG=getMG().filter(g=>!g.done);
    if(undoneMG.length){
      notifs.push({
        id:'month_goals', name:'Цели месяца: '+undoneMG.length+' не выполнено',
        days:daysLeft, color, type:'shortterm', icon:'📌', label
      });
    }
    // Деньги — бюджет (если есть лимит)
    const budget=LS.g('finBudget',0);
    if(budget>0){
      const todayKeys=Object.keys(finLog).filter(k=>{const p=k.split('-');return +p[0]===now.getFullYear()&&+p[1]===now.getMonth();});
      const spent=todayKeys.reduce((s,k)=>s+(finLog[k]||[]).filter(e=>e.type==='expense').reduce((a,e)=>a+e.amount,0),0);
      notifs.push({
        id:'month_finance', name:'Деньги: '+Math.round(spent)+'₽ / '+budget+'₽',
        days:daysLeft, color, type:'shortterm', icon:'💰', label
      });
    } else {
      // Даже без бюджета — напоминаем о конце месяца
      notifs.push({
        id:'month_finance', name:'Подведи финансы месяца',
        days:daysLeft, color, type:'shortterm', icon:'💰', label
      });
    }
    // Рутина — незавершённые задачи сегодня
    const rtBlocks=LS.g('rtBlocks',[]);
    const todayDow=now.getDay();
    let undoneRt=0;
    rtBlocks.forEach(bl=>{
      (bl.items||[]).forEach(it=>{
        const done=(it.done||{})[dk(now)];
        if(!done)undoneRt++;
      });
    });
    if(undoneRt>0){
      notifs.push({
        id:'month_routine', name:'Рутина: '+undoneRt+' задач не закрыто',
        days:daysLeft, color, type:'shortterm', icon:'🔄', label
      });
    }
  })();

  return notifs.sort((a,b)=>a.days-b.days);
}

function navigateToNotif(notifId, clickedEl){
  // 1. Сначала схлопываем панель — до навигации,
  //    чтобы renderGoals/renderHealth/etc. уже видели notifsCollapsed=true
  if(!notifsCollapsed){
    notifsCollapsed=true;
    LS.s('notifsCollapsed',notifsCollapsed);
  }

  // 2. Анимация нажатия на элемент
  if(clickedEl){
    clickedEl.style.transition='transform .12s,opacity .12s';
    clickedEl.style.transform='scale(0.97)';
    clickedEl.style.opacity='0.7';
    setTimeout(()=>{
      clickedEl.style.transform='';
      clickedEl.style.opacity='';
    },120);
  }

  const sep=notifId.indexOf('_');
  const type=notifId.slice(0,sep);
  const id=notifId.slice(sep+1);

  const highlight=(el)=>{
    if(!el)return;
    el.scrollIntoView({behavior:'smooth',block:'center'});
    const orig=el.style.background||'';
    el.style.transition='background .2s';
    el.style.background='var(--a2)';
    setTimeout(()=>el.style.background=orig,1500);
  };

  const go=(page,elId)=>{
    goPage(page,getNavBtn(page));
    if(elId)setTimeout(()=>highlight(document.getElementById(elId)),250);
  };

  // 3. Переходим после короткой паузы чтобы анимация успела сыграть
  setTimeout(()=>{
    if     (type==='goal')   go('goals',    'goal-item-'  +id);
    else if(type==='mg')     go('goals',    'mg-item-'    +id);
    else if(type==='hw')     go('memo',     'hw-item-'    +id);
    else if(type==='watch')  go('interests','watch-item-' +id);
    else if(type==='bd')     go('health',   'bd-item-'    +id);
    else if(type==='annual') go('routine',  'annual-item-'+id);
    else if(type==='patch')  go('memo',     'patch-item-' +id);
    // Системные (week_*, month_*, newyear) — просто закрыли панель выше
    renderNotificationsPanel();
  },130);
}

// Уведомления: состояние свёртки
let notifsCollapsed=LS.g('notifsCollapsed',false);

function renderNotificationsPanel(){
  const notifs=collectNotifications();
  // Render into all panels (week page + goals page)
  const panels=document.querySelectorAll('.notifs-panel');
  panels.forEach(panel=>{
    if(!notifs.length){
      panel.style.display='none';
      return;
    }
    panel.style.display='block';

  const colors=notifs.map(n=>n.color);
  const worst=getWorstColor(colors);

  if(notifsCollapsed){
    // Свёрнутое состояние — заметная пилюля с цветом
    panel.innerHTML=`
      <div onclick="toggleNotifPanel()" style="
        display:flex;align-items:center;gap:8px;cursor:pointer;
        background:${worst}18;
        border:1.5px solid ${worst}55;
        border-radius:12px;
        padding:8px 14px;
        transition:.2s;
        box-shadow:0 0 12px ${worst}22;
      ">
        <div style="width:9px;height:9px;border-radius:50%;background:${worst};flex-shrink:0;box-shadow:0 0 6px ${worst}"></div>
        <div style="font-family:var(--mono);font-size:9px;color:${worst};letter-spacing:1.5px;text-transform:uppercase;flex:1">уведомления</div>
        <div style="font-family:var(--mono);font-size:11px;color:${worst};font-weight:700">${notifs.length}</div>
        <div style="font-size:12px;color:${worst};opacity:.8">▸</div>
      </div>`;
  } else {
    // Развёрнутое состояние
    const items=notifs.map(n=>`
      <div onclick="event.stopPropagation();navigateToNotif('${n.id}',this)"
        onmouseenter="this.style.background='var(--a2)'"
        onmouseleave="this.style.background=''"
        style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;border-radius:6px;transition:background .15s">
        <div style="width:7px;height:7px;border-radius:50%;background:${n.color};flex-shrink:0;box-shadow:0 0 5px ${n.color}88"></div>
        <div style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.icon} ${n.name}</div>
        <div style="font-family:var(--mono);font-size:10px;color:${n.color};font-weight:600;flex-shrink:0;white-space:nowrap">${n.label}</div>
      </div>`).join('');
    panel.innerHTML=`
      <div style="
        background:var(--c1);
        border:1.5px solid ${worst}44;
        border-radius:14px;
        overflow:hidden;
        box-shadow:0 0 16px ${worst}18;
      ">
        <div onclick="toggleNotifPanel()" style="
          display:flex;align-items:center;gap:8px;cursor:pointer;
          padding:10px 14px;
          background:${worst}12;
          border-bottom:1px solid ${worst}22;
        ">
          <div style="width:8px;height:8px;border-radius:50%;background:${worst};flex-shrink:0;box-shadow:0 0 6px ${worst}"></div>
          <div style="font-family:var(--mono);font-size:9px;color:${worst};letter-spacing:1.5px;text-transform:uppercase;flex:1">уведомления · ${notifs.length}</div>
          <div style="font-size:12px;color:${worst};opacity:.8">▾</div>
        </div>
        <div style="padding:4px 14px 6px">${items}</div>
      </div>`;
    }
  }); // end panels.forEach
}

function toggleNotifPanel(){
  notifsCollapsed=!notifsCollapsed;
  LS.s('notifsCollapsed',notifsCollapsed);
  renderNotificationsPanel();
  // Also re-render the today page notifs panel if visible
  if(typeof renderTodayNotifs==='function'){
    const block=document.getElementById('today-notifs-block');
    if(block&&block.style.display!=='none') renderTodayNotifs(new Date());
  }
}

// ══ INIT ═══════════════════════════════════════════════
const _now0=new Date();_cycleCalMonth={y:_now0.getFullYear(),m:_now0.getMonth()};

// Splash progress animation
(function(){
  const bar=document.getElementById('splash-bar');
  const hint=document.getElementById('splash-hint');
  if(!bar) return;
  const steps=[
    [10,'loading data…'],
    [30,'applying settings…'],
    [55,'building page…'],
    [75,'syncing tasks…'],
    [90,'almost ready…'],
  ];
  let i=0;
  function tick(){
    if(i<steps.length){
      bar.style.width=steps[i][0]+'%';
      if(hint) hint.textContent=steps[i][1];
      i++;
      setTimeout(tick, 110);
    }
  }
  tick();
})();

// ══ LANGUAGE ═══════════════════════════════════════════
var appLang = LS.g('appLang','ru');
var T = {
  ru:{
    logo:'LOGOS',
    nav:['СЕГОДНЯ','РУТИНА','НЕДЕЛЯ','ЦЕЛИ','ПРИВЫЧКИ','ЗДОРОВЬЕ','НАВЫКИ','ИНТЕРЕСЫ','ДЕНЬГИ','ПАМЯТКА','НАСТРОЙКИ'],
    'fin-chart-lbl':'доходы и расходы','fin-month-btn':'месяц',
    'fin-legend-income':'доход','fin-legend-expense':'расход',
    'fin-day-lbl':'записи за день','fin-add-income-btn':'＋ ДОХОД','fin-add-expense-btn':'－ РАСХОД',
    'fin-week-lbl':'шаблон недели','fin-week-inc-btn':'＋ доход','fin-week-exp-btn':'－ расход',
    'fin-month-lbl':'шаблон месяца','fin-month-inc-btn':'＋ доход','fin-month-exp-btn':'－ расход',
    'fin-year-lbl':'шаблон года','fin-year-inc-btn':'＋ доход','fin-year-exp-btn':'－ расход',
    'fin-purchases-lbl':'покупки','fin-purchase-add-btn':'＋ добавить',
    'fin-debts-lbl':'задолженности','fin-debt-owe-btn':'я должен','fin-debt-owed-btn':'мне должны',
    's-pin-lbl':'pin памятки','s-pin-change':'Изменить PIN','s-pin-sub':'Текущий: введи старый','s-pin-btn':'СМЕНИТЬ',
    's-appear-lbl':'внешний вид','s-theme-lbl':'Тема','s-theme-sub':'Тёмная / Светлая','s-lang-lbl':'Язык / Language',
    's-font-lbl':'Шрифт / Chat font','s-font-default':'По умолчанию','s-font-sans':'Засечки','s-font-system':'Моно','s-font-dyslexic':'Дислексия',
    's-data-lbl':'данные','s-export-lbl':'Экспорт JSON','s-export-sub':'Скачать все данные','s-export-btn':'↓ JSON',
    's-import-lbl':'Импорт JSON','s-import-btn':'↑ JSON',
    's-reset-lbl':'сброс','s-reset-btn':'СБРОСИТЬ ЗАДАЧИ СЕГОДНЯ','s-reset-all-btn':'СБРОСИТЬ ВСЁ',
    's-autosave-lbl':'Автосохранение','s-autosave-sub':'В Google Drive каждые 2 минуты',
    's-gdrive-lbl':'google drive','s-gdrive-name':'Google Drive',
    's-gdrive-save-lbl':'Сохранить в Drive','s-gdrive-save-sub':'Загрузить текущий бэкап',
    's-gdrive-load-lbl':'Загрузить из Drive','s-gdrive-load-sub':'Восстановить последний бэкап',
    's-gdrive-auto-lbl':'Загрузить из автосейва','s-gdrive-auto-sub':'Восстановить последний автосейв',
    's-gdrive-hist-lbl':'История бэкапов','s-gdrive-hist-sub':'Предыдущие версии сохраняются автоматически',
    's-gdrive-out-lbl':'Выйти из аккаунта','s-gdrive-out-sub':'Отключить Google Drive','s-gdrive-out-btn':'ВЫЙТИ',
    's-notif-lbl':'уведомления',
    'notif-lbl':'Уведомления','notif-perm-granted':'Разрешены браузером','notif-perm-denied':'Заблокированы в браузере','notif-perm-ask':'Нажми включить',
    'notif-off-btn':'ВЫКЛ','notif-on-btn':'ВКЛЮЧИТЬ',
    'notif-deadlines':'⏰ Дедлайны целей','notif-deadlines-sub':'За 30/15/7/3/1/0 дней до срока',
    'notif-weekly':'📋 Начало недели','notif-weekly-sub':'Сб, Вс и Пн',
    'notif-monthly':'📅 Начало месяца','notif-monthly-sub':'За 3/1/0 дней до конца',
    'notif-birthday':'🎂 Дни рождения','notif-birthday-sub':'За 15/7/3/1/0 дней',
    'notif-newyear':'🎄 Новый год','notif-newyear-sub':'25 дек — 5 янв',
    'notif-homework':'📚 Домашние задания','notif-homework-sub':'За 3 дня до сдачи',
    'notif-watchlist':'🎬 Вотчлист','notif-watchlist-sub':'За 7 дней до дедлайна',
    'notif-patches':'🔧 Патчи','notif-patches-sub':'За 7 дней до срока',
    'reminders-lbl':'Напоминалки','reminders-sub':'В приложении, без уведомлений',
    'reminder-weight':'⚖ Взвешивание','reminder-weight-sub':'При открытии Здоровья, если &gt;7 дней без записи',
    'ai-card-sh':'ai-карта','ai-card-lbl':'Снапшот для ИИ',
    'ai-card-sub':'Скачай файл и вставь в чат — ИИ увидит твои тренировки, здоровье, цели, рутину, интересы и финансы',
    'ai-card-btn-dl':'↓ СКАЧАТЬ','ai-card-btn-cp':'⎘ КОПИРОВАТЬ',
    'ai-card-context':'Дополнительный контекст (необязательно)',
    'ai-card-name-ph':'Имя / ник','ai-card-city-ph':'Город',
    'ai-card-horizon-ph':'На сколько вперёд планируешь (напр: 1 год)',
    'ai-card-notes-ph':'Что ещё важно знать ИИ о тебе...',
    'gdrive-connected':'🟢 Подключено','gdrive-disconnected':'🔴 Не подключено','gdrive-signin':'ВОЙТИ','gdrive-refresh':'ОБНОВИТЬ',
    's-info-text':'<span style="color:var(--a);font-family:var(--mono)">localStorage</span> — данные в браузере на этом устройстве.<br>Не теряются при закрытии. Для переноса — экспорт JSON.',
    finEmpty:'записей нет — добавь доход или расход',finTplEmpty:'шаблон пуст',finPurchasesEmpty:'покупок нет',finDebtsEmpty:'задолженностей нет',
    income:'ДОХОД',expense:'РАСХОД',balance:'БАЛАНС',
    debtOwe:'я должен',debtOwed:'мне должны',paid:'оплачено',markPaid:'отметить оплаченным',
    today_hw_lbl:'домашнее задание',today_tasks_lbl:'задачи',today_tasks_done:'задач выполнено',
    today_routine_lbl:'рутина',today_morning:'утро',today_day_tab:'день',today_evening:'вечер',
    today_week_routine:'🚀 рутина новой недели',today_month_routine:'📅 рутина нового месяца',
    today_mg_lbl:'цели месяца',today_fg_lbl:'просто цели',today_dl_lbl:'цели с дедлайном',
    today_sec_today:'сегодня',today_sec_planned:'запланировано',today_sec_undone:'невыполненные',
    today_no_tasks:'нет задач — добавь во вкладке «неделя»',
    today_no_planned:'нет запланированных задач',today_all_done:'всё выполнено 👍',
    today_no_tpl:'нет задач для этого дня — добавь в рутина → дни нед.',
    days_full:['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
    days_short:['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
    days_short2:['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
    months_gen:['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
    months_short:['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'],
    months_full:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
    routine_lbl:'рутина',
    rt_morning:'УТРО',rt_day:'ДЕНЬ',rt_evening:'ВЕЧЕР',rt_week:'НЕДЕЛЯ',
    rt_month:'МЕСЯЦ',rt_year:'ГОД',rt_weekdays:'ДНИ НЕД.',rt_annuals:'ЕЖЕГОДНЫЕ',
    rt_reset:'↺ сброс',rt_add_ph:'Добавить пункт...',
    skills_cycle_lbl:'скользящий цикл',skills_cycle_reset:'сбросить',
    skills_tab_list:'список',skills_tab_cal:'календарь',
    skills_next14:'ближайшие 14 дней',skills_templates_lbl:'шаблоны навыков',
    skills_add_tpl:'+ ДОБАВИТЬ ШАБЛОН',skills_today_lbl:'СЕГОДНЯ',
    skills_workout:'ТРЕНИРОВКА',skills_mental_type:'УМСТВЕННАЯ',
    skills_rest_day:'День отдыха',skills_rest_short:'отдых',
    skills_heavy_badge:'▲ тяж',skills_light_badge:'▽ лёгк',
    skills_heavy_wk:'тяжёлая неделя',skills_light_wk:'лёгкая неделя',
    skills_physical_hdr:'● ФИЗИЧЕСКИЕ ●',skills_mental_hdr:'● УМСТВЕННЫЕ ●',
    skills_params_lbl:'ПАРАМЕТРЫ',skills_add_param:'+ параметр',
    skills_med_card:'мед карта',skills_no_recs:'Рекомендации не добавлены',
    skills_weekdays_label:'дни в шаблоне НЕДЕЛЯ:',
    week_this:'Эта неделя · ',week_skills:'навыки',week_habits:'привычки',
    week_weekdays:'дни нед.',week_edit:'Редактировать',
    week_empty:'шаблон пуст',week_no_tasks:'нет задач',week_add_ph:'задача...',
    habits_lbl:'привычки',habits_hint:'· нажми на точку чтобы включить → добавится в сегодня',
    habits_add_lbl:'добавить привычку',
    habits_name_ph:'Название привычки...',habits_desc_ph:'Описание (необязательно)...',
    health_calc_lbl:'расчёт',health_mode_lbl:'РЕЖИМ ПИТАНИЯ',
    health_maintain:'Поддержание',health_cut:'Сушка',health_bulk:'Набор',
    health_apply:'ПРИМЕНИТЬ НОРМЫ',
    health_deficit_lbl:'Дефицит ~',health_surplus_lbl:'Профицит ~',
    health_kcalday:' ккал/день · ~',health_kgweek:' кг жира в неделю',
    health_bmr:'BMR:',health_tdee:'TDEE:',health_def2:'дефицит',health_sur2:'профицит',
    health_kcal:'Калории',health_prot:'Белок',health_fat:'Жиры',health_carb:'Углеводы',
    health_fiber:'Клетчатка',health_sugar:'Сахар',health_salt:'Соль',
    health_water:'Вода',health_sleep:'Сон',health_updated:'Нормы обновлены',
    interests_lbl:'интересы',interests_add_cat:'+ категория',
    interests_empty_cats:'нет категорий — создай первую',
    interests_empty_items:'нет пунктов — добавь первый',
    interests_item:'пункт',interests_items2:'пункта',interests_items5:'пунктов',
    memo_passwords:'ПАРОЛИ',memo_bdays:'ДР',memo_hw:'ДЗ',memo_watchlist:'ВОТЧЛИСТ',
    memo_notes:'ЗАМЕТКИ',memo_patches:'ПАТЧИ',
    memo_bdays_full:'ДНИ РОЖДЕНИЯ',memo_add:'+ ДОБАВИТЬ',
    goals_deadline_lbl:'ЦЕЛИ С ДЕДЛАЙНОМ',goals_free_lbl:'ПРОСТО ЦЕЛИ',
    goals_no_date:'БЕЗ ДАТЫ',goals_text_photo:'ТЕКСТ И ФОТО',
    goals_name_ph:'Название цели...',goals_note_ph:'Заметка (необязательно)...',
    goals_date_ph:'ДД.ММ.ГГГГ',goals_year_suffix:'г. ',goals_month_suffix:'м.',
    goals_added:'Цель добавлена',goals_updated:'Цель обновлена',
  },
  en:{
    logo:'LOGOS',
    nav:['TODAY','ROUTINE','WEEK','GOALS','HABITS','HEALTH','SPORT','INTERESTS','MONEY','NOTES','SETTINGS'],
    'fin-chart-lbl':'income & expenses','fin-month-btn':'month',
    'fin-legend-income':'income','fin-legend-expense':'expense',
    'fin-day-lbl':'today\'s records','fin-add-income-btn':'＋ INCOME','fin-add-expense-btn':'－ EXPENSE',
    'fin-week-lbl':'weekly template','fin-week-inc-btn':'＋ income','fin-week-exp-btn':'－ expense',
    'fin-month-lbl':'monthly template','fin-month-inc-btn':'＋ income','fin-month-exp-btn':'－ expense',
    'fin-year-lbl':'yearly template','fin-year-inc-btn':'＋ income','fin-year-exp-btn':'－ expense',
    'fin-purchases-lbl':'big purchases','fin-purchase-add-btn':'＋ add',
    'fin-debts-lbl':'debts','fin-debt-owe-btn':'I owe','fin-debt-owed-btn':'owed to me',
    's-pin-lbl':'memo pin','s-pin-change':'Change PIN','s-pin-sub':'Current: enter old','s-pin-btn':'CHANGE',
    's-appear-lbl':'appearance','s-theme-lbl':'Theme','s-theme-sub':'Dark / Light','s-lang-lbl':'Language / Язык',
    's-font-lbl':'Chat font','s-font-default':'Default','s-font-sans':'Serif','s-font-system':'Mono','s-font-dyslexic':'Dyslexic',
    's-data-lbl':'data','s-export-lbl':'Export JSON','s-export-sub':'Download all data','s-export-btn':'↓ JSON',
    's-import-lbl':'Import JSON','s-import-btn':'↑ JSON',
    's-reset-lbl':'reset','s-reset-btn':'RESET TODAY\'S TASKS','s-reset-all-btn':'RESET EVERYTHING',
    's-autosave-lbl':'Autosave','s-autosave-sub':'To Google Drive every 2 minutes',
    's-gdrive-lbl':'google drive','s-gdrive-name':'Google Drive',
    's-gdrive-save-lbl':'Save to Drive','s-gdrive-save-sub':'Upload current backup',
    's-gdrive-load-lbl':'Load from Drive','s-gdrive-load-sub':'Restore last backup',
    's-gdrive-auto-lbl':'Load from autosave','s-gdrive-auto-sub':'Restore last autosave',
    's-gdrive-hist-lbl':'Backup history','s-gdrive-hist-sub':'Previous versions are saved automatically',
    's-gdrive-out-lbl':'Sign out','s-gdrive-out-sub':'Disconnect Google Drive','s-gdrive-out-btn':'SIGN OUT',
    's-notif-lbl':'notifications',
    'notif-lbl':'Notifications','notif-perm-granted':'Allowed by browser','notif-perm-denied':'Blocked in browser','notif-perm-ask':'Click to enable',
    'notif-off-btn':'OFF','notif-on-btn':'ENABLE',
    'notif-deadlines':'⏰ Goal deadlines','notif-deadlines-sub':'30/15/7/3/1/0 days before due',
    'notif-weekly':'📋 Week start','notif-weekly-sub':'Fri, Sat & Mon',
    'notif-monthly':'📅 Month start','notif-monthly-sub':'3/1/0 days before end',
    'notif-birthday':'🎂 Birthdays','notif-birthday-sub':'15/7/3/1/0 days before',
    'notif-newyear':'🎄 New Year','notif-newyear-sub':'Dec 25 — Jan 5',
    'notif-homework':'📚 Homework','notif-homework-sub':'3 days before due',
    'notif-watchlist':'🎬 Watchlist','notif-watchlist-sub':'7 days before deadline',
    'notif-patches':'🔧 Patches','notif-patches-sub':'7 days before due',
    'reminders-lbl':'Reminders','reminders-sub':'In-app, no browser permission',
    'reminder-weight':'⚖ Weigh-in','reminder-weight-sub':'On opening Health, if &gt;7 days without entry',
    'ai-card-sh':'ai card','ai-card-lbl':'AI Snapshot',
    'ai-card-sub':'Download and paste into chat — AI will see your workouts, health, goals, routine, interests &amp; finances',
    'ai-card-btn-dl':'↓ DOWNLOAD','ai-card-btn-cp':'⎘ COPY',
    'ai-card-context':'Additional context (optional)',
    'ai-card-name-ph':'Name / nickname','ai-card-city-ph':'City',
    'ai-card-horizon-ph':'Planning horizon (e.g. 1 year)',
    'ai-card-notes-ph':'Anything else the AI should know about you...',
    'gdrive-connected':'🟢 Connected','gdrive-disconnected':'🔴 Not connected','gdrive-signin':'SIGN IN','gdrive-refresh':'REFRESH',
    's-info-text':'<span style="color:var(--a);font-family:var(--mono)">localStorage</span> — data stored in this browser.<br>Won\'t be lost on close. Use JSON export to transfer.',
    finEmpty:'no records — add income or expense',finTplEmpty:'template is empty',finPurchasesEmpty:'no purchases',finDebtsEmpty:'no debts',
    income:'INCOME',expense:'EXPENSE',balance:'BALANCE',
    debtOwe:'I owe',debtOwed:'owed to me',paid:'paid',markPaid:'mark as paid',
    today_hw_lbl:'homework',today_tasks_lbl:'tasks',today_tasks_done:'tasks done',
    today_routine_lbl:'routine',today_morning:'morning',today_day_tab:'day',today_evening:'evening',
    today_week_routine:'🚀 new week routine',today_month_routine:'📅 new month routine',
    today_mg_lbl:'monthly goals',today_fg_lbl:'free goals',today_dl_lbl:'deadline goals',
    today_sec_today:'today',today_sec_planned:'planned',today_sec_undone:'overdue',
    today_no_tasks:'no tasks — add in the week tab',
    today_no_planned:'no planned tasks',today_all_done:'all done 👍',
    today_no_tpl:'no tasks for this day — add in routine → weekdays',
    days_full:['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],
    days_short:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    days_short2:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    months_gen:['January','February','March','April','May','June','July','August','September','October','November','December'],
    months_short:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    months_full:['January','February','March','April','May','June','July','August','September','October','November','December'],
    routine_lbl:'routine',
    rt_morning:'MORNING',rt_day:'DAY',rt_evening:'EVENING',rt_week:'WEEK',
    rt_month:'MONTH',rt_year:'YEAR',rt_weekdays:'WEEKDAYS',rt_annuals:'ANNUALS',
    rt_reset:'↺ reset',rt_add_ph:'Add item...',
    skills_cycle_lbl:'rolling cycle',skills_cycle_reset:'reset',
    skills_tab_list:'list',skills_tab_cal:'calendar',
    skills_next14:'next 14 days',skills_templates_lbl:'skill templates',
    skills_add_tpl:'+ ADD TEMPLATE',skills_today_lbl:'TODAY',
    skills_workout:'WORKOUT',skills_mental_type:'MENTAL',
    skills_rest_day:'Rest day',skills_rest_short:'rest',
    skills_heavy_badge:'▲ heavy',skills_light_badge:'▽ light',
    skills_heavy_wk:'heavy week',skills_light_wk:'light week',
    skills_physical_hdr:'● PHYSICAL ●',skills_mental_hdr:'● MENTAL ●',
    skills_params_lbl:'PARAMS',skills_add_param:'+ param',
    skills_med_card:'med card',skills_no_recs:'No recommendations added',
    skills_weekdays_label:'days in WEEK template:',
    week_this:'This week · ',week_skills:'skills',week_habits:'habits',
    week_weekdays:'weekdays',week_edit:'Edit',
    week_empty:'template empty',week_no_tasks:'no tasks',week_add_ph:'task...',
    habits_lbl:'habits',habits_hint:'· tap dot to enable → adds to today',
    habits_add_lbl:'add habit',
    habits_name_ph:'Habit name...',habits_desc_ph:'Description (optional)...',
    health_calc_lbl:'calculator',health_mode_lbl:'NUTRITION MODE',
    health_maintain:'Maintain',health_cut:'Cut',health_bulk:'Bulk',
    health_apply:'APPLY NORMS',
    health_deficit_lbl:'Deficit ~',health_surplus_lbl:'Surplus ~',
    health_kcalday:' kcal/day · ~',health_kgweek:' kg fat/week',
    health_bmr:'BMR:',health_tdee:'TDEE:',health_def2:'deficit',health_sur2:'surplus',
    health_kcal:'Calories',health_prot:'Protein',health_fat:'Fats',health_carb:'Carbs',
    health_fiber:'Fiber',health_sugar:'Sugar',health_salt:'Salt',
    health_water:'Water',health_sleep:'Sleep',health_updated:'Norms updated',
    interests_lbl:'interests',interests_add_cat:'+ category',
    interests_empty_cats:'no categories — create the first one',
    interests_empty_items:'no items — add the first one',
    interests_item:'item',interests_items2:'items',interests_items5:'items',
    memo_passwords:'PASSWORDS',memo_bdays:'BD',memo_hw:'HW',memo_watchlist:'WATCHLIST',
    memo_notes:'NOTES',memo_patches:'PATCHES',
    memo_bdays_full:'BIRTHDAYS',memo_add:'+ ADD',
    goals_deadline_lbl:'DEADLINE GOALS',goals_free_lbl:'FREE GOALS',
    goals_no_date:'NO DATE',goals_text_photo:'TEXT & PHOTO',
    goals_name_ph:'Goal name...',goals_note_ph:'Note (optional)...',
    goals_date_ph:'DD.MM.YYYY',goals_year_suffix:'y. ',goals_month_suffix:'m.',
    goals_added:'Goal added',goals_updated:'Goal updated',
  }
};
function t(key){if(!T||!T.ru)return key;return (T[appLang]||T.ru)[key]||key;}

updateHeader();renderCurrent();renderPhysCard();
// Task 9: Always open Today page on load
goPage('today', document.getElementById('nb-today'));
updateWeightGhost();
syncSkillsToToday();
syncWeekDaysFromCycle();
if(notifyOn&&typeof Notification!=='undefined'&&Notification.permission==='granted'){scheduleAllNotifs();}
const sleepRem=LS.g('sleepRem',{on:false,time:'22:30'});
if(sleepRem.on&&Notification.permission==='granted')scheduleSleepRem();
setInterval(()=>{updateHeader();},60000);

// Hide splash after init
(function(){
  const bar=document.getElementById('splash-bar');
  const hint=document.getElementById('splash-hint');
  const splash=document.getElementById('splash');
  if(!splash) return;
  if(bar) bar.style.width='100%';
  if(hint) hint.textContent='ready';
  setTimeout(function(){
    if(splash) splash.classList.add('hidden');
    setTimeout(function(){ if(splash) splash.remove(); }, 500);
  }, 450);
})();

// ══ THEME ══════════════════════════════════════════════
let appTheme = LS.g('appTheme','dark');
function setTheme(t){
  appTheme=t;LS.s('appTheme',t);
  document.body.classList.toggle('light',t==='light');
  const db=document.getElementById('themeDarkBtn');
  const lb=document.getElementById('themeLightBtn');
  if(db){db.style.background=t==='dark'?'var(--a2)':'var(--c2)';db.style.borderColor=t==='dark'?'var(--ab)':'var(--bd)';db.style.color=t==='dark'?'var(--a)':'var(--t2)';}
  if(lb){lb.style.background=t==='light'?'var(--a2)':'var(--c2)';lb.style.borderColor=t==='light'?'var(--ab)':'var(--bd)';lb.style.color=t==='light'?'var(--a)':'var(--t2)';}
  const starsEl=document.getElementById('sleepStars');
  if(starsEl){const sc=t==='light'?'#1a2d5a':'#fff';starsEl.querySelectorAll('div').forEach(d=>d.style.background=sc);}
}
(function(){
  // Тёмная тема по умолчанию. Светлая — только если явно сохранена
  if(appTheme==='light'){
    document.body.classList.add('light');
  } else {
    document.body.classList.remove('light');
  }
  document.documentElement.classList.remove('light-init');
})();
function setLang(l){
  appLang=l;LS.s('appLang',l);
  applyLang();
  // update lang buttons
  const rb=document.getElementById('langRuBtn');
  const eb=document.getElementById('langEnBtn');
  if(rb){rb.style.background=l==='ru'?'var(--a2)':'var(--c2)';rb.style.borderColor=l==='ru'?'var(--ab)':'var(--bd)';rb.style.color=l==='ru'?'var(--a)':'var(--t2)';}
  if(eb){eb.style.background=l==='en'?'var(--a2)':'var(--c2)';eb.style.borderColor=l==='en'?'var(--ab)':'var(--bd)';eb.style.color=l==='en'?'var(--a)':'var(--t2)';}
}

let appFont=LS.g('appFont','default');
const FONT_MAP={
  'default':  "'DM Sans',sans-serif",
  'serif':    "'Playfair Display',Georgia,serif",
  'mono':     "'Roboto Mono',monospace",
  'dyslexic': "'Lexend',sans-serif"
};
const MONO_MAP={
  'default':  "'DM Mono',monospace",
  'serif':    "'Playfair Display',Georgia,serif",
  'mono':     "'Roboto Mono',monospace",
  'dyslexic': "'Lexend',sans-serif"
};
function setFont(f){
  appFont=f;LS.s('appFont',f);
  // Apply directly on :root so it overrides everything
  document.documentElement.style.setProperty('--sans', FONT_MAP[f]||FONT_MAP['default']);
  document.documentElement.style.setProperty('--mono', MONO_MAP[f]||MONO_MAP['default']);
  // Also set on body for elements that inherit
  document.body.style.fontFamily='var(--sans)';
  // Update UI buttons
  document.querySelectorAll('.font-opt').forEach(el=>{
    el.classList.toggle('active', el.dataset.font===f);
  });
}
(function(){setFont(appFont);})();

function applyLang(){
  const lang=T[appLang]||T.ru;
  // Logo
  const logo=document.querySelector('.logo');if(logo){const img=logo.querySelector('img');logo.textContent=lang.logo;if(img)logo.prepend(img);}
  // Nav buttons text
  document.querySelectorAll('.nb').forEach((btn,i)=>{
    if(lang.nav[i]){
      // Ищем последний текстовый узел (не span/svg)
      let textNode=null;
      for(let j=btn.childNodes.length-1;j>=0;j--){if(btn.childNodes[j].nodeType===3){textNode=btn.childNodes[j];break;}}
      if(textNode){textNode.textContent=lang.nav[i];}
      else{
        // Текстового узла нет — вставляем перед span-бейджем (если есть) или в конец
        const badge=btn.querySelector('span[id$="Badge"]');
        const node=document.createTextNode(lang.nav[i]);
        if(badge)btn.insertBefore(node,badge);else btn.appendChild(node);
      }
    }
  });
  // Named elements by id
  const ids=['fin-chart-lbl','fin-month-btn','fin-legend-income','fin-legend-expense',
    'fin-day-lbl','fin-add-income-btn','fin-add-expense-btn',
    'fin-week-lbl','fin-week-inc-btn','fin-week-exp-btn',
    'fin-month-lbl','fin-month-inc-btn','fin-month-exp-btn',
    'fin-year-lbl','fin-year-inc-btn','fin-year-exp-btn',
    'fin-purchases-lbl','fin-purchase-add-btn','fin-debts-lbl','fin-debt-owe-btn','fin-debt-owed-btn',
    's-pin-lbl','s-pin-change','s-pin-sub','s-pin-btn','s-appear-lbl','s-theme-lbl','s-theme-sub','s-lang-lbl',
    's-data-lbl','s-export-lbl','s-export-sub','s-export-btn','s-import-lbl','s-import-btn',
    's-reset-lbl','s-reset-btn','s-reset-all-btn',
    's-autosave-lbl','s-autosave-sub',
    's-gdrive-lbl','s-gdrive-name',
    's-gdrive-save-lbl','s-gdrive-save-sub','s-gdrive-load-lbl','s-gdrive-load-sub',
    's-gdrive-auto-lbl','s-gdrive-auto-sub','s-gdrive-hist-lbl','s-gdrive-hist-sub',
    's-gdrive-out-lbl','s-gdrive-out-sub','s-gdrive-out-btn',
    's-notif-lbl',
    's-font-lbl','s-font-default','s-font-sans','s-font-system','s-font-dyslexic',
    'ai-card-sh','ai-card-lbl','ai-card-sub','ai-card-btn-dl','ai-card-btn-cp','ai-card-context'];
  ids.forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const val=lang[id];if(!val)return;
    // for .sh elements that have child buttons, only update text node
    if(el.classList&&(el.classList.contains('sh')||el.classList.contains('sh-btn')||el.classList.contains('slabel')||el.classList.contains('ssub')||el.classList.contains('add-btn'))){
      // replace first text node
      for(let n of el.childNodes){if(n.nodeType===3){n.textContent=val;return;}}
      el.innerHTML=val;
    } else {el.innerHTML=val;}
  });
  // s-info-text is innerHTML
  const inf=document.getElementById('s-info-text');if(inf)inf.innerHTML=lang['s-info-text']||'';
  // Placeholders for AI profile inputs
  const phMap={'aiProfileName':'ai-card-name-ph','aiProfileCity':'ai-card-city-ph','aiProfileHorizon':'ai-card-horizon-ph','aiProfileNotes':'ai-card-notes-ph'};
  Object.entries(phMap).forEach(([elId,key])=>{const el=document.getElementById(elId);if(el&&lang[key])el.placeholder=lang[key];});
  // Re-render finance if on that page
  if(curPage==='finance')renderFinance();
  // Re-render dynamically-built cards so they pick up the new language
  if(typeof renderNotifSettings==='function')renderNotifSettings();
  if(typeof renderRemindersCard==='function')renderRemindersCard();
  // Re-render all pages that have hardcoded Russian strings
  if(typeof renderTodayPage==='function'&&curPage==='today')renderTodayPage();
  if(typeof renderRoutineTabs==='function')renderRoutineTabs();
  if(typeof renderCycleBlock==='function'&&curPage==='skills'){renderCycleBlock();renderSkills();}
  if(typeof buildWeek==='function'&&curPage==='week')buildWeek();
  if(typeof renderGoals==='function'&&curPage==='goals')renderGoals();
  if(typeof renderHabits==='function'&&curPage==='habits')renderHabits();
  if(typeof renderHealth==='function'&&curPage==='health')renderHealth();
  if(typeof renderInterests==='function'&&curPage==='interests')renderInterests();
  if(typeof renderMemoTabs==='function'&&curPage==='memo'){renderMemoTabs();renderMemoBody();}
  // Static labels with IDs — update via t()
  const _sl=(id,key)=>{const el=document.getElementById(id);if(el)el.textContent=t(key);};
  const _ph=(id,key)=>{const el=document.getElementById(id);if(el)el.placeholder=t(key);};
  _sl('today-hw-lbl','today_hw_lbl');
  _sl('today-tasks-done-lbl','today_tasks_done');
  _sl('today-mg-lbl','today_mg_lbl');
  _sl('today-fg-lbl','today_fg_lbl');
  _sl('today-dl-lbl','today_dl_lbl');
  _sl('today-tasks-lbl-span','today_tasks_lbl');
  _sl('today-routine-lbl-span','today_routine_lbl');
  _sl('today-rt-tab-morning','today_morning');
  _sl('today-rt-tab-day','today_day_tab');
  _sl('today-rt-tab-evening','today_evening');
  _sl('today-week-routine-lbl','today_week_routine');
  _sl('today-month-routine-lbl','today_month_routine');
  _sl('routine-page-lbl','routine_lbl');
  _sl('cycle-lbl','skills_cycle_lbl');
  _sl('cycle-reset-btn','skills_cycle_reset');
  _sl('cycle-tab-list','skills_tab_list');
  _sl('cycle-tab-cal','skills_tab_cal');
  _sl('cycle-next14-lbl','skills_next14');
  _sl('skills-tpl-lbl','skills_templates_lbl');
  _sl('skills-add-tpl-btn','skills_add_tpl');
  _sl('habits-lbl','habits_lbl');
  _sl('habits-add-lbl','habits_add_lbl');
  _sl('interests-lbl-span','interests_lbl');
  _sl('interests-add-cat-btn','interests_add_cat');
  _sl('goals-deadline-lbl','goals_deadline_lbl');
  _sl('goals-free-lbl','goals_free_lbl');
  _sl('goals-no-date-tab','goals_no_date');
  _sl('goals-text-photo-tab','goals_text_photo');
  _ph('goalNameInl','goals_name_ph');
  _ph('goalNoteInl','goals_note_ph');
  _ph('freeGoalTextInp','today_no_tasks');// reuse placeholder key
  _ph('mgInp','goals_name_ph');
  // freeGoalTextInp placeholder handled above
  _ph('habitInp','habits_name_ph');
  _ph('habitDescInp','habits_desc_ph');
  _sl('habits-hint-span','habits_hint');
  _sl('goals-free-sub','goals_text_photo');
  // Health mode labels
  const _hm=(id,key)=>{const el=document.getElementById(id);if(el){const t2=el.querySelector('div:not([style*="font-size:11px"])');if(t2)t2.textContent=(typeof t==='function'?t(key):id);}};
  const _hmod=document.getElementById('health-mode-lbl');if(_hmod)_hmod.textContent=(typeof t==='function'?t('health_mode_lbl'):'РЕЖИМ ПИТАНИЯ');
  const _hcalc=document.getElementById('health-calc-lbl');if(_hcalc)_hcalc.textContent=(typeof t==='function'?t('health_calc_lbl'):'расчёт');
  _sl('health-mode-maintain','health_maintain');
  _sl('health-mode-cut','health_cut');
  _sl('health-mode-bulk','health_bulk');
  const _happly=document.getElementById('health-apply-btn');if(_happly)_happly.textContent=(typeof t==='function'?t('health_apply'):'ПРИМЕНИТЬ НОРМЫ');
}
(function(){applyLang();setLang(appLang);})();

