// ═══ MODULE: utils.js ═══
const MSHORT_RU=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const MSHORT_EN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const getMSHORT=()=>{try{return appLang==='en'?MSHORT_EN:MSHORT_RU;}catch(e){return MSHORT_RU;}};
const MSHORT=new Proxy([],{get:(t,p)=>{ const a=getMSHORT(); return typeof p==='symbol'?a[p]:(p==='length'?a.length:(isNaN(p)?a[p]:a[+p])); }});
const MFULL_RU=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MFULL_EN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const getMFULL=()=>{try{return appLang==='en'?MFULL_EN:MFULL_RU;}catch(e){return MFULL_RU;}};
const MFULL=new Proxy([],{get:(t,p)=>{ const a=getMFULL(); return typeof p==='symbol'?a[p]:(p==='length'?a.length:(isNaN(p)?a[p]:a[+p])); }});
const DAYS7_RU=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const DAYS7_EN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const getDAYS7=()=>{try{return appLang==='en'?DAYS7_EN:DAYS7_RU;}catch(e){return DAYS7_RU;}};
const DAYS7=new Proxy([],{
  get:(t,p)=>{ const a=getDAYS7(); return typeof p==='symbol'?a[p]:(p==='length'?a.length:(isNaN(p)?a[p]:a[+p])); },
  has:(t,p)=>{ const a=getDAYS7(); return (p in a); }
});
const DAYS_FULL_RU=['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']; // индекс = getDay() (0=вс)
const DAYS_FULL_EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const dayFullName=d=>{const dow=(d instanceof Date)?d.getDay():+d;try{return (appLang==='en'?DAYS_FULL_EN:DAYS_FULL_RU)[dow];}catch(e){return DAYS_FULL_RU[dow];}};
// ══ HELPERS ════════════════════════════════════════════
const dk  = d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const mk  = d=>`M${d.getFullYear()}-${d.getMonth()}`;
const nowDK = ()=>dk(new Date());
const nowMK = ()=>mk(new Date());
const pct   = (a,b)=>b?Math.round((a/b)*100):0;
const getMonday = d=>{const r=new Date(d);r.setDate(r.getDate()-((r.getDay()+6)%7));return r;};

function animateCollapse(el,collapsed,display='block',instant=false){
  if(!el)return;
  const previous=el._collapseAnimation;
  const wasHidden=el.style.display==='none';
  const currentHeight=previous?el.getBoundingClientRect().height:(wasHidden?0:el.getBoundingClientRect().height);
  const currentOpacity=previous?Number(getComputedStyle(el).opacity):(collapsed?1:0);
  if(previous)previous.cancel();
  el._collapseAnimation=null;
  if(instant||!el.animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    el.style.display=collapsed?'none':display;
    el.style.height='';
    el.style.overflow='';
    el.style.opacity='';
    el.style.transform='';
    el.setAttribute('aria-hidden',String(collapsed));
    return;
  }
  if(collapsed&&currentHeight===0){
    el.style.display='none';
    el.style.height='';
    el.style.overflow='';
    el.style.opacity='';
    el.style.transform='';
    el.setAttribute('aria-hidden','true');
    return;
  }
  el.style.display=display;
  const targetHeight=collapsed?0:el.scrollHeight;
  const startHeight=wasHidden?0:currentHeight;
  el.style.height=startHeight+'px';
  el.style.overflow='hidden';
  el.setAttribute('aria-hidden',String(collapsed));
  const animation=el.animate([
    {height:startHeight+'px',opacity:wasHidden?0:currentOpacity,transform:'translateY('+(collapsed?'-3px':'3px')+')'},
    {height:targetHeight+'px',opacity:collapsed?0:1,transform:'translateY(0)'}
  ],{duration:300,easing:'cubic-bezier(.2,.7,.3,1)'});
  el._collapseAnimation=animation;
  animation.onfinish=()=>{
    if(el._collapseAnimation!==animation)return;
    el._collapseAnimation=null;
    el.style.display=collapsed?'none':display;
    el.style.height='';
    el.style.overflow='';
    el.style.opacity='';
    el.style.transform='';
  };
}

function updateHeader(){
  document.getElementById('topDate').textContent=displayDate(new Date());
}
function flash(msg, duration=2500){const b=document.getElementById('banner');b.textContent=msg;b.style.display='block';clearTimeout(b._flashT);b._flashT=setTimeout(()=>b.style.display='none',duration);}
function showConfirm(msg, onYes, onNo, yesLabel='Сбросить', noLabel='Отмена'){
  document.getElementById('customConfirmMsg').textContent=msg;
  openModal('customConfirm');
  document.getElementById('customConfirmYes').textContent=yesLabel;
  document.getElementById('customConfirmNo').textContent=noLabel;
  document.getElementById('customConfirmYes').onclick=()=>{closeModal('customConfirm');if(typeof onYes==='function')onYes();};
  document.getElementById('customConfirmNo').onclick=()=>{closeModal('customConfirm');if(typeof onNo==='function')onNo();};
}

// Task name popup (for overflowed text in narrow day columns)
let _taskPopupTimer=null;
function showTaskPopup(text,e){
  e.stopPropagation();
  closeTaskPopup();
  const el=e.currentTarget;
  if(el.scrollWidth<=el.clientWidth+1)return; // not overflowing
  const pop=document.createElement('div');
  pop.className='task-popup';
  pop.id='taskPopup';
  pop.textContent=text;
  document.body.appendChild(pop);
  const r=el.getBoundingClientRect();
  const pw=Math.min(220,window.innerWidth-16);
  pop.style.maxWidth=pw+'px';
  pop.style.left='-9999px';
  // After paint, reposition
  requestAnimationFrame(()=>{
    const ph=pop.offsetHeight;
    let left=r.left+r.width/2-pop.offsetWidth/2;
    left=Math.max(8,Math.min(left,window.innerWidth-pop.offsetWidth-8));
    let top=r.top-ph-8;
    if(top<8)top=r.bottom+8;
    pop.style.left=left+'px';
    pop.style.top=top+'px';
  });
  _taskPopupTimer=setTimeout(closeTaskPopup,3500);
}
function closeTaskPopup(){
  if(_taskPopupTimer){clearTimeout(_taskPopupTimer);_taskPopupTimer=null;}
  const p=document.getElementById('taskPopup');if(p)p.remove();
}
document.addEventListener('click',closeTaskPopup,{passive:true});

function getNavBtn(page){
  // Только НАСТОЯЩИЕ кнопки: у клонов бесконечной ленты (data-nav-page) тоже
  // остаётся data-page от cloneNode, а стоят они ВПЕРИДИ реальных — find()
  // иначе возвращал клон, и goPage принимал его за «тап по клону» (без центрирования)
  const reals=[...document.querySelectorAll('.nb')].filter(b=>!b.dataset.navPage);
  return reals.find(b=>b.dataset.page===page)||reals.find(b=>(b.getAttribute('onclick')||'').includes(page));
}

// ── Модальные окна ───────────────────────────────────────
// Счётчик открытых модалок (для вложенных — напр. фото ДЗ поверх редактирования)
let _modalLockCount = 0;
function lockBodyScroll(){
  if(_modalLockCount++ === 0){
    document.documentElement.classList.add('modal-open');
  }
}
function unlockBodyScroll(){
  if(_modalLockCount > 0 && --_modalLockCount === 0){
    document.documentElement.classList.remove('modal-open');
  }
}
function openModal(id)  { const el = document.getElementById(id); if (!el) return; el.classList.add('show'); lockBodyScroll(); if(!el._touchBlocked){el._touchBlocked=true;el.addEventListener('touchstart',e=>{if(e.target===el||e.target.closest('.modal')||e.target.closest('.modal-box')||e.target.closest('.modal-body')||e.target.closest('.modal-sheet'))return;e.preventDefault();e.stopPropagation();},{passive:false});} }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); unlockBodyScroll(); }

// ── Универсальное удаление ───────────────────────────────
function deleteItem(arr, lsKey, id, renderFn) {
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return;
  arr.splice(idx, 1);
  LS.s(lsKey, arr);
  if (typeof renderFn === 'function') renderFn();
}

// ── Утилиты дат ─────────────────────────────────────────
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const p = dateStr.split('-');
  if (p.length < 3) return null;
  const d = new Date(+p[0], +p[1] - 1, +p[2]);
  return isNaN(d) ? null : d;
}
// ══ UNIFIED DATE DISPLAY ═══════════════════════════════════
// Канонический формат даты всего приложения: «9 апр 2026».
// key: Date | 'YYYY-MM-DD' (ISO из input[type=date], месяц с 1) | 'Y-M-D' (ключ dk(), месяц с 0)
// opts: {noYear:true} → «9 апр» | {monthOnly:true} → «апр 2026» | {weekday:true} → «Пн 9 апр» | {upper:true}
function toDateLike(key,dkMode){
  if(key instanceof Date)return key;
  if(typeof key!=='string'||!key)return null;
  const p=key.split('-');
  if(p.length!==3)return null;
  const y=+p[0],a=+p[1],d=+p[2];
  if(isNaN(y)||isNaN(a)||isNaN(d))return null;
  // ISO (input[type=date], месяц 1-based) — по умолчанию; dk() (месяц 0-based) — если dkMode или ключ не падднут
  const iso=dkMode?false:/^\d{4}-\d{2}-\d{2}$/.test(key);
  const r=new Date(y,iso?a-1:a,d);
  return isNaN(r)?null:r;
}
function dkToDate(key){ // явный разбор ключа dk(): «2026-3-9» → Date(2026,3,9)
  const p=String(key).split('-');
  return new Date(+p[0],+p[1],+p[2]);
}
function displayDate(key,opts){
  opts=opts||{};
  const d=toDateLike(key,opts.dk);
  if(!d||isNaN(d))return '';
  let out;
  if(opts.monthOnly)out=`${MSHORT[d.getMonth()]} ${d.getFullYear()}`;
  else out=`${d.getDate()} ${MSHORT[d.getMonth()]}`+(opts.noYear?'':' '+d.getFullYear());
  if(opts.weekday)out=`${DAYS7[(d.getDay()+6)%7]} ${out}`;
  return opts.upper?out.toUpperCase():out;
}
function displayDateRange(a,b,opts){
  opts=opts||{};
  const da=toDateLike(a,opts.dk),db=toDateLike(b,opts.dk);
  if(!da||!db)return '';
  const sameYear=da.getFullYear()===db.getFullYear();
  const base=Object.assign({},opts);delete base.noYear;
  const start=displayDate(da,sameYear?Object.assign({},base,{noYear:true}):base);
  const end=displayDate(db,opts.noYear?Object.assign({},base,{noYear:true}):base);
  return `${start} — ${end}`;
}
// Алиасы (обратная совместимость)
function formatDate(dateStr){return displayDate(dateStr);}
function formatMonthDay(dateStr){return displayDate(dateStr,{noYear:true});}

// Дата + время для служебных меток (бэкапы, автосейв): «9 апр 2026, 15:30»
function displayDateTime(dateLike, opts){
  opts=opts||{};
  const d=toDateLike(dateLike,opts.dk);
  if(!d||isNaN(d))return '';
  const date=displayDate(d,opts);
  const hh=String(d.getHours()).padStart(2,'0');
  const mm=String(d.getMinutes()).padStart(2,'0');
  return `${date}, ${hh}:${mm}`;
}

function daysToAnnual(dateStr, now) {
  if (!dateStr) return 9999;
  const d = parseLocalDate(dateStr);
  if (!d) return 9999;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}
function daysToDeadline(dateStr, now) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  if (!d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}
