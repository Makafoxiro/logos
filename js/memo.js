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
  const tabs=[{k:'birthdays',l:'СВЯЗИ'},{k:'study',l:'УЧЕБА'},{k:'homework',l:'ДЗ'},{k:'watchlist',l:'ВОТЧЛИСТ'},{k:'notes',l:'ЗАМЕТКИ'}];
  document.getElementById('memoTabs').innerHTML=tabs.map(t=>`<div class="memo-tab${t.k===curMemoTab?' on':''}" onclick="switchMemoTab('${t.k}')">${t.l}</div>`).join('');
}
function switchMemoTab(tab){curMemoTab=tab;renderMemoTabs();renderMemoBody();}

function eduTimeMinutes(value){
  const match=String(value||'').match(/(\d{1,2}):(\d{2})/);
  if(!match)return Infinity;
  const hours=Number(match[1]),minutes=Number(match[2]);
  return hours<24&&minutes<60?hours*60+minutes:Infinity;
}
function eduCompareTime(a,b){return eduTimeMinutes(a)-eduTimeMinutes(b);}

let _hwExpand={};
function toggleHwExpand(id){_hwExpand[id]=!_hwExpand[id];renderMemoBody();}const _edS='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
function renderMemoBody(){
  const body=document.getElementById('memoBody');body.innerHTML='';
  if(curMemoTab==='birthdays'){
    const div=document.createElement('div');
    const now=new Date();
    const sorted=[...birthdays].sort((a,b)=>daysToAnnual(a.date,now)-daysToAnnual(b.date,now));
    div.innerHTML=`<div class="sh" style="padding-top:0">связи <span class="sh-btn" onclick="openBdModal()">+ добавить</span></div>`+
      sorted.map(b=>{
        const days=b.date?daysToAnnual(b.date,now):9999;
        const near=days<=7,today=days===0;
        const gifts=b.gifts||[];
        const giftTags=gifts.map((g,i)=>`<div class="bd-gift-tag">${uiIconSvg('gift')} ${g}<button class="bd-gift-del" onclick="delBdGift(${b.id},${i})">✕</button></div>`).join('');
        const open=_bdOpen[b.id]?' open':'';
        const daysBadge=b.date?`<div class="bd-days${near?' near':''}${today?' today':''}">${today?'сегодня':days===1?'завтра':days+'д.'}</div>`:'';
        const _row=(lbl,val)=>val?`<div class="bd-field"><span class="bd-field-l">${lbl}</span><span class="bd-field-v">${val}</span></div>`:'';
        const details=[
          _row('связь',b.rel||''),
          b.phone?_row('телефон',`<a href="tel:${b.phone}" style="color:var(--a);text-decoration:none">${b.phone}</a>`):'',
          b.date?_row('день рождения',displayDate(b.date)):'',
          b.note?_row('заметка',b.note.replace(/\n/g,'<br>')):''
        ].join('');
        return `<div class="bd-item" id="bd-item-${b.id}">
          <div class="bd-row" onclick="toggleBdExpand(${b.id})">
            <div class="bd-chev${open}">▸</div>
            <div class="bd-info"><div class="bd-name">${b.name}</div></div>
            ${daysBadge}
            <button class="bd-edit" onclick="event.stopPropagation();openBdEditModal(${b.id})" title="Изменить"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          </div>
          <div class="bd-details${open}" style="display:${open?'flex':'none'}">
            ${details||'<div class="bd-empty">нет дополнительных данных</div>'}
            <div class="bd-gifts">
              <div class="bd-gifts-list">${giftTags}${!gifts.length?'<span style="font-size:11px;color:var(--t3);font-family:var(--mono)">идеи подарков...</span>':''}</div>
              <div style="display:flex;gap:5px;align-items:center">
                <input class="bd-gift-inp" id="giftInp-${b.id}" placeholder="+ идея подарка" onkeydown="if(event.key==='Enter')addBdGift(${b.id})">
                <button class="bd-gift-add" onclick="addBdGift(${b.id})">+</button>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');
    body.appendChild(div);
  } else if(curMemoTab==='study'){
    const div=document.createElement('div');
    const wkNum=_eduWeekNum();
    const parity=eduCurrentParity();
    const pLbl={num:'числитель',den:'знаменатель'};
    const visPairs=eduSchedule.filter(p=>!p.parity||p.parity==='both'||p.parity===parity);
    let html='';
    // индекс сегодняшнего дня нужен для метки «сегодня» в расписании по дням
    const tIdx=eduTodayIdx();
    // ── паритет недели (фильтр пар) ──
    html+=`<div class="edu-subs" style="margin-bottom:2px">
      <div class="edu-subs-top">
        <div class="edu-week">неделя ${wkNum} · <span class="edu-week-p">${pLbl[parity]}</span></div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="wchip${parity==='num'?' active':''}" title="эта неделя — числитель; следующая неделя автоматически станет знаменателем" onclick="setEduParity('num')">числитель</button>
          <button class="wchip${parity==='den'?' active':''}" title="эта неделя — знаменатель; следующая неделя автоматически станет числителем" onclick="setEduParity('den')">знаменатель</button>
        </div>
      </div>
    </div>`;
    // ── РАСПИСАНИЕ ПАР ──
    html+=`<div class="sh">расписание пар <span class="sh-btn" onclick="openEduPairModal()">+ добавить</span></div>`;
    if(!visPairs.length){
      html+=`<div class="edu-empty">${eduSchedule.length?'на эту неделю пар нет':'пар нет — добавь первую'}</div>`;
    } else {
      for(let d=0;d<7;d++){
        const dayPairs=visPairs.filter(p=>+p.day===d).sort((a,b)=>eduCompareTime(a.time,b.time));
        if(!dayPairs.length)continue;
        html+=`<div class="edu-day-h">${DAYS7[d]}${d===tIdx?'<span class="edu-today-tag">сегодня</span>':''}</div>`;
        dayPairs.forEach(p=>{html+=eduPairRow(p);});
      }
    }
    // ── ПОЛЕЗНЫЕ ССЫЛКИ ──
    html+=`<div class="sh">полезные ссылки <span class="sh-btn" onclick="openEduLinkModal()">+ добавить</span></div>`;
    if(!eduLinks.length)html+=`<div class="edu-empty">ссылок нет</div>`;
    else eduLinks.forEach(l=>{
      html+=`<div class="edu-link">
        <a class="edu-link-a" href="${l.url}" target="_blank" rel="noopener">${l.title}</a>
        <button class="bd-edit" onclick="event.stopPropagation();openEduLinkModal(${l.id})" title="Изменить">${_edS}</button>
      </div>`;
    });
    div.innerHTML=html;
    // click on photo thumbnail → open viewer
    div.addEventListener('click',e=>{
      const img=e.target.closest('[data-hwphoto]');
      if(!img)return;
      const hid=+img.dataset.hwphoto;
      const hw=homework.find(x=>x.id===hid);
      if(hw&&hw.photo)openHwPhotoModal(hw.photo);
    });
    body.appendChild(div);
  } else if(curMemoTab==='homework'){
    // ── ДЗ: отдельный пункт меню; сверху — пары этой недели из расписания ──
    const div=document.createElement('div');
    const tIdx=eduTodayIdx();
    let html=`<div class="sh">домашнее задание <span class="sh-btn" onclick="openHwModal()">+ добавить</span></div>`;
    if(eduSchedule.length){
      html+=`<div class="edu-today-sub">по расписанию · один предмет — одна строка (все дни пар, ч/з)</div>`;
      // дедупликация: одна пара-предмет в неделю = одна строка ДЗ, даже если пара 4 раза в неделю
      const weekKey=hwWeekDateKey(0);
      const seen={};
      const uniq=eduSchedule.filter(p=>{
        const k=String(p.name||'').trim().toLowerCase();
        if(!k||seen[k])return false;
        seen[k]=1;return true;
      });
      uniq.forEach(p=>{
        const key=String(p.name).trim().toLowerCase();
        const group=eduSchedule.filter(x=>String(x.name||'').trim().toLowerCase()===key)
          .sort((a,b)=>(+a.day)-(+b.day)||eduCompareTime(a.time,b.time));
        const hwFor=homework.find(h=>h.pairId&&group.some(g=>g.id===h.pairId)&&h.week===weekKey);
        const sched=group.map(g=>{
          const day=DAYS7[Number(g.day)]||'';
          return `${day.slice(0,2)}${g.time?' '+g.time:''}${g.room?' (ауд. '+g.room+')':''}`;
        }).filter(Boolean).join(' · ');
        html+=`<div class="hw-item${hwFor&&hwFor.done?' is-done':''}" id="${hwFor?`hw-item-${hwFor.id}`:`hw-auto-${p.id}`}">
          <div class="hw-info" style="flex:1">
            <div class="hw-subj">${p.name}</div>
            ${sched?`<div class="hw-task">${sched}</div>`:''}
            <input class="hw-inline" placeholder="что задали?" value="${hwFor?String(hwFor.task||'').replace(/"/g,'&quot;'):''}" onchange="savePairHw(${p.id},'${weekKey}',this.value)">
          </div>
          ${hwFor?hwDoneControl(hwFor):''}
        </div>`;
        if(hwFor&&hwFor.photo)html+=`<div style="margin:-4px 0 10px;padding:0 1px"><img src="${hwFor.photo}" data-hwphoto="${hwFor.id}" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);cursor:pointer;display:block" loading="lazy"></div>`;
      });
    }
    // ручные записи + «осиротевшие» привязки (пара удалена из расписания)
    const manual=homework.filter(h=>!h.pairId||!eduSchedule.some(p=>p.id===h.pairId));
    if(manual.length)html+=`<div class="edu-today-sub">добавлено вручную</div>`;
    if(!manual.length&&!eduSchedule.length)html+=`<div class="edu-empty">пар в расписании нет — добавь их в «УЧЕБА», они перенесутся сюда автоматически</div>`;
    html+=manual.map(hwItemRow).join('');
    div.innerHTML=html;
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
    const types=[{k:'film',l:'Фильмы'},{k:'series',l:'Сериалы'},{k:'anime',l:'Аниме'},{k:'cartoon',l:'Мультфильмы'},{k:'manga',l:'Манга / Манхва'},{k:'dorama',l:'Дорамы'},{k:'book',l:'Книги'}];
    const sLabel={want:'хочу посмотреть',watching:'смотрю',done:'посмотрел'};
    const sColor={want:'var(--t2)',watching:'var(--amber)',done:'var(--a)'};
    let html=`<div class="sh" style="padding-top:0">watchlist <span class="sh-btn" onclick="openWatchSearchModal()" style="margin-right:4px">${uiIconSvg('search')} поиск</span><span class="sh-btn" onclick="openWatchModal()">+ добавить</span></div>`;
    let wlTotal=0;
    types.forEach(type=>{
      const items=watchlist.filter(w=>w.type===type.k);
      wlTotal+=items.length;
      if(_wlGrpOpen[type.k]===undefined)_wlGrpOpen[type.k]=items.length>0;
      const gOpen=_wlGrpOpen[type.k];
      html+=`<div class="wl-grp${gOpen?' open':''}" onclick="toggleWlGrp('${type.k}')">
        <span class="wl-grp-chev">▸</span><span class="wl-grp-t">${type.l}</span><span class="wl-grp-c">${items.length}</span>
      </div>`;
      let groupContent='';
      if(!items.length)groupContent=`<div class="wl-grp-empty">пока пусто — добавь первую запись</div>`;
      items.forEach(w=>{
        const open=_wlOpen[w.id]?' open':'';
        const now2=new Date();
        let dayBadge='';
        if(w.date){
          const days2=daysToDeadline(w.date,now2);
          const dc=days2!==null&&days2<=7?getDeadlineColor(days2,'week'):'var(--t3)';
          dayBadge=`<span style="font-family:var(--mono);font-size:10px;color:${dc}">${displayDate(w.date)}${days2!==null&&days2<=7?' · '+(days2===0?'сегодня':days2<0?'просрочено':days2+'д.'):''}</span>`;
        }
        groupContent+=`<div class="bd-item" id="watch-item-${w.id}">
          <div class="bd-row" onclick="toggleWlExpand(${w.id})">
            <div class="bd-chev${open}">▸</div>
            <div class="bd-info">
              <div class="bd-name">${w.name}</div>
              <div class="bd-date" style="color:${sColor[w.status]}">${sLabel[w.status]}</div>
            </div>
            ${dayBadge}
            <button class="bd-edit" onclick="event.stopPropagation();openWatchEditModal(${w.id})" title="Изменить">${_edS}</button>
          </div>
          <div class="bd-details${open}" style="display:${open?'flex':'none'}">
            <div class="bd-field"><span class="bd-field-l">статус</span><span class="bd-field-v">
              <select onchange="updateWatchStatus(${w.id},this.value)" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t);font-family:var(--mono);font-size:10px;padding:5px 8px;outline:none;cursor:pointer">
                <option value="want"${w.status==='want'?' selected':''}>хочу</option>
                <option value="watching"${w.status==='watching'?' selected':''}>смотрю</option>
                <option value="done"${w.status==='done'?' selected':''}>посмотрел</option>
              </select>
            </span></div>
            ${w.date?`<div class="bd-field"><span class="bd-field-l">дедлайн</span><span class="bd-field-v">${displayDate(w.date)}</span></div>`:'<div class="bd-field"><span class="bd-field-l">дедлайн</span><span class="bd-field-v" style="color:var(--t3)">не задан</span></div>'}
          </div>
        </div>`;
      });
      html+=`<div class="wl-grp-content" data-group="${type.k}" style="display:${gOpen?'block':'none'}">${groupContent}</div>`;
    });
    if(!wlTotal) html+=`<div style="font-size:13px;color:var(--t3);padding:8px 0">Список пуст</div>`;
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
        div.innerHTML+=`<div class="note-item"><div style="float:right;display:flex;gap:4px"><button class="rt-edit" onclick="startNoteEdit(${n.id})" title="Редактировать"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div><div class="note-text">${n.text}</div>${n.photo?`<img src="${n.photo}" style="margin-top:8px;width:100%;max-height:220px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);display:block">`:''}<div style="margin-top:6px"><label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--t3);cursor:pointer;font-family:var(--mono)"><input type="file" accept="image/*" style="display:none" onchange="attachNotePhoto(${n.id},this)">${uiIconSvg('clip')} ${n.photo?'заменить фото':'фото'}</label>${n.photo?`<button onclick="removeNotePhoto(${n.id})" style="background:none;border:none;color:var(--t3);font-size:11px;cursor:pointer;margin-left:8px;font-family:var(--mono)">✕ удалить</button>`:''}</div></div>`;
      }
    });
    div.innerHTML+=`<div style="display:flex;flex-direction:column;gap:7px;margin-top:7px"><textarea class="add-inp" id="noteInp" placeholder="Новая заметка..." style="resize:none;height:65px"></textarea><div id="noteNewPhotoPreview" style="display:none;position:relative"><img id="noteNewPhotoImg" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);display:block"><button onclick="clearNewNotePhoto()" style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,0.7);border:none;color:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center">✕</button></div><div style="display:flex;gap:7px;align-items:center"><label id="notePhotoLabel" style="display:flex;align-items:center;gap:6px;background:var(--c2);border:1px solid var(--bd);border-radius:var(--rm);padding:9px 13px;font-size:13px;color:var(--t2);cursor:pointer;flex:1"><span>${uiIconSvg('camera')} Фото</span><input type="file" id="notePhotoInput" accept="image/*" style="display:none" onchange="onNewNotePhoto(this)"></label><button class="add-btn" onclick="addNote()">+ ДОБАВИТЬ</button></div></div>`;
    body.appendChild(div);
    if(noteEditId!==null){
      setTimeout(()=>{const ta=document.getElementById('noteEditArea-'+noteEditId);if(ta){ta.style.height=ta.scrollHeight+'px';ta.focus();ta.selectionStart=ta.value.length;}},30);
    }
  }
}
// BD
let _bdOpen={};
function toggleBdExpand(id){
  _bdOpen[id]=!_bdOpen[id];
  const item=document.getElementById('bd-item-'+id);
  const details=item?.querySelector('.bd-details');
  const chev=item?.querySelector('.bd-chev');
  animateCollapse(details,!_bdOpen[id],'flex');
  if(chev)chev.classList.toggle('open',_bdOpen[id]);
}
// WL (вотчлист — сворачиваемые карточки и группы-вкладки)
let _wlOpen={};
function toggleWlExpand(id){
  _wlOpen[id]=!_wlOpen[id];
  const item=document.getElementById('watch-item-'+id);
  const details=item?.querySelector('.bd-details');
  const chev=item?.querySelector('.bd-chev');
  animateCollapse(details,!_wlOpen[id],'flex');
  if(chev)chev.classList.toggle('open',_wlOpen[id]);
}
let _wlGrpOpen={};
function toggleWlGrp(k){
  if(_wlGrpOpen[k]===undefined)_wlGrpOpen[k]=watchlist.filter(w=>w.type===k).length>0;
  _wlGrpOpen[k]=!_wlGrpOpen[k];
  const content=document.querySelector(`.wl-grp-content[data-group="${k}"]`);
  const heading=content?.previousElementSibling;
  animateCollapse(content,!_wlGrpOpen[k],'block');
  if(heading)heading.classList.toggle('open',_wlGrpOpen[k]);
}
function openBdModal(){document.getElementById('bdName').value='';document.getElementById('bdRel').value='';document.getElementById('bdPhone').value='';document.getElementById('bdDate').value='';document.getElementById('bdNote').value='';openModal('bdModal');}
function closeBdModal(){closeModal('bdModal');}
function confirmAddBd(){const n=document.getElementById('bdName').value.trim();if(!n)return;const rel=document.getElementById('bdRel').value.trim();const phone=document.getElementById('bdPhone').value.trim();const d=document.getElementById('bdDate').value;const note=document.getElementById('bdNote').value.trim();birthdays.push({id:nid++,name:n,rel,phone,date:d,note});LS.s('birthdays',birthdays);LS.s('nid',nid);closeBdModal();renderMemoBody();}
function delBd(id) { deleteItem(birthdays, 'birthdays', id, renderMemoBody); }
let bdEditId=null;
function openBdEditModal(id){const b=birthdays.find(x=>x.id===id);if(!b)return;bdEditId=id;document.getElementById('bdEditName').value=b.name;document.getElementById('bdEditRel').value=b.rel||'';document.getElementById('bdEditPhone').value=b.phone||'';document.getElementById('bdEditDate').value=b.date||'';document.getElementById('bdEditNote').value=b.note||'';openModal('bdEditModal');}
function closeBdEditModal(){closeModal('bdEditModal');bdEditId=null;}
function confirmEditBd(){const n=document.getElementById('bdEditName').value.trim();if(!n||!bdEditId)return;const rel=document.getElementById('bdEditRel').value.trim();const phone=document.getElementById('bdEditPhone').value.trim();const d=document.getElementById('bdEditDate').value;const note=document.getElementById('bdEditNote').value.trim();const b=birthdays.find(x=>x.id===bdEditId);if(b){b.name=n;b.rel=rel;b.phone=phone;b.date=d;b.note=note;}LS.s('birthdays',birthdays);closeBdEditModal();renderMemoBody();}
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
function hwDoneControl(h){
  return `<button class="hw-done-btn" type="button" onclick="event.stopPropagation();toggleHomeworkDone(${h.id})" aria-label="${h.done?'вернуть в невыполненные':'отметить выполненным'}">${h.done?'✓':'○'}</button>`;
}
function toggleHomeworkDone(id){
  const h=homework.find(item=>item.id===id);
  if(!h)return;
  h.done=!h.done;
  LS.s('homework',homework);
  renderMemoBody();
  if(typeof renderTodayHW==='function')renderTodayHW(new Date());
}
function hwItemRow(h){
  return `<div class="hw-item${h.done?' is-done':''}" id="hw-item-${h.id}"><div class="hw-info"><div class="hw-subj">${h.subj}</div><div class="hw-task">${h.task}</div>${h.date?`<div class="hw-date">${displayDate(h.date)}</div>`:''}</div>${hwDoneControl(h)}<div style="display:flex;flex-direction:column;gap:4px"><button class="rt-edit" onclick="openHwEditModal(${h.id})">${_edS}</button></div></div>${h.photo?`<div style="margin:-4px 0 10px;padding:0 1px"><img src="${h.photo}" data-hwphoto="${h.id}" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;border:1px solid var(--bd);cursor:pointer;display:block" loading="lazy"></div>`:''}`;
}
// ── ДЗ, привязанное к паре: предмет берётся из расписания (правится только там) ──
function hwDateKey(d){
  d=d||new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
// дата дня d (0=пн … 6=вс) текущей календарной недели
function hwWeekDateKey(d){
  const now=new Date();
  const tIdx=(now.getDay()+6)%7;
  return hwDateKey(new Date(now.getFullYear(),now.getMonth(),now.getDate()-tIdx+(d||0)));
}
function savePairHw(pairId, weekKey, v){
  const p=eduSchedule.find(x=>x.id===pairId);
  if(!p)return;
  v=String(v||'').trim();
  // одна запись на предмет в неделю — даже если пара в расписании несколько раз
  const key=String(p.name||'').trim().toLowerCase();
  const ids=eduSchedule.filter(x=>String(x.name||'').trim().toLowerCase()===key).map(x=>x.id);
  const i=homework.findIndex(h=>h.pairId&&ids.includes(h.pairId)&&h.week===weekKey);
  if(!v){ // очистил поле — запись удаляется
    if(i>=0){homework.splice(i,1);LS.s('homework',homework);renderMemoBody();}
    return;
  }
  if(i>=0){homework[i].task=v;homework[i].subj=p.name;homework[i].pairId=p.id;} // subj синхронизируем с парой
  else homework.push({id:nid++,pairId:p.id,subj:p.name,task:v,photo:null,week:weekKey});
  LS.s('homework',homework);LS.s('nid',nid);
  renderMemoBody();
}
// ── УЧЕБА: пары / предметы / ссылки / звонки ──────────────
// строка пары — используется и в «СЕГОДНЯ», и в расписании по дням
function eduPairRow(p){
  const sub=[p.teacher,p.corpus?('корп. '+p.corpus):'',p.room].filter(Boolean).join(' · ');
  return `<div class="edu-pair" onclick="openEduPairModal(${p.id})">
    <div class="edu-time">${p.time||'—'}</div>
    <div class="edu-pair-info"><div class="edu-pair-name">${p.name}</div>${sub?`<div class="edu-pair-sub">${sub}</div>`:''}</div>
    ${p.parity&&p.parity!=='both'?`<div class="edu-par-badge">${p.parity==='num'?'ч':'з'}</div>`:''}
    <span class="bd-edit">${_edS}</span>
  </div>`;
}
// строка звонка
function eduBellRow(b){
  return `<div class="edu-bell" onclick="openEduBellModal(${b.id})">
    <div class="edu-time">${b.time||'—'}</div>
    <div class="edu-bell-name">${b.name||''}</div>
    <span class="bd-edit">${_edS}</span>
  </div>`;
}
// индекс сегодняшнего дня: 0=пн … 6=вс
function eduTodayIdx(){return (new Date().getDay()+6)%7;}
function _eduWeekNum(d){
  // номер недели в году (1..53) — для подписи «неделя N»
  d=d||new Date();
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum=(t.getUTCDay()+6)%7;
  t.setUTCDate(t.getUTCDate()-dayNum+3);
  const first=new Date(Date.UTC(t.getUTCFullYear(),0,4));
  return 1+Math.round(((t-first)/86400000-3+((first.getUTCDay()+6)%7))/7);
}
function eduCurrentParity(){
  const base=eduWeekParity==='den'?'den':'num';
  if(!eduWeekAnchor)return base;
  const a=eduWeekAnchor.split('-');
  const anc=new Date(+a[0],+a[1]-1,+a[2]);
  const now=new Date();
  const mon=new Date(now.getFullYear(),now.getMonth(),now.getDate()-((now.getDay()+6)%7));
  const diff=Math.round((mon-anc)/604800000); // сколько недель прошло с якоря
  return (((diff%2)+2)%2===1)?(base==='num'?'den':'num'):base; // следующая неделя — противоположный паритет
}
function setEduParity(v){
  if(v!=='num'&&v!=='den')return; // режима «авто» больше нет: якорем становится текущая неделя
  eduWeekParity=v;
  eduWeekAnchor=eduMondayKey(new Date());
  LS.s('eduWeekParity',eduWeekParity);LS.s('eduWeekAnchor',eduWeekAnchor);
  renderMemoBody();
}
// (сайт замен удалён)
// пары
let eduPairEditId=null;
function openEduPairModal(id){
  const p=id?eduSchedule.find(x=>x.id===id):null;
  eduPairEditId=p?p.id:null;
  document.getElementById('eduPairTitle').textContent=p?'редактировать пару':'новая пара';
  document.getElementById('eduPairDay').value=p?String(p.day):String(eduTodayIdx());
  document.getElementById('eduPairTime').value=p?(p.time||''):'';
  document.getElementById('eduPairName').value=p?p.name:'';
  document.getElementById('eduPairTeacher').value=p?(p.teacher||''):'';
  document.getElementById('eduPairCorpus').value=p?(p.corpus||''):'';
  document.getElementById('eduPairRoom').value=p?(p.room||''):'';
  document.getElementById('eduPairParity').value=p?(p.parity||'both'):'both';
  const del=document.getElementById('eduPairDelBtn');
  if(del)del.style.display=p?'':'none';
  openModal('eduPairModal');
  setTimeout(()=>document.getElementById('eduPairTime').focus(),80);
}
function closeEduPairModal(){closeModal('eduPairModal');eduPairEditId=null;}
function confirmEduPair(){
  const name=document.getElementById('eduPairName').value.trim();
  if(!name)return;
  const rec={
    day:+document.getElementById('eduPairDay').value,
    time:document.getElementById('eduPairTime').value,
    name,
    teacher:document.getElementById('eduPairTeacher').value.trim(),
    corpus:document.getElementById('eduPairCorpus').value.trim(),
    room:document.getElementById('eduPairRoom').value.trim(),
    parity:document.getElementById('eduPairParity').value
  };
  if(eduPairEditId!==null){const p=eduSchedule.find(x=>x.id===eduPairEditId);if(p)Object.assign(p,rec);}
  else eduSchedule.push({id:nid++,...rec});
  LS.s('eduSchedule',eduSchedule);LS.s('nid',nid);
  closeEduPairModal();renderMemoBody();
}
function delEduPair(id){deleteItem(eduSchedule,'eduSchedule',eduPairEditId!==null?eduPairEditId:id,renderMemoBody);closeEduPairModal();}
// звонки (расписание звонков по дням недели)
let eduBellEditId=null;
function openEduBellModal(id,day){
  const b=id?eduBells.find(x=>x.id===id):null;
  eduBellEditId=b?b.id:null;
  document.getElementById('eduBellTitle').textContent=b?'редактировать звонок':'новый звонок';
  document.getElementById('eduBellDay').value=b?String(b.day):String(day!==undefined&&day!==null?day:eduTodayIdx());
  document.getElementById('eduBellTime').value=b?(b.time||''):'';
  document.getElementById('eduBellName').value=b?(b.name||''):'';
  const del=document.getElementById('eduBellDelBtn');
  if(del)del.style.display=b?'':'none';
  openModal('eduBellModal');
  setTimeout(()=>document.getElementById('eduBellTime').focus(),80);
}
function closeEduBellModal(){closeModal('eduBellModal');eduBellEditId=null;}
function confirmEduBell(){
  const time=document.getElementById('eduBellTime').value;
  if(!time)return;
  const rec={day:+document.getElementById('eduBellDay').value,time,name:document.getElementById('eduBellName').value.trim()};
  if(eduBellEditId!==null){const b=eduBells.find(x=>x.id===eduBellEditId);if(b)Object.assign(b,rec);}
  else eduBells.push({id:nid++,...rec});
  LS.s('eduBells',eduBells);LS.s('nid',nid);
  closeEduBellModal();renderMemoBody();
}
function delEduBell(){if(eduBellEditId!==null)deleteItem(eduBells,'eduBells',eduBellEditId,renderMemoBody);closeEduBellModal();}
// предметы
let eduSubjEditId=null;
function openEduSubjModal(id){
  const s=id?eduSubjects.find(x=>x.id===id):null;
  eduSubjEditId=s?s.id:null;
  document.getElementById('eduSubjTitle').textContent=s?'редактировать предмет':'новый предмет';
  document.getElementById('eduSubjName').value=s?s.name:'';
  document.getElementById('eduSubjTeacher').value=s?(s.teacher||''):'';
  const del=document.getElementById('eduSubjDelBtn');
  if(del)del.style.display=s?'':'none';
  openModal('eduSubjModal');
  setTimeout(()=>document.getElementById('eduSubjName').focus(),80);
}
function closeEduSubjModal(){closeModal('eduSubjModal');eduSubjEditId=null;}
function confirmEduSubj(){
  const name=document.getElementById('eduSubjName').value.trim();
  if(!name)return;
  const teacher=document.getElementById('eduSubjTeacher').value.trim();
  if(eduSubjEditId!==null){const s=eduSubjects.find(x=>x.id===eduSubjEditId);if(s){s.name=name;s.teacher=teacher;}}
  else eduSubjects.push({id:nid++,name,teacher});
  LS.s('eduSubjects',eduSubjects);LS.s('nid',nid);
  closeEduSubjModal();renderMemoBody();
}
function delEduSubj(id){deleteItem(eduSubjects,'eduSubjects',eduSubjEditId!==null?eduSubjEditId:id,renderMemoBody);closeEduSubjModal();}
// полезные ссылки
let eduLinkEditId=null;
function openEduLinkModal(id){
  const l=id?eduLinks.find(x=>x.id===id):null;
  eduLinkEditId=l?l.id:null;
  document.getElementById('eduLinkTitle').textContent=l?'редактировать ссылку':'новая ссылка';
  document.getElementById('eduLinkName').value=l?l.title:'';
  document.getElementById('eduLinkUrl').value=l?l.url:'';
  const del=document.getElementById('eduLinkDelBtn');
  if(del)del.style.display=l?'':'none';
  openModal('eduLinkModal');
  setTimeout(()=>document.getElementById('eduLinkName').focus(),80);
}
function closeEduLinkModal(){closeModal('eduLinkModal');eduLinkEditId=null;}
function confirmEduLink(){
  const title=document.getElementById('eduLinkName').value.trim();
  let url=document.getElementById('eduLinkUrl').value.trim();
  if(!title||!url)return;
  if(!/^https?:\/\//i.test(url))url='https://'+url;
  if(eduLinkEditId!==null){const l=eduLinks.find(x=>x.id===eduLinkEditId);if(l){l.title=title;l.url=url;}}
  else eduLinks.push({id:nid++,title,url});
  LS.s('eduLinks',eduLinks);LS.s('nid',nid);
  closeEduLinkModal();renderMemoBody();
}
function delEduLink(id){deleteItem(eduLinks,'eduLinks',eduLinkEditId!==null?eduLinkEditId:id,renderMemoBody);closeEduLinkModal();}
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
    if(lbl){const sp=lbl.querySelector('span');if(sp)sp.innerHTML=uiIconSvg('camera')+' Заменить';}
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
