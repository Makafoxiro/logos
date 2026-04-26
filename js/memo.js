// ═══ MODULE: memo.js ═══
// ══ PIN / MEMO ══════════════════════════════════════════

function startPinChange(){
  const stored=LS.g('pin','');
  if(!stored){
    // No PIN yet - show set PIN modal directly
    _pinChangeStep='new';
    document.getElementById('pinChangeTitle').textContent='новый pin (6 цифр)';
    document.getElementById('pinChangeError').style.opacity='0';
    _pinChangeBuf='';
    _updatePinChangeDots();
    openModal('pinChangeModal');
    _buildPinChangeKeypad();
    return;
  }
  _pinChangeStep='old';
  document.getElementById('pinChangeTitle').textContent='текущий pin';
  document.getElementById('pinChangeError').style.opacity='0';
  _pinChangeBuf='';
  _updatePinChangeDots();
  openModal('pinChangeModal');
  _buildPinChangeKeypad();
}

let _pinChangeStep='old';
let _pinChangeBuf='';
function _updatePinChangeDots(){
  for(let i=0;i<6;i++){
    const d=document.getElementById('pcd'+i);
    if(d)d.style.background=i<_pinChangeBuf.length?'var(--a)':'transparent';
  }
}
function _buildPinChangeKeypad(){
  const kp=document.getElementById('pinChangeKeypad');
  if(!kp)return;
  kp.innerHTML='';
  [1,2,3,4,5,6,7,8,9,'','0','⌫'].forEach(k=>{
    const btn=document.createElement('div');
    btn.style.cssText='background:var(--c1);border:1px solid var(--bd);border-radius:9px;height:52px;display:flex;align-items:center;justify-content:center;font-size:20px;font-family:var(--mono);cursor:pointer;user-select:none';
    btn.textContent=k===''?'':k;
    if(k!=='')btn.onclick=()=>{
      const key=String(k);
      if(key==='⌫'){_pinChangeBuf=_pinChangeBuf.slice(0,-1);}
      else if(_pinChangeBuf.length<6){_pinChangeBuf+=key;}
      _updatePinChangeDots();
      if(_pinChangeBuf.length===6)setTimeout(_checkPinChange,100);
    };
    kp.appendChild(btn);
  });
}
function _checkPinChange(){
  const stored=LS.g('pin','');
  const err=document.getElementById('pinChangeError');
  if(_pinChangeStep==='old'){
    if(_pinChangeBuf===stored){
      _pinChangeStep='new';
      _pinChangeBuf='';
      _updatePinChangeDots();
      document.getElementById('pinChangeTitle').textContent='новый pin (6 цифр)';
      if(err)err.style.opacity='0';
    } else {
      if(err){err.style.opacity='1';setTimeout(()=>err.style.opacity='0',1000);}
      _pinChangeBuf='';_updatePinChangeDots();
    }
  } else {
    LS.s('pin',_pinChangeBuf);
    flash('PIN изменён ✓');
    closeModal('pinChangeModal');
  }
}
function closePinChangeModal(){closeModal('pinChangeModal');}


function buildInlinePin(){
  let pv='';
  const dots=document.getElementById('pinDots2');
  const keypad=document.getElementById('pinKeypad2');
  if(!dots||!keypad)return;
  dots.innerHTML=Array(6).fill(0).map((_,i)=>`<div id="ipd${i}" style="width:12px;height:12px;border-radius:50%;border:2px solid var(--t3);transition:.15s"></div>`).join('');
  [1,2,3,4,5,6,7,8,9,'','0','⌫'].forEach(k=>{
    const btn=document.createElement('div');
    btn.style.cssText='background:var(--c1);border:1px solid var(--bd);border-radius:9px;height:48px;display:flex;align-items:center;justify-content:center;font-size:18px;font-family:var(--mono);cursor:pointer';
    btn.textContent=k===''?'':k;
    if(k!=='')btn.onclick=()=>{
      if(k==='⌫'){pv=pv.slice(0,-1);}
      else if(pv.length<6){pv+=k;}
      for(let i=0;i<6;i++){const d=document.getElementById('ipd'+i);if(d)d.style.background=i<pv.length?'var(--a)':'transparent';}
      if(pv.length===6)setTimeout(()=>{
        const stored=LS.g('pin','');
        if(stored&&pv===stored){memoUnlocked=true;renderMemoBody();}
        else if(!stored){LS.s('pin',pv);flash('PIN установлен');memoUnlocked=true;renderMemoBody();}
        else{pv='';for(let i=0;i<6;i++){const d=document.getElementById('ipd'+i);if(d)d.style.background='transparent';}
          const e=document.getElementById('pinError2');if(e){e.style.opacity='1';setTimeout(()=>e.style.opacity='0',1000);}
        }
      },80);
    };
    keypad.appendChild(btn);
  });
}
function renderMemoTabs(){
  const tabs=[{k:'passwords',l:'ПАРОЛИ'},{k:'birthdays',l:'ДР'},{k:'homework',l:'ДЗ'},{k:'watchlist',l:'ВОТЧЛИСТ'},{k:'notes',l:'ЗАМЕТКИ'},{k:'patches',l:'ПАТЧИ'}];
  document.getElementById('memoTabs').innerHTML=tabs.map(t=>`<div class="memo-tab${t.k===curMemoTab?' on':''}" onclick="switchMemoTab('${t.k}')">${t.l}</div>`).join('');
}
function switchMemoTab(tab){if(tab!=='passwords')memoUnlocked=false;curMemoTab=tab;renderMemoTabs();renderMemoBody();}
function renderMemoBody(){
  const body=document.getElementById('memoBody');body.innerHTML='';
  if(curMemoTab==='passwords'){
    const div=document.createElement('div');
    if(!memoUnlocked){
      div.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px">
        <div style="font-family:var(--mono);font-size:10px;color:var(--t2);letter-spacing:2px">ВВЕДИТЕ PIN</div>
        <div id="pinDots2" style="display:flex;gap:10px"></div>
        <div id="pinError2" style="font-family:var(--mono);font-size:10px;color:var(--red);opacity:0;transition:opacity .2s">неверный pin</div>
        <div id="pinKeypad2" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:180px"></div>
      </div>`;
      body.appendChild(div);
      buildInlinePin();
      return;
    }
    div.innerHTML=`<div class="sh" style="padding-top:0">пароли / аккаунты <span class="sh-btn" onclick="openPwModal()">+ добавить</span></div>`+
      passwords.map(p=>`<div class="pw-item"><div class="pw-info"><div class="pw-name">${p.name}</div><div class="pw-login">${p.login}</div><div class="pw-pass">${p.pass}</div></div><div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0"><button class="bd-edit" onclick="openPwEditModal(${p.id})" title="Редактировать"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div></div>`).join('');
    body.appendChild(div);
  } else if(curMemoTab==='birthdays'){
    const div=document.createElement('div');
    const now=new Date();
    const sorted=[...birthdays].sort((a,b)=>daysToAnnual(a.date,now)-daysToAnnual(b.date,now));
    div.innerHTML=`<div class="sh" style="padding-top:0">дни рождения <span class="sh-btn" onclick="openBdModal()">+ добавить</span></div>`+
      sorted.map(b=>{
        const days=daysToAnnual(b.date,now);
        const near=days<=7,today=days===0;
        const gifts=b.gifts||[];
        const giftTags=gifts.map((g,i)=>`<div class="bd-gift-tag">🎁 ${g}<button class="bd-gift-del" onclick="delBdGift(${b.id},${i})">✕</button></div>`).join('');
        return `<div class="bd-item" id="bd-item-${b.id}">
          <div class="bd-row">
            <div class="bd-info"><div class="bd-name">${b.name}</div><div class="bd-date">${formatMonthDay(b.date)}</div></div>
            <div class="bd-days${near?' near':''}${today?' today':''}">${today?'сегодня':days===1?'завтра':days+'д.'}</div>
            <button class="bd-edit" onclick="openBdEditModal(${b.id})" title="Редактировать"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            
          </div>
          <div class="bd-gifts">
            <div class="bd-gifts-list">${giftTags}${!gifts.length?'<span style="font-size:11px;color:var(--t3);font-family:var(--mono)">идеи подарков...</span>':''}</div>
            <div style="display:flex;gap:5px;align-items:center">
              <input class="bd-gift-inp" id="giftInp-${b.id}" placeholder="+ идея подарка" onkeydown="if(event.key==='Enter')addBdGift(${b.id})">
              <button class="bd-gift-add" onclick="addBdGift(${b.id})">+</button>
            </div>
          </div>
        </div>`;
      }).join('');
    body.appendChild(div);
  } else if(curMemoTab==='homework'){
    const div=document.createElement('div');
    div.innerHTML=`<div class="sh" style="padding-top:0">домашние задания <span class="sh-btn" onclick="openHwModal()">+ добавить</span></div>`+
      homework.map(h=>`<div class="hw-item" id="hw-item-${h.id}"><div class="hw-info"><div class="hw-subj">${h.subj}</div><div class="hw-task">${h.task}</div>${h.date?`<div class="hw-date">${formatDate(h.date)}</div>`:''}</div><div style="display:flex;flex-direction:column;gap:4px"><button class="rt-edit" onclick="openHwEditModal(${h.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div></div>${h.photo?`<div style="margin:-4px 0 10px;padding:0 1px"><img src="${h.photo}" data-hwphoto="${h.id}" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);cursor:pointer;display:block" loading="lazy"></div>`:''}`)
      .join('');
    // click on photo thumbnail → open viewer
    div.addEventListener('click',e=>{
      const img=e.target.closest('[data-hwphoto]');
      if(!img)return;
      const hid=+img.dataset.hwphoto;
      const hw=homework.find(x=>x.id===hid);
      if(hw&&hw.photo)openHwPhotoModal(hw.photo);
    });
    body.appendChild(div);
  } else if(curMemoTab==='watchlist'){
    const div=document.createElement('div');
    const types=[{k:'film',l:'Фильмы'},{k:'series',l:'Сериалы'},{k:'anime',l:'Аниме'},{k:'cartoon',l:'Мультфильмы'},{k:'manga',l:'Манга / Манхва'},{k:'dorama',l:'Дорамы'}];
    const sLabel={want:'хочу посмотреть',watching:'смотрю',done:'посмотрел'};
    const sColor={want:'var(--t2)',watching:'var(--amber)',done:'var(--a)'};
    let html=`<div class="sh" style="padding-top:0">watchlist <span class="sh-btn" onclick="openWatchSearchModal()" style="margin-right:4px">🔍 поиск</span><span class="sh-btn" onclick="openWatchModal()">+ добавить</span></div>`;
    let hasAny=false;
    types.forEach(type=>{
      const items=watchlist.filter(w=>w.type===type.k);
      if(!items.length)return;
      hasAny=true;
      html+=`<div style="font-family:var(--mono);font-size:9px;color:var(--t2);letter-spacing:1.5px;text-transform:uppercase;padding:10px 0 7px">${type.l}</div>`;
      items.forEach(w=>{
        html+=`<div id="watch-item-${w.id}" style="background:var(--c1);border:1px solid var(--bd);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:7px">
          <div style="flex:1">
            <div style="font-size:14px;color:var(--t);font-weight:500">${w.name}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:3px">
              <span style="font-family:var(--mono);font-size:10px;color:${sColor[w.status]}">${sLabel[w.status]}</span>
              ${w.date?(()=>{const now2=new Date();const days2=daysToDeadline(w.date,now2);const dc=days2!==null&&days2<=7?getDeadlineColor(days2,'week'):'var(--t3)';return `<span style="font-family:var(--mono);font-size:10px;color:${dc}">${formatDate(w.date)}${days2!==null&&days2<=7?' · '+(days2===0?'сегодня':days2<0?'просрочено':days2+'д.'):''}` + '</span>'})():''}
            </div>
          </div>
          <select onchange="updateWatchStatus(${w.id},this.value)" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t);font-family:var(--mono);font-size:10px;padding:5px 8px;outline:none;cursor:pointer">
            <option value="want"${w.status==='want'?' selected':''}>хочу</option>
            <option value="watching"${w.status==='watching'?' selected':''}>смотрю</option>
            <option value="done"${w.status==='done'?' selected':''}>посмотрел</option>
          </select>
          <button onclick="openWatchEditModal(${w.id})" style="background:none;border:none;color:var(--t3);font-size:15px;cursor:pointer;padding:2px 5px;line-height:1;transition:.15s" onmouseover="this.style.color='var(--a)'" onmouseout="this.style.color='var(--t3)'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

        </div>`;
      });
    });
    if(!hasAny) html+=`<div style="font-size:13px;color:var(--t3);padding:8px 0">Список пуст</div>`;
    div.innerHTML=html;
    body.appendChild(div);
  } else if(curMemoTab==='notes'){
    const div=document.createElement('div');
    div.innerHTML=`<div class="sh" style="padding-top:0">заметки</div>`;
    notes.forEach(n=>{
      const isEditing=noteEditId===n.id;
      if(isEditing){
        div.innerHTML+=`<div class="note-item" style="border-color:var(--ab)"><textarea id="noteEditArea-${n.id}" style="width:100%;background:transparent;border:none;color:var(--t);font-family:var(--sans);font-size:13px;line-height:1.6;resize:none;outline:none;min-height:60px;white-space:pre-wrap;word-break:break-word">${n.text}</textarea><div class="btn-row"><button class="del-btn" onclick="delNote(${n.id});cancelNoteEdit()">УДАЛИТЬ</button><button class="add-btn" onclick="saveNoteEdit(${n.id})">СОХРАНИТЬ</button></div></div>`;
      } else {
        div.innerHTML+=`<div class="note-item"><div style="float:right;display:flex;gap:4px"><button class="rt-edit" onclick="startNoteEdit(${n.id})" title="Редактировать"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div><div class="note-text">${n.text}</div>${n.photo?`<img src="${n.photo}" style="margin-top:8px;width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);display:block">`:''}<div style="margin-top:6px"><label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--t3);cursor:pointer;font-family:var(--mono)"><input type="file" accept="image/*" style="display:none" onchange="attachNotePhoto(${n.id},this)">📎 ${n.photo?'заменить фото':'фото'}</label>${n.photo?`<button onclick="removeNotePhoto(${n.id})" style="background:none;border:none;color:var(--t3);font-size:11px;cursor:pointer;margin-left:8px;font-family:var(--mono)">✕ удалить</button>`:''}</div></div>`;
      }
    });
    div.innerHTML+=`<div style="display:flex;flex-direction:column;gap:7px;margin-top:7px"><textarea class="add-inp" id="noteInp" placeholder="Новая заметка..." style="resize:none;height:65px"></textarea><div id="noteNewPhotoPreview" style="display:none;position:relative"><img id="noteNewPhotoImg" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);display:block"><button onclick="clearNewNotePhoto()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);border:none;color:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">✕</button></div><div style="display:flex;gap:7px;align-items:center"><label id="notePhotoLabel" style="display:flex;align-items:center;gap:6px;background:var(--c2);border:1px solid var(--bd);border-radius:var(--rm);padding:9px 13px;font-size:13px;color:var(--t2);cursor:pointer;flex:1"><span>📷 Фото</span><input type="file" id="notePhotoInput" accept="image/*" style="display:none" onchange="onNewNotePhoto(this)"></label><button class="add-btn" onclick="addNote()">+ ДОБАВИТЬ</button></div></div>`;
    body.appendChild(div);
    if(noteEditId!==null){
      setTimeout(()=>{const ta=document.getElementById('noteEditArea-'+noteEditId);if(ta){ta.style.height=ta.scrollHeight+'px';ta.focus();ta.selectionStart=ta.value.length;}},30);
    }

  } else if(curMemoTab==='patches'){
    const div=document.createElement('div');
    const done=patches.filter(p=>p.done).length;
    div.innerHTML=`
      <div class="sh" style="padding-top:0">
        патчи · идеи для развития
        <span style="font-family:var(--mono);font-size:8px;color:var(--t3)">${done}/${patches.length} готово</span>
      </div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:12px;line-height:1.6;padding:8px 12px;background:var(--c2);border-radius:10px;border:1px solid var(--bd)">
        Список идей, фич и задач для будущих версий ЛОГОС.<br>Нажми на пункт — отметить как выполненный.
      </div>`;

    patches.forEach((p,i)=>{
      const isEditing=patchEditId===p.id;
      const num=String(i+1).padStart(2,'0');
      if(isEditing){
        div.innerHTML+=`
          <div style="background:var(--c1);border:1.5px solid var(--ab);border-radius:12px;padding:12px 14px;margin-bottom:8px">
            <div style="font-family:var(--mono);font-size:8px;color:var(--a);margin-bottom:6px">ПАТЧ #${num} · редактирование</div>
            <textarea id="patchEditArea-${p.id}" style="width:100%;background:var(--c2);border:1px solid var(--ab);border-radius:8px;color:var(--t);font-family:var(--sans);font-size:13px;line-height:1.6;resize:none;outline:none;min-height:60px;padding:8px 10px">${escHtml(p.text)}</textarea>
            <input type="date" id="patchEditDate-${p.id}" value="${p.date||''}" style="width:100%;margin-top:6px;background:var(--c2);border:1px solid var(--ab);border-radius:8px;color:var(--t);font-size:12px;padding:7px 10px;outline:none" title="Срок патча">
            <div class="btn-row">
              <button class="del-btn" onclick="delPatch(${p.id});cancelPatchEdit()">УДАЛИТЬ</button>
              <button class="add-btn" onclick="savePatchEdit(${p.id})">СОХРАНИТЬ</button>
            </div>
          </div>`;
      } else {
        const statusColor=p.done?'var(--a)':'var(--t3)';
        const statusBg=p.done?'var(--a2)':'var(--c2)';
        const statusBorder=p.done?'var(--ab)':'var(--bd)';
        div.innerHTML+=`
          <div id="patch-item-${p.id}" style="background:var(--c1);border:1px solid ${p.done?'rgba(45,212,191,0.2)':'var(--bd)'};border-radius:12px;padding:12px 14px;margin-bottom:8px;${p.done?'opacity:.65':''}">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;padding-top:1px">
                <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:.5px">#${num}</div>
                <div onclick="togglePatchDone(${p.id})" style="width:18px;height:18px;border-radius:5px;border:1.5px solid ${statusColor};background:${p.done?'var(--a)':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s;flex-shrink:0">
                  ${p.done?'<span style="color:#000;font-size:11px;font-weight:700">✓</span>':''}
                </div>
              </div>
              <div style="flex:1;font-size:13px;color:${p.done?'var(--t2)':'var(--t)'};line-height:1.6;${p.done?'text-decoration:line-through':''}">${escHtml(p.text)}</div>${p.date&&!p.done?(()=>{const now3=new Date();const d3=daysToDeadline(p.date,now3);const dc3=d3!==null&&d3<=7?getDeadlineColor(d3,'week'):'var(--t3)';return `<div style="margin-top:4px;font-family:var(--mono);font-size:10px;color:${dc3}">${formatDate(p.date)}${d3!==null&&d3<=7?' · '+(d3===0?'сегодня':d3<0?'просрочено':d3+'д.'):''}` + '</div>';})():''}
              <button class="rt-edit" onclick="startPatchEdit(${p.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            </div>
          </div>`;
      }
    });

    div.innerHTML+=`
      <div style="margin-top:4px">
        <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">добавить патч</div>
        <div style="display:flex;gap:7px;align-items:flex-start">
          <div style="flex:1;display:flex;flex-direction:column;gap:6px"><textarea class="add-inp" id="patchInp" placeholder="Описание фичи или идеи..." style="resize:none;height:60px" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();addPatch()}"></textarea><input class="add-inp" type="date" id="patchDate" style="font-size:12px;padding:7px 10px" title="Срок (необязательно)"></div>
          <button class="add-btn" onclick="addPatch()" style="align-self:flex-end">+</button>
        </div>
      </div>`;

    body.appendChild(div);
    if(patchEditId!==null){
      setTimeout(()=>{const ta=document.getElementById('patchEditArea-'+patchEditId);if(ta){ta.style.height=ta.scrollHeight+'px';ta.focus();ta.selectionStart=ta.value.length;}},30);
    }
  }
}
// PW
function openPwModal(){document.getElementById('pwName').value='';document.getElementById('pwLogin').value='';document.getElementById('pwPass').value='';openModal('pwModal');}
function closePwModal(){closeModal('pwModal');}
function confirmAddPw(){const n=document.getElementById('pwName').value.trim();if(!n)return;passwords.push({id:nid++,name:n,login:document.getElementById('pwLogin').value.trim(),pass:document.getElementById('pwPass').value.trim()});LS.s('passwords',passwords);LS.s('nid',nid);closePwModal();renderMemoBody();}
function delPw(id) { deleteItem(passwords, 'passwords', id, renderMemoBody); }
let pwEditId=null;
function openPwEditModal(id){const p=passwords.find(x=>x.id===id);if(!p)return;pwEditId=id;document.getElementById('pwEditName').value=p.name;document.getElementById('pwEditLogin').value=p.login;document.getElementById('pwEditPass').value=p.pass;openModal('pwEditModal');}
function closePwEditModal(){closeModal('pwEditModal');pwEditId=null;}
function confirmEditPw(){if(!pwEditId)return;const n=document.getElementById('pwEditName').value.trim();if(!n)return;const p=passwords.find(x=>x.id===pwEditId);if(!p)return;p.name=n;p.login=document.getElementById('pwEditLogin').value.trim();p.pass=document.getElementById('pwEditPass').value.trim();LS.s('passwords',passwords);closePwEditModal();renderMemoBody();}
// BD
function openBdModal(){document.getElementById('bdName').value='';document.getElementById('bdDate').value='';openModal('bdModal');}
function closeBdModal(){closeModal('bdModal');}
function confirmAddBd(){const n=document.getElementById('bdName').value.trim(),d=document.getElementById('bdDate').value;if(!n||!d)return;birthdays.push({id:nid++,name:n,date:d});LS.s('birthdays',birthdays);LS.s('nid',nid);closeBdModal();renderMemoBody();}
function delBd(id) { deleteItem(birthdays, 'birthdays', id, renderMemoBody); }
let bdEditId=null;
function openBdEditModal(id){const b=birthdays.find(x=>x.id===id);if(!b)return;bdEditId=id;document.getElementById('bdEditName').value=b.name;document.getElementById('bdEditDate').value=b.date;openModal('bdEditModal');}
function closeBdEditModal(){closeModal('bdEditModal');bdEditId=null;}
function confirmEditBd(){const n=document.getElementById('bdEditName').value.trim(),d=document.getElementById('bdEditDate').value;if(!n||!d||!bdEditId)return;const b=birthdays.find(x=>x.id===bdEditId);if(b){b.name=n;b.date=d;}LS.s('birthdays',birthdays);closeBdEditModal();renderMemoBody();}
function addBdGift(id){const inp=document.getElementById('giftInp-'+id);if(!inp)return;const val=inp.value.trim();if(!val)return;const b=birthdays.find(x=>x.id===id);if(!b)return;if(!b.gifts)b.gifts=[];b.gifts.push(val);inp.value='';LS.s('birthdays',birthdays);renderMemoBody();}
function delBdGift(id,idx){const b=birthdays.find(x=>x.id===id);if(!b||!b.gifts)return;b.gifts.splice(idx,1);LS.s('birthdays',birthdays);renderMemoBody();}
// HW
let _hwPhotoData = null; // base64 for new hw
let _hwEditPhotoData = null; // base64 for edit hw

function previewHwPhoto(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    _hwPhotoData=e.target.result;
    document.getElementById('hwPhotoImg').src=_hwPhotoData;
    document.getElementById('hwPhotoPreview').style.display='block';
  };
  reader.readAsDataURL(file);
}
function clearHwPhoto(){
  _hwPhotoData=null;
  document.getElementById('hwPhotoPreview').style.display='none';
  document.getElementById('hwPhotoInput').value='';
}
function previewHwEditPhoto(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    _hwEditPhotoData=e.target.result;
    document.getElementById('hwEditPhotoImg').src=_hwEditPhotoData;
    document.getElementById('hwEditPhotoPreview').style.display='block';
  };
  reader.readAsDataURL(file);
}
function clearHwEditPhoto(){
  _hwEditPhotoData=null;
  document.getElementById('hwEditPhotoPreview').style.display='none';
  document.getElementById('hwEditPhotoInput').value='';
}
function openHwPhotoModal(src){
  document.getElementById('hwPhotoModalImg').src=src;
  openModal('hwPhotoModal');
}

function openHwModal(){
  document.getElementById('hwSubj').value='';
  document.getElementById('hwTask').value='';
  document.getElementById('hwDate').value='';
  _hwPhotoData=null;
  document.getElementById('hwPhotoPreview').style.display='none';
  document.getElementById('hwPhotoInput').value='';
  openModal('hwModal');
}
function closeHwModal(){closeModal('hwModal');}
function confirmAddHw(){
  const s=document.getElementById('hwSubj').value.trim(),t=document.getElementById('hwTask').value.trim();
  if(!s)return;
  homework.push({id:nid++,subj:s,task:t,date:document.getElementById('hwDate').value,photo:_hwPhotoData||null});
  LS.s('homework',homework);LS.s('nid',nid);
  _hwPhotoData=null;
  closeHwModal();renderMemoBody();
}
function delHw(id) { deleteItem(homework, 'homework', id, renderMemoBody); }
// NOTES
let noteEditId=null;
let _newNotePhoto=null;
function onNewNotePhoto(input){
  const f=input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    _newNotePhoto=e.target.result;
    const prev=document.getElementById('noteNewPhotoPreview');
    const img=document.getElementById('noteNewPhotoImg');
    const lbl=document.getElementById('notePhotoLabel');
    if(prev)prev.style.display='block';
    if(img)img.src=_newNotePhoto;
    if(lbl){const sp=lbl.querySelector('span');if(sp)sp.textContent='📷 Заменить';}
  };
  r.readAsDataURL(f);
}
function clearNewNotePhoto(){
  _newNotePhoto=null;
  const prev=document.getElementById('noteNewPhotoPreview');
  const inp=document.getElementById('notePhotoInput');
  if(prev)prev.style.display='none';
  if(inp)inp.value='';
}
function addNote(){
  const inp=document.getElementById('noteInp');
  const text=inp.value.trim();if(!text)return;
  notes.push({id:nid++,text,photo:_newNotePhoto||null});
  LS.s('notes',notes);LS.s('nid',nid);
  inp.value='';
  _newNotePhoto=null;
  renderMemoBody();
}
function delNote(id) { deleteItem(notes, 'notes', id, renderMemoBody); }
function attachNotePhoto(id,input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{const n=notes.find(x=>x.id===id);if(n){n.photo=e.target.result;LS.s('notes',notes);renderMemoBody();}};r.readAsDataURL(f);}
function removeNotePhoto(id){const n=notes.find(x=>x.id===id);if(n){n.photo=null;LS.s('notes',notes);renderMemoBody();}}
function startNoteEdit(id){noteEditId=id;renderMemoBody();}
function cancelNoteEdit(){noteEditId=null;renderMemoBody();}
function saveNoteEdit(id){const ta=document.getElementById('noteEditArea-'+id);if(!ta)return;const val=ta.value.trim();if(!val){cancelNoteEdit();return;}const n=notes.find(x=>x.id===id);if(n)n.text=val;LS.s('notes',notes);noteEditId=null;renderMemoBody();}

// ── PATCHES ─────────────────────────────────────────────
let patchEditId=null;
function addPatch(){
  const inp=document.getElementById('patchInp');
  const text=inp.value.trim();if(!text)return;
  const dateInp=document.getElementById('patchDate');
  patches.push({id:nid++,text,done:false,date:dateInp?dateInp.value||null:null});
  LS.s('patches',patches);LS.s('nid',nid);
  inp.value='';if(dateInp)dateInp.value='';renderMemoBody();
}
function delPatch(id) { deleteItem(patches, 'patches', id, renderMemoBody); }
function togglePatchDone(id){
  const p=patches.find(x=>x.id===id);
  if(p)p.done=!p.done;
  LS.s('patches',patches);renderMemoBody();
}
function startPatchEdit(id){patchEditId=id;renderMemoBody();}
function cancelPatchEdit(){patchEditId=null;renderMemoBody();}
function savePatchEdit(id){
  const ta=document.getElementById('patchEditArea-'+id);if(!ta)return;
  const val=ta.value.trim();if(!val){cancelPatchEdit();return;}
  const dateEl=document.getElementById('patchEditDate-'+id);
  const p=patches.find(x=>x.id===id);
  if(p){p.text=val;if(dateEl)p.date=dateEl.value||null;}
  LS.s('patches',patches);patchEditId=null;renderMemoBody();
}

