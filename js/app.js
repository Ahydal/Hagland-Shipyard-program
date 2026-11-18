import * as db from './db.js';
import * as summary from './summary.js';
import * as sync from './sync.js';

const APP_VERSION = '2.5.0';

/* ------------------------------------------------------------------ */
/* Konstanter                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  ships: [
    { id: 'skip1', name: 'Nybygg 1', hull: '' },
    { id: 'skip2', name: 'Nybygg 2', hull: '' },
  ],
  activeShip: 'skip1',
  stampPhotos: false,
  reportName: '',
  reportTitle: '',
};

// Plassering om bord. Forslagene lærer av det du har skrevet før.
const LOC_FIELDS = [
  { key: 'section', label: 'Seksjon', ph: 'f.eks. 210', defaults: [] },
  { key: 'frame', label: 'Spant', ph: 'f.eks. 42–45', defaults: [] },
  { key: 'deck', label: 'Dekk', ph: 'f.eks. Dekk 2', defaults: ['Tanktopp', 'Dekk 1', 'Dekk 2', 'Dekk 3', 'Hoveddekk', 'Brodekk'] },
  { key: 'room', label: 'Rom', ph: 'f.eks. Maskinrom', defaults: ['Maskinrom', 'Styrehus', 'Lasterom', 'Pumperom', 'Tavlerom', 'Verksted', 'Messe', 'Bysse', 'Lugar', 'Styremaskinrom'] },
];
const emptyLoc = () => ({ section: '', frame: '', deck: '', room: '' });

const DRAFT_KEY = 'tilsyn-draft';

const ICON_PATHS = {
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  ship: '<path d="M2 17l2 4h16l2-4H2z"/><path d="M6 17V9h8l3 8"/><path d="M9 9V5h4v4"/>',
  history: '<polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  report: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>',
};
const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

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
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const safeFile = (s) => String(s).replace(/[^\wæøåÆØÅ.-]+/g, '_');
const fmtNum = (s) => parseISODate(s).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const isDesktop = () => matchMedia('(min-width: 900px)').matches;

/** Mandag i uka datoen tilhører. */
const mondayOf = (s) => addDays(s, -((parseISODate(s).getDay() + 6) % 7));
/** ISO-ukenummer. */
function isoWeek(s) {
  const d = parseISODate(mondayOf(s));
  d.setDate(d.getDate() + 3); // torsdag i samme uke
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
const weekDays = (start) => Array.from({ length: 7 }, (_, i) => addDays(start, i));
const DAY_SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function fmtLoc(loc) {
  if (!loc) return '';
  const p = [];
  if (loc.section) p.push(`Seksj. ${loc.section}`);
  if (loc.frame) p.push(`Spant ${loc.frame}`);
  if (loc.deck) p.push(/^\d+$/.test(loc.deck) ? `Dekk ${loc.deck}` : loc.deck);
  if (loc.room) p.push(loc.room);
  return p.join(' · ');
}
const hasLoc = (loc) => !!loc && LOC_FIELDS.some((f) => loc[f.key]);

/** Gjør eldre registreringer (fra prototypen) kompatible med dagens format. */
function normalize(e) {
  if (!e) return e;
  if (typeof e.location === 'string' || !e.location) {
    const old = typeof e.location === 'string' ? e.location : '';
    e.location = { ...emptyLoc(), room: old };
  }
  if (e.title) {
    e.text = e.text ? `${e.title}\n${e.text}` : e.title;
    delete e.title;
  }
  e.text = e.text || '';
  e.photoIds = e.photoIds || [];
  e.company = e.company || '';
  return e;
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

/* ------------------------------------------------------------------ */
/* Tilstand                                                            */
/* ------------------------------------------------------------------ */

const state = {
  view: 'day',
  date: today(),
  settings: null,
  draft: null,
  lightbox: null,
  installPrompt: null,
  lastLoc: null,
  weekStart: mondayOf(today()),
  weekShip: 'all',
  weekQuery: '',
  weekPhotoOrder: [],
  aiBusy: false,
  pending: 0,
  sync: { root: null, perm: null, running: false, msg: '', lastAt: 0, error: '' },
};

const ship = () => state.settings.ships.find((s) => s.id === state.settings.activeShip) || state.settings.ships[0];
/** Skipet rapportene gjelder (følger valgt skip i dagboken hvis ikke annet er valgt). */
const reportShip = () => state.settings.ships.find((s) => s.id === state.reportShip) || ship();
const shipChips = () => `<div class="chips">${state.settings.ships.map((s) => `<button class="chip-f ${s.id === reportShip().id ? 'on' : ''}" data-action="report-ship" data-ship="${s.id}">${esc(s.name)}</button>`).join('')}</div>`;
const mmWeekTitle = (sh, start) => `${sh.name}. Week ${isoWeek(start)} (${summary.mmDate(start)} - ${summary.mmDate(addDays(start, 6))})`;

async function loadSettings() {
  const rec = await db.get('meta', 'settings');
  state.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(rec?.value || {}) };
}
const saveSettings = () => db.put('meta', { key: 'settings', value: state.settings });

async function entriesFor(shipId, date) {
  return (await db.getAllBy('entries', 'ship_date', [shipId, date])).map(normalize);
}

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
/* Toppfelt og visninger                                               */
/* ------------------------------------------------------------------ */

function renderTopbar() {
  const back = isDesktop() ? state.homeView || 'day' : 'day';
  if (state.view === 'settings') {
    $('#topbar').innerHTML = `
      <button class="icon-btn" data-action="nav" data-view="${back}" aria-label="Tilbake">${icon('left')}</button>
      <h1 class="topbar-title">Innstillinger</h1>`;
    return;
  }
  const tabs = `
    <div class="topbar-name desktop-only">${icon('ship')}<span>Tilsynsdagbok</span></div>
    <nav class="tabs desktop-only">
      <button class="${state.view === 'week' ? 'on' : ''}" data-action="nav" data-view="week">${icon('calendar')} Uke</button>
      <button class="${state.view === 'day' ? 'on' : ''}" data-action="nav" data-view="day">${icon('camera')} Dagbok</button>
      <button class="${state.view === 'dayreport' ? 'on' : ''}" data-action="nav" data-view="dayreport">${icon('report')} Dagsrapport</button>
    </nav>`;
  const gear = `<button class="icon-btn" data-action="nav" data-view="settings" aria-label="Innstillinger">${icon('gear')}</button>`;
  if (state.view === 'week' || state.view === 'dayreport') {
    $('#topbar').innerHTML = `
      <button class="icon-btn mobile-only" data-action="nav" data-view="day" aria-label="Tilbake">${icon('left')}</button>
      <h1 class="topbar-title mobile-only">${state.view === 'week' ? 'Ukessammendrag' : 'Dagsrapport'}</h1>
      ${tabs}
      <span class="spacer"></span>
      ${gear}`;
    return;
  }
  const ships = state.settings.ships;
  const sel = ships.length <= 3
    ? `<div class="segmented" role="tablist">${ships.map((s) => `
        <button role="tab" class="${s.id === ship().id ? 'on' : ''}" data-action="switch-ship" data-ship="${s.id}">
          ${esc(s.name)}${s.hull ? `<small>${esc(s.hull)}</small>` : ''}
        </button>`).join('')}</div>`
    : `<select class="ship-select" data-change="ship-select">${ships.map((s) =>
        `<option value="${s.id}" ${s.id === ship().id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
  $('#topbar').innerHTML = `
    <button class="icon-btn mobile-only" data-action="nav" data-view="week" aria-label="Ukessammendrag">${icon('calendar')}</button>
    ${tabs}
    ${sel}
    ${gear}`;
}

let renderToken = 0;
async function render() {
  const token = ++renderToken;
  if (state.view !== 'settings') state.homeView = state.view;
  renderTopbar();
  const html = await VIEWS[state.view]();
  if (token !== renderToken) return;
  const main = $('#main');
  main.classList.toggle('wide', state.view === 'week' || state.view === 'dayreport');
  main.innerHTML = html;
  hydrateThumbs(main);
  if (state.view === 'week') renderWeekFeed();
}

function entryCard(e, { showShip = false } = {}) {
  const loc = fmtLoc(e.location);
  const ids = e.photoIds || [];
  const sh = showShip ? state.settings.ships.find((s) => s.id === e.shipId) : null;
  return `
  <article class="entry" data-action="edit" data-id="${e.id}" tabindex="0">
    <div class="entry-top">
      <time>${esc(e.time || '')}</time>
      ${sh ? `<span class="ship-badge">${esc(sh.name)}</span>` : ''}
      ${e.company ? `<span class="company-badge">${esc(e.company)}</span>` : ''}
      ${loc ? `<span class="loc">${icon('pin')}${esc(loc)}</span>` : ''}
    </div>
    ${e.text ? `<p class="entry-text">${esc(e.text)}</p>` : '<p class="entry-text muted">Uten notat</p>'}
    ${ids.length ? `<div class="thumbs">${ids.slice(0, 6).map((id, i) =>
      `<img data-photo="${id}" data-action="view-photo" data-entry="${e.id}" data-index="${i}" alt="Bilde ${i + 1}" loading="lazy">`).join('')}
      ${ids.length > 6 ? `<span class="more">+${ids.length - 6}</span>` : ''}</div>` : ''}
  </article>`;
}

const VIEWS = {
  async day() {
    if (!sync.canUseFolder()) state.pending = await sync.pendingCount();
    const entries = (await entriesFor(ship().id, state.date))
      .sort((a, b) => (b.time || '').localeCompare(a.time || '') || (b.createdAt || 0) - (a.createdAt || 0));
    const isToday = state.date === today();
    const nPhotos = entries.reduce((n, e) => n + (e.photoIds?.length || 0), 0);
    return `
    <section class="view">
      <div class="daybar">
        <button class="icon-btn" data-action="day-step" data-step="-1" aria-label="Forrige dag">${icon('left')}</button>
        <label class="daypick">
          <span class="daypick-label">${isToday ? 'I dag' : 'Tidligere dag'}</span>
          <span class="daypick-date">${cap(fmtLong(state.date))}</span>
          <input type="date" value="${state.date}" max="${today()}" data-change="pick-date" aria-label="Velg dato">
        </label>
        <button class="icon-btn" data-action="day-step" data-step="1" aria-label="Neste dag" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
      </div>
      ${isToday ? '' : `<button class="btn small ghost back-today" data-action="goto-today">${icon('history')} Tilbake til i dag</button>`}

      ${!sync.canUseFolder() && state.pending ? `<button class="sendbar" data-action="send-onedrive">${icon('cloud')}<span><b>${state.pending}</b> ${state.pending === 1 ? 'endring' : 'endringer'} ikke sendt til OneDrive</span><b class="sendbar-go">Send</b></button>` : ''}

      <div class="quick">
        <button class="btn primary big" data-action="quick-photo">${icon('camera')} Ta bilde</button>
        <button class="btn big" data-action="new-entry">${icon('pen')} Skriv notat</button>
      </div>

      ${crewBar(ship(), await getCrew(ship().id, state.date))}

      <div class="daystats-row">
        <p class="muted small daystats">${entries.length ? `${entries.length} ${entries.length === 1 ? 'registrering' : 'registreringer'} · ${nPhotos} ${nPhotos === 1 ? 'bilde' : 'bilder'}` : ''}</p>
        <button class="btn small ghost" data-action="nav" data-view="dayreport">${icon('report')} Dagsrapport</button>
      </div>

      <div class="list">
        ${entries.length ? entries.map(entryCard).join('') : `
          <div class="empty">
            ${icon('camera', 'empty-ico')}
            <p><b>Ingenting registrert ${isToday ? 'i dag' : 'denne dagen'}.</b></p>
            <p class="muted">Trykk «Ta bilde» når du ser noe, og skriv et par ord om det.</p>
          </div>`}
      </div>
    </section>
    <button class="fab" data-action="quick-photo" aria-label="Ta bilde">${icon('camera')}</button>`;
  },

  async week() {
    const start = state.weekStart;
    const days = weekDays(start);
    const end = days[6];
    const data = await weekData(start);
    state.weekCache = data;
    const total = data.reduce((n, s) => n + s.entries.length, 0);
    const isThisWeek = start === mondayOf(today());
    const rsh = reportShip();
    const saved = (await db.get('meta', `summary:${rsh.id}:${start}`))?.text || '';
    const rTotal = data.find((x) => x.ship.id === rsh.id)?.entries.length || 0;
    const hasKey = !!summary.getApiKey();

    // Bilder i uka (nyeste først) til bildeoversikten
    const photos = data.flatMap((s) => s.entries.flatMap((e) => e.photoIds.map((id) => ({ id, e }))))
      .sort((a, b) => (b.e.date + b.e.time).localeCompare(a.e.date + a.e.time));
    state.weekPhotoOrder = photos.map((p) => p.id);

    // Mest brukte steder
    const tally = (key) => {
      const m = new Map();
      data.forEach((s) => s.entries.forEach((e) => { const v = e.location?.[key]; if (v) m.set(v, (m.get(v) || 0) + 1); }));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    };
    const tallyList = (title, rows, prefix = '') => `
      <div><h3>${title}</h3>${rows.length
        ? `<ul class="tally">${rows.map(([v, n]) => `<li><span>${esc(prefix + v)}</span><b>${n}</b></li>`).join('')}</ul>`
        : '<p class="muted small">Ingen registrert</p>'}</div>`;

    return `
    <section class="view">
      <div class="daybar">
        <button class="icon-btn" data-action="week-step" data-step="-7" aria-label="Forrige uke">${icon('left')}</button>
        <div class="daypick static">
          <span class="daypick-label">${isThisWeek ? 'Denne uka' : 'Uke'}</span>
          <span class="daypick-date">Uke ${isoWeek(start)} · ${parseISODate(start).getDate()}.${parseISODate(start).getMonth() + 1}. – ${fmtNum(end)}</span>
        </div>
        <button class="icon-btn" data-action="week-step" data-step="7" aria-label="Neste uke" ${isThisWeek ? 'disabled' : ''}>${icon('right')}</button>
      </div>

      <div class="week-grid">
        <aside class="week-side">
          ${sync.canUseFolder() ? oneDriveCard() : ''}
          <div class="card summary-card">
            <h2>${icon('sparkle')} Ukesrapport til Marine Manager</h2>
            ${shipChips()}
            <p class="muted small">På engelsk · ${esc(rsh.name)} · ${rTotal} ${rTotal === 1 ? 'registrering' : 'registreringer'} denne uka</p>
            <div class="mm-title"><span class="muted small">Tittel</span><b>${esc(mmWeekTitle(rsh, start))}</b>
              <button class="btn small ghost" data-action="copy-title" data-title="${esc(mmWeekTitle(rsh, start))}" aria-label="Kopier tittel">${icon('copy')}</button></div>
            <div class="row">
              <button class="btn primary" data-action="ai-summary" data-kind="week" ${state.aiBusy ? 'disabled' : ''}>${icon('sparkle')} ${state.aiBusy ? 'Lager sammendrag …' : 'Lag med AI'}</button>
              <button class="btn" data-action="copy-for-claude" data-kind="week">${icon('copy')} Kopier til Claude-appen</button>
            </div>
            ${hasKey ? '' : `<p class="muted small">«Lag med AI» krever en API-nøkkel (<a href="#" data-action="nav" data-view="settings">Innstillinger</a>). Uten nøkkel: trykk «Kopier til Claude-appen», lim inn i Claude-appen, og lim svaret inn her.</p>`}
            <textarea id="summaryText" rows="12" data-input="summary" data-key="summary:${rsh.id}:${start}" placeholder="Teksten til «Description» kommer her. Du kan rette den før du kopierer.">${esc(saved)}</textarea>
            <button class="btn big primary-outline" data-action="copy-summary">${icon('copy')} Kopier tekst</button>
          </div>

          <div class="card desktop-only">
            <h2>Ukeoversikt</h2>
            <div class="table-wrap"><table class="overview">
              <thead><tr><th></th>${days.map((d, i) => `<th class="${d === today() ? 'today' : ''}">${DAY_SHORT[i]}<small>${parseISODate(d).getDate()}.</small></th>`).join('')}<th>Sum</th></tr></thead>
              <tbody>${data.map((s) => `<tr>
                <th>${esc(s.ship.name)}</th>
                ${days.map((d) => { const n = s.entries.filter((e) => e.date === d).length; return `<td class="${n ? '' : 'zero'}">${n ? `<a href="#" data-action="open-day" data-date="${d}" data-ship="${s.ship.id}">${n}</a>` : '–'}</td>`; }).join('')}
                <td class="sum">${s.entries.length}<small>${s.photos} ${s.photos === 1 ? 'bilde' : 'bilder'}</small></td></tr>`).join('')}</tbody>
            </table></div>
            <p class="muted small">Tallene viser registreringer per dag. Klikk for å åpne dagen.</p>
          </div>

          <div class="card desktop-only">
            <h2>Mest brukte steder</h2>
            <div class="tally-grid">
              ${tallyList('Seksjon', tally('section'), 'Seksj. ')}
              ${tallyList('Dekk', tally('deck'))}
              ${tallyList('Rom', tally('room'))}
            </div>
          </div>
        </aside>

        <div class="week-main desktop-only">
          <div class="card">
            <div class="feed-head">
              <h2>Ukas registreringer</h2>
              <div class="chips">
                <button class="chip-f ${state.weekShip === 'all' ? 'on' : ''}" data-action="week-ship" data-ship="all">Alle</button>
                ${state.settings.ships.map((s) => `<button class="chip-f ${state.weekShip === s.id ? 'on' : ''}" data-action="week-ship" data-ship="${s.id}">${esc(s.name)}</button>`).join('')}
              </div>
            </div>
            <input type="search" class="feed-search" placeholder="Filtrer på tekst eller sted …" value="${esc(state.weekQuery)}" data-input="week-query">
            <div id="weekFeed"></div>
          </div>

          ${photos.length ? `<div class="card">
            <h2>Ukas bilder <span class="muted small">(${photos.length})</span></h2>
            <div class="gallery">${photos.slice(0, 48).map((p, i) => `
              <img data-photo="${p.id}" data-action="view-photo" data-week="1" data-index="${i}" alt="" loading="lazy" title="${esc(fmtLoc(p.e.location))}">`).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>
    </section>`;
  },

  async dayreport() {
    const date = state.date;
    const isToday = date === today();
    const rsh = reportShip();
    const ships = await Promise.all([rsh].map(async (sh) => ({
      sh,
      crew: await getCrew(sh.id, date),
      entries: (await entriesFor(sh.id, date)).sort((a, b) => (b.time || '').localeCompare(a.time || '')),
    })));
    const saved = (await db.get('meta', `dsummary:${rsh.id}:${date}`))?.text || '';
    const hasKey = !!summary.getApiKey();
    const nEntries = ships.reduce((n, x) => n + x.entries.length, 0);
    return `
    <section class="view">
      <div class="daybar">
        <button class="icon-btn" data-action="day-step" data-step="-1" aria-label="Forrige dag">${icon('left')}</button>
        <label class="daypick">
          <span class="daypick-label">${isToday ? 'I dag' : 'Dagsrapport'}</span>
          <span class="daypick-date">${cap(fmtLong(date))}</span>
          <input type="date" value="${date}" max="${today()}" data-change="pick-date" aria-label="Velg dato">
        </label>
        <button class="icon-btn" data-action="day-step" data-step="1" aria-label="Neste dag" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
      </div>

      <div class="week-grid">
        <aside class="week-side">
          <div class="card summary-card">
            <h2>${icon('report')} Dagsrapport til Marine Manager</h2>
            ${shipChips()}
            <p class="muted small">På engelsk · ${esc(rsh.name)} · ${nEntries} ${nEntries === 1 ? 'registrering' : 'registreringer'} · gruppert per firma med bemanning</p>
            ${state.settings.reportName ? '' : '<p class="muted small">Tips: legg inn navn og stilling under Innstillinger → Rapporter, så kommer de med i hilsenen nederst.</p>'}
            <div class="row">
              <button class="btn primary" data-action="ai-summary" data-kind="day" ${state.aiBusy ? 'disabled' : ''}>${icon('sparkle')} ${state.aiBusy ? 'Lager rapport …' : 'Lag med AI'}</button>
              <button class="btn" data-action="copy-for-claude" data-kind="day">${icon('copy')} Kopier til Claude-appen</button>
            </div>
            ${hasKey ? '' : `<p class="muted small">«Lag med AI» krever en API-nøkkel (<a href="#" data-action="nav" data-view="settings">Innstillinger</a>). Uten nøkkel: «Kopier til Claude-appen», lim inn i Claude, og lim svaret inn her.</p>`}
            <textarea id="summaryText" rows="12" data-input="summary" data-key="dsummary:${rsh.id}:${date}" placeholder="Dagsrapporten kommer her. Du kan rette teksten før du kopierer.">${esc(saved)}</textarea>
            <button class="btn big primary-outline" data-action="copy-summary">${icon('copy')} Kopier dagsrapport</button>
          </div>
          ${ships.map((x) => crewTable(x.sh, x.crew)).join('')}
        </aside>

        <div class="week-main desktop-only">
          ${ships.map((x) => `<div class="card">
            <h2>${esc(x.sh.name)} <span class="muted small">(${x.entries.length})</span></h2>
            ${x.entries.length ? `<div class="list">${x.entries.map((e) => entryCard(e)).join('')}</div>` : '<p class="muted">Ingen registreringer.</p>'}
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  async settings() {
    const s = state.settings;
    let storage = '';
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      storage = `<p>Brukt på denne enheten: <b>${(est.usage / 1048576).toFixed(1)} MB</b>.</p>
        <p>${persisted ? '✅ Varig lagring er aktivert.' : '⚠️ Varig lagring er ikke bekreftet. Nettleseren kan i verste fall rydde bort data ved lite plass.'}</p>
        ${persisted ? '' : '<button class="btn" data-action="persist">Be om varig lagring</button>'}`;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return `
    <section class="view settings">
      <div class="card">
        <h2>Skip</h2>
        ${s.ships.map((sh, i) => `
          <div class="row ship-row">
            <div class="field grow"><label>Navn</label><input value="${esc(sh.name)}" data-ship-field="name" data-i="${i}"></div>
            <div class="field"><label>Byggenr.</label><input value="${esc(sh.hull)}" data-ship-field="hull" data-i="${i}" placeholder="F.eks. NB 123"></div>
          </div>`).join('')}
      </div>

      <div class="card">
        <h2>Rapporter</h2>
        <p class="muted">Brukes i hilsenen nederst i dagsrapporten («Kind regards, …»).</p>
        <div class="row">
          <div class="field grow"><label>Navn</label><input value="${esc(s.reportName || '')}" data-setting="reportName" placeholder="Ditt navn" autocomplete="name"></div>
          <div class="field"><label>Stilling</label><input value="${esc(s.reportTitle || '')}" data-setting="reportTitle" placeholder="F.eks. Site Supervisor"></div>
        </div>
      </div>

      <div class="card">
        <h2>Bilder</h2>
        <label class="check"><input type="checkbox" data-change="stamp" ${s.stampPhotos ? 'checked' : ''}> Stemple skipsnavn, dato og klokkeslett i nye bilder</label>
      </div>

      <div class="card">
        <h2>${icon('sparkle')} AI-sammendrag (valgfritt)</h2>
        ${summary.getApiKey()
          ? `<p>✅ API-nøkkel er lagt inn på denne enheten.</p>
             <button class="btn danger" data-action="remove-key">${icon('trash')} Fjern nøkkel</button>`
          : `<p class="muted">Med en egen API-nøkkel lager appen ukessammendraget direkte. Uten nøkkel kan du bruke «Kopier til Claude-appen».</p>
             <ol class="howto">
               <li>Gå til <b>console.anthropic.com</b> og opprett en konto.</li>
               <li>Under <b>Billing</b>: fyll på kreditt med kort, f.eks. 5 USD. Du kan også sette en grense for månedlig forbruk.</li>
               <li>Under <b>API Keys</b>: trykk «Create Key», kopier nøkkelen og lim den inn her.</li>
             </ol>
             <div class="row">
               <div class="field grow"><label for="apiKey">API-nøkkel</label><input id="apiKey" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false"></div>
               <button class="btn primary" data-action="save-key">${icon('key')} Lagre nøkkel</button>
             </div>`}
        <p class="muted small">Nøkkelen lagres bare på denne enheten og tas ikke med i sikkerhetskopien. Når du lager et sammendrag, sendes notatteksten (ikke bildene) til Anthropic. Hvert sammendrag koster under 1 kr.</p>
      </div>

      ${sync.canUseFolder() ? oneDriveCard(true) : await iphoneOneDriveCard()}

      <div class="card">
        <h2>Sikkerhetskopi</h2>
        <p class="muted">Ekstra kopi av alt på denne enheten, som én fil.</p>
        <div class="row">
          <button class="btn" data-action="export">${icon('download')} Eksporter</button>
          <label class="btn">${icon('upload')} Importer<input type="file" accept="application/json,.json" data-change="import" hidden></label>
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
            <li><b>iPhone:</b> åpne i Safari → Del-knappen → «Legg til på Hjem-skjerm».</li>
            <li><b>PC (Chrome/Edge):</b> klikk installer-ikonet i adressefeltet.</li>
          </ul>
          ${isIOS ? '<p class="muted">På iPhone må appen åpnes i Safari for å kunne installeres.</p>' : ''}`}
      </div>

      <p class="muted center small">Tilsynsdagbok v${APP_VERSION}</p>
    </section>`;
  },
};

/* ------------------------------------------------------------------ */
/* Bemanning (personell per underleverandør, per skip og dag)          */
/* ------------------------------------------------------------------ */

const crewKey = (shipId, date) => `crew:${shipId}:${date}`;
const getCrew = (shipId, date) => db.get('meta', crewKey(shipId, date));
const crewRows = (c) => (c?.rows || []).filter((r) => r.company || Number(r.count));
const crewTotal = (c) => crewRows(c).reduce((n, r) => n + (Number(r.count) || 0), 0);

async function allCrewFor(shipId) {
  return (await db.getAll('meta')).filter((m) => String(m.key).startsWith(`crew:${shipId}:`));
}

/** Firmanavn brukt før (alle skip), mest brukte først. */
async function knownCompanies() {
  const n = new Map();
  (await db.getAll('meta')).filter((m) => String(m.key).startsWith('crew:'))
    .forEach((c) => crewRows(c).forEach((r) => r.company && n.set(r.company, (n.get(r.company) || 0) + 1)));
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nb')).map(([c]) => c);
}

function crewBar(sh, crew) {
  const rows = crewRows(crew);
  return `<button class="crewbar" data-action="edit-crew" data-ship="${sh.id}">
    ${icon('users')}
    <span class="crewbar-text"><b>Bemanning</b>
      <small>${rows.length ? esc(rows.map((r) => `${r.company || '?'} ${Number(r.count) || 0}`).join(' · ')) : 'Ikke registrert – trykk for å legge inn'}</small></span>
    <b class="crewbar-total">${rows.length ? crewTotal(crew) : '–'}</b>
  </button>`;
}

function crewTable(sh, crew) {
  const rows = crewRows(crew);
  return `<div class="card">
    <div class="feed-head"><h2>${icon('users')} Bemanning – ${esc(sh.name)}</h2>
      <button class="btn small" data-action="edit-crew" data-ship="${sh.id}">${icon('pen')} ${rows.length ? 'Endre' : 'Legg inn'}</button></div>
    ${rows.length ? `<table class="crew-table">
      ${rows.map((r) => `<tr><td>${esc(r.company || '–')}</td><td>${Number(r.count) || 0}</td></tr>`).join('')}
      <tr class="sum"><td>Totalt</td><td>${crewTotal(crew)}</td></tr></table>`
      : '<p class="muted">Ikke registrert.</p>'}
  </div>`;
}

const crewRowHtml = (r = { company: '', count: '' }) => `
  <div class="crew-row">
    <input class="crew-company" list="dl-companies" value="${esc(r.company)}" placeholder="Firma" autocomplete="off">
    <div class="stepper">
      <button type="button" class="icon-btn" data-action="crew-step" data-step="-1" aria-label="Færre">${icon('minus')}</button>
      <input class="crew-count" type="number" inputmode="numeric" min="0" step="1" value="${r.count === '' ? '' : Number(r.count) || 0}" placeholder="0">
      <button type="button" class="icon-btn" data-action="crew-step" data-step="1" aria-label="Flere">${icon('plus')}</button>
    </div>
    <button type="button" class="icon-btn crew-del" data-action="crew-del" aria-label="Fjern">${icon('x')}</button>
  </div>`;

async function openCrewSheet(shipId) {
  const sh = state.settings.ships.find((s) => s.id === shipId) || ship();
  const date = state.date;
  const crew = await getCrew(sh.id, date);
  const prev = (await allCrewFor(sh.id)).filter((c) => c.date < date && crewRows(c).length).sort((a, b) => b.date.localeCompare(a.date))[0];
  const companies = await knownCompanies();
  const rows = crewRows(crew);
  state.crewEdit = { shipId: sh.id, date, prev };
  const dlg = $('#sheet');
  dlg.innerHTML = `
    <div class="sheet crew-sheet">
      <h2>${icon('users')} Bemanning – ${esc(sh.name)}</h2>
      <p class="muted">${cap(fmtLong(date))}</p>
      ${prev && !rows.length ? `<button class="chip" data-action="crew-prev">Samme som ${fmtNum(prev.date)} (${crewTotal(prev)} personer)</button>` : ''}
      <div id="crewRows">${(rows.length ? rows : [{ company: '', count: '' }]).map(crewRowHtml).join('')}</div>
      <datalist id="dl-companies">${companies.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      <button class="btn small" data-action="crew-add">${icon('plus')} Legg til firma</button>
      <p class="crew-total">Totalt om bord: <b id="crewTotal">0</b></p>
      <div class="row">
        <button class="btn ghost" data-action="close-sheet">Avbryt</button>
        <button class="btn primary grow-btn" data-action="crew-save">Lagre</button>
      </div>
    </div>`;
  updateCrewTotal();
  if (!dlg.open) dlg.showModal();
}

function updateCrewTotal() {
  const el = $('#crewTotal');
  if (el) el.textContent = $$('#crewRows .crew-count').reduce((n, i) => n + (Number(i.value) || 0), 0);
}

async function saveCrew() {
  const ed = state.crewEdit;
  if (!ed) return;
  const rows = $$('#crewRows .crew-row').map((r) => ({
    company: $('.crew-company', r).value.trim(),
    count: Math.max(0, Math.round(Number($('.crew-count', r).value) || 0)),
  })).filter((r) => r.company || r.count);
  await db.put('meta', { key: crewKey(ed.shipId, ed.date), shipId: ed.shipId, date: ed.date, rows, updatedAt: Date.now() });
  state.crewEdit = null;
  $('#sheet').close();
  toast(rows.length ? `Bemanning lagret: ${rows.reduce((n, r) => n + r.count, 0)} personer` : 'Bemanning fjernet');
  afterLocalChange();
  render();
}

/* ------------------------------------------------------------------ */
/* Uke: data, liste og sammendrag                                      */
/* ------------------------------------------------------------------ */

/** Alle registreringer i uka, per skip, kronologisk. */
async function weekData(start) {
  const days = weekDays(start);
  return Promise.all(state.settings.ships.map(async (s) => {
    const perDay = await Promise.all(days.map((d) => entriesFor(s.id, d)));
    const entries = perDay.flat().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || (a.createdAt || 0) - (b.createdAt || 0));
    return { ship: s, entries, photos: entries.reduce((n, e) => n + e.photoIds.length, 0) };
  }));
}

function renderWeekFeed() {
  const box = $('#weekFeed');
  if (!box || !state.weekCache) return;
  const q = state.weekQuery.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  const list = state.weekCache
    .filter((s) => state.weekShip === 'all' || s.ship.id === state.weekShip)
    .flatMap((s) => s.entries)
    .filter((e) => {
      if (!words.length) return true;
      const hay = `${e.text} ${fmtLoc(e.location)}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  if (!list.length) {
    box.innerHTML = `<p class="muted">${words.length ? 'Ingen treff.' : 'Ingen registreringer denne uka.'}</p>`;
    return;
  }
  let html = '';
  let last = '';
  for (const e of list) {
    if (e.date !== last) { html += `<h3 class="feed-day">${cap(fmtLong(e.date))}</h3>`; last = e.date; }
    html += entryCard(e, { showShip: state.weekShip === 'all' });
  }
  box.innerHTML = `<div class="list">${html}</div>`;
  hydrateThumbs(box);
}

async function currentWeekNotes() {
  const sh = reportShip();
  const entries = (await Promise.all(weekDays(state.weekStart).map((d) => entriesFor(sh.id, d)))).flat()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return { text: summary.buildWeekNotes(mmWeekTitle(sh, state.weekStart), sh, entries), total: entries.length };
}

async function currentDayNotes() {
  const sh = reportShip();
  const date = state.date;
  const entries = (await entriesFor(sh.id, date)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const rows = crewRows(await getCrew(sh.id, date));
  const signOff = ['Kind regards,', state.settings.reportName, state.settings.reportTitle].filter(Boolean).join('\n');
  const label = `Daily report ${parseISODate(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
  return { text: summary.buildDayNotes(label, sh, rows, entries, signOff), total: entries.length + rows.length };
}

const notesFor = (kind) => (kind === 'day' ? currentDayNotes() : currentWeekNotes());
const summaryKey = (kind) => (kind === 'day' ? `dsummary:${reportShip().id}:${state.date}` : `summary:${reportShip().id}:${state.weekStart}`);

const saveSummaryText = debounce((key, text) => db.put('meta', { key, text, updatedAt: Date.now() }), 400);

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function generateAiSummary(kind = 'week') {
  if (state.aiBusy) return;
  if (!summary.getApiKey()) {
    toast('Legg inn API-nøkkel først');
    state.view = 'settings';
    render();
    return;
  }
  const { text, total } = await notesFor(kind);
  if (!total) { toast(kind === 'day' ? 'Ingenting registrert denne dagen' : 'Ingen registreringer denne uka'); return; }
  const box = $('#summaryText');
  if (box?.value.trim() && !confirm('Erstatte teksten som står i feltet nå?')) return;
  const key = summaryKey(kind);
  state.aiBusy = true;
  render();
  try {
    const result = await summary.summarizeWithClaude(text, kind);
    await db.put('meta', { key, text: result, updatedAt: Date.now() });
    toast(kind === 'day' ? 'Dagsrapporten er klar' : 'Sammendraget er klart');
  } catch (err) {
    console.error(err);
    alert(err.message);
  } finally {
    state.aiBusy = false;
    if (state.view === 'week' || state.view === 'dayreport') render();
  }
}

/* ------------------------------------------------------------------ */
/* OneDrive                                                            */
/* ------------------------------------------------------------------ */

const fmtLocShort = (loc) => fmtLoc(loc).replace(/\./g, '').replace(/ · /g, ' ');

function fmtWhen(ts) {
  if (!ts) return 'aldri';
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString() ? `i dag kl. ${hhmm(d)}` : `${d.toLocaleDateString('nb-NO')} kl. ${hhmm(d)}`;
}

/** PC: status og knapper for OneDrive-mappa. */
function oneDriveCard(inSettings = false) {
  const s = state.sync;
  let body;
  if (!s.root) {
    body = `<p class="muted">Velg OneDrive-mappa på denne PC-en, f.eks. <b>OneDrive\\Tilsynsdagbok</b> (lag mappa i Utforsker først).
      Appen legger bilder og Word-dagbøker der, sortert per skip og dag, og henter inn det du sender fra iPhone.</p>
      <button class="btn primary" data-action="pick-folder">${icon('folder')} Velg OneDrive-mappe</button>`;
  } else if (s.perm !== 'granted') {
    body = `<p>${icon('folder')} <b>${esc(s.root.name)}</b></p>
      <p class="muted">Nettleseren vil at du bekrefter tilgangen til mappa.</p>
      <button class="btn primary" data-action="connect-folder">${icon('folder')} Koble til «${esc(s.root.name)}»</button>`;
  } else {
    body = `<p class="sync-line">${icon('folder')} <b>${esc(s.root.name)}</b> · ${s.running ? esc(s.msg || 'Synkroniserer …') : `synkronisert ${fmtWhen(s.lastAt)}`}</p>
      ${s.error ? `<p class="error">${esc(s.error)}</p>` : ''}
      <div class="row">
        <button class="btn" data-action="sync-now" ${s.running ? 'disabled' : ''}>${icon('refresh')} Synkroniser nå</button>
        ${inSettings ? '<button class="btn ghost" data-action="pick-folder">Bytt mappe</button>' : ''}
      </div>`;
  }
  return `<div class="card onedrive-card" id="oneDriveCard" data-settings="${inSettings ? 1 : 0}">
    <h2>${icon('cloud')} OneDrive</h2>${body}
    ${inSettings ? `<p class="muted small">Fra iPhone: «Send til OneDrive» → «Arkiver i Filer» → <b>${esc(s.root?.name || 'Tilsynsdagbok')} → Innboks</b>.
      Appen her henter det inn automatisk når den er åpen (sjekker hvert 2. minutt).</p>` : ''}
  </div>`;
}

function refreshSyncCard() {
  const el = $('#oneDriveCard');
  if (el) el.outerHTML = oneDriveCard(el.dataset.settings === '1');
}

/** iPhone: status og forklaring. */
async function iphoneOneDriveCard() {
  const pending = await sync.pendingCount();
  const last = (await db.get('meta', 'lastSent'))?.at;
  return `<div class="card">
    <h2>${icon('cloud')} OneDrive</h2>
    <p>${pending ? `<b>${pending}</b> ${pending === 1 ? 'endring er' : 'endringer er'} ikke sendt.` : '✅ Alt er sendt.'} <span class="muted">Sist sendt ${fmtWhen(last)}.</span></p>
    <button class="btn primary" data-action="send-onedrive" ${pending ? '' : 'disabled'}>${icon('cloud')} Send til OneDrive</button>
    <ol class="howto">
      <li>Trykk «Send til OneDrive» og så «Åpne del-meny».</li>
      <li>Velg <b>«Arkiver i Filer»</b> → <b>OneDrive</b> → <b>Tilsynsdagbok</b> → <b>Innboks</b> → «Arkiver». iPhone husker mappa til neste gang.</li>
      <li>PC-appen henter inn og sorterer alt automatisk når den er åpen.</li>
    </ol>
    <p class="muted small">Krever OneDrive-appen på iPhone, og at mappa er valgt i PC-appen først (da lages Innboks-mappa).</p>
    <button class="btn small ghost" data-action="resend-all">Send alt på nytt neste gang</button>
  </div>`;
}

let preparedBundle = null;

/** iPhone steg 1: pakk (kan ta litt tid). Steg 2 (eget trykk): åpne del-menyen. */
async function prepareSend() {
  toast('Pakker …');
  preparedBundle = await sync.buildBundle(state.settings);
  if (!preparedBundle.count) { toast('Alt er allerede sendt'); return; }
  const mb = (preparedBundle.blob.size / 1048576).toLocaleString('nb-NO', { maximumFractionDigits: 1 });
  const dlg = $('#sheet');
  dlg.innerHTML = `
    <div class="sheet">
      <h2>${icon('cloud')} Send til OneDrive</h2>
      <p><b>${preparedBundle.count}</b> ${preparedBundle.count === 1 ? 'endring' : 'endringer'} er klar til sending (${mb} MB).</p>
      <ol class="howto">
        <li>Trykk «Åpne del-meny».</li>
        <li>Velg <b>«Arkiver i Filer»</b>.</li>
        <li>Velg <b>OneDrive</b> (den samme som PC-en bruker, f.eks. «OneDrive – Hagland») → <b>Tilsynsdagbok → Innboks</b> og trykk «Arkiver».</li>
      </ol>
      <button class="btn primary big" data-action="share-bundle">${icon('cloud')} Åpne del-meny</button>
      <button class="btn ghost" data-action="close-sheet">Avbryt</button>
    </div>`;
  if (!dlg.open) dlg.showModal();
}

async function shareBundle() {
  if (!preparedBundle) return;
  try {
    if (!(await sync.shareBundle(preparedBundle))) return; // avbrutt – prøv igjen
    await sync.markSent(preparedBundle);
    preparedBundle = null;
    $('#sheet').close();
    toast('Sendt til OneDrive');
    render();
  } catch (err) {
    console.error(err);
    alert(`Deling mislyktes: ${err.message}`);
  }
}

/** PC: les Innboks og skriv ut endrede dager. */
async function runSync({ quiet = false } = {}) {
  const s = state.sync;
  if (!s.root || s.perm !== 'granted' || s.running) return;
  s.running = true;
  s.error = '';
  s.msg = 'Synkroniserer …';
  refreshSyncCard();
  try {
    const shipsBefore = JSON.stringify(state.settings.ships);
    const res = await sync.syncFolder(state.settings, {
      fmtLoc, fmtLocShort, fmtLong: (d) => cap(fmtLong(d)),
      onProgress: (m) => { s.msg = m; refreshSyncCard(); },
    });
    if (JSON.stringify(state.settings.ships) !== shipsBefore) await saveSettings();
    s.lastAt = Date.now();
    if (res.imported) {
      toast(`Hentet ${res.imported} ${res.imported === 1 ? 'sending' : 'sendinger'} fra iPhone`);
      if (!editorEl().open && !document.activeElement?.matches('textarea, input')) render();
    } else if (!quiet) {
      toast(res.days ? `Oppdaterte ${res.days} ${res.days === 1 ? 'dag' : 'dager'} i OneDrive` : 'Alt er oppdatert');
    }
  } catch (err) {
    console.error(err);
    s.error = err.message;
    s.perm = await sync.permission(s.root).catch(() => 'prompt');
  } finally {
    s.running = false;
    s.msg = '';
    refreshSyncCard();
  }
}

let syncTimer;
const afterLocalChange = () => { clearTimeout(syncTimer); syncTimer = setTimeout(() => runSync({ quiet: true }), 3000); };

async function initSync() {
  if (!sync.canUseFolder()) return;
  const s = state.sync;
  s.root = await sync.getRoot();
  s.lastAt = (await db.get('meta', 'lastSync'))?.at || 0;
  if (s.root) s.perm = await sync.permission(s.root).catch(() => 'prompt');
  refreshSyncCard();
  runSync({ quiet: true });
  setInterval(() => { if (document.visibilityState === 'visible') runSync({ quiet: true }); }, 120000);
  window.addEventListener('focus', () => runSync({ quiet: true }));
}

/* ------------------------------------------------------------------ */
/* Redigering av registrering                                          */
/* ------------------------------------------------------------------ */

const editorEl = () => $('#editor');

/** Tidligere brukte verdier per stedsfelt (til forslag), og sist brukte sted. */
async function locationHints(shipId = ship().id) {
  const all = (await db.getAllBy('entries', 'shipId', shipId)).map(normalize);
  const hints = {};
  LOC_FIELDS.forEach((f) => {
    const set = new Set(all.map((e) => e.location?.[f.key]).filter(Boolean));
    f.defaults.forEach((d) => set.add(d));
    hints[f.key] = [...set].sort((a, b) => a.localeCompare(b, 'nb', { numeric: true }));
  });
  const last = all.filter((e) => hasLoc(e.location))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time) || (b.createdAt || 0) - (a.createdAt || 0))[0];
  return { hints, last: last?.location || null };
}

async function openEditor(entry, opts = {}) {
  const isNew = !entry;
  const e = entry ? normalize({ ...entry, location: { ...emptyLoc(), ...(entry.location || {}) } }) : {
    id: uid(), shipId: ship().id, date: state.date, time: hhmm(new Date()),
    text: '', location: emptyLoc(), photoIds: [], createdAt: Date.now(),
  };
  if (opts.restore) Object.assign(e, opts.restore.entry);
  const removed = opts.restore?.removed || [];
  const added = opts.restore?.added || [];

  // Hent bilder: lagrede + evt. bilder lagt til i et utkast som ble avbrutt
  const stored = await db.getAllBy('photos', 'entryId', e.id);
  const byId = new Map(stored.map((p) => [p.id, p]));
  const order = [...e.photoIds, ...stored.map((p) => p.id).filter((id) => !e.photoIds.includes(id))];
  const photos = order.filter((id) => byId.has(id) && !removed.includes(id)).map((id) => byId.get(id));

  state.draft = { entry: e, isNew: opts.restore ? opts.restore.isNew : isNew, photos, removed, added, dirty: !!opts.restore, origShipId: entry?.shipId || e.shipId };
  renderEditor({ ...(await locationHints(e.shipId)), companies: await editorCompanies(e) });
  const dlg = editorEl();
  if (!dlg.open) dlg.showModal();
  $('.ed-body', dlg).scrollTop = 0;
  if (opts.files?.length) await addFilesToDraft(opts.files);
  if (!opts.files?.length && isNew && !opts.restore) setTimeout(() => $('[name=text]', dlg)?.focus(), 50);
}

/** Firma til redigeringen: dagens bemanning som knapper, alle kjente firma som forslag. */
async function editorCompanies(e) {
  const today = crewRows(await getCrew(e.shipId, e.date)).map((r) => r.company).filter(Boolean);
  const used = (await db.getAllBy('entries', 'shipId', e.shipId)).map((x) => x.company).filter(Boolean);
  const all = [...new Set([...today, ...(await knownCompanies()), ...used])];
  const chips = today.length ? today : all.slice(0, 6);
  return { chips, all };
}

function renderEditor({ hints, last, companies }) {
  const d = state.draft;
  const e = d.entry;
  const showLast = d.isNew && last && !hasLoc(e.location);
  state.lastLoc = last;
  editorEl().innerHTML = `
  <form class="editor" data-editor onsubmit="return false">
    <header class="ed-head">
      <button type="button" class="btn ghost" data-action="close-editor">Avbryt</button>
      <h2>${d.isNew ? 'Ny registrering' : 'Rediger'}</h2>
      <button type="button" class="btn primary" data-action="save-entry">Lagre</button>
    </header>
    <div class="ed-body">
      <div class="ed-photos" id="edPhotos"></div>
      <div class="row photo-btns">
        <label class="btn">${icon('camera')} Ta bilde<input type="file" accept="image/*" capture="environment" data-change="add-photos" hidden></label>
        <label class="btn">${icon('image')} Fra galleri<input type="file" accept="image/*" multiple data-change="add-photos" hidden></label>
      </div>
      <p class="muted small desktop-hint">Tips: dra bilder inn hit, eller lim inn med Ctrl+V.</p>

      <div class="field">
        <label for="f-text">Notat</label>
        <textarea id="f-text" name="text" rows="4" placeholder="Hva skjer? F.eks. «Montering av hovedmotor pågår. Fundament godkjent.»">${esc(e.text)}</textarea>
      </div>

      <div class="field">
        <label for="f-company">Firma / underleverandør <span class="muted">(valgfritt)</span></label>
        ${companies.chips.length ? `<div class="chips company-chips">${companies.chips.map((c) => `<button type="button" class="chip-f ${c === e.company ? 'on' : ''}" data-action="pick-company" data-company="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
        <input id="f-company" name="company" value="${esc(e.company)}" list="dl-company" placeholder="Hvem gjelder notatet?" autocomplete="off">
        <datalist id="dl-company">${companies.all.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      </div>

      <fieldset class="locbox">
        <legend>${icon('pin')} Sted om bord</legend>
        ${showLast ? `<button type="button" class="chip last-loc" data-action="use-last-loc">Samme som sist: ${esc(fmtLoc(last))}</button>` : ''}
        <div class="loc-grid">
          ${LOC_FIELDS.map((f) => `
            <div class="field">
              <label for="f-${f.key}">${f.label}</label>
              <input id="f-${f.key}" name="loc-${f.key}" value="${esc(e.location[f.key])}" placeholder="${f.ph}" list="dl-${f.key}" autocomplete="off" enterkeyhint="next">
              <datalist id="dl-${f.key}">${hints[f.key].map((v) => `<option value="${esc(v)}">`).join('')}</datalist>
            </div>`).join('')}
        </div>
      </fieldset>

      <div class="row">
        <div class="field"><label for="f-ship">Skip</label>
          <select id="f-ship" name="shipId">${state.settings.ships.map((s) => `<option value="${s.id}" ${s.id === e.shipId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-date">Dato</label><input id="f-date" type="date" name="date" value="${e.date}"></div>
        <div class="field"><label for="f-time">Klokkeslett</label><input id="f-time" type="time" name="time" value="${e.time}"></div>
      </div>

      <div class="ed-footer">
        <button type="button" class="btn big primary-outline" data-action="save-and-photo">${icon('camera')} Lagre og ta neste bilde</button>
        ${d.isNew ? '' : `<button type="button" class="btn danger" data-action="delete-entry">${icon('trash')} Slett</button>`}
      </div>
    </div>
    <div class="drop-hint">Slipp bildene her</div>
  </form>`;
  renderEditorPhotos();
}

function renderEditorPhotos() {
  const box = $('#edPhotos');
  if (!box) return;
  const d = state.draft;
  box.innerHTML = d.photos.map((p, i) => `
    <div class="ed-photo">
      <img data-photo="${p.id}" data-action="view-photo" data-draft="1" data-index="${i}" alt="">
      <button type="button" class="ed-photo-x" data-action="remove-photo" data-id="${p.id}" aria-label="Fjern bilde">${icon('x')}</button>
    </div>`).join('');
  box.hidden = d.photos.length === 0;
  hydrateThumbs(box);
}

function collectDraft() {
  const d = state.draft;
  const f = $('[data-editor]', editorEl());
  if (!d || !f) return;
  const e = d.entry;
  e.text = f.elements.text.value;
  e.date = f.elements.date.value || state.date;
  if (f.elements.shipId?.value) e.shipId = f.elements.shipId.value;
  e.time = f.elements.time.value || hhmm(new Date());
  LOC_FIELDS.forEach((lf) => { e.location[lf.key] = f.elements[`loc-${lf.key}`].value.trim(); });
  e.company = f.elements.company.value.trim();
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
      // Lagres med en gang, så bildet ikke går tapt om iPhone lukker appen mens kameraet er åpent.
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

async function saveEntry({ quiet = false } = {}) {
  const d = state.draft;
  if (!d) return false;
  collectDraft();
  const e = d.entry;
  if (!e.text.trim() && d.photos.length === 0) {
    toast('Skriv et notat eller ta et bilde');
    return false;
  }
  e.photoIds = d.photos.map((p) => p.id);
  e.updatedAt = Date.now();
  const photos = d.photos.map((p) => ({ ...p, entryId: e.id, shipId: e.shipId, date: e.date }));
  await db.saveEntry(e, photos, d.removed);
  d.removed.forEach(forgetThumb);
  clearDraftLocal();
  state.draft = null;
  editorEl().close();
  if (state.view === 'day' && e.date !== state.date) state.date = e.date;
  const moved = !d.isNew && e.shipId !== d.origShipId;
  if (moved) toast(`Flyttet til ${state.settings.ships.find((s) => s.id === e.shipId)?.name || 'annet skip'}`);
  else if (!quiet) toast('Lagret');
  requestPersist();
  afterLocalChange();
  render();
  return true;
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
  if (d?.dirty && !confirm('Forkaste denne registreringen/endringene?')) return;
  await discardDraft();
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
  const e = normalize(await db.get('entries', p.entryId));
  if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
  lightboxUrl = URL.createObjectURL(p.blob);
  const caption = e
    ? [`kl. ${esc(e.time)}`, esc(fmtLoc(e.location)), esc((e.text || '').split('\n')[0].slice(0, 80))].filter(Boolean).join(' · ')
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
/* Sikkerhetskopi (midlertidig, til OneDrive er på plass)              */
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
  const parts = [`{"app":"tilsynsdagbok","version":2,"exportedAt":${JSON.stringify(new Date().toISOString())},`,
    `"meta":${JSON.stringify(meta)},"entries":${JSON.stringify(entries)},"photos":[`];
  let first = true;
  for (const id of photoKeys) {
    const p = await db.get('photos', id);
    const { blob, thumb, ...rest } = p;
    parts.push((first ? '' : ',') + JSON.stringify({ ...rest, blob: await blobToB64(blob), thumb: thumb ? await blobToB64(thumb) : null }));
    first = false;
  }
  parts.push(']}');
  const now = new Date();
  downloadBlob(new Blob(parts, { type: 'application/json' }),
    `tilsynsdagbok_${toISODate(now)}_${pad2(now.getHours())}${pad2(now.getMinutes())}.json`);
}

async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('Ugyldig fil'); return; }
  if (data?.app !== 'tilsynsdagbok') { toast('Filen er ikke en sikkerhetskopi fra Tilsynsdagbok'); return; }
  if (!confirm(`Importere ${data.entries?.length || 0} registreringer og ${data.photos?.length || 0} bilder?\nNyeste versjon av hver registrering beholdes.`)) return;
  if (!data.settings) data.settings = (data.meta || []).find((m) => m.key === 'settings')?.value;
  await sync.applyBundle(data, state.settings);
  await saveSettings();
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

const openCamera = () => $('#quickCamera').click();

const ACTIONS = {
  nav: (el, ev) => { ev?.preventDefault?.(); state.view = el.dataset.view; window.scrollTo(0, 0); render(); },
  'switch-ship': async (el) => { state.settings.activeShip = el.dataset.ship; state.reportShip = null; await saveSettings(); render(); },
  'day-step': (el) => { const d = addDays(state.date, Number(el.dataset.step)); if (d <= today()) { state.date = d; render(); } },
  'goto-today': () => { state.date = today(); render(); },
  'week-step': (el) => {
    const s = addDays(state.weekStart, Number(el.dataset.step));
    if (s <= mondayOf(today())) { state.weekStart = s; render(); }
  },
  'week-ship': (el) => {
    state.weekShip = el.dataset.ship;
    $$('[data-action=week-ship]').forEach((b) => b.classList.toggle('on', b === el));
    renderWeekFeed();
  },
  'open-day': async (el, ev) => {
    ev.preventDefault();
    state.settings.activeShip = el.dataset.ship;
    await saveSettings();
    state.date = el.dataset.date;
    state.view = 'day';
    render();
  },
  'ai-summary': (el) => generateAiSummary(el.dataset.kind),
  'send-onedrive': () => prepareSend(),
  'edit-crew': (el) => openCrewSheet(el.dataset.ship),
  'report-ship': (el) => { state.reportShip = el.dataset.ship; render(); },
  'copy-title': async (el) => { toast(await copyText(el.dataset.title) ? 'Tittel kopiert' : 'Kunne ikke kopiere'); },
  'pick-company': (el) => {
    const input = $('#f-company');
    const same = input.value === el.dataset.company;
    input.value = same ? '' : el.dataset.company;
    $$('.company-chips .chip-f', editorEl()).forEach((b) => b.classList.toggle('on', !same && b === el));
    saveDraftLocal();
  },
  'crew-add': () => {
    $('#crewRows').insertAdjacentHTML('beforeend', crewRowHtml());
    $('#crewRows .crew-row:last-child .crew-company').focus();
  },
  'crew-del': (el) => {
    el.closest('.crew-row').remove();
    if (!$('#crewRows .crew-row')) $('#crewRows').insertAdjacentHTML('beforeend', crewRowHtml());
    updateCrewTotal();
  },
  'crew-step': (el) => {
    const input = $('.crew-count', el.closest('.crew-row'));
    input.value = Math.max(0, (Number(input.value) || 0) + Number(el.dataset.step));
    updateCrewTotal();
  },
  'crew-prev': (el) => {
    const prev = state.crewEdit?.prev;
    if (!prev) return;
    $('#crewRows').innerHTML = crewRows(prev).map(crewRowHtml).join('');
    el.remove();
    updateCrewTotal();
  },
  'crew-save': () => saveCrew(),
  'share-bundle': () => shareBundle(),
  'close-sheet': () => { preparedBundle = null; $('#sheet').close(); },
  'resend-all': async () => {
    if (!confirm('Merke alle registreringer som ikke sendt? Neste sending tar da med alt (PC-en hopper over det den allerede har).')) return;
    const all = await db.getAll('entries');
    await db.putMany('entries', all.map(({ sentAt, ...e }) => e));
    render();
  },
  'pick-folder': async () => {
    try {
      state.sync.root = await sync.pickRoot();
      state.sync.perm = 'granted';
      refreshSyncCard();
      runSync();
    } catch (err) {
      if (err.name !== 'AbortError') alert(`Kunne ikke bruke mappa: ${err.message}`);
    }
  },
  'connect-folder': async () => {
    state.sync.perm = await sync.permission(state.sync.root, true);
    refreshSyncCard();
    runSync();
  },
  'sync-now': () => runSync(),
  'copy-for-claude': async (el) => {
    const kind = el.dataset.kind || 'week';
    const { text, total } = await notesFor(kind);
    if (!total) { toast(kind === 'day' ? 'Ingenting registrert denne dagen' : 'Ingen registreringer denne uka'); return; }
    if (await copyText(summary.promptForChat(text, kind))) {
      alert('Notatene er kopiert.\n\n1. Åpne Claude-appen og lim inn i en ny samtale.\n2. Kopier svaret fra Claude.\n3. Lim det inn i sammendragsfeltet her (eller rett i Marine Manager).');
    } else {
      toast('Kunne ikke kopiere');
    }
  },
  'copy-summary': async () => {
    const t = $('#summaryText')?.value.trim();
    if (!t) { toast('Sammendraget er tomt'); return; }
    toast(await copyText(t) ? 'Kopiert – lim inn i Marine Manager' : 'Kunne ikke kopiere');
  },
  'save-key': () => {
    const v = $('#apiKey')?.value.trim();
    if (!v) { toast('Lim inn nøkkelen først'); return; }
    if (!v.startsWith('sk-ant-')) { toast('Nøkkelen skal starte med «sk-ant-»'); return; }
    summary.setApiKey(v);
    toast('Nøkkel lagret');
    render();
  },
  'remove-key': () => {
    if (!confirm('Fjerne API-nøkkelen fra denne enheten?')) return;
    summary.setApiKey('');
    render();
  },
  'new-entry': () => openEditor(null),
  'quick-photo': () => openCamera(),
  edit: async (el) => { const e = await db.get('entries', el.dataset.id); if (e) openEditor(e); },
  'save-entry': () => saveEntry(),
  'save-and-photo': async () => {
    // Kameraet må åpnes direkte i trykket (krav i Safari). Lagringen skjer i mellomtiden.
    const d = state.draft;
    collectDraft();
    if (!d.entry.text.trim() && d.photos.length === 0) { toast('Skriv et notat eller ta et bilde'); return; }
    openCamera();
    if (await saveEntry({ quiet: true })) toast('Lagret – ta neste bilde');
  },
  'close-editor': () => closeEditor(),
  'use-last-loc': (el) => {
    const f = $('[data-editor]', editorEl());
    LOC_FIELDS.forEach((lf) => { f.elements[`loc-${lf.key}`].value = state.lastLoc?.[lf.key] || ''; });
    el.remove();
    saveDraftLocal();
  },
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
    if (!confirm('Slette registreringen og bildene i den? Dette kan ikke angres.')) return;
    const d = state.draft;
    await sync.addTombstone(await db.get('entries', d.entry.id));
    await db.deleteEntry(d.entry.id);
    d.photos.forEach((p) => forgetThumb(p.id));
    clearDraftLocal();
    state.draft = null;
    editorEl().close();
    toast('Slettet');
    afterLocalChange();
    render();
  },
  'view-photo': async (el) => {
    const i = Number(el.dataset.index);
    if (el.dataset.draft) return openLightbox(state.draft.photos.map((p) => p.id), i);
    if (el.dataset.week) return openLightbox(state.weekPhotoOrder, i);
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
  export: () => exportBackup(),
  persist: async () => { await requestPersist(); render(); },
  install: async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    render();
  },
};

const CHANGES = {
  'pick-date': (el) => { if (el.value) { state.date = el.value > today() ? today() : el.value; render(); } },
  'ship-select': async (el) => { state.settings.activeShip = el.value; await saveSettings(); render(); },
  'add-photos': async (el) => { const files = [...el.files]; el.value = ''; await addFilesToDraft(files); },
  stamp: async (el) => { state.settings.stampPhotos = el.checked; await saveSettings(); toast('Lagret'); },
  import: async (el) => { const f = el.files[0]; el.value = ''; if (f) await importBackup(f); },
};

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
    if (el.dataset.setting) {
      state.settings[el.dataset.setting] = el.value.trim();
      saveSettings().then(() => toast('Lagret'));
    }
    if (el.dataset.shipField) {
      state.settings.ships[Number(el.dataset.i)][el.dataset.shipField] = el.value.trim();
      state.settings.shipsUpdatedAt = Date.now();
      saveSettings().then(() => toast('Lagret'));
    }
  });

  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.closest('[data-editor]')) saveDraftLocal();
    if (el.dataset.input === 'summary') saveSummaryText(el.dataset.key, el.value);
    if (el.classList.contains('crew-count')) updateCrewTotal();
    if (el.dataset.input === 'week-query') { state.weekQuery = el.value; renderWeekFeed(); }
  });

  // «Ta bilde» fra hovedskjermen → ny registrering med bildet
  $('#quickCamera').addEventListener('change', async (ev) => {
    const files = [...ev.target.files];
    ev.target.value = '';
    if (files.length) await openEditor(null, { files });
  });

  editorEl().addEventListener('cancel', (ev) => { ev.preventDefault(); closeEditor(); });
  $('#lightbox').addEventListener('cancel', (ev) => { ev.preventDefault(); closeLightbox(); });
  $('#lightbox').addEventListener('click', (ev) => { if (ev.target.matches('.lb')) closeLightbox(); });

  // PC: dra og slipp / lim inn bilder
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

  // Hopp til ny dag hvis appen står åpen over midnatt
  let lastToday = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const t = today();
    if (t !== lastToday) {
      if (state.date === lastToday) state.date = t;
      if (state.weekStart === mondayOf(lastToday)) state.weekStart = mondayOf(t);
      lastToday = t;
      if (!editorEl().open) render();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Oppstart                                                            */
/* ------------------------------------------------------------------ */

async function init() {
  await loadSettings();
  if (isDesktop()) state.view = 'week'; // PC: start på ukeoversikten
  bindEvents();
  await render();

  // Gjenopprett registrering som ikke ble lagret (f.eks. hvis iPhone lukket appen mens kameraet var åpent)
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* ignorer */ }
  if (draft?.entry) {
    if (state.settings.ships.some((s) => s.id === draft.entry.shipId)) state.settings.activeShip = draft.entry.shipId;
    const existing = draft.isNew ? null : await db.get('entries', draft.entry.id);
    renderTopbar();
    await openEditor(existing, { restore: draft });
    toast('Ulagret registrering ble gjenopprettet');
  }

  initSync();

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
