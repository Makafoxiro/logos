// ═══ MODULE: notifs.js ═══
// ══════════════════════════════════════════════════════════
// УВЕДОМЛЕНИЯ — Web Notifications API
// ══════════════════════════════════════════════════════════
let _notifTimers=[];

function notifEnabled(){
  return LS.g('notifEnabled',false) && 'Notification' in window && Notification.permission==='granted';
}

async function requestNotifPermission(){
  if(!('Notification' in window)){flash('Уведомления не поддерживаются браузером');return;}
  const perm=await Notification.requestPermission();
  if(perm==='granted'){
    LS.s('notifEnabled',true);
    scheduleAllNotifs();
    flash('✓ Уведомления включены');
    renderNotifSettings();
  } else {
    LS.s('notifEnabled',false);
    flash('Уведомления отклонены браузером');
  }
}

function disableNotifs(){
  LS.s('notifEnabled',false);
  _notifTimers.forEach(clearTimeout);
  _notifTimers=[];
  flash('Уведомления отключены');
  renderNotifSettings();
}

function sendNotif(title,body,tag){
  if(!notifEnabled())return;
  try{ new Notification(title,{body,icon:'',tag:tag||'logos',silent:false}); }catch(e){}
}

// Вычислить мс до указанного HH:MM сегодня (или завтра если уже прошло)
function msUntil(hhmm){
  const [h,m]=hhmm.split(':').map(Number);
  const now=new Date();
  const target=new Date(now);
  target.setHours(h,m,0,0);
  if(target<=now) target.setDate(target.getDate()+1);
  return target-now;
}

function scheduleAllNotifs(){
  _notifTimers.forEach(clearTimeout);
  _notifTimers=[];
  if(!notifEnabled())return;

  const cfg=LS.g('notifCfg',{
    deadline:{on:true},
    weekly:{on:true,time:'09:00',dow:1},
    monthly:{on:true,time:'09:00',day:1},
    birthday:{on:true,time:'09:00'},
    newyear:{on:true,time:'09:00'},
    homework:{on:true},
    watchlist:{on:true},
    patches:{on:true}
  });

  // ДЕДЛАЙНЫ — проверять каждые 6 часов
  if(cfg.deadline.on){
    const checkDeadlines=()=>{
      const now=new Date();
      const checkDays=[0,1,3,7,15,30];
      goals.forEach(g=>{
        if(!g.deadline||g.done)return;
        const d=parseLocalDate(g.deadline);if(!d)return;
        const days=Math.round((d-now)/86400000);
        if(!checkDays.includes(days))return;
        const lbl=days===0?'🔴 Дедлайн сегодня!':days===1?'⏰ Дедлайн завтра':days===3?'⏰ Через 3 дня дедлайн':days===7?'⏰ Через неделю дедлайн':days===15?'⏰ Через 15 дней дедлайн':'⏰ Через 30 дней дедлайн';
        sendNotif(lbl,g.name,'dl-'+g.id+'-d'+days);
      });
    };
    checkDeadlines();
    const t=setInterval(checkDeadlines,6*3600*1000);
    _notifTimers.push(t);
  }

  // ЕЖЕНЕДЕЛЬНЫЙ — краткий обзор в начале недели
  if(cfg.weekly&&cfg.weekly.on){
    const schedWeekly=()=>{
      const now=new Date();
      const dow=now.getDay(); // 0=вс,1=пн,...,6=сб
      const targetDows=[6,0,1]; // Сб, Вс, Пн
      const [h,m]=(cfg.weekly.time||'09:00').split(':').map(Number);
      let minMs=Infinity;
      let nearestTarget=null;
      targetDows.forEach(td=>{
        let daysToNext=(td-dow+7)%7||7;
        const candidate=new Date(now);
        candidate.setDate(candidate.getDate()+daysToNext);
        candidate.setHours(h,m,0,0);
        const ms=candidate-now;
        if(ms>0&&ms<minMs){minMs=ms;nearestTarget=candidate;}
      });
      if(!nearestTarget)return;
      const t=setTimeout(()=>{
        sendNotif('📋 Начало недели',`Запланируй задачи на неделю в ЛОГОС`,'weekly');
        schedWeekly();
      },minMs);
      _notifTimers.push(t);
    };
    schedWeekly();
  }

  // ЕЖЕМЕСЯЧНЫЙ — за 3/1/0 дней до конца месяца
  if(cfg.monthly&&cfg.monthly.on){
    const schedMonthly=()=>{
      const now=new Date();
      const [h,m]=(cfg.monthly.time||'09:00').split(':').map(Number);
      const todayClean=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      const endOfMonth=new Date(now.getFullYear(),now.getMonth()+1,0);
      const daysLeft=Math.round((endOfMonth-todayClean)/86400000);
      const checkDays=[0,1,3];
      if(checkDays.includes(daysLeft)){
        const target=new Date(now);
        target.setHours(h,m,0,0);
        if(target>now){
          const ms=target-now;
          const t=setTimeout(()=>{
            const curGoals=getMG().filter(x=>!x.done).length;
            const lbl=daysLeft===0?'📅 Конец месяца сегодня!':daysLeft===1?'📅 Завтра конец месяца':'📅 Через 3 дня конец месяца';
            const body=curGoals>0?`Не выполнено целей: ${curGoals}. Подведи итоги месяца!`:'Подведи итоги месяца!';
            sendNotif(lbl,body,'monthly-'+daysLeft);
            // Перепланировать на следующий день
            setTimeout(schedMonthly,24*3600*1000);
          },ms);
          _notifTimers.push(t);
          return;
        }
      }
      // Запланировать на завтра в то же время
      const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,h,m,0,0);
      const ms=tomorrow-now;
      const t=setTimeout(schedMonthly,ms);
      _notifTimers.push(t);
    };
    schedMonthly();
  }

  // ДР — уведомления за 15/7/3/1/0 дней до ДР
  if(cfg.birthday&&cfg.birthday.on){
    const schedBirthday=()=>{
      const now=new Date();
      const [h,m]=(cfg.birthday.time||'09:00').split(':').map(Number);
      const checkDays=[0,1,3,7,15];
      birthdays.forEach(b=>{
        if(!b.date)return;
        const days=daysToAnnual(b.date,now);
        if(days===null||days===undefined)return;
        if(!checkDays.includes(days))return;
        const target=new Date(now);
        target.setHours(h,m,0,0);
        if(target<=now)target.setDate(target.getDate()+1);
        const ms=target-now;
        const t2=setTimeout(()=>{
          const lbl=days===0?'🎂 Сегодня ДР!':days===1?'🎂 Завтра ДР!':days===3?'🎂 Через 3 дня ДР':days===7?'🎂 Через неделю ДР':'🎂 Через 15 дней ДР';
          sendNotif(lbl,b.name,'bd-'+b.id+'-'+days);
        },ms);
        _notifTimers.push(t2);
      });
      // Перепланировать через 24ч
      const t=setTimeout(schedBirthday,24*3600*1000);
      _notifTimers.push(t);
    };
    schedBirthday();
  }

  // ДЗ — уведомление за 3 дня, проверка каждые 6ч
  if(cfg.homework&&cfg.homework.on){
    const checkHW=()=>{
      const now=new Date();
      homework.forEach(h=>{
        if(!h.date)return;
        const days=daysToDeadline(h.date,now);
        if(days===null||days<0||days>3)return;
        const lbl=days===0?'📚 Сдать сегодня!':days===1?'📚 Сдать завтра!':'📚 ДЗ через '+days+'д.';
        sendNotif(lbl,h.subj+': '+h.task.slice(0,40),'hw-'+h.id+'-'+days);
      });
    };
    checkHW();
    const t=setInterval(checkHW,6*3600*1000);
    _notifTimers.push(t);
  }

  // ВОТЧЛИСТ — уведомление за 7 дней, проверка каждые 6ч
  if(cfg.watchlist&&cfg.watchlist.on){
    const checkWatch=()=>{
      const now=new Date();
      watchlist.forEach(w=>{
        if(!w.date||w.status==='done')return;
        const days=daysToDeadline(w.date,now);
        if(days===null||days<0||days>7)return;
        const lbl=days===0?'🎬 Дедлайн сегодня!':days===1?'🎬 Дедлайн завтра!':'🎬 Дедлайн через '+days+'д.';
        sendNotif(lbl,w.name,'watch-'+w.id+'-'+days);
      });
    };
    checkWatch();
    const t=setInterval(checkWatch,6*3600*1000);
    _notifTimers.push(t);
  }

  // ПАТЧИ — уведомление за 7 дней, проверка каждые 6ч
  if(cfg.patches&&cfg.patches.on){
    const checkPatches=()=>{
      const now=new Date();
      patches.forEach(p=>{
        if(!p.date||p.done)return;
        const days=daysToDeadline(p.date,now);
        if(days===null||days<0||days>7)return;
        const lbl=days===0?'🔧 Патч — срок сегодня!':days===1?'🔧 Патч — срок завтра!':'🔧 Патч через '+days+'д.';
        sendNotif(lbl,p.text.slice(0,50),'patch-'+p.id+'-'+days);
      });
    };
    checkPatches();
    const t=setInterval(checkPatches,6*3600*1000);
    _notifTimers.push(t);
  }

  // НОВЫЙ ГОД — 25 дек → 5 янв
  if(cfg.newyear&&cfg.newyear.on){
    const schedNY=()=>{
      const now=new Date();
      const [h,m]=(cfg.newyear.time||'09:00').split(':').map(Number);
      const mo=now.getMonth(); // 0=янв...11=дек
      const d=now.getDate();
      const inNYPeriod=(mo===11&&d>=25)||(mo===0&&d<=5);
      if(!inNYPeriod){
        // Запланировать на 25 дек текущего или следующего года
        const year=mo<11||(mo===11&&d<25)?now.getFullYear():now.getFullYear()+1;
        const target=new Date(year,11,25,h,m,0,0);
        const ms=target-now;
        if(ms>0){const t=setTimeout(schedNY,ms);_notifTimers.push(t);}
        return;
      }
      // Внутри периода — уведомить сейчас
      const isJan=mo===0;
      const daysLeft=isJan?(5-d):null;
      const msg=mo===11&&d===31?'🎆 Завтра Новый год! Готовься!':mo===0&&d===1?'🎉 С Новым годом! Поставь цели!':isJan?`🎄 Ещё ${daysLeft} дней праздников — наслаждайся!`:'🎄 Новый год скоро! Подведи итоги года.';
      sendNotif('🎄 Новый год',msg,'newyear-'+now.getFullYear()+'-'+mo+'-'+d);
      // Следующее — через 24ч
      const t=setTimeout(schedNY,24*3600*1000);
      _notifTimers.push(t);
    };
    schedNY();
  }
}

function renderNotifSettings(){
  const el=document.getElementById('notifSettingsCard');
  if(!el)return;
  const enabled=notifEnabled();
  const perm='Notification' in window ? Notification.permission : 'unsupported';
  const cfg=LS.g('notifCfg',{
    deadline:{on:true},
    weekly:{on:true,time:'09:00',dow:1},
    monthly:{on:true,time:'09:00',day:1},
    birthday:{on:true,time:'09:00'},
    newyear:{on:true,time:'09:00'},
    homework:{on:true},
    watchlist:{on:true},
    patches:{on:true}
  });
  const tgl=(key,val)=>`<div class="tgl${val?' on':''}" onclick="toggleNotifItem('${key}')"></div>`;
  const timeInput=(key,val)=>`<input type="time" value="${val||'09:00'}" style="margin-left:6px;background:var(--c2);border:1px solid var(--bd);border-radius:6px;color:var(--t);padding:3px 7px;font-size:12px" onchange="saveNotifTime('${key}',this.value)">`;
  el.innerHTML=`
    <div class="srow">
      <div><div class="slabel">Уведомления</div><div class="ssub">${perm==='granted'?'Разрешены браузером':perm==='denied'?'Заблокированы в браузере':'Нажми включить'}</div></div>
      ${enabled
        ?`<button class="add-btn" style="background:var(--c2);color:var(--red);font-size:11px" onclick="disableNotifs()">ВЫКЛ</button>`
        :`<button class="add-btn" style="font-size:11px" onclick="requestNotifPermission()">ВКЛЮЧИТЬ</button>`
      }
    </div>
    ${enabled?`
    <div class="srow"><div><div class="slabel">⏰ Дедлайны целей</div><div class="ssub">За 30/15/7/3/1/0 дней до срока</div></div>${tgl('deadline',cfg.deadline.on)}</div>
    <div class="srow"><div><div class="slabel">📋 Начало недели</div><div class="ssub">Сб, Вс и Пн ${timeInput('weekly',cfg.weekly&&cfg.weekly.time)}</div></div>${tgl('weekly',cfg.weekly&&cfg.weekly.on)}</div>
    <div class="srow"><div><div class="slabel">📅 Начало месяца</div><div class="ssub">За 3/1/0 дней до конца ${timeInput('monthly',cfg.monthly&&cfg.monthly.time)}</div></div>${tgl('monthly',cfg.monthly&&cfg.monthly.on)}</div>
    <div class="srow"><div><div class="slabel">🎂 Дни рождения</div><div class="ssub">За 15/7/3/1/0 дней ${timeInput('birthday',cfg.birthday&&cfg.birthday.time)}</div></div>${tgl('birthday',cfg.birthday&&cfg.birthday.on)}</div>
    <div class="srow"><div><div class="slabel">🎄 Новый год</div><div class="ssub">25 дек — 5 янв ${timeInput('newyear',cfg.newyear&&cfg.newyear.time)}</div></div>${tgl('newyear',cfg.newyear&&cfg.newyear.on)}</div>
    <div class="srow"><div><div class="slabel">📚 Домашние задания</div><div class="ssub">За 3 дня до сдачи</div></div>${tgl('homework',cfg.homework&&cfg.homework.on)}</div>
    <div class="srow"><div><div class="slabel">🎬 Вотчлист</div><div class="ssub">За 7 дней до дедлайна</div></div>${tgl('watchlist',cfg.watchlist&&cfg.watchlist.on)}</div>
    <div class="srow"><div><div class="slabel">🔧 Патчи</div><div class="ssub">За 7 дней до срока</div></div>${tgl('patches',cfg.patches&&cfg.patches.on)}</div>
    `:''}
  `;
}

function toggleNotifItem(key){
  const cfg=LS.g('notifCfg',{deadline:{on:true},weekly:{on:true,time:'09:00',dow:1},monthly:{on:true,time:'09:00',day:1},birthday:{on:true,time:'09:00'},newyear:{on:true,time:'09:00'},homework:{on:true},watchlist:{on:true},patches:{on:true}});
  if(!cfg[key])cfg[key]={on:false};
  cfg[key].on=!cfg[key].on;
  LS.s('notifCfg',cfg);
  scheduleAllNotifs();
  renderNotifSettings();
}
function saveNotifTime(key,val){
  const cfg=LS.g('notifCfg',{deadline:{on:true},weekly:{on:true,time:'09:00',dow:1},monthly:{on:true,time:'09:00',day:1},birthday:{on:true,time:'09:00'},newyear:{on:true,time:'09:00'},homework:{on:true},watchlist:{on:true},patches:{on:true}});
  if(!cfg[key])cfg[key]={on:true};
  cfg[key].time=val;
  LS.s('notifCfg',cfg);
  scheduleAllNotifs();
}

// Запустить при загрузке
if(notifEnabled()) scheduleAllNotifs();

