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
      statusEl.textContent = tr('gdrive-connected', '🟢 Подключено');
      if (authBtn) authBtn.textContent = tr('gdrive-refresh', 'ОБНОВИТЬ');
      if (syncRow) syncRow.style.display = 'block';
      _showReconnectBanner(false);
    } else {
      statusEl.textContent = tr('gdrive-disconnected', '🔴 Не подключено');
      if (authBtn) authBtn.textContent = tr('gdrive-signin', 'ВОЙТИ');
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
    if (show) b.classList.add('show'); else b.classList.remove('show');
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
      passwords:      g('passwords', []),
      birthdays:      g('birthdays', []),
      homework:       g('homework', []),
      notes:          g('notes', []),
      watchlist:      g('watchlist', []),
      skillTemplates: g('sportTemplates', []),
      finLog:         g('finLog', {}),
      finTpl:         g('finTpl', {}),
      finPurchases:   g('finPurchases', []),
      finDebts:       g('finDebts', []),
      finPieSlices:   g('finPieSlices', []),
      patches:        g('patches', []),
      physDiseases:   g('physDiseases', []),
      physParams:     g('physParams', []),
      mentalParams:   g('mentalParams', []),
      nid:            g('nid', 971),
      morningTime:    g('morningTime', '08:00'),
      eveningTime:    g('eveningTime', '21:00'),
      sleepSchedule:  g('sleepSchedule', { bed: '23:00', wake: '05:00', naps: [] }),
      cycleStartDate:  g('cycleStartDate', ''),
      cycleStartSlot:  g('cycleStartSlot', 0),
      cycleOverrides:  g('cycleOverrides', {}),
      notifCfg:        g('notifCfg', {}),
      remindersCfg:    g('remindersCfg', {}),
      interests:       g('interests', { cats: [], items: [] }),
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
  async function _saveInternal(silent) {
    if (_saveLock) {
      if (!silent && typeof flash === 'function') flash('Сохранение уже выполняется...');
      return;
    }
    _saveLock = true;
    try {
      const content = _collectData(silent ? 'autosave' : 'manual');
      const date    = new Date().toISOString().slice(0, 10);

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
          // Исторический снапшот (один файл в сутки)
          const histName   = 'logos_backup_' + date + '.json';
          const histExists = await _findFile(histName);
          if (!histExists) await _upload(histName, oldContent, null);
        }
        await _upload(FILE_BACKUP, content, existing ? existing.id : null);
      }

      const saveTime = new Date().toLocaleString('ru');
      localStorage.setItem('gdrive_last_save', saveTime);
      _updateUI();
      if (typeof flash === 'function') {
        flash(silent ? '☁ Автосейв в Drive' : '✓ Сохранено в Google Drive');
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
          const text = await _readFile(file.id);
          const d    = JSON.parse(text);

          const keys = [
            'habits','comp','tasks','goals','freeGoals','annuals',
            'routine','routineLog','tplDone','health','hLog','supps','meds',
            'weights','passwords','birthdays','homework','notes','watchlist',
            'skillTemplates','finLog','finTpl','finPurchases','finDebts',
            'finPieSlices','patches','physDiseases','nid',
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
          if (d.cycleStartDate !== undefined) { window.cycleStartDate = d.cycleStartDate; LS.s('cycleStartDate', d.cycleStartDate); }
          if (d.cycleStartSlot !== undefined) { window.cycleStartSlot = d.cycleStartSlot; LS.s('cycleStartSlot', d.cycleStartSlot); }
          if (d.cycleOverrides  !== undefined) { window.cycleOverrides  = d.cycleOverrides;  LS.s('cycleOverrides',  d.cycleOverrides); }
          if (d.notifCfg       !== undefined) { LS.s('notifCfg',       d.notifCfg); }
          if (d.remindersCfg   !== undefined) { LS.s('remindersCfg',   d.remindersCfg); }
          if (d.interests      !== undefined) { LS.s('interests',      d.interests); }
          if (d.finBudget      !== undefined) { LS.s('finBudget',      d.finBudget); }
          if (d.sleepRem       !== undefined) { LS.s('sleepRem',       d.sleepRem); }
          if (d.appTheme       !== undefined) { window.appTheme = d.appTheme; LS.s('appTheme', d.appTheme); if (typeof setTheme === 'function') setTheme(d.appTheme); }
          if (d.appFont        !== undefined) { window.appFont  = d.appFont;  LS.s('appFont',  d.appFont);  if (typeof setFont  === 'function') setFont(d.appFont); }
          if (d.appLang        !== undefined) { window.appLang  = d.appLang;  LS.s('appLang',  d.appLang);  if (typeof setLang  === 'function') setLang(d.appLang); }
          if (d.autoSaveOn     !== undefined) { window.autoSaveOn = d.autoSaveOn; LS.s('autoSaveOn', d.autoSaveOn); }
          if (d.notifyOn       !== undefined) { window.notifyOn   = d.notifyOn;   LS.s('notifyOn',   d.notifyOn); }

          if (typeof flash === 'function') flash('✓ Данные загружены из Drive');
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
          const text = await _readFile(file.id);
          const d    = JSON.parse(text);
          const keys = [
            'habits','comp','tasks','goals','freeGoals','annuals',
            'routine','routineLog','tplDone','health','hLog','supps','meds',
            'weights','passwords','birthdays','homework','notes','watchlist',
            'skillTemplates','finLog','finTpl','finPurchases','finDebts',
            'finPieSlices','patches','physDiseases','nid','physParams','mentalParams'
          ];
          keys.forEach(k => {
            if (d[k] !== undefined) { window[k] = d[k]; if (typeof LS !== 'undefined') LS.s(k, d[k]); }
          });
          if (d.morningTime   !== undefined) { window.mTime = d.morningTime;  if (typeof LS !== 'undefined') LS.s('morningTime',  d.morningTime); }
          if (d.eveningTime   !== undefined) { window.eTime = d.eveningTime;  if (typeof LS !== 'undefined') LS.s('eveningTime',  d.eveningTime); }
          if (d.sleepSchedule !== undefined && typeof LS !== 'undefined') LS.s('sleepSchedule', d.sleepSchedule);
          if (d.cycleStartDate !== undefined) { window.cycleStartDate = d.cycleStartDate; LS.s('cycleStartDate', d.cycleStartDate); }
          if (d.cycleStartSlot !== undefined) { window.cycleStartSlot = d.cycleStartSlot; LS.s('cycleStartSlot', d.cycleStartSlot); }
          if (d.cycleOverrides !== undefined) { window.cycleOverrides  = d.cycleOverrides; LS.s('cycleOverrides', d.cycleOverrides); }
          if (d.notifCfg      !== undefined) LS.s('notifCfg',    d.notifCfg);
          if (d.remindersCfg  !== undefined) LS.s('remindersCfg', d.remindersCfg);
          if (d.interests     !== undefined) LS.s('interests',    d.interests);
          if (d.finBudget     !== undefined) LS.s('finBudget',    d.finBudget);
          if (d.sleepRem      !== undefined) LS.s('sleepRem',     d.sleepRem);
          if (d.appTheme !== undefined) { window.appTheme = d.appTheme; LS.s('appTheme', d.appTheme); if (typeof setTheme === 'function') setTheme(d.appTheme); }
          if (d.appFont  !== undefined) { window.appFont  = d.appFont;  LS.s('appFont',  d.appFont);  if (typeof setFont  === 'function') setFont(d.appFont); }
          if (d.appLang  !== undefined) { window.appLang  = d.appLang;  LS.s('appLang',  d.appLang);  if (typeof setLang  === 'function') setLang(d.appLang); }
          const savedAt = d._savedAt ? new Date(d._savedAt).toLocaleString('ru') : 'неизвестно';
          if (typeof flash === 'function') flash('✓ Автосейв загружен (' + savedAt + ')');
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
      const m = document.getElementById('gdriveSessionModal');
      if (m) m.classList.remove('show');
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
function gdriveUpdateUI()           { GDrive.updateUI(); }
function gdriveIsAuthed()           { return GDrive.isAuthed(); }
function closeGdriveSessionModal()  { GDrive.closeSessionModal(); }
function gdriveShowReconnectBanner(show) {
  const b = document.getElementById('gdriveSessionModal');
  if (b) { if (show) b.classList.add('show'); else b.classList.remove('show'); }
}

// ── Инициализация ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  GDrive.updateUI();
  if (typeof autoSaveOn !== 'undefined' && autoSaveOn && GDrive.isAuthed()) {
    setTimeout(() => GDrive.startAutoSave(), 1000);
  }
});
