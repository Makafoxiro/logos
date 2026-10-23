// ═══ MODULE: state.js ═══
// Глобальное состояние приложения + вспомогательные функции недели/месяца/года.
// Классический скрипт: все let/функции видимы другим js/*.js как глобальные.
// Загружается boot.js ПОСЛЕ ввода пароля и LS.init() — кеш уже расшифрован,
// поэтому LS.g() здесь возвращает реальные данные, а не значения по умолчанию.
// ══ STATE ══════════════════════════════════════════════
let habits    = LS.g('habits',[]);
let comp      = LS.g('comp',{});
let habEnabled= new Set(LS.g('habEnabled',[])); // постоянно включённые привычки
let tasks     = LS.g('tasks',{});
let permanentTasks = LS.g('permanentTasks',[]); // плавающий недельный бэклог: [{id,name,done}]
let goals     = LS.g('goals',[]);
let freeGoals = LS.g('freeGoals',[]);
let annuals   = LS.g('annuals',[]);
let routine   = LS.g('routine',null);
let routineLog= LS.g('routineLog',{});
// Валидация базовой структуры (полная миграция — ниже, после загрузки tplDone)
if(!routine||typeof routine!=='object'||Array.isArray(routine))routine={};
// Отдельные логи для week/month/year с правильными ключами
let weekRtLog  = LS.g('weekRtLog',{});   // ключ = дата понедельника «YYYY-MM-DD»
let monthRtLog = LS.g('monthRtLog',{}); // ключ = «YYYY-MM»
let yearRtLog  = LS.g('yearRtLog',{});  // ключ = «YYYY»
// Помощники ключей
function getWeekKey(){const m=getMonday(new Date());return m.toISOString().slice(0,10);}
function getMonthKey(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');}
function getYearKey(){return String(new Date().getFullYear());}
// Получить/сохранить нужный лог по блоку
function getBlockLog(block){
  if(block==='week'){const k=getWeekKey();if(!weekRtLog[k])weekRtLog[k]={};return weekRtLog[k];}
  if(block==='month'){const k=getMonthKey();if(!monthRtLog[k])monthRtLog[k]={};return monthRtLog[k];}
  if(block==='year'){const k=getYearKey();if(!yearRtLog[k])yearRtLog[k]={};return yearRtLog[k];}
  return getRtLog()[block]||{};
}
function saveBlockLog(block,obj){
  if(block==='week'){weekRtLog[getWeekKey()]=obj;LS.s('weekRtLog',weekRtLog);}
  else if(block==='month'){monthRtLog[getMonthKey()]=obj;LS.s('monthRtLog',monthRtLog);}
  else if(block==='year'){yearRtLog[getYearKey()]=obj;LS.s('yearRtLog',yearRtLog);}
  else{const l=getRtLog();l[block]=obj;saveRtLog(l);}
}
let tplDone   = LS.g('tplDone',{});

// ── Миграция рутины к единой структуре routine.daily ──────
// routine.daily = [{name, slot:'morning'|'day'|'evening', days:[0..6]}]  (0=Пн..6=Вс)
// Старый формат: routine.morning/day/evening (списки на каждый день)
//                routine.weekdays[0..6] (задачи конкретного дня)
//                их лог — tplDone['Y-M-D__tpl__'+idx] → routineLog[date][slot][name]
function migrateRoutine(){
  const _name=x=>(x&&typeof x==='object'&&x.name)?x.name:String(x);
  const hasDaily=Array.isArray(routine.daily);
  const hasLegacy=Array.isArray(routine.morning)||Array.isArray(routine.day)||Array.isArray(routine.evening)||routine.weekdays;
  if(!hasDaily||hasLegacy){
    const daily=hasDaily?routine.daily.slice():[];
    const _push=(name,slot,days)=>{
      name=_name(name);if(!name)return;
      // не дублируем одинаковые пункты (имя+слот+дни)
      if(daily.some(d=>d.name===name&&d.slot===slot&&days.every(x=>d.days.includes(x))&&d.days.every(x=>days.includes(x))))return;
      daily.push({name,slot,days:[...days]});
    };
    // Старые утро/день/вечер → ежедневные (все дни)
    ['morning','day','evening'].forEach(slot=>{
      if(Array.isArray(routine[slot]))routine[slot].forEach(x=>_push(x,slot,[0,1,2,3,4,5,6]));
    });
    // Старые «дни недели» → слот day, свой день; переносим историю из tplDone
    if(routine.weekdays&&typeof routine.weekdays==='object'){
      for(let d=0;d<7;d++){
        const arr=Array.isArray(routine.weekdays[d])?routine.weekdays[d]:[];
        arr.forEach((x,i)=>{
          const name=_name(x);
          _push(name,'day',[d]);
          // перенос чекбоксов: ищем в tplDone ключи дат с этим днём недели
          const re=new RegExp('^\\d+-\\d+-\\d+__tpl__'+i+'$');
          Object.keys(tplDone).forEach(k=>{
            if(!re.test(k)||!tplDone[k])return;
            const p=k.split('__tpl__')[0].split('-').map(Number);
            const dt=new Date(p[0],p[1],p[2]);
            if((dt.getDay()+6)%7!==d)return;
            if(!routineLog[p[0]+'-'+p[1]+'-'+p[2]])routineLog[p[0]+'-'+p[1]+'-'+p[2]]={morning:{},day:{},evening:{}};
            const log=routineLog[p[0]+'-'+p[1]+'-'+p[2]];
            if(!log.day)log.day={};
            if(name)log.day[name]=true;
            delete tplDone[k];
          });
        });
      }
    }
    routine={daily,week:Array.isArray(routine.week)?routine.week:[],month:Array.isArray(routine.month)?routine.month:[],year:Array.isArray(routine.year)?routine.year:[]};
    LS.s('routine',routine);
    LS.s('tplDone',tplDone);
    LS.s('routineLog',routineLog);
  }
  if(!Array.isArray(routine.daily))routine.daily=[];
  if(!Array.isArray(routine.week))routine.week=[];
  if(!Array.isArray(routine.month))routine.month=[];
  if(!Array.isArray(routine.year))routine.year=[];
  LS.s('routine',routine);
}
migrateRoutine();

let health    = LS.g('health',{kcal:2000,prot:150,fat:70,carb:250,water:8,sleep:8,wMin:0,wMax:0,trainDays:3,fiber:30,sugar:50,salt:5,age:0,height:170,cutting:false,gender:'male'});
// ensure new fields exist in loaded health
if(health.fiber==null)health.fiber=30;
if(health.sugar==null)health.sugar=50;
if(health.salt==null)health.salt=5;
if(health.cutting==null)health.cutting=false;
if(health.gender==null)health.gender='male';
// migrate old boolean cutting to string mode
if(health.cutting===true&&health.mode==null)health.mode='cut';
else if(health.cutting===false&&health.mode==null)health.mode='maintain';
if(health.mode==null)health.mode='maintain';

let physDiseases = LS.g('physDiseases', []);
let hLog      = LS.g('hLog',{});
let supps = (()=>{
  const raw = LS.g('supps',[]);
  // migrate old string[] format
  if(raw.length && typeof raw[0]==='string') return raw.map(s=>({name:s,desc:''}));
  return raw;
})();
let meds      = LS.g('meds',[]);
let weights   = LS.g('weights',[]);
let passwords = LS.g('passwords',[]);
let birthdays = LS.g('birthdays', []);
let homework  = LS.g('homework',[]);
let notes     = LS.g('notes',[]);
let watchlist  = LS.g('watchlist', []);
// ── УЧЕБА (вкладка мемо) ─────────────────────────────────
let eduSchedule  = LS.g('eduSchedule', []);   // {id, day:0..6, time, name, teacher, corpus, room, parity:'both'|'num'|'den'}
let eduSubjects  = LS.g('eduSubjects', []);   // {id, name, teacher}
let eduLinks     = LS.g('eduLinks', []);      // {id, title, url}
// (сайт замен eduSubsUrl удалён)
let eduWeekParity= LS.g('eduWeekParity', 'num');  // 'num'(числитель)|'den'(знаменатель) — паритет «якорной» недели
let eduWeekAnchor = LS.g('eduWeekAnchor', '');    // понедельник якорной недели 'YYYY-MM-DD'
// понедельник недели, содержащей дата d (ключ 'YYYY-MM-DD')
function eduMondayKey(d){
  const x=new Date(d||Date.now());
  x.setDate(x.getDate()-((x.getDay()+6)%7));
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
}
// миграция со старого режима «авто» / первый запуск: якорем становится текущая
// неделя; дальше паритет чередуется автоматически от этой точки
if(eduWeekParity!=='num'&&eduWeekParity!=='den')eduWeekParity='num';
if(!eduWeekAnchor){eduWeekAnchor=eduMondayKey(new Date());LS.s('eduWeekParity',eduWeekParity);LS.s('eduWeekAnchor',eduWeekAnchor);}
let eduBells     = LS.g('eduBells', []);      // расписание звонков: {id, day:0..6, time, name}
if(!Array.isArray(eduSchedule))eduSchedule=[];
if(!Array.isArray(eduSubjects))eduSubjects=[];
if(!Array.isArray(eduLinks))eduLinks=[];
if(!Array.isArray(eduBells))eduBells=[];
let notifyOn  = LS.g('notifyOn',false);
let autoSaveOn = LS.g('autoSaveOn', false);
let _autoSaveTimer = null;
let mTime     = LS.g('morningTime','08:00');
let eTime     = LS.g('eveningTime','21:00');
let selHabitIcon = 'sparkles';
let nid       = LS.g('nid',971);
let skillTemplates = LS.g('sportTemplates', []);
// Миграция сломанного формата: если exercises пустой но есть exercisesHeavy/Light/None
(function _migrateSkillExercises(){
  let changed=false;
  skillTemplates.forEach(t=>{
    if(!t.exercises||!t.exercises.length){
      // Берём первый непустой массив: heavy → light → none (не зависим от weekIntensity)
      const src=(t.exercisesHeavy&&t.exercisesHeavy.length)?t.exercisesHeavy
               :(t.exercisesLight&&t.exercisesLight.length)?t.exercisesLight
               :(t.exercisesNone&&t.exercisesNone.length)?t.exercisesNone:null;
      if(src){t.exercises=src;changed=true;}
    }
  });
  if(changed)LS.s('sportTemplates',skillTemplates);
})();
// ── Параметры тренировки — РАЗДЕЛЬНО по категориям ──────
// Миграция: если есть старый единый массив trainParams — переносим в physParams однократно
(function _migrateTrainParams() {
  const legacy = LS.g('trainParams', null);
  if (legacy && legacy.length) {
    const existing = LS.g('physParams', null);
    if (!existing) {
      LS.s('physParams', legacy);
    }
  }
})();
let physParams   = LS.g('physParams',   []); // Параметры ФИЗИЧЕСКИХ тренировок {id, name, notes}
let mentalParams = LS.g('mentalParams', []); // Параметры УМСТВЕННЫХ тренировок {id, name, notes}
let finLog      = LS.g('finLog',{});       // {date: [{id,type,amount,desc}]}
let finTpl      = LS.g('finTpl',{week:{income:[],expense:[]},month:{income:[],expense:[]},month3:{income:[],expense:[]},halfYear:{income:[],expense:[]},year:{income:[],expense:[]}});
if(!finTpl.month3)finTpl.month3={income:[],expense:[]};
if(!finTpl.halfYear)finTpl.halfYear={income:[],expense:[]};
// ── ДЕНЕЖНАЯ РЕФОРМА ──
// finPlans: снимки плана по месяцам {'YYYY-MM':{income:[],expense:[]}} —
// создаются автоматически копией finTpl.month; закрытые месяцы сохраняются навсегда.
let finPlans     = LS.g('finPlans',{});      // {'2026-10':{income:[{id,name,amount,paid}],expense:[...]}}
// Стартовый капитал (задаётся в настройках блока денег) — база для счёта «капитал».
let finCapital0  = LS.g('finCapital0',0);
let finAssets    = LS.g('finAssets',[]); // [{id,name,category,value,rate,period,lastPeriodIndex}]
let finAssetHistory = LS.g('finAssetHistory',[]); // periodic non-cash asset revaluations
// Круговая: сумма-база в центре (месячный доход по плану/вручную) и режим показа '%'|'rub'.
let finPieSum    = LS.g('finPieSum',0);
let finPieMode   = LS.g('finPieMode','%');   // '%' | 'rub'
let finPurchases= LS.g('finPurchases',[]);  // [{id,name,price,date,paid,paidAt,archived}]
let finDebts    = LS.g('finDebts',[]);      // [{id,direction:'owe'|'owed',name,amount,desc,date,paid}]
let curPage   = 'today';
let calVD     = new Date();
let curCardIdx= 0;
let curHabKey = '';
let propSel   = {};
let pinValue  = '';
let pinState  = 'enter'; // enter | change_old | change_new
let memoUnlocked = false;
let curMemoTab= 'notes';
let memoCryptoKey = null;
let memoPwDecrypted = [];
