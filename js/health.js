// ═══ MODULE: health.js ═══
// ══ ФИЗКАРТОЧКА ═════════════════════════════════════

// Debounce-таймеры для отложенного сохранения (600мс после последнего движения)
const _hlSaveTimers = {};
function _saveHLDebounced(h) {
  clearTimeout(_hlSaveTimers._main);
  _hlSaveTimers._main = setTimeout(() => saveHL(h), 600);
}
let _physDiseaseEditId = null;

// Called on height/age oninput — updates recalc block without re-rendering physCard (avoids focus loss)
function renderPhysCardRef() {
  const wInpVal = parseFloat(document.getElementById('wInp')?.value) || 0;
  const lastW = weights.length ? weights[weights.length - 1].val : 0;
  const weight = wInpVal >= 30 ? wInpVal : (lastW >= 30 ? lastW : 0);
  if (weight) showKBZHURecalc(weight);
}

function renderPhysCard() {
  const el = document.getElementById('physCardContent');
  if (!el) return;
  const h = health.height || '';
  const age = health.age || '';
  const gender = health.gender || 'male';
  const gIcon = gender === 'female' ? '♀' : '♂';
  const gLabel = gender === 'female' ? 'жен' : 'муж';
  let html = '';
  // Editable fields: рост, возраст, пол
  html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">`;
  // Рост
  html += `<div style="background:var(--c2);border:1px solid var(--bd);border-radius:10px;padding:8px 10px;text-align:center">
    <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">рост</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:4px">
      <input type="number" min="140" max="220" value="${h}" oninput="health.height=(this.value===''?181.5:+this.value);LS.s('health',health);if(typeof renderPhysCardRef==='function')renderPhysCardRef();" style="width:52px;background:transparent;border:none;border-bottom:1px solid var(--bd);color:var(--blue);font-family:var(--mono);font-size:15px;text-align:center;outline:none;padding:0 2px">
      <span style="font-family:var(--mono);font-size:9px;color:var(--t3)">см</span>
    </div>
  </div>`;
  // Возраст
  html += `<div style="background:var(--c2);border:1px solid var(--bd);border-radius:10px;padding:8px 10px;text-align:center">
    <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">возраст</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:4px">
      <input type="number" min="10" max="99" value="${age}" oninput="health.age=(this.value===''?17:+this.value);LS.s('health',health);if(typeof renderPhysCardRef==='function')renderPhysCardRef();" style="width:40px;background:transparent;border:none;border-bottom:1px solid var(--bd);color:var(--purple);font-family:var(--mono);font-size:15px;text-align:center;outline:none;padding:0 2px">
      <span style="font-family:var(--mono);font-size:9px;color:var(--t3)">лет</span>
    </div>
  </div>`;
  // Пол
  const gBg = gender === 'female' ? 'rgba(244,114,182,0.15)' : 'rgba(96,165,250,0.15)';
  const gBorder = gender === 'female' ? 'rgba(244,114,182,0.5)' : 'rgba(96,165,250,0.5)';
  const gColor = gender === 'female' ? '#f472b6' : '#60a5fa';
  html += `<div id="physCardGenderCell" onclick="toggleGender();" style="background:${gBg};border:1px solid ${gBorder};border-radius:10px;padding:8px 10px;text-align:center;cursor:pointer;user-select:none">
    <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">пол</div>
    <div class="phys-gender-text" style="font-family:var(--mono);font-size:15px;color:${gColor}">${gIcon} ${gLabel}</div>
  </div>`;
  html += `</div>`;
  // Diseases
  if (physDiseases.length) {
    html += '<div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;margin-top:4px">болезни и рекомендации</div>';
    physDiseases.forEach(d => {
      html += `<div class="phys-disease" id="pd-${d.id}" onclick="togglePhysDisease(${d.id})">
        <div class="phys-disease-head">
          <span style="font-size:15px">🩺</span>
          <div class="phys-disease-name">${d.name}</div>
          <div style="display:flex;gap:4px;flex-shrink:0" onclick="event.stopPropagation()">
            <button onclick="openPhysCardDiseaseModal(${d.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:2px 4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            
          </div>
          <div class="phys-disease-arr">▸</div>
        </div>
        <div class="phys-disease-body">${d.notes || 'Рекомендации не добавлены'}</div>
      </div>`;
    });
  } else {
    html += '<div style="font-size:12px;color:var(--t3);font-family:var(--mono);margin-top:4px">Болезней нет — нажми + болезнь чтобы добавить</div>';
  }
  el.innerHTML = html;
}

function togglePhysDisease(id) {
  const el = document.getElementById('pd-'+id);
  if (el) el.classList.toggle('open');
}

function openPhysCardDiseaseModal(editId) {
  _physDiseaseEditId = editId || null;
  const modal = document.getElementById('physCardModal');
  if (!modal) return;
  if (editId) {
    const d = physDiseases.find(x=>x.id===editId);
    if (d) {
      document.getElementById('physDiseaseName').value = d.name;
      document.getElementById('physDiseaseNotes').value = d.notes || '';
    }
    document.getElementById('physCardModalTitle').textContent = 'изменить болезнь';
    const pb=document.getElementById('physDiseaseDelBtn');if(pb)pb.style.display='';
  } else {
    document.getElementById('physDiseaseName').value = '';
    document.getElementById('physDiseaseNotes').value = '';
    document.getElementById('physCardModalTitle').textContent = 'добавить болезнь';const pb2=document.getElementById('physDiseaseDelBtn');if(pb2)pb2.style.display='none';
  }
  modal.classList.add('show');
  setTimeout(()=>document.getElementById('physDiseaseName').focus(), 100);
}

function closePhysCardModal() {
  closeModal('physCardModal');
  _physDiseaseEditId = null;
}

function confirmPhysDisease() {
  const name = document.getElementById('physDiseaseName').value.trim();
  const notes = document.getElementById('physDiseaseNotes').value.trim();
  if (!name) return;
  if (_physDiseaseEditId !== null) {
    const d = physDiseases.find(x=>x.id===_physDiseaseEditId);
    if (d) { d.name=name; d.notes=notes; }
  } else {
    physDiseases.push({id: nid++, name, notes});
    LS.s('nid', nid);
  }
  LS.s('physDiseases', physDiseases);
  closePhysCardModal();
  renderPhysCard();
}

function delPhysDisease(id) {
  physDiseases = physDiseases.filter(x=>x.id!==id);
  LS.s('physDiseases', physDiseases);
  renderPhysCard();
}
// ════════════════════════════════════════════════════
// ══ HEALTH ═════════════════════════════════════════════
function openHealthEdit(){['hKcal','hProt','hFat','hCarb','hWater','hSleep','hWMin','hWMax','hFiber','hSugar','hSalt','hAge','hHeight'].forEach(id=>{const map={hKcal:'kcal',hProt:'prot',hFat:'fat',hCarb:'carb',hWater:'water',hSleep:'sleep',hWMin:'wMin',hWMax:'wMax',hFiber:'fiber',hSugar:'sugar',hSalt:'salt',hAge:'age',hHeight:'height'};const el=document.getElementById(id);if(el)el.value=health[map[id]]||'';});openModal('healthModal');}
function closeHealthEdit(){closeModal('healthModal');}
function saveHealthParams(){health={kcal:+document.getElementById('hKcal').value||2500,prot:+document.getElementById('hProt').value||174,fat:+document.getElementById('hFat').value||79,carb:+document.getElementById('hCarb').value||235,water:+document.getElementById('hWater').value||10,sleep:+document.getElementById('hSleep').value||8,wMin:+document.getElementById('hWMin').value||71,wMax:+document.getElementById('hWMax').value||72,fiber:+document.getElementById('hFiber').value||30,sugar:+document.getElementById('hSugar').value||50,salt:+document.getElementById('hSalt').value||5,trainDays:health.trainDays||4,age:+document.getElementById('hAge').value||17,height:+document.getElementById('hHeight').value||181.5,cutting:health.cutting||false,gender:health.gender||'male'};LS.s('health',health);closeHealthEdit();renderHealth();flash(t('health_updated'));}
function getHL(){return hLog[nowDK()]||{kcal:0,prot:0,fat:0,carb:0,water:0,sleep:0,supps:{}};}
function saveHL(h){hLog[nowDK()]=h;LS.s('hLog',hLog);}
function renderHealth(){
  renderPhysCard();
  const hl=getHL();
  const macros=[{key:'kcal',label:t('health_kcal'),unit:t('health_kcal_unit')||'ккал',color:'#e2e2e2',cls:'mc-kcal',icon:'⚡',accent:'rgba(226,226,226,0.7)',t:health.kcal},{key:'prot',label:t('health_prot'),unit:'г',color:'#4ade80',cls:'mc-prot',icon:'💪',accent:'rgba(74,222,128,0.8)',t:health.prot},{key:'fat',label:t('health_fat'),unit:'г',color:'#fbbf24',cls:'mc-fat',icon:'🔥',accent:'rgba(251,191,36,0.8)',t:health.fat},{key:'carb',label:t('health_carb'),unit:'г',color:'#60a5fa',cls:'mc-carb',icon:'⚡',accent:'rgba(96,165,250,0.8)',t:health.carb}];
  const mgEl=document.getElementById('macroGrid');
  if(mgEl){
    mgEl.innerHTML=macros.map((m,idx)=>{
      const val=hl[m.key]||0,p=Math.min(100,pct(val,m.t));
      const sliderMax=Math.round(m.t*2);
      const overNorm=val>m.t;
      const barBg=overNorm?`linear-gradient(90deg,${m.color} 0%,${m.color} ${Math.round(m.t/val*100)}%,var(--red) 100%)`:m.color;
      return`<div class="mc-themed ${m.cls}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
          <div>
            <div style="font-family:var(--mono);font-size:8px;color:${m.accent};letter-spacing:1.5px;text-transform:uppercase">${m.label}</div>
            <div class="mc-target" style="margin-top:1px">/ ${m.t} ${m.unit}</div>
          </div>
          <div style="font-size:16px;opacity:.7">${m.icon}</div>
        </div>
        <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:2px">
          <div id="mcv-${m.key}" class="mc-bigval" style="font-size:38px;color:${overNorm?'var(--red)':m.color};line-height:1;text-shadow:0 0 14px ${m.color}44">${val}</div>
          <div style="font-size:10px;font-family:var(--mono);color:var(--t2)">${m.unit}</div>
        </div>
        <div class="mc-themed-bar"><div class="mc-themed-fill" id="mcb-${m.key}" style="width:${p}%;background:${barBg}"></div></div>
        <input class="mc-themed-inp" type="text" inputmode="numeric" placeholder="0" value="${val||''}" id="mci-${m.key}" oninput="upMacroLive('${m.key}',this.value)" style="border-color:${m.color}22">
        <input type="range" min="0" max="${sliderMax}" step="1" value="${val||0}" id="mcr-${m.key}" oninput="upMacroRange('${m.key}',this.value)" style="width:100%;accent-color:${m.color};cursor:pointer">
      </div>`;
    }).join('');
  }
  // ── МИКРОНУТРИЕНТЫ ──────────────────────────────────
  const micros=[
    {key:'fiber',label:t('health_fiber'),unit:'г',color:'#34d399',cls:'mc-fiber',icon:'🌿',accent:'rgba(52,211,153,0.8)',t:health.fiber||30},
    {key:'sugar',label:t('health_sugar'),unit:'г',color:'#f472b6',cls:'mc-sugar',icon:'🍬',accent:'rgba(244,114,182,0.8)',t:health.sugar||50},
    {key:'salt',label:t('health_salt'),unit:'г',color:'#fb923c',cls:'mc-salt',icon:'🧂',accent:'rgba(251,146,60,0.8)',t:health.salt||5}
  ];
  const mgEl2=document.getElementById('microGrid');
  if(mgEl2){
    mgEl2.innerHTML=micros.map(m=>{
      const val=hl[m.key]||0,p=Math.min(100,pct(val,m.t));
      const sliderMax=Math.round(m.t*3);
      const overNorm=val>m.t;
      const barBg=overNorm?`linear-gradient(90deg,${m.color} 0%,${m.color} ${Math.round(m.t/val*100)}%,var(--red) 100%)`:m.color;
      const isSalt=m.key==='salt';
      return`<div class="mc-themed ${m.cls}${isSalt?' mc-salt-full':''}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
          <div>
            <div style="font-family:var(--mono);font-size:8px;color:${m.accent};letter-spacing:1.5px;text-transform:uppercase">${m.label}</div>
            <div style="font-family:var(--mono);font-size:8px;margin-top:1px" class="mc-target">/ ${m.t} ${m.unit}</div>
          </div>
          <div style="font-size:16px;opacity:.7">${m.icon}</div>
        </div>
        <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:2px">
          <div id="mcv-${m.key}" class="mc-bigval" style="font-size:38px;color:${overNorm?'var(--red)':m.color};line-height:1;text-shadow:0 0 14px ${m.color}44">${val}</div>
          <div style="font-size:10px;font-family:var(--mono);color:var(--t2)">${m.unit}</div>
        </div>
        <div class="mc-themed-bar"><div class="mc-themed-fill" id="mcb-${m.key}" style="width:${p}%;background:${barBg}"></div></div>
        <input class="mc-themed-inp" type="text" inputmode="numeric" placeholder="0" value="${val||''}" id="mci-${m.key}" oninput="upMacroLive('${m.key}',this.value)" style="border-color:${m.color}22">
        <input type="range" min="0" max="${sliderMax}" step="0.1" value="${val||0}" id="mcr-${m.key}" oninput="upMacroRange('${m.key}',this.value)" style="width:100%;accent-color:${m.color};cursor:pointer">
      </div>`;
    }).join('');
  }
  const wlEl=document.getElementById('waterLbl');if(wlEl)wlEl.textContent=`${hl.water||0} / ${health.water} стак.`;
  const wcEl=document.getElementById('waterCount');if(wcEl)wcEl.textContent=hl.water||0;
  const wp=Math.min(100,pct(hl.water||0,health.water));
  const wbEl=document.getElementById('waterBar');if(wbEl)wbEl.style.width=wp+'%';
  const wfEl=document.getElementById('waterFillVis');if(wfEl)wfEl.style.width=wp+'%';
  const wptEl=document.getElementById('waterPctText');if(wptEl)wptEl.textContent=wp+'%';
  const wrEl=document.getElementById('waterRange');if(wrEl){wrEl.max=health.water;wrEl.value=hl.water||0;}
  const wl2El=document.getElementById('waterLbl2');if(wl2El)wl2El.textContent=`${t('health_water')||'из'} ${health.water} ${t('health_water_glasses')||'стаканов'}`;
  initWaterBubbles();
  const sched=LS.g('sleepSchedule',{bed:'23:00',wake:'05:00',naps:[]});
  const bedEl=document.getElementById('sleepBedTime');if(bedEl)bedEl.value=sched.bed||'23:00';
  const wakeEl=document.getElementById('sleepWakeTime');if(wakeEl)wakeEl.value=sched.wake||'05:00';
  initNapSessions();
  updateSleepSchedule();
  // generate stars in sleep card
  (function(){const el=document.getElementById('sleepStars');if(!el||window._sleepStarsInit)return;window._sleepStarsInit=true;const isLight=document.body.classList.contains('light');const starColor=isLight?'#7090c8':'#fff';let html='';for(let i=0;i<55;i++){const x=Math.random()*100,y=Math.random()*100,s=Math.random()*1.6+0.4,o=((Math.random()*0.4+0.3)*(isLight?0.5:1)).toFixed(2),dur=(Math.random()*20+15).toFixed(1),delay=(Math.random()*20).toFixed(1);html+=`<div style="position:absolute;left:${x}%;top:${y}%;width:${s}px;height:${s}px;border-radius:50%;background:${starColor};opacity:${o};animation:starDrift${i%5} ${dur}s ${delay}s ease-in-out infinite alternate"></div>`;}el.innerHTML=html;})();  const sleepRem=LS.g('sleepRem',{on:false,time:'22:30'});
  const srtEl=document.getElementById('sleepRemTime');if(srtEl)srtEl.value=sleepRem.time||'22:30';
  const srtTgl=document.getElementById('sleepRemTgl');if(srtTgl)srtTgl.className='tgl'+(sleepRem.on?' on':'');
  const wtTag=document.getElementById('wTargetTag');if(wtTag)wtTag.textContent=`цель: ${health.wMin}–${health.wMax} кг`;
  const tdInp=document.getElementById('trainDaysInp');if(tdInp)tdInp.value=health.trainDays||4;
  const ageInpEl=document.getElementById('ageInp');if(ageInpEl)ageInpEl.value=health.age||17;
  const htInpEl=document.getElementById('heightInp');if(htInpEl)htInpEl.value=health.height||181.5;
  updateCuttingUI();
  updateGenderUI();
  if(weights.length){const last=weights[weights.length-1];const inR=last.val>=health.wMin&&last.val<=health.wMax;const diff=(last.val-((health.wMin+health.wMax)/2)).toFixed(1);const wd=document.getElementById('wDiff');if(wd){wd.className='wtag '+(inR?'wtag-ok':'wtag-ov');wd.textContent=inR?'✓ в цели':(+diff>0?`+${diff} кг`:`${diff} кг`);}
    // auto-show recalc for last logged weight
    const recalcBlock=document.getElementById('kbzhuRecalcBlock');
    if(recalcBlock)recalcBlock.style.display='block';
    showKBZHURecalc(last.val);
  }
  const sgEl=document.getElementById('suppGrid');if(sgEl)sgEl.innerHTML=supps.map((s,si)=>{const taken=!!(hl.supps&&hl.supps[s.name]);const descId='suppDesc-'+si;return`<div class="supp-item${taken?' taken':''}" onclick="toggleSupp('${s.name}')"><div class="supp-chk">${taken?'✓':''}</div><div style="flex:1;min-width:0"><div class="supp-name">${s.name}</div>${s.desc?`<div id="${descId}" class="supp-desc-text" style="display:none;font-size:11px;color:var(--t3);margin-top:2px;line-height:1.4">${s.desc}</div>`:'' }</div>${s.desc?`<button class="supp-del" onclick="event.stopPropagation();var el=document.getElementById('${descId}');el.style.display=el.style.display==='none'?'block':'none'" title="Описание">▾</button>`:''}<button class="supp-del" onclick="event.stopPropagation();openSuppEdit('${s.name}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div>`;}).join('');
  const medEl=document.getElementById('medGrid');if(medEl)medEl.innerHTML=meds.map(m=>`<div class="supp-item" style="cursor:default;background:var(--c2);border-color:rgba(167,139,250,0.2)">
    <div style="font-size:16px;flex-shrink:0">💊</div>
    <div style="flex:1">
      <div style="font-size:13px;color:var(--t)">${escHtml(m.name)}</div>
      <div style="font-family:var(--mono);font-size:10px;color:rgba(167,139,250,0.8);margin-top:2px">${escHtml(m.use)}</div>
    </div>
    <button class="rt-edit" onclick="openMedEdit(${m.id})"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

  </div>`).join('');
  renderWeightChart();
  renderPhysCard();
}
function getMacroColor(key){const map={kcal:'#e2e2e2',prot:'#4ade80',fat:'#fbbf24',carb:'#60a5fa',fiber:'#34d399',sugar:'#f472b6',salt:'#fb923c'};return map[key]||'var(--a)';}
function initWaterBubbles(){const el=document.getElementById('bubbleBg');if(!el||el.children.length)return;let h='';for(let i=0;i<12;i++){const left=Math.random()*90+5,size=Math.random()*10+4,delay=Math.random()*4,dur=Math.random()*3+2;h+=`<div class="bubble" style="left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;bottom:0"></div>`;}el.innerHTML=h;}
function upMacroLive(key,val){
  const v=+val||0;
  const h=getHL();h[key]=v;_saveHLDebounced(h);
  const target=getMacroTarget(key);
  const color=getMacroColor(key);
  const bar=document.getElementById('mcb-'+key);
  const disp=document.getElementById('mcv-'+key);
  const range=document.getElementById('mcr-'+key);
  if(bar){
    const p=Math.min(100,Math.round(target?v/target*100:0));
    if(v<=target){bar.style.width=p+'%';bar.style.background=color;}
    else{const split=Math.round(target/v*100);bar.style.width='100%';bar.style.background=`linear-gradient(90deg,${color} 0%,${color} ${split}%,var(--red) 100%)`;}
  }
  if(disp){disp.textContent=v;disp.style.color=v>target?'var(--red)':color;disp.style.textShadow=`0 0 12px ${color}33`;}
  if(range)range.value=v;
}
function upMacroRange(key,val){
  const v=+val||0;
  const h=getHL();h[key]=v;_saveHLDebounced(h);
  const target=getMacroTarget(key);
  const color=getMacroColor(key);
  const bar=document.getElementById('mcb-'+key);
  const disp=document.getElementById('mcv-'+key);
  const inp=document.getElementById('mci-'+key);
  if(bar){
    const p=Math.min(100,Math.round(target?v/target*100:0));
    if(v<=target){bar.style.width=p+'%';bar.style.background=color;}
    else{const split=Math.round(target/v*100);bar.style.width='100%';bar.style.background=`linear-gradient(90deg,${color} 0%,${color} ${split}%,var(--red) 100%)`;}
  }
  if(disp){disp.textContent=v;disp.style.color=v>target?'var(--red)':color;disp.style.textShadow=`0 0 12px ${color}33`;}
  if(inp)inp.value=v;
}
function getMacroTarget(key){const map={kcal:health.kcal,prot:health.prot,fat:health.fat,carb:health.carb,fiber:health.fiber||30,sugar:health.sugar||50,salt:health.salt||5};return map[key]||1;}
function setWaterLive(n){
  const h=getHL();h.water=n;_saveHLDebounced(h);
  const wc=document.getElementById('waterCount');if(wc)wc.textContent=n;
  const wl=document.getElementById('waterLbl');if(wl)wl.textContent=`${n} / ${health.water} стак.`;
  const wl2=document.getElementById('waterLbl2');if(wl2)wl2.textContent=`${t('health_water')||'из'} ${health.water} ${t('health_water_glasses')||'стаканов'}`;
  const p=Math.min(100,Math.round((n/(health.water||10))*100));
  const wb=document.getElementById('waterBar');if(wb)wb.style.width=p+'%';
  const wf=document.getElementById('waterFillVis');if(wf)wf.style.width=p+'%';
  const wpt=document.getElementById('waterPctText');if(wpt)wpt.textContent=p+'%';
}
// saveSleepLive/saveSleepRange removed — sleep hours now auto-derived from schedule
function toggleSupp(name){const h=getHL();if(!h.supps)h.supps={};h.supps[name]=!h.supps[name];saveHL(h);renderHealth();}
function delSupp(name){supps=supps.filter(s=>s.name!==name);LS.s('supps',supps);renderHealth();}
let _suppEditName=null;
function openSuppEdit(name){
  _suppEditName=name;
  const s=supps.find(x=>x.name===name)||{name,desc:''};
  document.getElementById('suppEditInp').value=s.name;
  document.getElementById('suppEditDesc').value=s.desc||'';
  openModal('suppEditModal');
  setTimeout(()=>document.getElementById('suppEditInp').focus(),80);
}
function closeSuppEditModal(){closeModal('suppEditModal');_suppEditName=null;}
function saveSuppEdit(){
  const newName=document.getElementById('suppEditInp').value.trim();
  const newDesc=document.getElementById('suppEditDesc').value.trim();
  if(!newName||!_suppEditName){closeSuppEditModal();return;}
  const idx=supps.findIndex(s=>s.name===_suppEditName);
  if(idx!==-1){supps[idx].name=newName;supps[idx].desc=newDesc;}
  LS.s('supps',supps);renderHealth();closeSuppEditModal();
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// ── MED (аптечка) ──────────────────────────────────────
function openMedModal(id){
  const m=id!=null?meds.find(x=>x.id===id):null;
  document.getElementById('medModalTitle').textContent=m?'редактировать лекарство':'добавить лекарство';
  document.getElementById('medEditId').value=m?m.id:'';
  document.getElementById('medNameInp').value=m?m.name:'';
  document.getElementById('medUseInp').value=m?m.use:'';
  openModal('medModal');_hideMedDel();
  setTimeout(()=>document.getElementById('medNameInp').focus(),120);
}
function openMedEdit(id){openMedModal(id);const b=document.getElementById('medDelBtn');if(b){b.dataset.delId=id;b.style.display='';}}
function closeMedModal(){closeModal('medModal');}
function confirmMed(){
  const idVal=document.getElementById('medEditId').value;
  const name=document.getElementById('medNameInp').value.trim();
  const use=document.getElementById('medUseInp').value.trim();
  if(!name)return;
  if(idVal){
    const m=meds.find(x=>x.id===+idVal);
    if(m){m.name=name;m.use=use;}
  } else {
    meds.push({id:nid++,name,use});LS.s('nid',nid);
  }
  LS.s('meds',meds);
  document.getElementById('medNameInp').value='';
  document.getElementById('medUseInp').value='';
  closeMedModal();
  renderHealth();
}
function delMed(id){meds=meds.filter(x=>x.id!==id);LS.s('meds',meds);renderHealth();}
function _hideMedDel(){const b=document.getElementById('medDelBtn');if(b)b.style.display='none';}
function openSuppModal(){openModal('suppModal');}
function closeSuppModal(){closeModal('suppModal');}
function confirmAddSupp(){const name=document.getElementById('suppInp').value.trim();if(!name)return;const desc=(document.getElementById('suppDescInp')?.value||'').trim();if(!supps.find(s=>s.name===name)){supps.push({name,desc});LS.s('supps',supps);}document.getElementById('suppInp').value='';if(document.getElementById('suppDescInp'))document.getElementById('suppDescInp').value='';closeSuppModal();renderHealth();}
function updateSleepSchedule(){
  const bed=document.getElementById('sleepBedTime')?.value||'23:00';
  const wake=document.getElementById('sleepWakeTime')?.value||'05:00';
  const [bh,bm]=bed.split(':').map(Number);
  const [wh,wm]=wake.split(':').map(Number);
  let bedMins=bh*60+bm, wakeMins=wh*60+wm;
  if(wakeMins<=bedMins) wakeMins+=24*60;
  let totalMins=wakeMins-bedMins;
  // Add nap sessions
  const napItems=document.querySelectorAll('.nap-row');
  napItems.forEach(row=>{
    const nb=row.querySelector('.nap-bed')?.value;
    const nw=row.querySelector('.nap-wake')?.value;
    if(nb&&nw){
      const [nbh,nbm]=nb.split(':').map(Number);
      const [nwh,nwm]=nw.split(':').map(Number);
      let nm1=nbh*60+nbm,nm2=nwh*60+nwm;
      if(nm2<=nm1)nm2+=24*60;
      totalMins+=nm2-nm1;
    }
  });
  const hrs=Math.floor(totalMins/60),mins=totalMins%60;
  const totalHrs=hrs+(mins/60);
  const norm=health.sleep||8;
  const ok=totalHrs>=norm;
  const info=document.getElementById('sleepScheduleInfo');
  if(info) info.innerHTML=`<span style="color:${ok?'var(--a)':'var(--amber)'}">${hrs}ч ${mins>0?mins+'м':''} сна</span> &nbsp;·&nbsp; Норма: ${norm}ч &nbsp;·&nbsp; <span style="color:${ok?'var(--a)':'var(--amber)'}">${ok?'✓ достаточно':'↓ мало'}</span>`;
  // Save full schedule including naps
  const naps=[];
  napItems.forEach(row=>{
    const nb=row.querySelector('.nap-bed')?.value;
    const nw=row.querySelector('.nap-wake')?.value;
    if(nb&&nw) naps.push({bed:nb,wake:nw});
  });
  LS.s('sleepSchedule',{bed,wake,naps});
  // Auto-save sleep hours derived from schedule
  const h=getHL();h.sleep=Math.round(totalHrs*2)/2;saveHL(h);
  renderSleepCups(h.sleep, norm);
}
function addNapSession(){
  const container=document.getElementById('napContainer');
  if(!container)return;
  const row=document.createElement('div');
  row.className='nap-row';
  row.style.cssText='display:flex;align-items:center;gap:8px;margin-top:8px';
  const inpStyle='background:rgba(255,255,255,0.06);border:1px solid rgba(99,130,210,0.25);border-radius:7px;color:var(--t);font-family:var(--mono);font-size:13px;padding:5px 9px;outline:none';
  row.innerHTML=`<span style="font-size:11px;color:var(--t2)">😴</span>`+
    `<input type="time" class="nap-bed" value="14:00" style="${inpStyle}" oninput="updateSleepSchedule()">`+
    `<span style="font-size:11px;color:var(--t2)">→</span>`+
    `<input type="time" class="nap-wake" value="15:00" style="${inpStyle}" oninput="updateSleepSchedule()">`+
    `<div onclick="this.parentElement.remove();updateSleepSchedule()" style="cursor:pointer;color:var(--t3);font-size:16px;line-height:1;padding:0 4px">×</div>`;
  container.appendChild(row);
  updateSleepSchedule();
}
function initNapSessions(){
  const sched=LS.g('sleepSchedule',{bed:'23:00',wake:'05:00',naps:[]});
  const container=document.getElementById('napContainer');
  if(!container)return;
  container.innerHTML='';
  (sched.naps||[]).forEach(n=>{
    const row=document.createElement('div');
    row.className='nap-row';
    row.style.cssText='display:flex;align-items:center;gap:8px;margin-top:8px';
    const inpStyle='background:rgba(255,255,255,0.06);border:1px solid rgba(99,130,210,0.25);border-radius:7px;color:var(--t);font-family:var(--mono);font-size:13px;padding:5px 9px;outline:none';
    row.innerHTML=`<span style="font-size:11px;color:var(--t2)">😴</span>`+
      `<input type="time" class="nap-bed" value="${n.bed}" style="${inpStyle}" oninput="updateSleepSchedule()">`+
      `<span style="font-size:11px;color:var(--t2)">→</span>`+
      `<input type="time" class="nap-wake" value="${n.wake}" style="${inpStyle}" oninput="updateSleepSchedule()">`+
      `<div onclick="this.parentElement.remove();updateSleepSchedule()" style="cursor:pointer;color:var(--t3);font-size:16px;line-height:1;padding:0 4px">×</div>`;
    container.appendChild(row);
  });
}
function renderSleepCups(sleptHrs, normHrs){
  const hrs=Math.round((sleptHrs||0)*2)/2;
  const norm=normHrs||8;
  const ok=hrs>=norm;
  const pct=Math.min(100,Math.round((hrs/norm)*100));
  const numEl=document.getElementById('sleepHeroNum');
  if(numEl) numEl.textContent=hrs||0;
  const subEl=document.getElementById('sleepHeroSub');
  if(subEl) subEl.textContent='из '+norm+' часов';
  const fillEl=document.getElementById('sleepFillVis');
  if(fillEl) fillEl.style.width=pct+'%';
  const pctEl=document.getElementById('sleepPctText');
  if(pctEl) pctEl.textContent=pct+'%';
  const badge=document.getElementById('sleepStatusBadge');
  if(badge){
    if(hrs>0){
      const col=ok?'#7aa2f7':'#f87171';
      const bg=ok?'rgba(122,162,247,0.12)':'rgba(248,113,113,0.12)';
      const bd=ok?'rgba(122,162,247,0.3)':'rgba(248,113,113,0.3)';
      badge.innerHTML='<span style="color:'+col+';background:'+bg+';border:1px solid '+bd+';font-family:var(--mono);font-size:10px;padding:2px 8px;border-radius:10px">'+(ok?'✓ норма':'↓ мало')+'</span>';
    } else { badge.innerHTML=''; }
  }
}

function calcKBZHU(weight, trainDays){
  // Миффлин-Сан Жеор — наиболее точная формула
  // Мужчина: BMR = 10×вес + 6.25×рост − 5×возраст + 5
  // Женщина: BMR = 10×вес + 6.25×рост − 5×возраст − 161
  const td = trainDays !== undefined ? trainDays : (health.trainDays != null ? health.trainDays : 4);
  const age = health.age || 17;
  const ht  = health.height || 181.5;
  const gender = health.gender || 'male'; // 'male' или 'female'
  // Коэффициенты активности (стандартные, валидированные)
  const actMap = {0:1.2, 1:1.375, 2:1.375, 3:1.55, 4:1.55, 5:1.725, 6:1.725, 7:1.9};
  const coeff = actMap[Math.min(7, Math.max(0, Math.round(td)))] || 1.55;
  const genderOffset = gender === 'female' ? -161 : 5;
  const bmr = 10*weight + 6.25*ht - 5*age + genderOffset;
  const tdee = Math.round(bmr * coeff);
  const cutting = health.cutting || false;
  const mode = health.mode || (cutting ? 'cut' : 'maintain');
  const deficit = mode==='cut' ? 500 : 0;
  const surplus = mode==='bulk' ? 300 : 0;
  const kcal = tdee - deficit + surplus;
  // Белок: 2.2 г/кг для мужчин, 1.8 г/кг для женщин
  const protPerKg = gender === 'female' ? 1.8 : 2.2;
  const prot = Math.round(weight * protPerKg);
  // Жиры: 1.0 г/кг для мужчин, 1.1 г/кг для женщин
  const fatPerKg = gender === 'female' ? 1.1 : 1.0;
  const fat  = Math.round(weight * fatPerKg);
  // Углеводы: остаток калорий (1 г = 4 ккал), минимум 100 г
  const carbKcal = kcal - prot*4 - fat*9;
  const carb = Math.round(Math.max(100, carbKcal/4));
  // Вода: 35 мл/кг, стакан = 250 мл, мин 6, макс 16
  const water = Math.round(Math.min(16, Math.max(6, weight * 35 / 250)));
  return {kcal, prot, fat, carb, water, coeff: coeff.toFixed(2), tdee, deficit, surplus, mode, bmr: Math.round(bmr)};
}

// Расчёт норм микронутриентов — по научным данным (Academy of Nutrition, ВОЗ, AHA)
function calcMicros(weight, age, kcal){
  // КЛЕТЧАТКА: 14 г на каждые 1000 ккал (Academy of Nutrition and Dietetics, PubMed 2015)
  // Норма для мужчин 38 г/день — но реально привязываем к калоражу, мин 25, макс 45
  const targetKcal = kcal || health.kcal || 2500;
  const fiber = Math.round(Math.min(45, Math.max(25, targetKcal / 1000 * 14)));
  // САХАР: ВОЗ <10% от суточных ккал = <10% от kcal / 4 (1 г сахара = 4 ккал)
  // AHA для мужчин — жёстче: ≤36 г добавленного сахара. Берём 10% ккал, макс 50г
  const sugar = Math.round(Math.min(50, Math.max(20, targetKcal * 0.10 / 4)));
  // СОЛЬ: ВОЗ — строго < 5 г/день для всех взрастов и уровней активности
  // Спортсменам можно чуть больше (~5-6 г) из-за потерь с потом, но не >7 г
  const trainDays = health.trainDays || 4;
  const salt = +(Math.min(6, Math.max(4.5, 4.5 + (trainDays >= 4 ? 0.5 : 0))).toFixed(1));
  return {fiber, sugar, salt};
}

function showKBZHURecalc(weight){
  const block=document.getElementById('kbzhuRecalcBlock');
  const vals=document.getElementById('kbzhuRecalcValues');
  const wval=document.getElementById('recalcWeightVal');
  if(!block||!vals||!wval){return;}
  const k=calcKBZHU(weight);
  const mc=calcMicros(weight, health.age||17, k.kcal);
  const age=health.age||17;
  const ht=health.height||181.5;
  const cutting=health.cutting||false;
  const mode=health.mode||(cutting?'cut':'maintain');
  const gender=health.gender||'male';
  const genderLabel=gender==='female'
    ?`<span style="color:#f472b6;font-family:var(--mono);font-size:9px;background:rgba(244,114,182,0.1);border:1px solid rgba(244,114,182,0.2);border-radius:6px;padding:1px 7px">♀ жен</span>`
    :`<span style="color:#60a5fa;font-family:var(--mono);font-size:9px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);border-radius:6px;padding:1px 7px">♂ муж</span>`;
  const modeLabel=mode==='cut'
    ?`<span style="color:#f472b6;font-family:var(--mono);font-size:9px;background:rgba(244,114,182,0.12);border:1px solid rgba(244,114,182,0.3);border-radius:6px;padding:1px 7px">✂ СУШКА −${k.deficit} ккал</span>`
    :mode==='bulk'
    ?`<span style="color:#fb923c;font-family:var(--mono);font-size:9px;background:rgba(251,146,60,0.12);border:1px solid rgba(251,146,60,0.3);border-radius:6px;padding:1px 7px">⬆ НАБОР +${k.surplus} ккал</span>`
    :`<span style="color:#34d399;font-family:var(--mono);font-size:9px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);border-radius:6px;padding:1px 7px">◎ ПОДДЕРЖАНИЕ</span>`;
  wval.innerHTML=`${weight} кг · ${age} лет · ${ht} см · ${health.trainDays} тр/нед · ×${k.coeff} &nbsp;${genderLabel} &nbsp;${modeLabel}`;
  vals.innerHTML=
    `<div style="font-family:var(--mono);font-size:10px;color:var(--t2);margin-bottom:6px">BMR: <b style="color:var(--t)">${k.bmr} ккал</b> &nbsp;·&nbsp; TDEE: <b style="color:var(--t)">${k.tdee} ккал</b>${mode==='cut'?' &nbsp;→ &nbsp;'+t('health_def2')+' <b style="color:#f472b6">−'+k.deficit+'</b>':mode==='bulk'?' &nbsp;→ &nbsp;'+t('health_sur2')+' <b style="color:#fb923c">+'+k.surplus+'</b>':''}</div>`+
    `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px">`+
    `<span>${t('health_kcal')}: <b style="color:#e2e2e2">${k.kcal}</b> ${t('health_kcal_unit')||'ккал'}</span>`+
    `<span>Белок: <b style="color:var(--blue)">${k.prot}</b> г</span>`+
    `<span>Жиры: <b style="color:var(--amber)">${k.fat}</b> г</span>`+
    `<span>Углеводы: <b style="color:var(--purple)">${k.carb}</b> г</span>`+
    `<span>Вода: <b style="color:#38bdf8">${k.water}</b> ст.</span>`+
    `</div>`+
    `<div style="padding-top:6px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:10px;flex-wrap:wrap">`+
    `<span>${t('health_fiber')}: <b style="color:#34d399">${mc.fiber}</b> г</span>`+
    `<span>${t('health_sugar')} ≤<b style="color:#f472b6">${mc.sugar}</b> г</span>`+
    `<span>${t('health_salt')} ≤<b style="color:#fb923c">${mc.salt}</b> г</span>`+
    `</div>`;
  block.dataset.weight=weight;
  block.dataset.kcal=k.kcal;block.dataset.prot=k.prot;block.dataset.fat=k.fat;block.dataset.carb=k.carb;block.dataset.water=k.water;
  block.dataset.fiber=mc.fiber;block.dataset.sugar=mc.sugar;block.dataset.salt=mc.salt;
}

function toggleGender(){
  health.gender = health.gender==='female' ? 'male' : 'female';
  LS.s('health',health);
  updateGenderUI();
  // Update gender cell in physCard without full re-render (avoids resetting height/age inputs)
  const gCell = document.getElementById('physCardGenderCell');
  if(gCell){
    const g = health.gender;
    const gIcon = g==='female'?'♀':'♂';
    const gLabel = g==='female'?'жен':'муж';
    const gBg = g==='female'?'rgba(244,114,182,0.15)':'rgba(96,165,250,0.15)';
    const gBorder = g==='female'?'rgba(244,114,182,0.5)':'rgba(96,165,250,0.5)';
    const gColor = g==='female'?'#f472b6':'#60a5fa';
    gCell.style.background = gBg;
    gCell.style.borderColor = gBorder;
    const gText = gCell.querySelector('.phys-gender-text');
    if(gText){ gText.style.color=gColor; gText.textContent=gIcon+' '+gLabel; }
  }
  const wInpVal=parseFloat(document.getElementById('wInp')?.value)||0;
  const w=weights.length?weights[weights.length-1].val:0;
  const weight=wInpVal>=30?wInpVal:(w>=30?w:0);
  if(weight) showKBZHURecalc(weight);
}
function updateGenderUI(){
  const g=health.gender||'male';
  const icon=document.getElementById('genderIcon');
  const label=document.getElementById('genderLabel');
  const tgl=document.getElementById('genderToggle');
  if(icon) icon.textContent = g==='female' ? '♀' : '♂';
  if(label) label.textContent = g==='female' ? 'жен' : 'муж';
  if(tgl){
    tgl.style.borderColor = g==='female' ? 'rgba(244,114,182,0.45)' : 'rgba(96,165,250,0.35)';
    tgl.style.background = g==='female' ? 'rgba(244,114,182,0.1)' : 'var(--c2)';
    if(icon) icon.style.color = g==='female' ? '#f472b6' : '#60a5fa';
    if(label) label.style.color = g==='female' ? '#f472b6' : '#60a5fa';
  }
}
function setBodyMode(mode){
  health.mode=mode;
  health.cutting=(mode==='cut');
  LS.s('health',health);
  updateCuttingUI();
  const w=weights.length?weights[weights.length-1].val:0;
  const wInpVal=parseFloat(document.getElementById('wInp')?.value)||0;
  const weight=wInpVal>=30?wInpVal:(w>=30?w:0);
  if(weight){
    const block=document.getElementById('kbzhuRecalcBlock');
    if(block)block.style.display='block';
    showKBZHURecalc(weight);
  }
}
function toggleCutting(){
  const cur=health.mode||(health.cutting?'cut':'maintain');
  setBodyMode(cur==='maintain'?'cut':cur==='cut'?'bulk':'maintain');
}
function updateCuttingUI(){
  const mode=health.mode||(health.cutting?'cut':'maintain');
  // pill buttons
  const modes=['maintain','cut','bulk'];
  const modeColors={maintain:'#34d399',cut:'#f472b6',bulk:'#fb923c'};
  modes.forEach(m=>{
    const btn=document.getElementById('modeBtn_'+m);
    if(!btn)return;
    const isActive=m===mode;
    const c=modeColors[m];
    btn.style.borderColor=isActive?c+'88':'var(--bd)';
    btn.style.background=isActive?c+'1a':'var(--c2)';
    btn.style.color=isActive?c:'var(--t2)';
  });
  // legacy label (may not exist)
  const lbl=document.getElementById('cuttingLabel');
  if(lbl){
    if(mode==='cut') lbl.innerHTML=`<span style="color:#f472b6">✂ ${t('health_cut')}</span>`;
    else if(mode==='bulk') lbl.innerHTML=`<span style="color:#fb923c">⬆ ${t('health_bulk')}</span>`;
    else lbl.innerHTML=`<span style="color:#34d399">◎ ${t('health_maintain')}</span>`;
  }
  const desc=document.getElementById('cuttingDesc');
  if(desc){
    if(mode==='cut') desc.textContent='Дефицит −500 ккал/день → ~0.5 кг жира в неделю';
    else if(mode==='bulk') desc.textContent='Профицит +300 ккал/день → ~0.3 кг мышц в неделю';
    else desc.textContent='Ешь на уровне TDEE, без дефицита';
  }
  // legacy tgl (may not exist)
  const tgl=document.getElementById('cuttingTgl');
  if(tgl){
    tgl.className='tgl'+(mode!=='maintain'?' on':'');
    tgl.style.background=mode==='cut'?'rgba(244,114,182,0.15)':mode==='bulk'?'rgba(251,146,60,0.15)':'';
    tgl.style.borderColor=mode==='cut'?'rgba(244,114,182,0.45)':mode==='bulk'?'rgba(251,146,60,0.45)':'';
  }
}
function applyRecalcKBZHU(){
  const block=document.getElementById('kbzhuRecalcBlock');
  if(!block) return;
  health.kcal=+block.dataset.kcal;
  health.prot=+block.dataset.prot;
  health.fat=+block.dataset.fat;
  health.carb=+block.dataset.carb;
  if(block.dataset.water) health.water=+block.dataset.water;
  if(block.dataset.fiber) health.fiber=+block.dataset.fiber;
  if(block.dataset.sugar) health.sugar=+block.dataset.sugar;
  if(block.dataset.salt)  health.salt=+block.dataset.salt;
  LS.s('health',health);
  block.style.display='none';
  flash(t('health_updated'));
  renderHealth();
}

function logWeight(){
  const val=parseFloat(document.getElementById('wInp').value);
  if(isNaN(val)||val<30)return;
  weights.push({date:nowDK(),val});
  LS.s('weights',weights);
  document.getElementById('wInp').value='';
  flash('Вес '+val+' кг сохранён');
  renderHealth();
  showKBZHURecalc(val);
}
// ── ИМТ helpers ──────────────────────────────────────────────────
function calcBMI(weight){
  const hm=(health.height||181.5)/100;
  return weight/(hm*hm);
}
// Зоны: ожирение красный | избыток оранжевый | норма+лёгкий недовес (до ~8% ниже 18.5) зелёный | недовес оранжевый | тяжёлый недовес красный
function getBmiColor(bmi){
  if(bmi>=30)   return '#ef4444'; // ожирение
  if(bmi>=25)   return '#f97316'; // избыток
  if(bmi>=17.0) return '#4ade80'; // норма + лёгкий недовес
  if(bmi>=16.0) return '#f97316'; // недовес
  return '#ef4444';               // тяжёлый недовес
}
function getBmiZone(bmi){
  if(bmi>=30)   return 'ожирение';
  if(bmi>=25)   return 'избыток веса';
  if(bmi>=18.5) return 'норма';
  if(bmi>=17.0) return 'лёгкий недовес';
  if(bmi>=16.0) return 'недовес';
  return 'тяжёлый недовес';
}

function renderWeightChart(){
  const wrap=document.getElementById('wWrap'),canvas=document.getElementById('wChart'),labels=document.getElementById('wLabels');
  if(!weights.length){if(wrap)wrap.style.display='none';if(labels)labels.innerHTML='';// убрать бейдж ИМТ если нет данных
    const old=document.getElementById('bmiTag');if(old)old.remove();return;}
  if(!canvas)return;
  if(wrap)wrap.style.display='block';
  const last=weights.slice(-14);
  const vals=last.map(w=>w.val);
  const xlabels=last.map(w=>{const p=w.date.split('-');return`${p[2]}/${+p[1]+1}`;});
  const bmiColors=vals.map(v=>getBmiColor(calcBMI(v)));
  drawWeightLine(canvas,vals,xlabels,labels,Math.min(...vals)-2,health.wMin,health.wMax,bmiColors);
  // Бейдж текущего ИМТ
  const lastW=weights[weights.length-1].val;
  const bmi=calcBMI(lastW);
  const bmiColor=getBmiColor(bmi);
  const bmiZone=getBmiZone(bmi);
  let bmiEl=document.getElementById('bmiTag');
  if(!bmiEl){
    bmiEl=document.createElement('div');
    bmiEl.id='bmiTag';
    bmiEl.style.cssText='font-family:var(--mono);font-size:11px;margin-top:7px;display:flex;align-items:center;gap:6px;flex-wrap:wrap';
    if(wrap)wrap.after(bmiEl);
  }
  bmiEl.innerHTML=`<span style="color:var(--t3);letter-spacing:.5px">ИМТ</span>`+
    `<span style="font-weight:700;color:${bmiColor};font-size:14px">${bmi.toFixed(1)}</span>`+
    `<span style="color:${bmiColor};background:${bmiColor}22;border:1px solid ${bmiColor}55;border-radius:8px;padding:1px 9px;letter-spacing:.5px">${bmiZone}</span>`;
}

// Оригинальный drawLine остаётся для финансовых графиков
function drawLine(canvas,data,xlabels,labelsEl,forceMin,tMin,tMax){const dpr=window.devicePixelRatio||1;const W=canvas.parentElement.clientWidth||300,H=90;canvas.width=W*dpr;canvas.height=H*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const pad={t:6,r:6,b:3,l:24};const cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;ctx.clearRect(0,0,W,H);if(!data.length)return;const minV=forceMin!==undefined?forceMin:Math.max(0,Math.min(...data)-5);const maxV=Math.max(...data)+4;const range=maxV-minV||1;const xStep=cw/(Math.max(data.length-1,1));if(tMin!==undefined){const y1=pad.t+ch-(((tMax-minV)/range)*ch),y2=pad.t+ch-(((tMin-minV)/range)*ch);ctx.fillStyle='rgba(45,212,191,0.07)';ctx.fillRect(pad.l,y1,cw,y2-y1);}for(let i=0;i<=3;i++){const y=pad.t+(ch/3)*i;ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();const v=maxV-((maxV-minV)/3)*i;ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='8px DM Mono,monospace';ctx.textAlign='right';ctx.fillText(Math.round(v*10)/10,pad.l-2,y+3);}const pts=data.map((v,i)=>({x:pad.l+i*xStep,y:pad.t+ch-(((v-minV)/range)*ch)}));ctx.beginPath();ctx.moveTo(pts[0].x,pad.t+ch);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,pad.t+ch);ctx.closePath();ctx.fillStyle='rgba(45,212,191,0.06)';ctx.fill();ctx.beginPath();ctx.strokeStyle='#2dd4bf';ctx.lineWidth=1.5;ctx.lineJoin='round';pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.stroke();pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fillStyle='#2dd4bf';ctx.fill();});if(labelsEl){const step=Math.max(1,Math.ceil(xlabels.length/6));labelsEl.innerHTML=xlabels.filter((_,i)=>i%step===0||i===xlabels.length-1).map(l=>`<div class="lc-lbl">${l}</div>`).join('');}}

// График веса с ИМТ-раскраской
function drawWeightLine(canvas,data,xlabels,labelsEl,forceMin,tMin,tMax,bmiColors){
  const dpr=window.devicePixelRatio||1;
  const W=canvas.parentElement.clientWidth||300,H=100;
  canvas.width=W*dpr;canvas.height=H*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const pad={t:8,r:6,b:3,l:28};
  const cw=W-pad.l-pad.r,ch=H-pad.t-pad.b;
  ctx.clearRect(0,0,W,H);
  if(!data.length)return;
  const minV=forceMin!==undefined?forceMin:Math.max(0,Math.min(...data)-5);
  const maxV=Math.max(...data)+4;
  const range=maxV-minV||1;
  const xStep=cw/(Math.max(data.length-1,1));
  const toY=v=>pad.t+ch-(((v-minV)/range)*ch);

  // Целевая зона веса
  if(tMin!==undefined){
    const y1=toY(tMax),y2=toY(tMin);
    ctx.fillStyle='rgba(45,212,191,0.07)';
    ctx.fillRect(pad.l,y1,cw,y2-y1);
  }

  // Горизонтальные линии ИМТ-границ (переводим ИМТ → вес)
  const hm=(health.height||181.5)/100,h2=hm*hm;
  const bmiThresholds=[
    {bmi:30,color:'rgba(239,68,68,0.35)',  label:'ИМТ 30'},
    {bmi:25,color:'rgba(249,115,22,0.35)', label:'ИМТ 25'},
    {bmi:18.5,color:'rgba(74,222,128,0.35)',label:'ИМТ 18.5'},
    {bmi:17,  color:'rgba(249,115,22,0.35)',label:'ИМТ 17'},
    {bmi:16,  color:'rgba(239,68,68,0.35)', label:'ИМТ 16'},
  ];
  ctx.font='7px DM Mono,monospace';
  bmiThresholds.forEach(t=>{
    const wAtBmi=t.bmi*h2;
    if(wAtBmi<minV||wAtBmi>maxV)return;
    const y=toY(wAtBmi);
    ctx.save();
    ctx.strokeStyle=t.color;ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();
    ctx.restore();
    ctx.fillStyle=t.color.replace(/[\d.]+\)$/,'0.7)');
    ctx.textAlign='left';
    ctx.fillText(t.label,pad.l+2,y-2);
  });

  // Сетка и Y-метки
  for(let i=0;i<=3;i++){
    const y=pad.t+(ch/3)*i;
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();
    const v=maxV-((maxV-minV)/3)*i;
    ctx.fillStyle='rgba(255,255,255,0.22)';ctx.font='8px DM Mono,monospace';ctx.textAlign='right';
    ctx.fillText(Math.round(v*10)/10,pad.l-3,y+3);
  }

  const pts=data.map((v,i)=>({
    x:pad.l+i*xStep,
    y:toY(v),
    c:bmiColors?bmiColors[i]:'#2dd4bf'
  }));

  // Заливка под линией (нейтральная)
  ctx.beginPath();
  ctx.moveTo(pts[0].x,pad.t+ch);
  pts.forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x,pad.t+ch);
  ctx.closePath();
  ctx.fillStyle='rgba(74,222,128,0.04)';
  ctx.fill();

  // Сегментная раскраска линии с интерполяцией на границах
  ctx.lineWidth=2;ctx.lineJoin='round';ctx.lineCap='round';
  for(let i=0;i<pts.length-1;i++){
    const p1=pts[i],p2=pts[i+1];
    if(p1.c===p2.c){
      ctx.beginPath();ctx.strokeStyle=p1.c;
      ctx.shadowColor=p1.c;ctx.shadowBlur=5;
      ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();
      ctx.shadowBlur=0;
    } else {
      // Разбить сегмент на середине при смене зоны
      const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2;
      ctx.beginPath();ctx.strokeStyle=p1.c;ctx.shadowColor=p1.c;ctx.shadowBlur=5;
      ctx.moveTo(p1.x,p1.y);ctx.lineTo(mx,my);ctx.stroke();ctx.shadowBlur=0;
      ctx.beginPath();ctx.strokeStyle=p2.c;ctx.shadowColor=p2.c;ctx.shadowBlur=5;
      ctx.moveTo(mx,my);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.shadowBlur=0;
    }
  }

  // Точки
  pts.forEach(p=>{
    ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);
    ctx.fillStyle=p.c;ctx.shadowColor=p.c;ctx.shadowBlur=7;
    ctx.fill();ctx.shadowBlur=0;
  });

  if(labelsEl){
    const step=Math.max(1,Math.ceil(xlabels.length/6));
    labelsEl.innerHTML=xlabels.filter((_,i)=>i%step===0||i===xlabels.length-1).map(l=>`<div class="lc-lbl">${l}</div>`).join('');
  }
}


// ── SLEEP REMINDER ───────────────────────────────────────
function saveSleepRem(){
  const timeEl=document.getElementById('sleepRemTime');
  const tglEl=document.getElementById('sleepRemTgl');
  const rem=LS.g('sleepRem',{on:false,time:'22:30'});
  if(timeEl)rem.time=timeEl.value||'22:30';
  LS.s('sleepRem',rem);
  if(rem.on&&Notification.permission==='granted'&&typeof scheduleSleepRem==='function')scheduleSleepRem();
}
function toggleSleepRem(){
  const rem=LS.g('sleepRem',{on:false,time:'22:30'});
  if(!rem.on&&Notification.permission!=='granted'){
    Notification.requestPermission().then(p=>{
      if(p==='granted'){rem.on=true;LS.s('sleepRem',rem);_applySleepRemUI(rem);if(typeof scheduleSleepRem==='function')scheduleSleepRem();}
    });
    return;
  }
  rem.on=!rem.on;
  LS.s('sleepRem',rem);
  _applySleepRemUI(rem);
  if(rem.on&&typeof scheduleSleepRem==='function')scheduleSleepRem();
}
function _applySleepRemUI(rem){
  const tgl=document.getElementById('sleepRemTgl');
  if(tgl)tgl.className='tgl'+(rem.on?' on':'');
}
