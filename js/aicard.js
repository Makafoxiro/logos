// ═══ MODULE: aicard.js — Экспорт AI-карты ═══

// ── Модал выбора режима (Полное / Базовое) ───────────
let _aiCardAction = 'download'; // 'download' | 'copy'

function showAICardChoice(action) {
  _aiCardAction = action;
  const isDownload = action === 'download';
  const titleEl    = document.getElementById('aiCardChoiceTitle');
  const subEl      = document.getElementById('aiCardChoiceSubtitle');
  const isEN_m = (typeof appLang !== 'undefined') && appLang === 'en';
  const Lm = isEN_m ? {dl:'Download AI card',cp:'Copy AI card',sub:'Choose export mode',full:'📄 Full',base:'⚡ Base',baseDesc:'no media & checklists',cancel:'Cancel'}
                    : {dl:'Скачать AI-карту',cp:'Копировать AI-карту',sub:'Выберите режим экспорта',full:'📄 Полное',base:'⚡ Базовое',baseDesc:'без медиа и чеклистов',cancel:'Отмена'};
  if (titleEl) titleEl.textContent = isDownload ? Lm.dl : Lm.cp;
  if (subEl)   subEl.textContent   = Lm.sub;

  const fullBtn   = document.getElementById('aiCardChoiceFull');
  const baseBtn   = document.getElementById('aiCardChoiceBase');
  const cancelBtn = document.getElementById('aiCardChoiceCancel');
  if (fullBtn)   fullBtn.innerHTML  = Lm.full;
  if (baseBtn)   baseBtn.innerHTML  = `${Lm.base} <span style="font-size:10px;opacity:.6">${Lm.baseDesc}</span>`;
  if (cancelBtn) cancelBtn.textContent = Lm.cancel;

  if (fullBtn)   fullBtn.onclick   = () => { closeModal('aiCardChoiceModal'); _doAICard('full'); };
  if (baseBtn)   baseBtn.onclick   = () => { closeModal('aiCardChoiceModal'); _doAICard('base'); };
  if (cancelBtn) cancelBtn.onclick = () => closeModal('aiCardChoiceModal');

  openModal('aiCardChoiceModal');
}

function _doAICard(mode) {
  if (_aiCardAction === 'download') {
    _exportAICard(mode);
  } else {
    _copyAICard(mode);
  }
}

function _exportAICard(mode) {
  try {
    const text = buildAICard(mode);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const now  = new Date();
    const dateStr = `${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`;
    const suffix  = mode === 'base' ? '-base' : '';
    a.href     = url;
    a.download = `logos-ai-card${suffix}-${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    flash(mode === 'base' ? 'AI-карта (базовая) скачана' : 'AI-карта скачана');
  } catch(e) {
    flash('Ошибка: ' + e.message);
    console.error('[aicard]', e);
  }
}

function _copyAICard(mode) {
  try {
    const text = buildAICard(mode);
    const msg  = mode === 'base' ? 'AI-карта (базовая) скопирована' : 'AI-карта скопирована';
    navigator.clipboard.writeText(text).then(() => {
      flash(msg);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flash(msg);
    });
  } catch(e) {
    flash('Ошибка копирования');
    console.error('[aicard]', e);
  }
}

// Обратная совместимость (на случай если где-то вызываются напрямую)
function exportAICard() { showAICardChoice('download'); }
function copyAICard()   { showAICardChoice('copy'); }

// ── Сохранение / загрузка ручных полей профиля ──────────

function saveAiProfile() {
  const profile = {
    name:    document.getElementById('aiProfileName')?.value.trim()    || '',
    city:    document.getElementById('aiProfileCity')?.value.trim()    || '',
    horizon: document.getElementById('aiProfileHorizon')?.value.trim() || '',
    notes:   document.getElementById('aiProfileNotes')?.value.trim()   || '',
  };
  localStorage.setItem('aiProfile', JSON.stringify(profile));
}

function initAiProfile() {
  try {
    const raw = localStorage.getItem('aiProfile');
    if (!raw) return;
    const p = JSON.parse(raw);
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('aiProfileName',    p.name);
    set('aiProfileCity',    p.city);
    set('aiProfileHorizon', p.horizon);
    set('aiProfileNotes',   p.notes);
  } catch(e) { /* silent */ }
}

// Вызываем инициализацию как только DOM готов
document.addEventListener('DOMContentLoaded', initAiProfile);

// ── Построение текста карты ──────────────────────────────

// mode: 'full' (default) | 'base'
// Базовое — без медиалиста, без рутины-чеклистов (неделя/месяц/год/дни недели)
function buildAICard(mode) {
  const isBase = mode === 'base';
  // Читаем все данные напрямую из localStorage
  // (не зависим от in-memory переменных — карту можно скачать с любой страницы)
  const g = (key, def) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch(e) { return def; }
  };

  const health       = g('health', {});
  const weights      = g('weights', []);
  const physDiseases = g('physDiseases', []);
  const physParams   = g('physParams', []);
  const mentalParams = g('mentalParams', []);
  const skillTpl     = g('skillTemplates', null) || g('sportTemplates', []);
  const cycleStart      = g('cycleStartDate', '');
  const cycleStartSlot  = g('cycleStartSlot', 0);
  const cycleFirstHeavy = g('cycleFirstWeekHeavy', true);
  const cycleOverrides  = g('cycleOverrides', {});
  const goals        = g('goals', []);
  const freeGoals    = g('freeGoals', []);
  const annuals      = g('annuals', []);
  const habits       = g('habits', []);
  const routine      = g('routine', {});
  const supps        = g('supps', []);
  const meds         = g('meds', []);
  const interests    = g('interests', { cats: [], items: [] });
  const finTpl       = g('finTpl', {});
  const finDebts     = g('finDebts', []);
  const finPurchases = g('finPurchases', []);
  const notes        = g('notes', []);
  const watchlist    = g('watchlist', []);
  const birthdays    = g('birthdays', []);
  const homework     = g('homework', []);
  const patches      = g('patches', []);
  const sleepSchedule = g('sleepSchedule', {bed:'23:00', wake:'05:00', naps:[]});
  const aiProfile    = g('aiProfile', {});  // ручные поля из настроек
  const hLog         = g('hLog', {});       // факт питания/сна по дням

  const isEN = (typeof appLang !== 'undefined') && appLang === 'en';
  const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const DAYS_EN = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const DAYS = isEN ? DAYS_EN : DAYS_RU;

  // ── Translation table for card content ──
  const L = isEN ? {
    title: 'LOGOS — AI USER CARD',
    titleBase: ' [BASE]',
    dateLabel: 'Date',
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    footer: 'End of AI card. Version:',
    generated: `(Auto-generated by Logos. Use as context when chatting with AI.${isBase ? ' Mode: base — no media list or checklists.' : ''})`,
    // sections
    sProfile:'PROFILE', sPhysical:'PHYSICAL DATA', sSupplements:'SUPPLEMENTS & MEDICINE',
    sWorkouts:'WORKOUTS', sRoutine:'ROUTINE', sHabits:'HABITS', sGoals:'GOALS',
    sInterests:'INTERESTS', sFinance:'FINANCE', sNotes:'NOTES',
    sHomework:'HOMEWORK', sPatches:'PATCHES / TASKS', sWatchlist:'WATCHLIST',
    sBirthdays:'BIRTHDAYS', sWarnings:'⚠️ WARNINGS & CONTRADICTIONS',
    // subsections
    ssProfile:'Additional context', ssNutrition:'Nutrition norms',
    ssFoodLog:'Actual nutrition & sleep (recent days)', ssConditions:'Conditions / Restrictions (consider when advising)',
    ssBads:'Supplements / Additives', ssMeds:'First aid kit',
    ssCycle:'Training cycle', ssPhyTpl:'Physical workout templates',
    ssMenTpl:'Mental workout templates', ssPhyParams:'Physical training params',
    ssMenParams:'Mental training params', ssNext7:'Next 7 days:',
    ssMorning:'Morning', ssDay:'Day', ssEvening:'Evening',
    ssWeek:'Week', ssMonth:'Month', ssYear:'Year',
    ssActiveGoals:'Active goals', ssFreeGoals:'Free goals',
    ssAnnuals:'Annual reminders',
    ssMonthBalance:'Monthly balance', ssBudgetCats:'Budget categories',
    ssDebts:'Debts / Loans', ssPurchases:'Planned purchases',
    // inline
    deadline:'deadline', overdue:'overdue', daysLeft:'days left', in:'in',
    days:'d.', today:'today', todayDeadline:'deadline today!',
    overdueDays:'overdue', throughDays:'in',
    income:'Income', expense:'Expense', total:'Total',
    deficit:' rub. ⚠️ DEFICIT', surplus:' rub. ✓',
    budget:'Monthly budget (limit)',
    debtOwe:'← I owe', debtOwed:'→ Owed to me',
    noPhyTpl:'Workouts: no physical templates.',
    noHabits:'Habits: section is empty.',
    similarGoals:'Goals', similarHabits:'Habits', similarWatch:'Watchlist',
    similarPatches:'Patches', similarInterests:'Interests',
    similarSuffix:': similar entries (possible duplicates) — ',
    // physical data labels
    age:'Age', height:'Height', weightRecent:'Weight (recent)', weightGoal:'Target weight',
    mode:'Mode', gender:'Gender', bmi:'BMI', tdee:'TDEE (calculated)',
    calDeficit:'Calorie deficit', calSurplus:'Calorie surplus',
    kcal:'Calories', prot:'Protein', fat:'Fats', carb:'Carbs',
    water:'Water', sleep:'Sleep', sleepSchedule:'Sleep schedule',
    fiber:'Fiber', sugar:'Sugar (limit)', salt:'Salt (limit)',
    ageUnit:' y.o.', heightUnit:' cm', kgUnit:' kg', glassUnit:' glasses',
    sleepUnit:' h', gramUnit:' g', kcalUnit:' kcal', kcalDay:' kcal/day',
    sleepTpl:'bedtime {bed} / wake {wake}',
    cycleStart:'Cycle start', pattern:'Pattern', today2:'Today', cycleFirstWeek:'First cycle week',
    heavy:'heavy', light:'light', restDay:'Rest',
    // annual period labels
    every3m:'every 3 mo.', every6m:'every 6 mo.', everyYears:'every {n} years',
    // birthday
    bdMonths:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    bdToday:' 🎉 TODAY!', bdSoon:' ← in {n} d.',
    bdYears:' ({n} y.o.)', bdGift:'🎁 ideas: ',
    // modal
    modalDownloadTitle:'Download AI card', modalCopyTitle:'Copy AI card',
    modalSub:'Choose export mode', modalFull:'📄 Full', modalBase:'⚡ Base',
    modalBaseDesc:'no media & checklists', modalCancel:'Cancel',
    // warnings
    warnBudget:'Budget: expenses exceed income by {n} per month.',
    warnWeight:'Weight: {n} entry/entries with anomalous value — check data.',
    warnNoConditions:"Health: no restrictions added — AI doesn't know about your limitations.",
  } : {
    title: 'LOGOS — AI-КАРТА ПОЛЬЗОВАТЕЛЯ',
    titleBase: ' [БАЗОВАЯ]',
    dateLabel: 'Дата',
    months: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
    footer: 'Конец AI-карты. Версия:',
    generated: `(Автоматически сгенерировано сайтом Logos. Используй как контекст при общении с ИИ.${isBase ? ' Режим: базовый — без медиалиста и чеклистов.' : ''})`,
    sProfile:'ПРОФИЛЬ', sPhysical:'ФИЗИЧЕСКИЕ ДАННЫЕ', sSupplements:'ДОБАВКИ И АПТЕЧКА',
    sWorkouts:'ТРЕНИРОВКИ', sRoutine:'РУТИНА', sHabits:'ПРИВЫЧКИ', sGoals:'ЦЕЛИ',
    sInterests:'ИНТЕРЕСЫ', sFinance:'ФИНАНСЫ', sNotes:'ЗАМЕТКИ',
    sHomework:'ДОМАШНИЕ ЗАДАНИЯ', sPatches:'ПАТЧИ / ЗАДАЧИ К ВЫПОЛНЕНИЮ',
    sWatchlist:'ВОТЧЛИСТ / К ПРОСМОТРУ', sBirthdays:'ДНИ РОЖДЕНИЯ',
    sWarnings:'⚠️ ПРОТИВОРЕЧИЯ И ПРЕДУПРЕЖДЕНИЯ',
    ssProfile:'Доп. контекст', ssNutrition:'Нормы питания',
    ssFoodLog:'Факт питания и сна (последние дни)', ssConditions:'Состояния / Ограничения (учитывать при советах)',
    ssBads:'БАДы / Добавки', ssMeds:'Аптечка',
    ssCycle:'Цикл тренировок', ssPhyTpl:'Физические тренировки (шаблоны)',
    ssMenTpl:'Умственные тренировки (шаблоны)', ssPhyParams:'Параметры физ. тренировок',
    ssMenParams:'Параметры умственных тренировок', ssNext7:'Следующие 7 дней:',
    ssMorning:'Утро', ssDay:'День', ssEvening:'Вечер',
    ssWeek:'Неделя', ssMonth:'Месяц', ssYear:'Год',
    ssActiveGoals:'Активные цели', ssFreeGoals:'Свободные цели',
    ssAnnuals:'Ежегодные напоминания',
    ssMonthBalance:'Месячный баланс', ssBudgetCats:'Категории бюджета',
    ssDebts:'Долги / Займы', ssPurchases:'Запланированные покупки',
    deadline:'дедлайн', overdue:'просрочено', daysLeft:'осталось', in:'через',
    days:'дн.', today:'сегодня', todayDeadline:'сегодня сдать!',
    overdueDays:'просрочено', throughDays:'через',
    income:'Доход', expense:'Расход', total:'Итог',
    deficit:' руб. ⚠️ ДЕФИЦИТ', surplus:' руб. ✓',
    budget:'Месячный бюджет (лимит)',
    debtOwe:'← Я должен', debtOwed:'→ Мне должны',
    noPhyTpl:'Тренировки: нет ни одного физического шаблона.',
    noHabits:'Привычки: раздел пустой.',
    similarGoals:'Цели', similarHabits:'Привычки', similarWatch:'Вотчлист',
    similarPatches:'Патчи', similarInterests:'Интересы',
    similarSuffix:': похожие записи (возможно дубли) — ',
    age:'Возраст', height:'Рост', weightRecent:'Вес (последние)', weightGoal:'Целевой вес',
    mode:'Режим', gender:'Пол', bmi:'ИМТ', tdee:'TDEE (расчётный)',
    calDeficit:'Дефицит калорий', calSurplus:'Профицит калорий',
    kcal:'Калории', prot:'Белок', fat:'Жиры', carb:'Углеводы',
    water:'Вода', sleep:'Сон', sleepSchedule:'Расписание сна',
    fiber:'Клетчатка', sugar:'Сахар (лимит)', salt:'Соль (лимит)',
    ageUnit:' лет', heightUnit:' см', kgUnit:' кг', glassUnit:' стаканов',
    sleepUnit:' ч', gramUnit:' г', kcalUnit:' ккал', kcalDay:' ккал/день',
    sleepTpl:'отбой {bed} / подъём {wake}',
    cycleStart:'Старт цикла', pattern:'Паттерн', today2:'Сегодня', cycleFirstWeek:'Первая неделя цикла',
    heavy:'тяжёлая', light:'лёгкая', restDay:'Отдых',
    every3m:'каждые 3 мес.', every6m:'каждые 6 мес.', everyYears:'каждые {n} лет',
    bdMonths:['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'],
    bdToday:' 🎉 СЕГОДНЯ!', bdSoon:' ← через {n} дн.',
    bdYears:' ({n} лет)', bdGift:'🎁 идеи: ',
    modalDownloadTitle:'Скачать AI-карту', modalCopyTitle:'Копировать AI-карту',
    modalSub:'Выберите режим экспорта', modalFull:'📄 Полное', modalBase:'⚡ Базовое',
    modalBaseDesc:'без медиа и чеклистов', modalCancel:'Отмена',
    warnBudget:'Бюджет: расходы превышают доходы на {n} руб./мес.',
    warnWeight:'Вес: {n} запис(и) с аномальным значением — проверь данные.',
    warnNoConditions:'Здоровье: ограничения не добавлены — ИИ не знает об ограничениях.',
  };

  const lines = [];
  const h1 = t => lines.push(`\n${'═'.repeat(44)}\n${t}\n${'═'.repeat(44)}`);
  const h2 = t => lines.push(`\n── ${t} ──`);
  const li = t => lines.push(`• ${t}`);
  const kv = (k, v) => { if (v !== undefined && v !== '' && v !== null) lines.push(`${k}: ${v}`); };

  // ── Заголовок ──────────────────────────────────────────
  const now = new Date();
  lines.push(L.title + (isBase ? L.titleBase : ''));
  lines.push(`${L.dateLabel}: ${now.getDate()} ${L.months[now.getMonth()]} ${now.getFullYear()}`);
  lines.push(L.generated);

  // ── Ручные поля профиля (если заполнены в настройках) ──
  if (aiProfile.name || aiProfile.city || aiProfile.horizon) {
    h1(L.sProfile);
    if (aiProfile.name)    kv(isEN?'Name':'Имя', aiProfile.name);
    if (aiProfile.city)    kv(isEN?'City':'Город', aiProfile.city);
    if (aiProfile.horizon) kv(isEN?'Planning horizon':'Горизонт планирования', aiProfile.horizon);
    if (aiProfile.notes)   { h2(L.ssProfile); lines.push(aiProfile.notes); }
  }

  // ── Физические данные ──────────────────────────────────
  const hasHealth = health.height || health.age || weights.length || physDiseases.length;
  if (hasHealth) {
    h1(L.sPhysical);

    if (health.age)    kv(L.age, health.age + L.ageUnit);
    if (health.height) kv(L.height, health.height + L.heightUnit);

    // Последние 3 взвешивания
    if (weights.length) {
      const lastWeights = weights.slice(-3);
      const wStr = lastWeights.map(w => {
        const d = new Date(w.date || w.ts || '');
        const dStr = isNaN(d) ? '' : ` (${d.getDate()}.${d.getMonth()+1})`;
        return `${w.val} кг${dStr}`;
      }).join(' → ');
      kv(L.weightRecent, wStr);
    }

    if (health.wMin && health.wMax) kv(L.weightGoal, `${health.wMin}–${health.wMax}${L.kgUnit}`);

    const modeMap = { cut: 'Сушка (рельеф)', maintain: 'Поддержание', bulk: 'Набор массы' };
    if (health.mode) kv(L.mode, modeMap[health.mode] || health.mode);

    const genderMap = { male: 'мужской', female: 'женский' };
    if (health.gender) kv(L.gender, genderMap[health.gender] || health.gender);

    // ── Расчётные показатели (ИМТ, TDEE, дефицит) ──
    const lastW = weights.length ? weights[weights.length - 1].val : 0;
    const curWeight = (lastW >= 30 && lastW < 300) ? lastW : 0;
    const hCm = health.height || 0;
    const ageY = health.age || 0;
    if (curWeight && hCm) {
      const hM  = hCm / 100;
      const bmi = +(curWeight / (hM * hM)).toFixed(1);
      kv(L.bmi, bmi + (isEN?' (norm 18.5–24.9)':' (норма 18.5–24.9)'));
    }
    if (curWeight && hCm && ageY) {
      // Миффлин–Сан Жеор
      const bmr = health.gender === 'female'
        ? 10 * curWeight + 6.25 * hCm - 5 * ageY - 161
        : 10 * curWeight + 6.25 * hCm - 5 * ageY + 5;
      const trainDays = health.trainDays || 3;
      const palMap = {0:1.2,1:1.375,2:1.375,3:1.55,4:1.55,5:1.725,6:1.725,7:1.9};
      const pal  = palMap[Math.min(trainDays, 7)] || 1.55;
      const tdee = Math.round(bmr * pal);
      kv(L.tdee, '~' + tdee + L.kcalDay);
      if (health.kcal && health.mode === 'cut') {
        const deficit = tdee - health.kcal;
        const sign = deficit > 0 ? '-' + deficit : '+' + Math.abs(deficit) + ' (профицит!)';
        kv(L.calDeficit, sign + L.kcalDay);
      }
    }

    // Нормы КБЖУ и сна
    h2(L.ssNutrition);
    if (health.kcal)  kv(L.kcal, health.kcal + L.kcalUnit);
    if (health.prot)  kv(L.prot, health.prot + L.gramUnit);
    if (health.fat)   kv(L.fat, health.fat + L.gramUnit);
    if (health.carb)  kv(L.carb, health.carb + L.gramUnit);
    if (health.water) kv(L.water, health.water + L.glassUnit);
    if (health.sleep) kv(L.sleep, health.sleep + L.sleepUnit);
    if (sleepSchedule.bed || sleepSchedule.wake) {
      const napStr = (sleepSchedule.naps || []).length
        ? ` + дневной сон: ${sleepSchedule.naps.map(n => n.from + '–' + n.to).join(', ')}` : '';
      kv(L.sleepSchedule, L.sleepTpl.replace('{bed}',sleepSchedule.bed||'—').replace('{wake}',sleepSchedule.wake||'—')+napStr);
    }
    if (health.fiber) kv(L.fiber, health.fiber + L.gramUnit);
    if (health.sugar) kv(L.sugar, health.sugar + L.gramUnit);
    if (health.salt)  kv(L.salt, health.salt + L.gramUnit);

    // ── Фактические данные за последние 3 дня (hLog) ──
    const today0 = new Date();
    const hLogDays = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today0); d.setDate(today0.getDate() - i);
      const dkey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const rec = hLog[dkey];
      if (rec && (rec.kcal || rec.prot || rec.water || rec.sleep)) {
        const dayStr = i === 0 ? 'сегодня' : i === 1 ? 'вчера' : '2 дня назад';
        const parts = [];
        if (rec.kcal)  parts.push(`${rec.kcal} ккал`);
        if (rec.prot)  parts.push(`б ${rec.prot}г`);
        if (rec.fat)   parts.push(`ж ${rec.fat}г`);
        if (rec.carb)  parts.push(`у ${rec.carb}г`);
        if (rec.water) parts.push(`вода ${rec.water} ст.`);
        if (rec.sleep) parts.push(`сон ${rec.sleep}ч`);
        hLogDays.push(`${dayStr}: ${parts.join(' | ')}`);
      }
    }
    if (hLogDays.length) {
      h2(L.ssFoodLog);
      hLogDays.forEach(d => li(d));
    }

    // Диагнозы / ограничения
    if (physDiseases.length) {
      h2(L.ssConditions);
      physDiseases.forEach(d => {
        if (d.name) {
          const note = d.notes ? ` — ${d.notes}` : '';
          li(`${d.name}${note}`);
        }
      });
    }
  }

  // ── Добавки и аптечка ─────────────────────────────────
  if (supps.length || meds.length) {
    h1(L.sSupplements);
    if (supps.length) {
      h2(L.ssBads);
      supps.forEach(s => {
        const desc = s.desc ? ` (${s.desc})` : '';
        li(`${s.name || s}${desc}`);
      });
    }
    if (meds.length) {
      h2(L.ssMeds);
      meds.forEach(m => {
        const use = m.use ? ` — ${m.use}` : '';
        li(`${m.name}${use}`);
      });
    }
  }

  // ── Тренировки ────────────────────────────────────────
  const hasTraining = physParams.length || mentalParams.length || skillTpl.length;
  if (hasTraining) {
    h1(L.sWorkouts);

    // ── Состояние цикла ──
    if (cycleStart) {
      // Определяем слоты цикла из шаблонов
      const _letters = ['A','B','C','D'];
      const _digits  = ['1','2','3','4'];
      skillTpl.forEach(t => {
        if (!t.cycleSlot) return;
        if (/^[A-Z]$/.test(t.cycleSlot) && !_letters.includes(t.cycleSlot)) _letters.push(t.cycleSlot);
        if (/^\d+$/.test(t.cycleSlot)   && !_digits.includes(t.cycleSlot))  _digits.push(t.cycleSlot);
      });
      const maxLen = Math.max(_letters.length, _digits.length);
      const _pattern = [];
      for (let i = 0; i < maxLen; i++) {
        _pattern.push(_letters[i % _letters.length]);
        _pattern.push(_digits[i  % _digits.length]);
      }

      // Вычисляем сегодняшний слот
      const [sy, sm, sd] = cycleStart.split('-').map(Number);
      const startDate = new Date(sy, sm - 1, sd);
      const today     = new Date();
      today.setHours(0,0,0,0);
      const diff      = Math.round((today - startDate) / 86400000);
      const todayIdx  = ((cycleStartSlot + diff) % _pattern.length + _pattern.length) % _pattern.length;
      const todayKey  = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
      const todaySlot = cycleOverrides[todayKey] || _pattern[todayIdx];

      h2(L.ssCycle);
      kv(L.cycleStart, cycleStart);
      kv(L.pattern, _pattern.join(' → '));
      kv(L.today2, todaySlot === 'rest' ? L.restDay : (isEN?`slot ${todaySlot}`:`слот ${todaySlot}`));
      kv(L.cycleFirstWeek, cycleFirstHeavy ? L.heavy : L.light);

      // Ближайшие 7 дней
      const upcoming = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        const dk = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const dayDiff = Math.round((d - startDate) / 86400000);
        const idx = ((cycleStartSlot + dayDiff) % _pattern.length + _pattern.length) % _pattern.length;
        const slot = cycleOverrides[dk] || _pattern[idx];
        const dayName = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()];
        upcoming.push(`${dayName} ${d.getDate()}.${d.getMonth()+1}=${slot==='rest'?'отдых':slot}`);
      }
      lines.push(`  ${L.ssNext7} ${upcoming.join('  ')}`);
    }

    if (skillTpl.length) {
      const physTpl   = skillTpl.filter(t => (t.skillType || 'physical') === 'physical');
      const mentalTpl = skillTpl.filter(t => t.skillType === 'mental');

      if (physTpl.length) {
        h2(L.ssPhyTpl);
        physTpl.forEach(t => {
          const slot = t.cycleSlot ? ` [слот ${t.cycleSlot}]` : '';
          const days = Array.isArray(t.weekDays) && t.weekDays.length
            ? ` | дни: ${t.weekDays.map(i => DAYS[i]).join(', ')}` : '';
          lines.push(`\n  ${t.name}${slot}${days}`);
          // Упражнения: heavy/light/none если есть, иначе общий список
          if (t.exercisesHeavy && t.exercisesHeavy.length) {
            lines.push(`    [тяжёлая неделя]`);
            t.exercisesHeavy.forEach(ex => lines.push(`      - ${ex}`));
          }
          if (t.exercisesLight && t.exercisesLight.length) {
            lines.push(`    [лёгкая неделя]`);
            t.exercisesLight.forEach(ex => lines.push(`      - ${ex}`));
          }
          if ((!t.exercisesHeavy || !t.exercisesHeavy.length) && (!t.exercisesLight || !t.exercisesLight.length)) {
            if (Array.isArray(t.exercises) && t.exercises.length) {
              t.exercises.forEach(ex => lines.push(`    - ${ex}`));
            }
          }
          if (t.desc && t.desc.trim()) lines.push(`    📝 ${t.desc.trim()}`);
        });
      }

      if (mentalTpl.length) {
        h2(L.ssMenTpl);
        mentalTpl.forEach(t => {
          const slot = t.cycleSlot ? ` [слот ${t.cycleSlot}]` : '';
          lines.push(`\n  ${t.name}${slot}`);
          if (Array.isArray(t.exercises) && t.exercises.length) {
            t.exercises.forEach(ex => lines.push(`    - ${ex}`));
          }
          if (t.desc && t.desc.trim()) lines.push(`    📝 ${t.desc.trim()}`);
        });
      }
    }

    if (physParams.length) {
      h2(L.ssPhyParams);
      physParams.forEach(p => {
        const notes = p.notes ? ` — ${p.notes}` : '';
        li(`${p.name}${notes}`);
      });
    }

    if (mentalParams.length) {
      h2(L.ssMenParams);
      mentalParams.forEach(p => {
        const notes = p.notes ? ` — ${p.notes}` : '';
        li(`${p.name}${notes}`);
      });
    }
  }

  // ── Рутина ────────────────────────────────────────────
  const hasRoutine = (routine.morning?.length || routine.day?.length ||
    routine.evening?.length || routine.week?.length ||
    routine.month?.length   || routine.year?.length ||
    Object.values(routine.weekdays || {}).some(a => a?.length));

  if (hasRoutine) {
    h1(L.sRoutine);

    const blocks = [
      [L.ssMorning, routine.morning],
      [L.ssDay,     routine.day],
      [L.ssEvening, routine.evening],
      ...(!isBase ? [
        [L.ssWeek,  routine.week],
        [L.ssMonth, routine.month],
        [L.ssYear,  routine.year],
      ] : []),
    ];
    blocks.forEach(([label, arr]) => {
      if (Array.isArray(arr) && arr.length) {
        h2(label); arr.forEach(item => li(item));
      }
    });

    if (routine.weekdays && !isBase) {
      DAYS.forEach((day, i) => {
        const arr = routine.weekdays[i];
        if (Array.isArray(arr) && arr.length) {
          h2(day); arr.forEach(item => li(item));
        }
      });
    }
  }

  // ── Привычки ──────────────────────────────────────────
  const activeHabits = habits.filter(h => h.name);
  if (activeHabits.length) {
    h1(L.sHabits);
    activeHabits.forEach(h => {
      const desc = h.desc ? ` — ${h.desc}` : '';
      li(`${h.emoji || ''}${h.name}${desc}`);
    });
  }

  // ── Цели ──────────────────────────────────────────────
  const activeGoals = goals.filter(g => !g.done && g.name);
  const pendingFree = (freeGoals || []).filter(g => !g.done && g.name);

  if (activeGoals.length || pendingFree.length || annuals?.length) {
    h1(L.sGoals);

    if (activeGoals.length) {
      h2(L.ssActiveGoals);
      const now2 = new Date();
      activeGoals.forEach(goal => {
        let dl = '';
        if (goal.deadline) {
          const d = new Date(goal.deadline);
          if (!isNaN(d)) {
            const days = Math.round((d - now2) / 86400000);
            const sign = days < 0 ? L.overdue + ' ' + Math.abs(days) + ' ' + L.days : days + ' ' + L.days;
            dl = ` [${L.deadline}: ${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}, ${L.daysLeft}: ${sign}]`;
          }
        }
        const note = goal.note ? `\n    ${goal.note}` : '';
        li(`${goal.name}${dl}${note}`);
      });
    }

    if (pendingFree.length) {
      h2(L.ssFreeGoals);
      pendingFree.forEach(g => li(g.name + (g.note ? ` — ${g.note}` : '')));
    }

    if (Array.isArray(annuals) && annuals.length) {
      h2(L.ssAnnuals);
      const _pLabel = p => { if(!p)return ''; if(p==='3m')return L.every3m; if(p==='6m')return L.every6m; const y=parseInt(p); return y?L.everyYears.replace('{n}',y):''; };
      const _nowA = new Date();
      annuals.forEach(a => {
        if (!a.name) return;
        let meta = '';
        if (a.period && a.lastDate) {
          const _d = new Date(a.lastDate);
          if (!isNaN(_d)) {
            const _p = a.period;
            if(_p==='3m')_d.setMonth(_d.getMonth()+3);
            else if(_p==='6m')_d.setMonth(_d.getMonth()+6);
            else{const _y=parseInt(_p);if(_y)_d.setFullYear(_d.getFullYear()+_y);}
            const _days=Math.round((_d-_nowA)/86400000);
            const _sign=_days<0?L.overdue+' '+Math.abs(_days)+' '+L.days:L.in+' '+_days+' '+L.days;
            meta=' | след. '+_d.getDate()+'.'+(_d.getMonth()+1)+'.'+_d.getFullYear()+' ('+_sign+') | '+_pLabel(_p);
          }
        } else if (a.date) {
          const _d2=new Date(a.date);
          if(!isNaN(_d2)){const _days2=Math.round((_d2-_nowA)/86400000);const _sign2=_days2<0?L.overdue:L.in+' '+_days2+' '+L.days;meta=' | '+_d2.getDate()+'.'+(_d2.getMonth()+1)+'.'+_d2.getFullYear()+' ('+_sign2+')';}
        }
        li(a.name + meta);
      });
    }

  }

  // ── Интересы ──────────────────────────────────────────
  const intCats  = interests.cats  || [];
  const intItems = interests.items || [];

  if (intCats.length) {
    h1(L.sInterests);
    intCats.forEach(cat => {
      const catItems = intItems.filter(i => i.catId === cat.id);
      if (!catItems.length) return;
      const title = (cat.emoji ? cat.emoji + ' ' : '') + cat.name;
      h2(title);
      catItems.forEach(item => {
        const note = item.note ? ` — ${item.note}` : '';
        li(`${item.name}${note}`);
      });
    });
  }

  // ── Финансы ───────────────────────────────────────────
  const finBudget    = g('finBudget', 0);
  const finPieSlices = g('finPieSlices', []);
  const hasFinance = (finTpl.week?.income?.length || finTpl.week?.expense?.length ||
    finTpl.month?.income?.length || finTpl.month?.expense?.length ||
    finTpl.month3?.income?.length || finTpl.month3?.expense?.length ||
    finTpl.year?.income?.length || finTpl.year?.expense?.length ||
    finDebts.length || finPurchases.length || finBudget > 0);

  if (hasFinance) {
    h1(L.sFinance);

    // Шаблоны доходов/расходов
    const tplSections = [
      ['Ежемесячный доход', finTpl.month?.income],
      ['Ежемесячные расходы', finTpl.month?.expense],
      ['Еженедельный доход', finTpl.week?.income],
      ['Еженедельные расходы', finTpl.week?.expense],
      ['Доход раз в 3 месяца', finTpl.month3?.income],
      ['Расход раз в 3 месяца', finTpl.month3?.expense],
      ['Годовой доход', finTpl.year?.income],
      ['Годовые расходы', finTpl.year?.expense],
    ];
    tplSections.forEach(([label, arr]) => {
      if (Array.isArray(arr) && arr.length) {
        h2(label);
        arr.forEach(entry => {
          const amount = entry.amount ? ` — ${entry.amount} руб.` : '';
          li(`${entry.desc || entry.name || '?'}${amount}`);
        });
      }
    });

    // ── Месячный баланс ──
    const monthIncome  = (finTpl.month?.income  || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthExpense = (finTpl.month?.expense || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const weekIncome   = (finTpl.week?.income   || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) * 4;
    const weekExpense  = (finTpl.week?.expense  || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) * 4;
    const totalIncome  = monthIncome + weekIncome;
    const totalExpense = monthExpense + weekExpense;
    if (totalIncome || totalExpense) {
      h2(L.ssMonthBalance);
      kv(L.income,   totalIncome  + (isEN?' rub.':' руб.'));
      kv(L.expense,  totalExpense + (isEN?' rub.':' руб.'));
      const balance = totalIncome - totalExpense;
      const balSign = balance >= 0 ? '+' + balance + L.surplus : balance + L.deficit;
      kv(L.total, balSign);
    }

    // Бюджетный лимит
    if (finBudget > 0) kv(L.budget, finBudget.toLocaleString('ru') + (isEN?' rub.':' руб.'));

    // Категории бюджета (круговая диаграмма)
    const activePie = finPieSlices.filter(s => s.name && s.pct > 0);
    if (activePie.length) {
      h2(L.ssBudgetCats);
      activePie.forEach(s => {
        const desc = s.desc ? ` — ${s.desc}` : '';
        li(`${s.name}: ${s.pct}%${desc}`);
      });
    }

    // Долги
    const activeDebts = finDebts.filter(d => !d.paid);
    if (activeDebts.length) {
      h2(L.ssDebts);
      activeDebts.forEach(d => {
        const dir = d.direction === 'owe' ? L.debtOwe : L.debtOwed;
        const amt = d.amount ? ` ${d.amount} руб.` : '';
        const name = d.name ? ` | ${d.name}` : '';
        const desc = d.desc ? ` (${d.desc})` : '';
        li(`${dir}${amt}${name}${desc}`);
      });
    }

    // Плановые покупки (только не купленные)
    const unpaidPurchases = finPurchases.filter(p => !p.paid);
    if (unpaidPurchases.length) {
      h2(L.ssPurchases);
      unpaidPurchases.forEach(p => {
        const pMin = p.priceMin || p.price || 0;
        const pMax = p.priceMax && p.priceMax > pMin ? p.priceMax : 0;
        const priceStr = pMax > 0
          ? ` — ${pMin.toLocaleString('ru')}–${pMax.toLocaleString('ru')} руб.`
          : pMin > 0 ? ` — ~${pMin.toLocaleString('ru')} руб.` : '';
        li(`${p.name}${priceStr}`);
      });
    }
  }

  // ── Заметки ───────────────────────────────────────────
  const validNotes = notes.filter(n => n.text && n.text.trim());
  if (validNotes.length) {
    h1(L.sNotes);
    validNotes.forEach(n => {
      // Обрезаем очень длинные заметки — первые 300 символов
      const text = n.text.trim();
      const preview = text.length > 300 ? text.slice(0, 300) + '…' : text;
      lines.push(preview);
      lines.push('');
    });
  }

  // ── Домашние задания ──────────────────────────────────
  const activeHW = (homework || []).filter(h => !h.done && h.subj);
  if (activeHW.length) {
    h1(L.sHomework);
    const now4 = new Date();
    activeHW.forEach(h => {
      let dl = '';
      if (h.date) {
        const d = new Date(h.date);
        if (!isNaN(d)) {
          const days = Math.round((d - now4) / 86400000);
          dl = days < 0 ? ` [${L.overdue} ${Math.abs(days)} ${L.days}]` : days === 0 ? ` [${L.todayDeadline}]` : ` [${L.in} ${days} ${L.days}]`;
        }
      }
      li(`${h.subj}: ${h.task}${dl}`);
    });
  }

  // ── Патчи / задачи ────────────────────────────────────
  const activePatches = (patches || []).filter(p => !p.done && p.text);
  if (activePatches.length) {
    h1(L.sPatches);
    const now5 = new Date();
    activePatches.forEach(p => {
      let dl = '';
      if (p.date) {
        const d = new Date(p.date);
        if (!isNaN(d)) {
          const days = Math.round((d - now5) / 86400000);
          dl = days < 0 ? ` [${L.overdue}]` : days === 0 ? ` [${L.today}]` : ` [${L.in} ${days} ${L.days}]`;
        }
      }
      li(`${p.text.slice(0, 80)}${dl}`);
    });
  }

  // ── Вотчлист ──────────────────────────────────────────
  // В базовом режиме пропускаем медиалист
  const activeWatch = isBase ? [] : watchlist.filter(w => w.status !== 'done');
  if (activeWatch.length) {
    h1(L.sWatchlist);
    // Группируем по типу
    const byType = {};
    activeWatch.forEach(w => {
      const t = w.type || 'другое';
      if (!byType[t]) byType[t] = [];
      byType[t].push(w);
    });
    Object.entries(byType).forEach(([type, items]) => {
      h2(type);
      items.forEach(w => {
        const status = w.status ? ` [${w.status}]` : '';
        const deadline = w.date ? ` (до ${w.date})` : '';
        li(`${w.name}${status}${deadline}`);
      });
    });
  }

  // ── Дни рождения ──────────────────────────────────────
  if (birthdays.length) {
    h1(L.sBirthdays);
    const now3 = new Date();
    const sorted = [...birthdays].sort((a, b) => {
      // Сортируем по ближайшей дате ДР в году
      const toNext = dateStr => {
        if (!dateStr) return 999;
        const [, m, d] = dateStr.split('-').map(Number);
        const next = new Date(now3.getFullYear(), m - 1, d);
        if (next < now3) next.setFullYear(now3.getFullYear() + 1);
        return Math.round((next - now3) / 86400000);
      };
      return toNext(a.date) - toNext(b.date);
    });
    sorted.forEach(b => {
      if (!b.name) return;
      let info = '';
      if (b.date) {
        const [y, m, d] = b.date.split('-').map(Number);
        const bdAge = y > 1900 ? L.bdYears.replace('{n}', now3.getFullYear() - y) : '';
        const next = new Date(now3.getFullYear(), m - 1, d);
        if (next < now3) next.setFullYear(now3.getFullYear() + 1);
        const days = Math.round((next - now3) / 86400000);
        const soon = days === 0 ? L.bdToday : days <= 7 ? L.bdSoon.replace('{n}', days) : '';
        info = ` — ${d} ${L.bdMonths[m-1]}${bdAge}${soon}`;
      }
      const gifts = (b.gifts || []);
      const giftStr = gifts.length ? ` | ${L.bdGift}${gifts.join(', ')}` : '';
      li(`${b.name}${info}${giftStr}`);
    });
  }

  // ── Автодетектор противоречий ────────────────────────
  const contradictions = [];

  // Финансы: дефицит бюджета
  {
    const mInc  = (finTpl.month?.income  || []).reduce((s,e) => s + (Number(e.amount)||0), 0);
    const mExp  = (finTpl.month?.expense || []).reduce((s,e) => s + (Number(e.amount)||0), 0);
    const wInc  = (finTpl.week?.income   || []).reduce((s,e) => s + (Number(e.amount)||0), 0) * 4;
    const wExp  = (finTpl.week?.expense  || []).reduce((s,e) => s + (Number(e.amount)||0), 0) * 4;
    const bal   = (mInc + wInc) - (mExp + wExp);
    if (bal < 0) contradictions.push(L.warnBudget.replace('{n}', Math.abs(bal) + (isEN?' rub.':' руб.')));
  }

  // Вес: аномальное значение (>200 или <30)
  if (weights.length) {
    const badW = weights.filter(w => w.val > 200 || w.val < 30);
    if (badW.length) contradictions.push(L.warnWeight.replace('{n}', badW.length));
  }

  // Тренировки: нет физических шаблонов
  const hasPhy = (skillTpl || []).some(t => (t.skillType || 'physical') === 'physical');
  if (!hasPhy) contradictions.push(L.noPhyTpl);

  // Привычки: нет активных
  if (!activeHabits.length) contradictions.push(L.noHabits);

  // Поиск похожих / дублирующих записей по всем разделам (Jaccard по словам, порог 50%)
  {
    const normalize = str => str.toLowerCase().replace(/[^а-яёa-z0-9\s]/g, ' ')
      .split(/\s+/).filter(w => w.length >= 3);
    const jaccard = (a, b) => {
      const sa = new Set(a), sb = new Set(b);
      const inter = [...sa].filter(w => sb.has(w)).length;
      const union = new Set([...sa, ...sb]).size;
      return union === 0 ? 0 : inter / union;
    };
    const checkSection = (items, sectionLabel) => {
      const pairs = [];
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const wa = normalize(items[i]), wb = normalize(items[j]);
          const sim = jaccard(wa, wb);
          if (sim >= 0.5 || items[i].toLowerCase().trim() === items[j].toLowerCase().trim()) {
            pairs.push(`«${items[i]}» ≈ «${items[j]}»`);
          }
        }
      }
      if (pairs.length) contradictions.push(sectionLabel + L.similarSuffix + pairs.join('; '));
    };

    // Цели (обычные + свободные)
    checkSection([
      ...activeGoals.map(g => g.name),
      ...pendingFree.map(g => g.text || g.name || ''),
    ].filter(Boolean), L.similarGoals);

    // Привычки
    checkSection(activeHabits.map(h => h.name).filter(Boolean), L.similarHabits);

    // Вотчлист
    const activeWatchNames = watchlist.filter(w => w.status !== 'done').map(w => w.name).filter(Boolean);
    checkSection(activeWatchNames, L.similarWatch);

    // Патчи
    const activePatchTexts = (patches || []).filter(p => !p.done).map(p => p.text).filter(Boolean);
    checkSection(activePatchTexts, L.similarPatches);

    // Интересы (все пункты независимо от категории)
    const allIntItems = intItems.map(i => i.name).filter(Boolean);
    checkSection(allIntItems, L.similarInterests);

    // Рутина — все слоты объединяем
    const allRoutineItems = [
      ...(routine.morning || []), ...(routine.day || []), ...(routine.evening || []),
      ...(routine.week || []), ...(routine.month || []), ...(routine.year || []),
      ...Object.values(routine.weekdays || {}).flat(),
    ].filter(s => typeof s === 'string' && s.trim());
    checkSection(allRoutineItems, isEN ? 'Routine' : 'Рутина');

    // Домашние задания
    const hwNames = (homework || []).filter(h => !h.done && h.subj).map(h => h.subj + (h.task ? ' ' + h.task : ''));
    checkSection(hwNames, isEN ? 'Homework' : 'Домашние задания');

    // Добавки
    const suppNames = supps.map(s => s.name || s).filter(Boolean);
    checkSection(suppNames, isEN ? 'Supplements' : 'Добавки');

    // Аптечка
    const medNames = meds.map(m => m.name).filter(Boolean);
    checkSection(medNames, isEN ? 'Medicine' : 'Аптечка');

    // Тренировки (шаблоны)
    const tplNames = (skillTpl || []).map(t => t.name).filter(Boolean);
    checkSection(tplNames, isEN ? 'Workout templates' : 'Шаблоны тренировок');

    // Заметки
    const noteTexts = validNotes.map(n => n.text.trim().slice(0, 120));
    checkSection(noteTexts, isEN ? 'Notes' : 'Заметки');

    // Ежегодные напоминания
    const annualNames = (annuals || []).map(a => a.name).filter(Boolean);
    checkSection(annualNames, isEN ? 'Annuals' : 'Ежегодные напоминания');
  }

  // physDiseases: пустой список
  if (!physDiseases.length) contradictions.push(L.warnNoConditions);

  if (contradictions.length) {
    h1(L.sWarnings);
    contradictions.forEach(c => li(c));
  }

  // ── Нижний колонтитул ─────────────────────────────────
  lines.push(`\n${'─'.repeat(44)}`);
  lines.push(`${L.footer} ${now.getDate()}.${now.getMonth()+1}.${now.getFullYear()}`);

  return lines.join('\n');
}
