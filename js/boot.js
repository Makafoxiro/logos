// ═══ MODULE: boot.js ═══
// Загрузчик приложения (классический скрипт).
// Порядок: пароль → LS.authorize → LS.init (расшифровка) → миграция localStorage
// → динамическая загрузка остальных js/*.js (state.js … main.js … gdrive/aicard).
// Функции модулей выполняются ТОЛЬКО после прогрева кеша LS — иначе
// LS.g() в верхнем уровне файлов вернул бы пустые значения по умолчанию.
(function () {
  // Порядок повторяет исходный порядок выполнения в index.html:
  // классические скрипты шли в порядке вставки, а main.js (бывший module)
  // выполнялся последним — после gdrive.js и aicard.js.
  var SCRIPTS = [
    'js/utils.js?v=3',
    'js/state.js?v=3',
    'js/health.js?v=3',
    'js/finance.js?v=3',
    'js/routine.js?v=3',
    'js/goals.js?v=3',
    'js/habits.js?v=3',
    'js/skills.js?v=3',
    'js/week.js?v=3',
    'js/memo.js?v=3',
    'js/notifs.js?v=3',
    'js/today.js?v=3',
    'js/gdrive.js?v=3',
    'js/aicard.js?v=3',
    'js/main.js?v=3'
  ];

  function setHint(t) {
    var h = document.getElementById('splash-hint');
    if (h) h.textContent = t;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Не удалось загрузить ' + src)); };
      document.body.appendChild(s);
    });
  }

  // ── Форма пароля (вместо нативных prompt/alert) ─────────────────────
  // opts: { title, note, confirm, okLabel }
  // extraValidate(pw) → async, возвращает строку ошибки или null/undefined.
  // Резолвится паролем при успехе или null при отмене (кнопка «отмена»).
  function askPassword(opts, extraValidate) {
    return new Promise(function (resolve) {
      var form = document.getElementById('pw-form');
      var title = document.getElementById('pw-title');
      var note = document.getElementById('pw-note');
      var inp = document.getElementById('pw-inp');
      var inp2 = document.getElementById('pw-inp2');
      var err = document.getElementById('pw-err');
      var ok = document.getElementById('pw-ok');
      var cancel = document.getElementById('pw-cancel');
      var eye = document.getElementById('pw-eye');

      title.textContent = opts.title || '';
      note.textContent = opts.note || '';
      ok.textContent = opts.okLabel || 'ВОЙТИ';
      inp2.style.display = opts.confirm ? '' : 'none';
      inp.value = ''; inp2.value = '';
      hideErr();
      form.classList.add('show');
      setHint('');
      inp.focus();

      function hideErr() { err.classList.remove('show'); err.textContent = ''; }
      function showErr(m) { err.textContent = m; err.classList.add('show'); }

      function close(result) {
        form.classList.remove('show');
        document.removeEventListener('keydown', onKey, true);
        resolve(result);
      }

      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(null); }
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      }
      document.addEventListener('keydown', onKey, true);

      async function submit() {
        hideErr();
        var pw = inp.value;
        if (!pw) { showErr('пароль не может быть пустым'); inp.focus(); return; }
        if (opts.confirm && inp2.value !== pw) { showErr('пароли не совпали'); inp2.focus(); return; }
        if (extraValidate) {
          ok.disabled = true;
          try {
            var msg = await extraValidate(pw);
            if (msg) { showErr(msg); inp.focus(); return; }
          } catch (e) {
            console.error('[LOGOS] password validate error:', e);
            showErr('ошибка: ' + (e && e.message ? e.message : e));
            return;
          } finally {
            ok.disabled = false;
          }
        }
        close(pw);
      }

      ok.onclick = submit;
      cancel.onclick = function () { close(null); };
      eye.onclick = function () {
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        eye.textContent = show ? 'скрыть' : 'показать';
        inp.focus();
      };
      inp.oninput = hideErr;
      inp2.oninput = hideErr;
    });
  }

  // Пароль: первый запуск — создать, далее — ввести и проверить расшифровкой.
  // Возвращает: 'empty' | 'loaded' (кеш готов) или false (отмена пользователем).
  async function unlock() {
    var hasData = (await idbGet('appData')) != null;
    if (!hasData) {
      var pw = await askPassword({
        title: 'логос: данные будут зашифрованы — придумайте пароль',
        note: 'пароль не сохраняется и не передаётся на сервер. забыли пароль — данные не восстановить. на других устройствах вводите пароль заново.',
        confirm: true,
        okLabel: 'СОЗДАТЬ'
      });
      if (pw == null) return false;
      LS.authorize(pw);
      return await LS.init();
    }
    var status = null;
    var pw = await askPassword({
      title: 'логос: введите пароль для расшифровки данных',
      note: 'данные хранятся зашифрованными на этом устройстве',
      okLabel: 'ВОЙТИ'
    }, async function (p) {
      LS.authorize(p);
      try {
        status = await LS.init();
        return null;
      } catch (e) {
        if (e && e.message === 'BAD_PASSWORD') return 'неверный пароль';
        throw e;
      }
    });
    if (pw == null) { LS.logout(); return false; }
    return status;
  }

  (async function boot() {
    try {
      setHint('ввод пароля…');
      var status = await unlock();
      if (status === false) { setHint('введите пароль и обновите страницу'); return; }

      // Перенос старых данных из localStorage → зашифрованный IndexedDB.
      // Только при первом запуске ('empty') — иначе свежие IDB-данные затёрлись бы.
      if (status === 'empty') {
        setHint('перенос данных…');
        try {
          var n = await LS.migrateAndFlush();
          if (n) console.log('[LOGOS] перенесено ключей из localStorage в IndexedDB:', n);
        } catch (e) {
          console.error('[LOGOS] ошибка миграции localStorage:', e);
        }
      }

      // DOM должен быть полностью распарсен: boot.js подключается в середине
      // <body>, а ниже лежат модалки, которые query getElementById в main.js.
      if (document.readyState === 'loading') {
        await new Promise(function (res) {
          document.addEventListener('DOMContentLoaded', res, { once: true });
        });
      }

      for (var i = 0; i < SCRIPTS.length; i++) {
        setHint('загрузка ' + SCRIPTS[i].split('/').pop() + '…');
        await loadScript(SCRIPTS[i]);
      }
      // Дальше main.js сам выполняет _init() и прячет splash.
    } catch (e) {
      console.error('[LOGOS boot error]', e);
      setHint('ошибка запуска: ' + (e && e.message ? e.message : e));
    }
  })();
})();