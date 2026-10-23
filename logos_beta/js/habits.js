// ═══ MODULE: habits.js ═══
// ══ HABITS ═════════════════════════════════════════════
const HABIT_ICONS=[
  {id:'sparkles',label:'Общее',svg:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.1 2.1L22 17l-1.9.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z"/>'},
  {id:'dumbbell',label:'Тренировка',svg:'<path d="m6.5 6.5 11 11M4 9l5-5M15 20l5-5M3 6l3-3M18 21l3-3M2 8l6-6M16 22l6-6"/>'},
  {id:'brain',label:'Развитие',svg:'<path d="M12 18V5a3 3 0 0 0-5.8-1A4 4 0 0 0 4 11a4 4 0 0 0 2 7.5A3.5 3.5 0 0 0 12 18Zm0-9a3 3 0 0 1 5.8-1A4 4 0 0 1 20 15a4 4 0 0 1-2 7.5A3.5 3.5 0 0 1 12 20v-2"/><path d="M8 8h.01M16 12h.01M9 15h.01"/>'},
  {id:'book',label:'Чтение',svg:'<path d="M12 7v14M3 18V5a2 2 0 0 1 2-2h2a5 5 0 0 1 5 5 5 5 0 0 1 5-5h2a2 2 0 0 1 2 2v13h-4a5 5 0 0 0-5 3 5 5 0 0 0-5-3H3Z"/>'},
  {id:'leaf',label:'Питание',svg:'<path d="M18 3c-7 0-13 2-13 9a7 7 0 0 0 7 7c7 0 9-6 9-13V3h-3Z"/><path d="M3 21c3-5 7-8 12-11"/>'},
  {id:'moon',label:'Сон',svg:'<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>'},
  {id:'target',label:'Цель',svg:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'},
  {id:'bolt',label:'Энергия',svg:'<path d="m13 2-3 8h7l-6 12 1-9H5l8-11Z"/>'},
  {id:'pen',label:'Запись',svg:'<path d="m15 5 4 4M4 20l4-.8L19.2 8a2.8 2.8 0 0 0-4-4L4.8 15.2 4 20Z"/>'},
  {id:'meditation',label:'Спокойствие',svg:'<circle cx="12" cy="4" r="2"/><path d="M12 7v5m-7 8a7 7 0 0 1 14 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>'},
  {id:'car',label:'Дорога',svg:'<path d="M5 17h14l1-6-2-5H6l-2 5 1 6ZM4 11h16M7 17v2m10-2v2M7 14h.01M17 14h.01"/>'},
  {id:'capsule',label:'Здоровье',svg:'<path d="M7 17 17 7a4.2 4.2 0 0 1 6 6L13 23a4.2 4.2 0 0 1-6-6Z" transform="translate(-3 -3)"/><path d="m8 14 6 6"/>'},
  {id:'run',label:'Бег',svg:'<circle cx="14" cy="4" r="2"/><path d="m7 13 4-4 4 2 3 4m-8-6-2 5-5 2m10-5-2 5 4 4m-8-6 3 5-2 4"/>'},
  {id:'palette',label:'Творчество',svg:'<path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.5-3.3 1.8 1.8 0 0 1 1.4-3h.9A4 4 0 0 0 21 10.6C20.2 6.3 16.5 3 12 3Z"/><path d="M7.5 10h.01M10 7h.01M14 7h.01M17 10h.01"/>'},
  {id:'smartphone',label:'Телефон',svg:'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M10 18h4"/>'},
  {id:'wallet',label:'Финансы',svg:'<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6a3 3 0 0 1-3-3V6.5A2.5 2.5 0 0 1 5.5 4M3 8h16m-4 5h4"/>'},
  {id:'key',label:'Ключ',svg:'<circle cx="15" cy="9" r="5"/><path d="m11.5 12.5-8 8V17l3-3H10l1.5-1.5"/><path d="M15 9h.01"/>'},
  {id:'droplet',label:'Вода',svg:'<path d="M12 3s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12Z"/><path d="M9 16a3 3 0 0 0 3 3"/>'},
  {id:'calendar',label:'Календарь',svg:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>'},
  {id:'school',label:'Учёба',svg:'<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3 3 9 3 12 0v-5M22 9v6"/>'},
  {id:'camera',label:'Фото',svg:'<path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.5"/>'},
  {id:'clipboard',label:'Список',svg:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5h6a1.5 1.5 0 0 0-3-1 1.5 1.5 0 0 0-3 1ZM9 11h6M9 15h6M9 19h3"/>'},
  {id:'pin',label:'Закрепить',svg:'<path d="m16 3 5 5-4 1-4 5-1 4-2-2-6 5 5-6-2-2 4-1 5-5 1-4Z"/>'},
  {id:'film',label:'Фильм',svg:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>'},
  {id:'screen',label:'Видео',svg:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m10 8 5 2.5-5 2.5zM8 21h8m-4-4v4"/>'},
  {id:'bookmark',label:'Закладка',svg:'<path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4V4Z"/>'},
  {id:'gift',label:'Подарок',svg:'M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9H8a2.5 2.5 0 1 1 2.5-2.5V9Zm0 0h4a2.5 2.5 0 1 0-2.5-2.5V9Z"/>'},
  {id:'cart',label:'Покупки',svg:'<path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>'},
  {id:'clock',label:'Время',svg:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'},
  {id:'cake',label:'День рождения',svg:'<path d="M4 12h16v9H4zM3 9h18v3H3zM8 9V5m8 4V5M8 3v1m8-1v1M4 16h16"/><path d="M8 12v1m4-1v1m4-1v1"/>'},
  {id:'tree',label:'Праздник',svg:'<path d="m12 2 5 6h-3l5 6h-4l4 6H5l4-6H5l5-6H7l5-6ZM12 20v2"/>'},
  {id:'page',label:'Документ',svg:'<path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 13h8m-8 4h8"/>'},
  {id:'bulb',label:'Подсказка',svg:'<path d="M9 18h6m-5 3h4m-5-6a7 7 0 1 1 6 0c-.8.5-1 1.2-1 2h-4c0-.8-.2-1.5-1-2Z"/>'},
  {id:'flame',label:'Огонь',svg:'<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-3 4 0-4-2-7-4-9 0 5-3 8-3 14a7 7 0 0 0 7 7Z"/><path d="M12 22a3 3 0 0 0 3-3c0-2-2-4-3-5-1 2-3 3-3 5a3 3 0 0 0 3 3Z"/>'},
  {id:'sun',label:'Свет',svg:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>'},
  {id:'circle',label:'Статус',svg:'<circle cx="12" cy="12" r="8"/>'},
  {id:'salt',label:'Соль',svg:'<path d="M9 3h6l1 4H8l1-4ZM7 7h10l2 14H5L7 7Z"/><path d="M9 11h.01M12 11h.01M15 11h.01M10 15h.01M14 15h.01"/>'},
  {id:'heart',label:'Здоровье',svg:'<path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.8Z"/>'},
  {id:'rocket',label:'Старт',svg:'<path d="M12 15 9 12c.5-4.5 3.5-8 10-9-.5 6.5-4.5 9.5-7 10Z"/><path d="m9 12-4 1-2 4 6-1m3-1 1 5 4-3v-4M6 19l-2 2"/><circle cx="15" cy="8" r="1"/>'},
  {id:'filmstrip',label:'Медиа',svg:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16m10-16v16M3 8h4m-4 8h4m10-8h4m-4 8h4"/>'},
  {id:'search',label:'Поиск',svg:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'},
  {id:'clip',label:'Вложение',svg:'<path d="m8 12.5 6.5-6.5a3 3 0 0 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.5-8.5"/>'},
  {id:'cloud',label:'Облако',svg:'<path d="M7 18a5 5 0 1 1 .8-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8H7Z"/>'},
  {id:'stethoscope',label:'Медицина',svg:'<path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4m4 0h4m-6 9v2a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="11" r="2"/><path d="M10 17v1a3 3 0 0 0 6 0v-1"/>'},
  {id:'alert',label:'Предупреждение',svg:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>'}
];
const LEGACY_HABIT_ICONS={
  '💪':'dumbbell','🧠':'brain','📖':'book','🥗':'leaf','😴':'moon','🚫':'target',
  '🎯':'target','⚡':'bolt','✍️':'pen','🧘':'meditation','🚗':'car','💊':'capsule',
  '🏃':'run','🎨':'palette','🥊':'dumbbell','📱':'smartphone','💰':'wallet','🔑':'key'
};
function habitIconSvg(icon,className='habit-icon'){
  const item=HABIT_ICONS.find(x=>x.id===icon);
  return item?`<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${item.svg}</svg>`:'';
}
function uiIconSvg(icon,className='ui-icon'){return habitIconSvg(icon,className);}
function renderUiIcons(root=document){
  root.querySelectorAll('[data-ui-icon]').forEach(el=>{
    el.innerHTML=uiIconSvg(el.dataset.uiIcon);
    el.removeAttribute('data-ui-icon');
  });
}
function habitIconLabel(icon){
  return HABIT_ICONS.find(x=>x.id===icon)?.label||'';
}
function renderHabitIconPicker(targetId,mode,selected){
  const picker=document.getElementById(targetId);
  if(!picker)return;
  const none=`<button type="button" class="habit-icon-option${selected===''?' on':''}" aria-label="Без значка" aria-pressed="${selected==='' }" title="Без значка" onclick="selectHabitIcon('${mode}','')"><svg class="habit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m5 5 14 14M19 5 5 19"/></svg></button>`;
  picker.innerHTML=none+HABIT_ICONS.map(icon=>`<button type="button" class="habit-icon-option${icon.id===selected?' on':''}" aria-label="${icon.label}" aria-pressed="${icon.id===selected}" title="${icon.label}" onclick="selectHabitIcon('${mode}','${icon.id}')">${habitIconSvg(icon.id)}</button>`).join('');
}
function selectHabitIcon(mode,icon){
  if(mode==='edit')_habitEditIcon=icon;
  else selHabitIcon=icon;
  renderHabitIconPicker(mode==='edit'?'habitEditIconPicker':'epick',mode,icon);
}
function migrateHabitIcons(){
  let changed=false;
  habits.forEach(h=>{
    if(h.emoji){
      h.icon=h.icon||LEGACY_HABIT_ICONS[h.emoji]||'sparkles';
      delete h.emoji;
      changed=true;
    }
  });
  if(changed)LS.s('habits',habits);
}

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
  // Пересобрать карточку сегодня, чтобы обновить список
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
  habits.push({id:nid++,name,icon:selHabitIcon,desc});
  LS.s('habits',habits);LS.s('nid',nid);
  inp.value='';
  const di=document.getElementById('habitDescInp');if(di)di.value='';
  selHabitIcon='sparkles';
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
  const item=document.getElementById('hab-item-'+id);
  const main=item?.firstElementChild;
  const body=item?.querySelector('.habit-description');
  const chevron=main?.querySelector('[onclick^="toggleHabitExpand"]');
  animateCollapse(body,!habitExpanded[id],'block');
  if(main)main.style.borderRadius=habitExpanded[id]?'14px 14px 0 0':'14px';
  if(chevron)chevron.style.transform=habitExpanded[id]?'rotate(180deg)':'rotate(0deg)';
}

let _habitEditId=null;
let _habitEditIcon='';
function openHabitEdit(id){
  const h=habits.find(x=>x.id===id);if(!h)return;
  _habitEditId=id;
  _habitEditIcon=h.icon||LEGACY_HABIT_ICONS[h.emoji]||'';
  document.getElementById('habitEditInp').value=h.name;
  const descEl=document.getElementById('habitEditDescInp');
  if(descEl)descEl.value=h.desc||'';
  renderHabitIconPicker('habitEditIconPicker','edit',_habitEditIcon);
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
    h.icon=_habitEditIcon;
    delete h.emoji;
    const descEl=document.getElementById('habitEditDescInp');
    h.desc=descEl?descEl.value.trim():'';
  }
  LS.s('habits',habits);
  closeHabitEditModal();
  renderHabits();
  flash('Привычка обновлена');
}

function renderHabits(){
  migrateHabitIcons();
  renderUiIcons();
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
      ${h.icon?habitIconSvg(h.icon,'habit-list-icon'):''}
      <span style="flex:1;font-size:15px;color:var(--t)">${h.name}</span>
      ${hasDesc?`<div style="color:var(--t3);font-size:13px;padding:2px 5px;cursor:pointer;line-height:1;transform:rotate(${isExpanded?'180':'0'}deg);transition:.2s" onclick="toggleHabitExpand(${h.id},event)">▾</div>`:''}
      <button class="rt-edit" onclick="event.stopPropagation();openHabitEdit(${h.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
`;
    main.onclick=()=>toggleHabit(h.id);
    wrap.appendChild(main);

    // Раскрывающаяся панель с описанием
    if(hasDesc){
      const body=document.createElement('div');
      body.className='habit-description';
      body.style.cssText=`background:var(--c2);border:1px solid ${isDone?'rgba(45,212,191,0.18)':'var(--bd)'};border-top:none;border-radius:0 0 14px 14px;padding:10px 14px 12px`;
      if(!isExpanded)body.style.display='none';
      body.innerHTML=`<div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:5px">описание</div><div style="font-size:13px;color:var(--t2);line-height:1.6;white-space:pre-wrap">${h.desc}</div>`;
      wrap.appendChild(body);
    }

    list.appendChild(wrap);
  });

  renderHabitIconPicker('epick','add',selHabitIcon);
}

migrateHabitIcons();
