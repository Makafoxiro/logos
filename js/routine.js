// ═══ MODULE: routine.js ═══
// ══ ROUTINE ════════════════════════════════════════════
function getRtLog(){
  const todayKey=nowDK();
  if(!routineLog[todayKey])routineLog[todayKey]={morning:{},day:{},evening:{}};
  return routineLog[todayKey];
}
function saveRtLog(l){routineLog[nowDK()]=l;LS.s("routineLog",routineLog);}
function isRtDone(block,name,l){return !!(l&&l[name]);}
function toggleRt(block,idx){
  const name=routine[block][idx];
  const obj=getBlockLog(block);
  obj[name]=!obj[name];if(!obj[name])delete obj[name];
  saveBlockLog(block,obj);
  renderRoutine();
}
function resetRtBlock(block){
  const blockLabels={morning:t('rt_morning'),day:t('rt_day'),evening:t('rt_evening'),week:t('rt_week'),month:t('rt_month'),year:t('rt_year')};
  const label=blockLabels[block]||block;
  showConfirm(`Сбросить все отметки «${label}»?`, ()=>{
    saveBlockLog(block,{});
    renderRoutine();
  });
}

// ── Drag-and-drop for routine items ──
let rtDragSrc={block:null,idx:null};
function rtDragStart(block,idx,el){rtDragSrc={block,idx};el.classList.add('dragging');}
function rtDragEnd(el){el.classList.remove('dragging');document.querySelectorAll('.rt-item').forEach(e=>e.classList.remove('drag-over-top','drag-over-bottom'));}
function rtDragOver(e,el){
  e.preventDefault();
  document.querySelectorAll('.rt-item[data-block="'+rtDragSrc.block+'"]').forEach(e2=>e2.classList.remove('drag-over-top','drag-over-bottom'));
  const rect=el.getBoundingClientRect();
  const mid=rect.top+rect.height/2;
  if(e.clientY<mid){el.classList.add('drag-over-top');}else{el.classList.add('drag-over-bottom');}
}
function rtDragLeave(el){el.classList.remove('drag-over-top','drag-over-bottom');}
function rtDrop(block,idx,e){
  document.querySelectorAll('.rt-item').forEach(el=>el.classList.remove('drag-over-top','drag-over-bottom'));
  if(rtDragSrc.block!==block)return;
  const arr=routine[block];
  let toIdx=idx;
  if(e){
    const el=e.currentTarget||e.target?.closest('.rt-item');
    if(el){
      const rect=el.getBoundingClientRect();
      if(e.clientY>=rect.top+rect.height/2) toIdx=idx+1;
    }
  }
  if(rtDragSrc.idx===toIdx)return;
  const [moved]=arr.splice(rtDragSrc.idx,1);
  const insertAt=toIdx>(rtDragSrc.idx)?toIdx-1:toIdx;
  arr.splice(insertAt,0,moved);
  LS.s('routine',routine);
  renderRoutine();
}
// Touch drag support
let rtTouchSrc={block:null,idx:null,el:null,clone:null,startY:0};
function rtTouchStart(e,block,idx,el){
  rtTouchSrc={block,idx,el,clone:null,startY:e.touches[0].clientY,startX:e.touches[0].clientX};
  el.classList.add('dragging');
}
function rtTouchMove(e){
  if(rtTouchSrc.block===null)return;
  const touch=e.touches[0];
  const dy=Math.abs(touch.clientY-rtTouchSrc.startY);
  const dx=Math.abs(touch.clientX-(rtTouchSrc.startX||touch.clientX));
  // only prevent default for horizontal drag gestures, allow vertical scroll
  if(dx>dy&&dx>8){
    e.preventDefault();
    e.stopPropagation();
  }
  const els=document.querySelectorAll('.rt-item[data-block="'+rtTouchSrc.block+'"]');
  els.forEach(e2=>e2.classList.remove('drag-over-top','drag-over-bottom'));
  const target=document.elementFromPoint(touch.clientX,touch.clientY);
  const item=target?.closest('.rt-item[data-block="'+rtTouchSrc.block+'"]');
  if(item){
    const rect=item.getBoundingClientRect();
    if(touch.clientY<rect.top+rect.height/2){item.classList.add('drag-over-top');}
    else{item.classList.add('drag-over-bottom');}
  }
}
function rtTouchEnd(e){
  if(rtTouchSrc.block===null)return;
  const touch=e.changedTouches[0];
  const target=document.elementFromPoint(touch.clientX,touch.clientY);
  const item=target?.closest('.rt-item[data-block="'+rtTouchSrc.block+'"]');
  if(item){
    const toIdx=parseInt(item.dataset.idx);
    const arr=routine[rtTouchSrc.block];
    const rect=item.getBoundingClientRect();
    const insertAfter=touch.clientY>=rect.top+rect.height/2;
    const insertAt=insertAfter?(toIdx>rtTouchSrc.idx?toIdx:toIdx+1):(toIdx>rtTouchSrc.idx?toIdx-1:toIdx);
    const [moved]=arr.splice(rtTouchSrc.idx,1);
    arr.splice(Math.max(0,Math.min(arr.length,insertAt-(insertAt>rtTouchSrc.idx?1:0))),0,moved);
    LS.s('routine',routine);
  }
  rtTouchSrc={block:null,idx:null,el:null,clone:null,startY:0};
  renderRoutine();
}

// ── Edit routine item ──
// rtEditModal state
let _rtEditCtx={type:null,block:null,idx:null};
function openRtEditModal(type,block,idx){
  _rtEditCtx={type,block,idx};
  const name = type==='wday' ? routine.weekdays[curWdayTab][idx] : routine[block][idx];
  document.getElementById('rtEditInp').value=name;
  document.getElementById('rtEditTitle').textContent='изменить задачу';
  openModal('rtEditModal');
  setTimeout(()=>document.getElementById('rtEditInp').focus(),100);
}

function delCurrentRtEdit(){
  if(!_rtEditCtx)return;
  if(_rtEditCtx.type==='wday') delWdItem(_rtEditCtx.idx);
  else delRtItem(_rtEditCtx.block,_rtEditCtx.idx);
  closeRtEditModal();
}
function closeRtEditModal(){closeModal('rtEditModal');}
function confirmRtEdit(){
  const val=document.getElementById('rtEditInp').value.trim();
  if(!val){closeRtEditModal();return;}
  const {type,block,idx}=_rtEditCtx;
  if(type==='wday'){
    routine.weekdays[curWdayTab][idx]=val;
  } else {
    routine[block][idx]=val;
  }
  LS.s('routine',routine);
  closeRtEditModal();
  renderRoutine();
}
function editRtItem(block,idx){openRtEditModal('block',block,idx);}

// Routine swipe state
let curRtSlide = LS.g('curRtSlide', 0);

function renderRoutine(){
  const l=getRtLog();
  const blocks=[
    {key:'morning',label:(typeof t==='function'?t('rt_morning'):'УТРО'),color:'var(--a)'},
    {key:'day',label:(typeof t==='function'?t('rt_day'):'ДЕНЬ'),color:'var(--amber)'},
    {key:'evening',label:(typeof t==='function'?t('rt_evening'):'ВЕЧЕР'),color:'var(--blue)'},
    {key:'week',label:(typeof t==='function'?t('rt_week'):'НЕДЕЛЯ'),color:'var(--purple)'},
    {key:'month',label:(typeof t==='function'?t('rt_month'):'МЕСЯЦ'),color:'var(--red)'},
    {key:'_annuals',label:(typeof t==='function'?t('rt_year'):'ГОД'),color:'var(--amber)'},
    {key:'_weekdays',label:(typeof t==='function'?t('rt_weekdays'):'ДНИ НЕД.'),color:'var(--t2)'},
  ];
  const totalSlides = blocks.length;
  if(curRtSlide >= totalSlides) curRtSlide = 0;

  const WDAYS_RU=(typeof t==='function')?t('days_short2'):['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const WDAYS_FULL=(typeof t==='function')?['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']:['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];

  // Render tabs
  const tabsBar = document.getElementById('routineTabsBar');
  tabsBar.innerHTML = blocks.map((b,i)=>`<div class="rt-tab${i===curRtSlide?' on':''}" onclick="goRtSlide(${i})" style="${i===curRtSlide?'color:'+b.color+';border-bottom-color:'+b.color:''}">${b.label}</div>`).join('');

  function blockInnerHTML(b){
    const items=Array.isArray(routine[b.key])?routine[b.key]:[];
    // для week/month/year — отдельные логи, для остальных — дневной лог
    const blogObj=['week','month','year'].includes(b.key)?getBlockLog(b.key):(l[b.key]||{});
    const done=items.filter(name=>blogObj[name]).length;
    const p=pct(done,items.length);
    const itemsHTML=items.map((name,i)=>`
      <div class="rt-item${isRtDone(b.key,name,blogObj)?' done':''}"
        id="rt-item-${b.key}-${i}"
        data-block="${b.key}" data-idx="${i}"
        ondragover="rtDragOver(event,this)"
        ondragleave="rtDragLeave(this)"
        ondrop="rtDrop('${b.key}',${i},event)"
        onclick="toggleRt('${b.key}',${i})">
        <div class="rt-drag"
          draggable="true"
          ondragstart="rtDragStart('${b.key}',${i},this.parentElement);event.stopPropagation()"
          ondragend="rtDragEnd(this.parentElement)"
          ontouchstart="rtTouchStart(event,'${b.key}',${i},this.parentElement)"
          ontouchmove="rtTouchMove(event)"
          ontouchend="rtTouchEnd(event)"
          onclick="event.stopPropagation()">⠿</div>
        <div class="rt-chk">${isRtDone(b.key,name,blogObj)?'✓':''}</div>
        <div class="rt-name">${name}</div>
        <button class="rt-edit" onclick="event.stopPropagation();editRtItem('${b.key}',${i})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

      </div>`).join('');

    // Annual reminders appended to month block
    let annualsSection='';

    return `<div class="rt-block">
      <div class="rt-head">
        <div class="rt-title" style="color:${b.color}">${b.label}</div>
        <div style="display:flex;align-items:center;gap:8px">
          ${done>0?`<button onclick="resetRtBlock('${b.key}')" style="background:none;border:none;font-family:var(--mono);font-size:8px;color:var(--t3);cursor:pointer;padding:2px 6px;border-radius:5px;border:1px solid var(--bd)" title="Сбросить выполненные">${(typeof t==='function'?t('rt_reset'):'↺ сброс')}</button>`:''}
          <div class="rt-pct">${p}%</div>
        </div>
      </div>
      <div class="rt-items">${itemsHTML}</div>
      <div class="rt-add">
        <textarea class="add-inp" id="rti-${b.key}" placeholder="${(typeof t==='function'?t('rt_add_ph'):'Добавить пункт...')}" rows="1" style="resize:none;overflow:hidden;font-family:var(--sans);font-size:14px;padding:11px 13px;min-height:44px"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();addRtItem('${b.key}');}"></textarea>
        <button class="add-btn" onclick="addRtItem('${b.key}')" style="align-self:flex-start">+</button>
      </div>
    </div>`;
  }

  function weekdaysSlideHTML(){
    const wdItems=Array.isArray(routine.weekdays[curWdayTab])?routine.weekdays[curWdayTab]:[];
    const tabsHTML=WDAYS_RU.map((d,i)=>`<div class="rt-wday-tab${i===curWdayTab?' on':''}" onclick="curWdayTab=${i};renderRoutine()">${d}</div>`).join('');
    const itemsHTML=wdItems.map((name,i)=>`
      <div class="rt-wday-item" data-wdidx="${i}"
        ondragover="event.preventDefault();(function(e,el){document.querySelectorAll('.rt-wday-item').forEach(x=>x.classList.remove('drag-over-top','drag-over-bottom'));const r=el.getBoundingClientRect();if(e.clientY<r.top+r.height/2){el.classList.add('drag-over-top');}else{el.classList.add('drag-over-bottom');}})(event,this)"
        ondragleave="this.classList.remove('drag-over-top','drag-over-bottom')"
        ondrop="rtWdDrop(${i},event)">
        <div class="rt-drag"
          draggable="true"
          ondragstart="rtWdDragStart(${i},this.parentElement);event.stopPropagation()"
          ondragend="rtWdDragEnd(this.parentElement)"
          ontouchstart="rtWdTouchStart(event,${i},this.parentElement)"
          ontouchmove="rtTouchMoveWd(event)"
          ontouchend="rtWdTouchEnd(event)"
          onclick="event.stopPropagation()">⠿</div>
        <div class="rt-wday-name">${name}</div>
        <button class="rt-edit" onclick="editWdItem(${i})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

      </div>`).join('');
    return `<div class="rt-block">
      <div class="rt-head">
        <div class="rt-title" style="color:var(--t2)">${(typeof t==='function'?t('rt_weekdays'):'ДНИ НЕДЕЛИ')}</div>
        <div style="font-family:var(--mono);font-size:8px;color:var(--t3)">${wdItems.length} задач</div>
      </div>
      <div class="rt-wday-tabs">${tabsHTML}</div>
      <div class="rt-wday-items" id="wdayItems">${itemsHTML}</div>
      <div class="rt-add">
        <textarea class="add-inp" id="rti-wday" placeholder="Задача для ${WDAYS_FULL[curWdayTab]}..." rows="1" style="resize:none;overflow:hidden;font-family:var(--sans);font-size:14px;padding:11px 13px;min-height:44px"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();addWdItem();}"></textarea>
        <button class="add-btn" onclick="addWdItem()" style="align-self:flex-start">+</button>
      </div>
    </div>`;
  }

  function weekSlideHTML(){
    const wl=getBlockLog('week');
    const items=Array.isArray(routine.week)?routine.week:[];
    const done=items.filter(name=>wl[name]).length;
    const p=pct(done,items.length);
    const itemsHTML=items.map((name,i)=>`
      <div class="rt-item${isRtDone('week',name,wl)?' done':''}"
        id="rt-item-week-${i}"
        data-block="week" data-idx="${i}"
        ondragover="rtDragOver(event,this)"
        ondragleave="rtDragLeave(this)"
        ondrop="rtDrop('week',${i},event)"
        onclick="toggleRt('week',${i})">
        <div class="rt-drag"
          draggable="true"
          ondragstart="rtDragStart('week',${i},this.parentElement);event.stopPropagation()"
          ondragend="rtDragEnd(this.parentElement)"
          ontouchstart="rtTouchStart(event,'week',${i},this.parentElement)"
          ontouchmove="rtTouchMove(event)"
          ontouchend="rtTouchEnd(event)"
          onclick="event.stopPropagation()">⠿</div>
        <div class="rt-chk">${isRtDone('week',name,wl)?'✓':''}</div>
        <div class="rt-name">${name}</div>
        <button class="rt-edit" onclick="event.stopPropagation();editRtItem('week',${i})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

      </div>`).join('');

    // Skills no longer shown in week slide

    return `<div class="rt-block">
      <div class="rt-head">
        <div class="rt-title" style="color:var(--purple)">${(typeof t==='function'?t('rt_week'):'НЕДЕЛЯ')}</div>
        <div style="display:flex;align-items:center;gap:8px">
          ${done>0?`<button onclick="resetRtBlock('week')" style="background:none;border:none;font-family:var(--mono);font-size:8px;color:var(--t3);cursor:pointer;padding:2px 6px;border-radius:5px;border:1px solid var(--bd)">${(typeof t==='function'?t('rt_reset'):'↺ сброс')}</button>`:''}
          <div class="rt-pct">${p}%</div>
        </div>
      </div>
      <div class="rt-items">${itemsHTML||'<div style="font-size:12px;color:var(--t3);font-family:var(--mono);padding:8px 0">пусто — добавь задачу</div>'}</div>
      <div class="rt-add">
        <textarea class="add-inp" id="rti-week" placeholder="${(typeof t==='function'?t('rt_add_ph'):'Добавить пункт...')}" rows="1" style="resize:none;overflow:hidden;font-family:var(--sans);font-size:14px;padding:11px 13px;min-height:44px"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();addRtItem('week');}"></textarea>
        <button class="add-btn" onclick="addRtItem('week')" style="align-self:flex-start">+</button>
      </div>
    </div>`;
  }

  function annualsSlideHTML(){
    const now=new Date();
    const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());

    // Helper: compute next due date from lastDate + period
    function calcNextDate(lastDate, period){
      if(!lastDate||!period)return null;
      const d=parseLocalDate(lastDate);
      if(!d)return null;
      let next=new Date(d);
      if(period==='3m'){next.setMonth(next.getMonth()+3);}
      else if(period==='6m'){next.setMonth(next.getMonth()+6);}
      else{const y=parseInt(period);if(y&&!isNaN(y))next.setFullYear(next.getFullYear()+y);}
      return next;
    }
    function dateToStr(d){
      if(!d)return '';
      const mm=String(d.getMonth()+1).padStart(2,'0');
      const dd=String(d.getDate()).padStart(2,'0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    }
    // Get effective "next" date for an annual item
    function getNextDate(a){
      // If has period and lastDate → compute next automatically
      if(a.period && a.lastDate){
        const computed=calcNextDate(a.lastDate,a.period);
        if(computed)return dateToStr(computed);
      }
      return a.date||'';
    }
    // Days until next (positive = future, negative = overdue, null = no date)
    function daysUntilNext(a){
      const nd=getNextDate(a);
      if(!nd)return null;
      const d=parseLocalDate(nd);
      if(!d)return null;
      return Math.round((d-today)/(1000*60*60*24));
    }

    // NEW SORT: without repeat first, then by days (overdue first, then soonest), then no date
    const sorted=[...annuals].sort((a2,b2)=>{
      const aNoRepeat=!a2.period;
      const bNoRepeat=!b2.period;
      if(aNoRepeat&&!bNoRepeat)return -1;
      if(!aNoRepeat&&bNoRepeat)return 1;
      const da=daysUntilNext(a2);
      const db=daysUntilNext(b2);
      if(da===null&&db===null)return 0;
      if(da===null)return 1;
      if(db===null)return -1;
      return da-db;
    });

    const periodLabel=p=>{
      if(!p)return '';
      if(p==='3m')return '↻ 3 мес.';
      if(p==='6m')return '↻ 6 мес.';
      const y=parseInt(p);if(y&&!isNaN(y))return`↻ ${y} ${y===1?'год':y<5?'года':'лет'}`;
      return '';
    };
    const periodOpts=`<option value="">без повтора</option><option value="3m">каждые 3 месяца</option><option value="6m">каждые 6 месяцев</option>${Array.from({length:15},(_,i)=>`<option value="${i+1}">${i+1} ${i===0?'год':i<4?'года':'лет'}</option>`).join('')}`;

    const itemsHTML=sorted.map(a=>{
      const nextDateStr=getNextDate(a);
      const days=daysUntilNext(a);
      const isOverdue=days!==null&&days<0;
      const isSoon=days!==null&&days>=0&&days<=14;
      const dColor=isOverdue?'var(--red)':isSoon?'var(--amber)':'var(--a)';
      const dLabel=days===null?'—':days===0?'сегодня!':days===1?'завтра':days<0?`просрочено ${Math.abs(days)}д.`:days+'д.';
      const nextFmt=nextDateStr?formatDate(nextDateStr):'';
      const lastFmt=a.lastDate?formatDate(a.lastDate):'';
      const pl=periodLabel(a.period);

      // Overdue banner with action button
      const overdueBanner=isOverdue&&a.period?`
        <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:8px;padding:6px 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:10px;color:var(--red);flex:1">⚠ просрочено на ${Math.abs(days)}д.</span>
          <button onclick="annualMarkDone(${a.id})" style="background:var(--a);border:none;border-radius:6px;color:#000;font-family:var(--mono);font-size:10px;padding:4px 10px;cursor:pointer;white-space:nowrap">✓ сделал — сдвинуть</button>
        </div>`:
        (isOverdue&&!a.period?`<div style="font-family:var(--mono);font-size:10px;color:var(--red);padding-left:16px">⚠ дата прошла</div>`:'');

      return `<div id="annual-item-${a.id}" style="background:var(--c1);border:1px solid ${isOverdue?'rgba(248,113,113,0.3)':isSoon?'rgba(251,191,36,0.2)':'var(--bd)'};border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:8px;height:8px;border-radius:50%;background:${dColor};flex-shrink:0;margin-top:1px"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:500">${a.name}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:3px;flex-wrap:wrap">
              ${lastFmt?`<span style="font-family:var(--mono);font-size:9px;color:var(--t3)">было: ${lastFmt}</span>`:''}
              ${lastFmt&&nextFmt?`<span style="font-family:var(--mono);font-size:9px;color:var(--t3)">→</span>`:''}
              ${nextFmt?`<span style="font-family:var(--mono);font-size:10px;color:${dColor}">${a.lastDate&&a.period?'будет: ':''}${nextFmt}</span>`:''}
              ${pl?`<span style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-left:2px">${pl}</span>`:''}
            </div>
          </div>
          <div style="font-family:var(--mono);font-size:11px;color:${dColor};flex-shrink:0;text-align:right;min-width:52px">${dLabel}</div>
          <button class="rt-edit" onclick="openAnnualEditModal(${a.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

        </div>
        ${overdueBanner}
      </div>`;
    }).join('');

    return `<div class="rt-block">
      <div class="rt-head">
        <div class="rt-title" style="color:var(--amber)">${(typeof t==='function'?t('rt_annuals'):'ЕЖЕГОДНЫЕ')}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--a)">${annuals.length} напом.</div>
      </div>
      <div style="padding:0 12px 4px">${itemsHTML||'<div style="font-size:12px;color:var(--t3);font-family:var(--mono);padding:8px 0">пусто — добавь напоминание</div>'}</div>
      <div class="rt-add" style="display:flex;flex-direction:column;gap:6px;padding:10px 12px">
        <input class="add-inp" id="rtAnnNameInp" placeholder="Флюорография, ТО авто..." maxlength="50" onkeydown="if(event.key==='Enter')document.getElementById('rtAnnLastInp').focus()">
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px">
            <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:3px">последний раз</div>
            <input class="add-inp" id="rtAnnLastInp" type="date" style="width:100%">
          </div>
          <div style="flex:1;min-width:140px">
            <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:3px">следующий раз (если нет повтора)</div>
            <input class="add-inp" id="rtAnnDateInp" type="date" style="width:100%" onkeydown="if(event.key==='Enter')document.getElementById('rtAnnPeriodSel').focus()">
          </div>
        </div>
        <select class="add-inp" id="rtAnnPeriodSel" style="font-family:var(--mono);font-size:11px;padding:6px 8px">
          ${periodOpts}
        </select>
        <button class="add-btn" onclick="confirmRtAnnualAdd()" style="align-self:flex-end">+ добавить</button>
      </div>
    </div>`;
  }

  // Build slides — save current slide scroll position before re-render
  const track = document.getElementById('routineSwipeTrack');
  const _prevSlides = track ? track.querySelectorAll('.routine-swipe-slide') : [];
  const _savedScrollTop = _prevSlides[curRtSlide] ? _prevSlides[curRtSlide].scrollTop : 0;

  track.innerHTML = blocks.map((b,i)=>{
    let content;
    if(b.key==='_weekdays') content=weekdaysSlideHTML();
    else if(b.key==='_annuals') content=annualsSlideHTML();
    else if(b.key==='week') content=weekSlideHTML();
    else content=blockInnerHTML(b);
    return `<div class="routine-swipe-slide">${content}</div>`;
  }).join('');

  // Position track
  track.style.transition = 'none';
  track.style.width = (totalSlides * 100) + '%';
  track.querySelectorAll('.routine-swipe-slide').forEach(s=>s.style.width=(100/totalSlides)+'%');
  // Restore scroll position of current slide
  const _newSlides = track.querySelectorAll('.routine-swipe-slide');
  if(_newSlides[curRtSlide] && _savedScrollTop > 0){
    _newSlides[curRtSlide].scrollTop = _savedScrollTop;
  }
  requestAnimationFrame(()=>{
    track.style.transition = '';
    track.style.transform = `translateX(-${curRtSlide * (100/totalSlides)}%)`;
  });

  // Setup swipe on the wrap
  setupRtSwipe();
}

function goRtSlide(idx){
  // Считаем реальное количество слайдов из DOM, не хардкодим
  const track=document.getElementById('routineSwipeTrack');
  const blocks=track ? track.querySelectorAll('.routine-swipe-slide').length : 8;
  curRtSlide=Math.max(0,Math.min(blocks-1,idx));
  LS.s('curRtSlide',curRtSlide);
  if(track){
    track.style.transition='transform .28s cubic-bezier(.4,0,.2,1)';
    track.style.transform=`translateX(-${curRtSlide*(100/blocks)}%)`;
  }
  // Update tabs
  const tabsBar=document.getElementById('routineTabsBar');
  if(tabsBar){
    const tabs=tabsBar.querySelectorAll('.rt-tab');
    const colors=['var(--a)','var(--amber)','var(--blue)','var(--purple)','var(--red)','var(--amber)','var(--amber)','var(--t2)'];
    tabs.forEach((t,i)=>{
      t.className='rt-tab'+(i===curRtSlide?' on':'');
      t.style.color=i===curRtSlide?colors[i]:'';
      t.style.borderBottomColor=i===curRtSlide?colors[i]:'';
    });
  }
}

let _rtSwipeX=null, _rtSwipeY=null, _rtSwipeLocked=null;
function setupRtSwipe(){
  const wrap=document.getElementById('routineSwipeWrap');
  if(!wrap||wrap._swipeSetup)return;
  wrap._swipeSetup=true;
  wrap.addEventListener('touchstart',e=>{
    _rtSwipeX=e.touches[0].clientX;
    _rtSwipeY=e.touches[0].clientY;
    _rtSwipeLocked=null;
  },{passive:true});
  wrap.addEventListener('touchmove',e=>{
    if(_rtSwipeX===null)return;
    const dx=e.touches[0].clientX-_rtSwipeX;
    const dy=e.touches[0].clientY-_rtSwipeY;
    if(_rtSwipeLocked===null){
      _rtSwipeLocked=Math.abs(dx)>Math.abs(dy)?'h':'v';
    }
    if(_rtSwipeLocked==='h')e.preventDefault();
  },{passive:false});
  wrap.addEventListener('touchend',e=>{
    if(_rtSwipeX===null||_rtSwipeLocked!=='h'){_rtSwipeX=null;return;}
    const dx=e.changedTouches[0].clientX-_rtSwipeX;
    _rtSwipeX=null;
    if(Math.abs(dx)>40){
      if(dx<0)goRtSlide(curRtSlide+1);
      else goRtSlide(curRtSlide-1);
    }
  },{passive:true});
}

function addRtItem(block){
  const inp=document.getElementById('rti-'+block);const name=inp.value.trim();if(!name)return;
  if(!routine[block])routine[block]=[];routine[block].push(name);LS.s('routine',routine);inp.value='';inp.style.height='auto';renderRoutine();
}
function delRtItem(block,idx){routine[block].splice(idx,1);LS.s('routine',routine);renderRoutine();}

// Weekday template functions
let rtWdDragSrcIdx=null;
function rtWdDragStart(idx,el){rtWdDragSrcIdx=idx;el.classList.add('dragging');}
function rtWdDragEnd(el){el.classList.remove('dragging');document.querySelectorAll('.rt-wday-item').forEach(e=>e.classList.remove('drag-over-top','drag-over-bottom'));}
function rtWdDrop(toIdx,e){
  document.querySelectorAll('.rt-wday-item').forEach(el=>el.classList.remove('drag-over-top','drag-over-bottom'));
  if(rtWdDragSrcIdx===null||rtWdDragSrcIdx===toIdx)return;
  const arr=routine.weekdays[curWdayTab];
  let insertAt=toIdx;
  if(e){
    const el=e.currentTarget||e.target?.closest('.rt-wday-item');
    if(el){
      const rect=el.getBoundingClientRect();
      if(e.clientY>=rect.top+rect.height/2) insertAt=toIdx+1;
    }
  }
  const [moved]=arr.splice(rtWdDragSrcIdx,1);
  const finalIdx=insertAt>rtWdDragSrcIdx?insertAt-1:insertAt;
  arr.splice(Math.max(0,Math.min(arr.length,finalIdx)),0,moved);
  rtWdDragSrcIdx=null;
  LS.s('routine',routine);renderRoutine();
}
let rtWdTouchSrc={idx:null};
function rtWdTouchStart(e,idx,el){rtWdTouchSrc={idx};el.classList.add('dragging');}
function rtTouchMoveWd(e){
  if(rtWdTouchSrc.idx===null)return;
  e.preventDefault();
  const touch=e.touches[0];
  document.querySelectorAll('.rt-wday-item').forEach(el=>el.classList.remove('drag-over-top','drag-over-bottom'));
  const target=document.elementFromPoint(touch.clientX,touch.clientY);
  const item=target?.closest('.rt-wday-item');
  if(item){
    const rect=item.getBoundingClientRect();
    if(touch.clientY<rect.top+rect.height/2){item.classList.add('drag-over-top');}
    else{item.classList.add('drag-over-bottom');}
  }
}
function rtWdTouchEnd(e){
  if(rtWdTouchSrc.idx===null)return;
  const touch=e.changedTouches[0];
  const target=document.elementFromPoint(touch.clientX,touch.clientY);
  const item=target?.closest('.rt-wday-item');
  if(item){
    const toIdx=parseInt(item.dataset.wdidx);
    const arr=routine.weekdays[curWdayTab];
    const rect=item.getBoundingClientRect();
    const insertAfter=touch.clientY>=rect.top+rect.height/2;
    const insertAt=insertAfter?(toIdx>rtWdTouchSrc.idx?toIdx:toIdx+1):(toIdx>rtWdTouchSrc.idx?toIdx-1:toIdx);
    const [moved]=arr.splice(rtWdTouchSrc.idx,1);
    arr.splice(Math.max(0,Math.min(arr.length,insertAt)),0,moved);
    LS.s('routine',routine);
  }
  rtWdTouchSrc={idx:null};
  renderRoutine();
}
function addWdItem(){
  const inp=document.getElementById('rti-wday');const name=inp.value.trim();if(!name)return;
  if(!Array.isArray(routine.weekdays[curWdayTab]))routine.weekdays[curWdayTab]=[];
  routine.weekdays[curWdayTab].push(name);LS.s('routine',routine);inp.value='';renderRoutine();
}
function delWdItem(idx){routine.weekdays[curWdayTab].splice(idx,1);LS.s('routine',routine);renderRoutine();}
function editWdItem(idx){openRtEditModal('wday',null,idx);}
// Apply weekday template to a day card
// tplConfirmModal state
let _tplCtx={key:null,dow:null,dateObj:null};
function closeTplConfirm(){closeModal('tplConfirmModal');}
function applyDayTemplate(key,dow,dateObj){
  const tpl=Array.isArray(routine.weekdays[dow])?routine.weekdays[dow]:[];
  if(!tpl.length){flash('Шаблон пуст — добавь задачи в Рутина → Дни недели');return;}
  const WDAYS=(typeof t==='function')?t('days_short2'):['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  _tplCtx={key,dow,dateObj};
  document.getElementById('tplConfirmText').textContent=
    `Заменить задачи "${WDAYS[dow]}" шаблоном из Рутины? Будет добавлено ${tpl.length} задач.`;
  document.getElementById('tplConfirmBtn').onclick=()=>confirmApplyTemplate();
  openModal('tplConfirmModal');
}
function confirmApplyTemplate(){
  const {key,dow,dateObj}=_tplCtx;
  const tpl=routine.weekdays[dow];
  tasks[key]=tpl.map(it=>{
    if(typeof it==='object'&&it.type==='habit'){
      return {id:nid++,name:it.name,emoji:it.emoji||'',_isHabit:true};
    }
    const name=typeof it==='string'?it:(it.name||'');
    return {id:nid++,name,done:false};
  });
  LS.s('tasks',tasks);LS.s('nid',nid);
  closeTplConfirm();
  const card=document.getElementById('dc-'+key);
  if(card&&dateObj instanceof Date){ paintCard(card,dateObj); } else { buildWeek(); }
  flash('✓ Шаблон применён');
}

