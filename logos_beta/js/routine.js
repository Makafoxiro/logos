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
  const blockLabels={morning:'УТРО',day:'ДЕНЬ',evening:'ВЕЧЕР',week:'НЕДЕЛЯ',month:'МЕСЯЦ',year:'ГОД'};
  const label=blockLabels[block]||block;
  showConfirm(`Сбросить все отметки «${label}»?`, ()=>{
    if(['morning','day','evening'].includes(block)){
      // ежедневные слоты: сброс по всем дням текущей недели (Пн–Вс)
      const now=new Date();
      const todayDow=(now.getDay()+6)%7;
      const monday=new Date(now);monday.setDate(now.getDate()-todayDow);
      for(let di=0;di<7;di++){
        const d=new Date(monday);d.setDate(monday.getDate()+di);
        const key=dk(d);
        if(routineLog[key]&&routineLog[key][block]){routineLog[key][block]={};}
      }
      LS.s('routineLog',routineLog);
    }else{
      saveBlockLog(block,{});
    }
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
  // daily-пункты редактируются отдельной модалкой со слотом и днями
  if(type==='daily'){openRtDailyEditModal(idx);return;}
  _rtEditCtx={type,block,idx};
  const name = routine[block][idx];
  document.getElementById('rtEditInp').value=name;
  document.getElementById('rtEditTitle').textContent='изменить задачу';
  document.getElementById('rtEditDelBtn').style.display='';
  document.getElementById('rtDailySetupRow').style.display='none';
  openModal('rtEditModal');
  setTimeout(()=>document.getElementById('rtEditInp').focus(),100);
}

function delCurrentRtEdit(){
  if(!_rtEditCtx)return;
  delRtItem(_rtEditCtx.block,_rtEditCtx.idx);
  closeRtEditModal();
}
function closeRtEditModal(){closeModal('rtEditModal');}
function confirmRtEdit(){
  // ежедневный пункт
  if(document.getElementById('rtDailySetupRow').style.display!=='none'){confirmRtDailyEdit();return;}
  const val=document.getElementById('rtEditInp').value.trim();
  if(!val){closeRtEditModal();return;}
  const {type,block,idx}=_rtEditCtx;
  routine[block][idx]=val;
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
    {key:'_daily',label:'ЕЖЕДНЕВНОЕ',color:'var(--a)'},
    {key:'week',label:'НЕДЕЛЯ',color:'var(--purple)'},
    {key:'month',label:'МЕСЯЦ',color:'var(--red)'},
    {key:'_annuals',label:'ГОД',color:'var(--amber)'},
  ];
  const totalSlides = blocks.length;
  if(curRtSlide >= totalSlides) curRtSlide = 0;

  const WDAYS_RU=DAYS7;

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
          ${done>0?`<button onclick="resetRtBlock('${b.key}')" style="background:none;border:none;font-family:var(--mono);font-size:8px;color:var(--t3);cursor:pointer;padding:2px 6px;border-radius:5px;border:1px solid var(--bd)" title="Сбросить выполненные">↺ сброс</button>`:''}
          <div class="rt-pct">${p}%</div>
        </div>
      </div>
      <div class="rt-items">${itemsHTML}</div>
      <div class="rt-add">
        <textarea class="add-inp" id="rti-${b.key}" placeholder="Добавить пункт..." rows="1" style="resize:none;overflow:hidden;font-family:var(--sans);font-size:14px;padding:11px 13px;min-height:44px"
          oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();addRtItem('${b.key}');}"></textarea>
        <button class="add-btn" onclick="addRtItem('${b.key}')" style="align-self:flex-start">+</button>
      </div>
    </div>`;
  }

  // ── СЛАЙД «ЕЖЕДНЕВНОЕ»: слоты УТРО/ДЕНЬ/ВЕЧЕР → плоский список пунктов ──
  // Каждый пункт один раз; дни недели показаны бейджем справа (.rt-days).
  const WDAYS_RU2=DAYS7;
  function dailySlideHTML(){
    const todayDow=(new Date().getDay()+6)%7;
    const all=(routine.daily||[]).filter(x=>x&&Array.isArray(x.days));
    const slots=[
      {key:'morning',label:'УТРО',color:'var(--a)'},
      {key:'day',label:'ДЕНЬ',color:'var(--amber)'},
      {key:'evening',label:'ВЕЧЕР',color:'var(--blue)'},
    ];
    const groups=slots.map(sl=>{
      const slotItems=all.filter(x=>(x.slot||'day')===sl.key);
      const collapsed=!!_dailyCollapsed[sl.key];
      // дни недели, в которые попадает этот слот
      const now=new Date();
      const monday=new Date(now);monday.setDate(now.getDate()-todayDow);
      const keyForDow=di=>{const d=new Date(monday);d.setDate(monday.getDate()+di);return dk(d);};
      // есть ли отметки за эту неделю в данном слоте (для кнопки сброса)
      const anyDone=WDAYS_RU2.some((_,di)=>{
        const gLog=routineLog[keyForDow(di)]||{};
        return slotItems.some(x=>isRtDone(sl.key,x.name,gLog[sl.key]));
      });
      // Плоский список: каждый пункт ОДИН раз, дни недели — бейджем справа
      // (раньше пункт дублировался под каждым днём, к которому был привязан)
      const todayLog=(routineLog[nowDK()]||{})[sl.key]||{};
      const bodyHTML=slotItems.length ? `<div class="rt-items">${slotItems.map(x=>{
        const realIdx=(routine.daily||[]).indexOf(x);
        const scheduledToday=x.days.includes(todayDow);
        const dn=scheduledToday && !!todayLog[x.name];
        // бейдж дней: 7 дней → «ежедневно», иначе список; сегодняшний день — цветом слота
        const sortedDays=[...x.days].sort((a,b)=>a-b);
        const badgeTxt = sortedDays.length>=7
          ? 'ежедневно'
          : sortedDays.map(d=>d===todayDow
              ? `<span style="color:${sl.color}">${WDAYS_RU2[d]}</span>`
              : WDAYS_RU2[d]).join(' ');
        return `
        <div class="rt-item${dn?' done':''}"
          id="rt-item-${sl.key}-${realIdx}"
          data-block="_daily" data-idx="${realIdx}"
          ondragover="rtDragOver(event,this)"
          ondragleave="rtDragLeave(this)"
          ondrop="rtDropDaily(${realIdx},event)"
          onclick="toggleDailyRt(${realIdx})">
          <div class="rt-drag"
            draggable="true"
            ondragstart="rtDragStart('_daily',${realIdx},this.parentElement);event.stopPropagation()"
            ondragend="rtDragEnd(this.parentElement)"
            ontouchstart="rtTouchStart(event,'_daily',${realIdx},this.parentElement)"
            ontouchmove="rtTouchMove(event)"
            ontouchend="rtTouchEndDaily(event)"
            onclick="event.stopPropagation()">⠿</div>
          <div class="rt-chk">${dn?'✓':''}</div>
          <div class="rt-name">${x.name}</div>
          <div class="rt-days">${badgeTxt}</div>
          <button class="rt-edit" onclick="event.stopPropagation();openRtEditModal('daily',null,${realIdx})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        </div>`;
      }).join('')}</div>` : '<div style="font-size:12px;color:var(--t3);font-family:var(--mono);padding:8px 0">пусто — добавь пункт</div>';
      return `<div class="rt-block">
        <div class="rt-head">
          <div class="rt-title" style="color:${sl.color}">${sl.label}</div>
          <div style="display:flex;align-items:center;gap:8px">
            ${anyDone?`<button onclick="resetRtBlock('${sl.key}')" style="background:none;border:none;font-family:var(--mono);font-size:8px;color:var(--t3);cursor:pointer;padding:2px 6px;border-radius:5px;border:1px solid var(--bd)">↺ сброс</button>`:''}
            <div class="rt-daily-toggle" onclick="toggleDailyGroup('${sl.key}')" style="font-size:12px;color:var(--t3);cursor:pointer;padding:2px 6px;user-select:none">${collapsed?'▸':'▾'}</div>
          </div>
        </div>
        <div class="rt-daily-content" data-slot="${sl.key}"${collapsed?' style="display:none"':''}>${bodyHTML}</div>
      </div>`;
    }).join('');
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 0 8px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:1px">ВСЯ НЕДЕЛЯ · ${WDAYS_RU2[todayDow].toUpperCase()}</div>
        <button onclick="openDailyAddModal()" style="background:var(--a2);border:1px solid var(--ab);border-radius:8px;color:var(--a);font-family:var(--mono);font-size:10px;padding:6px 12px;cursor:pointer;transition:.15s">+ ДОБАВИТЬ ПУНКТ</button>
      </div>
      ${groups}
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
        <div class="rt-title" style="color:var(--purple)">НЕДЕЛЯ</div>
        <div style="display:flex;align-items:center;gap:8px">
          ${done>0?`<button onclick="resetRtBlock('week')" style="background:none;border:none;font-family:var(--mono);font-size:8px;color:var(--t3);cursor:pointer;padding:2px 6px;border-radius:5px;border:1px solid var(--bd)">↺ сброс</button>`:''}
          <div class="rt-pct">${p}%</div>
        </div>
      </div>
      <div class="rt-items">${itemsHTML||'<div style="font-size:12px;color:var(--t3);font-family:var(--mono);padding:8px 0">пусто — добавь задачу</div>'}</div>
      <div class="rt-add">
        <textarea class="add-inp" id="rti-week" placeholder="Добавить пункт..." rows="1" style="resize:none;overflow:hidden;font-family:var(--sans);font-size:14px;padding:11px 13px;min-height:44px"
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
      const nextFmt=nextDateStr?displayDate(nextDateStr):'';
      const lastFmt=a.lastDate?displayDate(a.lastDate):'';
      const pl=periodLabel(a.period);

      // Overdue banner with action button
      const overdueBanner=isOverdue&&a.period?`
        <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:8px;padding:6px 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:10px;color:var(--red);flex:1">${uiIconSvg('alert')} просрочено на ${Math.abs(days)}д.</span>
          <button onclick="annualMarkDone(${a.id})" style="background:var(--a);border:none;border-radius:6px;color:#000;font-family:var(--mono);font-size:10px;padding:4px 10px;cursor:pointer;white-space:nowrap">✓ сделал — сдвинуть</button>
        </div>`:
        (isOverdue&&!a.period?`<div style="font-family:var(--mono);font-size:10px;color:var(--red);padding-left:16px">${uiIconSvg('alert')} дата прошла</div>`:'');

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
        <div class="rt-title" style="color:var(--amber)">ЕЖЕГОДНЫЕ</div>
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
    if(b.key==='_daily') content=dailySlideHTML();
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
  const blocks=track ? track.querySelectorAll('.routine-swipe-slide').length : 4;
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
    const colors=['var(--a)','var(--purple)','var(--red)','var(--amber)'];
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


// ══ ЕЖЕДНЕВНОЕ (routine.daily) ════════════════════════════
// routine.daily = [{name, slot:'morning'|'day'|'evening', days:[0..6]}]  (0=Пн..6=Вс)
const RT_SLOT_LABELS={morning:'УТРО',day:'ДЕНЬ',evening:'ВЕЧЕР'};
const RT_SLOT_COLORS={morning:'var(--a)',day:'var(--amber)',evening:'var(--blue)'};
const RT_WDAYS=DAYS7;
let _dailyCollapsed={morning:true,day:true,evening:true};

function toggleDailyGroup(slot){
  _dailyCollapsed[slot]=!_dailyCollapsed[slot];
  const content=document.querySelector(`.rt-daily-content[data-slot="${slot}"]`);
  const block=content?.closest('.rt-block');
  if(!content||!block){renderRoutine();return;}
  const toggle=block.querySelector('.rt-daily-toggle');
  animateCollapse(content,_dailyCollapsed[slot],'block');
  if(toggle)toggle.textContent=_dailyCollapsed[slot]?'▸':'▾';
}

function toggleDailyRt(realIdx,dateKey){
  const item=(routine.daily||[])[realIdx];
  if(!item)return;
  const key=dateKey||nowDK();
  if(!routineLog[key])routineLog[key]={morning:{},day:{},evening:{}};
  const slot=item.slot||'day';
  if(!routineLog[key][slot])routineLog[key][slot]={};
  const nowDone=!routineLog[key][slot][item.name];
  routineLog[key][slot][item.name]=nowDone;
  if(!nowDone)delete routineLog[key][slot][item.name];
  LS.s('routineLog',routineLog);
  renderRoutine();
}

function rtDropDaily(toRealIdx,e){
  document.querySelectorAll('.rt-item').forEach(el=>el.classList.remove('drag-over-top','drag-over-bottom'));
  if(rtDragSrc.block!=='_daily')return;
  const arr=routine.daily;
  let toIdx=toRealIdx;
  if(e){
    const el=e.currentTarget||e.target?.closest('.rt-item');
    if(el){
      const rect=el.getBoundingClientRect();
      if(e.clientY>=rect.top+rect.height/2)toIdx=toRealIdx+1;
    }
  }
  if(rtDragSrc.idx===toIdx)return;
  const [moved]=arr.splice(rtDragSrc.idx,1);
  const insertAt=toIdx>rtDragSrc.idx?toIdx-1:toIdx;
  arr.splice(Math.max(0,Math.min(arr.length,insertAt)),0,moved);
  LS.s('routine',routine);
  renderRoutine();
}

function rtTouchEndDaily(e){
  if(rtTouchSrc.block==='_daily'){
    const touch=e.changedTouches[0];
    const target=document.elementFromPoint(touch.clientX,touch.clientY);
    const item=target?.closest('.rt-item[data-block="_daily"]');
    if(item){
      const toIdx=parseInt(item.dataset.idx);
      const arr=routine.daily;
      const rect=item.getBoundingClientRect();
      const insertAfter=touch.clientY>=rect.top+rect.height/2;
      const insertAt=insertAfter?(toIdx>rtTouchSrc.idx?toIdx:toIdx+1):(toIdx>rtTouchSrc.idx?toIdx-1:toIdx);
      const [moved]=arr.splice(rtTouchSrc.idx,1);
      arr.splice(Math.max(0,Math.min(arr.length,insertAt-(insertAt>rtTouchSrc.idx?1:0))),0,moved);
      LS.s('routine',routine);
    }
    rtTouchSrc={block:null,idx:null,el:null,clone:null,startY:0};
    renderRoutine();
    return;
  }
  rtTouchEnd(e);
}

// ── Модалка создания/редактирования ежедневного пункта ──
let _rtDailyEditIdx=null; // null = создание, иначе индекс в routine.daily
let _rtDailyDraft={slot:'morning',days:[]};

function _renderRtDailyModal(){
  // слоты
  const slotWrap=document.getElementById('rtDailySlotWrap');
  if(slotWrap){
    slotWrap.innerHTML=['morning','day','evening'].map(k=>{
      const on=_rtDailyDraft.slot===k;
      return `<div onclick="rtDailyPickSlot('${k}')" style="flex:1;text-align:center;padding:9px 0;border-radius:var(--rm);border:1px solid ${on?'var(--ab)':'var(--bd)'};background:${on?'var(--a2)':'var(--c2)'};font-family:var(--mono);font-size:11px;color:${on?'var(--a)':'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">${RT_SLOT_LABELS[k]}</div>`;
    }).join('');
  }
  // дни недели
  const daysWrap=document.getElementById('rtDailyDaysWrap');
  if(daysWrap){
    daysWrap.innerHTML=RT_WDAYS.map((d,i)=>{
      const on=_rtDailyDraft.days.includes(i);
      return `<div onclick="rtDailyToggleDay(${i})" style="flex:1;min-width:0;text-align:center;padding:8px 0;border-radius:var(--rm);border:1px solid ${on?'var(--ab)':'var(--bd)'};background:${on?'var(--a2)':'var(--c2)'};font-family:var(--mono);font-size:11px;color:${on?'var(--a)':'var(--t2)'};cursor:pointer;user-select:none;transition:.12s">${d}</div>`;
    }).join('');
  }
}

function rtDailyPickSlot(k){_rtDailyDraft.slot=k;_renderRtDailyModal();}
function rtDailyToggleDay(i){
  const idx=_rtDailyDraft.days.indexOf(i);
  if(idx>=0)_rtDailyDraft.days.splice(idx,1);else _rtDailyDraft.days.push(i);
  _rtDailyDraft.days.sort((a,b)=>a-b);
  _renderRtDailyModal();
}

function openDailyAddModal(){
  _rtDailyEditIdx=null;
  _rtDailyDraft={slot:'morning',days:[]};
  document.getElementById('rtEditTitle').textContent='новый пункт';
  document.getElementById('rtEditInp').value='';
  document.getElementById('rtEditDelBtn').style.display='none';
  document.getElementById('rtDailySetupRow').style.display='block';
  _renderRtDailyModal();
  openModal('rtEditModal');
  setTimeout(()=>document.getElementById('rtEditInp').focus(),100);
}

function openRtDailyEditModal(realIdx){
  const item=(routine.daily||[])[realIdx];
  if(!item)return;
  _rtDailyEditIdx=realIdx;
  _rtDailyDraft={slot:item.slot||'day',days:Array.isArray(item.days)?item.days.slice():[]};
  document.getElementById('rtEditTitle').textContent='изменить пункт';
  document.getElementById('rtEditInp').value=item.name||'';
  document.getElementById('rtEditDelBtn').style.display='';
  document.getElementById('rtDailySetupRow').style.display='block';
  _renderRtDailyModal();
  openModal('rtEditModal');
  setTimeout(()=>document.getElementById('rtEditInp').focus(),100);
}

function confirmRtDailyEdit(){
  const name=document.getElementById('rtEditInp').value.trim();
  if(!name){flash('Введи название');return;}
  if(!_rtDailyDraft.days.length){flash('Выбери дни недели');return;}
  if(!routine.daily)routine.daily=[];
  if(_rtDailyEditIdx===null){
    routine.daily.push({name,slot:_rtDailyDraft.slot,days:[..._rtDailyDraft.days]});
  }else{
    const it=routine.daily[_rtDailyEditIdx];
    if(it){it.name=name;it.slot=_rtDailyDraft.slot;it.days=[..._rtDailyDraft.days];}
  }
  LS.s('routine',routine);
  closeModal('rtEditModal');
  renderRoutine();
}

function delRtDailyEdit(){
  if(_rtDailyEditIdx===null)return;
  routine.daily.splice(_rtDailyEditIdx,1);
  LS.s('routine',routine);
  closeModal('rtEditModal');
  renderRoutine();
}

// ── Хелперы для других страниц (Сегодня/Неделя) ──
function dailyItemsForDow(dow){
  return (routine.daily||[]).filter(x=>x&&Array.isArray(x.days)&&x.days.includes(dow));
}
function dailyItemsForSlot(slot,dow){
  return dailyItemsForDow(dow).filter(x=>(x.slot||'day')===slot);
}
function dailyDoneCount(dow,dateKey){
  const log=routineLog[dateKey]||{};
  return dailyItemsForDow(dow).filter(x=>log[x.slot||'day']&&log[x.slot||'day'][x.name]).length;
}
