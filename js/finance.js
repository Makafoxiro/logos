// ═══ MODULE: finance.js ═══
// ══ FINANCE ════════════════════════════════════════════
let finPeriod='month'; // 'month' | 'year'
let _finEntryType='income';
let _finTplPeriod='week';
let _finTplType='income';

// ── ДЕНЕЖНАЯ РЕФОРМА: просмотр месяцев ──
let finViewY=new Date().getFullYear(); // просматриваемый год
let finViewM=new Date().getMonth();    // просматриваемый месяц (0-based)
let finViewDK=nowDK();                 // выбранный день, ключ dk() = «Y-M-D» (месяц 0-based)
let finMonthsN=6;                      // глубина таблицы «по месяцам»: 6 | 12
let finChartType=LS.g('finChartType','line'); // 'line' | 'bar'
let finPurchasesCollapsed=LS.g('finPurchasesCollapsed',false);
let finWeekTplCollapsed=LS.g('finWeekTplCollapsed',false);
let finMonthTplCollapsed=LS.g('finMonthTplCollapsed',false);
let finMonth3TplCollapsed=LS.g('finMonth3TplCollapsed',false);
let finYearTplCollapsed=LS.g('finYearTplCollapsed',false);
let finHalfYearTplCollapsed=LS.g('finHalfYearTplCollapsed',false);
let finDebtsCollapsed=LS.g('finDebtsCollapsed',false);
let finPieCollapsed=LS.g('finPieCollapsed',false);
const MNAME_RU=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MNAME_EN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const finMName=m=>{try{return (appLang==='en'?MNAME_EN:MNAME_RU)[m];}catch(e){return MNAME_RU[m];}};
const fmtR=v=>Math.round(v).toLocaleString('ru-RU')+' ₽';

// Ключ месяца для finPlans: «YYYY-MM» (месяц 1-based, в отличие от dk()).
function finPlanKey(y,m){return y+'-'+String(m+1).padStart(2,'0');}
function finCurPlanKey(){const n=new Date();return finPlanKey(n.getFullYear(),n.getMonth());}
function finIsCurMonth(){return finViewY===new Date().getFullYear()&&finViewM===new Date().getMonth();}
// Конвертация ключа dk() ⇄ input[type=date] (месяц 0-based ⇄ 1-based)
function finDKToISO(k){const d=dkToDate(k);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function finISOToDK(iso){const p=String(iso).split('-');return `${+p[0]}-${+p[1]-1}-${+p[2]}`;}
// finDK(y,m,d) → ключ «Y-M-D» (месяц 0-based, как dk())
function finDK(y,m,d){return `${y}-${m}-${d}`;}

// ── Снимки плана ──
// Первый вход в месяц: копия шаблона finTpl.month с переносом текущих paid-флагов;
// сам шаблон чистится до эталона (paid живут только в снимках).
function finEnsurePlan(key){
  if(!finPlans[key]){
    const src=finTpl.month||{income:[],expense:[]};
    finPlans[key]={
      income:src.income.map(x=>({id:x.id,name:x.name,amount:x.amount,paid:!!x.paid})),
      expense:src.expense.map(x=>({id:x.id,name:x.name,amount:x.amount,paid:!!x.paid}))
    };
    src.income.forEach(x=>{x.paid=false;});
    src.expense.forEach(x=>{x.paid=false;});
    LS.s('finTpl',finTpl);LS.s('finPlans',finPlans);
  }
  return finPlans[key];
}
finEnsurePlan(finCurPlanKey()); // миграция при загрузке

// ══ РОТАЦИЯ ПЛАНОВ: перенос оплаченного в капитал при смене периода ══
// При переходе в новую неделю/месяц/квартал/полгода/год все позиции с paid=true
// из старого снимка плана переносятся в finLog (сегодняшняя дата) и влияют на капитал.
// Галочки paid в старом снимке сбрасываются, создаётся новый снимок из finTpl.

function planPeriodKey(period){
  const now=new Date();
  switch(period){
    case 'week':{
      const mon=getMonday(now);
      return mon.getFullYear()+'-'+String(mon.getMonth()+1).padStart(2,'0')+'-'+String(mon.getDate()).padStart(2,'0');
    }
    case 'month':
      return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    case 'month3':{
      const m=now.getMonth(),q0=Math.floor(m/3)*3;
      return now.getFullYear()+'-'+String(q0+1).padStart(2,'0');
    }
    case 'halfYear':
      return now.getFullYear()+'-H'+(now.getMonth()<6?1:2);
    case 'year':
      return String(now.getFullYear());
    default:return String(now.getFullYear());
  }
}

function ensurePlanForPeriod(period,key){
  if(!finPlans[key]){
    const src=finTpl[period]||{income:[],expense:[]};
    finPlans[key]={
      income:src.income.map(x=>({id:x.id,name:x.name,amount:x.amount,paid:false})),
      expense:src.expense.map(x=>({id:x.id,name:x.name,amount:x.amount,paid:false}))
    };
    LS.s('finPlans',finPlans);
  }
  return finPlans[key];
}

function rotatePlansIfNeeded(){
  const periods=['week','month','month3','halfYear','year'];
  let changed=false;
  periods.forEach(period=>{
    const curKey=planPeriodKey(period);
    const lastKey=LS.g('finLastPlan_'+period,null);
    if(lastKey===null){
      LS.s('finLastPlan_'+period,curKey);
      ensurePlanForPeriod(period,curKey);
      return;
    }
    if(curKey===lastKey)return;
    // Новый период — переносим оплаченное из старого снимка в finLog
    const oldPlan=finPlans[lastKey];
    if(oldPlan){
      const logDate=nowDK();
      ['income','expense'].forEach(type=>{
        (oldPlan[type]||[]).forEach(item=>{
          if(item.paid){
            const existing=Object.values(finLog).flat().some(entry=>
              entry.source==='plan-payment'&&entry.planPeriod===period&&entry.planKey===lastKey&&entry.planType===type&&entry.planItemId===item.id
            );
            if(!existing){
              finLog[logDate]=finLog[logDate]||[];
              finLog[logDate].push({
                id:nid++,type:type,amount:item.amount,
                desc:item.name+' (план '+period+')',source:'plan-payment',
                planPeriod:period,planKey:lastKey,planType:type,planItemId:item.id
              });
              changed=true;
            }
          }
        });
      });
      LS.s('nid',nid);
      changed=true;
    }
    // Удаляем старый снимок и создаём новый для текущего периода
    delete finPlans[lastKey];
    ensurePlanForPeriod(period,curKey);
    const template=finTpl[period];
    if(template){
      ['income','expense'].forEach(type=>{
        (template[type]||[]).forEach(item=>{item.paid=false;});
      });
      LS.s('finTpl',finTpl);
    }
    LS.s('finLastPlan_'+period,curKey);
  });
  if(changed){
    LS.s('finLog',finLog);
    LS.s('finPlans',finPlans);
  }
}

// Правки шаблона месяца синхронизируются с снимком ТЕКУЩЕГО месяца
// (по id: обновление name/amount, добавление новых, удаление отсутствующих; paid не трогаем).
function finSyncPlanFromTpl(){
  const ck=finCurPlanKey(),plan=finPlans[ck];
  if(!plan)return;
  const src=finTpl.month||{income:[],expense:[]};
  ['income','expense'].forEach(tp=>{
    const tpl=src[tp]||[],pl=plan[tp]||[];
    tpl.forEach(x=>{
      const p=pl.find(v=>v.id===x.id);
      if(p){p.name=x.name;p.amount=x.amount;}
      else pl.push({id:x.id,name:x.name,amount:x.amount,paid:false});
    });
    plan[tp]=pl.filter(p=>tpl.some(x=>x.id===p.id));
  });
  LS.s('finPlans',finPlans);
}

// ── Навигация по месяцам/годам ──
function finNavMonth(delta){
  const now=new Date();
  let y=finViewY,m=finViewM;
  if(finPeriod==='year'){y+=delta;}
  else{m+=delta;if(m<0){m=11;y--;}else if(m>11){m=0;y++;}}
  if(y>now.getFullYear()||(y===now.getFullYear()&&m>now.getMonth())){
    flash('это текущий месяц');finRefresh();return;
  }
  finViewY=y;finViewM=m;
  finViewDK=(y===now.getFullYear()&&m===now.getMonth())?nowDK():finDK(finViewY,finViewM,1);
  finRefresh();
}
function finNavDay(delta){
  const cur=dkToDate(finViewDK);
  const d=new Date(cur.getFullYear(),cur.getMonth(),cur.getDate()+delta);
  const first=new Date(finViewY,finViewM,1),last=new Date(finViewY,finViewM+1,0);
  if(d<first||d>last){flash(delta<0?'начало месяца':'конец месяца');return;}
  finViewDK=dk(d);
  renderFinDayLog();
}
function finSelectDay(dkKey){
  const d=dkToDate(dkKey);
  if(d.getFullYear()!==finViewY||d.getMonth()!==finViewM)return;
  finViewDK=dkKey;
  renderFinDayLog();
}
function finRefresh(){
  finUpdateAssetValues();
  const lbl=document.getElementById('fin-nav-lbl');
  if(lbl)lbl.textContent=finPeriod==='year'?String(finViewY):finMName(finViewM)+' '+finViewY;
  renderFinChart();
  renderFinDayLog();
  renderFinTpl('month');
  renderFinMonths();
  renderFinCapital();
  renderFinTotal();
}
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
  finRefresh();
}
function finSetChartType(t){
  finChartType=t;
  LS.s('finChartType',t);
  const lineBtn=document.getElementById('finChartTypeLine');
  const barBtn=document.getElementById('finChartTypeBar');
  if(lineBtn){lineBtn.style.background=t==='line'?'var(--a2)':'';lineBtn.style.borderColor=t==='line'?'var(--ab)':'';lineBtn.style.color=t==='line'?'var(--a)':'';}
  if(barBtn){barBtn.style.background=t==='bar'?'var(--a2)':'';barBtn.style.borderColor=t==='bar'?'var(--ab)':'';barBtn.style.color=t==='bar'?'var(--a)':'';}
  renderFinChart();
}
function toggleFinPurchases(){
  finPurchasesCollapsed=!finPurchasesCollapsed;
  LS.s('finPurchasesCollapsed',finPurchasesCollapsed);
  const el=document.getElementById('finPurchases');
  const chev=document.getElementById('fin-purchases-chev');
  if(el){
    animateCollapse(el,finPurchasesCollapsed,'block');
    if(chev)chev.textContent=finPurchasesCollapsed?'▶':'▼';
  }
}
function toggleFinTpl(id,chevId,key){
  const collapsed=!LS.g(key,false);
  LS.s(key,collapsed);
  const el=document.getElementById(id);
  const chev=document.getElementById(chevId);
  if(el)animateCollapse(el,collapsed,'block');
  if(chev){chev.textContent=collapsed?'▶':'▼';}
}
function toggleFinDebts(){
  finDebtsCollapsed=!finDebtsCollapsed;
  LS.s('finDebtsCollapsed',finDebtsCollapsed);
  const el=document.getElementById('finDebts');
  const chev=document.getElementById('fin-debts-chev');
  if(el){
    animateCollapse(el,finDebtsCollapsed,'block');
    if(chev)chev.textContent=finDebtsCollapsed?'▶':'▼';
  }
}
function toggleFinPie(){
  finPieCollapsed=!finPieCollapsed;
  LS.s('finPieCollapsed',finPieCollapsed);
  const el=document.getElementById('finPieCard');
  const chev=document.getElementById('fin-pie-chev');
  if(el){
    animateCollapse(el,finPieCollapsed,'block');
    if(chev)chev.textContent=finPieCollapsed?'▶':'▼';
  }
}
// Клик по графику (месяц) — выбор дня
let _finChartClickBound=false;
function _finBindChartClick(){
  if(_finChartClickBound)return;
  const c=document.getElementById('finChart');if(!c)return;
  _finChartClickBound=true;
  c.addEventListener('click',e=>{
    if(finPeriod!=='month')return;
    const r=c.getBoundingClientRect();
    const n=new Date(finViewY,finViewM+1,0).getDate();
    if(n<2)return;
    const cW=r.width-16; // pad.l+r = 8+8
    const idx=Math.round((e.clientX-r.left-8)/(cW/(n-1)));
    if(idx>=1&&idx<=n){finViewDK=finDK(finViewY,finViewM,idx);renderFinDayLog();}
  });
}
function finDayKey(d){return dk(d);}

function renderFinance(){
  finUpdateAssetValues();
  rotatePlansIfNeeded();
  renderFinDayLog();
  renderFinTpl('week');
  renderFinTpl('month');
  renderFinTpl('month3');
  renderFinTpl('halfYear');
  renderFinTpl('year');
  renderFinPurchases();
  renderFinDebts();
  renderFinMonths();
  renderFinCapital();
  setTimeout(renderFinChart,50);
  setTimeout(renderFinPie,80);
  _finBindChartClick();
  // Применяем сохранённое состояние свёрнутости (после innerHTML рендеров)
  const purchEl=document.getElementById('finPurchases');
  const purchChev=document.getElementById('fin-purchases-chev');
  if(purchEl){
    animateCollapse(purchEl,finPurchasesCollapsed,'block',true);
    if(purchChev)purchChev.textContent=finPurchasesCollapsed?'▶':'▼';
  }
  const tpls=[['finWeekTpl','fin-week-chev','finWeekTplCollapsed'],['finMonthTpl','fin-month-chev','finMonthTplCollapsed'],['finMonth3Tpl','fin-month3-chev','finMonth3TplCollapsed'],['finHalfYearTpl','fin-halfyear-chev','finHalfYearTplCollapsed'],['finYearTpl','fin-year-chev','finYearTplCollapsed']];
  tpls.forEach(([id,chevId,key])=>{
    const el=document.getElementById(id);
    const chev=document.getElementById(chevId);
    if(el){
      const collapsed=LS.g(key,false);
      animateCollapse(el,collapsed,'block',true);
      if(chev)chev.textContent=collapsed?'▶':'▼';
    }
  });
  const debtsEl=document.getElementById('finDebts');
  const debtsChev=document.getElementById('fin-debts-chev');
  if(debtsEl){
    animateCollapse(debtsEl,finDebtsCollapsed,'block',true);
    if(debtsChev)debtsChev.textContent=finDebtsCollapsed?'▶':'▼';
  }
  const pieEl=document.getElementById('finPieCard');
  const pieChev=document.getElementById('fin-pie-chev');
  if(pieEl){
    animateCollapse(pieEl,finPieCollapsed,'block',true);
    if(pieChev)pieChev.textContent=finPieCollapsed?'▶':'▼';
  }
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
    const daysInMonth=new Date(finViewY,finViewM+1,0).getDate();
    for(let i=1;i<=daysInMonth;i++){const d=new Date(finViewY,finViewM,i);days.push(d);}
    labels=days.map(d=>d.getDate()%5===0||d.getDate()===1?String(d.getDate()):'');
  } else {
    // year — 12 months of the viewed year
    for(let i=0;i<12;i++){const d=new Date(finViewY,i,1);days.push(d);}
    labels=days.map(d=>MSHORT[d.getMonth()]);
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

  function drawBar(vals,color){
    if(vals.every(v=>v===0))return;
    const barW=n<=1?cW:Math.max(4,cW/(n*1.8));
    const gap=n<=1?0:Math.max(2,cW/(n*1.8)-barW);
    vals.forEach((v,i)=>{
      if(v===0)return;
      const x=pad.l+(n<=1?cW/2:cW/(n-1)*i)-barW/2;
      const y=pad.t+cH*(1-v/maxVal);
      ctx.fillStyle=color;
      ctx.fillRect(x,y,barW,cH*(v/maxVal));
    });
  }

  if(finChartType==='bar'){
    drawBar(income,'#4ade80');
    drawBar(expense,'#f87171');
  } else {
    drawLine(income,'#4ade80');
    drawLine(expense,'#f87171');
  }

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
  const key=finViewDK;
  const entries=finLog[key]||[];
  const el=document.getElementById('finDayLog');if(!el)return;
  // Заголовок с навигацией по дням
  const navEl=document.getElementById('fin-day-nav');
  if(navEl){
    const d=dkToDate(key);
    const isToday=key===nowDK();
    navEl.innerHTML=`<button onclick="finNavDay(-1)" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t2);font-family:var(--mono);font-size:11px;padding:2px 9px;cursor:pointer">‹</button>
      <span style="font-family:var(--mono);font-size:10px;color:var(--t2);min-width:90px;text-align:center">${d.getDate()} ${MFULL[d.getMonth()]}${isToday?' · сегодня':''}</span>
      <button onclick="finNavDay(1)" style="background:var(--c2);border:1px solid var(--bd);border-radius:7px;color:var(--t2);font-family:var(--mono);font-size:11px;padding:2px 9px;cursor:pointer">›</button>`;
  }
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
  const entry=finLog[key].find(item=>item.id===id);
  if(entry?.purchaseId){
    const purchase=finPurchases.find(item=>Number(item.id)===Number(entry.purchaseId));
    if(purchase){purchase.paid=false;purchase.archived=false;delete purchase.paidAt;LS.s('finPurchases',finPurchases);}
  }
  if(entry?.debtId){
    const debt=finDebts.find(item=>Number(item.id)===Number(entry.debtId));
    if(debt)debt.paid=false;
    LS.s('finDebts',finDebts);
  }
  if(entry?.source==='plan-payment'){
    const sourcePlan=entry.planPeriod==='month'?finPlans[entry.planKey]:finTpl[entry.planPeriod];
    const planItem=sourcePlan?.[entry.planType]?.find(item=>Number(item.id)===Number(entry.planItemId));
    if(planItem)planItem.paid=false;
    LS.s(entry.planPeriod==='month'?'finPlans':'finTpl',entry.planPeriod==='month'?finPlans:finTpl);
  }
  finLog[key]=finLog[key].filter(e=>e.id!==id);
  LS.s('finLog',finLog);
  renderFinPurchases();
  renderFinDebts();
  renderFinDayLog();
  renderFinChart();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
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
  if(e.purchaseId){
    const purchase=finPurchases.find(item=>Number(item.id)===Number(e.purchaseId));
    if(purchase){purchase.price=amt;purchase.priceMin=amt;LS.s('finPurchases',finPurchases);}
  }
  if(e.debtId){
    const debt=finDebts.find(item=>Number(item.id)===Number(e.debtId));
    if(debt){debt.amount=amt;LS.s('finDebts',finDebts);}
  }
  if(e.source==='plan-payment'){
    const sourcePlan=e.planPeriod==='month'?finPlans[e.planKey]:finTpl[e.planPeriod];
    const planItem=sourcePlan?.[e.planType]?.find(item=>Number(item.id)===Number(e.planItemId));
    if(planItem){planItem.amount=amt;LS.s(e.planPeriod==='month'?'finPlans':'finTpl',e.planPeriod==='month'?finPlans:finTpl);}
  }
  LS.s('finLog',finLog);
  closeFinEditModal();
  renderFinDayLog();
  renderFinChart();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
  flash('✓ Запись обновлена');
}

function renderFinTpl(period){
  const el=document.getElementById('fin'+period.charAt(0).toUpperCase()+period.slice(1)+'Tpl');
  if(!el)return;
  // Период 'month' рендерит СНИМОК finPlans просматриваемого месяца (история);
  // остальные периоды — живые шаблоны finTpl.
  let tpl,isPlan=false,editable=true;
  if(period==='month'){
    isPlan=true;
    const key=finPlanKey(finViewY,finViewM);
    editable=finIsCurMonth();
    tpl=finPlans[key];
    if(!tpl){
      // будущие месяцы снимка не имеют — показываем превью шаблона
      tpl={income:(finTpl.month&&finTpl.month.income||[]).map(x=>({...x,paid:false})),expense:(finTpl.month&&finTpl.month.expense||[]).map(x=>({...x,paid:false}))};
      editable=false;
    }
  } else {
    tpl=finTpl[period]||{income:[],expense:[]};
  }
  const incomeTotal=tpl.income.reduce((s,x)=>s+x.amount,0);
  const expenseTotal=tpl.expense.reduce((s,x)=>s+x.amount,0);
  const balance=incomeTotal-expenseTotal;
  const paidInc=tpl.income.filter(x=>x.paid).length;
  const paidExp=tpl.expense.filter(x=>x.paid).length;
  // Always show summary widgets
  let html=`<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    <div style="flex:1;min-width:80px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:rgba(74,222,128,0.7);letter-spacing:1px">${t('income')}</div>
      <div style="font-family:var(--mono);font-size:15px;color:#4ade80;margin-top:2px">+${incomeTotal.toLocaleString('ru')} ₽</div>
      ${isPlan&&tpl.income.length?`<div style="font-family:var(--mono);font-size:8px;color:var(--t3);margin-top:2px">получено ${paidInc}/${tpl.income.length}</div>`:''}
    </div>
    <div style="flex:1;min-width:80px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:rgba(248,113,113,0.7);letter-spacing:1px">${t('expense')}</div>
      <div style="font-family:var(--mono);font-size:15px;color:#f87171;margin-top:2px">−${expenseTotal.toLocaleString('ru')} ₽</div>
      ${isPlan&&tpl.expense.length?`<div style="font-family:var(--mono);font-size:8px;color:var(--t3);margin-top:2px">оплачено ${paidExp}/${tpl.expense.length}</div>`:''}
    </div>
    <div style="flex:1;min-width:80px;background:${balance>=0?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)'};border:1px solid ${balance>=0?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'};border-radius:10px;padding:8px 10px">
      <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px">${t('balance')}</div>
      <div style="font-family:var(--mono);font-size:15px;color:${balance>=0?'#4ade80':'#f87171'};margin-top:2px">${balance>=0?'+':''}${balance.toLocaleString('ru')} ₽</div>
    </div>
  </div>`;
  if(isPlan&&!editable){
    html+=`<div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">${finIsCurMonth()?'превью (снимок создастся автоматически)':'архив · план закрыт'}</div>`;
  }
  if(!tpl.income.length&&!tpl.expense.length){
    html+=`<div style="font-size:12px;color:var(--t3);font-family:var(--mono)">${t('finTplEmpty')}</div>`;
    el.innerHTML=html;return;
  }
  if(tpl.income.length){
    html+=`<div style="font-family:var(--mono);font-size:8px;color:#4ade80;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px\">${t('income')}</div>`;
    html+=tpl.income.map(x=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(74,222,128,0.07);${x.paid?'opacity:.55':''}">
        <div style="width:5px;height:5px;border-radius:50%;background:${x.paid?'var(--a)':'#4ade80'};flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;${x.paid?'text-decoration:line-through;color:var(--t2)':''}">${x.name}</div>
        <div style="font-family:var(--mono);font-size:11px;color:${x.paid?'var(--a)':'#4ade80'}">${x.paid?'✓ получено':'+'+x.amount.toLocaleString('ru')+' ₽'}</div>
        ${editable?`${!x.paid?`<button onclick="toggleFinTplPaid('${period}','income',${x.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">оплачено</button>`:`<button onclick="toggleFinTplPaid('${period}','income',${x.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t3);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">отменить</button>`}
        <button onclick="openFinTplEdit('${period}','income',${x.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:1px 3px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`:''}

      </div>`).join('');
  }
  if(tpl.expense.length){
    html+=`<div style="font-family:var(--mono);font-size:8px;color:#f87171;letter-spacing:1px;text-transform:uppercase;margin:${tpl.income.length?'10px':0} 0 5px">${t('expense')}</div>`;
    html+=tpl.expense.map(x=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(248,113,113,0.07);${x.paid?'opacity:.55':''}">
        <div style="width:5px;height:5px;border-radius:50%;background:${x.paid?'var(--a)':'#f87171'};flex-shrink:0"></div>
        <div style="flex:1;font-size:12px;${x.paid?'text-decoration:line-through;color:var(--t2)':''}">${x.name}</div>
        <div style="font-family:var(--mono);font-size:11px;color:${x.paid?'var(--a)':'#f87171'}">${x.paid?'✓ оплачено':'−'+x.amount.toLocaleString('ru')+' ₽'}</div>
        ${editable?`${!x.paid?`<button onclick="toggleFinTplPaid('${period}','expense',${x.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">оплачено</button>`:`<button onclick="toggleFinTplPaid('${period}','expense',${x.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t3);font-family:var(--mono);font-size:8px;padding:2px 7px;cursor:pointer;white-space:nowrap">отменить</button>`}
        <button onclick="openFinTplEdit('${period}','expense',${x.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:1px 3px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`:''}

      </div>`).join('');
  }
  el.innerHTML=html;
}

function delFinTpl(period,type,id){
  finTpl[period][type]=finTpl[period][type].filter(x=>x.id!==id);
  LS.s('finTpl',finTpl);
  if(period==='month')finSyncPlanFromTpl();
  renderFinTpl(period);
}

function toggleFinTplPaid(period,type,id){
  let planKey='';
  let item;
  if(period==='month'){
    // Оплата плана пишется в снимок текущего месяца, а не в шаблон
    const key=finPlanKey(finViewY,finViewM);
    if(!finIsCurMonth())return; // архив закрыт для правок
    const plan=finEnsurePlan(key);
    item=(plan[type]||[]).find(x=>x.id===id);
    planKey=key;
  }else{
    item=(finTpl[period]&&finTpl[period][type]||[]).find(x=>x.id===id);
    planKey=planPeriodKey(period);
  }
  if(!item)return;
  item.paid=!item.paid;
  const matchingEntries=Object.entries(finLog).flatMap(([key,entries])=>
    (entries||[]).filter(entry=>entry.source==='plan-payment'&&entry.planPeriod===period&&entry.planKey===planKey&&entry.planType===type&&entry.planItemId===item.id).map(entry=>({key,entry}))
  );
  if(item.paid){
    const key=nowDK();
    if(!finLog[key])finLog[key]=[];
    finLog[key].push({
      id:nid++,type,amount:item.amount,desc:item.name+' (план '+period+')',
      source:'plan-payment',planPeriod:period,planKey,planType:type,planItemId:item.id
    });
    LS.s('nid',nid);
    LS.s('finLog',finLog);
  }else{
    matchingEntries.forEach(({key,entry})=>{
      finLog[key]=finLog[key].filter(item=>item.id!==entry.id);
      if(!finLog[key].length)delete finLog[key];
    });
    LS.s('finLog',finLog);
  }
  if(period==='month')LS.s('finPlans',finPlans);
  else LS.s('finTpl',finTpl);
  renderFinTpl(period);
  renderFinDayLog();renderFinChart();renderFinCapital();renderFinMonths();renderFinTotal();
}

const FIN_PURCHASE_ARCHIVE_DELAY=36*60*60*1000;
let finPurchasesArchiveCollapsed=LS.g('finPurchasesArchiveCollapsed',true);
function archiveFinPurchases(){
  const now=Date.now();
  let changed=false;
  (Array.isArray(finPurchases)?finPurchases:[]).forEach(p=>{
    if(!p||!p.paid)return;
    if(!Number.isFinite(Number(p.paidAt))){
      p.paidAt=now;
      changed=true;
    }
    if(!p.archived&&now-Number(p.paidAt)>=FIN_PURCHASE_ARCHIVE_DELAY){
      p.archived=true;
      changed=true;
    }
  });
  if(changed)LS.s('finPurchases',finPurchases);
  return changed;
}
function _finPurchaseCard(p,now,isArchived=false){
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
    const paidAt=p.paidAt?new Date(p.paidAt):null;
    const archivedLabel=p.archived&&paidAt?`<span style="font-family:var(--mono);font-size:9px;color:var(--t3)">в архиве · ${displayDate(dk(paidAt))}</span>`:'';
    return `<div class="card" style="padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border-color:${p.paid?'rgba(45,212,191,0.15)':'rgba(255,255,255,0.08)'};opacity:${p.paid?'.55':'1'}">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:500;margin-bottom:3px;${p.paid?'text-decoration:line-through;color:var(--t2)':''}">${p.name}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-family:var(--mono);font-size:13px;color:${p.paid?'var(--a)':'var(--amber)'}">${p.paid?'✓ куплено':priceLabel}</span>
          ${!p.paid&&p.date?`<span style="font-family:var(--mono);font-size:10px;color:var(--t3)">${displayDate(p.date)}</span>`:''}
          ${!p.paid?daysLabel:''}${archivedLabel}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        ${isArchived?`<button onclick="restoreFinPurchase(${p.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:3px 7px;cursor:pointer;white-space:nowrap">вернуть</button>`:!p.paid?`<button onclick="toggleFinPurchasePaid(${p.id})" style="background:var(--a2);border:1px solid var(--ab);border-radius:6px;color:var(--a);font-family:var(--mono);font-size:8px;padding:3px 7px;cursor:pointer;white-space:nowrap">оплачено</button>`:`<button onclick="toggleFinPurchasePaid(${p.id})" style="background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t3);font-family:var(--mono);font-size:8px;padding:3px 7px;cursor:pointer;white-space:nowrap">отменить</button>`}
        <button onclick="openFinPurchaseEdit(${p.id})" style="background:none;border:none;color:var(--t3);font-size:14px;cursor:pointer;padding:2px 5px;line-height:1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      </div>
    </div>`;
}
function renderFinPurchases(){
  const el=document.getElementById('finPurchases');if(!el)return;
  archiveFinPurchases();
  const archiveEl=document.getElementById('finPurchasesArchive');
  const archiveHeader=document.getElementById('finPurchasesArchiveHdr');
  const archived=finPurchases.filter(p=>p&&p.archived&&p.paid);
  const active=finPurchases.filter(p=>p&&(!p.archived||!p.paid));
  if(archiveHeader){
    archiveHeader.style.display=archived.length?'flex':'none';
    const count=document.getElementById('finPurchasesArchiveCount');
    if(count)count.textContent=String(archived.length);
  }
  if(archiveEl){
    archiveEl.style.display=archived.length&&!finPurchasesArchiveCollapsed?'':'none';
    archiveEl.innerHTML=archived.length?archived.map(p=>_finPurchaseCard(p,new Date(),true)).join(''):'';
    const chevron=document.getElementById('finPurchasesArchiveChev');
    if(chevron)chevron.textContent=finPurchasesArchiveCollapsed?'▸':'▾';
  }
  if(!active.length){
    el.innerHTML=archived.length?'<div class="card" style="padding:10px 12px;font-size:12px;color:var(--t3);font-family:var(--mono)">Активных покупок нет — оплаченные находятся в архиве.</div>':'<div class="card" style="padding:10px 12px;font-size:12px;color:var(--t3);font-family:var(--mono)">'+t('finPurchasesEmpty')+'</div>';
    return;
  }
  const now=new Date();
  // Считаем итог с диапазонами
  const unpaid=active.filter(p=>!p.paid);
  const totalMin=unpaid.reduce((s,p)=>s+(p.priceMin||p.price||0),0);
  const totalMax=unpaid.reduce((s,p)=>s+(p.priceMax&&p.priceMax>0?p.priceMax:(p.priceMin||p.price||0)),0);
  const hasRanges=unpaid.some(p=>p.priceMax&&p.priceMax>0);
  const totalHtml=unpaid.length?`<div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
    ${uiIconSvg('cart')}
    <div>
      <div style="font-family:var(--mono);font-size:8px;color:rgba(251,191,36,0.7);letter-spacing:1px;text-transform:uppercase">итого (не куплено)</div>
      <div style="font-family:var(--mono);font-size:15px;color:var(--amber);margin-top:2px">${hasRanges?(totalMin.toLocaleString('ru')+' – '+totalMax.toLocaleString('ru')+' ₽'):'~'+totalMin.toLocaleString('ru')+' ₽'}</div>
    </div>
  </div>`:'';
  el.innerHTML=totalHtml+active.map(p=>_finPurchaseCard(p,now)).join('');
}
function toggleFinPurchasesArchive(){
  finPurchasesArchiveCollapsed=!finPurchasesArchiveCollapsed;
  LS.s('finPurchasesArchiveCollapsed',finPurchasesArchiveCollapsed);
  renderFinPurchases();
}
function restoreFinPurchase(id){
  const purchase=finPurchases.find(item=>Number(item.id)===Number(id));
  if(!purchase||!purchase.paid||!purchase.archived)return;
  purchase.archived=false;
  purchase.paidAt=Date.now();
  LS.s('finPurchases',finPurchases);
  renderFinPurchases();
  flash('Покупка возвращена в список');
}

function toggleFinPurchasePaid(id){
  const p=finPurchases.find(x=>x.id===id);if(!p)return;
  p.paid=!p.paid;
  const price=p.priceMin||p.price||0;
  if(p.paid){
    p.paidAt=Date.now();
    p.archived=false;
    const key=nowDK();
    if(!finLog[key])finLog[key]=[];
    // оплата покупки — записываем расход
    finLog[key].push({id:nid++,type:'expense',amount:price,desc:`покупка: ${p.name}`,purchaseId:p.id});
  } else {
    delete p.paidAt;
    p.archived=false;
    // отмена оплаты — удаляем связанную запись расхода
    Object.keys(finLog).forEach(key=>{
      finLog[key]=finLog[key].filter(e=>!(e.purchaseId===p.id&&e.type==='expense'));
      if(finLog[key].length===0)delete finLog[key];
    });
  }
  LS.s('finPurchases',finPurchases);LS.s('finLog',finLog);LS.s('nid',nid);
  renderFinPurchases();
  renderFinDayLog();
  renderFinChart();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
}
setInterval(()=>{
  if(archiveFinPurchases())renderFinPurchases();
},60_000);
function delFinPurchase(id){
  const purchase=finPurchases.find(item=>Number(item.id)===Number(id));
  if(purchase?.paid){
    finPurchases=finPurchases.filter(item=>Number(item.id)!==Number(id));
    LS.s('finPurchases',finPurchases);
    renderFinPurchases();
    flash('Покупка убрана из списка; оплаченный расход сохранён в истории');
    return;
  }
  finPurchases=finPurchases.filter(x=>x.id!==id);
  LS.s('finPurchases',finPurchases);
  renderFinPurchases();
  renderFinDayLog();
  renderFinChart();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
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
            ${d.date?`<span style="font-family:var(--mono);font-size:10px;color:var(--t3)">${displayDate(d.date)}</span>`:''}
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
  d.paid=!d.paid;
  const key=nowDK();
  if(!finLog[key])finLog[key]=[];
  if(d.paid){
    // погашение долга: 'owe' (я должен) → expense, 'owed' (мне должны) → income
    finLog[key].push({id:nid++,type:d.direction==='owe'?'expense':'income',amount:d.amount,desc:`погашение долга: ${d.desc||''}`,debtId:d.id});
  } else {
    // Отмена погашения удаляет связанную запись независимо от даты оплаты.
    Object.keys(finLog).forEach(logKey=>{
      finLog[logKey]=finLog[logKey].filter(e=>e.debtId!==d.id);
      if(finLog[logKey].length===0)delete finLog[logKey];
    });
  }
  LS.s('finDebts',finDebts);LS.s('finLog',finLog);LS.s('nid',nid);
  renderFinDebts();
  renderFinDayLog();
  renderFinChart();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
}
function delFinDebt(id){
  finDebts=finDebts.filter(x=>x.id!==id);
  LS.s('finDebts',finDebts);
  renderFinDebts();
  renderFinDayLog();
  renderFinChart();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
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
  closeFinDebtModal();renderFinDebts();renderFinCapital();renderFinTotal();
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

  const slices=finPieSlices.filter(s=>s.name&&Number(s.pct)>0);
  const totalPct=slices.reduce((sum,s)=>sum+Number(s.pct),0);
  const unallocatedPct=Math.max(0,100-totalPct);
  const dpr=window.devicePixelRatio||1;
  const SIZE=expanded?280:220;
  canvas.width=SIZE*dpr;canvas.height=SIZE*dpr;
  canvas.style.width=SIZE+'px';canvas.style.height=SIZE+'px';
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,SIZE,SIZE);

  const cx=SIZE/2,cy=SIZE/2,r=SIZE/2-14,innerR=SIZE/2-48;
  const darkBg=document.body.classList.contains('light')?'#f0f0f0':'#0a0a0a';
  let startAngle=-Math.PI/2;

  ctx.beginPath();
  ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle=document.body.classList.contains('light')?'#dcdcdc':'#2a2a2a';
  ctx.fill();

  slices.forEach((s,i)=>{
    const pct=Number(s.pct);
    const angle=(pct/100)*Math.PI*2;
    const color=PIE_COLORS[i%PIE_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+angle);
    ctx.closePath();
    ctx.fillStyle=color;
    ctx.fill();
    ctx.strokeStyle=darkBg;
    ctx.lineWidth=2;
    ctx.stroke();

    // Label inside slice if big enough
    const mid=startAngle+angle/2;
    const labelR=(r+innerR)/2;
    const lx=cx+Math.cos(mid)*labelR;
    const ly=cy+Math.sin(mid)*labelR;
    if(angle>0.35){
      ctx.fillStyle='rgba(0,0,0,0.75)';
      ctx.font=`bold ${expanded?11:9}px DM Mono,monospace`;
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(Math.round(pct)+'%',lx,ly);
    }
    startAngle+=angle;
  });

  if(unallocatedPct>0){
    const angle=(unallocatedPct/100)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+angle);
    ctx.closePath();
    ctx.fillStyle=document.body.classList.contains('light')?'#c5c5c5':'#383838';
    ctx.fill();
    ctx.strokeStyle=darkBg;
    ctx.lineWidth=2;
    ctx.stroke();
  }

  // Inner donut hole
  ctx.beginPath();
  ctx.arc(cx,cy,innerR,0,Math.PI*2);
  const bgColor=document.body.classList.contains('light')?'#ffffff':'#0a0a0a';
  ctx.fillStyle=bgColor;
  ctx.fill();

  // Legend
  let legend=slices.map((s,i)=>{
    const color=PIE_COLORS[i%PIE_COLORS.length];
    const descHtml=s.desc?`<div style="font-size:11px;color:var(--t2);margin-top:2px;line-height:1.4">${s.desc}</div>`:'';
    const amount=finPieSum>0?`${Math.round(finPieSum*Number(s.pct)/100).toLocaleString('ru-RU')} ₽`:'— ₽';
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd)">
      <div style="width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0;margin-top:3px"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${s.name}</div>
        ${descHtml}
      </div>
      <div style="font-family:var(--mono);font-size:12px;color:${color};font-weight:700;flex-shrink:0;text-align:right;white-space:nowrap">${Number(s.pct)}%<br><span style="font-size:10px;color:var(--t2)">${amount}</span></div>
      <button onclick="openPieSliceModal(${s.id})" style="background:none;border:none;color:var(--t3);font-size:13px;cursor:pointer;padding:2px 4px" aria-label="Изменить категорию ${s.name}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
    </div>`;
  }).join('');
  if(unallocatedPct>0&&slices.length){
    legend+=`<div style="display:flex;align-items:center;gap:10px;padding:7px 0;color:var(--t2);font-size:12px"><div style="width:12px;height:12px;border-radius:3px;background:var(--c4);flex-shrink:0"></div><span style="flex:1">Не распределено</span><span style="font-family:var(--mono)">${unallocatedPct}% · ${finPieSum>0?Math.round(finPieSum*unallocatedPct/100).toLocaleString('ru-RU')+' ₽':'— ₽'}</span></div>`;
  }
  legendEl.innerHTML=legend||'<div style="font-size:12px;color:var(--t3);font-family:var(--mono);text-align:center;padding:8px 0">добавь категории кнопкой + выше</div>';
}

function updateFinPieSum(value){
  const parsed=value===''?0:Number(value);
  finPieSum=Number.isFinite(parsed)?Math.max(0,parsed):0;
  LS.s('finPieSum',finPieSum);
  ['finPieSumInput','finPieSumInputExpand'].forEach(id=>{
    const input=document.getElementById(id);
    if(input&&input.value!==value)input.value=value;
  });
  renderFinPie();
  if(_pieExpanded)drawPieChart('finPieCanvasExpand','finPieLegendExpand',true);
}

function renderFinPie(){
  ['finPieSumInput','finPieSumInputExpand'].forEach(id=>{
    const input=document.getElementById(id);
    if(input&&document.activeElement!==input)input.value=finPieSum||'';
  });
  drawPieChart('finPieCanvas','finPieLegend',false);
}

// Entry modal
function openFinEntryModal(type){
  _finEntryType=type;
  document.getElementById('finEntryTitle').textContent=type==='income'?'добавить доход':'добавить расход';
  document.getElementById('finEntryAmount').value='';
  document.getElementById('finEntryDesc').value='';
  const dateEl=document.getElementById('finEntryDate');
  if(dateEl)dateEl.value=finDKToISO(finViewDK);
  openModal('finEntryModal');
  setTimeout(()=>document.getElementById('finEntryAmount').focus(),100);
}
function closeFinEntryModal(){closeModal('finEntryModal');}
function confirmFinEntry(){
  const amount=parseFloat(document.getElementById('finEntryAmount').value)||0;
  const desc=document.getElementById('finEntryDesc').value.trim();
  if(!amount)return;
  // Дата из модалки (по умолчанию — просматриваемый день)
  const dateEl=document.getElementById('finEntryDate');
  const key=(dateEl&&dateEl.value)?finISOToDK(dateEl.value):finViewDK;
  if(!finLog[key])finLog[key]=[];
  finLog[key].push({id:nid++,type:_finEntryType,amount,desc});
  LS.s('finLog',finLog);LS.s('nid',nid);
  closeFinEntryModal();
  finViewDK=key;
  renderFinDayLog();
  renderFinChart();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
}

// Template modal
function openFinTplModal(period,type){
  _finTplEditId=null;
  _finTplPeriod=period;_finTplType=type;
  const pLabel={week:'неделя',month:'месяц',month3:'3 месяца',halfYear:'полгода',year:'год'};
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
  const pLabel={week:'неделя',month:'месяц',month3:'3 месяца',halfYear:'полгода',year:'год'};
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
    if(_finTplEditPeriod==='month')finSyncPlanFromTpl();
    closeFinTplModal();
    renderFinTpl(_finTplEditPeriod);
    flash('✓ Шаблон обновлён');
    _finTplEditId=null;_finTplEditPeriod=null;_finTplEditType=null;
    return;
  }
  _origConfirmFinTpl();
  if(_finTplPeriod==='month')finSyncPlanFromTpl();
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
      if(p?.paid){
        Object.keys(finLog).forEach(key=>(finLog[key]||[]).forEach(entry=>{
          if(entry.purchaseId===p.id){
            entry.amount=priceMin;
            entry.desc=`покупка: ${name}`;
          }
        }));
        LS.s('finLog',finLog);
      }
      LS.s('finPurchases',finPurchases);
      closeFinPurchaseModal();
      renderFinPurchases();
      renderFinDayLog();renderFinChart();renderFinCapital();renderFinMonths();renderFinTotal();
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
    if(d){
      d.name=name;d.amount=amount;d.desc=desc;d.date=date;
      Object.keys(finLog).forEach(key=>(finLog[key]||[]).forEach(entry=>{
        if(entry.debtId===d.id){
          entry.amount=amount;
          entry.desc=`погашение долга: ${desc||name}`;
        }
      }));
      LS.s('finLog',finLog);
    }
    LS.s('finDebts',finDebts);
    closeFinDebtModal();
    renderFinDebts();
    renderFinCapital();renderFinMonths();renderFinTotal();
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

// ══ ДЕНЕЖНАЯ РЕФОРМА: АКТИВЫ И КАПИТАЛ ══════════════════
const FIN_ASSET_PERIODS=['week','month','month3','halfYear','year'];
function finAssetPeriodIndex(period,date=new Date()){
  const y=date.getFullYear(),m=date.getMonth();
  if(period==='week'){
    const monday=new Date(y,m,date.getDate()-((date.getDay()+6)%7));
    const epochMonday=Date.UTC(1969,11,29);
    return Math.floor((Date.UTC(monday.getFullYear(),monday.getMonth(),monday.getDate())-epochMonday)/(7*86400000));
  }
  if(period==='month')return y*12+m;
  if(period==='month3')return y*4+Math.floor(m/3);
  if(period==='halfYear')return y*2+Math.floor(m/6);
  if(period==='year')return y;
  throw new Error('Неизвестный период переоценки актива: '+period);
}
function finAssetPeriodStart(period,index){
  let date;
  if(period==='week'){
    date=new Date(Date.UTC(1969,11,29)+index*7*86400000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
  }
  if(period==='month')date=new Date(Math.floor(index/12),index%12,1);
  else if(period==='month3')date=new Date(Math.floor(index/4),(index%4)*3,1);
  else if(period==='halfYear')date=new Date(Math.floor(index/2),(index%2)*6,1);
  else if(period==='year')date=new Date(index,0,1);
  else throw new Error('Неизвестный период переоценки актива: '+period);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function finUpdateAssetValues(){
  let changed=false;
  const validAssets=Array.isArray(finAssets)?finAssets:[];
  if(validAssets!==finAssets){finAssets=validAssets;changed=true;}
  if(!Array.isArray(finAssetHistory)){finAssetHistory=[];changed=true;}
  validAssets.forEach(asset=>{
    if(!asset||!FIN_ASSET_PERIODS.includes(asset.period)||!Number.isFinite(Number(asset.value))||!Number.isFinite(Number(asset.rate))||Number(asset.rate)<-100){
      console.error('Пропущен некорректный актив в финансовых данных',asset);
      return;
    }
    const currentIndex=finAssetPeriodIndex(asset.period);
    if(!Number.isInteger(asset.lastPeriodIndex)){
      asset.lastPeriodIndex=currentIndex;
      changed=true;
      return;
    }
    if(currentIndex<=asset.lastPeriodIndex)return;
    const rate=Number(asset.rate);
    for(let index=asset.lastPeriodIndex+1;index<=currentIndex;index++){
      const before=Number(asset.value);
      const after=Math.round(Math.max(0,before*(1+rate/100))*100)/100;
      const change=Math.round((after-before)*100)/100;
      asset.value=after;
      finAssetHistory.push({
        assetId:asset.id,
        name:asset.name,
        category:asset.category,
        date:finAssetPeriodStart(asset.period,index),
        period:asset.period,
        rate,
        change,
        value:after
      });
    }
    asset.lastPeriodIndex=currentIndex;
    changed=true;
  });
  if(changed){
    LS.s('finAssets',finAssets);
    LS.s('finAssetHistory',finAssetHistory);
  }
}
function finAssetsValue(){
  return (Array.isArray(finAssets)?finAssets:[]).reduce((sum,asset)=>sum+(Number(asset?.value)||0),0);
}
function finAssetPeriodLabel(period){
  return ({week:'неделю',month:'месяц',month3:'3 месяца',halfYear:'полгода',year:'год'})[period]||period;
}
function finAssetEscape(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function renderFinAssets(){
  const el=document.getElementById('finAssetsList');
  if(!el)return;
  const list=Array.isArray(finAssets)?finAssets.filter(asset=>asset&&typeof asset==='object'):[];
  if(!list.length){
    el.innerHTML='<div style="font-family:var(--mono);font-size:10px;color:var(--t3)">Добавь имущество или другие активы, чтобы учитывать их в капитале.</div>';
    return;
  }
  el.innerHTML=list.map(asset=>{
    const assetId=Number(asset.id);
    const delta=(finAssetHistory||[]).filter(entry=>entry&&Number(entry.assetId)===Number(asset.id)&&String(entry.date||'').startsWith(`${finViewY}-${String(finViewM+1).padStart(2,'0')}-`)).reduce((sum,entry)=>sum+(Number(entry.change)||0),0);
    const rate=Number(asset.rate)||0;
    return `<div class="card" style="padding:9px 10px;margin-bottom:5px;display:flex;align-items:center;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--mono);font-size:11px;color:var(--t)">${finAssetEscape(asset.name||'Актив')}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:2px">${finAssetEscape(asset.category||'Другое')} · ${rate>0?'+':''}${rate}% за ${finAssetPeriodLabel(asset.period)}</div>
        <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--a);margin-top:3px">${fmtR(Number(asset.value)||0)}${delta?` <span style="font-size:9px;color:${delta>0?'#4ade80':'#f87171'}">(${delta>0?'+':''}${fmtR(delta)} за месяц)</span>`:''}</div>
      </div>
      <button class="sh-btn" onclick="openFinAssetModal(${Number.isFinite(assetId)?assetId:0})" style="font-size:9px;padding:4px 7px">изменить</button>
    </div>`;
  }).join('');
}
let _finAssetEditId=null;
function openFinAssetModal(id){
  _finAssetEditId=id||null;
  const asset=id?(finAssets||[]).find(item=>Number(item.id)===Number(id)):null;
  document.getElementById('finAssetTitle').textContent=asset?'изменить актив':'добавить актив';
  document.getElementById('finAssetId').value=asset?.id||'';
  document.getElementById('finAssetName').value=asset?.name||'';
  document.getElementById('finAssetCategory').value=asset?.category||'Недвижимость';
  document.getElementById('finAssetValue').value=asset?.value??'';
  document.getElementById('finAssetRate').value=asset?.rate??'';
  document.getElementById('finAssetPeriod').value=asset?.period||'month';
  document.getElementById('finAssetDelBtn').style.display=asset?'':'none';
  openModal('finAssetModal');
}
function closeFinAssetModal(){_finAssetEditId=null;closeModal('finAssetModal');}
function confirmFinAsset(){
  const name=document.getElementById('finAssetName').value.trim();
  const valueInput=document.getElementById('finAssetValue').value.trim();
  const rateInput=document.getElementById('finAssetRate').value.trim();
  const value=Number(valueInput);
  const rate=Number(rateInput);
  const period=document.getElementById('finAssetPeriod').value;
  const category=document.getElementById('finAssetCategory').value;
  if(!name){flash('Укажи название актива');return;}
  if(!valueInput||!Number.isFinite(value)||value<0){flash('Укажи корректную стоимость актива');return;}
  if(!rateInput||!Number.isFinite(rate)||rate < -100){flash('Укажи процент изменения не меньше −100%');return;}
  if(!FIN_ASSET_PERIODS.includes(period)){flash('Выбери корректный период изменения');return;}
  const editing=_finAssetEditId&&(finAssets||[]).find(item=>Number(item.id)===Number(_finAssetEditId));
  const currentIndex=finAssetPeriodIndex(period);
  if(editing){
    const periodChanged=editing.period!==period;
    editing.name=name;editing.category=category;editing.value=Math.round(value*100)/100;editing.rate=rate;
    editing.period=period;
    if(periodChanged||!Number.isInteger(editing.lastPeriodIndex))editing.lastPeriodIndex=currentIndex;
  }else{
    finAssets.push({id:nid++,name,category,value:Math.round(value*100)/100,rate,period,lastPeriodIndex:currentIndex});
    LS.s('nid',nid);
  }
  LS.s('finAssets',finAssets);
  closeFinAssetModal();
  renderFinCapital();
  renderFinMonths();
  renderFinTotal();
  flash(editing?'✓ Актив обновлён':'✓ Актив добавлен в капитал');
}
function delFinAsset(){
  const id=_finAssetEditId;
  if(!id)return;
  showConfirm('Удалить актив и его историю изменения стоимости?',()=>{
    finAssets=finAssets.filter(asset=>Number(asset.id)!==Number(id));
    finAssetHistory=(finAssetHistory||[]).filter(entry=>Number(entry.assetId)!==Number(id));
    LS.s('finAssets',finAssets);LS.s('finAssetHistory',finAssetHistory);
    closeFinAssetModal();
    renderFinCapital();renderFinMonths();renderFinTotal();
    flash('Актив удалён');
  },null,'Да','Нет');
}

// Капитал = стартовый капитал + доходы − расходы + стоимость активов.
function finCapital(){
  finUpdateAssetValues();
  let inc=0,exp=0,receivables=0,liabilities=0;
  Object.keys(finLog).forEach(k=>{
    (finLog[k]||[]).forEach(e=>{
      if(e.type==='income')inc+=e.amount;else exp+=e.amount;
    });
  });
  (finDebts||[]).forEach(debt=>{
    if(!debt||debt.paid)return;
    if(debt.direction==='owed')receivables+=Number(debt.amount)||0;
    else if(debt.direction==='owe')liabilities+=Number(debt.amount)||0;
  });
  return (finCapital0||0)+inc-exp+finAssetsValue()+receivables-liabilities;
}
function renderFinCapital(){
  const el=document.getElementById('finCapitalVal');if(!el)return;
  const cap=finCapital();
  el.textContent=fmtR(cap);
  el.style.color=cap>0?'#4ade80':cap<0?'#f87171':'var(--t2)';
  const sub=document.getElementById('finCapitalSub');
  if(sub){
    // баланс за текущий просматриваемый месяц
    let curInc=0,curExp=0;
    const mk=String(finViewY)+'-'+String(finViewM+1).padStart(2,'0');
    Object.keys(finLog).forEach(k=>{
      if(k.startsWith(mk)){
        (finLog[k]||[]).forEach(e=>{if(e.type==='income')curInc+=e.amount;else curExp+=e.amount;});
      }
    });
    const curBal=curInc-curExp;
    const assetMonthChange=(finAssetHistory||[]).filter(entry=>entry.date?.startsWith(mk)).reduce((sum,entry)=>sum+(Number(entry.change)||0),0);
    const debtNet=(finDebts||[]).filter(d=>!d.paid).reduce((sum,d)=>sum+(d.direction==='owed'?1:d.direction==='owe'?-1:0)*(Number(d.amount)||0),0);
    sub.textContent=`старт ${fmtR(finCapital0||0)} · активы ${fmtR(finAssetsValue())} · долги ${debtNet>0?'+':''}${fmtR(debtNet)} · ${MSHORT[finViewM]}: ${curBal>0?'+':''}${fmtR(curBal)} · переоценка ${assetMonthChange>0?'+':''}${fmtR(assetMonthChange)}`;
  }
  renderFinAssets();
}
function openFinCapitalModal(){
  const inp=document.getElementById('finCapital0Inp');
  if(inp)inp.value=finCapital0||0;
  openModal('finCapitalModal');
  setTimeout(()=>{if(inp)inp.focus();},100);
}
function closeFinCapitalModal(){closeModal('finCapitalModal');}
function confirmFinCapital0(){
  const v=parseFloat(document.getElementById('finCapital0Inp').value)||0;
  finCapital0=v;LS.s('finCapital0',v);
  closeFinCapitalModal();
  renderFinCapital();
  flash('✓ Стартовый капитал сохранён');
}

// ══ ДЕНЕЖНАЯ РЕФОРМА: ТАБЛИЦА МЕСЯЦЕВ ═══════════════════
// Агрегат по месяцу из finLog + выполнение снимка плана.
function finMonthAgg(y,m){
  let inc=0,exp=0,assetChange=0;
  Object.keys(finLog).forEach(k=>{
    const p=k.split('-');
    if(+p[0]===y&&+p[1]===m){
      (finLog[k]||[]).forEach(e=>{if(e.type==='income')inc+=e.amount;else exp+=e.amount;});
    }
  });
  (finAssetHistory||[]).forEach(entry=>{
    if(!entry)return;
    const p=String(entry.date||'').split('-');
    if(+p[0]===y&&+p[1]===m+1)assetChange+=Number(entry.change)||0;
  });
  const plan=finPlans[finPlanKey(y,m)];
  let planInc=0,planExp=0,paidInc=0,paidExp=0,nInc=0,nExp=0;
  if(plan){
    planInc=(plan.income||[]).reduce((s,x)=>s+x.amount,0);
    planExp=(plan.expense||[]).reduce((s,x)=>s+x.amount,0);
    paidInc=(plan.income||[]).filter(x=>x.paid).length;
    paidExp=(plan.expense||[]).filter(x=>x.paid).length;
    nInc=(plan.income||[]).length;nExp=(plan.expense||[]).length;
  }
  return {inc,exp,assetChange,bal:inc-exp,planInc,planExp,paidInc,paidExp,nInc,nExp};
}
function finSetMonthsN(n){
  finMonthsN=n;
  const b6=document.getElementById('finMonths6Btn'),b12=document.getElementById('finMonths12Btn');
  if(b6){b6.style.background=n===6?'var(--a2)':'';b6.style.borderColor=n===6?'var(--ab)':'';b6.style.color=n===6?'var(--a)':'';}
  if(b12){b12.style.background=n===12?'var(--a2)':'';b12.style.borderColor=n===12?'var(--ab)':'';b12.style.color=n===12?'var(--a)':'';}
  renderFinMonths();
}
function renderFinMonths(){
  const el=document.getElementById('finMonthsTbl');if(!el)return;
  const now=new Date();
  const rows=[];
  let ty=now.getFullYear(),tm=now.getMonth();
  for(let i=0;i<finMonthsN;i++){
    rows.push({y:ty,m:tm,agg:finMonthAgg(ty,tm)});
    tm--;if(tm<0){tm=11;ty--;}
  }
  rows.reverse(); // от старых к новым
  const hasData=rows.some(r=>r.agg.inc||r.agg.exp||r.agg.assetChange||r.agg.nInc||r.agg.nExp);
  if(!hasData){
    el.innerHTML='<div style="font-size:12px;color:var(--t3);font-family:var(--mono)">данных за '+finMonthsN+' мес. нет</div>';
    return;
  }
  const totInc=rows.reduce((s,r)=>s+r.agg.inc,0);
  const totExp=rows.reduce((s,r)=>s+r.agg.exp,0);
  let html=`<div style="display:flex;gap:6px;font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px;text-transform:uppercase;padding-bottom:6px;border-bottom:1px solid var(--bd)">
    <div style="width:58px;flex-shrink:0">месяц</div>
    <div style="flex:1;text-align:right">доход</div>
    <div style="flex:1;text-align:right">расход</div>
    <div style="flex:1;text-align:right">баланс</div>
    <div style="flex:1;text-align:right">активы</div>
    <div style="width:35px;flex-shrink:0;text-align:right">план</div>
  </div>`;
  rows.forEach(r=>{
    const isCur=r.y===now.getFullYear()&&r.m===now.getMonth();
    const bal=r.agg.bal;
    const planTxt=(r.agg.nInc||r.agg.nExp)?`${r.agg.paidInc+r.agg.paidExp}/${r.agg.nInc+r.agg.nExp}`:'—';
    html+=`<div onclick="finGoMonth(${r.y},${r.m})" style="display:flex;gap:6px;font-family:var(--mono);font-size:11px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;${isCur?'color:var(--a)':'color:var(--t2)'}">
      <div style="width:58px;flex-shrink:0;${isCur?'font-weight:700':''}">${MSHORT[r.m]}${isCur?' ▸':''}</div>
      <div style="flex:1;text-align:right;color:#4ade80">${r.agg.inc?'+'+r.agg.inc.toLocaleString('ru'):'·'}</div>
      <div style="flex:1;text-align:right;color:#f87171">${r.agg.exp?'−'+r.agg.exp.toLocaleString('ru'):'·'}</div>
      <div style="flex:1;text-align:right;color:${bal>0?'#4ade80':bal<0?'#f87171':'var(--t3)'}">${bal?fmtR(bal):'·'}</div>
      <div style="flex:1;text-align:right;color:${r.agg.assetChange>0?'#4ade80':r.agg.assetChange<0?'#f87171':'var(--t3)'}">${r.agg.assetChange?(r.agg.assetChange>0?'+':'')+fmtR(r.agg.assetChange):'·'}</div>
      <div style="width:35px;flex-shrink:0;text-align:right;color:var(--t3)">${planTxt}</div>
    </div>`;
  });
  const totBal=totInc-totExp;
  const totAssets=rows.reduce((sum,row)=>sum+row.agg.assetChange,0);
  html+=`<div style="display:flex;gap:6px;font-family:var(--mono);font-size:11px;font-weight:700;padding:8px 0 2px;border-top:1px solid var(--bd);color:var(--t)">
    <div style="width:58px;flex-shrink:0">итого</div>
    <div style="flex:1;text-align:right;color:#4ade80">+${totInc.toLocaleString('ru')}</div>
    <div style="flex:1;text-align:right;color:#f87171">−${totExp.toLocaleString('ru')}</div>
    <div style="flex:1;text-align:right;color:${totBal>0?'#4ade80':'#f87171'}">${fmtR(totBal)}</div>
    <div style="flex:1;text-align:right;color:${totAssets>=0?'#4ade80':'#f87171'}">${totAssets>0?'+':''}${fmtR(totAssets)}</div>
    <div style="width:35px;flex-shrink:0"></div>
  </div>`;
  el.innerHTML=html;
}
function finClearMonthLog(){
  // Очищаем только финансовую историю (log) выбранного в данный момент месяца,
  // оставляя шаблоны, капитал, долги и прочие секции без изменений.
  const daysInMonth=new Date(finViewY,finViewM+1,0).getDate();
  let cleared=0;
  for(let d=1;d<=daysInMonth;d++){
    const k=finDK(finViewY,finViewM,d);
    if(!finLog[k])continue;
    if(finLog[k].length===0)continue;
    const n=finLog[k].length;
    delete finLog[k];
    LS.s('finLog',finLog);
    cleared+=n;
  }
  if(cleared===0)return;
  renderFinDayLog();
  renderFinMonths();
  renderFinChart();
  renderFinCapital();
  flash('история за '+finMName(finViewM)+' '+finViewY+' очищена (удалено записей: '+cleared+')');
}

function finGoMonth(y,m){
  const now=new Date();
  if(y>now.getFullYear()||(y===now.getFullYear()&&m>now.getMonth())){flash('это текущий месяц или будущее');return;}
  finPeriod='month';
  ["month","year"].forEach(k=>{
    const id="fin"+k.charAt(0).toUpperCase()+k.slice(1)+"Btn";
    const btn=document.getElementById(id);
    if(!btn)return;
    btn.style.background=k==='month'?"var(--a2)":"";
    btn.style.borderColor=k==='month'?"var(--ab)":"";
    btn.style.color=k==='month'?"var(--a)":"";
  });
  finViewY=y;finViewM=m;
  finViewDK=(y===now.getFullYear()&&m===now.getMonth())?nowDK():finDK(y,m,1);
  finRefresh();
}

// ══ ДЕНЕЖНАЯ РЕФОРМА: ИТОГ ЗА ВСЁ ВРЕМЯ (самый низ) ═════
function renderFinTotal(){
  const el=document.getElementById('finTotalAll');if(!el)return;
  let inc=0,exp=0;
  Object.keys(finLog).forEach(k=>{
    (finLog[k]||[]).forEach(e=>{if(e.type==='income')inc+=e.amount;else exp+=e.amount;});
  });
  const cap=finCapital();
  // Агрегация месяцев для «лучшего месяца»
  const seen={};
  Object.keys(finLog).forEach(k=>{
    const p=k.split('-');const key=p[0]+'-'+p[1];
    if(!seen[key])seen[key]={y:+p[0],m:+p[1],inc:0,exp:0};
    (finLog[k]||[]).forEach(e=>{if(e.type==='income')seen[key].inc+=e.amount;else seen[key].exp+=e.amount;});
  });
  let best=null;
  Object.keys(seen).forEach(k=>{
    const v=seen[k];v.bal=v.inc-v.exp;
    if(!best||v.bal>best.bal)best=v;
  });
  const monthsCount=Object.keys(seen).length;
  el.innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <div style="flex:1;min-width:100px;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:10px 12px">
        <div style="font-family:var(--mono);font-size:8px;color:rgba(74,222,128,0.7);letter-spacing:1px">доход за всё время</div>
        <div style="font-family:var(--mono);font-size:16px;color:#4ade80;margin-top:3px">+${inc.toLocaleString('ru')} ₽</div>
      </div>
      <div style="flex:1;min-width:100px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:10px 12px">
        <div style="font-family:var(--mono);font-size:8px;color:rgba(248,113,113,0.7);letter-spacing:1px">расход за всё время</div>
        <div style="font-family:var(--mono);font-size:16px;color:#f87171;margin-top:3px">−${exp.toLocaleString('ru')} ₽</div>
      </div>
      <div style="flex:1;min-width:100px;background:${cap>=0?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)'};border:1px solid ${cap>=0?'rgba(74,222,128,0.2)':'rgba(248,113,113,0.2)'};border-radius:10px;padding:10px 12px">
        <div style="font-family:var(--mono);font-size:8px;color:var(--t3);letter-spacing:1px">капитал</div>
        <div style="font-family:var(--mono);font-size:16px;color:${cap>=0?'#4ade80':'#f87171'};margin-top:3px">${fmtR(cap)}</div>
      </div>
    </div>
    <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:8px;display:flex;gap:14px;flex-wrap:wrap">
      <span>месяцев с данными: ${monthsCount}</span>
      ${best?`<span>лучший месяц: ${MSHORT[best.m]} ${best.y} · ${fmtR(best.bal)}</span>`:''}
    </div>`;
}

function _xlsxXmlEscape(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
}
function _xlsxColName(index){
  let name='';
  for(let n=index+1;n;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;
  return name;
}
function _xlsxCellXml(value,rowIndex,colIndex){
  if(value===null||value===undefined||value==='')return '';
  const ref=_xlsxColName(colIndex)+(rowIndex+1);
  if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"><v>${value}</v></c>`;
  if(typeof value==='boolean')return `<c r="${ref}" t="b"><v>${value?1:0}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${_xlsxXmlEscape(value)}</t></is></c>`;
}
function _xlsxWorksheetXml(rows,drawing=false){
  const colCount=Math.max(1,...rows.map(row=>row.length));
  const lastCell=_xlsxColName(colCount-1)+(rows.length||1);
  const rowXml=rows.map((row,rowIndex)=>`<row r="${rowIndex+1}">${row.map((value,colIndex)=>{
    const cell=_xlsxCellXml(value,rowIndex,colIndex);
    return rowIndex===0&&cell?cell.replace('<c ','<c s="1" '):cell;
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lastCell}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData>${rowXml}</sheetData><autoFilter ref="A1:${lastCell}"/>${drawing?'<drawing r:id="rId1"/>':''}</worksheet>`;
}
function _xlsxMonthLabel(year,month){return `${MSHORT[month]} ${year}`;}
function _xlsxChartTitle(text){
  return `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr/></a:pPr><a:r><a:rPr lang="ru-RU" sz="1400" b="1"/><a:t>${_xlsxXmlEscape(text)}</a:t></a:r><a:endParaRPr lang="ru-RU"/></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
}
function _xlsxChartRef(kind,formula){
  return kind==='num'
    ?`<c:numRef><c:f>${_xlsxXmlEscape(formula)}</c:f></c:numRef>`
    :`<c:strRef><c:f>${_xlsxXmlEscape(formula)}</c:f></c:strRef>`;
}
function _xlsxLineChartForSheetXml(sheetName,title,categoryCol,seriesColumns,rowCount,chartType='line'){
  const cat=`'${sheetName}'!$${categoryCol}$2:$${categoryCol}$${rowCount}`;
  const series=seriesColumns.map(([col,name,color],i)=>`<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx>${_xlsxChartRef('str',`'${sheetName}'!$${col}$1`)}</c:tx><c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr>${chartType==='line'?'<c:marker><c:symbol val="circle"/><c:size val="4"/></c:marker>':''}<c:cat>${_xlsxChartRef('str',cat)}</c:cat><c:val>${_xlsxChartRef('num',`'${sheetName}'!$${col}$2:$${col}$${rowCount}`)}</c:val></c:ser>`).join('');
  const chartBody=chartType==='bar'
    ?`<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:gapWidth val="70"/><c:overlap val="0"/><c:axId val="10001"/><c:axId val="10002"/></c:barChart>`
    :`<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:marker val="1"/><c:smooth val="0"/><c:axId val="10001"/><c:axId val="10002"/></c:lineChart>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:date1904 val="0"/><c:lang val="ru-RU"/><c:chart>${_xlsxChartTitle(title)}<c:plotArea><c:layout/>${chartBody}<c:catAx><c:axId val="10001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:crossAx val="10002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="10002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="#,##0.00" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="10001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/><c:layout/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings></c:chartSpace>`;
}
function _xlsxPieChartXml(rowCount){
  const cats=`'Категории'!$A$2:$A$${rowCount}`;
  const vals=`'Категории'!$B$2:$B$${rowCount}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:lang val="ru-RU"/><c:chart>${_xlsxChartTitle('Распределение бюджета по категориям')}<c:plotArea><c:layout/><c:pieChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:cat>${_xlsxChartRef('str',cats)}</c:cat><c:val>${_xlsxChartRef('num',vals)}</c:val></c:ser><c:dLbls><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="1"/><c:showPercent val="1"/><c:showLeaderLines val="1"/></c:dLbls><c:firstSliceAng val="0"/></c:pieChart></c:plotArea><c:legend><c:legendPos val="r"/><c:layout/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:printSettings><c:headerFooter/><c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/><c:pageSetup/></c:printSettings></c:chartSpace>`;
}
function _xlsxChartsDrawingXml(chartCount){
  const anchor=(index,col,row)=>`<xdr:twoCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${col+8}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row+16}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${index+1}" name="Chart ${index+1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${index+1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  const anchors=Array.from({length:chartCount},(_,i)=>anchor(i,(i%2)*9,1+Math.floor(i/2)*18)).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors}</xdr:wsDr>`;
}
function _xlsxStylesXml(){
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF263746"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}
function _xlsxCrc32(bytes){
  let crc=0xFFFFFFFF;
  for(const byte of bytes){
    crc^=byte;
    for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);
  }
  return (crc^0xFFFFFFFF)>>>0;
}
function _xlsxZip(files){
  const encoder=new TextEncoder(),localParts=[],centralParts=[];
  let offset=0;
  const now=new Date();
  const dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|Math.floor(now.getSeconds()/2);
  const dosDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  files.forEach(file=>{
    const name=encoder.encode(file.name),data=encoder.encode(file.content),crc=_xlsxCrc32(data);
    if(data.length>0xFFFFFFFF||offset>0xFFFFFFFF)throw new Error('Файл экспорта Excel превышает поддерживаемый размер ZIP.');
    const local=new Uint8Array(30+name.length+data.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);
    lv.setUint16(10,dosTime,true);lv.setUint16(12,dosDate,true);lv.setUint32(14,crc,true);
    lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);lv.setUint16(28,0,true);
    local.set(name,30);local.set(data,30+name.length);localParts.push(local);
    const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);
    cv.setUint16(12,dosTime,true);cv.setUint16(14,dosDate,true);cv.setUint32(16,crc,true);
    cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);
    cv.setUint16(30,0,true);cv.setUint16(32,0,true);cv.setUint16(34,0,true);cv.setUint16(36,0,true);
    cv.setUint32(38,0,true);cv.setUint32(42,offset,true);central.set(name,46);centralParts.push(central);
    offset+=local.length;
  });
  const centralSize=centralParts.reduce((sum,part)=>sum+part.length,0);
  if(files.length>0xFFFF||offset+centralSize>0xFFFFFFFF)throw new Error('Слишком много данных для одной книги Excel.');
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(4,0,true);ev.setUint16(6,0,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);ev.setUint16(20,0,true);
  return new Blob([...localParts,...centralParts,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
async function exportFinanceExcel(){
  try{
    finUpdateAssetValues();
    archiveFinPurchases();
    const now=new Date(),monthRows=new Map(),dayRows=new Map(),transactions=[];
    const ensureDayRow=date=>{
      const key=dk(date);
      if(!dayRows.has(key))dayRows.set(key,{date:new Date(date.getFullYear(),date.getMonth(),date.getDate()),income:0,expense:0,assetChange:0});
      return dayRows.get(key);
    };
    Object.entries(finLog||{}).forEach(([key,entries])=>{
      const date=dkToDate(key);
      if(Number.isNaN(date.getTime()))return;
      const monthKey=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
      if(!monthRows.has(monthKey))monthRows.set(monthKey,{year:date.getFullYear(),month:date.getMonth(),income:0,expense:0,assetChange:0});
      (Array.isArray(entries)?entries:[]).forEach(entry=>{
        const amount=Number(entry.amount)||0;
        const type=entry.type==='income'?'Доход':'Расход';
        if(entry.type==='income')monthRows.get(monthKey).income+=amount;
        else monthRows.get(monthKey).expense+=amount;
        if(entry.type==='income')ensureDayRow(date).income+=amount;
        else ensureDayRow(date).expense+=amount;
        transactions.push([key,type,amount,entry.desc||'',entry.source||'',entry.purchaseId??'',entry.debtId??'',entry.planPeriod||'',entry.planKey||'',entry.id??'']);
      });
    });
    (finAssetHistory||[]).forEach(entry=>{
      if(!entry)return;
      const p=String(entry.date||'').split('-').map(Number);
      if(p.length!==3||!p[0]||!p[1])return;
      const monthKey=`${p[0]}-${String(p[1]).padStart(2,'0')}`;
      if(!monthRows.has(monthKey))monthRows.set(monthKey,{year:p[0],month:p[1]-1,income:0,expense:0,assetChange:0});
      monthRows.get(monthKey).assetChange+=Number(entry.change)||0;
      ensureDayRow(new Date(p[0],p[1]-1,p[2])).assetChange+=Number(entry.change)||0;
    });
    const months=[...monthRows.values()].sort((a,b)=>a.year-b.year||a.month-b.month);
    const sortedDays=[...dayRows.values()].sort((a,b)=>a.date-b.date);
    const dailyRows=[['Дата','Доходы, ₽','Расходы, ₽','Баланс, ₽','Изменение стоимости активов, ₽']];
    if(sortedDays.length){
      const start=new Date(sortedDays[0].date.getFullYear(),sortedDays[0].date.getMonth(),sortedDays[0].date.getDate());
      const end=new Date(Math.max(now.getTime(),sortedDays.at(-1).date.getTime()));
      const span=Math.floor((Date.UTC(end.getFullYear(),end.getMonth(),end.getDate())-Date.UTC(start.getFullYear(),start.getMonth(),start.getDate()))/86400000);
      if(span>1_048_574)throw new Error('История длиннее лимита Excel: дневной лист превышает 1 048 575 строк.');
      for(let day=0;day<=span;day++){
        const date=new Date(start.getFullYear(),start.getMonth(),start.getDate()+day);
        const row=dayRows.get(dk(date))||{income:0,expense:0,assetChange:0};
        dailyRows.push([`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,row.income,row.expense,row.income-row.expense,row.assetChange]);
      }
    }else dailyRows.push(['Нет данных',0,0,0,0]);
    const monthDataRows=months.length
      ?months.map(month=>[_xlsxMonthLabel(month.year,month.month),month.income,month.expense,month.income-month.expense,month.assetChange])
      :[['Нет данных',0,0,0,0]];
    const allIncome=transactions.reduce((sum,row)=>sum+(row[1]==='Доход'?row[2]:0),0);
    const allExpense=transactions.reduce((sum,row)=>sum+(row[1]==='Расход'?row[2]:0),0);
    const debtOwed=(finDebts||[]).filter(debt=>debt&&!debt.paid&&debt.direction==='owed').reduce((sum,debt)=>sum+(Number(debt.amount)||0),0);
    const debtOwe=(finDebts||[]).filter(debt=>debt&&!debt.paid&&debt.direction==='owe').reduce((sum,debt)=>sum+(Number(debt.amount)||0),0);
    const capital=finCapital();
    const sheets=[];
    const addSheet=(name,rows,withDrawing=false)=>sheets.push({name,rows,drawing:withDrawing});

    const summary=[
      ['Показатель','Значение'],
      ['Дата экспорта',now.toLocaleString('ru-RU')],
      ['Стартовый капитал',Number(finCapital0)||0],
      ['Бюджет',Number(LS.g('finBudget',0))||0],
      ['Доходы за всё время',allIncome],
      ['Расходы за всё время',allExpense],
      ['Стоимость активов',finAssetsValue()],
      ['Мне должны (не погашено)',debtOwed],
      ['Я должен (не погашено)',debtOwe],
      ['Чистый капитал',capital],
      ['Изменение стоимости активов за всё время',(finAssetHistory||[]).reduce((sum,item)=>sum+(Number(item?.change)||0),0)],
      [],
      ['По месяцам','Доходы','Расходы','Баланс','Переоценка активов','Изменение суммарно']
    ];
    let totalChange=0;
    months.forEach(month=>{
      const balance=month.income-month.expense;
      totalChange+=balance+month.assetChange;
      summary.push([_xlsxMonthLabel(month.year,month.month),month.income,month.expense,balance,month.assetChange,totalChange]);
    });
    addSheet('Сводка',summary);
    const transactionRows=[['Дата','Тип','Сумма, ₽','Описание','Источник','ID покупки','ID долга','Период плана','Ключ плана','ID записи'],...transactions.sort((a,b)=>dkToDate(a[0])-dkToDate(b[0]))];
    addSheet('Операции',transactionRows);
    addSheet('По месяцам',[
      ['Месяц','Доходы, ₽','Расходы, ₽','Баланс, ₽','Изменение активов, ₽'],
      ...monthDataRows
    ]);
    addSheet('По дням',dailyRows);
    const planRows=[['Вид','Период','Ключ периода','Тип','Название','Сумма, ₽','Оплачено','ID']];
    ['week','month','month3','halfYear','year'].forEach(period=>{
      const plan=finTpl[period]||{};
      ['income','expense'].forEach(type=>(plan[type]||[]).forEach(item=>planRows.push(['Шаблон',period,'',type==='income'?'Доход':'Расход',item.name,item.amount,!!item.paid,item.id])));
    });
    Object.entries(finPlans||{}).forEach(([key,plan])=>['income','expense'].forEach(type=>(plan?.[type]||[]).forEach(item=>planRows.push(['Снимок',key,key,type==='income'?'Доход':'Расход',item.name,item.amount,!!item.paid,item.id]))));
    addSheet('Планы',planRows);
    addSheet('Покупки и архив',[
      ['Статус','Название','Цена от, ₽','Цена до, ₽','Дата покупки','Оплачено','Время оплаты','ID'],
      ...(finPurchases||[]).filter(Boolean).map(item=>[
        item.archived?'Архив':item.paid?'Оплачено':'Активная',
        item.name||'',Number(item.priceMin??item.price)||0,Number(item.priceMax)||0,item.date||'',
        !!item.paid,item.paidAt?new Date(Number(item.paidAt)).toLocaleString('ru-RU'):'',item.id??''
      ])
    ]);
    addSheet('Долги',[
      ['Направление','Название','Сумма, ₽','Описание','Дата возврата','Погашено','ID'],
      ...(finDebts||[]).filter(Boolean).map(debt=>[debt.direction==='owed'?'Мне должны':'Я должен',debt.name||'',Number(debt.amount)||0,debt.desc||'',debt.date||'',!!debt.paid,debt.id??''])
    ]);
    addSheet('Активы',[
      ['Категория','Название','Текущая стоимость, ₽','Изменение за период, %','Период','ID'],
      ...(finAssets||[]).filter(Boolean).map(asset=>[asset.category||'',asset.name||'',Number(asset.value)||0,Number(asset.rate)||0,finAssetPeriodLabel(asset.period),asset.id??''])
    ]);
    addSheet('Переоценка',[
      ['Дата периода','Категория','Актив','Период','Изменение, ₽','Стоимость после переоценки, ₽','Ставка, %','ID актива'],
      ...(finAssetHistory||[]).filter(Boolean).map(entry=>[entry.date||'',entry.category||'',entry.name||'',finAssetPeriodLabel(entry.period),Number(entry.change)||0,Number(entry.value)||0,Number(entry.rate)||0,entry.assetId??''])
    ]);
    const categoryRows=[
      ['Категория','Доля, %','Сумма из базы, ₽','Описание','Общая база, ₽'],
      ...(finPieSlices||[]).filter(Boolean).map(slice=>[slice.name||'',Number(slice.pct)||0,Math.round((Number(finPieSum)||0)*(Number(slice.pct)||0))/100,slice.desc||'',Number(finPieSum)||0])
    ];
    const allocatedPct=(finPieSlices||[]).reduce((sum,slice)=>sum+(Number(slice.pct)||0),0);
    if(allocatedPct<100&&finPieSlices?.length)categoryRows.push(['Не распределено',100-allocatedPct,Math.round((Number(finPieSum)||0)*(100-allocatedPct))/100,'',Number(finPieSum)||0]);
    if(categoryRows.length===1)categoryRows.push(['Категорий нет',0,0,'',Number(finPieSum)||0]);
    addSheet('Категории',categoryRows);
    addSheet('Настройки',[
      ['Параметр','Значение'],
      ['Просматриваемый график',finPeriod==='year'?'Год':'Месяц'],
      ['Тип графика в приложении',finChartType==='bar'?'Столбчатый':'Линейный'],
      ['Просматриваемый год',finViewY],
      ['Просматриваемый месяц',_xlsxMonthLabel(finViewY,finViewM)],
      ['Количество месяцев в таблице',finMonthsN],
      ['Режим круговой диаграммы',finPieMode||'%'],
      ['Сумма для распределения, ₽',Number(finPieSum)||0],
      ['Бюджет, ₽',Number(LS.g('finBudget',0))||0],
      ['Стартовый капитал, ₽',Number(finCapital0)||0],
      ['Сумма стартовых активов',finAssetsValue()],
      ['Долг к получению, ₽',debtOwed],
      ['Долг к возврату, ₽',debtOwe],
      ['Итоговый капитал, ₽',capital]
    ]);
    addSheet('Графики',[
      ['Графики финансов'],
      ['Дневная динамика доходов и расходов'],
      ['Помесячная динамика доходов и расходов — линия и столбцы'],
      ['Переоценка активов по периодам'],
      ['Доли категорий бюджета']
    ],true);

    const graphSheetIndex=sheets.findIndex(sheet=>sheet.name==='Графики')+1;
    const chartRowCount=(sheetName,minimum=2)=>{
      const sheet=sheets.find(item=>item.name===sheetName);
      return Math.max(minimum,sheet?.rows.length||1);
    };
    const chartFiles=[
      ['chart1.xml',_xlsxLineChartForSheetXml('По дням','Доходы и расходы по дням','A',[['B','Доходы','4ADE80'],['C','Расходы','F87171']],chartRowCount('По дням'))],
      ['chart2.xml',_xlsxLineChartForSheetXml('По месяцам','Доходы и расходы по месяцам','A',[['B','Доходы','4ADE80'],['C','Расходы','F87171']],chartRowCount('По месяцам'))],
      ['chart3.xml',_xlsxLineChartForSheetXml('По месяцам','Сравнение доходов и расходов по месяцам','A',[['B','Доходы','4ADE80'],['C','Расходы','F87171']],chartRowCount('По месяцам'),'bar')],
      ['chart4.xml',_xlsxLineChartForSheetXml('По месяцам','Переоценка активов по месяцам','A',[['E','Изменение активов','A78BFA']],chartRowCount('По месяцам'))],
      ['chart5.xml',_xlsxPieChartXml(chartRowCount('Категории'))]
    ];
    const files=[];
    const pushFile=(name,content)=>files.push({name,content});
    const workbookSheets=sheets.map((sheet,i)=>`<sheet name="${_xlsxXmlEscape(sheet.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('');
    pushFile('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((sheet,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>${chartFiles.map(([name])=>`<Override PartName="/xl/charts/${name}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join('')}</Types>`);
    pushFile('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    pushFile('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${workbookSheets}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
    pushFile('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((sheet,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    pushFile('xl/styles.xml',_xlsxStylesXml());
    sheets.forEach((sheet,i)=>pushFile(`xl/worksheets/sheet${i+1}.xml`,_xlsxWorksheetXml(sheet.rows,sheet.drawing)));
    pushFile(`xl/worksheets/_rels/sheet${graphSheetIndex}.xml.rels`,`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
    pushFile('xl/drawings/drawing1.xml',_xlsxChartsDrawingXml(chartFiles.length));
    pushFile('xl/drawings/_rels/drawing1.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${chartFiles.map(([name],i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/${name}"/>`).join('')}</Relationships>`);
    chartFiles.forEach(([name,content])=>pushFile(`xl/charts/${name}`,content));

    const blob=_xlsxZip(files);
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`logos_finansy_${new Date().toISOString().slice(0,10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    flash('✓ Финансовая книга Excel выгружена');
  }catch(error){
    console.error('Не удалось сформировать финансовую книгу Excel',error);
    flash('Не удалось выгрузить Excel: '+(error?.message||'ошибка формирования файла'));
  }
}
