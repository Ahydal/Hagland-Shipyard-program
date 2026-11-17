import * as db from './db.js';

const APP_VERSION = '1.0.0';

/* ------------------------------------------------------------------ */
/* Konstanter                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { id: 'observasjon', label: 'Observasjon', color: '#2563eb' },
  { id: 'avvik', label: 'Avvik', color: '#dc2626' },
  { id: 'inspeksjon', label: 'Inspeksjon / test', color: '#16a34a' },
  { id: 'fremdrift', label: 'Fremdrift', color: '#0d9488' },
  { id: 'mote', label: 'Møte', color: '#7c3aed' },
  { id: 'hms', label: 'HMS', color: '#ea580c' },
  { id: 'annet', label: 'Annet', color: '#64748b' },
];
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

const DEFAULT_AREAS = [
  'Maskinrom', 'Styrehus / bro', 'Lasterom', 'Hoveddekk', 'Akterskip', 'Forskip',
  'Boligdel', 'Tanker', 'Skrog utvendig', 'Propell / ror', 'Elektro / tavlerom', 'Verksted',
];

const DEFAULT_SETTINGS = {
  inspector: '',
  company: '',
  ships: [
    { id: 'skip1', name: 'Nybygg 1', hull: '', yard: '' },
    { id: 'skip2', name: 'Nybygg 2', hull: '', yard: '' },
  ],
  activeShip: 'skip1',
  stampPhotos: false,
};

const DRAFT_KEY = 'tilsyn-draft';

const ICON_PATHS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  check: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  printer: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  ship: '<path d="M2 17l2 4h16l2-4H2z"/><path d="M6 17V9h8l3 8"/><path d="M9 9V5h4v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
};
const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

const NAV = [
  { id: 'day', label: 'Dagbok', icon: 'book' },
  { id: 'followup', label: 'Oppfølging', icon: 'check' },
  { id: 'photos', label: 'Bilder', icon: 'image' },
  { id: 'search', label: 'Søk', icon: 'search' },
  { id: 'report', label: 'Rapport', icon: 'file' },
];

/* ------------------------------------------------------------------ */
/* Hjelpefunksjoner                                                    */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

const pad2 = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const today = () => toISODate(new Date());
const hhmm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const parseISODate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISODate(s); d.setDate(d.getDate() + n); return toISODate(d); };
const fmtLong = (s) => parseISODate(s).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort = (s) => parseISODate(s).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtNum = (s) => parseISODate(s).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const byDateTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

const safeFile = (s) => String(s).replace(/[^\wæøåÆØÅ.-]+/g, '_');

/* ------------------------------------------------------------------ */
/* Tilstand                                                            */
/* ------------------------------------------------------------------ */

const state = {
  view: 'day',
  date: today(),
  settings: null,
  search: { q: '', cat: '' },
  followShowClosed: false,
  report: { from: today(), to: today(), photos: true, cats: CATEGORIES.map((c) => c.id) },
  draft: null,
  lightbox: null,
  installPrompt: null,
};

const ship = () => state.settings.ships.find((s) => s.id === state.settings.activeShip) || state.settings.ships[0];

async function loadSettings() {
  const rec = await db.get('meta', 'settings');
  state.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(rec?.value || {}) };
}
const saveSettings = () => db.put('meta', { key: 'settings', value: state.settings });

const dayKey = (shipId, date) => `day:${shipId}:${date}`;

/* ------------------------------------------------------------------ */
/* Bilder                                                              */
/* ------------------------------------------------------------------ */

const thumbUrls = new Map();
async function thumbUrl(id) {
  if (thumbUrls.has(id)) return thumbUrls.get(id);
  const p = await db.get('photos', id);
  if (!p) return '';
  const u = URL.createObjectURL(p.thumb || p.blob);
  thumbUrls.set(id, u);
  return u;
}
function forgetThumb(id) {
  const u = thumbUrls.get(id);
  if (u) { URL.revokeObjectURL(u); thumbUrls.delete(id); }
}
function hydrateThumbs(root) {
  $$('img[data-photo]:not([src])', root).forEach((img) => {
    thumbUrl(img.dataset.photo).then((u) => { if (u) img.src = u; });
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kunne ikke lese bildet')); };
    img.src = url;
  });
}

function drawScaled(img, max, quality, stamp) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  if (stamp) {
    const fs = Math.max(14, Math.round(w / 48));
    const pad = Math.round(fs * 0.5);
    ctx.font = `600 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
    const tw = ctx.measureText(stamp).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, h - fs - pad * 2, tw + pad * 2, fs + pad * 2);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(stamp, pad, h - fs - pad);
  }
  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', quality));
}

async function processImage(file, stamp) {
  const { img, url } = await loadImage(file);
  try {
    const blob = await drawScaled(img, 2048, 0.85, stamp);
    const thumb = await drawScaled(img, 420, 0.72, null);
    return { blob, thumb };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ------------------------------------------------------------------ */
/* Rammeverk: navigasjon og toppfelt                                   */
/* ------------------------------------------------------------------ */

function renderNav() {
  $('#nav').innerHTML = `
    <div class="brand">
      <div class="brand-mark">${icon('ship')}</div>
      <div><div class="brand-name">Tilsynsdagbok</div><div class="brand-sub">Byggetilsyn nybygg</div></div>
    </div>
    <div class="nav-items">
      ${NAV.map((n) => `
        <button class="nav-item ${state.view === n.id ? 'active' : ''}" data-action="nav" data-view="${n.id}" aria-label="${n.label}">
          ${icon(n.icon)}<span>${n.label}</span>${n.id === 'followup' ? '<b class="nav-badge" id="followBadge" hidden></b>' : ''}
        </button>`).join('')}
      <button class="nav-item nav-desktop-only ${state.view === 'settings' ? 'active' : ''}" data-action="nav" data-view="settings">
        ${icon('gear')}<span>Innstillinger</span>
      </button>
    </div>
    ${state.settings.inspector ? `<div class="nav-user">${icon('user')} ${esc(state.settings.inspector)}</div>` : ''}`;
}

function renderTopbar() {
  const ships = state.settings.ships;
  const sel = ships.length <= 3
    ? `<div class="segmented" role="tablist">${ships.map((s) => `
        <button role="tab" class="${s.id === ship().id ? 'on' : ''}" data-action="switch-ship" data-ship="${s.id}">
          ${esc(s.name)}${s.hull ? `<small>${esc(s.hull)}</small>` : ''}
        </button>`).join('')}</div>`
    : `<select class="ship-select" data-change="ship-select">${ships.map((s) =>
        `<option value="${s.id}" ${s.id === ship().id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
  $('#topbar').innerHTML = `
    <div class="topbar-brand">${icon('ship')}<span>Tilsynsdagbok</span></div>
    ${sel}
    <button class="icon-btn topbar-settings ${state.view === 'settings' ? 'active' : ''}" data-action="nav" data-view="settings" aria-label="Innstillinger">${icon('gear')}</button>`;
}

async function updateFollowBadge() {
  const b = $('#followBadge');
  if (!b) return;
  const all = await db.getAllBy('entries', 'shipId', ship().id);
  const n = all.filter((e) => e.followUp && e.status !== 'closed').length;
  b.hidden = n === 0;
  b.textContent = n;
}

let renderToken = 0;
async function render() {
  const token = ++renderToken;
  renderNav();
  renderTopbar();
  const html = await VIEWS[state.view]();
  if (token !== renderToken) return;
  const main = $('#main');
  main.innerHTML = html;
  hydrateThumbs(main);
  updateFollowBadge();
  if (state.view === 'search') runSearch();
  if (state.view === 'report') renderReport();
}

/* ------------------------------------------------------------------ */
/* Visninger                                                           */
/* ------------------------------------------------------------------ */

function statusPill(e) {
  if (!e.followUp) return '';
  if (e.status === 'closed') return '<span class="pill closed">Lukket</span>';
  const overdue = e.dueDate && e.dueDate < today();
  return `<span class="pill ${overdue ? 'overdue' : 'open'}">${overdue ? 'Forfalt' : 'Åpen'}${e.dueDate ? ` · frist ${fmtShort(e.dueDate)}` : ''}</span>`;
}

function entryCard(e, { showDate = false, actions = false } = {}) {
  const c = catById(e.category);
  const ids = e.photoIds || [];
  return `
  <article class="entry" data-action="edit" data-id="${e.id}" style="--c:${c.color}" tabindex="0">
    <div class="entry-top">
      <span class="badge">${c.label}</span>
      ${statusPill(e)}
      <span class="spacer"></span>
      <time>${showDate ? `${fmtShort(e.date)} · ` : ''}${esc(e.time || '')}</time>
    </div>
    ${e.title ? `<h3>${esc(e.title)}</h3>` : ''}
    ${e.text ? `<p class="entry-text">${esc(e.text)}</p>` : ''}
    ${(e.location || e.reference || e.responsible) ? `<div class="meta">
      ${e.location ? `<span>${icon('pin')}${esc(e.location)}</span>` : ''}
      ${e.reference ? `<span>Ref: ${esc(e.reference)}</span>` : ''}
      ${e.followUp && e.responsible ? `<span>${icon('user')}${esc(e.responsible)}</span>` : ''}
    </div>` : ''}
    ${ids.length ? `<div class="thumbs">${ids.slice(0, 5).map((id, i) =>
      `<img data-photo="${id}" data-action="view-photo" data-entry="${e.id}" data-index="${i}" alt="Bilde ${i + 1}" loading="lazy">`).join('')}
      ${ids.length > 5 ? `<span class="more">+${ids.length - 5}</span>` : ''}</div>` : ''}
    ${actions ? `<div class="entry-actions">
      ${e.status === 'closed'
        ? `<button class="btn small" data-action="set-status" data-id="${e.id}" data-status="open">Gjenåpne</button>`
        : `<button class="btn small success" data-action="set-status" data-id="${e.id}" data-status="closed">${icon('check')} Marker lukket</button>`}
    </div>` : ''}
  </article>`;
}

const VIEWS = {
  async day() {
    const s = ship();
    const entries = (await db.getAllBy('entries', 'ship_date', [s.id, state.date])).sort(byDateTime);
    const dayRec = await db.get('meta', dayKey(s.id, state.date));
    const isToday = state.date === today();
    const counts = CATEGORIES.map((c) => ({ c, n: entries.filter((e) => e.category === c.id).length })).filter((x) => x.n);
    return `
    <section class="view">
      <div class="daybar">
        <button class="icon-btn" data-action="day-step" data-step="-1" aria-label="Forrige dag">${icon('left')}</button>
        <label class="daypick">
          <span class="daypick-label">${isToday ? 'I dag' : cap(parseISODate(state.date).toLocaleDateString('nb-NO', { weekday: 'long' }))}</span>
          <span class="daypick-date">${cap(fmtLong(state.date))}</span>
          <input type="date" value="${state.date}" data-change="pick-date" aria-label="Velg dato">
        </label>
        <button class="icon-btn" data-action="day-step" data-step="1" aria-label="Neste dag">${icon('right')}</button>
        ${isToday ? '' : '<button class="btn small ghost" data-action="goto-today">Til i dag</button>'}
      </div>

      <div class="quick">
        <button class="btn primary big" data-action="quick-photo">${icon('camera')} Ta bilde</button>
        <button class="btn big" data-action="new-entry">${icon('plus')} Nytt notat</button>
        <button class="btn big danger-outline" data-action="new-entry" data-cat="avvik">${icon('plus')} Avvik</button>
      </div>

      <details class="daysum" ${dayRec?.summary ? 'open' : ''}>
        <summary>Dagens oppsummering <span class="muted">– vær, bemanning, hovedaktiviteter</span></summary>
        <textarea rows="3" data-input="day-summary" placeholder="F.eks. Vær: 6 °C, regn. Verftet jobber med utrustning i maskinrom. Møte med prosjektleder kl. 10.">${esc(dayRec?.summary || '')}</textarea>
      </details>

      ${counts.length ? `<div class="counts">${counts.map(({ c, n }) => `<span class="count" style="--c:${c.color}">${c.label} <b>${n}</b></span>`).join('')}</div>` : ''}

      <div class="list">
        ${entries.length ? entries.map((e) => entryCard(e)).join('') : `
          <div class="empty">
            ${icon('book', 'empty-ico')}
            <p><b>Ingen registreringer ${isToday ? 'i dag' : 'denne dagen'}.</b></p>
            <p class="muted">Trykk «Ta bilde» for å dokumentere noe raskt, eller «Nytt notat» for å skrive.</p>
          </div>`}
      </div>
    </section>
    <button class="fab" data-action="quick-photo" aria-label="Ta bilde">${icon('camera')}</button>`;
  },

  async followup() {
    const all = await db.getAllBy('entries', 'shipId', ship().id);
    const items = all.filter((e) => e.followUp);
    const t = today();
    const open = items.filter((e) => e.status !== 'closed')
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || byDateTime(a, b));
    const overdue = open.filter((e) => e.dueDate && e.dueDate < t);
    const notOverdue = open.filter((e) => !(e.dueDate && e.dueDate < t));
    const closed = items.filter((e) => e.status === 'closed').sort((a, b) => byDateTime(b, a));
    const section = (title, list, cls = '') => list.length ? `
      <h2 class="section-title ${cls}">${title} <span class="muted">(${list.length})</span></h2>
      <div class="list">${list.map((e) => entryCard(e, { showDate: true, actions: true })).join('')}</div>` : '';
    return `
    <section class="view">
      <div class="view-head">
        <h1>Oppfølgingspunkter</h1>
        <label class="check"><input type="checkbox" data-change="show-closed" ${state.followShowClosed ? 'checked' : ''}> Vis lukkede</label>
      </div>
      <p class="muted lead">Registreringer merket «Krever oppfølging», f.eks. avvik som verftet skal utbedre.</p>
      ${open.length === 0 && !state.followShowClosed ? `<div class="empty">${icon('check', 'empty-ico')}<p><b>Ingen åpne punkter.</b></p>
        <p class="muted">Huk av «Krever oppfølging» på en registrering for at den skal dukke opp her.</p></div>` : ''}
      ${section('Forfalt', overdue, 'danger')}
      ${section('Åpne', notOverdue)}
      ${state.followShowClosed ? section('Lukket', closed) : ''}
    </section>`;
  },

  async photos() {
    const photos = (await db.getAllBy('photos', 'shipId', ship().id));
    const entries = new Map((await db.getAllBy('entries', 'shipId', ship().id)).map((e) => [e.id, e]));
    const valid = photos.filter((p) => entries.has(p.entryId));
    valid.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));
    state.photoOrder = valid.map((p) => p.id);
    const groups = new Map();
    valid.forEach((p, i) => {
      if (!groups.has(p.date)) groups.set(p.date, []);
      groups.get(p.date).push({ p, i });
    });
    return `
    <section class="view">
      <div class="view-head"><h1>Bilder</h1><span class="muted">${valid.length} bilder</span></div>
      ${valid.length === 0 ? `<div class="empty">${icon('image', 'empty-ico')}<p><b>Ingen bilder ennå.</b></p></div>` : ''}
      ${[...groups.entries()].map(([date, list]) => `
        <h2 class="section-title"><a href="#" data-action="goto-date" data-date="${date}">${cap(fmtLong(date))}</a></h2>
        <div class="gallery">${list.map(({ p, i }) => {
          const e = entries.get(p.entryId);
          return `<figure data-action="view-photo" data-gallery="1" data-index="${i}" style="--c:${catById(e.category).color}">
            <img data-photo="${p.id}" alt="" loading="lazy">
            <figcaption>${esc(e.title || e.text || catById(e.category).label)}</figcaption>
          </figure>`;
        }).join('')}</div>`).join('')}
    </section>`;
  },

  async search() {
    return `
    <section class="view">
      <div class="view-head"><h1>Søk</h1></div>
      <div class="searchbar">
        ${icon('search')}
        <input type="search" placeholder="Søk i tittel, notat, sted, referanse …" value="${esc(state.search.q)}" data-input="search" autofocus>
      </div>
      <div class="chips">
        <button class="chip ${state.search.cat === '' ? 'on' : ''}" data-action="search-cat" data-cat="">Alle</button>
        ${CATEGORIES.map((c) => `<button class="chip ${state.search.cat === c.id ? 'on' : ''}" style="--c:${c.color}" data-action="search-cat" data-cat="${c.id}">${c.label}</button>`).join('')}
      </div>
      <div id="results"></div>
    </section>`;
  },

  async report() {
    const r = state.report;
    return `
    <section class="view">
      <div class="view-head no-print"><h1>Rapport</h1></div>
      <div class="report-controls no-print">
        <div class="row">
          <div class="field"><label>Fra</label><input type="date" value="${r.from}" data-change="report-from"></div>
          <div class="field"><label>Til</label><input type="date" value="${r.to}" data-change="report-to"></div>
        </div>
        <div class="chips">
          <button class="chip" data-action="report-range" data-range="today">I dag</button>
          <button class="chip" data-action="report-range" data-range="day">Valgt dag</button>
          <button class="chip" data-action="report-range" data-range="week">Denne uken</button>
          <button class="chip" data-action="report-range" data-range="last7">Siste 7 dager</button>
          <button class="chip" data-action="report-range" data-range="month">Denne måneden</button>
        </div>
        <div class="chips">
          ${CATEGORIES.map((c) => `<label class="chip check-chip" style="--c:${c.color}"><input type="checkbox" data-change="report-cat" value="${c.id}" ${r.cats.includes(c.id) ? 'checked' : ''}>${c.label}</label>`).join('')}
        </div>
        <div class="row row-end">
          <label class="check"><input type="checkbox" data-change="report-photos" ${r.photos ? 'checked' : ''}> Ta med bilder</label>
          <button class="btn primary" data-action="print">${icon('printer')} Skriv ut / lagre som PDF</button>
        </div>
      </div>
      <div id="report" class="report-wrap"><p class="muted">Lager rapport …</p></div>
    </section>`;
  },

  async settings() {
    const s = state.settings;
    let storage = '';
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      storage = `<p>Brukt: <b>${(est.usage / 1048576).toFixed(1)} MB</b> av ca. ${(est.quota / 1073741824).toFixed(1)} GB tilgjengelig.</p>
        <p>${persisted ? '✅ Varig lagring er aktivert – nettleseren sletter ikke dataene automatisk.'
          : '⚠️ Varig lagring er ikke bekreftet. Nettleseren kan i verste fall rydde bort data ved lite plass.'}</p>
        ${persisted ? '' : '<button class="btn" data-action="persist">Be om varig lagring</button>'}`;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return `
    <section class="view settings">
      <div class="view-head"><h1>Innstillinger</h1></div>

      <div class="card">
        <h2>Tilsynsperson</h2>
        <div class="row">
          <div class="field"><label>Navn</label><input value="${esc(s.inspector)}" data-setting="inspector" placeholder="Ditt navn"></div>
          <div class="field"><label>Firma / rolle</label><input value="${esc(s.company)}" data-setting="company" placeholder="F.eks. Byggetilsyn for reder"></div>
        </div>
      </div>

      <div class="card">
        <h2>Skip</h2>
        <p class="muted">Navn og byggenummer vises i toppen og på rapportene.</p>
        ${s.ships.map((sh, i) => `
          <div class="row ship-row">
            <div class="field"><label>Navn</label><input value="${esc(sh.name)}" data-ship-field="name" data-i="${i}"></div>
            <div class="field"><label>Byggenr. / skrognr.</label><input value="${esc(sh.hull)}" data-ship-field="hull" data-i="${i}" placeholder="F.eks. NB 123"></div>
            <div class="field"><label>Verft</label><input value="${esc(sh.yard)}" data-ship-field="yard" data-i="${i}" placeholder="Verftets navn"></div>
          </div>`).join('')}
        <button class="btn small" data-action="add-ship">${icon('plus')} Legg til skip</button>
      </div>

      <div class="card">
        <h2>Bilder</h2>
        <label class="check"><input type="checkbox" data-change="stamp" ${s.stampPhotos ? 'checked' : ''}> Stemple skipsnavn, dato og klokkeslett nederst i nye bilder</label>
        <p class="muted">Bildene skaleres ned til maks 2048 px for å spare plass.</p>
      </div>

      <div class="card">
        <h2>Sikkerhetskopi og flytting mellom enheter</h2>
        <p class="muted">Dataene ligger bare på denne enheten. Ta jevnlig sikkerhetskopi. Du kan også bruke filen til å flytte registreringer fra mobilen til PC-en. Ved import blir data slått sammen, ingenting blir slettet.</p>
        <div class="row">
          <button class="btn primary" data-action="export">${icon('download')} Eksporter sikkerhetskopi</button>
          <label class="btn">${icon('upload')} Importer fil<input type="file" accept="application/json,.json" data-change="import" hidden></label>
        </div>
      </div>

      <div class="card">
        <h2>Lagring</h2>
        ${storage || '<p class="muted">Ukjent lagringsstatus.</p>'}
      </div>

      <div class="card">
        <h2>Installer appen</h2>
        ${standalone ? '<p>✅ Appen kjører som installert app.</p>' : `
          ${state.installPrompt ? `<button class="btn primary" data-action="install">${icon('download')} Installer på denne enheten</button>` : ''}
          <ul class="howto">
            <li><b>iPhone/iPad (Safari):</b> trykk Del-knappen → «Legg til på Hjem-skjerm».</li>
            <li><b>Android (Chrome):</b> meny ⋮ → «Installer app» / «Legg til på startskjermen».</li>
            <li><b>PC/Mac (Chrome/Edge):</b> klikk installer-ikonet i adressefeltet.</li>
          </ul>
          ${isIOS ? '<p class="muted">På iPhone må appen åpnes i Safari for å kunne installeres.</p>' : ''}`}
      </div>

      <p class="muted center">Tilsynsdagbok v${APP_VERSION}</p>
    </section>`;
  },
};

/* ------------------------------------------------------------------ */
/* Søk                                                                 */
/* ------------------------------------------------------------------ */

async function runSearch() {
  const box = $('#results');
  if (!box) return;
  const q = state.search.q.trim().toLowerCase();
  const all = await db.getAllBy('entries', 'shipId', ship().id);
  const words = q.split(/\s+/).filter(Boolean);
  const hits = all.filter((e) => {
    if (state.search.cat && e.category !== state.search.cat) return false;
    if (!words.length) return true;
    const hay = [e.title, e.text, e.location, e.reference, e.responsible, catById(e.category).label].join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  }).sort((a, b) => byDateTime(b, a));
  if (!words.length && !state.search.cat) {
    box.innerHTML = `<p class="muted">${all.length} registreringer totalt på ${esc(ship().name)}. Skriv for å søke.</p>`;
    return;
  }
  box.innerHTML = `<p class="muted">${hits.length} treff</p><div class="list">${hits.slice(0, 200).map((e) => entryCard(e, { showDate: true })).join('')}</div>`;
  hydrateThumbs(box);
}

/* ------------------------------------------------------------------ */
/* Rapport                                                             */
/* ------------------------------------------------------------------ */

let reportUrls = [];
async function renderReport() {
  const box = $('#report');
  if (!box) return;
  reportUrls.forEach((u) => URL.revokeObjectURL(u));
  reportUrls = [];
  const r = state.report;
  const s = ship();
  const from = r.from <= r.to ? r.from : r.to;
  const to = r.from <= r.to ? r.to : r.from;
  const all = await db.getAllBy('entries', 'shipId', s.id);
  const entries = all.filter((e) => e.date >= from && e.date <= to && r.cats.includes(e.category)).sort(byDateTime);
  const openItems = all.filter((e) => e.followUp && e.status !== 'closed' && e.date <= to).sort(byDateTime);

  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const list = entries.filter((e) => e.date === d);
    const sum = (await db.get('meta', dayKey(s.id, d)))?.summary || '';
    if (list.length || sum) days.push({ d, list, sum });
    if (days.length > 400) break;
  }

  const photoHtml = async (e) => {
    if (!r.photos || !(e.photoIds || []).length) return '';
    const imgs = [];
    for (const id of e.photoIds) {
      const p = await db.get('photos', id);
      if (!p) continue;
      const u = URL.createObjectURL(p.blob);
      reportUrls.push(u);
      imgs.push(`<img src="${u}" alt="">`);
    }
    return `<div class="rep-photos">${imgs.join('')}</div>`;
  };

  const counts = CATEGORIES.map((c) => ({ c, n: entries.filter((e) => e.category === c.id).length })).filter((x) => x.n);
  const period = from === to ? cap(fmtLong(from)) : `${fmtNum(from)} – ${fmtNum(to)}`;

  let body = '';
  for (const { d, list, sum } of days) {
    body += `<section class="rep-day"><h2>${cap(fmtLong(d))}</h2>${sum ? `<div class="rep-sum"><b>Oppsummering:</b> ${esc(sum)}</div>` : ''}`;
    for (const e of list) {
      const c = catById(e.category);
      body += `<article class="rep-entry" style="--c:${c.color}">
        <div class="rep-entry-head"><span class="badge">${c.label}</span><span>kl. ${esc(e.time)}</span>
          ${e.location ? `<span>· ${esc(e.location)}</span>` : ''}${e.reference ? `<span>· Ref: ${esc(e.reference)}</span>` : ''}</div>
        ${e.title ? `<h3>${esc(e.title)}</h3>` : ''}
        ${e.text ? `<p>${esc(e.text)}</p>` : ''}
        ${e.followUp ? `<p class="rep-follow"><b>Oppfølging:</b> ${e.status === 'closed' ? 'Lukket' : 'Åpen'}${e.responsible ? ` · Ansvarlig: ${esc(e.responsible)}` : ''}${e.dueDate ? ` · Frist: ${fmtNum(e.dueDate)}` : ''}</p>` : ''}
        ${await photoHtml(e)}
      </article>`;
    }
    body += '</section>';
  }

  box.innerHTML = `
  <div class="report">
    <header class="rep-head">
      <div>
        <div class="rep-kicker">Tilsynsrapport</div>
        <h1>${esc(s.name)}</h1>
        <div class="rep-sub">${[s.hull, s.yard].filter(Boolean).map(esc).join(' · ')}</div>
      </div>
      <dl>
        <dt>Periode</dt><dd>${period}</dd>
        ${state.settings.inspector ? `<dt>Tilsyn</dt><dd>${esc(state.settings.inspector)}${state.settings.company ? `, ${esc(state.settings.company)}` : ''}</dd>` : ''}
        <dt>Utskrevet</dt><dd>${new Date().toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}</dd>
      </dl>
    </header>
    <section class="rep-summary">
      <div><b>${entries.length}</b> registreringer</div>
      ${counts.map(({ c, n }) => `<div style="--c:${c.color}"><span class="dot"></span>${c.label}: <b>${n}</b></div>`).join('')}
      <div><b>${openItems.length}</b> åpne oppfølgingspunkter</div>
    </section>
    ${body || '<p class="muted">Ingen registreringer i valgt periode.</p>'}
    ${openItems.length ? `
    <section class="rep-open">
      <h2>Åpne oppfølgingspunkter per ${fmtNum(to)}</h2>
      <table>
        <thead><tr><th>Dato</th><th>Kategori</th><th>Beskrivelse</th><th>Sted</th><th>Ansvarlig</th><th>Frist</th></tr></thead>
        <tbody>${openItems.map((e) => `<tr class="${e.dueDate && e.dueDate < today() ? 'overdue' : ''}">
          <td>${fmtNum(e.date)}</td><td>${catById(e.category).label}</td>
          <td>${esc(e.title || e.text).slice(0, 160)}</td><td>${esc(e.location)}</td>
          <td>${esc(e.responsible)}</td><td>${e.dueDate ? fmtNum(e.dueDate) : ''}</td></tr>`).join('')}</tbody>
      </table>
    </section>` : ''}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Redigering av registrering                                          */
/* ------------------------------------------------------------------ */

const editorEl = () => $('#editor');

async function knownValues(field) {
  const all = await db.getAllBy('entries', 'shipId', ship().id);
  const vals = new Set(all.map((e) => e[field]).filter(Boolean));
  if (field === 'location') DEFAULT_AREAS.forEach((a) => vals.add(a));
  return [...vals].sort((a, b) => a.localeCompare(b, 'nb'));
}

async function openEditor(entry, opts = {}) {
  const isNew = !entry;
  const now = new Date();
  const e = entry ? { ...entry } : {
    id: uid(), shipId: ship().id, date: state.date, time: hhmm(now),
    category: opts.category || 'observasjon', title: '', text: '', location: '', reference: '',
    followUp: opts.category === 'avvik', responsible: '', dueDate: '', status: 'open',
    photoIds: [], createdAt: Date.now(),
  };
  if (opts.restore) Object.assign(e, opts.restore.entry);
  const removed = opts.restore?.removed || [];
  const added = opts.restore?.added || [];

  // Hent bilder: lagrede + evt. bilder lagt til i et utkast som ble avbrutt
  const stored = await db.getAllBy('photos', 'entryId', e.id);
  const byId = new Map(stored.map((p) => [p.id, p]));
  const order = [...(e.photoIds || []), ...stored.map((p) => p.id).filter((id) => !(e.photoIds || []).includes(id))];
  const photos = order.filter((id) => byId.has(id) && !removed.includes(id)).map((id) => byId.get(id));

  state.draft = { entry: e, isNew: opts.restore ? opts.restore.isNew : isNew, photos, removed, added, dirty: !!opts.restore };
  const [locations, responsibles] = await Promise.all([knownValues('location'), knownValues('responsible')]);
  renderEditor(locations, responsibles);
  const dlg = editorEl();
  if (!dlg.open) dlg.showModal();
  if (opts.files?.length) await addFilesToDraft(opts.files);
  if (!opts.files?.length && isNew && !opts.restore) setTimeout(() => $('[name=title]', dlg)?.focus(), 50);
}

function renderEditor(locations, responsibles) {
  const d = state.draft;
  const e = d.entry;
  editorEl().innerHTML = `
  <form class="editor" data-editor onsubmit="return false">
    <header class="ed-head">
      <button type="button" class="btn ghost" data-action="close-editor">Avbryt</button>
      <h2>${d.isNew ? 'Ny registrering' : 'Rediger'}</h2>
      <button type="button" class="btn primary" data-action="save-entry">Lagre</button>
    </header>
    <div class="ed-body">
      <div class="field">
        <label>Kategori</label>
        <div class="cat-picker">${CATEGORIES.map((c) => `
          <button type="button" class="cat ${e.category === c.id ? 'on' : ''}" style="--c:${c.color}" data-action="pick-cat" data-cat="${c.id}">${c.label}</button>`).join('')}
        </div>
      </div>

      <div class="field">
        <label>Bilder</label>
        <div class="ed-photos" id="edPhotos"></div>
        <div class="row">
          <label class="btn">${icon('camera')} Ta bilde<input type="file" accept="image/*" capture="environment" data-change="add-photos" hidden></label>
          <label class="btn">${icon('image')} Velg fra galleri / filer<input type="file" accept="image/*" multiple data-change="add-photos" hidden></label>
        </div>
        <p class="muted small desktop-hint">Tips: dra bilder inn hit, eller lim inn med Ctrl+V.</p>
      </div>

      <div class="field"><label for="f-title">Tittel</label>
        <input id="f-title" name="title" value="${esc(e.title)}" placeholder="Kort beskrivelse, f.eks. «Sveis på spant 42 ikke slipt»" autocomplete="off"></div>

      <div class="field"><label for="f-text">Notat</label>
        <textarea id="f-text" name="text" rows="6" placeholder="Hva så du? Hva ble avtalt? Hvem var til stede?">${esc(e.text)}</textarea></div>

      <div class="row">
        <div class="field grow"><label for="f-loc">Sted om bord</label>
          <input id="f-loc" name="location" value="${esc(e.location)}" list="dl-locations" placeholder="F.eks. Maskinrom, spant 40–45" autocomplete="off">
          <datalist id="dl-locations">${locations.map((l) => `<option value="${esc(l)}">`).join('')}</datalist></div>
        <div class="field"><label for="f-ref">Referanse</label>
          <input id="f-ref" name="reference" value="${esc(e.reference)}" placeholder="Tegning, NCR-nr., sjekkliste" autocomplete="off"></div>
      </div>

      <div class="row">
        <div class="field"><label for="f-date">Dato</label><input id="f-date" type="date" name="date" value="${e.date}"></div>
        <div class="field"><label for="f-time">Klokkeslett</label><input id="f-time" type="time" name="time" value="${e.time}"></div>
      </div>

      <div class="followbox">
        <label class="check"><input type="checkbox" name="followUp" data-change="toggle-follow" ${e.followUp ? 'checked' : ''}> <b>Krever oppfølging</b></label>
        <div class="follow-fields" ${e.followUp ? '' : 'hidden'}>
          <div class="row">
            <div class="field grow"><label for="f-resp">Ansvarlig</label>
              <input id="f-resp" name="responsible" value="${esc(e.responsible)}" list="dl-resp" placeholder="Verft, leverandør, person" autocomplete="off">
              <datalist id="dl-resp">${responsibles.map((l) => `<option value="${esc(l)}">`).join('')}</datalist></div>
            <div class="field"><label for="f-due">Frist</label><input id="f-due" type="date" name="dueDate" value="${e.dueDate || ''}"></div>
            <div class="field"><label for="f-status">Status</label>
              <select id="f-status" name="status">
                <option value="open" ${e.status !== 'closed' ? 'selected' : ''}>Åpen</option>
                <option value="closed" ${e.status === 'closed' ? 'selected' : ''}>Lukket</option>
              </select></div>
          </div>
        </div>
      </div>

      ${d.isNew ? '' : `<div class="ed-footer">
        ${navigator.share ? `<button type="button" class="btn" data-action="share-entry">${icon('share')} Del</button>` : ''}
        <button type="button" class="btn danger" data-action="delete-entry">${icon('trash')} Slett registrering</button>
      </div>`}
    </div>
    <div class="drop-hint">Slipp bildene her</div>
  </form>`;
  renderEditorPhotos();
}

function renderEditorPhotos() {
  const box = $('#edPhotos');
  if (!box) return;
  const d = state.draft;
  box.innerHTML = d.photos.length ? d.photos.map((p, i) => `
    <div class="ed-photo">
      <img data-photo="${p.id}" data-action="view-photo" data-draft="1" data-index="${i}" alt="">
      <button type="button" class="ed-photo-x" data-action="remove-photo" data-id="${p.id}" aria-label="Fjern bilde">${icon('x')}</button>
    </div>`).join('') : '<p class="muted small">Ingen bilder lagt til.</p>';
  hydrateThumbs(box);
}

function collectDraft() {
  const d = state.draft;
  const f = $('[data-editor]', editorEl());
  if (!d || !f) return;
  const e = d.entry;
  ['title', 'text', 'location', 'reference', 'date', 'time', 'responsible', 'dueDate', 'status'].forEach((k) => {
    if (f.elements[k]) e[k] = f.elements[k].value;
  });
  e.followUp = f.elements.followUp.checked;
  e.date = e.date || state.date;
  e.time = e.time || hhmm(new Date());
}

function saveDraftLocal() {
  const d = state.draft;
  if (!d) return;
  collectDraft();
  d.dirty = true;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ entry: d.entry, isNew: d.isNew, removed: d.removed, added: d.added }));
  } catch { /* full eller privat modus */ }
}
const clearDraftLocal = () => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignorer */ } };

async function addFilesToDraft(files) {
  const d = state.draft;
  if (!d) return;
  const imgs = [...files].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(f.name));
  if (!imgs.length) return;
  toast(imgs.length > 1 ? `Behandler ${imgs.length} bilder …` : 'Behandler bilde …');
  collectDraft();
  for (const file of imgs) {
    try {
      const when = new Date(file.lastModified || Date.now());
      const stamp = state.settings.stampPhotos
        ? `${ship().name} · ${when.toLocaleDateString('nb-NO')} ${hhmm(when)}` : null;
      const { blob, thumb } = await processImage(file, stamp);
      const rec = {
        id: uid(), entryId: d.entry.id, shipId: d.entry.shipId, date: d.entry.date,
        blob, thumb, name: file.name, createdAt: Date.now(),
      };
      // Lagres med en gang, slik at bildet ikke går tapt om mobilen lukker appen mens kameraet er åpent.
      await db.put('photos', rec);
      d.photos.push(rec);
      d.added.push(rec.id);
    } catch (err) {
      console.error(err);
      toast(`Kunne ikke lese ${file.name}`);
    }
  }
  saveDraftLocal();
  renderEditorPhotos();
  toast(imgs.length > 1 ? `${imgs.length} bilder lagt til` : 'Bilde lagt til');
}

async function saveEntry() {
  const d = state.draft;
  collectDraft();
  const e = d.entry;
  if (!e.title.trim() && !e.text.trim() && d.photos.length === 0) {
    toast('Skriv en tittel/notat eller legg til et bilde');
    return;
  }
  if (!e.followUp) e.status = 'open';
  if (e.followUp && e.status === 'closed' && !e.closedAt) e.closedAt = Date.now();
  if (e.status !== 'closed') delete e.closedAt;
  e.photoIds = d.photos.map((p) => p.id);
  e.updatedAt = Date.now();
  const photos = d.photos.map((p) => ({ ...p, entryId: e.id, shipId: e.shipId, date: e.date }));
  await db.saveEntry(e, photos, d.removed);
  d.removed.forEach(forgetThumb);
  clearDraftLocal();
  state.draft = null;
  editorEl().close();
  if (state.view === 'day' && e.date !== state.date) state.date = e.date;
  toast('Lagret');
  requestPersist();
  render();
}

async function discardDraft() {
  const d = state.draft;
  if (d?.added.length) {
    await db.delMany('photos', d.added);
    d.added.forEach(forgetThumb);
  }
  clearDraftLocal();
  state.draft = null;
  if (editorEl().open) editorEl().close();
}

async function closeEditor() {
  const d = state.draft;
  if (d?.dirty && !confirm('Forkaste endringene?')) return;
  await discardDraft();
}

async function shareEntry() {
  const d = state.draft;
  collectDraft();
  const e = d.entry;
  const c = catById(e.category);
  const text = [
    `${c.label}${e.title ? `: ${e.title}` : ''}`,
    `${ship().name} – ${fmtNum(e.date)} kl. ${e.time}`,
    e.location && `Sted: ${e.location}`,
    e.reference && `Ref: ${e.reference}`,
    e.text,
    e.followUp && `Oppfølging: ${e.status === 'closed' ? 'Lukket' : 'Åpen'}${e.responsible ? `, ansvarlig ${e.responsible}` : ''}${e.dueDate ? `, frist ${fmtNum(e.dueDate)}` : ''}`,
  ].filter(Boolean).join('\n');
  const files = d.photos.map((p, i) => new File([p.blob], `${safeFile(ship().name)}_${e.date}_${i + 1}.jpg`, { type: 'image/jpeg' }));
  try {
    if (files.length && navigator.canShare?.({ files })) await navigator.share({ title: e.title || c.label, text, files });
    else await navigator.share({ title: e.title || c.label, text });
  } catch (err) {
    if (err.name !== 'AbortError') toast('Deling mislyktes');
  }
}

/* ------------------------------------------------------------------ */
/* Bildeviser                                                          */
/* ------------------------------------------------------------------ */

let lightboxUrl = null;
async function openLightbox(ids, index) {
  state.lightbox = { ids, index };
  const dlg = $('#lightbox');
  if (!dlg.open) dlg.showModal();
  await showLightboxImage();
}

async function showLightboxImage() {
  const { ids, index } = state.lightbox;
  const p = await db.get('photos', ids[index]);
  if (!p) return;
  const e = await db.get('entries', p.entryId);
  if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
  lightboxUrl = URL.createObjectURL(p.blob);
  const caption = e
    ? `${fmtShort(e.date)} kl. ${esc(e.time)} · ${catById(e.category).label}${e.title ? ` · ${esc(e.title)}` : ''}${e.location ? ` · ${esc(e.location)}` : ''}`
    : 'Nytt bilde (ikke lagret ennå)';
  $('#lightbox').innerHTML = `
    <div class="lb">
      <img src="${lightboxUrl}" alt="">
      <div class="lb-bar">
        <button class="icon-btn" data-action="lb-step" data-step="-1" ${index === 0 ? 'disabled' : ''} aria-label="Forrige">${icon('left')}</button>
        <div class="lb-cap">${caption}<small>${index + 1} / ${ids.length}</small></div>
        <button class="icon-btn" data-action="lb-download" aria-label="Last ned">${icon('download')}</button>
        <button class="icon-btn" data-action="lb-step" data-step="1" ${index === ids.length - 1 ? 'disabled' : ''} aria-label="Neste">${icon('right')}</button>
        <button class="icon-btn" data-action="lb-close" aria-label="Lukk">${icon('x')}</button>
      </div>
    </div>`;
}

function closeLightbox() {
  $('#lightbox').close();
  if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
  lightboxUrl = null;
  state.lightbox = null;
}

/* ------------------------------------------------------------------ */
/* Sikkerhetskopi                                                      */
/* ------------------------------------------------------------------ */

const blobToB64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});
const b64ToBlob = (b64, type = 'image/jpeg') => {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
};

async function exportBackup() {
  toast('Lager sikkerhetskopi …');
  const [meta, entries, photoKeys] = await Promise.all([db.getAll('meta'), db.getAll('entries'), db.getAllKeys('photos')]);
  const parts = [`{"app":"tilsynsdagbok","version":1,"exportedAt":${JSON.stringify(new Date().toISOString())},`,
    `"meta":${JSON.stringify(meta)},"entries":${JSON.stringify(entries)},"photos":[`];
  let first = true;
  for (const id of photoKeys) {
    const p = await db.get('photos', id);
    const { blob, thumb, ...rest } = p;
    parts.push((first ? '' : ',') + JSON.stringify({ ...rest, blob: await blobToB64(blob), thumb: thumb ? await blobToB64(thumb) : null }));
    first = false;
  }
  parts.push(']}');
  const stamp = new Date();
  downloadBlob(new Blob(parts, { type: 'application/json' }),
    `tilsynsdagbok_${toISODate(stamp)}_${pad2(stamp.getHours())}${pad2(stamp.getMinutes())}.json`);
  try { localStorage.setItem('tilsyn-last-backup', String(Date.now())); } catch { /* ignorer */ }
}

async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('Ugyldig fil'); return; }
  if (data?.app !== 'tilsynsdagbok') { toast('Filen er ikke en sikkerhetskopi fra Tilsynsdagbok'); return; }
  const existing = new Map((await db.getAll('entries')).map((e) => [e.id, e]));
  // Behold den nyeste versjonen av hver registrering
  const entries = (data.entries || []).filter((e) => !existing.has(e.id) || (e.updatedAt || 0) > (existing.get(e.id).updatedAt || 0));
  if (!confirm(`Importere ${data.entries?.length || 0} registreringer og ${data.photos?.length || 0} bilder?\n${entries.length} er nye eller oppdaterte. Eksisterende data blir ikke slettet.`)) return;
  const photos = (data.photos || []).map((p) => ({ ...p, blob: b64ToBlob(p.blob), thumb: p.thumb ? b64ToBlob(p.thumb) : null }));
  await db.putMany('entries', entries);
  for (let i = 0; i < photos.length; i += 20) await db.putMany('photos', photos.slice(i, i + 20));
  // Dagsoppsummeringer: slå sammen; skip-oppsett: legg til skip som mangler
  const dayMeta = (data.meta || []).filter((m) => m.key.startsWith('day:'));
  for (const m of dayMeta) {
    const cur = await db.get('meta', m.key);
    if (!cur?.summary) await db.put('meta', m);
    else if (m.summary && !cur.summary.includes(m.summary)) await db.put('meta', { ...cur, summary: `${cur.summary}\n${m.summary}` });
  }
  const importedSettings = (data.meta || []).find((m) => m.key === 'settings')?.value;
  if (importedSettings?.ships) {
    importedSettings.ships.forEach((s) => {
      if (!state.settings.ships.some((x) => x.id === s.id)) state.settings.ships.push(s);
    });
    if (!state.settings.inspector && importedSettings.inspector) state.settings.inspector = importedSettings.inspector;
    await saveSettings();
  }
  thumbUrls.forEach((u) => URL.revokeObjectURL(u));
  thumbUrls.clear();
  toast('Import fullført');
  render();
}

async function requestPersist() {
  if (navigator.storage?.persist && !(await navigator.storage.persisted?.())) {
    try { await navigator.storage.persist(); } catch { /* ignorer */ }
  }
}

/* ------------------------------------------------------------------ */
/* Hendelser                                                           */
/* ------------------------------------------------------------------ */

function reportRange(kind) {
  const t = today();
  const d = new Date();
  if (kind === 'today') return [t, t];
  if (kind === 'day') return [state.date, state.date];
  if (kind === 'last7') return [addDays(t, -6), t];
  if (kind === 'week') {
    const dow = (d.getDay() + 6) % 7; // mandag = 0
    const mon = addDays(t, -dow);
    return [mon, addDays(mon, 6)];
  }
  if (kind === 'month') return [`${t.slice(0, 8)}01`, toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
  return [t, t];
}

const ACTIONS = {
  nav: (el) => { state.view = el.dataset.view; window.scrollTo(0, 0); render(); },
  'switch-ship': async (el) => { state.settings.activeShip = el.dataset.ship; await saveSettings(); render(); },
  'day-step': (el) => { state.date = addDays(state.date, Number(el.dataset.step)); render(); },
  'goto-today': () => { state.date = today(); render(); },
  'goto-date': (el, ev) => { ev.preventDefault(); state.date = el.dataset.date; state.view = 'day'; render(); },
  'new-entry': (el) => openEditor(null, { category: el.dataset.cat }),
  'quick-photo': () => $('#quickCamera').click(),
  edit: async (el) => { const e = await db.get('entries', el.dataset.id); if (e) openEditor(e); },
  'pick-cat': (el) => {
    $$('.cat', editorEl()).forEach((b) => b.classList.toggle('on', b === el));
    state.draft.entry.category = el.dataset.cat;
    if (el.dataset.cat === 'avvik') {
      const cb = $('[name=followUp]', editorEl());
      if (!cb.checked) { cb.checked = true; $('.follow-fields', editorEl()).hidden = false; }
    }
    saveDraftLocal();
  },
  'save-entry': () => saveEntry(),
  'close-editor': () => closeEditor(),
  'remove-photo': (el) => {
    const d = state.draft;
    const id = el.dataset.id;
    d.photos = d.photos.filter((p) => p.id !== id);
    if (d.added.includes(id)) {
      d.added = d.added.filter((x) => x !== id);
      db.del('photos', id);
      forgetThumb(id);
    } else {
      d.removed.push(id);
    }
    saveDraftLocal();
    renderEditorPhotos();
  },
  'delete-entry': async () => {
    if (!confirm('Slette registreringen og alle bildene i den? Dette kan ikke angres.')) return;
    const d = state.draft;
    await db.deleteEntry(d.entry.id);
    d.photos.forEach((p) => forgetThumb(p.id));
    clearDraftLocal();
    state.draft = null;
    editorEl().close();
    toast('Slettet');
    render();
  },
  'share-entry': () => shareEntry(),
  'set-status': async (el) => {
    const e = await db.get('entries', el.dataset.id);
    e.status = el.dataset.status;
    e.updatedAt = Date.now();
    if (e.status === 'closed') e.closedAt = Date.now(); else delete e.closedAt;
    await db.put('entries', e);
    toast(e.status === 'closed' ? 'Markert som lukket' : 'Gjenåpnet');
    render();
  },
  'view-photo': async (el) => {
    const i = Number(el.dataset.index);
    if (el.dataset.draft) return openLightbox(state.draft.photos.map((p) => p.id), i);
    if (el.dataset.gallery) return openLightbox(state.photoOrder, i);
    const e = await db.get('entries', el.dataset.entry);
    if (e) openLightbox(e.photoIds, i);
  },
  'lb-step': (el) => {
    const lb = state.lightbox;
    lb.index = Math.max(0, Math.min(lb.ids.length - 1, lb.index + Number(el.dataset.step)));
    showLightboxImage();
  },
  'lb-close': () => closeLightbox(),
  'lb-download': async () => {
    const p = await db.get('photos', state.lightbox.ids[state.lightbox.index]);
    if (p) downloadBlob(p.blob, `${safeFile(ship().name)}_${p.date}_${p.id.slice(0, 6)}.jpg`);
  },
  'search-cat': (el) => {
    state.search.cat = el.dataset.cat;
    $$('[data-action=search-cat]').forEach((b) => b.classList.toggle('on', b === el));
    runSearch();
  },
  'report-range': (el) => {
    [state.report.from, state.report.to] = reportRange(el.dataset.range);
    render();
  },
  print: () => window.print(),
  export: () => exportBackup(),
  persist: async () => { await requestPersist(); render(); },
  install: async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    render();
  },
  'add-ship': async () => {
    const n = state.settings.ships.length + 1;
    state.settings.ships.push({ id: `skip${Date.now().toString(36)}`, name: `Nybygg ${n}`, hull: '', yard: '' });
    await saveSettings();
    render();
  },
};

const CHANGES = {
  'pick-date': (el) => { if (el.value) { state.date = el.value; render(); } },
  'ship-select': async (el) => { state.settings.activeShip = el.value; await saveSettings(); render(); },
  'show-closed': (el) => { state.followShowClosed = el.checked; render(); },
  'toggle-follow': (el) => { $('.follow-fields', editorEl()).hidden = !el.checked; },
  'add-photos': async (el) => { const files = [...el.files]; el.value = ''; await addFilesToDraft(files); },
  'report-from': (el) => { state.report.from = el.value || today(); renderReport(); },
  'report-to': (el) => { state.report.to = el.value || today(); renderReport(); },
  'report-cat': () => { state.report.cats = $$('[data-change=report-cat]:checked').map((c) => c.value); renderReport(); },
  'report-photos': (el) => { state.report.photos = el.checked; renderReport(); },
  stamp: async (el) => { state.settings.stampPhotos = el.checked; await saveSettings(); toast('Lagret'); },
  import: async (el) => { const f = el.files[0]; el.value = ''; if (f) await importBackup(f); },
};

const saveDaySummary = debounce(async (shipId, date, text) => {
  await db.put('meta', { key: dayKey(shipId, date), summary: text, updatedAt: Date.now() });
}, 400);

function bindEvents() {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) { ev.stopPropagation(); fn(el, ev); }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.matches('article.entry')) ACTIONS.edit(ev.target);
    if ($('#lightbox').open) {
      if (ev.key === 'ArrowLeft') ACTIONS['lb-step']({ dataset: { step: -1 } });
      if (ev.key === 'ArrowRight') ACTIONS['lb-step']({ dataset: { step: 1 } });
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 's' && editorEl().open) { ev.preventDefault(); saveEntry(); }
  });

  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (el.dataset.change && CHANGES[el.dataset.change]) CHANGES[el.dataset.change](el);
    if (el.dataset.setting) { state.settings[el.dataset.setting] = el.value.trim(); saveSettings().then(() => { renderNav(); toast('Lagret'); }); }
    if (el.dataset.shipField) {
      state.settings.ships[Number(el.dataset.i)][el.dataset.shipField] = el.value.trim();
      saveSettings().then(() => { renderTopbar(); toast('Lagret'); });
    }
  });

  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.closest('[data-editor]')) saveDraftLocal();
    if (el.dataset.input === 'search') { state.search.q = el.value; runSearch(); }
    if (el.dataset.input === 'day-summary') saveDaySummary(ship().id, state.date, el.value);
  });

  // Hurtigkamera fra dagboken
  $('#quickCamera').addEventListener('change', async (ev) => {
    const files = [...ev.target.files];
    ev.target.value = '';
    if (files.length) await openEditor(null, { files });
  });

  // Esc i redigering: spør før endringer forkastes
  editorEl().addEventListener('cancel', (ev) => { ev.preventDefault(); closeEditor(); });
  $('#lightbox').addEventListener('cancel', (ev) => { ev.preventDefault(); closeLightbox(); });
  $('#lightbox').addEventListener('click', (ev) => { if (ev.target.matches('.lb')) closeLightbox(); });

  // Dra og slipp / lim inn bilder i redigering (PC)
  const dlg = editorEl();
  dlg.addEventListener('dragover', (ev) => { ev.preventDefault(); dlg.classList.add('dragging'); });
  dlg.addEventListener('dragleave', (ev) => { if (ev.target === dlg || !dlg.contains(ev.relatedTarget)) dlg.classList.remove('dragging'); });
  dlg.addEventListener('drop', (ev) => {
    ev.preventDefault();
    dlg.classList.remove('dragging');
    if (ev.dataTransfer?.files?.length) addFilesToDraft(ev.dataTransfer.files);
  });
  document.addEventListener('paste', (ev) => {
    if (!dlg.open) return;
    const files = [...(ev.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) { ev.preventDefault(); addFilesToDraft(files); }
  });

  // Dra filer inn i hovedvinduet → ny registrering
  document.addEventListener('dragover', (ev) => { if (!dlg.open && ev.dataTransfer?.types?.includes('Files')) ev.preventDefault(); });
  document.addEventListener('drop', (ev) => {
    if (dlg.open) return;
    const files = [...(ev.dataTransfer?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (files.length) { ev.preventDefault(); openEditor(null, { files }); }
  });

  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    state.installPrompt = ev;
    if (state.view === 'settings') render();
  });

  // Bytt automatisk til ny dag hvis appen står åpen over midnatt
  let lastToday = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const t = today();
    if (t !== lastToday) {
      if (state.date === lastToday) state.date = t;
      lastToday = t;
      if (!editorEl().open) render();
    }
  });

  // Gi rapporten et fornuftig filnavn ved «Lagre som PDF»
  let oldTitle = document.title;
  window.addEventListener('beforeprint', () => {
    oldTitle = document.title;
    if (state.view === 'report') document.title = `Tilsynsrapport_${safeFile(ship().name)}_${state.report.from}${state.report.to !== state.report.from ? `_til_${state.report.to}` : ''}`;
  });
  window.addEventListener('afterprint', () => { document.title = oldTitle; });
}

/* ------------------------------------------------------------------ */
/* Oppstart                                                            */
/* ------------------------------------------------------------------ */

async function init() {
  await loadSettings();
  bindEvents();
  await render();

  // Gjenopprett utkast som ikke ble lagret (f.eks. hvis mobilen lukket appen mens kameraet var åpent)
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* ignorer */ }
  if (draft?.entry) {
    if (draft.entry.shipId && state.settings.ships.some((s) => s.id === draft.entry.shipId)) {
      state.settings.activeShip = draft.entry.shipId;
    }
    const existing = draft.isNew ? null : await db.get('entries', draft.entry.id);
    await openEditor(existing, { restore: draft });
    toast('Ulagret registrering ble gjenopprettet');
  }

  // Rydd bort bilder som ikke hører til noen registrering
  db.orphanPhotoIds(state.draft?.entry.id).then((ids) => ids.length && db.delMany('photos', ids)).catch(() => {});

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW feilet', err));
  }
}

init().catch((err) => {
  console.error(err);
  $('#main').innerHTML = `<div class="empty"><p><b>Noe gikk galt ved oppstart.</b></p><p class="muted">${esc(err.message)}</p></div>`;
});
