/* ============================================================
   ASCEND — app logic
   ============================================================ */

const STORAGE_KEY = 'ascend_state_v1';

/* ---------- Icons ---------- */
const ICONS = {
  check: '<polyline points="20 6 9 17 4 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  trash: '<path d="M4 7h16"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  flame: '<path d="M12 3c1.2 3.2-2 4.6-2.4 7.4A3.4 3.4 0 0 0 13 14c1.6-.3 2-1.6 2-1.6.8 1 1.2 2.1 1.2 3A4.2 4.2 0 0 1 12 19.6 4.2 4.2 0 0 1 7.8 15.4C7.8 10.8 11 9.4 12 3z"/>',
  sword: '<path d="M12 2v13"/><path d="M8 13h8"/><path d="M12 15v6"/><path d="M10 21h4"/>',
  book: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13z"/>',
  leaf: '<path d="M11 20c-4-.5-7-3.6-7-8 0-5 4-9 9-9 1 4-1 5.6-3 7.4-1.6 1.4-2.4 3-2 5.6"/><path d="M6 18c3-1 5-3 6-6"/>',
  arrow: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>'
};
function icon(name, cls) {
  return `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

/* ---------- Classes & titles ---------- */
const CLASSES = {
  warrior: { name: 'Warrior', color: 'var(--c-body)', icon: 'sword', blurb: 'Strength through discipline',
    titles: [[1,'Recruit'],[5,'Soldier'],[10,'Warrior'],[18,'Knight'],[28,'Champion'],[40,'Warlord']] },
  scholar: { name: 'Scholar', color: 'var(--c-mind)', icon: 'book', blurb: 'Growth through knowledge',
    titles: [[1,'Novice'],[5,'Student'],[10,'Scholar'],[18,'Sage'],[28,'Loremaster'],[40,'Archmind']] },
  ranger: { name: 'Ranger', color: 'var(--c-discipline)', icon: 'arrow', blurb: 'Progress through consistency',
    titles: [[1,'Wanderer'],[5,'Scout'],[10,'Ranger'],[18,'Pathfinder'],[28,'Warden'],[40,'Legend']] },
  monk: { name: 'Monk', color: 'var(--c-spirit)', icon: 'leaf', blurb: 'Balance through restraint',
    titles: [[1,'Initiate'],[5,'Acolyte'],[10,'Monk'],[18,'Ascetic'],[28,'Elder'],[40,'Enlightened']] },
};
function getTitle(className, level) {
  const tiers = CLASSES[className].titles;
  let t = tiers[0][1];
  for (const [min, name] of tiers) if (level >= min) t = name;
  return t;
}
function resolveColor(v) {
  if (!v.startsWith('var(')) return v;
  return getComputedStyle(document.documentElement).getPropertyValue(v.slice(4, -1)).trim();
}

const CATEGORIES = {
  body: { name: 'Body', color: 'var(--c-body)' },
  mind: { name: 'Mind', color: 'var(--c-mind)' },
  discipline: { name: 'Discipline', color: 'var(--c-discipline)' },
  spirit: { name: 'Spirit', color: 'var(--c-spirit)' },
  other: { name: 'Other', color: 'var(--c-other)' },
};
const DEFAULT_XP = { daily: 15, weekly: 60, monthly: 220 };
const FREQ_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

/* ---------- Date / period helpers (all LOCAL time, never UTC) ---------- */
function pad(n) { return String(n).padStart(2, '0'); }
function getDailyKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function getWeekKey(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diffToMonday = (day === 0) ? -6 : 1 - day;
  x.setDate(x.getDate() + diffToMonday);
  return getDailyKey(x);
}
function getMonthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function getPeriodKey(freq, d = new Date()) {
  if (freq === 'daily') return getDailyKey(d);
  if (freq === 'weekly') return getWeekKey(d);
  return getMonthKey(d);
}
function getPreviousPeriodKey(freq, d = new Date()) {
  const x = new Date(d);
  if (freq === 'daily') x.setDate(x.getDate() - 1);
  else if (freq === 'weekly') x.setDate(x.getDate() - 7);
  else x.setMonth(x.getMonth() - 1);
  return getPeriodKey(freq, x);
}

/* ---------- Level math ---------- */
function xpToNext(level) { return 100 + (level - 1) * 25; }
function getLevelInfo(totalXP) {
  let level = 1, xp = totalXP, needed = xpToNext(level);
  while (xp >= needed) { xp -= needed; level++; needed = xpToNext(level); }
  return { level, xpIntoLevel: xp, xpForLevel: needed, progress: xp / needed };
}

/* ---------- Storage ---------- */
let memoryFallback = {};
function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return memoryFallback[key] ?? null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { memoryFallback[key] = value; }
}

function loadState() {
  const raw = storageGet(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function saveState() { storageSet(STORAGE_KEY, JSON.stringify(state)); }

function uid() { return Math.random().toString(36).slice(2, 10); }

function createDefaultState(name, className) {
  return {
    character: { name, class: className, totalXP: 0, createdAt: new Date().toISOString() },
    tasks: [
      { id: uid(), title: 'Under 3 hours screen time', frequency: 'daily', category: 'discipline', xp: 15, lastCompletedPeriodKey: null, streak: 0, bestStreak: 0 },
      { id: uid(), title: 'No masturbation this week', frequency: 'weekly', category: 'discipline', xp: 60, lastCompletedPeriodKey: null, streak: 0, bestStreak: 0 },
      { id: uid(), title: 'Finish 1 book', frequency: 'monthly', category: 'mind', xp: 220, lastCompletedPeriodKey: null, streak: 0, bestStreak: 0 },
    ],
    statCounts: { body: 0, mind: 0, discipline: 0, spirit: 0, other: 0 },
    dailyLog: {},
  };
}

let state = loadState();
let activeView = 'home';
let activeFreqTab = 'daily';

/* ---------- Derived helpers ---------- */
function isTaskDone(task) { return task.lastCompletedPeriodKey === getPeriodKey(task.frequency); }
function getDisplayStreak(task) {
  if (!task.lastCompletedPeriodKey) return 0;
  const current = getPeriodKey(task.frequency);
  if (task.lastCompletedPeriodKey === current) return task.streak;
  if (task.lastCompletedPeriodKey === getPreviousPeriodKey(task.frequency)) return task.streak;
  return 0;
}

/* ---------- Toggle a task's completion ---------- */
function toggleTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const current = getPeriodKey(task.frequency);
  const done = task.lastCompletedPeriodKey === current;

  if (!done) {
    const prevKey = getPreviousPeriodKey(task.frequency);
    const continues = task.lastCompletedPeriodKey === prevKey;
    task._undo = { streak: task.streak, lastCompletedPeriodKey: task.lastCompletedPeriodKey };

    task.streak = continues ? task.streak + 1 : 1;
    task.bestStreak = Math.max(task.bestStreak, task.streak);
    task.lastCompletedPeriodKey = current;

    const levelBefore = getLevelInfo(state.character.totalXP).level;
    state.character.totalXP += task.xp;
    state.statCounts[task.category] = (state.statCounts[task.category] || 0) + 1;
    updateDailyLog();
    const levelAfter = getLevelInfo(state.character.totalXP).level;

    saveState();
    renderAll();
    if (levelAfter > levelBefore) showLevelUp(levelAfter);
    if (navigator.vibrate) navigator.vibrate(levelAfter > levelBefore ? [30, 40, 60] : 15);
  } else {
    if (task._undo) {
      task.streak = task._undo.streak;
      task.lastCompletedPeriodKey = task._undo.lastCompletedPeriodKey;
      delete task._undo;
    } else {
      task.streak = Math.max(0, task.streak - 1);
      task.lastCompletedPeriodKey = null;
    }
    state.character.totalXP = Math.max(0, state.character.totalXP - task.xp);
    state.statCounts[task.category] = Math.max(0, (state.statCounts[task.category] || 0) - 1);
    updateDailyLog();
    saveState();
    renderAll();
  }
}

function updateDailyLog() {
  const key = getDailyKey(new Date());
  const dailies = state.tasks.filter(t => t.frequency === 'daily');
  if (dailies.length === 0) return;
  const done = dailies.filter(t => t.lastCompletedPeriodKey === key).length;
  state.dailyLog[key] = { done, total: dailies.length };
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderAll() {
  if (!state) { renderOnboarding(); return; }
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.documentElement.style.setProperty('--accent', resolveColor(CLASSES[state.character.class].color));
  renderHome();
  renderQuests();
  renderStats();
  renderSettings();
}

/* ---- Onboarding ---- */
function renderOnboarding() {
  document.getElementById('app').classList.add('hidden');
  const el = document.getElementById('onboarding');
  el.classList.remove('hidden');

  let selectedClass = 'warrior';

  el.innerHTML = `
    <div class="onboard-eyebrow">Create your character</div>
    <div class="onboard-title">Who are you<br>becoming?</div>

    <label class="field">
      <span>Name</span>
      <input id="ob-name" type="text" maxlength="24" value="Zaki" placeholder="Your name">
    </label>

    <label class="field" style="margin-bottom:10px;">
      <span>Choose a class</span>
    </label>
    <div class="class-grid" id="ob-class-grid">
      ${Object.entries(CLASSES).map(([key, c]) => `
        <button class="class-card ${key === selectedClass ? 'selected' : ''}" data-class="${key}" style="--card-color:${resolveColorStatic(c.color)}">
          ${icon(c.icon)}
          <span class="class-name">${c.name}</span>
          <span class="class-blurb">${c.blurb}</span>
        </button>
      `).join('')}
    </div>

    <div class="onboard-spacer"></div>
    <button class="btn-primary" id="ob-begin">Begin</button>
  `;

  function resolveColorStatic(v) {
    const map = { 'var(--c-body)': '#e0475a', 'var(--c-mind)': '#5b7cf0', 'var(--c-discipline)': '#e0a23a', 'var(--c-spirit)': '#2fb89c' };
    return map[v] || '#e0a23a';
  }

  el.querySelectorAll('.class-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedClass = card.dataset.class;
      el.querySelectorAll('.class-card').forEach(c => c.classList.toggle('selected', c === card));
    });
  });

  document.getElementById('ob-begin').addEventListener('click', () => {
    const name = document.getElementById('ob-name').value.trim() || 'Adventurer';
    state = createDefaultState(name, selectedClass);
    saveState();
    renderAll();
  });
}

/* ---- Home ---- */
function renderHome() {
  const view = document.getElementById('view-home');
  const { character, tasks } = state;
  const info = getLevelInfo(character.totalXP);
  const title = getTitle(character.class, info.level);
  const dailies = tasks.filter(t => t.frequency === 'daily');
  const bestActiveStreak = Math.max(0, ...dailies.map(getDisplayStreak));

  view.innerHTML = `
    <div class="home-hero">
      <div class="hero-greeting">Welcome back, <b>${escapeHtml(character.name)}</b></div>
      <div class="hex-wrap" id="hex-wrap">
        <svg viewBox="0 0 200 200" class="hex hex-big"><polygon points="100,12 176.2,56 176.2,144 100,188 23.8,144 23.8,56" /></svg>
        <div class="hex-label">
          <div class="hex-level">${info.level}</div>
          <div class="hex-level-tag">LEVEL</div>
        </div>
      </div>
      <div class="hero-title">${title}</div>

      <div class="xp-bar-wrap">
        <div class="xp-bar-numbers"><span>${info.xpIntoLevel} XP</span><span>${info.xpForLevel} XP</span></div>
        <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${Math.round(info.progress * 100)}%"></div></div>
      </div>

      ${bestActiveStreak > 0 ? `
        <div class="streak-pill">${icon('flame')} <b>${bestActiveStreak}</b> day streak</div>
      ` : ''}
    </div>

    <div class="today-block">
      <div class="today-head"><h3>Today</h3><span>${dailies.filter(isTaskDone).length}/${dailies.length}</span></div>
      <div id="home-quest-list">${renderQuestRows(dailies)}</div>
    </div>
  `;
  wireQuestRows(view);
}

/* ---- Quests ---- */
function renderQuests() {
  const view = document.getElementById('view-quests');
  view.innerHTML = `
    <div class="section-title">Quests</div>
    <div class="segmented" id="seg-control">
      <div class="segmented-highlight" id="seg-highlight"></div>
      <button class="seg-btn ${activeFreqTab === 'daily' ? 'active' : ''}" data-freq="daily">Daily</button>
      <button class="seg-btn ${activeFreqTab === 'weekly' ? 'active' : ''}" data-freq="weekly">Weekly</button>
      <button class="seg-btn ${activeFreqTab === 'monthly' ? 'active' : ''}" data-freq="monthly">Monthly</button>
    </div>
    <div class="quest-list" id="quest-list"></div>
  `;
  positionSegHighlight();
  renderQuestListForTab();

  view.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFreqTab = btn.dataset.freq;
      view.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b === btn));
      positionSegHighlight();
      renderQuestListForTab();
    });
  });

  if (!document.getElementById('fab')) {
    const fab = document.createElement('button');
    fab.id = 'fab';
    fab.className = 'fab';
    fab.innerHTML = icon('plus');
    fab.addEventListener('click', () => openQuestModal(null, activeFreqTab));
    document.getElementById('app').appendChild(fab);
  }
  document.getElementById('fab').classList.toggle('hidden', activeView !== 'quests');
}

function positionSegHighlight() {
  const idx = ['daily', 'weekly', 'monthly'].indexOf(activeFreqTab);
  const hl = document.getElementById('seg-highlight');
  if (hl) hl.style.transform = `translateX(${idx * 100}%)`;
}

function renderQuestListForTab() {
  const list = state.tasks.filter(t => t.frequency === activeFreqTab);
  const container = document.getElementById('quest-list');
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">No ${activeFreqTab} quests yet. Tap + to add one.</div>`;
    return;
  }
  container.innerHTML = renderQuestRows(list, true);
  wireQuestRows(container, true);
}

function renderQuestRows(list, editable) {
  return list.map(t => {
    const done = isTaskDone(t);
    const streak = getDisplayStreak(t);
    const cat = CATEGORIES[t.category];
    return `
      <div class="quest-row" data-id="${t.id}">
        <button class="quest-check ${done ? 'done' : ''}" data-action="toggle" data-id="${t.id}" style="--dot-color:${resolveColor(cat.color)}">${icon('check')}</button>
        <div class="quest-body" data-action="${editable ? 'edit' : ''}" data-id="${t.id}">
          <div class="quest-title ${done ? 'done' : ''}">${escapeHtml(t.title)}</div>
          <div class="quest-meta">
            <span class="cat-dot" style="--dot-color:${resolveColor(cat.color)}"></span>
            <span class="cat-label">${cat.name}</span>
            ${streak > 0 ? `<span class="quest-streak">${icon('flame')} ${streak}</span>` : ''}
          </div>
        </div>
        <div class="quest-xp">+${t.xp}</div>
      </div>
    `;
  }).join('');
}

function wireQuestRows(container, editable) {
  container.querySelectorAll('[data-action="toggle"]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); toggleTask(btn.dataset.id); });
  });
  if (editable) {
    container.querySelectorAll('[data-action="edit"]').forEach(el => {
      el.addEventListener('click', () => {
        const task = state.tasks.find(t => t.id === el.dataset.id);
        if (task) openQuestModal(task);
      });
    });
  }
}

/* ---- Quest modal (add / edit) ---- */
let editingTaskId = null;
function openQuestModal(task, presetFreq) {
  editingTaskId = task ? task.id : null;
  document.getElementById('quest-modal-title').textContent = task ? 'Edit quest' : 'New quest';
  document.getElementById('quest-title').value = task ? task.title : '';
  document.getElementById('quest-frequency').value = task ? task.frequency : (presetFreq || 'daily');
  document.getElementById('quest-category').value = task ? task.category : 'discipline';
  document.getElementById('quest-xp').value = task ? task.xp : DEFAULT_XP[presetFreq || 'daily'];
  document.getElementById('quest-delete-btn').style.display = task ? 'block' : 'none';
  document.getElementById('quest-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('quest-title').focus(), 50);
}
function closeQuestModal() { document.getElementById('quest-modal').classList.add('hidden'); }

function saveQuestForm() {
  const title = document.getElementById('quest-title').value.trim();
  if (!title) return;
  const frequency = document.getElementById('quest-frequency').value;
  const category = document.getElementById('quest-category').value;
  const xp = Math.max(1, parseInt(document.getElementById('quest-xp').value, 10) || DEFAULT_XP[frequency]);

  if (editingTaskId) {
    const t = state.tasks.find(t => t.id === editingTaskId);
    Object.assign(t, { title, frequency, category, xp });
  } else {
    state.tasks.push({ id: uid(), title, frequency, category, xp, lastCompletedPeriodKey: null, streak: 0, bestStreak: 0 });
    activeFreqTab = frequency;
  }
  saveState();
  closeQuestModal();
  renderAll();
}

function deleteQuest() {
  if (!editingTaskId) return;
  state.tasks = state.tasks.filter(t => t.id !== editingTaskId);
  saveState();
  closeQuestModal();
  renderAll();
}

/* ---- Stats ---- */
function renderStats() {
  const view = document.getElementById('view-stats');
  const counts = state.statCounts;
  const max = Math.max(1, ...Object.values(counts));
  const longest = Math.max(0, ...state.tasks.map(t => t.bestStreak));
  const cells = buildHeatmapCells();

  view.innerHTML = `
    <div class="section-title">Stats</div>
    ${Object.entries(CATEGORIES).filter(([k]) => k !== 'other').map(([key, cat]) => `
      <div class="stat-bar-row">
        <div class="stat-bar-top"><span>${cat.name}</span><b>${counts[key] || 0}</b></div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${((counts[key] || 0) / max) * 100}%;background:${resolveColor(cat.color)}"></div></div>
      </div>
    `).join('')}

    <div class="heatmap-card">
      <div class="heatmap-head"><h3>Consistency</h3><span>last 10 weeks</span></div>
      <div class="heatmap-grid">
        ${cells.map(c => `<div class="heat-cell" style="${heatCellStyle(c.ratio)}"></div>`).join('')}
      </div>
    </div>

    <div class="longest-streak-row">
      ${icon('flame')}
      <div><div class="num">${longest} days</div><div class="label">Longest streak</div></div>
    </div>
  `;
}

function heatCellStyle(ratio) {
  if (ratio === null || ratio === undefined) return '';
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const alpha = ratio === 0 ? 0.12 : 0.25 + ratio * 0.75;
  return `background:${accent}; opacity:${alpha}`;
}

function buildHeatmapCells() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const currentMonday = new Date(today); currentMonday.setDate(today.getDate() - daysSinceMonday);
  const start = new Date(currentMonday); start.setDate(currentMonday.getDate() - 7 * 9);

  const cells = [];
  for (let i = 0; i < 70; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (d > today) break;
    const key = getDailyKey(d);
    const log = state.dailyLog[key];
    let ratio = null;
    if (log && log.total > 0) ratio = log.done / log.total;
    else if (getDailyKey(d) === getDailyKey(today)) ratio = 0;
    cells.push({ ratio });
  }
  return cells;
}

/* ---- Settings ---- */
function renderSettings() {
  const view = document.getElementById('view-settings');
  const c = state.character;
  view.innerHTML = `
    <div class="section-title">Settings</div>

    <div class="settings-group">
      <label class="field">
        <span>Character name</span>
        <input id="set-name" type="text" maxlength="24" value="${escapeHtml(c.name)}">
      </label>
      <div class="settings-row">
        <span class="s-label">Class</span>
        <span class="s-value">${CLASSES[c.class].name}</span>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Data</div>
      <button class="settings-action" id="export-btn">Export backup (.json)</button>
      <button class="settings-action" id="import-btn">Import backup</button>
      <input type="file" id="import-file" accept="application/json" class="hidden">
      <button class="settings-action danger" id="reset-btn">Reset all data</button>
    </div>

    <div class="settings-footnote">Everything is stored only on this device. Nothing is uploaded anywhere.</div>
  `;

  document.getElementById('set-name').addEventListener('change', (e) => {
    state.character.name = e.target.value.trim() || state.character.name;
    saveState();
    renderHome();
  });

  document.getElementById('export-btn').addEventListener('click', exportBackup);
  document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', importBackup);
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('This deletes your character and all quest history. This cannot be undone. Continue?')) {
      storageSet(STORAGE_KEY, '');
      state = null;
      renderOnboarding();
    }
  });
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ascend-backup-${getDailyKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.character || !Array.isArray(parsed.tasks)) throw new Error('bad format');
      state = parsed;
      saveState();
      renderAll();
      alert('Backup restored.');
    } catch (err) {
      alert('That file could not be read as an Ascend backup.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ---- Level up modal ---- */
function showLevelUp(level) {
  document.getElementById('levelup-number').textContent = level;
  document.getElementById('levelup-title').textContent = getTitle(state.character.class, level);
  const modal = document.getElementById('levelup-modal');
  modal.classList.remove('hidden');
  const badge = modal.querySelector('.hex');
  badge.classList.remove('hex-pulse');
  void badge.offsetWidth;
  badge.classList.add('hex-pulse');
}
function closeLevelUp() { document.getElementById('levelup-modal').classList.add('hidden'); }

/* ---- Nav switching ---- */
function switchView(name) {
  activeView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(`view-${name}`).classList.remove('hidden');
  document.querySelectorAll('.navbtn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  const fab = document.getElementById('fab');
  if (fab) fab.classList.toggle('hidden', name !== 'quests');
  document.getElementById('app').querySelector('.views').scrollTop = 0;
}

/* ---- Misc ---- */
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.navbtn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('quest-modal-close').innerHTML = icon('x');
  document.getElementById('quest-modal-close').addEventListener('click', closeQuestModal);
  document.getElementById('quest-save-btn').addEventListener('click', saveQuestForm);
  document.getElementById('quest-delete-btn').addEventListener('click', deleteQuest);
  document.getElementById('quest-frequency').addEventListener('change', (e) => {
    if (!editingTaskId) document.getElementById('quest-xp').value = DEFAULT_XP[e.target.value];
  });

  document.getElementById('levelup-continue').addEventListener('click', closeLevelUp);

  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
