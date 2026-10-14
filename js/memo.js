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
    (async()=>{
      const newKey=await _deriveCryptoKey(_pinChangeBuf);
      for(let i=0;i<passwords.length;i++){const pd=memoPwDecrypted.find(x=>x.id===passwords[i].id);if(pd){passwords[i].pass=await _encryptPass(newKey,pd.pass);}}
      if(passwords.length)LS.s('passwords',passwords);
      memoCryptoKey=newKey;
      LS.s('pin',_pinChangeBuf);
      flash('PIN изменён ✓');
      closeModal('pinChangeModal');
    })();
  }
}
function closePinChangeModal(){closeModal('pinChangeModal');}

// ── CRYPTO (AES-GCM + PBKDF2) ──────────────────────────
async function _getCryptoSalt(){
  let s=LS.g('cryptoSalt',null);
  if(!s){s=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('');LS.s('cryptoSalt',s);}
  return Uint8Array.from(s.match(/.{2}/g),h=>parseInt(h,16));
}
async function _deriveCryptoKey(pin){
  const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:await _getCryptoSalt(),iterations:100000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function _encryptPass(key,text){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text));
  const buf=new Uint8Array(12+ct.byteLength);buf.set(iv);buf.set(new Uint8Array(ct),12);
  return 'enc:'+btoa(String.fromCharCode(...buf));
}
async function _decryptPass(key,val){
  if(!val||!val.startsWith('enc:'))return val;
  try{
    const buf=Uint8Array.from(atob(val.slice(4)),c=>c.charCodeAt(0));
    const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:buf.slice(0,12)},key,buf.slice(12));
    return new TextDecoder().decode(pt);
  }catch{return '???';}
}
// ───────────────────────────────────────────────────────


function renderMemoTabs(){
  const tabs=[{k:'birthdays',l:'ДР'},{k:'homework',l:'ДЗ'},{k:'watchlist',l:'ВОТЧЛИСТ'},{k:'notes',l:'ЗАМЕТКИ'}];
  document.getElementById('memoTabs').innerHTML=tabs.map(t=>`<div class="memo-tab${t.k===curMemoTab?' on':''}" onclick="switchMemoTab('${t.k}')">${t.l}</div>`).join('');
}
function switchMemoTab(tab){curMemoTab=tab;renderMemoTabs();renderMemoBody();}
function renderMemoBody(){
  const body=document.getElementById('memoBody');body.innerHTML='';
  if(curMemoTab==='birthdays'){
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
            <div class="bd-info"><div class="bd-name">${b.name}</div><div class="bd-date">${displayDate(b.date,{noYear:true})}</div></div>
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
      homework.map(h=>`<div class="hw-item" id="hw-item-${h.id}"><div class="hw-info"><div class="hw-subj">${h.subj}</div><div class="hw-task">${h.task}</div>${h.date?`<div class="hw-date">${displayDate(h.date)}</div>`:''}</div><div style="display:flex;flex-direction:column;gap:4px"><button class="rt-edit" onclick="openHwEditModal(${h.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div></div>${h.photo?`<div style="margin:-4px 0 10px;padding:0 1px"><img src="${h.photo}" data-hwphoto="${h.id}" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);cursor:pointer;display:block" loading="lazy"></div>`:''}`)
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
              ${w.date?(()=>{const now2=new Date();const days2=daysToDeadline(w.date,now2);const dc=days2!==null&&days2<=7?getDeadlineColor(days2,'week'):'var(--t3)';return `<span style="font-family:var(--mono);font-size:10px;color:${dc}">${displayDate(w.date)}${days2!==null&&days2<=7?' · '+(days2===0?'сегодня':days2<0?'просрочено':days2+'д.'):''}` + '</span>'})():''}
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
  }
}
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
