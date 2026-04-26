// ═══ MODULE: finance.js ═══
// ══ FINANCE ════════════════════════════════════════════
let finPeriod='month'; // 'month' | 'year'
let _finEntryType='income';
let _finTplPeriod='week';
let _finTplType='income';

function finSetPeriod(p){
  finPeriod=p;
  ["month","year"].forEach(k=>{
    const id="fin"+k.charAt(0).toUpperCase()+k.slice(1)+"Btn";
    const btn=document.getElementById(id);
    if(!btn)return;
    btn.style.background=p===k?"var(--a2)":"";
    btn.style.borderColor=p===k?"var(--ab)":"";
    btn.style.color=p===k?"var(--a)":"";
  });
  renderFinChart();
}

function finDayKey(d){return dk(d);}

function renderFinance(){
  renderFinDayLog();
  renderFinTpl('week');
  renderFinTpl('month');
  renderFinTpl('month3');
  renderFinTpl('year');
  renderFinPurchases();
  renderFinDebts();
  setTimeout(renderFinChart,50);
  setTimeout(renderFinPie,80);
}

function renderFinChart(){
  const canvas=document.getElementById('finChart');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const W=canvas.parentElement.clientWidth-20;
  const H=160;
  canvas.width=W*dpr;canvas.height=H*dpr;
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.scale(dpr,dpr);

  const now=new Date();
  let days=[];
  let labels=[];
  if(finPeriod==='month'){
    const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    for(let i=1;i<=daysInMonth;i++){const d=new Date(now.getFullYear(),now.getMonth(),i);days.push(d);}
    labels=days.map(d=>d.getDate()%5===0?String(d.getDate()):'');
  } else {
    // year — 12 months aggregated
    const MONTHS_RU=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);days.push(d);}
    labels=days.map(d=>MONTHS_RU[d.getMonth()]);
  }

  let income,expense;
  if(finPeriod==='year'){
    income=days.map(d=>{
      const y=d.getFullYear(),m=d.getMonth();
      return Object.keys(finLog).filter(k=>{const p=k.split('-');return +p[0]===y&&+p[1]===m;})
        .reduce((s,k)=>s+(finLog[k]||[]).filter(e=>e.type==='income').reduce((a,e)=>a+e.amount,0),0);
    });
    expense=days.map(d=>{
      const y=d.getFullYear(),m=d.getMonth();
      return Object.keys(finLog).filter(k=>{const p=k.split('-');return +p[0]===y&&+p[1]===m;})
        .reduce((s,k)=>s+(finLog[k]||[]).filter(e=>e.type==='expense').reduce((a,e)=>a+e.amount,0),0);
    });
  } else {
    income=days.map(d=>(finLog[finDayKey(d)]||[]).filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0));
    expense=days.map(d=>(finLog[finDayKey(d)]||[]).filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0));
  }
  const maxVal=Math.max(...income,...expense,1);

  // Update balance display
  const totalIncome=income.reduce((s,v)=>s+v,0);
  const totalExpense=expense.reduce((s,v)=>s+v,0);
  const balance=totalIncome-totalExpense;
  const balEl=document.getElementById('finBalanceVal');
  if(balEl){
    const fmt=v=>v.toLocaleString('ru-RU',{maximumFractionDigits:0})+' ₽';
    balEl.textContent=(balance>0?'+':'')+fmt(balance);
    balEl.style.color=balance>0?'#4ade80':balance<0?'#f87171':'var(--t2)';
  }

  const pad={l:8,r:8,t:16,b:26};
  const cW=W-pad.l-pad.r;
  const cH=H-pad.t-pad.b;
  const n=days.length;

  ctx.clearRect(0,0,W,H);

  const isLight=document.body.classList.contains('light');
  const gridColor=isLight?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)';
  const labelColor=isLight?'rgba(80,80,80,0.7)':'rgba(160,160,160,0.7)';
  // Grid lines
  for(let i=0;i<=4;i++){
    const y=pad.t+cH*(1-i/4);
    ctx.strokeStyle=gridColor;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
    if(i>0){
      ctx.fillStyle=labelColor;ctx.font='7px DM Mono,monospace';ctx.textAlign='left';
      ctx.fillText(Math.round(maxVal*i/4/1000)+'k',pad.l+2,y-2);
    }
  }

  function hexToRgba(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}
  function drawLine(vals,color){
    if(vals.every(v=>v===0))return;
    // gradient fill — almost invisible
    const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+cH);
    grad.addColorStop(0,hexToRgba(color,0.25));
    grad.addColorStop(0.6,hexToRgba(color,0.08));
    grad.addColorStop(1,hexToRgba(color,0));
    ctx.globalAlpha=1;
    ctx.beginPath();
    let first=true;
    vals.forEach((v,i)=>{
      const x=pad.l+(n<=1?cW/2:cW/(n-1)*i);
      const y=pad.t+cH*(1-v/maxVal);
      if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);
    });
    // close area
    ctx.lineTo(pad.l+(n<=1?cW/2:cW/(n-1)*(n-1)),pad.t+cH);
    ctx.lineTo(pad.l,pad.t+cH);
    ctx.closePath();
    ctx.fillStyle=grad;ctx.fill();
    ctx.globalAlpha=1;

    // line — sharp and clear
    ctx.beginPath();first=true;
    vals.forEach((v,i)=>{
      const x=pad.l+(n<=1?cW/2:cW/(n-1)*i);
      const y=pad.t+cH*(1-v/maxVal);
      if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y);
    });
    ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();

    // dots
    vals.forEach((v,i)=>{
      const x=pad.l+(n<=1?cW/2:cW/(n-1)*i);
      const y=pad.t+cH*(1-v/maxVal);
      ctx.beginPath();ctx.arc(x,y,v>0?4:2,0,Math.PI*2);
      ctx.fillStyle=v>0?color:'rgba(160,160,160,0.2)';ctx.fill();
      if(v>0){const bgColor=getComputedStyle(document.body).getPropertyValue('--bg').trim()||'#0a0a0a';ctx.strokeStyle=bgColor;ctx.lineWidth=1.5;ctx.stroke();}
    });
  }

  drawLine(income,'#4ade80');
  drawLine(expense,'#f87171');

  // X labels
  ctx.fillStyle=labelColor;ctx.textAlign='center';
  labels.forEach((lbl,i)=>{
    if(!lbl)return;
    const x=pad.l+(n<=1?cW/2:cW/(n-1)*i);
    ctx.font=`${finPeriod==='year'?8:8}px DM Mono,monospace`;
    ctx.fillText(lbl,x,H-6);
  });

  // Today marker
  const todayKey=finDayKey(now);
  const todayIdx=days.findIndex(d=>finDayKey(d)===todayKey);
  if(todayIdx>=0){
    const x=pad.l+(n<=1?cW/2:cW/(n-1)*todayIdx);
    ctx.strokeStyle='rgba(45,212,191,0.35)';ctx.lineWidth=1;ctx.setLineDash([2,3]);
    ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+cH);ctx.stroke();ctx.setLineDash([]);
  }
}

function renderFinDayLog(){
  const key=nowDK();
  const entries=finLog[key]||[];
  const el=document.getElementById('finDayLog');if(!el)return;
  if(!entries.length){el.innerHTML='<div style="font-size:12px;color:var(--t3);font-family:var(--mono)">'+t('finEmpty')+'</div>';return;}
  const totalIncome=entries.filter(e=>e.type==='income').reduce((s,e)=>s+e.amount,0);
  const totalExpense=entries.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0);
  const balance=totalIncome-totalExpense;
  let html=`<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    <div style="flex:1;min-width:80px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:rgba(74,222,128,0.7);letter-spacing:1px">${t('income')}</div>
      <div style="font-family:var(--mono);font-size:16px;color:#4ade80;margin-top:2px">+${totalIncome.toLocaleString('ru')} ₽</div>
    </div>
    <div style="flex:1;min-width:80px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:rgba(248,113,113,0.7);letter-spacing:1px">${t('expense')}</div>
      <div style="font-family:var(--mono);font-size:16px;color:#f87171;margin-top:2px">−${totalExpense.toLocaleString('ru')} ₽</div>
    </div>
    <div style="flex:1;min-width:80px;background:${balance>=0?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)'};border:1px solid ${balance>=0?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'};border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px">${t('balance')}</div>
      <div style="font-family:var(--mono);font-size:16px;color:${balance>=0?'#4ade80':'#f87171'};margin-top:2px">${balance>=0?'+':''}${balance.toLocaleString('ru')} ₽</div>
    </div>
  </div>`;
  html+=entries.map(e=>`
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd)">
      <div style="width:6px;height:6px;border-radius:50%;background:${e.type==='income'?'#4ade80':'#f87171'};flex-shrink:0"></div>
      <div style="flex:1;font-size:13px">${e.desc||'—'}</div>
      <div style="font-family:var(--mono);font-size:12px;color:${e.type==='income'?'#4ade80':'#f87171'};flex-shrink:0">${e.type==='income'?'+':'−'}${e.amount.toLocaleString('ru')} ₽</div>
      <button onclick="openFinEditModal('${key}',${e.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:2px 4px;line-height:1;flex-shrink:0" title="Изменить"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

    </div>`).join('');
  el.innerHTML=html;
}

function delFinEntry(key,id){
  if(!finLog[key])return;
  finLog[key]=finLog[key].filter(e=>e.id!==id);
  LS.s('finLog',finLog);
  renderFinDayLog();
  renderFinChart();
}

let _finEditKey=null,_finEditId=null;
function openFinEditModal(key,id){
  const entries=finLog[key]||[];
  const e=entries.find(x=>x.id===id);
  if(!e)return;
  _finEditKey=key;_finEditId=id;
  document.getElementById('finEditType').value=e.type;
  document.getElementById('finEditAmount').value=e.amount;
  document.getElementById('finEditDesc').value=e.desc||'';
  const titleEl=document.getElementById('finEditTitle');
  if(titleEl)titleEl.textContent=e.type==='income'?'изменить доход':'изменить расход';
  const amtLabel=document.getElementById('finEditAmtLabel');
  if(amtLabel)amtLabel.style.color=e.type==='income'?'#4ade80':'#f87171';
  openModal('finEditModal');
  setTimeout(()=>document.getElementById('finEditAmount').focus(),100);
}
function closeFinEditModal(){closeModal('finEditModal');_finEditKey=null;_finEditId=null;}
function confirmFinEdit(){
  if(!_finEditKey||!_finEditId)return;
  const entries=finLog[_finEditKey]||[];
  const e=entries.find(x=>x.id===_finEditId);
  if(!e){closeFinEditModal();return;}
  const amt=parseFloat(document.getElementById('finEditAmount').value);
  if(isNaN(amt)||amt<0)return;
  e.amount=amt;
  e.desc=document.getElementById('finEditDesc').value.trim()||e.desc;
  LS.s('finLog',finLog);
  closeFinEditModal();
  renderFinDayLog();
  renderFinChart();
  flash('✓ Запись обновлена');
}

function renderFinTpl(period){
  const el=document.getElementById('fin'+period.charAt(0).toUpperCase()+period.slice(1)+'Tpl');
  if(!el)return;
  const tpl=finTpl[period]||{income:[],expense:[]};
  const incomeTotal=tpl.income.reduce((s,x)=>s+x.amount,0);
  const expenseTotal=tpl.expense.reduce((s,x)=>s+x.amount,0);
  const balance=incomeTotal-expenseTotal;
  // Always show summary widgets
  let html=`<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    <div style="flex:1;min-width:80px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:rgba(74,222,128,0.7);letter-spacing:1px">${t('income')}</div>
      <div style="font-family:var(--mono);font-size:15px;color:#4ade80;margin-top:2px">+${incomeTotal.toLocaleString('ru')} ₽</div>
    </div>
    <div style="flex:1;min-width:80px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:rgba(248,113,113,0.7);letter-spacing:1px">${t('expense')}</div>
      <div style="font-family:var(--mono);font-size:15px;color:#f87171;margin-top:2px">−${expenseTotal.toLocaleString('ru')} ₽</div>
    </div>
    <div style="flex:1;min-width:80px;background:${balance>=0?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)'};border:1px solid ${balance>=0?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'};border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px">${t('balance')}</div>
      <div style="font-family:var(--mono);font-size:15px;color:${balance>=0?'#4ade80':'#f87171'};margin-top:2px">${balance>=0?'+':''}${balance.toLocaleString('ru')} ₽</div>
    </div>
  </div>`;
  if(!tpl.income.length&&!tpl.expense.length){
    html+=`<div style="font-size:12px;color:var(--t3);font-family:var(--mono)">${t('finTplEmpty')}</div>`;
    el.innerHTML=html;return;
  }
  if(tpl.income.length){
    html+=`<div style="font-family:var(--mono);font-size:8px;color:#4ade80;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px">${t('income')}</div>`;
    html+=tpl.income.map(x=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(74,222,128,0.07);${x.paid?'opacity:.55':''}">
        <div style="width:5px;height:5px;border-radius:50%;background:${x.paid?'var(--a)':'#4ade80'};flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;${x.paid?'text-decoration:line-through;color:var(--t2)':''}">${x.name}</div>
        <div style="font-family:var(--mono);font-size:11px;color:${x.paid?'var(--a)':'#4ade80'}">${x.paid?'✓ получено':'+'+x.amount.toLocaleString('ru')+' ₽'}</div>
        ${!x.paid?`<button onclick="toggleFinTplPaid('${period}','income',${x.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">оплачено</button>`:`<button onclick="toggleFinTplPaid('${period}','income',${x.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t3);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">отменить</button>`}
        <button onclick="openFinTplEdit('${period}','income',${x.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:1px 3px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

      </div>`).join('');
  }
  if(tpl.expense.length){
    html+=`<div style="font-family:var(--mono);font-size:8px;color:#f87171;letter-spacing:1px;text-transform:uppercase;margin:${tpl.income.length?'10px':0} 0 5px">${t('expense')}</div>`;
    html+=tpl.expense.map(x=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(248,113,113,0.07);${x.paid?'opacity:.55':''}">
        <div style="width:5px;height:5px;border-radius:50%;background:${x.paid?'var(--a)':'#f87171'};flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;${x.paid?'text-decoration:line-through;color:var(--t2)':''}">${x.name}</div>
        <div style="font-family:var(--mono);font-size:11px;color:${x.paid?'var(--a)':'#f87171'}">${x.paid?'✓ оплачено':'−'+x.amount.toLocaleString('ru')+' ₽'}</div>
        ${!x.paid?`<button onclick="toggleFinTplPaid('${period}','expense',${x.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">оплачено</button>`:`<button onclick="toggleFinTplPaid('${period}','expense',${x.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t3);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">отменить</button>`}
        <button onclick="openFinTplEdit('${period}','expense',${x.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:1px 3px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

      </div>`).join('');
  }
  el.innerHTML=html;
}

function delFinTpl(period,type,id){
  finTpl[period][type]=finTpl[period][type].filter(x=>x.id!==id);
  LS.s('finTpl',finTpl);
  renderFinTpl(period);
}

function toggleFinTplPaid(period,type,id){
  const item=(finTpl[period]&&finTpl[period][type]||[]).find(x=>x.id===id);
  if(item){item.paid=!item.paid;LS.s("finTpl",finTpl);renderFinTpl(period);}
}

function renderFinPurchases(){
  const el=document.getElementById('finPurchases');if(!el)return;
  if(!finPurchases.length){
    el.innerHTML='<div class="card" style="padding:10px 12px;font-size:12px;color:var(--t3);font-family:var(--mono)">'+t('finPurchasesEmpty')+'</div>';
    return;
  }
  const now=new Date();
  // Считаем итог с диапазонами
  const unpaid=finPurchases.filter(p=>!p.paid);
  const totalMin=unpaid.reduce((s,p)=>s+(p.priceMin||p.price||0),0);
  const totalMax=unpaid.reduce((s,p)=>s+(p.priceMax&&p.priceMax>0?p.priceMax:(p.priceMin||p.price||0)),0);
  const hasRanges=unpaid.some(p=>p.priceMax&&p.priceMax>0);
  const totalHtml=unpaid.length?`<div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
    <div style="font-size:16px">🛒</div>
    <div>
      <div style="font-family:var(--mono);font-size:8px;color:rgba(251,191,36,0.7);letter-spacing:1px;text-transform:uppercase">итого (не куплено)</div>
      <div style="font-family:var(--mono);font-size:15px;color:var(--amber);margin-top:2px">${hasRanges?(totalMin.toLocaleString('ru')+' – '+totalMax.toLocaleString('ru')+' ₽'):'~'+totalMin.toLocaleString('ru')+' ₽'}</div>
    </div>
  </div>`:'';
  el.innerHTML=totalHtml+finPurchases.map(p=>{
    const pMin=p.priceMin||p.price||0;
    const pMax=p.priceMax&&p.priceMax>0?p.priceMax:0;
    const priceLabel=pMax>0?(pMin.toLocaleString('ru')+' – '+pMax.toLocaleString('ru')+' ₽'):'~'+pMin.toLocaleString('ru')+' ₽';
    const days=p.date?Math.ceil((new Date(p.date)-now)/(1000*60*60*24)):null;
    const _yrs=days!==null?(days/365.25):null;
    const _yrsLabel=_yrs!==null?(_yrs>=1?(_yrs%1<0.05||_yrs%1>0.95?Math.round(_yrs)+' лет':_yrs.toFixed(1)+' г.'):(Math.round(days)+' дн.')):null;
    const daysLabel=days===null?''
      :days<0?'<span style="color:var(--red);font-family:var(--mono);font-size:10px">просрочено</span>'
      :days===0?'<span style="color:var(--a);font-family:var(--mono);font-size:10px">сегодня</span>'
      :`<span style="font-family:var(--mono);font-size:10px;color:var(--amber)">${_yrsLabel}</span>`;
    return `<div class="card" style="padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border-color:${p.paid?'rgba(45,212,191,0.15)':'rgba(255,255,255,0.08)'};opacity:${p.paid?'.55':'1'}">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:500;margin-bottom:3px;${p.paid?'text-decoration:line-through;color:var(--t2)':''}">${p.name}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:13px;color:${p.paid?'var(--a)':'var(--amber)'}">${p.paid?'✓ куплено':priceLabel}</span>
          ${!p.paid&&p.date?`<span style="font-family:var(--mono);font-size:10px;color:var(--t3)">${formatDate(p.date)}</span>`:''}
          ${!p.paid?daysLabel:''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        ${!p.paid?`<button onclick="toggleFinPurchasePaid(${p.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:3px 7px;cursor:pointer;white-space:nowrap">оплачено</button>`:`<button onclick="toggleFinPurchasePaid(${p.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t3);font-family:var(--mono);font-size:8px;padding:3px 7px;cursor:pointer;white-space:nowrap">отменить</button>`}
        <button onclick="openFinPurchaseEdit(${p.id})" style="background:none;border:none;color:var(--t3);font-size:14px;cursor:pointer;padding:2px 5px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      </div>
    </div>`;
  }).join('');
}

function toggleFinPurchasePaid(id){
  const p=finPurchases.find(x=>x.id===id);if(!p)return;
  p.paid=!p.paid;LS.s('finPurchases',finPurchases);renderFinPurchases();
}

function delFinPurchase(id){
  finPurchases=finPurchases.filter(x=>x.id!==id);
  LS.s('finPurchases',finPurchases);
  renderFinPurchases();
}

function renderFinDebts(){
  const el=document.getElementById('finDebts');if(!el)return;
  if(!finDebts.length){
    el.innerHTML=`<div class="card" style="padding:10px 12px;font-size:12px;color:var(--t3);font-family:var(--mono)">${t('finDebtsEmpty')}</div>`;
    return;
  }
  const now=new Date();
  const owe=finDebts.filter(d=>d.direction==='owe');
  const owed=finDebts.filter(d=>d.direction==='owed');
  let html='';
  function debtCard(d){
    const isOwe=d.direction==='owe';
    const color=isOwe?'#f87171':'#4ade80';
    const days=d.date?Math.ceil((new Date(d.date)-now)/(1000*60*60*24)):null;
    const _dyrs=days!==null?(days/365.25):null;
    const _dyrsLabel=_dyrs!==null?(_dyrs>=1?(_dyrs%1<0.05||_dyrs%1>0.95?Math.round(_dyrs)+' лет':_dyrs.toFixed(1)+' г.'):(Math.round(days)+' дн.')):null;
    const daysLbl=days===null?''
      :days<0?`<span style="font-family:var(--mono);font-size:9px;color:var(--red)">просрочено</span>`
      :days===0?`<span style="font-family:var(--mono);font-size:9px;color:var(--a)">сегодня</span>`
      :`<span style="font-family:var(--mono);font-size:9px;color:var(--amber)">${_dyrsLabel}</span>`;
    return `<div class="card" style="padding:12px 14px;margin-bottom:8px;border-color:${d.paid?'rgba(45,212,191,0.15)':'rgba(255,255,255,0.08)'};opacity:${d.paid?'.55':'1'}">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:500">${d.name}</div>
          ${d.desc?`<div style="font-size:11px;color:var(--t2);margin-top:1px">${d.desc}</div>`:''}
          <div style="display:flex;align-items:center;gap:8px;margin-top:3px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:13px;color:${color}">${isOwe?'−':'+'}${d.amount.toLocaleString('ru')} ₽</span>
            ${d.date?`<span style="font-family:var(--mono);font-size:10px;color:var(--t3)">${formatDate(d.date)}</span>`:''}
            ${daysLbl}
            ${d.paid?`<span style="font-family:var(--mono);font-size:9px;color:var(--a)">✓ ${t('paid')}</span>`:''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          ${!d.paid?`<button onclick="toggleFinDebtPaid(${d.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:3px 7px;cursor:pointer;white-space:nowrap">оплачено</button>`:`<button onclick="toggleFinDebtPaid(${d.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t3);font-family:var(--mono);font-size:8px;padding:3px 7px;cursor:pointer;white-space:nowrap">отменить</button>`}
          <button onclick="openFinDebtEdit(${d.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:2px 4px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

        </div>
      </div>
    </div>`;
  }
  if(owe.length){
    html+=`<div style="font-family:var(--mono);font-size:8px;color:#f87171;letter-spacing:1.5px;text-transform:uppercase;padding:4px 0 6px">${t('debtOwe')} · ${owe.filter(d=>!d.paid).reduce((s,d)=>s+d.amount,0).toLocaleString('ru')} ₽</div>`;
    html+=owe.map(debtCard).join('');
  }
  if(owed.length){
    html+=`<div style="font-family:var(--mono);font-size:8px;color:#4ade80;letter-spacing:1.5px;text-transform:uppercase;padding:${owe.length?'8px':4}px 0 6px">${t('debtOwed')} · ${owed.filter(d=>!d.paid).reduce((s,d)=>s+d.amount,0).toLocaleString('ru')} ₽</div>`;
    html+=owed.map(debtCard).join('');
  }
  el.innerHTML=html;
}

function toggleFinDebtPaid(id){
  const d=finDebts.find(x=>x.id===id);if(!d)return;
  d.paid=!d.paid;LS.s('finDebts',finDebts);renderFinDebts();
}
function delFinDebt(id){
  finDebts=finDebts.filter(x=>x.id!==id);LS.s('finDebts',finDebts);renderFinDebts();
}

let _finDebtDir='owe';
function openFinDebtModal(dir){const fdb=document.getElementById('finDebtDelBtn');if(fdb)fdb.style.display='none';
  _finDebtDir=dir;
  const isOwe=dir==='owe';
  document.getElementById('finDebtTitle').textContent=isOwe?t('debtOwe'):t('debtOwed');
  document.getElementById('finDebtName').value='';
  document.getElementById('finDebtAmount').value='';
  document.getElementById('finDebtDesc').value='';
  document.getElementById('finDebtDate').value='';
  openModal('finDebtModal');
  setTimeout(()=>document.getElementById('finDebtName').focus(),100);
}
function closeFinDebtModal(){closeModal('finDebtModal');}
function confirmFinDebt(){
  const name=document.getElementById('finDebtName').value.trim();
  const amount=parseFloat(document.getElementById('finDebtAmount').value)||0;
  const desc=document.getElementById('finDebtDesc').value.trim();
  const date=document.getElementById('finDebtDate').value||'';
  if(!name||!amount)return;
  finDebts.push({id:nid++,direction:_finDebtDir,name,amount,desc,date,paid:false});
  LS.s('finDebts',finDebts);LS.s('nid',nid);
  closeFinDebtModal();renderFinDebts();
}

// ══ PIE CHART ══════════════════════════════════════════
let finPieSlices = LS.g('finPieSlices', []);
let _pieSliceEditId = null;
let _pieExpanded = false;

const PIE_COLORS = [
  '#2dd4bf','#f87171','#60a5fa','#fbbf24','#a78bfa',
  '#34d399','#fb7185','#38bdf8','#facc15','#c084fc',
  '#4ade80','#f97316','#818cf8','#e879f9','#fb923c'
];

function openPieSliceModal(editId){const psb=document.getElementById('pieSliceDelBtn');if(psb)psb.style.display=editId?'':'none';
  _pieSliceEditId = editId||null;
  document.getElementById('pieSliceEditId').value = editId||'';
  document.getElementById('pieSliceTitle').textContent = editId ? 'изменить категорию' : 'добавить категорию';
  const currentTotal=finPieSlices.reduce((s,x)=>s+x.pct,0);
  const editingPct=editId?(finPieSlices.find(x=>x.id===editId)||{pct:0}).pct:0;
  const available=Math.max(0,100-(currentTotal-editingPct));
  if(editId){
    const s=finPieSlices.find(x=>x.id===editId);
    if(s){
      document.getElementById('pieSliceName').value=s.name;
      document.getElementById('pieSlicePct').value=s.pct;
      document.getElementById('pieSliceDesc').value=s.desc||'';
    }
  } else {
    document.getElementById('pieSliceName').value='';
    document.getElementById('pieSlicePct').value='';
    document.getElementById('pieSliceDesc').value='';
  }
  // Show available %
  document.getElementById('pieSlicePct').placeholder=`макс. ${available}%`;
  // Update label
  const lbl=document.querySelector('label[for="pieSlicePct"]')||document.getElementById('piePctLabel');
  const pctRow=document.getElementById('pieSlicePct').closest('.field-row');
  if(pctRow){
    const labelEl=pctRow.querySelector('.field-label');
    if(labelEl)labelEl.textContent=`Процент (%) · занято ${currentTotal}% из 100%`;
  }
  const hint=document.getElementById('piePctHint');if(hint)hint.textContent='';
  openModal('pieSliceModal');
  setTimeout(()=>document.getElementById('pieSliceName').focus(),100);
}
function closePieSliceModal(){closeModal('pieSliceModal');_pieSliceEditId=null;}
function confirmPieSlice(){
  const name=document.getElementById('pieSliceName').value.trim();
  const pct=parseFloat(document.getElementById('pieSlicePct').value)||0;
  const desc=document.getElementById('pieSliceDesc').value.trim();
  if(!name||pct<=0)return;
  // Check 100% limit
  const currentTotal=finPieSlices.reduce((s,x)=>s+x.pct,0);
  const editingPct=_pieSliceEditId!==null?(finPieSlices.find(x=>x.id===_pieSliceEditId)||{pct:0}).pct:0;
  const newTotal=currentTotal-editingPct+pct;
  if(newTotal>100){
    const available=Math.max(0,100-(currentTotal-editingPct));
    const inp=document.getElementById('pieSlicePct');
    inp.style.borderColor='var(--red)';
    inp.title=`Превышение! Доступно: ${available}%`;
    // Show hint
    let hint=document.getElementById('piePctHint');
    if(!hint){hint=document.createElement('div');hint.id='piePctHint';hint.style.cssText='font-family:var(--mono);font-size:10px;color:var(--red);margin-top:4px';inp.parentNode.appendChild(hint);}
    hint.textContent=`Превышает 100%! Доступно ещё: ${available}%`;
    setTimeout(()=>{inp.style.borderColor='';if(hint)hint.textContent='';},3000);
    return;
  }
  // Clear hint if exists
  const hint=document.getElementById('piePctHint');if(hint)hint.textContent='';
  if(_pieSliceEditId!==null){
    const s=finPieSlices.find(x=>x.id===_pieSliceEditId);
    if(s){s.name=name;s.pct=pct;s.desc=desc;}
  } else {
    finPieSlices.push({id:nid++,name,pct,desc});
    LS.s('nid',nid);
  }
  LS.s('finPieSlices',finPieSlices);
  closePieSliceModal();
  renderFinPie();
  flash('Категория сохранена');
}
function delPieSlice(id) { deleteItem(finPieSlices, 'finPieSlices', id, renderFinPie); }

function togglePieExpand(){
  _pieExpanded=true;
  openModal('pieExpandModal');
  setTimeout(()=>drawPieChart('finPieCanvasExpand','finPieLegendExpand',true),50);
}
function closePieExpand(){
  _pieExpanded=false;
  closeModal('pieExpandModal');
}

function drawPieChart(canvasId, legendId, expanded){
  const canvas=document.getElementById(canvasId);
  const legendEl=document.getElementById(legendId);
  if(!canvas||!legendEl)return;

  const slices=finPieSlices;
  if(!slices.length){
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,canvas.width/2-10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.3)';
    ctx.font=`11px DM Mono,monospace`;ctx.textAlign='center';
    ctx.fillText('нет категорий',canvas.width/2,canvas.height/2);
    legendEl.innerHTML='<div style="font-size:12px;color:var(--t3);font-family:var(--mono);text-align:center;padding:8px 0">добавь категории кнопкой + выше</div>';
    return;
  }

  const totalPct=slices.reduce((s,x)=>s+x.pct,0);
  const dpr=window.devicePixelRatio||1;
  const SIZE=expanded?280:220;
  canvas.width=SIZE*dpr;canvas.height=SIZE*dpr;
  canvas.style.width=SIZE+'px';canvas.style.height=SIZE+'px';
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,SIZE,SIZE);

  const cx=SIZE/2,cy=SIZE/2,r=SIZE/2-14,innerR=SIZE/2-48;
  let startAngle=-Math.PI/2;

  slices.forEach((s,i)=>{
    const angle=(s.pct/totalPct)*Math.PI*2;
    const color=PIE_COLORS[i%PIE_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+angle);
    ctx.closePath();
    ctx.fillStyle=color;
    ctx.fill();
    ctx.strokeStyle='var(--bg,#0a0a0a)';
    ctx.lineWidth=2;
    ctx.stroke();

    // Label inside slice if big enough
    const mid=startAngle+angle/2;
    const labelR=(r+innerR)/2;
    const lx=cx+Math.cos(mid)*labelR;
    const ly=cy+Math.sin(mid)*labelR;
    const normPct=Math.round((s.pct/totalPct)*100);
    if(angle>0.35){
      ctx.fillStyle='rgba(0,0,0,0.75)';
      ctx.font=`bold ${expanded?11:9}px DM Mono,monospace`;
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(normPct+'%',lx,ly);
    }
    startAngle+=angle;
  });

  // Inner donut hole
  ctx.beginPath();
  ctx.arc(cx,cy,innerR,0,Math.PI*2);
  const bgColor=document.body.classList.contains('light')?'#ffffff':'#0a0a0a';
  ctx.fillStyle=bgColor;
  ctx.fill();

  // Center text
  ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.font=`${expanded?11:9}px DM Mono,monospace`;
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(totalPct+'%',cx,cy+1);

  // Legend
  legendEl.innerHTML=slices.map((s,i)=>{
    const color=PIE_COLORS[i%PIE_COLORS.length];
    const descHtml=s.desc?`<div style="font-size:11px;color:var(--t2);margin-top:2px;line-height:1.4">${s.desc}</div>`:'';
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd)">
      <div style="width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0;margin-top:3px"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${s.name}</div>
        ${descHtml}
      </div>
      <div style="font-family:var(--mono);font-size:13px;color:${color};font-weight:700;flex-shrink:0">${s.pct}%</div>
      ${expanded?`<div style="display:flex;gap:4px;flex-shrink:0">
        <button onclick="openPieSliceModal(${s.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:2px 4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

      </div>`:`<div style="display:flex;gap:4px;flex-shrink:0">
        <button onclick="openPieSliceModal(${s.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:2px 4px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

      </div>`}
    </div>`;
  }).join('');
}

function renderFinPie(){
  drawPieChart('finPieCanvas','finPieLegend',false);
}

// Entry modal
function openFinEntryModal(type){
  _finEntryType=type;
  document.getElementById('finEntryTitle').textContent=type==='income'?'добавить доход':'добавить расход';
  document.getElementById('finEntryAmount').value='';
  document.getElementById('finEntryDesc').value='';
  openModal('finEntryModal');
  setTimeout(()=>document.getElementById('finEntryAmount').focus(),100);
}
function closeFinEntryModal(){closeModal('finEntryModal');}
function confirmFinEntry(){
  const amount=parseFloat(document.getElementById('finEntryAmount').value)||0;
  const desc=document.getElementById('finEntryDesc').value.trim();
  if(!amount)return;
  const key=nowDK();
  if(!finLog[key])finLog[key]=[];
  finLog[key].push({id:nid++,type:_finEntryType,amount,desc});
  LS.s('finLog',finLog);LS.s('nid',nid);
  closeFinEntryModal();
  renderFinDayLog();
  renderFinChart();
}

// Template modal
function openFinTplModal(period,type){
  _finTplEditId=null;
  _finTplPeriod=period;_finTplType=type;
  const pLabel={week:'неделя',month:'месяц',month3:'3 месяца',year:'год'};
  document.getElementById('finTplTitle').textContent=`шаблон · ${pLabel[period]} · ${type==='income'?'доход':'расход'}`;
  document.getElementById('finTplName').value='';
  document.getElementById('finTplAmount').value='';
  openModal('finTplModal');_hideFinTplDel();
  setTimeout(()=>document.getElementById('finTplName').focus(),100);
}
function _hideFinTplDel(){const ftb=document.getElementById('finTplDelBtn');if(ftb)ftb.style.display='none';}
function closeFinTplModal(){closeModal('finTplModal');}
function confirmFinTpl(){
  const name=document.getElementById('finTplName').value.trim();
  const amount=parseFloat(document.getElementById('finTplAmount').value)||0;
  if(!name||!amount)return;
  if(!finTpl[_finTplPeriod])finTpl[_finTplPeriod]={income:[],expense:[]};
  finTpl[_finTplPeriod][_finTplType].push({id:nid++,name,amount});
  LS.s('finTpl',finTpl);LS.s('nid',nid);
  closeFinTplModal();
  renderFinTpl(_finTplPeriod);
}

// Purchase modal
function openFinPurchaseModal(){const fpb=document.getElementById('finPurchaseDelBtn');if(fpb)fpb.style.display='none';
  document.getElementById('finPurchaseName').value='';
  document.getElementById('finPurchasePrice').value='';
  const pmx=document.getElementById('finPurchasePriceMax');if(pmx)pmx.value='';
  document.getElementById('finPurchaseDate').value='';
  openModal('finPurchaseModal');
  setTimeout(()=>document.getElementById('finPurchaseName').focus(),100);
}
function closeFinPurchaseModal(){closeModal('finPurchaseModal');}
function confirmFinPurchase(){
  const name=document.getElementById('finPurchaseName').value.trim();
  const priceMin=parseFloat(document.getElementById('finPurchasePrice').value)||0;
  const pmxEl=document.getElementById('finPurchasePriceMax');
  const priceMax=pmxEl?(parseFloat(pmxEl.value)||0):0;
  const date=document.getElementById('finPurchaseDate').value||'';
  if(!name)return;
  finPurchases.push({id:nid++,name,price:priceMin,priceMin,priceMax:priceMax>priceMin?priceMax:0,date});
  LS.s('finPurchases',finPurchases);LS.s('nid',nid);
  closeFinPurchaseModal();
  renderFinPurchases();
}

// ── EDIT TEMPLATE ────────────────────────────────────────
let _finTplEditPeriod=null,_finTplEditType=null,_finTplEditId=null;
function openFinTplEdit(period,type,id){const ftb=document.getElementById('finTplDelBtn');if(ftb)ftb.style.display='';
  _finTplEditPeriod=period;_finTplEditType=type;_finTplEditId=id;
  const item=(finTpl[period]&&finTpl[period][type]||[]).find(x=>x.id===id);
  if(!item)return;
  const pLabel={week:'неделя',month:'месяц',month3:'3 месяца',year:'год'};
  document.getElementById('finTplTitle').textContent=`изменить · ${pLabel[period]} · ${type==='income'?'доход':'расход'}`;
  document.getElementById('finTplName').value=item.name;
  document.getElementById('finTplAmount').value=item.amount;
  openModal('finTplModal');
  setTimeout(()=>document.getElementById('finTplName').focus(),100);
}
const _origConfirmFinTpl=confirmFinTpl;
confirmFinTpl=function(){
  if(_finTplEditId!==null){
    const name=document.getElementById('finTplName').value.trim();
    const amount=parseFloat(document.getElementById('finTplAmount').value)||0;
    if(!name||!amount)return;
    const item=(finTpl[_finTplEditPeriod]&&finTpl[_finTplEditPeriod][_finTplEditType]||[]).find(x=>x.id===_finTplEditId);
    if(item){item.name=name;item.amount=amount;}
    LS.s('finTpl',finTpl);
    closeFinTplModal();
    renderFinTpl(_finTplEditPeriod);
    flash('✓ Шаблон обновлён');
    _finTplEditId=null;_finTplEditPeriod=null;_finTplEditType=null;
    return;
  }
  _origConfirmFinTpl();
};
const _origCloseFinTplModal=closeFinTplModal;
closeFinTplModal=function(){
  _finTplEditId=null;_finTplEditPeriod=null;_finTplEditType=null;
  _origCloseFinTplModal();
};

// ── EDIT PURCHASE ─────────────────────────────────────────
let _finPurchaseEditId=null;
function openFinPurchaseEdit(id){const fpb=document.getElementById('finPurchaseDelBtn');if(fpb)fpb.style.display='';
  _finPurchaseEditId=id;
  const p=finPurchases.find(x=>x.id===id);if(!p)return;
  document.getElementById('finPurchaseName').value=p.name;
  document.getElementById('finPurchasePrice').value=p.priceMin||p.price||0;
  const pmx=document.getElementById('finPurchasePriceMax');if(pmx)pmx.value=p.priceMax||0;
  document.getElementById('finPurchaseDate').value=p.date||'';
  document.querySelector('#finPurchaseModal .mtitle').textContent='изменить покупку';
  document.querySelector('#finPurchaseModal .add-btn').textContent='СОХРАНИТЬ';
  openModal('finPurchaseModal');
  setTimeout(()=>document.getElementById('finPurchaseName').focus(),100);
}
const _origConfirmFinPurchase=confirmFinPurchase;
confirmFinPurchase=function(){
  if(_finPurchaseEditId!==null){
    const name=document.getElementById('finPurchaseName').value.trim();
    const priceMin=parseFloat(document.getElementById('finPurchasePrice').value)||0;
    const pmxEl=document.getElementById('finPurchasePriceMax');
    const priceMax=pmxEl?(parseFloat(pmxEl.value)||0):0;
    const date=document.getElementById('finPurchaseDate').value||'';
    if(!name)return;
    const p=finPurchases.find(x=>x.id===_finPurchaseEditId);
    if(p){p.name=name;p.price=priceMin;p.priceMin=priceMin;p.priceMax=priceMax>priceMin?priceMax:0;p.date=date;}
    LS.s('finPurchases',finPurchases);
    closeFinPurchaseModal();
    renderFinPurchases();
    flash('✓ Покупка обновлена');
    return;
  }
  _origConfirmFinPurchase();
};
const _origCloseFinPurchaseModal=closeFinPurchaseModal;
closeFinPurchaseModal=function(){
  _finPurchaseEditId=null;
  const titleEl=document.querySelector('#finPurchaseModal .mtitle');
  const btnEl=document.querySelector('#finPurchaseModal .add-btn');
  if(titleEl)titleEl.textContent='покупка';
  if(btnEl)btnEl.textContent='ДОБАВИТЬ';
  _origCloseFinPurchaseModal();
};

// ── EDIT DEBT ─────────────────────────────────────────────
let _finDebtEditId=null;
function openFinDebtEdit(id){const fdb=document.getElementById('finDebtDelBtn');if(fdb)fdb.style.display='';
  _finDebtEditId=id;
  const d=finDebts.find(x=>x.id===id);if(!d)return;
  _finDebtDir=d.direction;
  const isOwe=d.direction==='owe';
  document.getElementById('finDebtTitle').textContent=isOwe?'изменить · я должен':'изменить · мне должны';
  document.getElementById('finDebtName').value=d.name;
  document.getElementById('finDebtAmount').value=d.amount;
  document.getElementById('finDebtDesc').value=d.desc||'';
  document.getElementById('finDebtDate').value=d.date||'';
  document.querySelector('#finDebtModal .add-btn').textContent='СОХРАНИТЬ';
  openModal('finDebtModal');
  setTimeout(()=>document.getElementById('finDebtName').focus(),100);
}
const _origConfirmFinDebt=confirmFinDebt;
confirmFinDebt=function(){
  if(_finDebtEditId!==null){
    const name=document.getElementById('finDebtName').value.trim();
    const amount=parseFloat(document.getElementById('finDebtAmount').value)||0;
    const desc=document.getElementById('finDebtDesc').value.trim();
    const date=document.getElementById('finDebtDate').value||'';
    if(!name||!amount)return;
    const d=finDebts.find(x=>x.id===_finDebtEditId);
    if(d){d.name=name;d.amount=amount;d.desc=desc;d.date=date;}
    LS.s('finDebts',finDebts);
    closeFinDebtModal();
    renderFinDebts();
    flash('✓ Задолженность обновлена');
    return;
  }
  _origConfirmFinDebt();
};
const _origCloseFinDebtModal=closeFinDebtModal;
closeFinDebtModal=function(){
  _finDebtEditId=null;
  const btnEl=document.querySelector('#finDebtModal .add-btn');
  if(btnEl)btnEl.textContent='ДОБАВИТЬ';
  _origCloseFinDebtModal();
};

