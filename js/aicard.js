// ═══ MODULE: aicard.js — Экспорт AI-карты ═══

function exportAICard() {
  try {
    const text = buildAICard();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const now  = new Date();
    const dateStr = `${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`;
    a.href     = url;
    a.download = `logos-ai-card-${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    flash('AI-карта скачана');
  } catch(e) {
    flash('Ошибка: ' + e.message);
    console.error('[aicard]', e);
  }
}

function copyAICard() {
  try {
    const text = buildAICard();
    navigator.clipboard.writeText(text).then(() => {
      flash('AI-карта скопирована в буфер');
    }).catch(() => {
      // Fallback для устройств без clipboard API
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flash('AI-карта скопирована');
    });
  } catch(e) {
    flash('Ошибка копирования');
    console.error('[aicard]', e);
  }
}

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

function buildAICard() {
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
  const aiProfile    = g('aiProfile', {});  // ручные поля из настроек

  const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  const lines = [];
  const h1 = t => lines.push(`\n${'═'.repeat(44)}\n${t}\n${'═'.repeat(44)}`);
  const h2 = t => lines.push(`\n── ${t} ──`);
  const li = t => lines.push(`• ${t}`);
  const kv = (k, v) => { if (v !== undefined && v !== '' && v !== null) lines.push(`${k}: ${v}`); };

  // ── Заголовок ──────────────────────────────────────────
  const now = new Date();
  lines.push(`LOGOS — AI-КАРТА ПОЛЬЗОВАТЕЛЯ`);
  lines.push(`Дата: ${now.getDate()} ${['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][now.getMonth()]} ${now.getFullYear()}`);
  lines.push(`(Автоматически сгенерировано сайтом Logos. Используй как контекст при общении с ИИ.)`);

  // ── Ручные поля профиля (если заполнены в настройках) ──
  if (aiProfile.name || aiProfile.city || aiProfile.horizon) {
    h1('ПРОФИЛЬ');
    if (aiProfile.name)    kv('Имя',      aiProfile.name);
    if (aiProfile.city)    kv('Город',    aiProfile.city);
    if (aiProfile.horizon) kv('Горизонт планирования', aiProfile.horizon);
    if (aiProfile.notes)   { h2('Доп. контекст'); lines.push(aiProfile.notes); }
  }

  // ── Физические данные ──────────────────────────────────
  const hasHealth = health.height || health.age || weights.length || physDiseases.length;
  if (hasHealth) {
    h1('ФИЗИЧЕСКИЕ ДАННЫЕ');

    if (health.age)    kv('Возраст',  health.age + ' лет');
    if (health.height) kv('Рост',     health.height + ' см');

    // Последние 3 взвешивания
    if (weights.length) {
      const lastWeights = weights.slice(-3);
      const wStr = lastWeights.map(w => {
        const d = new Date(w.date || w.ts || '');
        const dStr = isNaN(d) ? '' : ` (${d.getDate()}.${d.getMonth()+1})`;
        return `${w.val} кг${dStr}`;
      }).join(' → ');
      kv('Вес (последние)', wStr);
    }

    if (health.wMin && health.wMax) kv('Целевой вес', `${health.wMin}–${health.wMax} кг`);

    const modeMap = { cut: 'Сушка (рельеф)', maintain: 'Поддержание', bulk: 'Набор массы' };
    if (health.mode) kv('Режим', modeMap[health.mode] || health.mode);

    const genderMap = { male: 'мужской', female: 'женский' };
    if (health.gender) kv('Пол', genderMap[health.gender] || health.gender);

    // ── Расчётные показатели (ИМТ, TDEE, дефицит) ──
    const lastW = weights.length ? weights[weights.length - 1].val : 0;
    const curWeight = (lastW >= 30 && lastW < 300) ? lastW : 0;
    const hCm = health.height || 0;
    const ageY = health.age || 0;
    if (curWeight && hCm) {
      const hM  = hCm / 100;
      const bmi = +(curWeight / (hM * hM)).toFixed(1);
      kv('ИМТ', bmi + ' (норма 18.5–24.9)');
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
      kv('TDEE (расчётный)', '~' + tdee + ' ккал/день');
      if (health.kcal && health.mode === 'cut') {
        const deficit = tdee - health.kcal;
        const sign = deficit > 0 ? '-' + deficit : '+' + Math.abs(deficit) + ' (профицит!)';
        kv('Дефицит калорий', sign + ' ккал/день');
      }
    }

    // Нормы КБЖУ и сна
    h2('Нормы питания');
    if (health.kcal)  kv('Калории', health.kcal + ' ккал');
    if (health.prot)  kv('Белок',   health.prot + ' г');
    if (health.fat)   kv('Жиры',    health.fat + ' г');
    if (health.carb)  kv('Углеводы',health.carb + ' г');
    if (health.water) kv('Вода',    health.water + ' стаканов');
    if (health.sleep) kv('Сон',     health.sleep + ' ч');
    if (health.fiber) kv('Клетчатка', health.fiber + ' г');
    if (health.sugar) kv('Сахар (лимит)', health.sugar + ' г');
    if (health.salt)  kv('Соль (лимит)',  health.salt + ' г');

    // Диагнозы / ограничения
    if (physDiseases.length) {
      h2('Состояния / Ограничения (учитывать при советах)');
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
    h1('ДОБАВКИ И АПТЕЧКА');
    if (supps.length) {
      h2('БАДы / Добавки');
      supps.forEach(s => {
        const desc = s.desc ? ` (${s.desc})` : '';
        li(`${s.name || s}${desc}`);
      });
    }
    if (meds.length) {
      h2('Аптечка');
      meds.forEach(m => {
        const use = m.use ? ` — ${m.use}` : '';
        li(`${m.name}${use}`);
      });
    }
  }

  // ── Тренировки ────────────────────────────────────────
  const hasTraining = physParams.length || mentalParams.length || skillTpl.length;
  if (hasTraining) {
    h1('ТРЕНИРОВКИ');

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

      h2('Цикл тренировок');
      kv('Старт цикла', cycleStart);
      kv('Паттерн',     _pattern.join(' → '));
      kv('Сегодня',     todaySlot === 'rest' ? 'Отдых' : `слот ${todaySlot}`);
      kv('Первая неделя цикла', cycleFirstHeavy ? 'тяжёлая' : 'лёгкая');

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
      lines.push(`  Следующие 7 дней: ${upcoming.join('  ')}`);
    }

    if (skillTpl.length) {
      const physTpl   = skillTpl.filter(t => (t.skillType || 'physical') === 'physical');
      const mentalTpl = skillTpl.filter(t => t.skillType === 'mental');

      if (physTpl.length) {
        h2('Физические тренировки (шаблоны)');
        physTpl.forEach(t => {
          const slot = t.cycleSlot ? ` [слот ${t.cycleSlot}]` : '';
          const days = Array.isArray(t.weekDays) && t.weekDays.length
            ? ` | дни: ${t.weekDays.map(i => DAYS_RU[i]).join(', ')}` : '';
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
        h2('Умственные тренировки (шаблоны)');
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
      h2('Параметры физ. тренировок');
      physParams.forEach(p => {
        const notes = p.notes ? ` — ${p.notes}` : '';
        li(`${p.name}${notes}`);
      });
    }

    if (mentalParams.length) {
      h2('Параметры умственных тренировок');
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
    h1('РУТИНА');

    const blocks = [
      ['Утро',    routine.morning],
      ['День',    routine.day],
      ['Вечер',   routine.evening],
      ['Неделя',  routine.week],
      ['Месяц',   routine.month],
      ['Год',     routine.year],
    ];
    blocks.forEach(([label, arr]) => {
      if (Array.isArray(arr) && arr.length) {
        h2(label); arr.forEach(item => li(item));
      }
    });

    if (routine.weekdays) {
      DAYS_RU.forEach((day, i) => {
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
    h1('ПРИВЫЧКИ');
    activeHabits.forEach(h => {
      const desc = h.desc ? ` — ${h.desc}` : '';
      li(`${h.emoji || ''}${h.name}${desc}`);
    });
  }

  // ── Цели ──────────────────────────────────────────────
  const activeGoals = goals.filter(g => !g.done && g.name);
  const pendingFree = (freeGoals || []).filter(g => !g.done && g.name);

  if (activeGoals.length || pendingFree.length || annuals?.length) {
    h1('ЦЕЛИ');

    if (activeGoals.length) {
      h2('Активные цели');
      const now2 = new Date();
      activeGoals.forEach(goal => {
        let dl = '';
        if (goal.deadline) {
          const d = new Date(goal.deadline);
          if (!isNaN(d)) {
            const days = Math.round((d - now2) / 86400000);
            const sign = days < 0 ? 'просрочено ' + Math.abs(days) + ' дн.' : days + ' дн.';
            dl = ` [дедлайн: ${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}, осталось: ${sign}]`;
          }
        }
        const note = goal.note ? `\n    ${goal.note}` : '';
        li(`${goal.name}${dl}${note}`);
      });
    }

    if (pendingFree.length) {
      h2('Свободные цели');
      pendingFree.forEach(g => li(g.name + (g.note ? ` — ${g.note}` : '')));
    }

    if (Array.isArray(annuals) && annuals.length) {
      h2('Ежегодные цели');
      annuals.forEach(a => li(a.name || a));
    }
  }

  // ── Интересы ──────────────────────────────────────────
  const intCats  = interests.cats  || [];
  const intItems = interests.items || [];

  if (intCats.length) {
    h1('ИНТЕРЕСЫ');
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
  const hasFinance = (finTpl.week?.income?.length || finTpl.week?.expense?.length ||
    finTpl.month?.income?.length || finTpl.month?.expense?.length ||
    finDebts.length || finPurchases.length);

  if (hasFinance) {
    h1('ФИНАНСЫ');

    // Шаблоны доходов/расходов
    const tplSections = [
      ['Ежемесячный доход', finTpl.month?.income],
      ['Ежемесячные расходы', finTpl.month?.expense],
      ['Еженедельный доход', finTpl.week?.income],
      ['Еженедельные расходы', finTpl.week?.expense],
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
      h2('Месячный баланс');
      kv('Доход',   totalIncome  + ' руб.');
      kv('Расход',  totalExpense + ' руб.');
      const balance = totalIncome - totalExpense;
      const balSign = balance >= 0 ? '+' + balance + ' руб. ✓' : balance + ' руб. ⚠️ ДЕФИЦИТ';
      kv('Итог', balSign);
    }

    // Долги
    const activeDebts = finDebts.filter(d => !d.paid);
    if (activeDebts.length) {
      h2('Долги / Займы');
      activeDebts.forEach(d => {
        const dir = d.direction === 'owe' ? '← Я должен' : '→ Мне должны';
        const amt = d.amount ? ` ${d.amount} руб.` : '';
        const name = d.name ? ` | ${d.name}` : '';
        const desc = d.desc ? ` (${d.desc})` : '';
        li(`${dir}${amt}${name}${desc}`);
      });
    }

    // Плановые покупки (только не купленные)
    const unpaidPurchases = finPurchases.filter(p => !p.paid);
    if (unpaidPurchases.length) {
      h2('Запланированные покупки');
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
    h1('ЗАМЕТКИ');
    validNotes.forEach(n => {
      // Обрезаем очень длинные заметки — первые 300 символов
      const text = n.text.trim();
      const preview = text.length > 300 ? text.slice(0, 300) + '…' : text;
      lines.push(preview);
      lines.push('');
    });
  }

  // ── Вотчлист ──────────────────────────────────────────
  const activeWatch = watchlist.filter(w => w.status !== 'done');
  if (activeWatch.length) {
    h1('ВОТЧЛИСТ / К ПРОСМОТРУ');
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
    h1('ДНИ РОЖДЕНИЯ');
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
        const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
        const age = y > 1900 ? ` (${now3.getFullYear() - y} лет)` : '';
        const next = new Date(now3.getFullYear(), m - 1, d);
        if (next < now3) next.setFullYear(now3.getFullYear() + 1);
        const days = Math.round((next - now3) / 86400000);
        const soon = days === 0 ? ' 🎉 СЕГОДНЯ!' : days <= 7 ? ` ← через ${days} дн.` : '';
        info = ` — ${d} ${months[m-1]}${age}${soon}`;
      }
      li(`${b.name}${info}`);
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
    if (bal < 0) contradictions.push('Бюджет: расходы превышают доходы на ' + Math.abs(bal) + ' руб./мес.');
  }

  // Вес: аномальное значение (>200 или <30)
  if (weights.length) {
    const badW = weights.filter(w => w.val > 200 || w.val < 30);
    if (badW.length) contradictions.push('Вес: ' + badW.length + ' запис(и) с аномальным значением — проверь данные.');
  }

  // Тренировки: нет физических шаблонов
  const hasPhy = (skillTpl || []).some(t => (t.skillType || 'physical') === 'physical');
  if (!hasPhy) contradictions.push('Тренировки: нет ни одного физического шаблона.');

  // Привычки: нет активных
  if (!activeHabits.length) contradictions.push('Привычки: раздел пустой.');

  // Цели: дубликаты по названию
  const goalNames = activeGoals.map(g => g.name.toLowerCase().trim());
  const dupGoals  = goalNames.filter((n, i) => goalNames.indexOf(n) !== i);
  if (dupGoals.length) contradictions.push('Цели: дубликаты — ' + [...new Set(dupGoals)].join(', '));

  // physDiseases: пустой список
  if (!physDiseases.length) contradictions.push('Здоровье: ограничения не добавлены — ИИ не знает об ограничениях.');

  if (contradictions.length) {
    h1('⚠️ ПРОТИВОРЕЧИЯ И ПРЕДУПРЕЖДЕНИЯ');
    contradictions.forEach(c => li(c));
  }

  // ── Нижний колонтитул ─────────────────────────────────
  lines.push(`\n${'─'.repeat(44)}`);
  lines.push(`Конец AI-карты. Версия: ${now.getDate()}.${now.getMonth()+1}.${now.getFullYear()}`);

  return lines.join('\n');
}
