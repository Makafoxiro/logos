// ═══ MODULE: week.js ═══
// ══ WEEK ═══════════════════════════════════════════════
let weekOffset = 0; // 0 = current week, -1 = last week, +1 = next week

function getWeekMonday(offset){
  const mon=getMonday(new Date());
  mon.setDate(mon.getDate()+offset*7);
  return mon;
}

function buildWeek(){
  renderMGStrip();
  renderNotificationsPanel();
  const scroll=document.getElementById('weekScroll');
  scroll.innerHTML='';
  const mon=getWeekMonday(weekOffset);
  for(let i=0;i<7;i++){
    const d=new Date(mon);d.setDate(mon.getDate()+i);
    const card=document.createElement('div');
    card.className='day-card'+(dk(d)===nowDK()?' today':'');
    card.id='dc-'+dk(d);
    scroll.appendChild(card);
    paintCard(card,d);
  }
  updateWNav();
  // scroll to today if in current week, else scroll to first card
  if(weekOffset===0){
    setTimeout(()=>{
      const dow=(new Date().getDay()+6)%7;
      scrollToCard(dow);
    },80);
  } else {
    setTimeout(()=>scrollToCard(0),80);
    curCardIdx=0;
  }
  // track scroll for dots
  scroll.onscroll=null;
  scroll.addEventListener('scroll',()=>{
    const cw=(scroll.querySelector('.day-card')?.offsetWidth||50)+6;
    curCardIdx=Math.round(scroll.scrollLeft/cw);
    updateWNav();
  },{passive:true});
}

function scrollToCard(idx){
  const scroll=document.getElementById('weekScroll');
  const cards=scroll.querySelectorAll('.day-card');
  if(cards[idx])cards[idx].scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'});
  curCardIdx=idx;updateWNav();
}
function weekShift(dir){
  // Arrows always switch entire week
  weekOffset+=dir;
  buildWeek();
}

function updateWNav(){
  const mon=getWeekMonday(weekOffset);
  const end=new Date(mon);end.setDate(mon.getDate()+6);
  const isCurrentWeek=weekOffset===0;
  document.getElementById('wnLbl').textContent=
    (isCurrentWeek?(typeof t==='function'?t('week_this'):'Эта неделя · '):'')+`${mon.getDate()} ${MSHORT[mon.getMonth()]} — ${end.getDate()} ${MSHORT[end.getMonth()]}`;
  document.getElementById('wnDots').innerHTML=DAYS7.map((_,i)=>`<div class="wdot${i===curCardIdx?' on':''}"></div>`).join('');
}

// track which cards show template view
const cardTplView={};

function paintCard(card,d){
  const key=dk(d);
  card.dataset.daykey=key;
  const arr=tasks[key]||[];
  const realArr=arr.filter(x=>!x._isHabit);
  const tplArr=Array.isArray(routine.weekdays[(d.getDay()+6)%7])?routine.weekdays[(d.getDay()+6)%7]:[];
  const _daySlot=_cycleInfoForDate(dk(d));
  const _skillsTplItems=_daySlot?skillTemplates.filter(t=>t.cycleSlot===_daySlot.key):[];
  const _skillsCount=_skillsTplItems.reduce((s,t)=>s+t.exercises.length,0);
  const _tplKey2=dk(d);
  const _tplDoneCount=tplArr.filter((_,i)=>!!tplDone[_tplKey2+'__tpl__'+i]).length;
  const _skillsDoneCount=_skillsTplItems.reduce((s,t)=>s+t.exercises.filter((_,ei)=>!!tplDone[_tplKey2+'__sport__'+t.id+'__'+ei]).length,0);
  const done=realArr.filter(x=>x.done).length+_tplDoneCount+_skillsDoneCount,total=realArr.length+tplArr.length+_skillsCount,p=pct(done,total);
  const circ=107.0,off=circ-(p/100)*circ;
  const dow=(d.getDay()+6)%7;
  const showTpl=!!cardTplView[key];
  const tpl=Array.isArray(routine.weekdays[dow])?routine.weekdays[dow]:[];

  const isMob=window.innerWidth<768;
  const h1=showTpl?'display:none':'';
  const h2=showTpl?'':'display:none';

  // On mobile: header shows day + date in a row with ring on the right
  const headHTML=isMob
    ? '<div class="dc-head" style="display:flex;align-items:center;gap:8px;padding:10px 12px 4px">'+
        '<div>'+
          '<div class="dc-dn" style="font-size:12px;text-align:left;letter-spacing:1px">'+DAYS7[dow]+'</div>'+
          '<div class="dc-dt" style="font-size:18px;color:var(--t);font-weight:600;text-align:left;margin:0">'+d.getDate()+'</div>'+
        '</div>'+
        '<div style="flex:1"></div>'+
        '<div class="dc-ring" style="margin:0">'+
          '<svg viewBox="0 0 44 44" width="44" height="44">'+
            '<circle class="dc-rt" cx="22" cy="22" r="16" stroke-width="5"/>'+
            '<circle class="dc-rf" cx="22" cy="22" r="16" stroke-dasharray="100.5" stroke-dashoffset="'+(100.5-(p/100)*100.5)+'" stroke-width="5" transform="rotate(-90 22 22)" style="transform-origin:22px 22px"/>'+
            '<text class="dc-pct-t" x="22" y="22" text-anchor="middle" dominant-baseline="central" font-size="11">'+p+'%</text>'+
          '</svg>'+
        '</div>'+
      '</div>'+
      '<div class="dc-cnt" style="font-size:10px;text-align:right;padding:0 12px;margin-bottom:4px">'+(total?(done+'/'+total+(typeof t==='function'?' '+(appLang==='en'?'tasks':'задач'):'задач')):(typeof t==='function'?t('week_no_tasks'):'нет задач'))+'</div>'
    : '<div class="dc-head">'+
        '<div class="dc-dn">'+DAYS7[dow]+'</div>'+
        '<div class="dc-dt">'+d.getDate()+'</div>'+
      '</div>'+
      '<div class="dc-ring">'+
        '<svg viewBox="0 0 34 34">'+
          '<circle class="dc-rt" cx="17" cy="17" r="12"/>'+
          '<circle class="dc-rf" cx="17" cy="17" r="12" stroke-dasharray="'+circ+'" stroke-dashoffset="'+off+'"/>'+
          '<text class="dc-pct-t" x="17" y="17" text-anchor="middle" dominant-baseline="central">'+p+'%</text>'+
        '</svg>'+
      '</div>'+
      '<div class="dc-cnt">'+(total?(done+'/'+total):'—')+'</div>';

  card.innerHTML=
    headHTML+
    '<div class="dc-tasks" style="'+(isMob?'padding:0 12px;':'')+h1+'"></div>'+
    '<div class="dc-tpl-list" style="'+(isMob?'padding:0 12px;':'')+h2+'"></div>'+
    '<div class="dc-footer" style="display:flex;align-items:center;gap:'+(isMob?'6':'3')+'px;'+(isMob?'padding:8px 12px 10px':'')+'">'+
      '<input class="dc-inp" id="taskinp-'+key+'" placeholder="'+(typeof t==='function'?t('week_add_ph'):'задача...')+'" maxlength="300" style="flex:1;'+(showTpl?'visibility:hidden;pointer-events:none;':'')+'">'+
      '<div class="dc-abtn" id="taskabtn-'+key+'" style="'+(showTpl?'visibility:hidden;pointer-events:none;':'')+(isMob?'width:36px;height:36px;font-size:20px;':'')+'flex-shrink:0">+</div>'+
      '<div class="dc-tpl-btn'+(showTpl?' on':'')+'" id="tplbtn-'+key+'" style="flex-shrink:0'+(isMob?';font-size:13px;padding:6px 10px':'')+'">📋</div>'+
    '</div>';

  // task space
  const inp=card.querySelector('#taskinp-'+key);
  const abtn=card.querySelector('#taskabtn-'+key);
  const tplbtn=card.querySelector('#tplbtn-'+key);
  const tplList=card.querySelector('.dc-tpl-list');
  const tplInp=card.querySelector('#tplinp-'+key);
  const tplAbtn=card.querySelector('#tplabtn-'+key);

  if(inp) inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();wcAddTask(card,key);}});
  if(abtn) abtn.addEventListener('click',()=>wcAddTask(card,key));

  // toggle between spaces
  if(tplbtn) tplbtn.addEventListener('click',()=>{
    cardTplView[key]=!cardTplView[key];
    paintCard(card,d);
  });

  // template space — fully functional
  function makeSep(){const s=document.createElement('div');s.style.cssText='height:1px;background:var(--bd);margin:4px 2px 4px;flex-shrink:0';return s;}
  function makeLabel(txt){const l=document.createElement('div');l.style.cssText='font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;padding:2px 2px 1px';l.textContent=txt;return l;}
  function tplRender(){
    if(!tplList)return;
    const items=Array.isArray(routine.weekdays[dow])?routine.weekdays[dow]:[];
    const activeHabits=habits.filter(h=>getComp()[h.id]);
    // skills templates assigned to this weekday (0=Пн..6=Вс)
    const _ds=dk(d);
    const _slotInfo=_cycleInfoForDate(_ds);
    const skillsItems=_slotInfo?skillTemplates.filter(t=>t.cycleSlot===_slotInfo.key):[];
    tplList.innerHTML='';

    const hasAnything=skillsItems.length>0||items.length>0||activeHabits.length>0;
    if(!hasAnything){
      const empty=document.createElement('div');
      empty.className='dc-tpl-empty';
      empty.textContent=(typeof t==='function'?t('week_empty'):'шаблон пуст');
      tplList.appendChild(empty);
      return;
    }

    // ── ДНИ НЕД. ──
    if(items.length>0){
      tplList.appendChild(makeLabel(typeof t==='function'?t('week_weekdays'):'дни нед.'));
      items.forEach((name,i)=>{
        const tplKey=key+'__tpl__'+i;
        const isDone=!!(tplDone[tplKey]);
        const row=document.createElement('div');
        row.className='dc-task'+(isDone?' done':'');
        row.style.cursor='pointer';
        const chk=document.createElement('div');chk.className='dc-chk';
        if(isDone)chk.textContent='✓';
        const rawName=typeof name==='object'?name.name:name;
        const tn=document.createElement('div');tn.className='dc-tn';tn.textContent=rawName;
        const toggle=()=>{
          tplDone[tplKey]=!tplDone[tplKey];
          if(!tplDone[tplKey])delete tplDone[tplKey];
          LS.s('tplDone',tplDone);
          tplRender();
          updateRingFromTpl();
        };
        chk.addEventListener('click',e=>{e.stopPropagation();toggle();});
        tn.addEventListener('click',e=>{
          e.stopPropagation();
          if(tn.scrollWidth>tn.clientWidth+1){showTaskPopup(rawName,e);}
          else{toggle();}
        });
        row.addEventListener('click',toggle);
        row.id='dc-tpl-wd-'+i;
        row.appendChild(chk);row.appendChild(tn);
        tplList.appendChild(row);
      });
    }

    // ── НАВЫКИ ──
    if(skillsItems.length>0){
      if(items.length>0)tplList.appendChild(makeSep());
      tplList.appendChild(makeLabel(typeof t==='function'?t('week_skills'):'навыки'));
      skillsItems.forEach(tpl=>{
        // Collapsible header for skill template (no hyperlink)
        const collapseKey='_tplCollapse_'+tpl.id+'_'+key;
        if(typeof window._tplCollapseState==='undefined')window._tplCollapseState={};
        // default collapsed
        const isOpen=!!window._tplCollapseState[collapseKey];
        const wrapper=document.createElement('div');
        wrapper.style.cssText='margin-bottom:2px';

        const header=document.createElement('div');
        header.style.cssText='display:flex;align-items:center;gap:5px;padding:3px 2px;cursor:pointer;border-radius:6px;transition:background .15s';
        header.onmouseenter=()=>header.style.background='var(--c3,rgba(255,255,255,0.05))';
        header.onmouseleave=()=>header.style.background='';

        const arrow=document.createElement('span');
        arrow.style.cssText='font-family:var(--mono);font-size:11px;color:var(--t2);transition:transform .2s;display:inline-block;flex-shrink:0';
        arrow.textContent='▸';
        if(isOpen)arrow.style.transform='rotate(90deg)';

        const label=document.createElement('span');
        label.style.cssText='font-family:var(--mono);font-size:11px;color:var(--t1);letter-spacing:0.5px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
        label.textContent=tpl.name;

        const exList=document.createElement('div');
        exList.style.cssText='display:'+(isOpen?'block':'none')+';padding-left:8px';

        header.appendChild(arrow);header.appendChild(label);
        header.addEventListener('click',e=>{
          e.stopPropagation();
          const open=!!window._tplCollapseState[collapseKey];
          window._tplCollapseState[collapseKey]=!open;
          exList.style.display=open?'none':'block';
          arrow.style.transform=open?'':'rotate(90deg)';
        });

        tpl.exercises.forEach((ex,ei)=>{
          const sKey=key+'__sport__'+tpl.id+'__'+ei;
          const isDone=!!(tplDone[sKey]);
          const row=document.createElement('div');
          row.className='dc-task'+(isDone?' done':'');
          row.style.cursor='pointer';
          const chk=document.createElement('div');chk.className='dc-chk';
          if(isDone)chk.textContent='✓';
          const tn=document.createElement('div');tn.className='dc-tn';
          const isMentalTpl = tpl.skillType === 'mental';
          const isNumberedTpl = /^\d+[.)]/.test(ex);
          const exIcon = isNumberedTpl ? '' : (isMentalTpl ? '🧠 ' : '💪 ');
          tn.textContent = exIcon + ex;
          const toggle=()=>{
            tplDone[sKey]=!tplDone[sKey];
            if(!tplDone[sKey])delete tplDone[sKey];
            LS.s('tplDone',tplDone);
            tplRender();
            updateRingFromTpl();
          };
          chk.addEventListener('click',e=>{e.stopPropagation();toggle();});
          tn.addEventListener('click',e=>{
            e.stopPropagation();
            if(tn.scrollWidth>tn.clientWidth+1){
              if(typeof showTaskPopup==='function')showTaskPopup(exIcon+ex,e);
            }else{toggle();}
          });
          row.addEventListener('click',e=>{if(e.target!==tn)toggle();});
          row.id='dc-tpl-sk-'+tpl.id+'-'+ei;
          row.appendChild(chk);row.appendChild(tn);
          exList.appendChild(row);
        });

        wrapper.appendChild(header);wrapper.appendChild(exList);
        tplList.appendChild(wrapper);
      });
    }

    // ── ПРИВЫЧКИ ──
    if(activeHabits.length>0){
      if(skillsItems.length>0||items.length>0)tplList.appendChild(makeSep());
      tplList.appendChild(makeLabel(typeof t==='function'?t('week_habits'):'привычки'));
      activeHabits.forEach(h=>{
        const row=document.createElement('div');
        row.className='dc-task';
        row.style.cssText='cursor:default';
        const dash=document.createElement('div');
        dash.style.cssText='font-size:11px;color:var(--t3);flex-shrink:0;padding:0 3px;line-height:1';
        dash.textContent='—';
        const tn=document.createElement('div');tn.className='dc-tn';
        tn.textContent=(h.emoji?h.emoji+' ':'')+h.name;
        tn.style.color='var(--t2)';
        row.id='dc-tpl-hab-'+h.id;
        row.appendChild(dash);row.appendChild(tn);
        tplList.appendChild(row);
      });
    }
  }
  function updateRingFromTpl(){
    const _arr=tasks[key]||[];
    const _real=_arr.filter(x=>!x._isHabit);
    const _tplArr2=Array.isArray(routine.weekdays[dow])?routine.weekdays[dow]:[];
    const _slotInfo2=_cycleInfoForDate(key);
    const _skItems2=_slotInfo2?skillTemplates.filter(t=>t.cycleSlot===_slotInfo2.key):[];
    const _spCnt=_skItems2.reduce((s,t)=>s+t.exercises.length,0);
    const _tplDoneCnt=_tplArr2.filter((_,i)=>!!tplDone[key+'__tpl__'+i]).length;
    const _skDoneCnt=_skItems2.reduce((s,t)=>s+t.exercises.filter((_,ei)=>!!tplDone[key+'__sport__'+t.id+'__'+ei]).length,0);
    const _done=_real.filter(x=>x.done).length+_tplDoneCnt+_skDoneCnt;
    const _total=_real.length+_tplArr2.length+_spCnt;
    const _p=pct(_done,_total);
    const _circ=107.0,_off=_circ-(_p/100)*_circ;
    const _isMob=window.innerWidth<768;
    if(_isMob){
      const rf=card.querySelector('.dc-rf');if(rf){rf.style.strokeDashoffset=100.5-(_p/100)*100.5;}
      const pt=card.querySelector('.dc-pct-t');if(pt)pt.textContent=_p+'%';
      const cnt=card.querySelector('.dc-cnt');if(cnt)cnt.textContent=_total?(_done+'/'+_total+(typeof t==='function'?' '+(appLang==='en'?'tasks':'задач'):'задач')):(typeof t==='function'?t('week_no_tasks'):'нет задач');
    } else {
      const rf=card.querySelector('.dc-rf');if(rf)rf.style.strokeDashoffset=_off;
      const pt=card.querySelector('.dc-pct-t');if(pt)pt.textContent=_p+'%';
      const cnt=card.querySelector('.dc-cnt');if(cnt)cnt.textContent=_total?(_done+'/'+_total):'—';
    }
  }

  tplRender();

  wcRenderTasks(card,key);
}
function wcAddTask(card,key){
  const inp=card.querySelector('#taskinp-'+key);
  if(!inp)return;
  const name=inp.value.trim();if(!name)return;
  if(!tasks[key])tasks[key]=[];
  tasks[key].push({id:nid++,name,done:false});
  LS.s('tasks',tasks);LS.s('nid',nid);
  inp.value='';
  wcRenderTasks(card,key);
  wcUpdateRing(card,key);
}

// ── Drag state for day-card tasks ──
let _wcDrag={key:null,idx:null};
let _wcTouch={key:null,idx:null,startY:0,startX:0};

function wcRenderTasks(card,key){
  const el=card.querySelector('.dc-tasks');if(!el)return;
  el.innerHTML='';
  (tasks[key]||[]).forEach((t,i)=>{
    const isHabit=!!t._isHabit;
    const row=document.createElement('div');
    row.className='dc-task'+(t.done?' done':'');
    row.id='dc-task-'+key+'-'+t.id;
    row.dataset.idx=i;

    // привычка — просто тире, без клика
    if(isHabit){
      row.innerHTML=`<div style="font-size:11px;color:var(--t3);flex-shrink:0;padding:0 4px">—</div><div class="dc-tn" style="color:var(--t2)">${t.emoji?t.emoji+' ':''}${t.name}</div>`;
      const delBtn=document.createElement('button');
      delBtn.className='dc-tdel';delBtn.textContent='✕';
      delBtn.addEventListener('click',e=>{e.stopPropagation();wcDelTask(key,t.id);});
      row.appendChild(delBtn);
      el.appendChild(row);
      return;
    }

    const isSkill=!!t._sportTplId;
    const skillLink='';

    // drag handle
    const drag=document.createElement('span');
    drag.style.cssText='color:var(--t3);font-size:12px;cursor:grab;padding:2px 3px;flex-shrink:0;touch-action:none;user-select:none;-webkit-user-select:none';
    drag.textContent='⠿';
    drag.setAttribute('draggable','true');
    drag.addEventListener('dragstart',e=>{e.stopPropagation();_wcDrag={key,idx:i};row.style.opacity='.4';});
    drag.addEventListener('dragend',e=>{row.style.opacity='';el.querySelectorAll('.dc-task').forEach(r=>r.classList.remove('dc-drag-top','dc-drag-bot'));});
    drag.addEventListener('touchstart',e=>{
      e.stopPropagation();e.preventDefault();
      const t0=e.touches[0];const rect=row.getBoundingClientRect();
      const ghost=row.cloneNode(true);ghost.id='_dragGhost';
      ghost.style.cssText='position:fixed;left:'+rect.left+'px;top:'+rect.top+'px;width:'+rect.width+'px;opacity:0.85;pointer-events:none;z-index:9999;background:var(--c1);border:1px solid var(--a);border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,0.5)';
      document.body.appendChild(ghost);
      row.style.opacity='.25';
      _wcTouch={key,idx:i,startY:t0.clientY,startX:t0.clientX,ghostOffY:t0.clientY-rect.top};
    },{passive:false});
    drag.addEventListener('touchmove',e=>{
      if(_wcTouch.key!==key)return;
      e.preventDefault();
      const t0=e.touches[0];
      const ghost=document.getElementById('_dragGhost');
      if(ghost)ghost.style.top=(t0.clientY-_wcTouch.ghostOffY)+'px';
      el.querySelectorAll('.dc-task').forEach(r=>r.classList.remove('dc-drag-top','dc-drag-bot'));
      const target=document.elementFromPoint(t0.clientX,t0.clientY)?.closest('.dc-task');
      if(target&&target!==row){const rect=target.getBoundingClientRect();target.classList.add(t0.clientY<rect.top+rect.height/2?'dc-drag-top':'dc-drag-bot');}
    },{passive:false});
    drag.addEventListener('touchend',e=>{
      row.style.opacity='';
      const ghost=document.getElementById('_dragGhost');if(ghost)ghost.remove();
      el.querySelectorAll('.dc-task').forEach(r=>r.classList.remove('dc-drag-top','dc-drag-bot'));
      if(_wcTouch.key!==key){_wcTouch.key=null;return;}
      const touch=e.changedTouches[0];
      const target=document.elementFromPoint(touch.clientX,touch.clientY)?.closest('.dc-task');
      if(target&&target!==row){const toIdx=+target.dataset.idx;const rect=target.getBoundingClientRect();const after=touch.clientY>=rect.top+rect.height/2;wcReorderTask(key,_wcTouch.idx,after?toIdx+1:toIdx);}
      _wcTouch.key=null;
    },{passive:false});

    row.addEventListener('dragover',e=>{e.preventDefault();if(_wcDrag.key!==key)return;el.querySelectorAll('.dc-task').forEach(r=>r.classList.remove('dc-drag-top','dc-drag-bot'));const rect=row.getBoundingClientRect();row.classList.add(e.clientY<rect.top+rect.height/2?'dc-drag-top':'dc-drag-bot');});
    row.addEventListener('dragleave',()=>row.classList.remove('dc-drag-top','dc-drag-bot'));
    row.addEventListener('drop',e=>{e.preventDefault();el.querySelectorAll('.dc-task').forEach(r=>r.classList.remove('dc-drag-top','dc-drag-bot'));if(_wcDrag.key!==key)return;const rect=row.getBoundingClientRect();const after=e.clientY>=rect.top+rect.height/2;wcReorderTask(key,_wcDrag.idx,after?i+1:i);_wcDrag.key=null;});

    row.innerHTML=`<div class="dc-chk">${t.done?'✓':''}</div><div class="dc-tn">${t.emoji?t.emoji+' ':''}${t.name}</div>${skillLink}`;
    const editBtn=document.createElement('button');
    editBtn.className='dc-tdel';editBtn.title=(typeof t==='function'?t('week_edit'):'Редактировать');editBtn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    editBtn.style.cssText='color:var(--t3);font-size:10px';
    editBtn.addEventListener('click',e=>{e.stopPropagation();wcEditTask(key,t.id);});
    row.insertBefore(drag,row.firstChild);
    if(!isSkill)row.appendChild(editBtn);

    const tnEl=row.querySelector('.dc-tn');
    tnEl.addEventListener('click',e=>{
      e.stopPropagation();
      if(tnEl.scrollWidth>tnEl.clientWidth+1){showTaskPopup(t.emoji?t.emoji+' '+t.name:t.name,e);}
      else{wcToggleTask(key,t.id);}
    });
    const chkEl=row.querySelector('.dc-chk');
    chkEl.addEventListener('click',e=>{e.stopPropagation();wcToggleTask(key,t.id);});
    row.addEventListener('click',()=>wcToggleTask(key,t.id));
    el.appendChild(row);
  });
}

function wcReorderTask(key,fromIdx,toIdx){
  const arr=tasks[key]||[];
  if(fromIdx===toIdx||fromIdx===toIdx-1)return;
  const [moved]=arr.splice(fromIdx,1);
  const insertAt=toIdx>fromIdx?toIdx-1:toIdx;
  arr.splice(insertAt,0,moved);
  tasks[key]=arr;
  LS.s('tasks',tasks);
  repaintCard(key);
}

function wcUpdateRing(card,key){
  const arr=tasks[key]||[];
  const realArr=arr.filter(x=>!x._isHabit);
  // parse dow from key "YYYY-M-D"
  const _kp=key.split('-');
  const _kd=new Date(+_kp[0],+_kp[1],+_kp[2]);
  const _dow=(_kd.getDay()+6)%7;
  const _tplArr=Array.isArray(routine.weekdays[_dow])?routine.weekdays[_dow]:[];
  const _slotI=_cycleInfoForDate(key);
  const _skItems=_slotI?skillTemplates.filter(t=>t.cycleSlot===_slotI.key):[];
  const _spCnt=_skItems.reduce((s,t)=>s+t.exercises.length,0);
  const _tplDoneCnt=_tplArr.filter((_,i)=>!!tplDone[key+'__tpl__'+i]).length;
  const _skDoneCnt=_skItems.reduce((s,t)=>s+t.exercises.filter((_,ei)=>!!tplDone[key+'__sport__'+t.id+'__'+ei]).length,0);
  const done=realArr.filter(x=>x.done).length+_tplDoneCnt+_skDoneCnt;
  const total=realArr.length+_tplArr.length+_spCnt;
  const p=pct(done,total);
  const circ=107.0,off=circ-(p/100)*circ;
  const isMob=window.innerWidth<768;
  const rf=card.querySelector('.dc-rf');if(rf)rf.style.strokeDashoffset=isMob?(100.5-(p/100)*100.5):off;
  const pt=card.querySelector('.dc-pct-t');if(pt)pt.textContent=p+'%';
  const cnt=card.querySelector('.dc-cnt');if(cnt)cnt.textContent=total?(isMob?`${done}/${total} задач`:`${done}/${total}`):'—';
}

function repaintCard(key){
  const card=document.querySelector(`[data-daykey="${key}"]`);if(!card)return;
  wcRenderTasks(card,key);
  wcUpdateRing(card,key);
}

function wcToggleTask(key,id){const arr=tasks[key]||[],t=arr.find(x=>x.id===id);if(t)t.done=!t.done;tasks[key]=arr;LS.s('tasks',tasks);repaintCard(key);}
function wcDelTask(key,id){tasks[key]=(tasks[key]||[]).filter(x=>x.id!==id);LS.s('tasks',tasks);repaintCard(key);}
function wcEditTask(key,id){
  const arr=tasks[key]||[];
  const t=arr.find(x=>x.id===id);
  if(!t)return;
  const existing=document.getElementById('wcEditModal');if(existing)existing.remove();
  const overlay=document.createElement('div');
  overlay.id='wcEditModal';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:300;display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML=`
    <div style="background:var(--c1);border:1px solid var(--bd2);border-radius:18px 18px 0 0;width:100%;max-width:440px;padding:18px;animation:su .2s ease">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--t2);letter-spacing:1px;text-transform:uppercase">редактировать задачу</div>
        
      </div>
      <div style="display:flex;gap:8px;margin-bottom:6px">
        <input id="wcEditEmoji" value="${t.emoji||''}" maxlength="2" style="background:var(--c2);border:1px solid var(--bd);border-radius:10px;color:var(--t1);font-size:18px;padding:10px;width:52px;text-align:center">
        <input id="wcEditName" value="${t.name.replace(/"/g,'&quot;')}" maxlength="300" style="background:var(--c2);border:1px solid var(--bd);border-radius:10px;color:var(--t1);font-size:14px;padding:10px 13px;flex:1">
      </div>
      <div class="btn-row">
        <button class="del-btn" onclick="(function(){try{wcDelTask('${key}',${id});}catch(e){}var m=document.getElementById('wcEditModal');if(m)m.remove();})()">УДАЛИТЬ</button>
        <button class="add-btn" onclick="wcEditSave('${key}',${id})">СОХРАНИТЬ</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  setTimeout(()=>{const inp=document.getElementById('wcEditName');if(inp){inp.focus();inp.selectionStart=inp.selectionEnd=inp.value.length;}},80);
}
function wcEditSave(key,id){
  const arr=tasks[key]||[];
  const t=arr.find(x=>x.id===id);
  if(!t)return;
  const name=document.getElementById('wcEditName')?.value.trim();
  if(!name)return;
  const emoji=document.getElementById('wcEditEmoji')?.value.trim();
  t.name=name;t.emoji=emoji||'';
  tasks[key]=arr;LS.s('tasks',tasks);repaintCard(key);
  document.getElementById('wcEditModal')?.remove();
}

// ══ MONTH GOALS STRIP ══════════════════════════════════
function getMG(){return mg[nowMK()]||[];}
function saveMG(a){mg[nowMK()]=a;LS.s('mg',mg);}

function renderMGStrip(){
  const list=document.getElementById('mgList');
  list.innerHTML=getMG().map(g=>`<div id="mg-item-${g.id}" style="display:inline-flex;align-items:center;gap:4px;background:var(--c2);border:1px solid ${g.done?'var(--ab)':'var(--bd)'};border-radius:20px;padding:3px 5px 3px 10px;margin:2px"><span style="font-size:12px;color:${g.done?'var(--a)':'var(--t)'};cursor:pointer;${g.done?'text-decoration:line-through':''}" onclick="toggleMGPill(${g.id})">${g.name}</span><span style="color:var(--t3);font-size:14px;cursor:pointer;padding:0 3px;line-height:1" onclick="delMGPill(${g.id})">✕</span></div>`).join('');
}
function delMGPill(id){saveMG(getMG().filter(x=>x.id!==id));renderMGStrip();}
function toggleMGPill(id){const a=getMG(),t=a.find(x=>x.id===id);if(t)t.done=!t.done;saveMG(a);renderMGStrip();}
function confirmAddMG(){
  const n=document.getElementById('mgInp').value.trim();if(!n)return;
  const a=getMG();a.push({id:nid++,name:n,done:false});saveMG(a);LS.s('nid',nid);
  document.getElementById('mgInp').value='';closeModal('mgModal');
  renderMGStrip();
}

// ══ HAB PROPOSE ════════════════════════════════════════

