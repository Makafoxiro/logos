// ═══ MODULE: interests.js ═══
// ══ ИНТЕРЕСЫ ═══════════════════════════════════════════

(function injectIntStyles() {
  if (document.getElementById('int-note-styles')) return;
  const s = document.createElement('style');
  s.id = 'int-note-styles';
  s.textContent = `
    .int-card {
      position: relative;
    }
    .int-item-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .int-note-toggle {
      position: absolute;
      top: 8px;
      right: 10px;
      cursor: pointer;
      user-select: none;
      font-size: 20px;
      line-height: 1;
      opacity: 0.35;
      transition: opacity 0.15s, transform 0.2s;
    }
    .int-note-toggle:hover { opacity: 0.7; }
    .int-note-toggle.open { transform: rotate(180deg); opacity: 0.6; }
    .int-item-note--collapsed { display: none; }
    .int-item-note--open { display: block; }
  `;
  document.head.appendChild(s);
})();

let intActiveCat = null; // id активной категории

function getIntData() {
  return LS.g('interests', { cats: [], items: [] });
}
function saveIntData(d) {
  LS.s('interests', d);
}

function renderInterests() {
  const d = getIntData();
  const bar = document.getElementById('intTabsBar');
  const content = document.getElementById('intContent');
  if (!bar || !content) return;

  // если нет категорий
  if (!d.cats.length) {
    bar.innerHTML = '';
    content.innerHTML = '<div class="int-empty">нет категорий — создай первую</div>';
    intActiveCat = null;
    return;
  }

  // если активная категория удалена — сбрасываем
  if (!d.cats.find(c => c.id === intActiveCat)) {
    intActiveCat = d.cats[0].id;
  }

  // Таб-бар
  bar.innerHTML = d.cats.map(c => {
    const cnt = d.items.filter(i => i.catId === c.id).length;
    return `
    <div class="int-tab${c.id === intActiveCat ? ' on' : ''}" onclick="switchIntCat('${c.id}')">
      ${c.emoji ? `<span>${c.emoji}</span>` : ''}
      <span>${c.name}</span>
      ${cnt > 0 ? `<span class="int-tab-cnt">${cnt}</span>` : ''}
      <span class="int-tab-edit" onclick="event.stopPropagation();openEditIntCat('${c.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
    </div>
  `}).join('');

  // Контент активной категории
  const cat = d.cats.find(c => c.id === intActiveCat);
  if (!cat) { content.innerHTML = ''; return; }

  const items = d.items.filter(i => i.catId === intActiveCat);

  const totalItems = items.length;
  content.innerHTML = `
    <div class="int-cat-header">
      <div class="int-cat-title">${cat.emoji ? cat.emoji + ' ' : ''}${cat.name}</div>
      ${totalItems > 0 ? `<div class="int-cat-count">${totalItems} ${totalItems === 1 ? 'пункт' : totalItems < 5 ? 'пункта' : 'пунктов'}</div>` : ''}
    </div>
    ${items.length === 0
      ? '<div class="int-empty">нет пунктов — добавь первый</div>'
      : `<div class="int-grid">${items.map((item, idx) => `
          <div class="int-card">
            <div class="int-card-num" onclick="openEditIntItem('${item.id}')">${idx + 1}</div>
            <div class="int-card-body">
              <div class="int-item-name" onclick="openEditIntItem('${item.id}')">${escHtml(item.name)}</div>
              ${item.note ? `<div class="int-item-note int-item-note--collapsed">${escHtml(item.note)}</div>` : ''}
            </div>
            ${item.note ? `<span class="int-note-toggle" onclick="toggleIntNote(this)" title="показать описание">▾</span>` : ''}
          </div>
        `).join('')}</div>`
    }
    <button class="add-btn" style="width:100%;margin-top:8px" onclick="openAddIntItem('${cat.id}')">+ добавить пункт</button>
  `;
}

function switchIntCat(id) {
  intActiveCat = id;
  renderInterests();
}

// ─ Модалка: добавить категорию
function openAddInterestCat() {
  document.getElementById('intCatModalTitle').textContent = 'новая категория';
  document.getElementById('intCatEditId').value = '';const icb2=document.getElementById('intCatDelBtn');if(icb2)icb2.style.display='none';
  document.getElementById('intCatName').value = '';
  document.getElementById('intCatEmoji').value = '';

  openModal('intCatModal');
  setTimeout(() => document.getElementById('intCatName').focus(), 80);
}

function openEditIntCat(id) {
  const d = getIntData();
  const cat = d.cats.find(c => c.id === id);
  if (!cat) return;
  document.getElementById('intCatModalTitle').textContent = 'редактировать категорию';
  document.getElementById('intCatEditId').value = id;const icb=document.getElementById('intCatDelBtn');if(icb)icb.style.display='';
  document.getElementById('intCatName').value = cat.name;
  document.getElementById('intCatEmoji').value = cat.emoji || '';

  openModal('intCatModal');
  setTimeout(() => document.getElementById('intCatName').focus(), 80);
}


function delIntCat(id){
  const d=getIntData();
  d.cats=d.cats.filter(c=>c.id!==id);
  d.items=d.items.filter(i=>i.catId!==id);
  saveIntData(d);renderInterests();closeIntCatModal();
}
function delIntItem(id){
  const d=getIntData();
  d.items=d.items.filter(i=>i.id!==id);
  saveIntData(d);renderInterests();closeIntItemModal();
}
function closeIntCatModal() {
  closeModal('intCatModal');
}

function confirmIntCat() {
  const name = document.getElementById('intCatName').value.trim();
  if (!name) return;
  const emoji = document.getElementById('intCatEmoji').value.trim();
  const editId = document.getElementById('intCatEditId').value;
  const d = getIntData();
  if (editId) {
    const cat = d.cats.find(c => c.id === editId);
    if (cat) { cat.name = name; cat.emoji = emoji; }
  } else {
    const id = 'ic' + Date.now();
    d.cats.push({ id, name, emoji });
    intActiveCat = id;
  }
  saveIntData(d);
  closeIntCatModal();
  renderInterests();
}




// ─ Модалка: добавить пункт
function openAddIntItem(catId) {
  document.getElementById('intItemModalTitle').textContent = 'новый пункт';
  document.getElementById('intItemEditId').value = '';const iib2=document.getElementById('intItemDelBtn');if(iib2)iib2.style.display='none';
  document.getElementById('intItemCatId').value = catId;
  document.getElementById('intItemName').value = '';
  document.getElementById('intItemNote').value = '';

  openModal('intItemModal');
  setTimeout(() => document.getElementById('intItemName').focus(), 80);
}

function openEditIntItem(id) {
  const d = getIntData();
  const item = d.items.find(i => i.id === id);
  if (!item) return;
  document.getElementById('intItemModalTitle').textContent = 'редактировать пункт';
  document.getElementById('intItemEditId').value = id;const iib=document.getElementById('intItemDelBtn');if(iib)iib.style.display='';
  document.getElementById('intItemCatId').value = item.catId;
  document.getElementById('intItemName').value = item.name;
  document.getElementById('intItemNote').value = item.note || '';

  openModal('intItemModal');
  setTimeout(() => document.getElementById('intItemName').focus(), 80);
}

function closeIntItemModal() {
  closeModal('intItemModal');
}

function toggleIntNote(btn) {
  const note = btn.closest('.int-card').querySelector('.int-item-note');
  if (!note) return;
  const isOpen = note.classList.toggle('int-item-note--open');
  note.classList.toggle('int-item-note--collapsed', !isOpen);
  btn.classList.toggle('open', isOpen);
  btn.title = isOpen ? 'скрыть описание' : 'показать описание';
}

function confirmIntItem() {
  const name = document.getElementById('intItemName').value.trim();
  if (!name) return;
  const note = document.getElementById('intItemNote').value.trim();
  const editId = document.getElementById('intItemEditId').value;
  const catId = document.getElementById('intItemCatId').value;
  const d = getIntData();
  if (editId) {
    const item = d.items.find(i => i.id === editId);
    if (item) { item.name = name; item.note = note; }
  } else {
    d.items.push({ id: 'ii' + Date.now(), catId, name, note });
  }
  saveIntData(d);
  closeIntItemModal();
  renderInterests();
}


