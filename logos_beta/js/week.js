// ═══ MODULE: week.js ═══
// ══ WEEK ═══════════════════════════════════════════════
let weekOffset = 0; // 0 = current week, -1 = last week, +1 = next week

function getWeekMonday(offset){
  const mon=getMonday(new Date());
  mon.setDate(mon.getDate()+offset*7);
  return mon;
}

// opts.keepScroll — пересборка БЕЗ автопрокрутки к сегодняшней карточке:
// запоминаем scrollLeft и восстанавливаем его (иначе тап по задаче
// на телефоне прокручивал ленту недели обратно к «сегодня»)
function buildWeek(opts){
  const _keepScroll=!!(opts&&opts.keepScroll);

  if(typeof rolloverPermanentTasks==='function')rolloverPermanentTasks();
  renderNotificationsPanel();
  const scroll=document.getElementById('weekScroll');
  const savedLeft=_keepScroll?scroll.scrollLeft:0;
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
  if(_keepScroll){
    // восстановить позицию без анимации и обновить точки-индикаторы
    scroll.scrollLeft=savedLeft;
    const cw=(scroll.querySelector('.day-card')?.offsetWidth||50)+6;
    curCardIdx=Math.round(scroll.scrollLeft/cw);
    updateWNav();
  } else if(weekOffset===0){
    // scroll to today if in current week, else scroll to first card
    setTimeout(()=>{
      const dow=(new Date().getDay()+6)%7;
      scrollToCard(dow);
    },80);
  } else {
    setTimeout(()=>scrollToCard(0),80);
    curCardIdx=0;
  }
  // track scroll for dots — ТОЛЬКО один обработчик: onscroll-присваивание
  // заменяет прошлый (addEventListener накапливал слушатели при каждой пересборке)
  scroll.onscroll=null;
  scroll.onscroll=function(){
    const cw=(scroll.querySelector('.day-card')?.offsetWidth||50)+6;
    curCardIdx=Math.round(scroll.scrollLeft/cw);
    updateWNav();
  };
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
    (isCurrentWeek?'Эта неделя · ':'')+displayDateRange(mon,end);
  document.getElementById('wnDots').innerHTML=DAYS7.map((_,i)=>`<div class="wdot${i===curCardIdx?' on':''}"></div>`).join('');
}

// track which cards show template view
const cardTplView={};
// Режим добавления: key дня → true, если следующая задача будет постоянной
let _wcPermMode={};

function paintCard(card,d){
  const key=dk(d);
  card.dataset.daykey=key;
  const arr=tasks[key]||[];
  const realArr=arr.filter(x=>!x._isHabit);
  const _skillsTplItems=(typeof templatesForDate==='function')?templatesForDate(dk(d)):[];
  const _skillsCount=_skillsTplItems.reduce((s,t)=>s+t.exercises.length,0);
  const _tplKey2=dk(d);
  const _skillsDoneCount=_skillsTplItems.reduce((s,t)=>s+t.exercises.filter((_,ei)=>!!tplDone[skillTplDoneKey(_tplKey2,t,ei)]).length,0);
  const done=realArr.filter(x=>x.done).length+_skillsDoneCount,total=realArr.length+_skillsCount,p=pct(done,total);
  const circ=107.0,off=circ-(p/100)*circ;
  const dow=(d.getDay()+6)%7;
  const showTpl=!!cardTplView[key];

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
      '<div class="dc-cnt" style="font-size:10px;text-align:right;padding:0 12px;margin-bottom:4px">'+(total?(done+'/'+total+' задач'):'нет задач')+'</div>'
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

  const _hide=showTpl?'display:none;':'';
  card.innerHTML=
    headHTML+
    '<div class="dc-tasks" style="'+(isMob?'padding:0 12px;':'')+h1+'"></div>'+
    '<div class="dc-tpl-list" style="'+(isMob?'padding:0 12px;':'')+h2+'"></div>'+
    '<div class="dc-footer" style="display:flex;align-items:stretch;gap:'+(isMob?'6':'3')+'px;'+(isMob?'padding:8px 12px 10px':'')+'">'+
      '<input class="dc-inp" id="taskinp-'+key+'" placeholder="'+(_wcPermMode[key]?'постоянная задача…':'задача...')+'" maxlength="300" style="flex:1;'+_hide+'">'+
      '<div class="dc-btns-col">'+
        '<div class="dc-perm-btn'+(_wcPermMode[key]?' on':'')+'" id="permbtn-'+key+'" title="Постоянная задача (плавает на неделю)" style="'+_hide+'">'+uiIconSvg('pin')+'</div>'+
        '<div class="dc-abtn" id="taskabtn-'+key+'" style="'+_hide+'">+</div>'+
        '<div class="dc-tpl-btn'+(showTpl?' on':'')+'" id="tplbtn-'+key+'">'+uiIconSvg('clipboard')+'</div>'+
      '</div>'+
    '</div>';

  // task space
  const inp=card.querySelector('#taskinp-'+key);
  const abtn=card.querySelector('#taskabtn-'+key);
  const permbtn=card.querySelector('#permbtn-'+key);
  const tplbtn=card.querySelector('#tplbtn-'+key);
  const tplList=card.querySelector('.dc-tpl-list');
  const tplInp=card.querySelector('#tplinp-'+key);
  const tplAbtn=card.querySelector('#tplabtn-'+key);

  if(inp) inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();wcAddTask(card,key);}});
  if(abtn) abtn.addEventListener('click',()=>wcAddTask(card,key));

  // Переключатель режима: постоянная задача или обычное дело дня
  if(permbtn) permbtn.addEventListener('click',()=>{
    _wcPermMode[key]=!_wcPermMode[key];
    const on=!!_wcPermMode[key];
    permbtn.classList.toggle('on',on);
    if(inp){inp.placeholder=on?'постоянная задача…':'задача...';inp.focus();}
  });

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
    const activeHabits=habits.filter(h=>getComp()[h.id]);
    // skills templates assigned to this weekday (0=Пн..6=Вс)
    const _ds=dk(d);
    const skillsItems=(typeof templatesForDate==='function')?templatesForDate(_ds):[];
    tplList.innerHTML='';

    const hasAnything=skillsItems.length>0||activeHabits.length>0;
    if(!hasAnything){
      const empty=document.createElement('div');
      empty.className='dc-tpl-empty';
      empty.textContent='шаблон пуст';
      tplList.appendChild(empty);
      return;
    }

    // ── НАВЫКИ ──
    if(skillsItems.length>0){
      tplList.appendChild(makeLabel('навыки'));
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
          const sKey=skillTplDoneKey(key,tpl,ei);
          const isDone=!!(tplDone[sKey]);
          const row=document.createElement('div');
          row.className='dc-task'+(isDone?' done':'');
          row.style.cursor='pointer';
          const chk=document.createElement('div');chk.className='dc-chk';
          if(isDone)chk.textContent='✓';
          const tn=document.createElement('div');tn.className='dc-tn';
          const isMentalTpl = tpl.skillType === 'mental';
          const isNumberedTpl = /^\d+[.)]/.test(ex);
          const exIcon = isNumberedTpl ? '' : uiIconSvg(isMentalTpl?'brain':'dumbbell')+' ';
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
      if(skillsItems.length>0)tplList.appendChild(makeSep());
      tplList.appendChild(makeLabel('привычки'));
      activeHabits.forEach(h=>{
        const row=document.createElement('div');
        row.className='dc-task';
        row.style.cssText='cursor:default';
        const dash=document.createElement('div');
        dash.style.cssText='font-size:11px;color:var(--t3);flex-shrink:0;padding:0 3px;line-height:1';
        dash.textContent='—';
        const tn=document.createElement('div');tn.className='dc-tn';
        tn.innerHTML=habitIconSvg(h.icon,'habit-inline-icon');
        tn.appendChild(document.createTextNode(h.name));
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
    const _skItems2=(typeof templatesForDate==='function')?templatesForDate(key):[];
    const _spCnt=_skItems2.reduce((s,t)=>s+t.exercises.length,0);
    const _skDoneCnt=_skItems2.reduce((s,t)=>s+t.exercises.filter((_,ei)=>!!tplDone[skillTplDoneKey(key,t,ei)]).length,0);
    const _done=_real.filter(x=>x.done).length+_skDoneCnt;
    const _total=_real.length+_spCnt;
    const _p=pct(_done,_total);
    const _circ=107.0,_off=_circ-(_p/100)*_circ;
    const _isMob=window.innerWidth<768;
    if(_isMob){
      const rf=card.querySelector('.dc-rf');if(rf){rf.style.strokeDashoffset=100.5-(_p/100)*100.5;}
      const pt=card.querySelector('.dc-pct-t');if(pt)pt.textContent=_p+'%';
      const cnt=card.querySelector('.dc-cnt');if(cnt)cnt.textContent=_total?(_done+'/'+_total+' задач'):'нет задач';
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
  // Режим постоянной (плавающей) задачи текущей недели
  if(_wcPermMode[key]){
    permanentTasks.push({id:nid++,name,done:false});
    LS.s('permanentTasks',permanentTasks);LS.s('nid',nid);
    inp.value='';
    // перерисовать все карточки текущей недели + страницу «Сегодня»
    refreshPermanentViews();
    return;
  }
  if(!tasks[key])tasks[key]=[];
  tasks[key].push({id:nid++,name,done:false});
  LS.s('tasks',tasks);LS.s('nid',nid);
  inp.value='';
  wcRenderTasks(card,key);
  wcUpdateRing(card,key);
}

// ── Постоянные (плавающие) задачи недели ──
function wcTogglePermanent(id){
  const t=(permanentTasks||[]).find(x=>String(x.id)===String(id));
  if(!t)return;
  // клик по кружку = отметить выполненной (остаётся видимой, зачёркнутой)
  t.done=!t.done;
  LS.s('permanentTasks',permanentTasks);
  refreshPermanentViews();
}
function wcDelPermanent(id){
  permanentTasks=(permanentTasks||[]).filter(x=>String(x.id)!==String(id));
  LS.s('permanentTasks',permanentTasks);
  refreshPermanentViews();
}
// При смене недели: выполненные убираем, невыполненные «переезжают» на новую неделю
function rolloverPermanentTasks(){
  const curWeek=dk(getMonday(new Date()));
  const last=LS.g('lastPermWeek',curWeek);
  if(last!==curWeek){
    permanentTasks=(permanentTasks||[]).filter(t=>!t.done);
    LS.s('permanentTasks',permanentTasks);
    LS.s('lastPermWeek',curWeek);
  }
}
function refreshPermanentViews(){
  // keepScroll: пересборка недели без автопрокрутки к сегодняшней карточке —
  // иначе на телефоне тап по постоянной задаче сдвигал ленту недели
  if(typeof curPage!=='undefined'&&curPage==='week'&&typeof buildWeek==='function')buildWeek({keepScroll:true});
  if(typeof curPage!=='undefined'&&curPage==='today'&&typeof renderTodayTasks==='function')renderTodayTasks(new Date());
}

// ── Drag state for day-card tasks ──
let _wcDrag={key:null,idx:null};
let _wcTouch={key:null,idx:null,startY:0,startX:0};

function wcRenderTasks(card,key){
  const el=card.querySelector('.dc-tasks');if(!el)return;
  el.innerHTML='';
  // Постоянные (плавающие) задачи — только для текущей недели, сверху, с подсветкой
  if(weekOffset===0&&(permanentTasks||[]).length){
    (permanentTasks||[]).forEach(t=>{
      const prow=document.createElement('div');
      prow.className='dc-task perm-task'+(t.done?' done':'');
      prow.id='dc-perm-'+t.id;
      prow.innerHTML=`<div class="dc-chk">${t.done?'✓':''}</div><div class="dc-tn">${uiIconSvg('pin')} ${t.name}</div>`;
      const del=document.createElement('button');
      del.className='dc-tdel';del.textContent='✕';del.title='Удалить';
      del.addEventListener('click',e=>{e.stopPropagation();wcDelPermanent(t.id);});
      prow.appendChild(del);
      prow.addEventListener('click',()=>wcTogglePermanent(t.id));
      el.appendChild(prow);
    });
    // тонкий разделитель перед обычными делами
    if((tasks[key]||[]).length){
      const sep=document.createElement('div');
      sep.style.cssText='height:1px;background:var(--bd);margin:3px 2px;flex-shrink:0';
      el.appendChild(sep);
    }
  }
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
    const moveTopBtn=document.createElement('button');
    moveTopBtn.type='button';
    moveTopBtn.className='dc-move-btn';
    moveTopBtn.textContent='↑';
    moveTopBtn.title='Переместить в начало списка';
    moveTopBtn.setAttribute('aria-label','Переместить задачу в начало списка');
    moveTopBtn.disabled=i===0;
    moveTopBtn.addEventListener('click',e=>{e.stopPropagation();wcMoveTask(key,i,'top');});
    const moveBottomBtn=document.createElement('button');
    moveBottomBtn.type='button';
    moveBottomBtn.className='dc-move-btn';
    moveBottomBtn.textContent='↓';
    moveBottomBtn.title='Переместить в конец списка';
    moveBottomBtn.setAttribute('aria-label','Переместить задачу в конец списка');
    moveBottomBtn.disabled=i===tasks[key].length-1;
    moveBottomBtn.addEventListener('click',e=>{e.stopPropagation();wcMoveTask(key,i,'bottom');});
    const editBtn=document.createElement('button');
    editBtn.className='dc-tdel';editBtn.title='Редактировать';editBtn.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    editBtn.style.cssText='color:var(--t3);font-size:10px';
    editBtn.addEventListener('click',e=>{e.stopPropagation();wcEditTask(key,t.id);});
    row.insertBefore(drag,row.firstChild);
    row.appendChild(moveTopBtn);
    row.appendChild(moveBottomBtn);
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

function wcMoveTask(key,fromIdx,destination){
  const arr=tasks[key]||[];
  const toIdx=destination==='top'?0:arr.length-1;
  if(fromIdx<0||fromIdx>=arr.length||fromIdx===toIdx)return;
  const [moved]=arr.splice(fromIdx,1);
  arr.splice(toIdx,0,moved);
  tasks[key]=arr;
  LS.s('tasks',tasks);
  repaintCard(key);
}

function wcUpdateRing(card,key){
  const arr=tasks[key]||[];
  const realArr=arr.filter(x=>!x._isHabit);
  const _skItems=(typeof templatesForDate==='function')?templatesForDate(key):[];
  const _spCnt=_skItems.reduce((s,t)=>s+t.exercises.length,0);
  const _skDoneCnt=_skItems.reduce((s,t)=>s+t.exercises.filter((_,ei)=>!!tplDone[skillTplDoneKey(key,t,ei)]).length,0);
  const done=realArr.filter(x=>x.done).length+_skDoneCnt;
  const total=realArr.length+_spCnt;
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
        <button class="del-btn" onclick="(function(){try{wcDelTask('${key}',${id});}catch(e){}wcCloseEditModal();})()">УДАЛИТЬ</button>
        <button class="add-btn" onclick="wcEditSave('${key}',${id})">СОХРАНИТЬ</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  lockBodyScroll();
  overlay.addEventListener('click',e=>{if(e.target===overlay)wcCloseEditModal();});
  setTimeout(()=>{const inp=document.getElementById('wcEditName');if(inp){inp.focus();inp.selectionStart=inp.selectionEnd=inp.value.length;}},80);
}
function wcCloseEditModal(){const m=document.getElementById('wcEditModal');if(m)m.remove();unlockBodyScroll();}
function wcEditSave(key,id){
  const arr=tasks[key]||[];
  const t=arr.find(x=>x.id===id);
  if(!t)return;
  const name=document.getElementById('wcEditName')?.value.trim();
  if(!name)return;
  const emoji=document.getElementById('wcEditEmoji')?.value.trim();
  t.name=name;t.emoji=emoji||'';
  tasks[key]=arr;LS.s('tasks',tasks);repaintCard(key);
  wcCloseEditModal();
}

// ══ HAB PROPOSE ════════════════════════════════════════
