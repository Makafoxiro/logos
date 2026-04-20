// ═══ MODULE: goals.js ═══
// ══ DAY TASKS (Goals page) ══════════════════════════════

function addGoalInline(){
  const name=document.getElementById('goalNameInl').value.trim();
  if(!name)return;
  goals.push({id:nid++,name,note:document.getElementById('goalNoteInl').value.trim(),deadline:document.getElementById('goalDlInl').value});
  LS.s('goals',goals);LS.s('nid',nid);
  document.getElementById('goalNameInl').value='';
  document.getElementById('goalNoteInl').value='';
  document.getElementById('goalDlInl').value='';
  renderGoals();
}
// ══ GOALS ══════════════════════════════════════════════
function closeGoalModal(){closeModal('goalModal');}
function confirmAddGoal(){
  const name=document.getElementById('goalName').value.trim();if(!name)return;
  goals.push({id:nid++,name,note:document.getElementById('goalNote').value.trim(),deadline:document.getElementById('goalDeadline').value});
  LS.s('goals',goals);LS.s('nid',nid);closeGoalModal();renderGoals();
}
function delGoal(id) { deleteItem(goals, 'goals', id, renderGoals); }
function toggleGoalDone(id){
  const g=goals.find(x=>x.id===id);if(!g)return;
  const row=document.getElementById('goal-item-'+id);
  const chk=document.getElementById('goal-chk-'+id);
  // animate
  if(row){row.style.transform='scale(0.98)';row.style.opacity='0.6';setTimeout(()=>{row.style.transform='';row.style.opacity='';},120);}
  g.done=!g.done;
  LS.s('goals',goals);
  setTimeout(()=>renderGoals(),130);
}
let _goalEditId=null;
function openGoalItemEdit(id){
  const g=goals.find(x=>x.id===id);if(!g)return;
  _goalEditId=id;
  document.getElementById('goalItemEditName').value=g.name;
  document.getElementById('goalItemEditNote').value=g.note||'';
  document.getElementById('goalItemEditDl').value=g.deadline||'';
  openModal('goalItemEditModal');
  setTimeout(()=>document.getElementById('goalItemEditName').focus(),100);
}
function closeGoalItemEditModal(){closeModal('goalItemEditModal');_goalEditId=null;}
function saveGoalItemEdit(){
  const name=document.getElementById('goalItemEditName').value.trim();
  if(!name||_goalEditId===null){closeGoalItemEditModal();return;}
  const g=goals.find(x=>x.id===_goalEditId);
  if(g){g.name=name;g.note=document.getElementById('goalItemEditNote').value.trim();g.deadline=document.getElementById('goalItemEditDl').value;}
  LS.s('goals',goals);
  closeGoalItemEditModal();
  renderGoals();
  flash('Цель обновлена');
}
function renderGoals(){
  renderNotificationsPanel();
  renderFreeGoals();
  const now=new Date();
  const gl=document.getElementById('goalsList');
  // Sort: no-deadline first, then by deadline ascending
  const withDl=goals.filter(g=>g.deadline).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  const noDl=goals.filter(g=>!g.deadline);
  function goalHtml(g){
    let dlHtml='';
    if(g.deadline){
      const days=daysToDeadline(g.deadline,now);
      let dlColor='var(--amber)';
      let dlLabel=formatDate(g.deadline);
      if(days!==null){
        if(days<0){dlColor='var(--red)';dlLabel=`${formatDate(g.deadline)} → просрочено`;}
        else if(days===0){dlColor='var(--red)';dlLabel='→ сегодня!';}
        else if(days<=30){dlColor='var(--amber)';dlLabel=`${formatDate(g.deadline)} → ${days}д.`;}
        else{
          const yrs=Math.floor(days/365);
          const mths=Math.floor((days%365)/30);
          dlColor='var(--a)';
          dlLabel=`${formatDate(g.deadline)} → ${yrs>0?yrs+'г. ':''}${mths>0&&yrs<5?mths+'м.':''}`.trim();
        }
      }
      dlHtml=`<div style="font-family:var(--mono);font-size:10px;color:${dlColor};margin-top:4px;padding:2px 8px;background:rgba(251,191,36,0.08);border:1px solid ${dlColor}33;border-radius:10px;display:inline-block">${dlLabel}</div>`;
    }
    return `<div class="rt-item${g.done?' done':''}" id="goal-item-${g.id}" style="align-items:flex-start;padding:10px 0;cursor:pointer;transition:opacity .2s${g.done?';opacity:0.45':''}" onclick="toggleGoalDone(${g.id})">
      <div id="goal-chk-${g.id}" style="width:18px;height:18px;border-radius:5px;border:1.5px solid ${g.done?'var(--a)':'var(--t3)'};background:${g.done?'var(--a)':'transparent'};flex-shrink:0;margin-top:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;transition:.15s">${g.done?'✓':''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:500${g.done?';text-decoration:line-through;color:var(--t2)':''}">${g.name}</div>
        ${g.note?`<div style="font-size:12px;color:var(--t2);margin-top:2px;line-height:1.4">${g.note}</div>`:''}
        ${dlHtml}
      </div>
      <button class="rt-edit" onclick="event.stopPropagation();openGoalItemEdit(${g.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
    </div>`;
  }
  let html='';
  if(noDl.length){html+=noDl.map(goalHtml).join('');}
  if(noDl.length&&withDl.length){html+=`<div style="border-top:1px solid var(--bd);margin:8px 0 4px;opacity:0.4"></div>`;}
  if(withDl.length){html+=withDl.map(goalHtml).join('');}
  gl.innerHTML=html||'';
}


// ══ FREE GOALS ══════════════════════════════════════════
let _freeGoalPhotoData=null;
function onFreeGoalPhoto(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    _freeGoalPhotoData=e.target.result;
    const prev=document.getElementById('freeGoalPhotoPreview');
    const img=document.getElementById('freeGoalPhotoImg');
    if(prev&&img){prev.style.display='block';img.src=_freeGoalPhotoData;}
  };
  reader.readAsDataURL(file);
}
function clearFreeGoalPhoto(){
  _freeGoalPhotoData=null;
  const prev=document.getElementById('freeGoalPhotoPreview');
  if(prev)prev.style.display='none';
  const inp=document.getElementById('freeGoalPhotoInput');
  if(inp)inp.value='';
}
function addFreeGoal(){
  const text=document.getElementById('freeGoalTextInp')?.value.trim();
  if(!text)return;
  freeGoals.push({id:nid++,text,photo:_freeGoalPhotoData||null,created:nowDK()});
  LS.s('freeGoals',freeGoals);LS.s('nid',nid);
  document.getElementById('freeGoalTextInp').value='';
  clearFreeGoalPhoto();
  renderFreeGoals();
  flash('Цель добавлена');
}
function delFreeGoal(id) { deleteItem(freeGoals, 'freeGoals', id, renderFreeGoals); }
let _freeGoalEditId=null;
function openFreeGoalEdit(id){
  const g=freeGoals.find(x=>x.id===id);if(!g)return;
  _freeGoalEditId=id;
  document.getElementById('freeGoalEditText').value=g.text;
  openModal('freeGoalEditModal');
  setTimeout(()=>document.getElementById('freeGoalEditText').focus(),80);
}
function closeFreeGoalEditModal(){closeModal('freeGoalEditModal');_freeGoalEditId=null;}
function saveFreeGoalEdit(){
  const text=document.getElementById('freeGoalEditText').value.trim();
  if(!text||_freeGoalEditId===null){closeFreeGoalEditModal();return;}
  const g=freeGoals.find(x=>x.id===_freeGoalEditId);
  if(g){g.text=text;}
  LS.s('freeGoals',freeGoals);renderFreeGoals();closeFreeGoalEditModal();
}
function openFreeGoalPhoto(src){
  const modal=document.getElementById('hwPhotoModal');
  const img=document.getElementById('hwPhotoModalImg');
  if(modal&&img){img.src=src;modal.classList.add('show');}
}
function toggleFreeGoalDone(id){
  const g=freeGoals.find(x=>x.id===id);if(!g)return;
  const row=document.getElementById('free-goal-item-'+id);
  if(row){row.style.transform='scale(0.98)';row.style.opacity='0.6';setTimeout(()=>{row.style.transform='';row.style.opacity='';},120);}
  g.done=!g.done;
  LS.s('freeGoals',freeGoals);
  setTimeout(()=>renderFreeGoals(),130);
}
function renderFreeGoals(){
  const list=document.getElementById('freeGoalsList');
  if(!list)return;
  if(!freeGoals.length){
    list.innerHTML='<div style="font-size:12px;color:var(--t3);font-family:var(--mono);padding:10px 0">пусто — добавь свои цели</div>';
    return;
  }
  list.innerHTML=freeGoals.map(g=>`
    <div class="rt-item${g.done?' done':''}" id="free-goal-item-${g.id}" style="align-items:flex-start;padding:10px 0;cursor:pointer;transition:opacity .2s${g.done?';opacity:0.45':''}" onclick="toggleFreeGoalDone(${g.id})">
      <div id="free-goal-chk-${g.id}" style="width:18px;height:18px;border-radius:5px;border:1.5px solid ${g.done?'var(--a)':'var(--t3)'};background:${g.done?'var(--a)':'transparent'};flex-shrink:0;margin-top:3px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#000;transition:.15s">${g.done?'✓':''}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:500;line-height:1.5;word-break:break-word${g.done?';text-decoration:line-through;color:var(--t2)':''}">${g.text}</div>
        ${g.photo?`<div style="margin-top:8px;cursor:pointer" onclick="event.stopPropagation();openFreeGoalPhoto('${g.photo}')"><img src="${g.photo}" style="width:100%;max-height:200px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);display:block" loading="lazy"></div>`:''}
      </div>
      <button class="rt-edit" onclick="event.stopPropagation();openFreeGoalEdit(${g.id})" style="flex-shrink:0"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
    </div>`).join('');
}

function delAnnual(id) { deleteItem(annuals, 'annuals', id, renderRoutine); }

function annualMarkDone(id){
  const a=annuals.find(x=>x.id===id);if(!a||!a.period)return;
  // Compute current next date (what we're marking as done)
  function _calcNext(lastDate,period){
    const d=parseLocalDate(lastDate);if(!d)return null;
    let next=new Date(d);
    if(period==='3m'){next.setMonth(next.getMonth()+3);}
    else if(period==='6m'){next.setMonth(next.getMonth()+6);}
    else{const y=parseInt(period);if(y&&!isNaN(y))next.setFullYear(next.getFullYear()+y);}
    return next;
  }
  function _dateToStr(d){if(!d)return'';return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  // Today becomes the new "last date"
  const today=new Date();
  a.lastDate=_dateToStr(today);
  // Clear manual date (will be computed from lastDate now)
  a.date='';
  LS.s('annuals',annuals);
  renderRoutine();
  flash(`✓ Отмечено! Следующий раз: ${(()=>{const n=_calcNext(a.lastDate,a.period);return n?n.toLocaleDateString('ru-RU'):''})()}`);
}

let _annualEditId=null;
function openAnnualEditModal(id){
  const a=annuals.find(x=>x.id===id);if(!a)return;
  _annualEditId=id;
  document.getElementById('annualEditName').value=a.name||'';
  document.getElementById('annualEditLastDate').value=a.lastDate||'';
  document.getElementById('annualEditDate').value=a.date||'';
  const periodSel=document.getElementById('annualEditPeriod');
  Array.from(periodSel.options).forEach(o=>o.selected=(o.value===(a.period||'')));
  openModal('annualEditModal');
  setTimeout(()=>document.getElementById('annualEditName').focus(),100);
}
function closeAnnualEditModal(){closeModal('annualEditModal');_annualEditId=null;}
function confirmAnnualEdit(){
  const name=document.getElementById('annualEditName').value.trim();
  if(!name){closeAnnualEditModal();return;}
  const a=annuals.find(x=>x.id===_annualEditId);if(!a){closeAnnualEditModal();return;}
  a.name=name;
  a.lastDate=document.getElementById('annualEditLastDate').value||'';
  a.date=document.getElementById('annualEditDate').value||'';
  a.period=document.getElementById('annualEditPeriod').value||'';
  LS.s('annuals',annuals);
  closeAnnualEditModal();
  renderRoutine();
}
function confirmRtAnnualAdd(){
  const name=document.getElementById('rtAnnNameInp')?.value.trim();
  if(!name)return;
  const lastDate=document.getElementById('rtAnnLastInp')?.value||'';
  const date=document.getElementById('rtAnnDateInp')?.value||'';
  const period=document.getElementById('rtAnnPeriodSel')?.value||'';
  annuals.push({id:nid++,name,date,period,lastDate});LS.s('annuals',annuals);LS.s('nid',nid);
  // Clear inputs
  ['rtAnnNameInp','rtAnnLastInp','rtAnnDateInp'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const ps=document.getElementById('rtAnnPeriodSel');if(ps)ps.selectedIndex=0;
  renderRoutine();
  renderGoals();
  flash('Напоминание добавлено');
}

