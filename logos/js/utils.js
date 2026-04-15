// ═══ MODULE: utils.js ═══
const MSHORT=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const MFULL=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DAYS7=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const EMOJIS=['💪','🧠','📖','🥗','😴','🚫','🎯','⚡','✍️','🧘','🚗','💊','🏃','🎨','🥊','📱','💰','🔑'];

// ══ HELPERS ════════════════════════════════════════════
const dk  = d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const mk  = d=>`M${d.getFullYear()}-${d.getMonth()}`;
const nowDK = ()=>dk(new Date());
const nowMK = ()=>mk(new Date());
const pct   = (a,b)=>b?Math.round((a/b)*100):0;
const getMonday = d=>{const r=new Date(d);r.setDate(r.getDate()-((r.getDay()+6)%7));return r;};

function updateHeader(){
  const n=new Date();
  document.getElementById('topDate').textContent=`${n.getDate()} ${MSHORT[n.getMonth()]} ${n.getFullYear()}`;
}
function flash(msg){const b=document.getElementById('banner');b.textContent=msg;b.style.display='block';setTimeout(()=>b.style.display='none',2500);}
function showConfirm(msg, onYes){
  document.getElementById('customConfirmMsg').textContent=msg;
  openModal('customConfirm');
  document.getElementById('customConfirmYes').onclick=()=>{closeModal('customConfirm');onYes();};
  document.getElementById('customConfirmNo').onclick=()=>closeModal('customConfirm');
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

function getNavBtn(page){return [...document.querySelectorAll('.nb')].find(b=>(b.getAttribute('onclick')||b.dataset.page||'').includes(page));}

// ── Модальные окна ───────────────────────────────────────
function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('show'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }

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
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  return `${d.getDate()} ${MFULL[d.getMonth()]} ${d.getFullYear()}`;
}
function formatMonthDay(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  return `${d.getDate()} ${MSHORT[d.getMonth()]}`;
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
