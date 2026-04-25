// ═══ MODULE: storage.js ═══
const LS={g(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){if(e&&(e.name==='QuotaExceededError'||e.code===22)){console.warn('[LOGOS] localStorage quota exceeded, key:',k);}else{throw e;}}}};

// ══ STATE ══════════════════════════════════════════════
let habits    = LS.g('habits',[]);
let comp      = LS.g('comp',{});
let habEnabled= new Set(LS.g('habEnabled',[])); // постоянно включённые привычки
let tasks     = LS.g('tasks',{});
let goals     = LS.g('goals',[]);
let freeGoals = LS.g('freeGoals',[]);
let annuals   = LS.g('annuals',[]);
let routine   = LS.g('routine',null);
// ensure routine is properly structured
if(!routine||typeof routine!=='object'||Array.isArray(routine)||!Array.isArray(routine.morning)){
  routine={morning:[],day:[],evening:[],month:[],weekdays:{0:[],1:[],2:[],3:[],4:[],5:[],6:[]}};
  LS.s('routine',routine);
}
if(!Array.isArray(routine.month))routine.month=[];
if(!Array.isArray(routine.week))routine.week=[];
if(!Array.isArray(routine.year))routine.year=[];
if(!routine.weekdays||typeof routine.weekdays!=='object')routine.weekdays={0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
for(let i=0;i<7;i++){if(!Array.isArray(routine.weekdays[i]))routine.weekdays[i]=[];}
let curWdayTab = 0; // current weekday tab in routine
let routineLog= LS.g('routineLog',{});
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
let notifyOn  = LS.g('notifyOn',false);
let autoSaveOn = LS.g('autoSaveOn', false);
let _autoSaveTimer = null;
let patches   = LS.g('patches',[]);
let mTime     = LS.g('morningTime','08:00');
let eTime     = LS.g('eveningTime','21:00');
let selEmoji  = '';
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
let finTpl      = LS.g('finTpl',{week:{income:[],expense:[]},month:{income:[],expense:[]},month3:{income:[],expense:[]},year:{income:[],expense:[]}});
if(!finTpl.month3)finTpl.month3={income:[],expense:[]};
let finPurchases= LS.g('finPurchases',[]);  // [{id,name,price,date}]
let finDebts    = LS.g('finDebts',[]);      // [{id,direction:'owe'|'owed',name,amount,desc,date,paid}]
let curPage   = 'today';
let calVD     = new Date();
let curCardIdx= 0;
let curHabKey = '';
let propSel   = {};
let pinValue  = '';
let pinState  = 'enter'; // enter | change_old | change_new
let memoUnlocked = false;
let curMemoTab= 'passwords';
