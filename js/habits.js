// ═══ MODULE: habits.js ═══
// ══ HABITS ═════════════════════════════════════════════
function getComp(){
  const dk=nowDK();
  // Если день ещё не инициализирован — наполнить из habEnabled
  if(!comp[dk]){
    comp[dk]={};
    habEnabled.forEach(id=>{comp[dk][id]=true;});
    LS.s('comp',comp);
  }
  return comp[dk];
}
function saveComp(c){comp[nowDK()]=c;LS.s('comp',comp);}

// Привычки не добавляются в задачи — они живут отдельно

function toggleHabit(id){
  const c=getComp();
  const wasOn=!!c[id];
  if(wasOn){
    delete c[id];
    habEnabled.delete(id);
  } else {
    c[id]=true;
    habEnabled.add(id);
  }
  LS.s('habEnabled',[...habEnabled]);
  saveComp(c);
  renderHabits();
  // Пересобрать карточку сегодня чтобы обновить 📋 пространство
  const key=nowDK();
  const card=document.querySelector(`[data-daykey="${key}"]`);
  if(card){
    const d=new Date();
    paintCard(card,d);
  }
}

function addHabit(){
  const inp=document.getElementById('habitInp'),name=inp.value.trim();
  if(!name)return;
  const desc=document.getElementById('habitDescInp')?.value.trim()||'';
  habits.push({id:nid++,name,emoji:selEmoji,desc});
  LS.s('habits',habits);LS.s('nid',nid);
  inp.value='';
  const di=document.getElementById('habitDescInp');if(di)di.value='';
  renderHabits();
}

function delHabit(id){
  habits=habits.filter(h=>h.id!==id);
  habEnabled.delete(id);
  LS.s('habits',habits);
  LS.s('habEnabled',[...habEnabled]);
  renderHabits();
}

// Состояние раскрытых карточек привычек
const habitExpanded={};

function toggleHabitExpand(id,e){
  e.stopPropagation();
  habitExpanded[id]=!habitExpanded[id];
  renderHabits();
}

let _habitEditId=null;
function openHabitEdit(id){
  const h=habits.find(x=>x.id===id);if(!h)return;
  _habitEditId=id;
  document.getElementById('habitEditInp').value=h.name;
  const descEl=document.getElementById('habitEditDescInp');
  if(descEl)descEl.value=h.desc||'';
  openModal('habitEditModal');
  setTimeout(()=>document.getElementById('habitEditInp').focus(),100);
}
function closeHabitEditModal(){closeModal('habitEditModal');_habitEditId=null;}
function saveHabitEdit(){
  const val=document.getElementById('habitEditInp').value.trim();
  if(!val||_habitEditId===null){closeHabitEditModal();return;}
  const h=habits.find(x=>x.id===_habitEditId);
  if(h){
    h.name=val;
    const descEl=document.getElementById('habitEditDescInp');
    h.desc=descEl?descEl.value.trim():'';
  }
  LS.s('habits',habits);
  closeHabitEditModal();
  renderHabits();
  flash('Привычка обновлена');
}

function renderHabits(){
  const c=getComp(),list=document.getElementById('habitsList');
  list.innerHTML='';
  habits.forEach(h=>{
    const isDone=!!c[h.id]; // индикатор = активна (добавлена в сегодня)
    const isExpanded=!!habitExpanded[h.id];
    const hasDesc=!!(h.desc&&h.desc.trim());

    const wrap=document.createElement('div');
    wrap.id='hab-item-'+h.id;
    wrap.style.cssText='margin-bottom:7px';

    // Основная строка
    const main=document.createElement('div');
    main.style.cssText=`background:var(--c1);border:1px solid ${isDone?'rgba(45,212,191,0.25)':'var(--bd)'};border-radius:${isExpanded&&hasDesc?'14px 14px 0 0':'14px'};padding:13px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;user-select:none;transition:.15s`;
    main.innerHTML=`
      <div style="width:11px;height:11px;border-radius:50%;background:${isDone?'var(--a)':'var(--t3)'};flex-shrink:0;transition:.2s;box-shadow:${isDone?'0 0 6px rgba(45,212,191,0.5)':'none'}"></div>
      ${h.emoji?`<span style="font-size:17px;flex-shrink:0">${h.emoji}</span>`:''}
      <span style="flex:1;font-size:15px;color:var(--t)">${h.name}</span>
      ${hasDesc?`<div style="color:var(--t3);font-size:13px;padding:2px 5px;cursor:pointer;line-height:1;transform:rotate(${isExpanded?'180':'0'}deg);transition:.2s" onclick="toggleHabitExpand(${h.id},event)">▾</div>`:''}
      <button class="rt-edit" onclick="event.stopPropagation();openHabitEdit(${h.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
`;
    main.onclick=()=>toggleHabit(h.id);
    wrap.appendChild(main);

    // Раскрывающаяся панель с описанием
    if(isExpanded&&hasDesc){
      const body=document.createElement('div');
      body.style.cssText=`background:var(--c2);border:1px solid ${isDone?'rgba(45,212,191,0.18)':'var(--bd)'};border-top:none;border-radius:0 0 14px 14px;padding:10px 14px 12px`;
      body.innerHTML=`<div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:5px">описание</div><div style="font-size:13px;color:var(--t2);line-height:1.6;white-space:pre-wrap">${h.desc}</div>`;
      wrap.appendChild(body);
    }

    list.appendChild(wrap);
  });

  const ep=document.getElementById('epick');
  ep.innerHTML=`<div class="ep${selEmoji===''?' on':''}" onclick="selEmoji='';renderHabits()"><span class="ep-none">нет</span></div>`+
    EMOJIS.map(e=>`<div class="ep${e===selEmoji?' on':''}" onclick="selEmoji='${e}';renderHabits()">${e}</div>`).join('');
}

