// ═══ MODULE: gdrive.js ═══
// ══ GOOGLE DRIVE SYNC ══════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  gdrive.js  —  Google Drive sync  (инкапсулированный объект)
//  Версия: 2.0  |  Без сборки, Vanilla JS
// ════════════════════════════════════════════════════════════════

const GDrive = (() => {
  // ── Константы ───────────────────────────────────────────────
  const CLIENT_ID         = '158368559695-j016cbs612uffkbl9kmirkjrqg2lthkd.apps.googleusercontent.com';
  const SCOPE             = 'https://www.googleapis.com/auth/drive.file';
  const FILE_BACKUP       = 'logos_backup.json';
  const FILE_AUTOSAVE     = 'logos_autosave.json';
  const FILE_AUTOSAVE_OLD = 'logos_autosave_old.json';
  const FILE_BACKUP_OLD   = 'logos_backup_old.json';
  const AUTOSAVE_MS       = 2 * 60 * 1000; // 2 минуты

  // ── Приватное состояние ──────────────────────────────────────
  let _token       = localStorage.getItem('gdrive_token') || null;
  let _tokenExpiry = parseInt(localStorage.getItem('gdrive_token_expiry') || '0');
  let _tokenClient = null;
  let _autoTimer   = null;
  // Мьютекс: предотвращает параллельные сохранения (race condition)
  let _saveLock    = false;

  // ── Кеш ID файлов ─────────────────────────────────────────────
  // Хранит { "logos_backup.json": "fileId123", ... } в localStorage.
  // Позволяет находить файлы по ID даже после переавторизации,
  // обходя ограничение drive.file scope на поиск по имени.
  function _getIdCache() {
    try { return JSON.parse(localStorage.getItem('gdrive_file_ids') || '{}'); } catch(e) { return {}; }
  }
  function _setIdCache(name, id) {
    const cache = _getIdCache();
    cache[name] = id;
    localStorage.setItem('gdrive_file_ids', JSON.stringify(cache));
  }
  function _clearIdCache() {
    localStorage.removeItem('gdrive_file_ids');
  }

  // ── Токен ────────────────────────────────────────────────────
  function _isAuthed() {
    return !!(_token && Date.now() < _tokenExpiry - 120000);
  }

  function _saveToken(resp) {
    _token       = resp.access_token;
    _tokenExpiry = Date.now() + (resp.expires_in - 60) * 1000;
    localStorage.setItem('gdrive_token',        _token);
    localStorage.setItem('gdrive_token_expiry', String(_tokenExpiry));
  }

  function _clearToken() {
    _token = null; _tokenExpiry = 0;
    localStorage.removeItem('gdrive_token');
    localStorage.removeItem('gdrive_token_expiry');
  }

  function _initClient(callback) {
    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SCOPE, callback
    });
    return _tokenClient;
  }

  function _silentRefresh(onOk, onFail) {
    _initClient(resp => {
      if (resp.error || !resp.access_token) { if (onFail) onFail(resp.error || 'no_token'); return; }
      _saveToken(resp);
      _updateUI();
      if (onOk) onOk();
    });
    _tokenClient.requestAccessToken({ prompt: '' });
  }

  function _ensureToken(onReady, onFail) {
    if (_isAuthed()) { onReady(); return; }
    _silentRefresh(onReady, () => {
      _clearToken();
      _updateUI();
      if (typeof autoSaveOn !== 'undefined' && autoSaveOn) _showReconnectBanner(true);
      if (onFail) onFail();
    });
  }

  // ── UI ───────────────────────────────────────────────────────
  function _updateUI() {
    const authed   = _isAuthed();
    const tr       = (key, fb) => (typeof t === 'function' ? t(key) : fb);
    const statusEl = document.getElementById('gdriveStatus');
    const syncRow  = document.getElementById('gdriveSyncRow');
    const authBtn  = document.getElementById('gdriveAuthBtn');
    if (!statusEl) return;
    if (authed) {
      statusEl.textContent = tr('gdrive-connected', 'Подключено');
      if (authBtn) authBtn.textContent = tr('gdrive-refresh', 'ОБНОВИТЬ');
      if (syncRow) syncRow.style.display = 'block';
      _showReconnectBanner(false);
    } else {
      statusEl.textContent = tr('gdrive-disconnected', 'Не подключено');
      if (authBtn) authBtn.textContent = tr('gdrive-signin', 'Войти');
      if (syncRow) syncRow.style.display = 'none';
    }
    const lastSave = localStorage.getItem('gdrive_last_save');
    const lastEl   = document.getElementById('gdriveLastSave');
    if (lastEl) lastEl.textContent = lastSave ? 'Последнее сохранение: ' + lastSave : '';
    const asTgl = document.getElementById('autoSaveTgl');
    if (asTgl && typeof autoSaveOn !== 'undefined') {
      asTgl.className = 'tgl' + (autoSaveOn ? ' on' : '');
    }
  }

  function _showReconnectBanner(show) {
    const b = document.getElementById('gdriveSessionModal');
    if (!b) return;
    if (show) openModal('gdriveSessionModal'); else closeModal('gdriveSessionModal');
  }

  // ── Drive API helpers ────────────────────────────────────────
  async function _findFile(name) {
    // 1. Сначала пробуем по кешированному ID (работает после переавторизации)
    const cache = _getIdCache();
    if (cache[name]) {
      try {
        const r = await fetch(
          'https://www.googleapis.com/drive/v3/files/' + cache[name] + '?fields=id,name,modifiedTime',
          { headers: { Authorization: 'Bearer ' + _token } }
        );
        if (r.ok) {
          const f = await r.json();
          if (f && f.id) return f;
        }
        // Файл удалён или недоступен — чистим кеш
        delete cache[name];
        localStorage.setItem('gdrive_file_ids', JSON.stringify(cache));
      } catch(e) { /* идём к поиску */ }
    }

    // 2. Fallback: поиск по имени
    const q = encodeURIComponent("name='" + name + "' and trashed=false");
    const r = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=' + q + '&fields=files(id,name,modifiedTime)',
      { headers: { Authorization: 'Bearer ' + _token } }
    );
    if (!r.ok) throw new Error('FindFile HTTP ' + r.status);
    const d = await r.json();
    if (!d.files || !d.files.length) return null;
    // Дедупликация: удаляем лишние копии
    for (let i = 1; i < d.files.length; i++) {
      await fetch('https://www.googleapis.com/drive/v3/files/' + d.files[i].id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + _token }
      });
    }
    // Кешируем ID для следующих сессий
    _setIdCache(name, d.files[0].id);
    return d.files[0];
  }

  async function _upload(name, content, existingId) {
    const blob = new Blob([content], { type: 'application/json' });
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name })], { type: 'application/json' }));
    form.append('file', blob);
    const url    = existingId
      ? 'https://www.googleapis.com/upload/drive/v3/files/' + existingId + '?uploadType=multipart'
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const method = existingId ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { Authorization: 'Bearer ' + _token },
      body: form
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new Error('Upload HTTP ' + r.status + ': ' + errText.slice(0, 300));
    }
    const result = await r.json();
    // Кешируем ID файла для поиска в следующих сессиях
    if (result && result.id) _setIdCache(name, result.id);
    return result;
  }

  async function _readFile(fileId) {
    const r = await fetch(
      'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media',
      { headers: { Authorization: 'Bearer ' + _token } }
    );
    if (!r.ok) throw new Error('Read HTTP ' + r.status);
    return r.text();
  }

  // ── Сборка данных ─────────────────────────────────────────────
  function _collectData(label) {
    // Читаем через LS.g() — единственный надёжный источник.
    // window.X не работает для let-переменных из main.js (скоп-уровень скрипта).
    const g = (key, def) => (typeof LS !== 'undefined' ? LS.g(key, def) : def);
    const habEnabledRaw = (typeof habEnabled !== 'undefined')
      ? [...habEnabled]
      : g('habEnabled', []);
    return JSON.stringify({
      habits:         g('habits', []),
      comp:           g('comp', {}),
      tasks:          g('tasks', {}),
      permanentTasks: g('permanentTasks', []),
      goals:          g('goals', []),
      freeGoals:      g('freeGoals', []),
      annuals:        g('annuals', []),
      routine:        g('routine', null),
      routineLog:     g('routineLog', {}),
      weekRtLog:      g('weekRtLog', {}),
      monthRtLog:     g('monthRtLog', {}),
      yearRtLog:      g('yearRtLog', {}),
      tplDone:        g('tplDone', {}),
      habEnabled:     habEnabledRaw,
      health:         g('health', {}),
      hLog:           g('hLog', {}),
      supps:          g('supps', []),
      meds:           g('meds', []),
      weights:        g('weights', []),
      birthdays:      g('birthdays', []),
      homework:       g('homework', []),
      notes:          g('notes', []),
      watchlist:      g('watchlist', []),
      eduSchedule:    g('eduSchedule', []),
      eduSubjects:    g('eduSubjects', []),
      eduLinks:       g('eduLinks', []),
      eduWeekParity:  g('eduWeekParity', 'num'),
      eduWeekAnchor:  g('eduWeekAnchor', ''),
      eduBells:      g('eduBells', []),
      skillTemplates: g('sportTemplates', []),
      finLog:         g('finLog', {}),
      finTpl:         g('finTpl', {}),
      finPlans:       g('finPlans', {}),
      finCapital0:    g('finCapital0', 0),
      finPurchases:   g('finPurchases', []),
      finDebts:       g('finDebts', []),
      finAssets:      g('finAssets', []),
      finAssetHistory:g('finAssetHistory', []),
      finPieSlices:   g('finPieSlices', []),
      finPieSum:      g('finPieSum', 0),
      physDiseases:   g('physDiseases', []),
      physParams:     g('physParams', []),
      mentalParams:   g('mentalParams', []),
      nid:            g('nid', 971),
      morningTime:    g('morningTime', '08:00'),
      eveningTime:    g('eveningTime', '21:00'),
      sleepSchedule:  g('sleepSchedule', { bed: '23:00', wake: '05:00', naps: [] }),
      cycleFirstWeekHeavy: g('cycleFirstWeekHeavy', true),
      cycleOverrides:  g('cycleOverrides', {}),
      notifCfg:        g('notifCfg', {}),
      remindersCfg:    g('remindersCfg', {}),
      interests:       g('interests', { cats: [], items: [] }),
      aiProfile:       g('aiProfile', {}),
      finBudget:       g('finBudget', 0),
      sleepRem:        g('sleepRem', { on: false, time: '22:30' }),
      appTheme:        g('appTheme', 'dark'),
      appFont:         g('appFont', 'default'),
      appLang:         g('appLang', 'ru'),
      autoSaveOn:      g('autoSaveOn', false),
      notifyOn:        g('notifyOn', false),
      _savedAt: new Date().toISOString(),
      _label:   label || 'manual'
    }, null, 2);
  }

  // ── Ротация бэкапов ───────────────────────────────────────────
  //
  //  Автосейв (silent=true):
  //    autosave_old  <- предыдущий autosave
  //    autosave      <- текущий снапшот
  //
  //  Ручной save (silent=false):
  //    backup_old              <- предыдущий backup
  //    logos_backup_YYYY-MM-DD <- исторический (один в сутки, не перезаписывается)
  //    backup                  <- текущий
  //
  // ── Шифрование бэкапа ─────────────────────────────────────────
  // Файл в Drive содержит {"_enc": {iv, ct, salt, iterations}} —
  // шифртекст паролем приложения. Открытый JSON наружу не уходит.
  // Старые (открытые) бэкапы читаются без изменений — совместимость.
  async function _decryptIfNeeded(text) {
    if (typeof text !== 'string' || text.indexOf('"_enc"') === -1) return text;
    const wrapper = JSON.parse(text);
    if (!wrapper || !wrapper._enc) return text;
    if (typeof LS === 'undefined' || !LS.isAuthorized()) {
      throw new Error('для расшифровки бэкапа нужен пароль приложения');
    }
    return await LS.decryptFromBackup(wrapper._enc);
  }

  // ── Ручной save (silent=false):
  //    backup_old              <- предыдущий backup
  //    logos_backup_YYYY-MM-DD <- исторический (один в сутки, не перезаписывается)
  //    backup                  <- текущий
  // ── Автосейв (silent=true):
  //    autosave_old              <- предыдущий autosave
  //    autosave                  <- текущий снапшот
  async function _saveInternal(silent) {
    if (_saveLock) {
      if (!silent && typeof flash === 'function') flash('Сохранение уже выполняется...');
      return;
    }
    _saveLock = true;
    try {
      if (typeof LS === 'undefined' || !LS.isAuthorized()) {
        throw new Error('для зашифрованного бэкапа нужен пароль приложения');
      }
      const plain = _collectData(silent ? 'autosave' : 'manual');
      // Шифруем паролем сессии — в облако уходит только шифртекст.
      const content = JSON.stringify({ _enc: await LS.encryptForBackup(plain) });

      if (silent) {
        // ── Автосейв ─────────────────────────────────────────
        const existing = await _findFile(FILE_AUTOSAVE);
        if (existing) {
          const oldContent = await _readFile(existing.id);
          const oldFile    = await _findFile(FILE_AUTOSAVE_OLD);
          // Порядок важен: сначала _old, потом перезаписываем текущий
          await _upload(FILE_AUTOSAVE_OLD, oldContent, oldFile ? oldFile.id : null);
          await _upload(FILE_AUTOSAVE, content, existing.id);
        } else {
          await _upload(FILE_AUTOSAVE, content, null);
          const oldFile = await _findFile(FILE_AUTOSAVE_OLD);
          await _upload(FILE_AUTOSAVE_OLD, content, oldFile ? oldFile.id : null);
        }
      } else {
        // ── Ручной save ──────────────────────────────────────
        const existing = await _findFile(FILE_BACKUP);
        if (existing) {
          const oldContent = await _readFile(existing.id);
          const oldBackup  = await _findFile(FILE_BACKUP_OLD);
          await _upload(FILE_BACKUP_OLD, oldContent, oldBackup ? oldBackup.id : null);
        }
        await _upload(FILE_BACKUP, content, existing ? existing.id : null);
      }

      const saveTime = displayDateTime(new Date());
      localStorage.setItem('gdrive_last_save', saveTime);
      _updateUI();
      if (typeof flash === 'function') {
        flash(silent ? 'Автосейв в Drive' : '✓ Сохранено в Google Drive');
      }
    } catch (e) {
      if (!silent && typeof flash === 'function') flash('Ошибка сохранения: ' + e.message);
      console.error('[GDrive] save error', e);
    } finally {
      _saveLock = false;
    }
  }

  // ── Автосейв ─────────────────────────────────────────────────
  function _startAutoSave() {
    _stopAutoSave();
    if (typeof autoSaveOn === 'undefined' || !autoSaveOn) return;
    _autoTimer = setInterval(() => {
      if (typeof autoSaveOn === 'undefined' || !autoSaveOn) { _stopAutoSave(); return; }
      _ensureToken(
        () => _saveInternal(true),
        () => { /* баннер реконнекта уже показан */ }
      );
    }, AUTOSAVE_MS);
  }

  function _stopAutoSave() {
    if (_autoTimer) { clearInterval(_autoTimer); _autoTimer = null; }
  }

  // ── Публичный API ─────────────────────────────────────────────
  return {
    auth() {
      _initClient(resp => {
        if (resp.error) { if (typeof flash === 'function') flash('Ошибка авторизации Google'); return; }
        _saveToken(resp);
        if (typeof flash === 'function') flash('✓ Google Drive подключён');
        _showReconnectBanner(false);
        _updateUI();
        if (typeof autoSaveOn !== 'undefined' && autoSaveOn) _startAutoSave();
      });
      _tokenClient.requestAccessToken({ prompt: 'consent' });
    },

    signOut() {
      _stopAutoSave();
      if (_token) google.accounts.oauth2.revoke(_token, () => {});
      _clearToken();
      _clearIdCache();
      _tokenClient = null;
      _showReconnectBanner(false);
      if (typeof flash === 'function') flash('Выход из Google Drive');
      _updateUI();
    },

    save() {
      _ensureToken(
        () => { if (typeof flash === 'function') flash('Сохранение...'); _saveInternal(false); },
        () => { if (typeof flash === 'function') flash('Сессия Google истекла — войдите снова'); }
      );
    },

    async load() {
      _ensureToken(async () => {
        if (typeof flash === 'function') flash('Загрузка...');
        try {
          const file = await _findFile(FILE_BACKUP);
          if (!file) { if (typeof flash === 'function') flash('Бэкап не найден в Drive'); return; }
          const text = await _decryptIfNeeded(await _readFile(file.id));
          const d    = JSON.parse(text);

          const keys = [
            'habits','comp','tasks','permanentTasks','goals','freeGoals','annuals',
            'routine','routineLog','weekRtLog','monthRtLog','yearRtLog',
            'tplDone','habEnabled','health','hLog','supps','meds',
            'weights','birthdays','homework','notes','watchlist',
            'eduSchedule','eduSubjects','eduLinks','eduWeekParity','eduBells','eduWeekAnchor',
            'skillTemplates','finLog','finTpl','finPlans','finCapital0',
            'finPurchases','finDebts','finAssets','finAssetHistory',
            'finPieSlices','finPieSum','physDiseases','nid',
            // Новые раздельные ключи
            'physParams','mentalParams'
          ];
          keys.forEach(k => {
            if (d[k] !== undefined) {
              window[k] = d[k];
              if (typeof LS !== 'undefined') LS.s(k, d[k]);
            }
          });
          if (d.morningTime  !== undefined) { window.mTime = d.morningTime;  if (typeof LS !== 'undefined') LS.s('morningTime',  d.morningTime); }
          if (d.eveningTime  !== undefined) { window.eTime = d.eveningTime;  if (typeof LS !== 'undefined') LS.s('eveningTime',  d.eveningTime); }
          if (d.sleepSchedule !== undefined && typeof LS !== 'undefined') LS.s('sleepSchedule', d.sleepSchedule);
          if (d.cycleFirstWeekHeavy !== undefined) { window.cycleFirstWeekHeavy = d.cycleFirstWeekHeavy; LS.s('cycleFirstWeekHeavy', d.cycleFirstWeekHeavy); }
          if (d.cycleOverrides  !== undefined) { window.cycleOverrides  = d.cycleOverrides;  LS.s('cycleOverrides',  d.cycleOverrides); }
          if (d.notifCfg       !== undefined) { LS.s('notifCfg',       d.notifCfg); }
          if (d.remindersCfg   !== undefined) { LS.s('remindersCfg',   d.remindersCfg); }
          if (d.interests      !== undefined) { LS.s('interests',      d.interests); }
          if (d.aiProfile      !== undefined) { LS.s('aiProfile',      d.aiProfile); }
          if (d.finBudget      !== undefined) { LS.s('finBudget',      d.finBudget); }
          if (d.sleepRem       !== undefined) { LS.s('sleepRem',       d.sleepRem); }
          if (d.appTheme       !== undefined) { window.appTheme = d.appTheme; LS.s('appTheme', d.appTheme); if (typeof setTheme === 'function') setTheme(d.appTheme); }
          if (d.appFont        !== undefined) { window.appFont  = d.appFont;  LS.s('appFont',  d.appFont);  if (typeof setFont  === 'function') setFont(d.appFont); }
          if (d.appLang        !== undefined) { window.appLang  = d.appLang;  LS.s('appLang',  d.appLang);  if (typeof setLang  === 'function') setLang(d.appLang); }
          if (d.autoSaveOn     !== undefined) { window.autoSaveOn = d.autoSaveOn; LS.s('autoSaveOn', d.autoSaveOn); }
          if (d.notifyOn       !== undefined) { window.notifyOn   = d.notifyOn;   LS.s('notifyOn',   d.notifyOn); }
          // Патч ключа: Drive хранит 'skillTemplates', модуль читает 'sportTemplates'
          if (d.skillTemplates !== undefined) {
            window.skillTemplates = d.skillTemplates;
            if (typeof LS !== 'undefined') { LS.s('sportTemplates', d.skillTemplates); LS.s('skillTemplates', d.skillTemplates); }
          }

          if (typeof flash === 'function') flash('✓ Данные загружены из Drive');
                    // let-переменные не меняются через window[k] — присваиваем явно + миграция
          if (d.routine !== undefined) { routine = d.routine; }
          if (d.routineLog !== undefined) { routineLog = d.routineLog; }
          if (d.tplDone !== undefined) { tplDone = d.tplDone; }
          if (d.eduSchedule !== undefined) { eduSchedule = d.eduSchedule; }
          if (d.eduSubjects !== undefined) { eduSubjects = d.eduSubjects; }
          if (d.eduLinks !== undefined) { eduLinks = d.eduLinks; }
          if (d.eduWeekParity !== undefined) { eduWeekParity = d.eduWeekParity; }
          if (d.eduWeekAnchor !== undefined) { eduWeekAnchor = d.eduWeekAnchor; }
          if (d.eduBells !== undefined) { eduBells = d.eduBells; }
          if (d.finPieSlices !== undefined) { finPieSlices = d.finPieSlices; }
          if (d.finPieSum !== undefined) { finPieSum = Math.max(0, Number(d.finPieSum) || 0); }
          if (d.finLog !== undefined) { finLog = d.finLog; }
          if (d.finTpl !== undefined) { finTpl = d.finTpl; }
          if (d.finPlans !== undefined) { finPlans = d.finPlans; }
          if (d.finCapital0 !== undefined) { finCapital0 = d.finCapital0; }
          if (d.finPurchases !== undefined) { finPurchases = d.finPurchases; }
          if (d.finDebts !== undefined) { finDebts = d.finDebts; }
          if (d.finAssets !== undefined) { finAssets = d.finAssets; }
          if (d.finAssetHistory !== undefined) { finAssetHistory = d.finAssetHistory; }
          if (d.finPlans !== undefined && typeof finEnsurePlan === 'function') finEnsurePlan(finCurPlanKey());
          if (typeof migrateRoutine === 'function') migrateRoutine();
if (typeof renderCurrent === 'function') renderCurrent();
        } catch (e) {
          if (typeof flash === 'function') flash('Ошибка загрузки: ' + e.message);
          console.error('[GDrive] load error', e);
        }
      }, () => { if (typeof flash === 'function') flash('Сессия Google истекла — войдите снова'); });
    },

    async loadAutosave() {
      _ensureToken(async () => {
        if (typeof flash === 'function') flash('Загрузка автосейва...');
        try {
          const file = await _findFile(FILE_AUTOSAVE);
          if (!file) {
            if (typeof flash === 'function') flash('Автосейв не найден в Drive');
            return;
          }
          const text = await _decryptIfNeeded(await _readFile(file.id));
          const d    = JSON.parse(text);
          const keys = [
            'habits','comp','tasks','permanentTasks','goals','freeGoals','annuals',
            'routine','routineLog','weekRtLog','monthRtLog','yearRtLog',
            'tplDone','habEnabled','health','hLog','supps','meds',
            'weights','birthdays','homework','notes','watchlist',
            'eduSchedule','eduSubjects','eduLinks','eduWeekParity','eduBells','eduWeekAnchor',
            'skillTemplates','finLog','finTpl','finPlans','finCapital0',
            'finPurchases','finDebts','finAssets','finAssetHistory',
            'finPieSlices','finPieSum','physDiseases','nid','physParams','mentalParams'
          ];
          keys.forEach(k => {
            if (d[k] !== undefined) { window[k] = d[k]; if (typeof LS !== 'undefined') LS.s(k, d[k]); }
          });
          if (d.morningTime   !== undefined) { window.mTime = d.morningTime;  if (typeof LS !== 'undefined') LS.s('morningTime',  d.morningTime); }
          if (d.eveningTime   !== undefined) { window.eTime = d.eveningTime;  if (typeof LS !== 'undefined') LS.s('eveningTime',  d.eveningTime); }
          if (d.sleepSchedule !== undefined && typeof LS !== 'undefined') LS.s('sleepSchedule', d.sleepSchedule);
          if (d.cycleFirstWeekHeavy !== undefined) { window.cycleFirstWeekHeavy = d.cycleFirstWeekHeavy; LS.s('cycleFirstWeekHeavy', d.cycleFirstWeekHeavy); }
          if (d.cycleOverrides !== undefined) { window.cycleOverrides  = d.cycleOverrides; LS.s('cycleOverrides', d.cycleOverrides); }
          if (d.notifCfg      !== undefined) LS.s('notifCfg',    d.notifCfg);
          if (d.remindersCfg  !== undefined) LS.s('remindersCfg', d.remindersCfg);
          if (d.interests     !== undefined) LS.s('interests',    d.interests);
          if (d.aiProfile     !== undefined) LS.s('aiProfile',    d.aiProfile);
          if (d.finBudget     !== undefined) LS.s('finBudget',    d.finBudget);
          if (d.sleepRem      !== undefined) LS.s('sleepRem',     d.sleepRem);
          if (d.appTheme !== undefined) { window.appTheme = d.appTheme; LS.s('appTheme', d.appTheme); if (typeof setTheme === 'function') setTheme(d.appTheme); }
          if (d.appFont  !== undefined) { window.appFont  = d.appFont;  LS.s('appFont',  d.appFont);  if (typeof setFont  === 'function') setFont(d.appFont); }
          if (d.appLang  !== undefined) { window.appLang  = d.appLang;  LS.s('appLang',  d.appLang);  if (typeof setLang  === 'function') setLang(d.appLang); }
          if (d.autoSaveOn !== undefined) { window.autoSaveOn = d.autoSaveOn; LS.s('autoSaveOn', d.autoSaveOn); }
          if (d.notifyOn   !== undefined) { window.notifyOn   = d.notifyOn;   LS.s('notifyOn',   d.notifyOn); }
          // Патч ключа: Drive хранит 'skillTemplates', модуль читает 'sportTemplates'
          if (d.skillTemplates !== undefined) {
            window.skillTemplates = d.skillTemplates;
            if (typeof LS !== 'undefined') { LS.s('sportTemplates', d.skillTemplates); LS.s('skillTemplates', d.skillTemplates); }
          }
          const savedAt = d._savedAt ? displayDateTime(new Date(d._savedAt)) : 'неизвестно';
          if (typeof flash === 'function') flash('✓ Автосейв загружен (' + savedAt + ')');
                    // let-переменные не меняются через window[k] — присваиваем явно + миграция
          if (d.routine !== undefined) { routine = d.routine; }
          if (d.routineLog !== undefined) { routineLog = d.routineLog; }
          if (d.tplDone !== undefined) { tplDone = d.tplDone; }
          if (d.eduSchedule !== undefined) { eduSchedule = d.eduSchedule; }
          if (d.eduSubjects !== undefined) { eduSubjects = d.eduSubjects; }
          if (d.eduLinks !== undefined) { eduLinks = d.eduLinks; }
          if (d.eduWeekParity !== undefined) { eduWeekParity = d.eduWeekParity; }
          if (d.eduWeekAnchor !== undefined) { eduWeekAnchor = d.eduWeekAnchor; }
          if (d.eduBells !== undefined) { eduBells = d.eduBells; }
          if (d.finPieSlices !== undefined) { finPieSlices = d.finPieSlices; }
          if (d.finPieSum !== undefined) { finPieSum = Math.max(0, Number(d.finPieSum) || 0); }
          if (d.finLog !== undefined) { finLog = d.finLog; }
          if (d.finTpl !== undefined) { finTpl = d.finTpl; }
          if (d.finPlans !== undefined) { finPlans = d.finPlans; }
          if (d.finCapital0 !== undefined) { finCapital0 = d.finCapital0; }
          if (d.finPurchases !== undefined) { finPurchases = d.finPurchases; }
          if (d.finDebts !== undefined) { finDebts = d.finDebts; }
          if (d.finAssets !== undefined) { finAssets = d.finAssets; }
          if (d.finAssetHistory !== undefined) { finAssetHistory = d.finAssetHistory; }
          if (d.finPlans !== undefined && typeof finEnsurePlan === 'function') finEnsurePlan(finCurPlanKey());
          if (typeof migrateRoutine === 'function') migrateRoutine();
if (typeof renderCurrent === 'function') renderCurrent();
        } catch (e) {
          if (typeof flash === 'function') flash('Ошибка загрузки автосейва: ' + e.message);
        }
      }, () => { if (typeof flash === 'function') flash('Сессия Google истекла — войдите снова'); });
    },

    startAutoSave: _startAutoSave,
    stopAutoSave:  _stopAutoSave,
    updateUI:      _updateUI,
    isAuthed:      _isAuthed,

    closeSessionModal() {
      closeModal('gdriveSessionModal');
    }
  };
})();

// ── Обратная совместимость: HTML-кнопки могут звать старые имена ──
function gdriveAuth()               { GDrive.auth(); }
function gdriveSignOut()            { GDrive.signOut(); }
function gdriveSave()               { GDrive.save(); }
function gdriveLoad()               { GDrive.load(); }
function gdriveLoadAutosave()       { GDrive.loadAutosave(); }
function startAutoSave()            { GDrive.startAutoSave(); }
function stopAutoSave()             { GDrive.stopAutoSave(); }
function gdriveIsAuthed()           { return GDrive.isAuthed(); }
function closeGdriveSessionModal()  { GDrive.closeSessionModal(); }

// ── Инициализация ─────────────────────────────────────────────
// DOM уже загружен (boot.js подключает этот файл динамически) — вызываем сразу.
(function _gdriveInit(){
  GDrive.updateUI();
  if (typeof autoSaveOn !== 'undefined' && autoSaveOn && GDrive.isAuthed()) {
    setTimeout(() => GDrive.startAutoSave(), 1000);
  }
})();
