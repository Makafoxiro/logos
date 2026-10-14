// ═══ MODULE: storage.js ═══
// Хранилище: IndexedDB + AES-256-GCM шифрование (idb.js + encrypt.js).
// КЛАССИЧЕСКИЙ скрипт — определяет глобальный объект LS (без import/export).
// LS.g(key, fallback) / LS.s(key, value) — синхронные (in-memory кеш).
// Все данные хранятся в одном зашифрованном блобе 'appData' в IndexedDB.
// Пароль вводится пользователем при старте (см. boot.js), не хранится.

const LS = (function () {
  const _cache = {};
  let _masterPassword = null;
  let _ready = false;      // данные расшифрованы и загружены в кеш
  let _saveTimer = null;

  // ── Геттер/сеттер: СИНХРОННЫЕ (работают из кеша) ──
  function g(key, def) {
    return (key in _cache) ? _cache[key] : def;
  }
  function s(key, value) {
    _cache[key] = value;
    // Зеркала для anti-flash скрипта в <head> (он читает localStorage напрямую)
    if (key === 'appTheme' || key === 'appFont') {
      try { localStorage.setItem(key, String(value)); } catch (e) {}
    }
    _scheduleSave();
  }
  function del(key) {
    delete _cache[key];
    _scheduleSave();
  }

  // ── Авторизация / инициализация ──
  function authorize(password) { _masterPassword = password; }
  function isAuthorized() { return _masterPassword != null; }
  function logout() { _masterPassword = null; _ready = false; }

  // Загрузить и расшифровать данные из IndexedDB в кеш.
  // Возвращает: 'loaded' — данные расшифрованы; 'empty' — хранилище пусто (первый запуск).
  // Бросает Error('BAD_PASSWORD') при неверном пароле (AES-GCM auth не проходит).
  async function init() {
    if (!_masterPassword) throw new Error('Not authorized');
    const encrypted = await idbGet('appData');
    if (!encrypted) { _ready = true; return 'empty'; }
    let json;
    try {
      json = await decryptData(encrypted, _masterPassword);
    } catch (e) {
      throw new Error('BAD_PASSWORD');
    }
    const data = JSON.parse(json);
    Object.keys(_cache).forEach(k => delete _cache[k]);
    Object.assign(_cache, data);
    _ready = true;
    return 'loaded';
  }

  // ── Фоновая запись кеша в IndexedDB (debounced) ──
  function _scheduleSave() {
    if (!_ready || !_masterPassword) return;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_flush, 300);
  }

  async function _flush() {
    if (!_masterPassword || !_ready) return;
    try {
      const json = JSON.stringify(_cache);
      const encrypted = await encryptData(json, _masterPassword);
      await idbSet('appData', encrypted);
    } catch (e) {
      console.error('[LOGOS] storage._flush failed:', e);
    }
  }

  // Принудительная запись (для pagehide / visibilitychange / перед выгрузкой)
  async function flush() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    await _flush();
  }

  // ── Миграция старых данных из localStorage → зашифрованный кеш ──
  // Возвращает количество перенесённых ключей. Вызывать только когда init()
  // вернул 'empty' (иначе свежие IDB-данныы затёрлись бы устаревшими).
  // В localStorage остаются: gdrive_* (токены OAuth) и зеркала appTheme/appFont
  // (их читает anti-flash скрипт в <head> напрямую, до расшифровки).
  async function migrateAndFlush() {
    const keep = k => k.indexOf('gdrive_') === 0 || k === 'appTheme' || k === 'appFont';
    const migrated = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || keep(k)) continue;
      const raw = localStorage.getItem(k);
      if (raw == null) continue;
      try { _cache[k] = JSON.parse(raw); migrated.push(k); }
      catch (e) { /* не-JSON значение — пропускаем */ }
    }
    // Зеркала темы/шрифта: в кеш — как значение, в localStorage — сырой строкой
    ['appTheme', 'appFont'].forEach(k => {
      const raw = localStorage.getItem(k);
      if (raw == null) return;
      let v = raw;
      try { v = JSON.parse(raw); } catch (e) { /* уже сырое значение */ }
      _cache[k] = v;
      try { localStorage.setItem(k, String(v)); } catch (e) {}
    });
    if (migrated.length) {
      await flush(); // сначала пишем зашифрованную копию…
      migrated.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); // …потом удаляем расшифровку
    }
    return migrated.length;
  }

  // Полный сброс: кеш + IndexedDB + localStorage («Сбросить всё»)
  async function reset() {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
    Object.keys(_cache).forEach(k => delete _cache[k]);
    _ready = false;
    _masterPassword = null;
    try { await idbDelete('appData'); } catch (e) {}
    try { localStorage.clear(); } catch (e) {}
  }

  // Фиксация при уходе со страницы (best-effort: дебаунс обычно успевает сам)
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', function () { flush(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  return { g, s, del, init, flush, authorize, isAuthorized, logout, migrateAndFlush, reset };
})();

