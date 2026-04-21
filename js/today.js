// ═══ MODULE: today.js ═══
// ══ СТРАНИЦА СЕГОДНЯ ════════════════════════════════════════

// ── TODAY PAGE ──────────────────────────────────────────
let todayRoutineSlot = 'morning';

function dk2(d){ return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); } // формат совпадает с dk() в main.js

// ── Найти кнопку .nb по ключу страницы (по onclick, не по индексу) ──
function findNavBtn(pageKey){
  const all = document.querySelectorAll('.nb');
  for(let i=0;i<all.length;i++){
    const oc = all[i].getAttribute('onclick')||'';
    if(oc.includes("'"+pageKey+"'") || oc.includes('"'+pageKey+'"')) return all[i];
  }
  return all[0]; // fallback на первую видимую кнопку
}

// ── Переход на конкретный слайд рутины с подсветкой пункта ─
// slotKey: 'morning'=0, 'day'=1, 'evening'=2, 'week'=3, 'month'=4, '_annuals'=5, '_weekdays'=6
const _rtSlideIndex = {morning:0, day:1, evening:2, week:3, month:4, '_annuals':5, '_weekdays':6};
function navToRoutineSlide(slotKey, itemIdx){
  const slideIdx = _rtSlideIndex[slotKey] !== undefined ? _rtSlideIndex[slotKey] : 0;
  // Сначала переключаем слайд
  if(typeof goRtSlide === 'function') goRtSlide(slideIdx);
  // Затем открываем страницу рутины
  const btn = findNavBtn('routine');
  goPage('routine', btn);
  // Подсвечиваем конкретный пункт если передан индекс
  if(itemIdx === undefined || itemIdx === null) return;
  setTimeout(()=>{
    const el = document.getElementById('rt-item-' + slotKey + '-' + itemIdx);
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('today-highlight-anim');
      setTimeout(()=>el.classList.remove('today-highlight-anim'), 1600);
    }
  }, 300);
}

// ── Универсальный переход + подсветка элемента ──────────
function todayNavTo(pageKey, elementId, memoTab){
  const btn = findNavBtn(pageKey);
  goPage(pageKey, btn);
  // Переключаем вкладку memo до рендера (если указана)
  if(memoTab && typeof switchMemoTab === 'function') switchMemoTab(memoTab);
  if(!elementId) return;
  // memo и week рендерятся дольше
  const delay = (pageKey === 'week') ? 400 : (pageKey === 'memo') ? 350 : 250;
  setTimeout(()=>{
    let el = null;
    if(elementId.startsWith('#') || elementId.startsWith('.')){
      el = document.querySelector(elementId);
    } else {
      el = document.getElementById(elementId) || document.querySelector('[id="'+elementId+'"]');
    }
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('today-highlight-anim');
      setTimeout(()=>el.classList.remove('today-highlight-anim'), 1600);
    }
  }, delay);
}

// ── Кнопка → для задач: переход на неделю к конкретному дню ──
function navToWeekTask(dateKey, taskId){
  const btn = findNavBtn('week');
  goPage('week', btn);
  setTimeout(()=>{
    // Вычисляем нужный weekOffset
    const parts = dateKey.split('-');
    const taskDate = new Date(+parts[0], +parts[1], +parts[2]);
    const mon = d => { const m = new Date(d); const day=(m.getDay()+6)%7; m.setDate(m.getDate()-day); m.setHours(0,0,0,0); return m; };
    const taskMon = mon(taskDate);
    const nowMon = mon(new Date());
    const diffMs = taskMon - nowMon;
    const diffWeeks = Math.round(diffMs / (7*24*60*60*1000));
    if(typeof weekOffset !== 'undefined'){
      weekOffset = diffWeeks;
    }
    if(typeof buildWeek === 'function') buildWeek();

    // Скролл к карточке дня и подсветка задачи
    const tryScroll = (attempts) => {
      const dow = (taskDate.getDay()+6)%7;
      if(typeof scrollToCard === 'function') scrollToCard(dow);
      setTimeout(()=>{
        const el = document.getElementById('dc-task-'+dateKey+'-'+taskId);
        if(el){
          el.scrollIntoView({behavior:'smooth', block:'center'});
          el.classList.add('today-highlight-anim');
          setTimeout(()=>el.classList.remove('today-highlight-anim'), 1600);
        } else if(attempts > 0){
          setTimeout(()=>tryScroll(attempts-1), 150);
        }
      }, 120);
    };
    setTimeout(()=>tryScroll(3), 120);
  }, 400);
}

function taskArrowBtn(dateKey, taskId){
  return `<button onclick="event.stopPropagation();navToWeekTask('${dateKey}','${taskId}')" style="flex-shrink:0;width:32px;height:32px;background:var(--c2);border:1px solid var(--bd);border-radius:8px;color:var(--a);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s" onmouseenter="this.style.background='var(--a)';this.style.color='#000'" onmouseleave="this.style.background='var(--c2)';this.style.color='var(--a)'">→</button>`;
}

// ── Кнопка → (общая для всех блоков) ────────────────────
function arrowBtn(pageKey, elementId, memoTab){
  const args = memoTab
    ? "'" + pageKey + "','" + elementId + "','" + memoTab + "'"
    : "'" + pageKey + "','" + elementId + "'";
  return "<button onclick=\"event.stopPropagation();todayNavTo(" + args + ")\" style=\"flex-shrink:0;width:32px;height:32px;background:var(--c2);border:1px solid var(--bd);border-radius:8px;color:var(--a);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s\" onmouseenter=\"this.style.background='var(--a)';this.style.color='#000'\" onmouseleave=\"this.style.background='var(--c2)';this.style.color='var(--a)'\">→</button>";
}

// ── Анимация исчезновения ─────────────────────────────────
function todayFadeOut(el, cb){
  el.style.transition = 'opacity .35s, transform .35s';
  el.style.opacity = '0';
  el.style.transform = 'translateX(20px)';
  setTimeout(()=>{ el.remove(); if(cb) cb(); }, 370);
}

// ── ПЕРЕНОС НЕЗАВЕРШЁННЫХ ЗАДАЧ ─────────────────────────
function carryOverUnfinishedTasks(){
  if(typeof tasks==='undefined') return;
  const todayKey = dk2(new Date());
  // Строковое сравнение "YYYY-M-D" ненадёжно без padding (напр. "2026-3-9" > "2026-3-10").
  // Используем Date-объекты для корректного сравнения.
  const _todayParts = todayKey.split('-');
  const _todayDate  = new Date(+_todayParts[0], +_todayParts[1], +_todayParts[2]);
  const pastKeys = Object.keys(tasks).filter(k => {
    const p = k.split('-');
    return p.length === 3 && new Date(+p[0], +p[1], +p[2]) < _todayDate;
  });
  if(!pastKeys.length) return;
  let carried = false;
  pastKeys.forEach(k => {
    const dayTasks = tasks[k] || [];
    const unfinished = dayTasks.filter(t => !t.done && !t._carriedOver);
    if(!unfinished.length) return;
    // Mark unfinished tasks in old day as carried (but keep their done=false so they show in week)
    unfinished.forEach(t => { t._carriedOver = true; });
    // Add to today's tasks if not already present (match by name)
    if(!tasks[todayKey]) tasks[todayKey] = [];
    const todayNames = tasks[todayKey].map(t => t.name);
    unfinished.forEach(t => {
      if(!todayNames.includes(t.name)){
        // Use integer ID to avoid float comparison bugs
        const newId = (typeof nid !== 'undefined') ? nid++ : (Date.now() + Math.floor(Math.random()*1000));
        if(typeof nid !== 'undefined' && typeof LS !== 'undefined') LS.s('nid', nid);
        tasks[todayKey].push({...t, done:false, id: newId, _carriedOver:true});
      }
    });
    carried = true;
  });
  if(carried && typeof LS!=='undefined') LS.s('tasks', tasks);
}

function renderTodayPage(){
  const now = new Date();
  const dayNames = (typeof t==='function')?t('days_full'):['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
  const monthNames = (typeof t==='function')?t('months_gen'):['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const heroDate = document.getElementById('todayHeroDate');
  const heroDay  = document.getElementById('todayHeroDay');
  if(heroDate) heroDate.textContent = now.getDate() + ' ' + monthNames[now.getMonth()];
  if(heroDay)  heroDay.textContent  = dayNames[now.getDay()];
  carryOverUnfinishedTasks();
  renderTodayNotifs(now);
  renderTodayHW(now);
  renderTodayTasks(now);
  renderTodayMG();
  renderTodayFreeGoals();
  renderTodayDeadlineGoals();
  renderTodayRoutine(now);
  renderTodayWeekRoutine(now);
  renderTodayMonthRoutine(now);
  renderTodayYearRoutine(now);
}

function renderTodayNotifs(now){
  const block = document.getElementById('today-notifs-block');
  const inner = document.getElementById('today-notifs-panel-inner');
  if(!block||!inner) return;
  let notifs = [];
  if(typeof collectNotifications === 'function') notifs = collectNotifications();
  if(!notifs.length){ block.style.display='none'; return; }
  block.style.display='block';
  const collapsed = typeof notifsCollapsed !== 'undefined' ? notifsCollapsed : false;
  const colors = notifs.map(n=>n.color);
  const worst = (typeof getWorstColor === 'function') ? getWorstColor(colors) : (colors[0]||'var(--a)');
  if(collapsed){
    inner.innerHTML=`<div onclick="toggleNotifPanel()" style="display:flex;align-items:center;gap:8px;cursor:pointer;background:${worst}18;border:1.5px solid ${worst}55;border-radius:12px;padding:8px 14px;transition:.2s;box-shadow:0 0 12px ${worst}22"><div style="width:9px;height:9px;border-radius:50%;background:${worst};flex-shrink:0;box-shadow:0 0 6px ${worst}"></div><div style="font-family:var(--mono);font-size:9px;color:${worst};letter-spacing:1.5px;text-transform:uppercase;flex:1">уведомления</div><div style="font-family:var(--mono);font-size:11px;color:${worst};font-weight:700">${notifs.length}</div><div style="font-size:12px;color:${worst};opacity:.8">▸</div></div>`;
  } else {
    const items = notifs.map(n=>{
      const dest = (typeof getNotifDest==='function') ? getNotifDest(n.id) : 'week';
      return `<div
        onclick="event.stopPropagation();this.style.transform='scale(0.97)';this.style.opacity='0.7';setTimeout(()=>{this.style.transform='';this.style.opacity='';},120);setTimeout(()=>navToNotif('${n.id}','${dest}'),130)"
        onmouseenter="this.style.background='rgba(255,255,255,0.07)'"
        onmouseleave="this.style.background=''"
        style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;border-radius:6px;transition:background .15s,transform .12s,opacity .12s">
        <div style="width:7px;height:7px;border-radius:50%;background:${n.color};flex-shrink:0;box-shadow:0 0 5px ${n.color}88"></div>
        <div style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.icon||''} ${n.name}</div>
        <div style="font-family:var(--mono);font-size:10px;color:${n.color};font-weight:600;flex-shrink:0;white-space:nowrap">${n.label||''}</div>
      </div>`;
    }).join('');
    inner.innerHTML=`<div style="background:var(--c1);border:1.5px solid ${worst}44;border-radius:14px;overflow:hidden;box-shadow:0 0 16px ${worst}18"><div onclick="toggleNotifPanel()" style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 14px;background:${worst}12;border-bottom:1px solid ${worst}22"><div style="width:8px;height:8px;border-radius:50%;background:${worst};flex-shrink:0;box-shadow:0 0 6px ${worst}"></div><div style="font-family:var(--mono);font-size:9px;color:${worst};letter-spacing:1.5px;text-transform:uppercase;flex:1">уведомления · ${notifs.length}</div><div style="font-size:12px;color:${worst};opacity:.8">▾</div></div><div style="padding:4px 14px 6px">${items}</div></div>`;
  }
}

function getNotifDest(id){
  if(!id) return 'week';
  if(id.startsWith('goal_'))   return 'goals';
  if(id.startsWith('mg_'))     return 'goals';
  if(id.startsWith('hw_'))     return 'memo';
  if(id.startsWith('watch_'))  return 'interests';
  if(id.startsWith('bd_'))     return 'health';
  if(id.startsWith('annual_')) return 'routine';
  if(id.startsWith('patch_'))  return 'memo';
  if(id==='week_mon'||id==='week_sun'||id==='week_sat') return 'routine';
  if(id==='month_goals')   return 'goals';
  if(id==='month_finance') return 'finance';
  if(id==='month_routine') return 'routine';
  return 'week';
}

function navToNotif(notifId, dest){
  // Для рутины — переходим сразу на нужный слайд
  if(dest === 'routine'){
    let slotKey = 'morning';
    if(notifId === 'month_routine')                                                     slotKey = 'month';
    else if(notifId === 'week_mon' || notifId === 'week_sun' || notifId === 'week_sat') slotKey = '_weekdays';
    else if(notifId && notifId.startsWith('annual_'))                                   slotKey = '_annuals';
    else if(notifId && notifId.startsWith('year'))                                      slotKey = '_annuals';
    navToRoutineSlide(slotKey);
    return;
  }
  const btn = findNavBtn(dest);
  goPage(dest, btn);
  setTimeout(()=>{
    const el = findNotifElement(notifId, dest);
    if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.classList.add('today-highlight-anim'); setTimeout(()=>el.classList.remove('today-highlight-anim'), 1600); }
  }, 250);
}

function findNotifElement(notifId, dest){
  if(notifId&&notifId.startsWith('goal_')){const id=notifId.replace('goal_','');return document.getElementById('goal-item-'+id);}
  if(notifId&&notifId.startsWith('mg_')){const id=notifId.replace('mg_','');return document.getElementById('mg-item-'+id);}
  if(notifId&&notifId.startsWith('hw_')){const id=notifId.replace('hw_','');return document.getElementById('hw-item-'+id);}
  if(notifId&&notifId.startsWith('watch_')){const id=notifId.replace('watch_','');return document.getElementById('watch-item-'+id);}
  if(notifId&&notifId.startsWith('bd_')){const id=notifId.replace('bd_','');return document.getElementById('bd-item-'+id);}
  if(notifId&&notifId.startsWith('annual_')){const id=notifId.replace('annual_','');return document.getElementById('annual-item-'+id);}
  if(notifId&&notifId.startsWith('patch_')){const id=notifId.replace('patch_','');return document.getElementById('patch-item-'+id);}
  if(notifId==='week_mon'||notifId==='week_sun'||notifId==='week_sat') return document.querySelector('.month-strip-inner')||document.querySelector('.week-nav');
  if(notifId==='month_goals') return document.querySelector('.month-goals-list')||document.querySelector('.month-strip-inner');
  if(notifId==='month_finance') return document.getElementById('finBalanceVal');
  if(notifId==='month_routine') return document.querySelector('.routine-swipe-wrap');
  if(notifId==='newyear') return document.querySelector('.week-nav');
  if(dest==='week') return document.querySelector('.month-strip-inner')||document.querySelector('.week-nav');
  if(dest==='routine') return document.querySelector('.routine-swipe-wrap');
  if(dest==='finance') return document.getElementById('finBalanceVal');
  if(dest==='memo') return document.getElementById('memoTabs');
  if(dest==='goals') return document.getElementById('goalsList');
  return null;
}




// ── ДЗ ──────────────────────────────────────────────────
function renderTodayHW(now){
  const block=document.getElementById('today-hw-block');
  const list=document.getElementById('today-hw-list');
  if(!block||!list) return;
  const skipValues=['ничего','Ничего','-'];
  const hw=(typeof homework!=='undefined'?homework:[]).filter(h=>!h.done&&!skipValues.includes(h.task));
  if(!hw.length){ block.style.display='none'; return; }
  block.style.display='block';
  list.innerHTML=hw.map(h=>`
    <div class="today-item" id="today-hw-${h.id}" style="cursor:pointer" onclick="toggleTodayHWDone(${h.id},this)">
      <div class="chk" style="flex-shrink:0"></div>
      <div style="font-size:15px">📚</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px">${h.subj||''}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--t2);margin-top:2px">${h.task||''}</div>
        ${h.date?`<div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:1px">до ${h.date}</div>`:''}
      </div>
      ${arrowBtn('memo','hw-item-'+h.id,'homework')}
    </div>`).join('');
}

function toggleTodayHWDone(hId, el){
  if(typeof homework==='undefined') return;
  const h=homework.find(x=>x.id==hId);
  if(!h) return;
  el.style.textDecoration='line-through'; el.style.opacity='0.5';
  const chk=el.querySelector('.chk'); if(chk) chk.textContent='✓';
  setTimeout(()=>{
    todayFadeOut(el, ()=>{
      h.task='-';
      if(typeof LS!=='undefined') LS.s('homework',homework);
      renderTodayHW(new Date());
      if(typeof curPage!=='undefined'&&curPage==='memo'&&typeof renderMemoBody==='function') renderMemoBody();
    });
  }, 1200);
}

// ── ВИД ШАБЛОНА ДЛЯ ЗАДАЧ СЕГОДНЯ ───────────────────────
let _todayShowTpl = false;

function toggleTodayTplView(){
  _todayShowTpl = !_todayShowTpl;
  const mainView = document.getElementById('today-tasks-main-view');
  const tplView  = document.getElementById('today-tpl-view');
  const btn      = document.getElementById('today-tpl-toggle-btn');
  if(mainView) mainView.style.display = _todayShowTpl ? 'none' : '';
  if(tplView)  tplView.style.display  = _todayShowTpl ? '' : 'none';
  if(btn){
    btn.style.background = _todayShowTpl ? 'var(--a)' : 'var(--c2)';
    btn.style.color = _todayShowTpl ? '#000' : 'var(--t2)';
    // override hover handlers while active
    btn.onmouseenter = _todayShowTpl ? null : function(){ this.style.background='var(--a)';this.style.color='#000'; };
    btn.onmouseleave = _todayShowTpl ? null : function(){ this.style.background='var(--c2)';this.style.color='var(--t2)'; };
  }
  if(_todayShowTpl) renderTodayTplList();
}

// ── Состояние сворачивания секций в шаблонном виде ──────
let _tplSections = {weekdays: false, skills: false, habits: false};
function _toggleTplSection(key){ _tplSections[key] = !_tplSections[key]; renderTodayTplList(); }

function renderTodayTplList(){
  const container = document.getElementById('today-tpl-list');
  if(!container) return;
  const now = new Date();
  const dow = (now.getDay()+6)%7;
  const key = dk2(now);

  const tplArr = (typeof routine !== 'undefined' && routine.weekdays && typeof routine.weekdays === 'object' && Array.isArray(routine.weekdays[dow]))
    ? routine.weekdays[dow] : [];

  const _daySlot = (typeof _cycleInfoForDate === 'function') ? _cycleInfoForDate(key) : null;
  const skillsItems = (_daySlot && typeof skillTemplates !== 'undefined')
    ? skillTemplates.filter(t => t.cycleSlot === _daySlot.key) : [];

  const activeHabits = (typeof habits !== 'undefined' && typeof getComp === 'function')
    ? habits.filter(h => getComp()[h.id]) : [];

  const arrowStyle = 'flex-shrink:0;width:32px;height:32px;background:var(--c2);border:1px solid var(--bd);border-radius:8px;color:var(--a);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.15s';
  const arrowHover = "onmouseenter=\"this.style.background='var(--a)';this.style.color='#000'\" onmouseleave=\"this.style.background='var(--c2)';this.style.color='var(--a)'\"";

  function tplSectionHeader(label, sectionKey, open, count){
    const chevron = open ? '▾' : '▸';
    const badge = count > 0 ? `<span style="font-family:var(--mono);font-size:10px;color:var(--a);margin-left:6px">${count}</span>` : '';
    return `<div onclick="_toggleTplSection('${sectionKey}')" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:10px 14px;border-bottom:1px solid var(--bd)">
      <span style="font-family:var(--mono);font-size:11px;color:var(--t2);letter-spacing:1.5px;text-transform:uppercase;flex:1">${label}</span>
      ${badge}
      <span style="font-family:var(--mono);font-size:11px;color:var(--t3)">${chevron}</span>
    </div>`;
  }

  let html = '<div style="background:var(--c1);display:flex;flex-direction:column;border-radius:12px;border:1px solid var(--bd);overflow:hidden">';

  // ── ДНИ НЕД. — показываем всегда ──
  {
    const wdDone = tplArr.filter((_,i) => !!(typeof tplDone!=='undefined' && tplDone[key+'__tpl__'+i])).length;
    html += tplSectionHeader('дни нед.', 'weekdays', _tplSections.weekdays, tplArr.length - wdDone);
    if(_tplSections.weekdays){
      html += `<div style="display:flex;flex-direction:column;gap:6px;padding:8px 12px;border-bottom:1px solid var(--bd)">`;
      if(!tplArr.length){
        html += `<div style="font-family:var(--mono);font-size:11px;color:var(--t3);padding:6px 0;text-align:center">нет задач для этого дня — добавь в рутина → дни нед.</div>`;
      } else {
        tplArr.forEach((item, i) => {
          const name = item.name || item;
          const tplKey = key + '__tpl__' + i;
          const isDone = !!(typeof tplDone !== 'undefined' && tplDone[tplKey]);
          html += `<div class="today-item ${isDone?'done':''}" id="today-tpl-item-${i}" onclick="toggleTodayTplItem('${tplKey}',this)">
            <div class="chk">${isDone?'✓':''}</div>
            <div class="item-name" style="flex:1;min-width:0">${name}</div>
            <button onclick="event.stopPropagation();navToWeekTplItem('dc-tpl-wd-${i}')" style="${arrowStyle}" ${arrowHover}>→</button>
          </div>`;
        });
      }
      html += '</div>';
    }
  }

  if(skillsItems.length > 0){
    const totalEx = skillsItems.reduce((s,t)=>s+(t.exercises||[]).length,0);
    const doneEx = skillsItems.reduce((s,t)=>s+(t.exercises||[]).filter((_,ei)=>!!(typeof tplDone!=='undefined'&&tplDone[key+'__sport__'+t.id+'__'+ei])).length,0);
    html += tplSectionHeader('навыки', 'skills', _tplSections.skills, totalEx - doneEx);
    if(_tplSections.skills){
      html += `<div style="display:flex;flex-direction:column;gap:0;padding:4px 12px 8px;border-bottom:1px solid var(--bd)">`;
      if(typeof window._todayTplCollapseState === 'undefined') window._todayTplCollapseState = {};
      skillsItems.forEach(tpl => {
        const collapseKey = '_todayTplCollapse_' + tpl.id;
        const isOpen = !!window._todayTplCollapseState[collapseKey]; // default: closed
        const isMental = tpl.skillType === 'mental';
        const icon = isMental ? '🧠' : '💪';
        const isNumbered = (tpl.exercises||[]).length && /^\d+[.)]/.test(tpl.exercises[0]);
        html += `<div style="margin-bottom:4px">
          <div onclick="event.stopPropagation();(function(){
            if(typeof window._todayTplCollapseState==='undefined')window._todayTplCollapseState={};
            window._todayTplCollapseState['${collapseKey}']=!window._todayTplCollapseState['${collapseKey}'];
            renderTodayTplList();
          })()" style="display:flex;align-items:center;gap:6px;padding:6px 0;cursor:pointer;user-select:none">
            <span style="font-family:var(--mono);font-size:11px;color:var(--a);transition:transform .2s;display:inline-block;transform:${isOpen?'rotate(90deg)':''}">▸</span>
            <span style="font-family:var(--mono);font-size:12px;color:var(--t1);flex:1">${icon} ${tpl.name}</span>
            <button onclick="event.stopPropagation();navToWeekTplItem('dc-tpl-sk-${tpl.id}-0')" style="${arrowStyle}" ${arrowHover}>→</button>
          </div>`;
        if(isOpen){
          if(isNumbered){
            // нумерованный — каждый элемент в отдельную строку
            (tpl.exercises || []).forEach((ex, ei) => {
              const sKey = key + '__sport__' + tpl.id + '__' + ei;
              const isDone = !!(typeof tplDone !== 'undefined' && tplDone[sKey]);
              html += `<div class="today-item ${isDone?'done':''}" onclick="toggleTodayTplItem('${sKey}',this)" style="padding-left:16px">
                <div class="chk">${isDone?'✓':''}</div>
                <div class="item-name" style="flex:1;min-width:0">${ex}</div>
              </div>`;
            });
          } else {
            // через запятую — каждое упражнение тоже с чекбоксом, но без номера
            (tpl.exercises || []).forEach((ex, ei) => {
              const sKey = key + '__sport__' + tpl.id + '__' + ei;
              const isDone = !!(typeof tplDone !== 'undefined' && tplDone[sKey]);
              html += `<div class="today-item ${isDone?'done':''}" onclick="toggleTodayTplItem('${sKey}',this)" style="padding-left:16px">
                <div class="chk">${isDone?'✓':''}</div>
                <div class="item-name" style="flex:1;min-width:0">${ex}</div>
              </div>`;
            });
          }
        }
        html += `</div>`;
      });
      html += '</div>';
    }
  }

  if(activeHabits.length > 0){
    html += tplSectionHeader('привычки', 'habits', _tplSections.habits, activeHabits.length);
    if(_tplSections.habits){
      html += `<div style="display:flex;flex-direction:column;gap:6px;padding:8px 12px">`;
      activeHabits.forEach(h => {
        html += `<div class="today-item" onclick="event.stopPropagation()">
          <div class="chk" style="color:var(--t3);font-size:11px">—</div>
          <div class="item-name" style="flex:1;min-width:0;color:var(--t2)">${h.emoji?h.emoji+' ':''}${h.name}</div>
          <button onclick="event.stopPropagation();navToWeekTplItem('dc-tpl-hab-${h.id}')" style="${arrowStyle}" ${arrowHover}>→</button>
        </div>`;
      });
      html += '</div>';
    }
  }

  html += '</div>';
  container.innerHTML = html;
}
function toggleTodayTplItem(tplKey, el){
  if(typeof tplDone === 'undefined') return;
  tplDone[tplKey] = !tplDone[tplKey];
  if(!tplDone[tplKey]) delete tplDone[tplKey];
  if(typeof LS !== 'undefined') LS.s('tplDone', tplDone);
  if(el){
    const isDone = !!(tplDone[tplKey]);
    const chk = el.querySelector('.chk');
    if(isDone){ el.classList.add('done'); if(chk) chk.textContent='✓'; }
    else { el.classList.remove('done'); if(chk) chk.textContent=''; }
    el.classList.add('today-highlight-anim');
    setTimeout(()=>el.classList.remove('today-highlight-anim'), 600);
  }
  // обновить кольцо
  renderTodayTasks(new Date());
}


// состояние сворачивания секций
let _taskSections = {today: false, planned: false, undone: false};

function _toggleTaskSection(key){
  _taskSections[key] = !_taskSections[key];
  renderTodayTasks(new Date());
}

function renderTodayTasks(now){
  const list = document.getElementById('today-tasks-list');
  const ring = document.getElementById('today-tasks-ring');
  const ringTxt = document.getElementById('today-tasks-ring-txt');
  const countEl = document.getElementById('today-tasks-count');
  if(!list) return;

  const todayKey = dk2(now);
  const dayNames = (typeof t==='function')?t('days_short'):['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const monthNames = (typeof t==='function')?t('months_short'):['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

  // Диапазон: прошлая неделя (7 дней назад) ... следующая неделя (7 дней вперёд)
  const allKeys = [];
  for(let d = -7; d <= 7; d++){
    const dt = new Date(now);
    dt.setDate(now.getDate() + d);
    allKeys.push({ key: dk2(dt), date: dt, offset: d });
  }

  // Задачи сегодня (без привычек — они не считаются)
  const todayTasks = (typeof tasks !== 'undefined' && tasks[todayKey]) ? tasks[todayKey] : [];
  const realTodayTasks = todayTasks.filter(t => !t._isHabit);

  // ДНИ НЕД. для сегодня
  const _dow = (now.getDay()+6)%7;
  const tplArr = (typeof routine !== 'undefined' && routine.weekdays && typeof routine.weekdays === 'object' && Array.isArray(routine.weekdays[_dow]))
    ? routine.weekdays[_dow] : [];
  const _tplDoneCount = tplArr.filter((_, i) => !!(typeof tplDone !== 'undefined' && tplDone[todayKey+'__tpl__'+i])).length;

  // Навыки для сегодня
  const _daySlotInfo = (typeof _cycleInfoForDate === 'function') ? _cycleInfoForDate(todayKey) : null;
  const _skillsTplItems = (_daySlotInfo && typeof skillTemplates !== 'undefined')
    ? skillTemplates.filter(t => t.cycleSlot === _daySlotInfo.key) : [];
  const _skillsCount = _skillsTplItems.reduce((s, t) => s + (t.exercises||[]).length, 0);
  const _skillsDoneCount = _skillsTplItems.reduce((s, t) =>
    s + (t.exercises||[]).filter((_, ei) => !!(typeof tplDone !== 'undefined' && tplDone[todayKey+'__sport__'+t.id+'__'+ei])).length, 0);

  const totalToday = realTodayTasks.length + tplArr.length + _skillsCount;
  const doneToday  = realTodayTasks.filter(t => t.done).length + _tplDoneCount + _skillsDoneCount;
  const pct = totalToday ? Math.round(doneToday / totalToday * 100) : 0;
  const circumference = 188.5;
  if(ring) ring.style.strokeDashoffset = circumference - (circumference * pct / 100);
  if(ringTxt) ringTxt.textContent = pct + '%';
  if(countEl) countEl.textContent = doneToday + '/' + totalToday;

  // Будущие дни (offset > 0) с задачами
  const plannedDays = allKeys.filter(({offset, key}) => {
    if(offset <= 0) return false;
    const arr = (typeof tasks !== 'undefined' && tasks[key]) ? tasks[key] : [];
    return arr.length > 0;
  });

  // Прошлые дни (offset < 0) с невыполненными
  const undoneDays = allKeys.filter(({offset, key}) => {
    if(offset >= 0) return false;
    const arr = (typeof tasks !== 'undefined' && tasks[key]) ? tasks[key] : [];
    return arr.some(t => !t.done);
  });

  function taskItem(t, key, showArrow){
    return `<div class="today-item ${t.done?'done':''}" id="today-task-${t.id}" onclick="toggleTodayTask('${key}','${t.id}')">
      <div class="chk">${t.done?'✓':''}</div>
      <div style="font-size:15px">${t.emoji||''}</div>
      <div class="item-name" style="flex:1;min-width:0" onclick="(function(el,e){e.stopPropagation();if(el.scrollWidth>el.clientWidth+1){if(typeof showTaskPopup==='function')showTaskPopup(el.textContent,e);}else{toggleTodayTask('${key}','${t.id}');}})(this,event)">${t.name}</div>
      ${showArrow ? taskArrowBtn(key, t.id) : ''}
    </div>`;
  }

  function sectionHeader(label, key, open, count, isLast){
    const chevron = open ? '▾' : '▸';
    const badge = count > 0 ? `<span style="font-family:var(--mono);font-size:10px;color:var(--a);margin-left:6px">${count}</span>` : '';
    const borderBottom = (!isLast || open) ? 'border-bottom:1px solid var(--bd);' : '';
    return `<div onclick="_toggleTaskSection('${key}')" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:10px 14px;${borderBottom}">
      <span style="font-family:var(--mono);font-size:11px;color:var(--t2);letter-spacing:1.5px;text-transform:uppercase;flex:1">${label}</span>
      ${badge}
      <span style="font-family:var(--mono);font-size:13px;color:var(--t3)">${chevron}</span>
    </div>`;
  }

  const INNER = 'padding:0 12px';
  const INNER_EMPTY = 'font-family:var(--mono);font-size:11px;color:var(--t3);padding:12px 0;text-align:center';

  let html = '<div style="background:var(--c1);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden">';

  // ── СЕГОДНЯ ──
  html += sectionHeader((typeof t==='function')?t('today_sec_today'):'сегодня', 'today', _taskSections.today, realTodayTasks.filter(t=>!t.done).length, false);
  if(_taskSections.today){
    html += `<div style="${INNER};display:flex;flex-direction:column;gap:6px;padding-top:8px;padding-bottom:8px">`;
    if(!realTodayTasks.length){
      html += `<div style="${INNER_EMPTY}">${(typeof t==='function')?t('today_no_tasks'):'нет задач — добавь во вкладке «неделя»'}</div>`;
    } else {
      html += realTodayTasks.map(t => taskItem(t, todayKey, true)).join('');
    }
    html += '</div>';
  }

  // ── ЗАПЛАНИРОВАНО ──
  html += sectionHeader((typeof t==='function')?t('today_sec_planned'):'запланировано', 'planned', _taskSections.planned, plannedDays.reduce((s,{key})=>s+((typeof tasks!=='undefined'&&tasks[key])?tasks[key].length:0),0), false);
  if(_taskSections.planned){
    html += `<div style="${INNER};display:flex;flex-direction:column;gap:6px;padding-top:8px;padding-bottom:8px">`;
    if(!plannedDays.length){
      html += `<div style="${INNER_EMPTY}">${(typeof t==='function')?t('today_no_planned'):'нет запланированных задач'}</div>`;
    } else {
      plannedDays.forEach(({key, date}) => {
        const dayTasks = (typeof tasks!=='undefined'&&tasks[key])?tasks[key]:[];
        const label = dayNames[date.getDay()] + ' ' + date.getDate() + ' ' + monthNames[date.getMonth()];
        html += `<div style="font-family:var(--mono);font-size:9px;color:var(--a);letter-spacing:1px;text-transform:uppercase;padding:6px 0 4px;opacity:.7">${label}</div>`;
        html += dayTasks.map(t => taskItem(t, key, true)).join('');
      });
    }
    html += '</div>';
  }

  // ── НЕВЫПОЛНЕННЫЕ ──
  const undoneCount = undoneDays.reduce((s,{key})=>s+((typeof tasks!=='undefined'&&tasks[key])?tasks[key].filter(t=>!t.done).length:0),0);
  html += sectionHeader((typeof t==='function')?t('today_sec_undone'):'невыполненные', 'undone', _taskSections.undone, undoneCount, false);
  if(_taskSections.undone){
    html += `<div style="${INNER};display:flex;flex-direction:column;gap:6px;padding-top:8px;padding-bottom:8px">`;
    if(!undoneDays.length){
      html += `<div style="${INNER_EMPTY}">${(typeof t==='function')?t('today_all_done'):'всё выполнено 👍'}</div>`;
    } else {
      undoneDays.forEach(({key, date}) => {
        const dayTasks = ((typeof tasks!=='undefined'&&tasks[key])?tasks[key]:[]).filter(t=>!t.done);
        if(!dayTasks.length) return;
        const label = dayNames[date.getDay()] + ' ' + date.getDate() + ' ' + monthNames[date.getMonth()];
        html += `<div style="font-family:var(--mono);font-size:9px;color:var(--red,#ef4444);letter-spacing:1px;text-transform:uppercase;padding:6px 0 4px;opacity:.8">${label}</div>`;
        html += dayTasks.map(t => taskItem(t, key, true)).join('');
      });
    }
    html += '</div>';
  }

  html += '</div>';
  list.innerHTML = html;
}

function toggleTodayTask(key, id){
  if(typeof tasks==='undefined') return;
  const arr=tasks[key]||[];
  const t=arr.find(x=>String(x.id)===String(id));
  if(!t) return;
  t.done=!t.done;
  if(typeof LS!=='undefined') LS.s('tasks',tasks);
  renderTodayTasks(new Date());
  if(typeof curPage!=='undefined'&&curPage==='week'&&typeof buildWeek==='function') buildWeek();
}

// ── СВОРАЧИВАЕМЫЕ БЛОКИ ЦЕЛЕЙ ────────────────────────────
const _todayGoalCollapsed = {};
function toggleTodayGoalBlock(key, listId, headerEl) {
  _todayGoalCollapsed[key] = !_todayGoalCollapsed[key];
  const list = document.getElementById(listId);
  const chevronId = headerEl ? headerEl.querySelector('span[id$="-chevron"]') : null;
  if (list) {
    if (_todayGoalCollapsed[key]) {
      list.style.display = 'none';
    } else {
      list.style.display = 'flex';
    }
  }
  if (chevronId) chevronId.style.transform = _todayGoalCollapsed[key] ? '' : 'rotate(90deg)';
}
function _applyGoalCollapse(key, listId, chevronElId) {
  const collapsed = _todayGoalCollapsed[key] !== false; // default true = collapsed
  const list = document.getElementById(listId);
  const chev = document.getElementById(chevronElId);
  if (list) list.style.display = collapsed ? 'none' : 'flex';
  if (chev) chev.style.transform = collapsed ? '' : 'rotate(90deg)';
}

// ── ЦЕЛИ МЕСЯЦА ──────────────────────────────────────────
function renderTodayMG(){
  const block=document.getElementById('today-mg-block');
  const list=document.getElementById('today-mg-list');
  if(!block||!list) return;
  const now=new Date();
  // Формат совпадает с mk() в main.js: "M{year}-{month0based}"
  const mKey='M'+now.getFullYear()+'-'+now.getMonth();
  const mgArr=(typeof mg!=='undefined'&&mg[mKey])?mg[mKey]:[];
  if(!mgArr.length){ block.style.display='none'; return; }
  block.style.display='block';
  // init collapsed state (default: collapsed)
  if(_todayGoalCollapsed['today-mg-collapsed']===undefined) _todayGoalCollapsed['today-mg-collapsed']=true;
  _applyGoalCollapse('today-mg-collapsed','today-mg-list','today-mg-chevron');
  const countEl=document.getElementById('today-mg-count');
  if(countEl) countEl.textContent='('+mgArr.filter(g=>!g.done).length+')';
  list.innerHTML=mgArr.map((g,i)=>`
    <div class="today-item ${g.done?'done':''}" id="today-mg-${i}" onclick="toggleTodayMG('${mKey}',${i},this)" style="cursor:pointer">
      <div class="chk">${g.done?'✓':''}</div>
      <div class="item-name">${g.name}</div>
      ${arrowBtn('week','mgList')}
    </div>`).join('');
}

function toggleTodayMG(mKey, idx, el){
  if(typeof mg==='undefined'||!mg[mKey]) return;
  const g=mg[mKey][idx]; if(!g) return;
  g.done=!g.done;
  if(typeof LS!=='undefined') LS.s('mg',mg);
  if(g.done&&el){
    el.classList.add('done');
    const chk=el.querySelector('.chk'); if(chk) chk.textContent='✓';
    setTimeout(()=>todayFadeOut(el,()=>renderTodayMG()), 1200);
  } else { renderTodayMG(); }
  if(typeof curPage!=='undefined'&&curPage==='week'&&typeof buildWeek==='function') buildWeek();
}

// ── ПРОСТО ЦЕЛИ ──────────────────────────────────────────
function navToGoals(goalId){
  const btn=findNavBtn('goals'); goPage('goals',btn);
  setTimeout(()=>{
    const el=goalId?document.getElementById('free-goal-item-'+goalId):document.getElementById('freeGoalsList');
    if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.classList.add('today-highlight-anim'); setTimeout(()=>el.classList.remove('today-highlight-anim'),1600); }
  },250);
}

function renderTodayFreeGoals(){
  const block=document.getElementById('today-freegoals-block');
  const list=document.getElementById('today-freegoals-list');
  if(!block||!list) return;
  const fg=typeof freeGoals!=='undefined'?freeGoals:[];
  // Only show undone items (done ones flew away)
  const active=fg.filter(g=>!g.done);
  if(!active.length){ block.style.display='none'; return; }
  block.style.display='block';
  if(_todayGoalCollapsed['today-fg-collapsed']===undefined) _todayGoalCollapsed['today-fg-collapsed']=true;
  _applyGoalCollapse('today-fg-collapsed','today-freegoals-list','today-fg-chevron');
  const fgCountEl=document.getElementById('today-fg-count');
  if(fgCountEl) fgCountEl.textContent='('+active.length+')';
  list.innerHTML=active.map(g=>`
    <div class="today-item" id="today-fg-${g.id}" onclick="toggleTodayFreeGoal(${g.id},this)" style="cursor:pointer">
      <div class="chk"></div>
      ${g.photo?`<img src="${g.photo}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0">`:'<div style="font-size:18px">🎯</div>'}
      <div class="item-name">${g.text||''}</div>
      ${arrowBtn('goals','free-goal-item-'+g.id)}
    </div>`).join('');
}

function toggleTodayFreeGoal(id, el){
  if(typeof freeGoals==='undefined') return;
  const g=freeGoals.find(x=>x.id==id); if(!g) return;
  g.done=true;
  if(typeof LS!=='undefined') LS.s('freeGoals',freeGoals);
  if(el){
    // Immediately show done state: green bg + ✓ circle + strikethrough
    el.classList.add('done');
    const chk=el.querySelector('.chk'); if(chk) chk.textContent='✓';
    // After pause, fly away and disappear
    setTimeout(()=>todayFadeOut(el,()=>{
      renderTodayFreeGoals();
      if(typeof curPage!=='undefined'&&curPage==='goals'&&typeof renderGoals==='function') renderGoals();
    }), 1200);
  }
}

// ── ЦЕЛИ С ДЕДЛАЙНОМ ────────────────────────────────────
function renderTodayDeadlineGoals(){
  const block=document.getElementById('today-deadline-goals-block');
  const list=document.getElementById('today-deadline-goals-list');
  if(!block||!list) return;
  const gl=typeof goals!=='undefined'?goals:[];
  const now=new Date();
  const active=gl.filter(g=>{
    if(g.done) return false;
    if(!g.deadline) return false;
    const days=typeof daysToDeadline==='function'?daysToDeadline(g.deadline,now):null;
    return days!==null&&days<=30;
  }).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  if(!active.length){ block.style.display='none'; return; }
  block.style.display='block';
  if(_todayGoalCollapsed['today-dl-collapsed']===undefined) _todayGoalCollapsed['today-dl-collapsed']=true;
  _applyGoalCollapse('today-dl-collapsed','today-deadline-goals-list','today-dl-chevron');
  const dlCountEl=document.getElementById('today-dl-count');
  if(dlCountEl) dlCountEl.textContent='('+active.length+')';
  list.innerHTML=active.map(g=>{
    const days=typeof daysToDeadline==='function'?daysToDeadline(g.deadline,now):null;
    const dlColor=days<0?'var(--red)':days===0?'var(--red)':days<=7?'var(--amber)':'var(--a)';
    const dlLabel=days===null?'':days===0?'сегодня!':days<0?`просрочено ${Math.abs(days)}д.`:`${days}д.`;
    return `<div class="today-item" id="today-dlgoal-${g.id}" onclick="toggleTodayDeadlineGoal(${g.id},this)" style="cursor:pointer">
      <div class="chk" style="flex-shrink:0"></div>
      <div style="font-size:16px">🎯</div>
      <div style="flex:1;min-width:0">
        <div class="item-name" style="font-size:14px;font-weight:500;overflow:visible;white-space:normal">${g.name}</div>
        ${g.note?`<div class="item-note" style="font-size:12px;color:var(--t2);margin-top:1px">${g.note}</div>`:''}
        <div class="item-dl" style="font-family:var(--mono);font-size:10px;color:${dlColor};margin-top:3px">${dlLabel}</div>
      </div>
      ${arrowBtn('goals','goal-item-'+g.id)}
    </div>`;
  }).join('');
}

function toggleTodayDeadlineGoal(id, el){
  if(typeof goals==='undefined') return;
  const g=goals.find(x=>x.id==id); if(!g) return;
  // Immediately show done state: green bg + ✓ circle + strikethrough
  el.classList.add('done');
  const chk=el.querySelector('.chk'); if(chk) chk.textContent='✓';
  setTimeout(()=>{
    todayFadeOut(el, ()=>{
      g.done=true;
      if(typeof LS!=='undefined') LS.s('goals',goals);
      renderTodayDeadlineGoals();
      if(typeof curPage!=='undefined'&&curPage==='goals'&&typeof renderGoals==='function') renderGoals();
    });
  }, 1200);
}

// ── РУТИНА УТРО/ДЕНЬ/ВЕЧЕР ───────────────────────────────
function renderTodayRoutine(now){ renderTodayRoutineSlot(now,todayRoutineSlot); }

function renderTodayRoutineSlot(now, slot){
  const container=document.getElementById('today-routine-items');
  if(!container) return;
  const key=dk2(now);
  if(!routineLog[key]) routineLog[key]={morning:{},day:{},evening:{}};
  const log=routineLog[key];
  const items=(typeof routine!=='undefined'&&routine[slot])?routine[slot]:[];
  if(!items.length){ container.innerHTML=`<div style="font-family:var(--mono);font-size:11px;color:var(--t2);padding:14px;text-align:center;letter-spacing:1px">— нет пунктов для «${slot==='morning'?'утра':slot==='day'?'дня':'вечера'}» —</div>`; return; }
  container.innerHTML=items.map((item,i)=>{
    const name=item.name||item;
    const done=!!(log[slot]&&log[slot][name]);
    return `<div class="today-rt-item ${done?'done':''}" id="today-rt-${slot}-${i}" onclick="toggleTodayRoutine('${key}','${slot}',${i},this)">
      <div class="rt-chk">${done?'✓':''}</div>
      <div class="rt-name" style="flex:1">${name}</div>
      ${arrowBtn('routine','rt-item-'+slot+'-'+i)}
    </div>`;
  }).join('');
}

function switchTodayRoutine(el, slot){
  todayRoutineSlot=slot;
  document.querySelectorAll('.today-rt-tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  renderTodayRoutineSlot(new Date(),slot);
}

function toggleTodayRoutine(key, slot, idx, el){
  if(!routineLog[key]) routineLog[key]={morning:{},day:{},evening:{}};
  if(!routineLog[key][slot]) routineLog[key][slot]={};
  // Используем имя пункта как ключ — так же как основная страница рутины
  const name = (typeof routine!=='undefined'&&routine[slot]&&routine[slot][idx])
    ? (routine[slot][idx].name || routine[slot][idx])
    : String(idx);
  const nowDone=!routineLog[key][slot][name];
  routineLog[key][slot][name]=nowDone;
  if(!nowDone) delete routineLog[key][slot][name];
  if(typeof LS!=='undefined') LS.s('routineLog',routineLog);
  if(el){
    const chk=el.querySelector('.rt-chk');
    if(nowDone){
      el.classList.add('done'); if(chk) chk.textContent='✓';
    } else { el.classList.remove('done'); if(chk) chk.textContent=''; }
  }
  if(typeof curPage!=='undefined'&&curPage==='routine'&&typeof renderRoutine==='function') renderRoutine();
}

// ── РУТИНА НЕДЕЛИ/МЕСЯЦА/ГОДА ────────────────────────────
function _renderWMY(block, items, logObj, containerId){
  const container=document.getElementById(containerId); if(!container) return;
  container.innerHTML=items.map((item,i)=>{
    const name=item.name||item;
    const done=!!logObj[name];
    return `<div class="today-rt-item ${done?'done':''}" id="today-wmy-${block}-${i}" onclick="toggleTodayWeekMonthYear('${block}',${i},this)">
      <div class="rt-chk">${done?'✓':''}</div>
      <div class="rt-name" style="flex:1">${name}</div>
      ${arrowBtn('routine','rt-item-'+block+'-'+i)}
    </div>`;
  }).join('');
}

function renderTodayWeekRoutine(now){
  const block=document.getElementById('today-week-routine-block');
  if(!block) return;
  const dow=now.getDay();
  if(dow!==6&&dow!==0&&dow!==1){ block.style.display='none'; return; }
  const notifs=(typeof collectNotifications==='function')?collectNotifications():[];
  const hasNotif=notifs.some(n=>n.id==='week_mon'||n.id==='week_sun'||n.id==='week_sat');
  const wItems=(typeof routine!=='undefined'&&routine.week)?routine.week:[];
  if(!hasNotif||!wItems.length){ block.style.display='none'; return; }
  block.style.display='block';
  const wl=(typeof getBlockLog==='function')?getBlockLog('week'):{};
  _renderWMY('week',wItems,wl,'today-week-routine-list');
}

function renderTodayMonthRoutine(now){
  const block=document.getElementById('today-month-routine-block');
  if(!block) return;
  const lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const showMonth=now.getDate()===1||now.getDate()>=(lastDay-2);
  if(!showMonth){ block.style.display='none'; return; }
  const notifs=(typeof collectNotifications==='function')?collectNotifications():[];
  const hasNotif=notifs.some(n=>n.id==='month_routine');
  const mItems=(typeof routine!=='undefined'&&routine.month)?routine.month:[];
  if(!hasNotif||!mItems.length){ block.style.display='none'; return; }
  block.style.display='block';
  const ml=(typeof getBlockLog==='function')?getBlockLog('month'):{};
  _renderWMY('month',mItems,ml,'today-month-routine-list');
}

function renderTodayYearRoutine(now){
  const block=document.getElementById('today-year-routine-block');
  if(!block) return;
  const mo=now.getMonth(),d=now.getDate();
  const showYear=(mo===11&&d>=25)||(mo===0&&d<=5);
  if(!showYear){ block.style.display='none'; return; }
  const notifs=(typeof collectNotifications==='function')?collectNotifications():[];
  const hasNotif=notifs.some(n=>n.id==='newyear');
  const yItems=(typeof routine!=='undefined'&&routine.year)?routine.year:[];
  if(!hasNotif||!yItems.length){ block.style.display='none'; return; }
  block.style.display='block';
  const yl=(typeof getBlockLog==='function')?getBlockLog('year'):{};
  _renderWMY('year',yItems,yl,'today-year-routine-list');
}

function toggleTodayWeekMonthYear(block, idx, el){
  if(typeof routine==='undefined'||!Array.isArray(routine[block])) return;
  const name=routine[block][idx]; if(!name) return;
  const obj=getBlockLog(block);
  const nowDone=!obj[name];
  obj[name]=nowDone; if(!obj[name]) delete obj[name];
  saveBlockLog(block,obj);
  if(el){
    const chk=el.querySelector('.rt-chk');
    if(nowDone){
      el.classList.add('done'); if(chk) chk.textContent='✓';
    } else { el.classList.remove('done'); if(chk) chk.textContent=''; }
  }
  if(typeof curPage!=='undefined'&&curPage==='routine'&&typeof renderRoutine==='function') renderRoutine();
}
