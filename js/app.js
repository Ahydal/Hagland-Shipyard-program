import * as db from './db.js';
import * as summary from './summary.js';
import * as sync from './sync.js';

const APP_VERSION = '3.8.0';

/* ------------------------------------------------------------------ */
/* Konstanter                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = {
  ships: [
    { id: 'skip1', name: 'Newbuild 1', hull: '' },
    { id: 'skip2', name: 'Newbuild 2', hull: '' },
  ],
  activeShip: 'skip1',
  stampPhotos: false,
  reportName: '',
  reportTitle: '',
  lists: {}, // faste lister per type og skip: { room: { skip1: ['DB 1 PS', ...] }, section: {...}, equipment: {...} }
  parties: ['Class', 'Owner', 'Yard', 'Paint supplier'], // hvem som deltar på inspeksjoner
};

// Plassering om bord. Forslagene lærer av det du har skrevet før.
const LOC_FIELDS = [
  { key: 'section', label: 'Section', ph: 'e.g. 210', defaults: [] },
  { key: 'frame', label: 'Frame', ph: 'e.g. 42–45', defaults: [] },
  { key: 'deck', label: 'Deck', ph: 'e.g. Deck 2', defaults: ['Tank top', 'Deck 1', 'Deck 2', 'Deck 3', 'Main deck', 'Bridge deck'] },
  { key: 'room', label: 'Room / tank', ph: 'e.g. DB 1 PS', defaults: ['Engine room', 'Wheelhouse', 'Cargo hold', 'Pump room', 'Switchboard room', 'Workshop', 'Mess room', 'Galley', 'Cabin', 'Steering gear room'] },
  { key: 'equipment', label: 'Equipment / system', ph: 'e.g. Main engine, Hatch cover No. 2', defaults: [] },
];
const emptyLoc = () => ({ section: '', frame: '', deck: '', room: '', equipment: '' });

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
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
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
const fmtLong = (s) => parseISODate(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const safeFile = (s) => String(s).replace(/[^\wæøåÆØÅ.-]+/g, '_');
const fmtNum = (s) => parseISODate(s).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  if (loc.section) p.push(`Sec. ${loc.section}`);
  if (loc.frame) p.push(`Fr. ${loc.frame}`);
  if (loc.deck) p.push(/^\d+$/.test(loc.deck) ? `Deck ${loc.deck}` : loc.deck);
  if (loc.room) p.push(loc.room);
  if (loc.equipment) p.push(loc.equipment);
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
  galleryShip: null,
  galleryArea: 'all',
  galleryOrder: [],
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
  // Overgang: tank/rom-lister fra v3.4 («areas») inn i «lists.room»
  const st = state.settings;
  if (st.areas && !st.lists?.room) {
    st.lists = { ...(st.lists || {}), room: st.areas };
    st.listsUpdatedAt = st.areasUpdatedAt || Date.now();
  }
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the image')); };
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
      <button class="icon-btn" data-action="nav" data-view="${back}" aria-label="Back">${icon('left')}</button>
      <h1 class="topbar-title">Settings</h1>`;
    return;
  }
  const tabs = `
    <div class="topbar-name desktop-only">${icon('ship')}<span>Site Diary</span></div>
    <nav class="tabs desktop-only">
      <button class="${state.view === 'week' ? 'on' : ''}" data-action="nav" data-view="week">${icon('calendar')} Week</button>
      <button class="${state.view === 'day' ? 'on' : ''}" data-action="nav" data-view="day">${icon('camera')} Diary</button>
      <button class="${state.view === 'dayreport' ? 'on' : ''}" data-action="nav" data-view="dayreport">${icon('report')} Daily report</button>
      <button class="${state.view === 'photos' ? 'on' : ''}" data-action="nav" data-view="photos">${icon('image')} Photos</button>
    </nav>`;
  const gear = `<button class="icon-btn" data-action="nav" data-view="settings" aria-label="Settings">${icon('gear')}</button>`;
  if (state.view === 'week' || state.view === 'dayreport' || state.view === 'photos') {
    $('#topbar').innerHTML = `
      <button class="icon-btn mobile-only" data-action="nav" data-view="day" aria-label="Back">${icon('left')}</button>
      <h1 class="topbar-title mobile-only">${({ week: 'Weekly report', dayreport: 'Daily report', photos: 'Photos' })[state.view]}</h1>
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
    <button class="icon-btn mobile-only" data-action="nav" data-view="week" aria-label="Weekly report">${icon('calendar')}</button>
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
  main.classList.toggle('wide', ['week', 'dayreport', 'photos'].includes(state.view));
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
      ${inspBadge(e)}
      ${loc ? `<span class="loc">${icon('pin')}${esc(loc)}</span>` : ''}
    </div>
    ${e.text ? `<p class="entry-text">${esc(e.text)}</p>` : '<p class="entry-text muted">No note</p>'}
    ${ids.length ? `<div class="thumbs">${ids.slice(0, 6).map((id, i) =>
      `<img data-photo="${id}" data-action="view-photo" data-entry="${e.id}" data-index="${i}" alt="Photo ${i + 1}" loading="lazy">`).join('')}
      ${ids.length > 6 ? `<span class="more">+${ids.length - 6}</span>` : ''}</div>` : ''}
  </article>`;
}

/** Bilder gruppert per uke (nyeste først). items er allerede sortert nyest først. */
function photoWeeks(items) {
  const short = (d) => parseISODate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const weeks = [];
  items.forEach((x, i) => {
    const mon = mondayOf(x.e.date);
    if (!weeks.length || weeks[weeks.length - 1].mon !== mon) weeks.push({ mon, list: [] });
    weeks[weeks.length - 1].list.push({ ...x, i });
  });
  return weeks.map((w) => {
    const sun = addDays(w.mon, 6);
    return `
    <h3 class="week-head">Week ${isoWeek(w.mon)} <span class="muted">· ${short(w.mon)} – ${short(sun)} ${parseISODate(sun).getFullYear()} · ${w.list.length} ${w.list.length === 1 ? 'photo' : 'photos'}</span></h3>
    <div class="gallery big">${w.list.map((x) => `
      <figure data-action="view-photo" data-gallery="1" data-index="${x.i}">
        <img data-photo="${x.id}" alt="" loading="lazy">
        <figcaption><b>${fmtNum(x.e.date)} ${esc(x.e.time)}</b>${x.e.company ? ` · ${esc(x.e.company)}` : ''}${x.e.inspection ? ` · <span class="insp-text ${x.e.inspection.result || ''}">Inspection${x.e.inspection.result ? ` ${summary.resultLabel(x.e.inspection.result).toLowerCase()}` : ''}</span>` : ''}<br>${esc((x.e.text || '').split('\n')[0].slice(0, 90))}</figcaption>
      </figure>`).join('')}</div>`;
  }).join('');
}

const inspBadge = (e) => (e.inspection
  ? `<span class="insp-badge ${e.inspection.result || ''}">${icon('check')}Inspection${e.inspection.result ? ` · ${summary.resultLabel(e.inspection.result)}` : ''}</span>` : '');

/** Faste tanker/rom for et skip (fra Settings). */
const LISTS = {
  room: { title: 'Tanks and rooms', ph: 'DB 1 PS&#10;DB 1 SB&#10;Engine room' },
  section: { title: 'Sections', ph: '120&#10;121&#10;215' },
  equipment: { title: 'Equipment and systems', ph: 'Main engine&#10;Hatch cover No. 1&#10;Rudder&#10;BWTS' },
};
/** Fast liste (room/section/equipment) for et skip (fra Settings). */
const listFor = (kind, shipId) => state.settings.lists?.[kind]?.[shipId] || [];
const areaList = (shipId) => listFor('room', shipId);
const DIM_FIELD = { area: 'room', section: 'section', equipment: 'equipment' };

/** Overskriftslinje for et firma i dagsrapporten, f.eks. «Paint Co – 9 people on board», «Paint Co» eller «General». */
function isCompanyLine(line) {
  const t = line.trim();
  if (!t) return false;
  if (/^.{1,80}?\s[–-]\s\d+\s+(people|persons?)\s+on\s+board\.?$/i.test(t)) return true;
  if (/^general:?$/i.test(t)) return true;
  const norm = (x) => x.trim().toLowerCase();
  return (state.reportCompanies || []).some((c) => norm(c) === norm(t));
}

/** Dagsrapporten som HTML med fete firmanavn (til utklippstavle og forhåndsvisning). */
function reportHtml(text) {
  return String(text || '').replace(/\r/g, '').split('\n')
    .map((l) => (isCompanyLine(l) ? `<b>${esc(l.trim())}</b>` : esc(l)))
    .join('<br>');
}

async function copyRich(text) {
  const html = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt">${reportHtml(text)}</div>`;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })]);
    return true;
  } catch {
    return copyText(text); // nettleseren støtter ikke formatert kopi – ren tekst
  }
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
        <button class="icon-btn" data-action="day-step" data-step="-1" aria-label="Previous day">${icon('left')}</button>
        <label class="daypick">
          <span class="daypick-label">${isToday ? 'Today' : 'Earlier day'}</span>
          <span class="daypick-date">${cap(fmtLong(state.date))}</span>
          <input type="date" value="${state.date}" max="${today()}" data-change="pick-date" aria-label="Pick date">
        </label>
        <button class="icon-btn" data-action="day-step" data-step="1" aria-label="Next day" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
      </div>
      ${isToday ? '' : `<button class="btn small ghost back-today" data-action="goto-today">${icon('history')} Back to today</button>`}

      ${!sync.canUseFolder() && state.pending ? `<button class="sendbar" data-action="send-onedrive">${icon('cloud')}<span><b>${state.pending}</b> ${state.pending === 1 ? 'change' : 'changes'} not sent to OneDrive</span><b class="sendbar-go">Send</b></button>` : ''}

      <div class="quick">
        <button class="btn primary big" data-action="quick-photo">${icon('camera')} Take photo</button>
        <button class="btn big" data-action="new-entry">${icon('pen')} Write note</button>
      </div>

      ${crewBar(ship(), await getCrew(ship().id, state.date))}

      <div class="daystats-row">
        <p class="muted small daystats">${entries.length ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · ${nPhotos} ${nPhotos === 1 ? 'photo' : 'photos'}` : ''}</p>
        <span class="daystats-actions">
          ${sync.canUseFolder() ? '' : `<label class="btn small ghost">${icon('refresh')} Get from PC<input type="file" accept=".json,application/json,text/plain" data-change="import-pc" hidden></label>`}
          <button class="btn small ghost" data-action="nav" data-view="dayreport">${icon('report')} Daily report</button>
        </span>
      </div>

      <div class="list">
        ${entries.length ? entries.map(entryCard).join('') : `
          <div class="empty">
            ${icon('camera', 'empty-ico')}
            <p><b>Nothing recorded ${isToday ? 'today' : 'on this day'}.</b></p>
            <p class="muted">Tap “Take photo” when you see something, and add a few words.</p>
          </div>`}
      </div>
    </section>
    <button class="fab" data-action="quick-photo" aria-label="Take photo">${icon('camera')}</button>`;
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
        : '<p class="muted small">None recorded</p>'}</div>`;

    return `
    <section class="view">
      <div class="daybar">
        <button class="icon-btn" data-action="week-step" data-step="-7" aria-label="Previous week">${icon('left')}</button>
        <div class="daypick static">
          <span class="daypick-label">${isThisWeek ? 'This week' : 'Week'}</span>
          <span class="daypick-date">Week ${isoWeek(start)} · ${parseISODate(start).getDate()}/${parseISODate(start).getMonth() + 1} – ${fmtNum(end)}</span>
        </div>
        <button class="icon-btn" data-action="week-step" data-step="7" aria-label="Next week" ${isThisWeek ? 'disabled' : ''}>${icon('right')}</button>
      </div>

      <div class="week-grid">
        <aside class="week-side">
          ${sync.canUseFolder() ? oneDriveCard() : ''}
          <div class="card summary-card">
            <h2>${icon('sparkle')} Weekly report for Marine Manager</h2>
            ${shipChips()}
            <p class="muted small">${esc(rsh.name)} · ${rTotal} ${rTotal === 1 ? 'entry' : 'entries'} this week</p>
            <div class="mm-title"><span class="muted small">Title</span><b>${esc(mmWeekTitle(rsh, start))}</b>
              <button class="btn small ghost" data-action="copy-title" data-title="${esc(mmWeekTitle(rsh, start))}" aria-label="Copy title">${icon('copy')}</button></div>
            <div class="row">
              <button class="btn primary" data-action="ai-summary" data-kind="week" ${state.aiBusy ? 'disabled' : ''}>${icon('sparkle')} ${state.aiBusy ? 'Writing …' : 'Write with AI'}</button>
              <button class="btn" data-action="copy-for-claude" data-kind="week">${icon('copy')} Copy for Claude app</button>
            </div>
            ${hasKey ? '' : `<p class="muted small">“Write with AI” needs an API key (<a href="#" data-action="nav" data-view="settings">Settings</a>). Without a key: tap “Copy for Claude app”, paste it into the Claude app, and paste the answer here.</p>`}
            <textarea id="summaryText" rows="12" data-input="summary" data-key="summary:${rsh.id}:${start}" placeholder="The “Description” text appears here. You can edit it before copying.">${esc(saved)}</textarea>
            <button class="btn big primary-outline" data-action="copy-summary">${icon('copy')} Copy text</button>
          </div>

          <div class="card desktop-only">
            <h2>Week overview</h2>
            <div class="table-wrap"><table class="overview">
              <thead><tr><th></th>${days.map((d, i) => `<th class="${d === today() ? 'today' : ''}">${DAY_SHORT[i]}<small>${parseISODate(d).getDate()}.</small></th>`).join('')}<th>Sum</th></tr></thead>
              <tbody>${data.map((s) => `<tr>
                <th>${esc(s.ship.name)}</th>
                ${days.map((d) => { const n = s.entries.filter((e) => e.date === d).length; return `<td class="${n ? '' : 'zero'}">${n ? `<a href="#" data-action="open-day" data-date="${d}" data-ship="${s.ship.id}">${n}</a>` : '–'}</td>`; }).join('')}
                <td class="sum">${s.entries.length}<small>${s.photos} ${s.photos === 1 ? 'photo' : 'photos'}</small></td></tr>`).join('')}</tbody>
            </table></div>
            <p class="muted small">Entries per day. Click a number to open that day.</p>
          </div>

          <div class="card desktop-only">
            <h2>Most used locations</h2>
            <div class="tally-grid">
              ${tallyList('Section', tally('section'), 'Sec. ')}
              ${tallyList('Deck', tally('deck'))}
              ${tallyList('Room / tank', tally('room'))}
              ${tallyList('Equipment', tally('equipment'))}
            </div>
          </div>
        </aside>

        <div class="week-main desktop-only">
          <div class="card">
            <div class="feed-head">
              <h2>This week's entries</h2>
              <div class="chips">
                <button class="chip-f ${state.weekShip === 'all' ? 'on' : ''}" data-action="week-ship" data-ship="all">All</button>
                ${state.settings.ships.map((s) => `<button class="chip-f ${state.weekShip === s.id ? 'on' : ''}" data-action="week-ship" data-ship="${s.id}">${esc(s.name)}</button>`).join('')}
              </div>
            </div>
            <input type="search" class="feed-search" placeholder="Filter by text or location …" value="${esc(state.weekQuery)}" data-input="week-query">
            <div id="weekFeed"></div>
          </div>

          ${photos.length ? `<div class="card">
            <h2>This week's photos <span class="muted small">(${photos.length})</span></h2>
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
    // Firmanavn som skal være fete i rapporten (fra bemanning og registreringer)
    state.reportCompanies = [...new Set(ships.flatMap((x) => [...crewRows(x.crew).map((r) => r.company), ...x.entries.map((e) => e.company)]).filter(Boolean))];
    return `
    <section class="view">
      <div class="daybar">
        <button class="icon-btn" data-action="day-step" data-step="-1" aria-label="Previous day">${icon('left')}</button>
        <label class="daypick">
          <span class="daypick-label">${isToday ? 'Today' : 'Daily report'}</span>
          <span class="daypick-date">${cap(fmtLong(date))}</span>
          <input type="date" value="${date}" max="${today()}" data-change="pick-date" aria-label="Pick date">
        </label>
        <button class="icon-btn" data-action="day-step" data-step="1" aria-label="Next day" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
      </div>

      <div class="week-grid">
        <aside class="week-side">
          <div class="card summary-card">
            <h2>${icon('report')} Daily report for Marine Manager</h2>
            ${shipChips()}
            <p class="muted small">${esc(rsh.name)} · ${nEntries} ${nEntries === 1 ? 'entry' : 'entries'} · grouped by company with manpower</p>
            ${state.settings.reportName ? '' : '<p class="muted small">Tip: add your name and job title under Settings → Reports to include them in the sign-off.</p>'}
            <div class="row">
              <button class="btn primary" data-action="ai-summary" data-kind="day" ${state.aiBusy ? 'disabled' : ''}>${icon('sparkle')} ${state.aiBusy ? 'Writing …' : 'Write with AI'}</button>
              <button class="btn" data-action="copy-for-claude" data-kind="day">${icon('copy')} Copy for Claude app</button>
            </div>
            ${hasKey ? '' : `<p class="muted small">“Write with AI” needs an API key (<a href="#" data-action="nav" data-view="settings">Settings</a>). Without a key: tap “Copy for Claude app”, paste it into Claude, and paste the answer here.</p>`}
            <textarea id="summaryText" rows="12" data-input="summary" data-key="dsummary:${rsh.id}:${date}" data-rich="1" placeholder="The daily report appears here. You can edit it before copying.">${esc(saved)}</textarea>
            <div class="report-preview" id="reportPreview" ${saved.trim() ? '' : 'hidden'}>${reportHtml(saved)}</div>
            <button class="btn big primary-outline" data-action="copy-summary" data-rich="1">${icon('copy')} Copy daily report</button>
            <p class="muted small">Company names are copied in <b>bold</b> when you paste into Marine Manager or e-mail.</p>
          </div>
          ${ships.map((x) => crewTable(x.sh, x.crew)).join('')}
        </aside>

        <div class="week-main desktop-only">
          ${ships.map((x) => `<div class="card">
            <h2>${esc(x.sh.name)} <span class="muted small">(${x.entries.length})</span></h2>
            ${x.entries.length ? `<div class="list">${x.entries.map((e) => entryCard(e)).join('')}</div>` : '<p class="muted">No entries.</p>'}
          </div>`).join('')}
        </div>
      </div>
    </section>`;
  },

  async photos() {
    const sh = state.settings.ships.find((x) => x.id === state.galleryShip) || ship();
    const entries = (await db.getAllBy('entries', 'shipId', sh.id)).map(normalize).filter((e) => e.photoIds.length);
    const dim = state.galleryDim || 'area';
    const field = DIM_FIELD[dim];
    const names = sync.groupNames(dim, entries);
    const groups = new Map();
    for (const e of entries) {
      const g = sync.groupOf(dim, e.location);
      if (!groups.has(g.key)) groups.set(g.key, { key: g.key, name: names.get(g.key), none: g.none, items: [] });
      e.photoIds.forEach((id) => groups.get(g.key).items.push({ id, e }));
    }
    const noArea = sync.DIMS[dim].none.toLowerCase();
    const order = new Map(listFor(field, sh.id).map((n, i) => [sync.groupOf(dim, { [field]: n }).key, i]));
    const rank = (g) => (order.has(g.key) ? order.get(g.key) : 1e6);
    const list = [...groups.values()].sort((a, b) => (a.key === noArea) - (b.key === noArea) || rank(a) - rank(b) || a.name.localeCompare(b.name, 'en', { numeric: true }));
    if (state.galleryArea !== 'all' && !groups.has(state.galleryArea)) state.galleryArea = 'all';
    const sel = state.galleryArea === 'all' ? null : groups.get(state.galleryArea);
    const items = (sel ? sel.items : list.flatMap((g) => g.items))
      .sort((a, b) => (b.e.date + b.e.time).localeCompare(a.e.date + a.e.time));
    state.galleryOrder = items.map((x) => x.id);
    const total = list.reduce((n, g) => n + g.items.length, 0);
    return `
    <section class="view">
      <div class="gallery-top">
        <div class="chips">${state.settings.ships.map((x) => `<button class="chip-f ${x.id === sh.id ? 'on' : ''}" data-action="gallery-ship" data-ship="${x.id}">${esc(x.name)}</button>`).join('')}</div>
        <div class="seg-tabs" role="tablist" aria-label="Group by">${[['area', 'Room / tank'], ['section', 'Section'], ['equipment', 'Equipment']].map(([d, l]) => `<button role="tab" class="${dim === d ? 'on' : ''}" data-action="gallery-dim" data-dim="${d}">${l}</button>`).join('')}</div>
      </div>
      <div class="gallery-layout">
        <nav class="card area-list" aria-label="Areas">
          <button class="area-item ${!sel ? 'on' : ''}" data-action="gallery-area" data-key="all">${icon('image')}<span>All photos</span><b>${total}</b></button>
          ${list.map((g) => `<button class="area-item ${sel?.key === g.key ? 'on' : ''}" data-action="gallery-area" data-key="${esc(g.key)}">${icon('folder')}<span>${esc(g.name)}</span><b>${g.items.length}</b></button>`).join('')}
          <p class="muted small">${({ area: 'Grouped by “Room / tank”, then Deck, then Section.', section: 'Grouped by “Section”.', equipment: 'Grouped by “Equipment / system”.' })[dim]}
            ${dim === 'area' ? `The same folders are in OneDrive under <b>${esc(sh.name)} → By area</b>. Each photo is stored there once; the day folders only hold the Daily log.` : 'This grouping is only in the app. In OneDrive the photos are stored once, under <b>By area</b>.'}</p>
        </nav>
        <div class="card">
          <div class="feed-head"><h2>${esc(sel ? sel.name : 'All photos')} <span class="muted small">(${items.length})</span></h2>
            ${sel && !sel.none ? `<button class="btn small" data-action="rename-area" data-key="${esc(sel.key)}" data-name="${esc(sel.name)}" data-ship="${sh.id}">${icon('pen')} Rename</button>` : ''}</div>
          ${items.length ? photoWeeks(items) : '<p class="muted">No photos yet.</p>'}
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
      storage = `<p>Used on this device: <b>${(est.usage / 1048576).toFixed(1)} MB</b>.</p>
        <p>${persisted ? '✅ Persistent storage is enabled.' : '⚠️ Persistent storage is not confirmed. In the worst case the browser may clear data when space runs low.'}</p>
        ${persisted ? '' : '<button class="btn" data-action="persist">Request persistent storage</button>'}`;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return `
    <section class="view settings">
      <div class="card">
        <h2>Vessels</h2>
        ${s.ships.map((sh, i) => `
          <div class="row ship-row">
            <div class="field grow"><label>Name</label><input value="${esc(sh.name)}" data-ship-field="name" data-i="${i}"></div>
            <div class="field"><label>Hull no.</label><input value="${esc(sh.hull)}" data-ship-field="hull" data-i="${i}" placeholder="e.g. NB 123"></div>
          </div>`).join('')}
      </div>

      <div class="card">
        <h2>${icon('list')} Lists</h2>
        <p class="muted">Fixed lists per vessel, one per line. They are offered with “List” when you register, keep names consistent, and set the order of the photo folders. Shared with the other device when you send or fetch.</p>
        ${Object.entries(LISTS).map(([kind, L]) => `
          <details class="list-block" ${listFor(kind, s.ships[0]?.id).length || kind === 'room' ? 'open' : ''}>
            <summary><b>${L.title}</b> <span class="muted">(${s.ships.map((sh) => `${esc(sh.name)}: ${listFor(kind, sh.id).length}`).join(' · ')})</span></summary>
            ${s.ships.map((sh) => `
              <div class="field">
                <label>${esc(sh.name)}</label>
                <textarea rows="5" data-list="${kind}" data-ship="${sh.id}" placeholder="${L.ph}">${esc(listFor(kind, sh.id).join('\n'))}</textarea>
                ${s.ships.filter((o) => o.id !== sh.id && listFor(kind, o.id).length).map((o) => `<button class="btn small ghost" data-action="copy-list" data-kind="${kind}" data-from="${o.id}" data-to="${sh.id}">${icon('copy')} Copy list from ${esc(o.name)}</button>`).join('')}
              </div>`).join('')}
          </details>`).join('')}
      </div>

      <div class="card">
        <h2>${icon('check')} Inspections</h2>
        <p class="muted">Who can attend inspections, one per line (e.g. Class, Owner, Yard, Paint supplier). Shown as buttons when you mark an entry as an inspection.</p>
        <textarea rows="4" data-parties="1">${esc((s.parties || []).join('\n'))}</textarea>
      </div>

      <div class="card">
        <h2>Reports</h2>
        <p class="muted">Used in the sign-off of the daily report (“Kind regards, …”).</p>
        <div class="row">
          <div class="field grow"><label>Name</label><input value="${esc(s.reportName || '')}" data-setting="reportName" placeholder="Your name" autocomplete="name"></div>
          <div class="field"><label>Job title</label><input value="${esc(s.reportTitle || '')}" data-setting="reportTitle" placeholder="e.g. Site Supervisor"></div>
        </div>
      </div>

      <div class="card">
        <h2>Photos</h2>
        <label class="check"><input type="checkbox" data-change="stamp" ${s.stampPhotos ? 'checked' : ''}> Stamp vessel name, date and time on new photos</label>
      </div>

      <div class="card">
        <h2>${icon('sparkle')} AI reports (optional)</h2>
        ${summary.getApiKey()
          ? `<p>✅ An API key is saved on this device.</p>
             <button class="btn danger" data-action="remove-key">${icon('trash')} Remove key</button>`
          : `<p class="muted">With your own API key the app writes the reports directly. Without a key, use “Copy for Claude app”.</p>
             <ol class="howto">
               <li>Go to <b>console.anthropic.com</b> and create an account.</li>
               <li>Under <b>Billing</b>: add credit with a card, e.g. USD 5. You can also set a monthly spend limit.</li>
               <li>Under <b>API Keys</b>: click “Create Key”, copy the key and paste it here.</li>
             </ol>
             <div class="row">
               <div class="field grow"><label for="apiKey">API key</label><input id="apiKey" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false"></div>
               <button class="btn primary" data-action="save-key">${icon('key')} Save key</button>
             </div>`}
        <p class="muted small">The key is stored only on this device and is not included in backups. When a report is written, the note text (not the photos) is sent to Anthropic. Each report costs less than USD 0.10.</p>
      </div>

      ${sync.canUseFolder() ? oneDriveCard(true) : await iphoneOneDriveCard()}

      <div class="card">
        <h2>Backup</h2>
        <p class="muted">An extra copy of everything on this device, as one file.</p>
        <div class="row">
          <button class="btn" data-action="export">${icon('download')} Export</button>
          <label class="btn">${icon('upload')} Import<input type="file" accept="application/json,.json" data-change="import" hidden></label>
        </div>
      </div>

      <div class="card">
        <h2>Storage</h2>
        ${storage || '<p class="muted">Unknown storage status.</p>'}
      </div>

      <div class="card">
        <h2>Install the app</h2>
        ${standalone ? '<p>✅ Running as an installed app.</p>' : `
          ${state.installPrompt ? `<button class="btn primary" data-action="install">${icon('download')} Install on this device</button>` : ''}
          <ul class="howto">
            <li><b>iPhone:</b> open in Safari → Share button → “Add to Home Screen”.</li>
            <li><b>PC (Chrome/Edge):</b> click the install icon in the address bar.</li>
          </ul>
          ${isIOS ? '<p class="muted">On iPhone the app must be opened in Safari to be installed.</p>' : ''}`}
      </div>

      <p class="muted center small">Site Diary v${APP_VERSION}</p>
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
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en')).map(([c]) => c);
}

function crewBar(sh, crew) {
  const rows = crewRows(crew);
  return `<button class="crewbar" data-action="edit-crew" data-ship="${sh.id}">
    ${icon('users')}
    <span class="crewbar-text"><b>Manpower</b>
      <small>${rows.length ? esc(rows.map((r) => `${r.company || '?'} ${Number(r.count) || 0}`).join(' · ')) : 'Not recorded – tap to add'}</small></span>
    <b class="crewbar-total">${rows.length ? crewTotal(crew) : '–'}</b>
  </button>`;
}

function crewTable(sh, crew) {
  const rows = crewRows(crew);
  return `<div class="card">
    <div class="feed-head"><h2>${icon('users')} Manpower – ${esc(sh.name)}</h2>
      <button class="btn small" data-action="edit-crew" data-ship="${sh.id}">${icon('pen')} ${rows.length ? 'Edit' : 'Add'}</button></div>
    ${rows.length ? `<table class="crew-table">
      ${rows.map((r) => `<tr><td>${esc(r.company || '–')}</td><td>${Number(r.count) || 0}</td></tr>`).join('')}
      <tr class="sum"><td>Total</td><td>${crewTotal(crew)}</td></tr></table>`
      : '<p class="muted">Not recorded.</p>'}
  </div>`;
}

const crewRowHtml = (r = { company: '', count: '' }) => `
  <div class="crew-row">
    <input class="crew-company" list="dl-companies" value="${esc(r.company)}" placeholder="Company" autocomplete="off">
    <div class="stepper">
      <button type="button" class="icon-btn" data-action="crew-step" data-step="-1" aria-label="Fewer">${icon('minus')}</button>
      <input class="crew-count" type="number" inputmode="numeric" min="0" step="1" value="${r.count === '' ? '' : Number(r.count) || 0}" placeholder="0">
      <button type="button" class="icon-btn" data-action="crew-step" data-step="1" aria-label="More">${icon('plus')}</button>
    </div>
    <button type="button" class="icon-btn crew-del" data-action="crew-del" aria-label="Remove">${icon('x')}</button>
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
      <h2>${icon('users')} Manpower – ${esc(sh.name)}</h2>
      <p class="muted">${cap(fmtLong(date))}</p>
      ${prev && !rows.length ? `<button class="chip" data-action="crew-prev">Same as ${fmtNum(prev.date)} (${crewTotal(prev)} people)</button>` : ''}
      <div id="crewRows">${(rows.length ? rows : [{ company: '', count: '' }]).map(crewRowHtml).join('')}</div>
      <datalist id="dl-companies">${companies.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      <button class="btn small" data-action="crew-add">${icon('plus')} Add company</button>
      <p class="crew-total">Total on board: <b id="crewTotal">0</b></p>
      <div class="row">
        <button class="btn ghost" data-action="close-sheet">Cancel</button>
        <button class="btn primary grow-btn" data-action="crew-save">Save</button>
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
  toast(rows.length ? `Manpower saved: ${rows.reduce((n, r) => n + r.count, 0)} people` : 'Manpower removed');
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
    box.innerHTML = `<p class="muted">${words.length ? 'No matches.' : 'No entries this week.'}</p>`;
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
    toast('Add an API key first');
    state.view = 'settings';
    render();
    return;
  }
  const { text, total } = await notesFor(kind);
  if (!total) { toast(kind === 'day' ? 'Nothing recorded on this day' : 'No entries this week'); return; }
  const box = $('#summaryText');
  if (box?.value.trim() && !confirm('Replace the text currently in the field?')) return;
  const key = summaryKey(kind);
  state.aiBusy = true;
  render();
  try {
    const result = await summary.summarizeWithClaude(text, kind);
    await db.put('meta', { key, text: result, updatedAt: Date.now() });
    toast(kind === 'day' ? 'Daily report ready' : 'Weekly report ready');
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
  if (!ts) return 'never';
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString() ? `today at ${hhmm(d)}` : `${d.toLocaleDateString('en-GB')} at ${hhmm(d)}`;
}

/** PC: status og knapper for OneDrive-mappa. */
function oneDriveCard(inSettings = false) {
  const s = state.sync;
  let body;
  if (!s.root) {
    body = `<p class="muted">Choose the OneDrive folder on this PC, e.g. <b>OneDrive\\Site Diary</b> (create it in File Explorer first).
      The app saves photos and Word diaries there, sorted by vessel and day, and picks up what you send from the iPhone.
      It also writes a file the iPhone can fetch to get your PC changes.</p>
      <button class="btn primary" data-action="pick-folder">${icon('folder')} Choose OneDrive folder</button>`;
  } else if (s.perm !== 'granted') {
    body = `<p>${icon('folder')} <b>${esc(s.root.name)}</b></p>
      <p class="muted">The browser needs you to confirm access to the folder.</p>
      <button class="btn primary" data-action="connect-folder">${icon('folder')} Connect “${esc(s.root.name)}”</button>`;
  } else {
    body = `<p class="sync-line">${icon('folder')} <b>${esc(s.root.name)}</b> · ${s.running ? esc(s.msg || 'Syncing …') : `synced ${fmtWhen(s.lastAt)}`}</p>
      ${s.error ? `<p class="error">${esc(s.error)}</p>` : ''}
      <div class="row">
        <button class="btn" data-action="sync-now" ${s.running ? 'disabled' : ''}>${icon('refresh')} Sync now</button>
        ${inSettings ? '<button class="btn ghost" data-action="pick-folder">Change folder</button>' : ''}
      </div>`;
  }
  return `<div class="card onedrive-card" id="oneDriveCard" data-settings="${inSettings ? 1 : 0}">
    <h2>${icon('cloud')} OneDrive</h2>${body}
    ${inSettings ? `<p class="muted small">From the iPhone: “Send to OneDrive” → “Save to Files” → <b>${esc(s.root?.name || 'Site Diary')} → Inbox</b>.
      This app picks it up automatically while it is open (checks every 2 minutes).
      Changes made here are written to <b>From PC</b>, where the iPhone can fetch them with “Get changes from PC”.</p>` : ''}
  </div>`;
}

function refreshSyncCard() {
  const el = $('#oneDriveCard');
  if (el) el.outerHTML = oneDriveCard(el.dataset.settings === '1');
}

/** iPhone: status og forklaring. */
async function iphoneOneDriveCard() {
  const pending = await sync.pendingCount();
  const unconfirmed = await sync.unconfirmedCount();
  const last = (await db.get('meta', 'lastSent'))?.at;
  const fromPc = await db.get('meta', 'lastFromPc');
  return `<div class="card">
    <h2>${icon('cloud')} OneDrive</h2>
    <p>${pending ? `<b>${pending}</b> ${pending === 1 ? 'change has' : 'changes have'} not been sent.` : '✅ Everything has been sent.'} <span class="muted">Last sent ${fmtWhen(last)}.</span></p>
    ${unconfirmed ? `<p class="muted small">${unconfirmed} sent ${unconfirmed === 1 ? 'change is' : 'changes are'} not yet confirmed by the PC. ${unconfirmed === 1 ? 'It is' : 'They are'} included again in the next send, so nothing is lost if a file never arrived. “Get changes from PC” confirms them.</p>` : ''}
    <button class="btn primary" data-action="send-onedrive" ${pending || unconfirmed ? '' : 'disabled'}>${icon('cloud')} Send to OneDrive</button>
    <ol class="howto">
      <li>Tap “Send to OneDrive”, then “Open share menu”.</li>
      <li>Choose <b>“Save to Files”</b> → <b>OneDrive</b> → your app folder → <b>Inbox</b> → “Save”. The iPhone remembers the folder next time.</li>
      <li>The PC app imports and sorts everything automatically while it is open.</li>
    </ol>
    <p class="muted small">Requires the OneDrive app on the iPhone, and that the folder has been chosen in the PC app first (this creates the Inbox folder). Older setups using “Innboks” still work.</p>
    <h3>Get changes from PC</h3>
    <p class="muted">Changes you make in the PC app (entries, manpower, deletions) are saved to <b>From PC</b> in the OneDrive folder.
      ${fromPc ? `Last fetched ${fmtWhen(fromPc.importedAt)} (PC file from ${fmtWhen(fromPc.at)}).` : 'Not fetched yet.'}</p>
    <label class="btn">${icon('refresh')} Get changes from PC<input type="file" accept=".json,application/json,text/plain" data-change="import-pc" hidden></label>
    <p class="muted small">Choose <b>OneDrive</b> → your app folder → <b>From PC</b> → <b>site-diary-from-pc.json</b>.</p>

  </div>`;
}

let preparedBundle = null;

/** iPhone steg 1: pakk (kan ta litt tid). Steg 2 (eget trykk): åpne del-menyen. */
async function prepareSend() {
  toast('Packing …');
  preparedBundle = await sync.buildBundle(state.settings);
  if (!preparedBundle.count) { toast('Everything has already been sent'); return; }
  preparedBundle.text = await preparedBundle.blob.text(); // klar før trykket (krav i Safari)
  const size = preparedBundle.blob.size / 1048576;
  const mb = size < 0.1 ? '< 0.1' : size.toLocaleString('en-GB', { maximumFractionDigits: 1 });
  const dlg = $('#sheet');
  dlg.innerHTML = `
    <div class="sheet">
      <h2>${icon('cloud')} Send to OneDrive</h2>
      <p><b>${preparedBundle.fresh}</b> new ${preparedBundle.fresh === 1 ? 'change' : 'changes'}${preparedBundle.count > preparedBundle.fresh ? ` + ${preparedBundle.count - preparedBundle.fresh} earlier, not yet confirmed by the PC` : ''} (${mb} MB).</p>
      <ol class="howto">
        <li>Tap “Open share menu”.</li>
        <li>Choose <b>“Save to Files”</b>.</li>
        <li>Choose <b>OneDrive</b> (the same one the PC uses, e.g. “OneDrive – Hagland”) → your app folder → <b>Inbox</b> and tap “Save”.</li>
      </ol>
      <p class="muted small">The file is saved as “tekst” (or “Text”) – that is fine, the PC app recognises it. Tip: open the OneDrive app for a moment afterwards.</p>
      <button class="btn primary big" data-action="share-bundle" data-mode="text">${icon('cloud')} Open share menu</button>
      <button class="btn small ghost" data-action="share-bundle" data-mode="file">Share as .json file instead</button>
      <button class="btn ghost" data-action="close-sheet">Cancel</button>
    </div>`;
  if (!dlg.open) dlg.showModal();
}

async function shareBundle(mode = 'text') {
  if (!preparedBundle) return;
  try {
    if (!(await sync.shareBundle(preparedBundle, mode))) return; // avbrutt – prøv igjen
    await sync.markSent(preparedBundle);
    preparedBundle = null;
    $('#sheet').close();
    toast('Sent to OneDrive');
    render();
  } catch (err) {
    console.error(err);
    alert(`Sharing failed: ${err.message}`);
  }
}

/** PC: les Innboks og skriv ut endrede dager. */
async function runSync({ quiet = false } = {}) {
  const s = state.sync;
  if (!s.root || s.perm !== 'granted' || s.running) return;
  s.running = true;
  s.error = '';
  s.msg = 'Syncing …';
  refreshSyncCard();
  try {
    const shipsBefore = JSON.stringify(state.settings.ships);
    const res = await sync.syncFolder(state.settings, {
      fmtLoc, fmtLocShort, fmtLong: (d) => cap(fmtLong(d)),
      onProgress: (m) => { s.msg = m; refreshSyncCard(); },
    });
    if (JSON.stringify(state.settings.ships) !== shipsBefore) await saveSettings();
    s.lastAt = Date.now();
    if (res.imported || (res.areas && state.view === 'photos')) {
      toast(`Imported ${res.imported} ${res.imported === 1 ? 'package' : 'packages'} from iPhone`);
      if (!editorEl().open && !document.activeElement?.matches('textarea, input')) render();
    } else if (!quiet) {
      toast(res.days ? `Updated ${res.days} ${res.days === 1 ? 'day' : 'days'} in OneDrive` : 'Everything is up to date');
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
    if (LISTS[f.key]) listFor(f.key, shipId).forEach((d) => set.add(d));
    hints[f.key] = [...set].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
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
      <button type="button" class="btn ghost" data-action="close-editor">Cancel</button>
      <h2>${d.isNew ? 'New entry' : 'Edit entry'}</h2>
      <button type="button" class="btn primary" data-action="save-entry">Save</button>
    </header>
    <div class="ed-body">
      <div class="ed-photos" id="edPhotos"></div>
      <div class="row photo-btns">
        <label class="btn">${icon('camera')} Take photo<input type="file" accept="image/*" capture="environment" data-change="add-photos" hidden></label>
        <label class="btn">${icon('image')} From library<input type="file" accept="image/*" multiple data-change="add-photos" hidden></label>
      </div>
      <p class="muted small desktop-hint">Tip: drag photos here, or paste with Ctrl+V.</p>

      <div class="field">
        <label for="f-text">Note</label>
        <textarea id="f-text" name="text" rows="4" placeholder="What is happening? e.g. “Main engine installation in progress. Foundation accepted.”">${esc(e.text)}</textarea>
      </div>

      <div class="field">
        <label for="f-company">Company / subcontractor <span class="muted">(optional)</span></label>
        ${companies.chips.length ? `<div class="chips company-chips">${companies.chips.map((c) => `<button type="button" class="chip-f ${c === e.company ? 'on' : ''}" data-action="pick-company" data-company="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
        <input id="f-company" name="company" value="${esc(e.company)}" list="dl-company" placeholder="Who does this note concern?" autocomplete="off">
        <datalist id="dl-company">${companies.all.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      </div>

      <div class="inspbox">
        <label class="check"><input type="checkbox" name="isInspection" data-change="toggle-insp" ${e.inspection ? 'checked' : ''}> <b>Inspection</b> <span class="muted">– record result and who attended</span></label>
        <div class="insp-fields" ${e.inspection ? '' : 'hidden'}>
          <div class="seg" role="radiogroup" aria-label="Result">
            ${[['accepted', 'Accepted'], ['comments', 'With comments'], ['rejected', 'Rejected']].map(([v, l]) => `
              <label class="seg-opt ${v}"><input type="radio" name="inspResult" value="${v}" ${e.inspection?.result === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
          </div>
          <div class="chips party-chips">
            ${[...new Set([...(state.settings.parties || []), ...(e.inspection?.parties || [])])].map((pt) => `<button type="button" class="chip-f party ${e.inspection?.parties?.includes(pt) ? 'on' : ''}" data-action="toggle-party" data-party="${esc(pt)}">${esc(pt)}</button>`).join('')}
            <button type="button" class="chip-f" data-action="add-party">${icon('plus')} Other</button>
          </div>
        </div>
      </div>

      <fieldset class="locbox">
        <legend>${icon('pin')} Location on board</legend>
        ${showLast ? `<button type="button" class="chip last-loc" data-action="use-last-loc">Same as last: ${esc(fmtLoc(last))}</button>` : ''}
        <div class="loc-grid">
          ${LOC_FIELDS.map((f) => `
            <div class="field f-${f.key}">
              <label for="f-${f.key}">${f.label}${LISTS[f.key] && listFor(f.key, e.shipId).length ? ` <button type="button" class="link-btn" data-action="pick-area" data-field="${f.key}">${icon('list')} List</button>` : ''}</label>
              <input id="f-${f.key}" name="loc-${f.key}" value="${esc(e.location[f.key])}" placeholder="${f.ph}" list="dl-${f.key}" autocomplete="off" enterkeyhint="next">
              <datalist id="dl-${f.key}">${hints[f.key].map((v) => `<option value="${esc(v)}">`).join('')}</datalist>
            </div>`).join('')}
        </div>
      </fieldset>

      <div class="row">
        <div class="field"><label for="f-ship">Vessel</label>
          <select id="f-ship" name="shipId">${state.settings.ships.map((s) => `<option value="${s.id}" ${s.id === e.shipId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-date">Date</label><input id="f-date" type="date" name="date" value="${e.date}"></div>
        <div class="field"><label for="f-time">Time</label><input id="f-time" type="time" name="time" value="${e.time}"></div>
      </div>

      <div class="ed-footer">
        <button type="button" class="btn big primary-outline" data-action="save-and-photo">${icon('camera')} Save and take next photo</button>
        ${d.isNew ? '' : `<button type="button" class="btn danger" data-action="delete-entry">${icon('trash')} Delete</button>`}
      </div>
    </div>
    <div class="drop-hint">Drop photos here</div>
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
      <button type="button" class="ed-photo-x" data-action="remove-photo" data-id="${p.id}" aria-label="Remove photo">${icon('x')}</button>
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
  e.inspection = f.elements.isInspection.checked ? {
    result: f.elements.inspResult.value || '',
    parties: $$('.party-chips .party.on', f).map((b) => b.dataset.party),
  } : null;
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
  toast(imgs.length > 1 ? `Processing ${imgs.length} photos …` : 'Processing photo …');
  collectDraft();
  for (const file of imgs) {
    try {
      const when = new Date(file.lastModified || Date.now());
      const stamp = state.settings.stampPhotos
        ? `${ship().name} · ${when.toLocaleDateString('en-GB')} ${hhmm(when)}` : null;
      const { blob, thumb } = await processImage(file, stamp);
      const rec = {
        id: uid(), entryId: d.entry.id, shipId: d.entry.shipId, date: d.entry.date,
        blob, thumb, name: file.name, createdAt: Date.now(),
        origin: sync.canUseFolder() ? 'pc' : 'phone', // bilder fra PC tas med til iPhone
      };
      // Lagres med en gang, så bildet ikke går tapt om iPhone lukker appen mens kameraet er åpent.
      await db.put('photos', rec);
      d.photos.push(rec);
      d.added.push(rec.id);
    } catch (err) {
      console.error(err);
      toast(`Could not read ${file.name}`);
    }
  }
  saveDraftLocal();
  renderEditorPhotos();
  toast(imgs.length > 1 ? `${imgs.length} photos added` : 'Photo added');
}

async function saveEntry({ quiet = false } = {}) {
  const d = state.draft;
  if (!d) return false;
  collectDraft();
  const e = d.entry;
  if (!e.text.trim() && d.photos.length === 0) {
    toast('Write a note or take a photo');
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
  if (moved) toast(`Moved to ${state.settings.ships.find((s) => s.id === e.shipId)?.name || 'another vessel'}`);
  else if (!quiet) toast('Saved');
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
  if (d?.dirty && !confirm('Discard this entry/changes?')) return;
  await discardDraft();
}

/* ------------------------------------------------------------------ */
/* Velger for faste tanker/rom                                         */
/* ------------------------------------------------------------------ */

function openAreaPicker(field = 'room') {
  const d = state.draft;
  if (!d) return;
  collectDraft();
  const list = listFor(field, d.entry.shipId);
  const dlg = $('#sheet');
  dlg.innerHTML = `
    <div class="sheet area-sheet">
      <h2>${icon('list')} ${LISTS[field].title}</h2>
      <input type="search" placeholder="Search" data-input="area-search" autocomplete="off">
      <div class="area-picks">${list.map((a) => `<button type="button" class="area-pick ${a === d.entry.location[field] ? 'on' : ''}" data-action="choose-area" data-field="${field}" data-area="${esc(a)}">${esc(a)}</button>`).join('')}</div>
      <button class="btn ghost" data-action="close-sheet">Cancel</button>
    </div>`;
  if (!dlg.open) dlg.showModal();
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
    ? [`${esc(e.time)}`, esc(fmtLoc(e.location)), esc((e.text || '').split('\n')[0].slice(0, 80))].filter(Boolean).join(' · ')
    : 'New photo (not saved yet)';
  $('#lightbox').innerHTML = `
    <div class="lb">
      <img src="${lightboxUrl}" alt="">
      <div class="lb-bar">
        <button class="icon-btn" data-action="lb-step" data-step="-1" ${index === 0 ? 'disabled' : ''} aria-label="Previous">${icon('left')}</button>
        <div class="lb-cap">${caption}<small>${index + 1} / ${ids.length}</small></div>
        <button class="icon-btn" data-action="lb-download" aria-label="Download">${icon('download')}</button>
        <button class="icon-btn" data-action="lb-step" data-step="1" ${index === ids.length - 1 ? 'disabled' : ''} aria-label="Next">${icon('right')}</button>
        <button class="icon-btn" data-action="lb-close" aria-label="Close">${icon('x')}</button>
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
  toast('Creating backup …');
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
  try { data = JSON.parse(await file.text()); } catch { toast('Invalid file'); return; }
  if (data?.app !== 'tilsynsdagbok') { toast('This file is not a Site Diary file'); return; }
  if (!confirm(`Import ${data.entries?.length || 0} entries and ${data.photos?.length || 0} photos?\nThe newest version of each entry is kept.`)) return;
  if (!data.settings) data.settings = (data.meta || []).find((m) => m.key === 'settings')?.value;
  await sync.applyBundle(data, state.settings);
  await saveSettings();
  thumbUrls.forEach((u) => URL.revokeObjectURL(u));
  thumbUrls.clear();
  toast('Import complete');
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
  'gallery-ship': (el) => { state.galleryShip = el.dataset.ship; state.galleryArea = 'all'; render(); },
  'gallery-area': (el) => { state.galleryArea = el.dataset.key; render(); },
  'gallery-dim': (el) => { state.galleryDim = el.dataset.dim; state.galleryArea = 'all'; render(); },
  'rename-area': async (el) => {
    const to = prompt(`Rename “${el.dataset.name}” to:`, el.dataset.name)?.trim();
    if (!to || to === el.dataset.name) return;
    const dim = state.galleryDim || 'area';
    const field = DIM_FIELD[dim];
    const all = (await db.getAllBy('entries', 'shipId', el.dataset.ship)).map(normalize)
      .filter((e) => sync.groupOf(dim, e.location).key === el.dataset.key);
    const now = Date.now();
    await db.putMany('entries', all.map((e) => ({ ...e, location: { ...e.location, [field]: to }, updatedAt: now })));
    state.galleryArea = sync.groupOf(dim, { [field]: to }).key;
    // Samme navn i den faste lista, så rekkefølge og velger følger med
    const list = listFor(field, el.dataset.ship);
    const idx = list.findIndex((n) => sync.groupOf(dim, { [field]: n }).key === el.dataset.key);
    if (idx >= 0) {
      const lists = { ...(state.settings.lists || {}) };
      lists[field] = { ...(lists[field] || {}), [el.dataset.ship]: list.map((n, i) => (i === idx ? to : n)) };
      state.settings.lists = lists;
      state.settings.listsUpdatedAt = now;
      await saveSettings();
    }
    toast(`Renamed ${all.length} ${all.length === 1 ? 'entry' : 'entries'} to “${to}”`);
    afterLocalChange();
    render();
  },
  'copy-list': async (el) => {
    const kind = el.dataset.kind;
    const lists = { ...(state.settings.lists || {}) };
    lists[kind] = { ...(lists[kind] || {}), [el.dataset.to]: [...listFor(kind, el.dataset.from)] };
    state.settings.lists = lists;
    state.settings.listsUpdatedAt = Date.now();
    await saveSettings();
    toast('List copied');
    render();
  },
  'pick-area': (el) => openAreaPicker(el.dataset.field),
  'choose-area': (el) => {
    $(`#f-${el.dataset.field || 'room'}`).value = el.dataset.area;
    $('#sheet').close();
    saveDraftLocal();
  },
  'toggle-party': (el) => { el.classList.toggle('on'); saveDraftLocal(); },
  'add-party': async (el) => {
    const name = prompt('Who attended?')?.trim();
    if (!name) return;
    if (!(state.settings.parties || []).includes(name)) {
      state.settings.parties = [...(state.settings.parties || []), name];
      state.settings.partiesUpdatedAt = Date.now();
      await saveSettings();
    }
    el.insertAdjacentHTML('beforebegin', `<button type="button" class="chip-f party on" data-action="toggle-party" data-party="${esc(name)}">${esc(name)}</button>`);
    saveDraftLocal();
  },
  'copy-title': async (el) => { toast(await copyText(el.dataset.title) ? 'Title copied' : 'Could not copy'); },
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
  'share-bundle': (el) => shareBundle(el.dataset.mode),
  'close-sheet': () => { preparedBundle = null; $('#sheet').close(); },
  'resend-all': async () => {
    if (!confirm('Mark all entries as not sent? The next send will then include everything (the PC skips what it already has).')) return;
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
      if (err.name !== 'AbortError') alert(`Could not use the folder: ${err.message}`);
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
    if (!total) { toast(kind === 'day' ? 'Nothing recorded on this day' : 'No entries this week'); return; }
    if (await copyText(summary.promptForChat(text, kind))) {
      alert('The notes have been copied.\n\n1. Open the Claude app and paste into a new conversation.\n2. Copy the answer from Claude.\n3. Paste it into the text field here (or straight into Marine Manager).');
    } else {
      toast('Could not copy');
    }
  },
  'copy-summary': async (el) => {
    const t = $('#summaryText')?.value.trim();
    if (!t) { toast('The text is empty'); return; }
    const ok = el.dataset.rich ? await copyRich(t) : await copyText(t);
    toast(ok ? 'Copied – paste into Marine Manager' : 'Could not copy');
  },
  'save-key': () => {
    const v = $('#apiKey')?.value.trim();
    if (!v) { toast('Paste the key first'); return; }
    if (!v.startsWith('sk-ant-')) { toast('The key should start with “sk-ant-”'); return; }
    summary.setApiKey(v);
    toast('Key saved');
    render();
  },
  'remove-key': () => {
    if (!confirm('Remove the API key from this device?')) return;
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
    if (!d.entry.text.trim() && d.photos.length === 0) { toast('Write a note or take a photo'); return; }
    openCamera();
    if (await saveEntry({ quiet: true })) toast('Saved – take the next photo');
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
    if (!confirm('Delete this entry and its photos? This cannot be undone.')) return;
    const d = state.draft;
    const gone = await db.get('entries', d.entry.id);
    if (sync.canUseFolder()) await sync.addPcTombstone(gone); else await sync.addTombstone(gone);
    await db.deleteEntry(d.entry.id);
    d.photos.forEach((p) => forgetThumb(p.id));
    clearDraftLocal();
    state.draft = null;
    editorEl().close();
    toast('Deleted');
    afterLocalChange();
    render();
  },
  'view-photo': async (el) => {
    const i = Number(el.dataset.index);
    if (el.dataset.draft) return openLightbox(state.draft.photos.map((p) => p.id), i);
    if (el.dataset.week) return openLightbox(state.weekPhotoOrder, i);
    if (el.dataset.gallery) return openLightbox(state.galleryOrder, i);
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
  'toggle-insp': (el) => { $('.insp-fields', editorEl()).hidden = !el.checked; },
  'add-photos': async (el) => { const files = [...el.files]; el.value = ''; await addFilesToDraft(files); },
  stamp: async (el) => { state.settings.stampPhotos = el.checked; await saveSettings(); toast('Saved'); },
  import: async (el) => { const f = el.files[0]; el.value = ''; if (f) await importBackup(f); },
  'import-pc': async (el) => {
    const f = el.files[0];
    el.value = '';
    if (!f) return;
    try {
      const res = await sync.importFromPc(f, state.settings);
      const { changed } = res;
      await saveSettings();
      const { confirmed } = res;
      toast([changed && `${changed} ${changed === 1 ? 'change' : 'changes'} from PC`, confirmed && `${confirmed} confirmed`].filter(Boolean).join(' · ') || 'Already up to date');
      render();
    } catch (err) {
      alert(err.message);
    }
  },
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
    if (el.dataset.list) {
      const list = [...new Set(el.value.split('\n').map((x) => x.trim()).filter(Boolean))];
      const lists = { ...(state.settings.lists || {}) };
      lists[el.dataset.list] = { ...(lists[el.dataset.list] || {}), [el.dataset.ship]: list };
      state.settings.lists = lists;
      state.settings.listsUpdatedAt = Date.now();
      saveSettings().then(() => toast(`${list.length} saved`));
    }
    if (el.dataset.parties) {
      state.settings.parties = [...new Set(el.value.split('\n').map((x) => x.trim()).filter(Boolean))];
      state.settings.partiesUpdatedAt = Date.now();
      saveSettings().then(() => toast('Saved'));
    }
    if (el.dataset.setting) {
      state.settings[el.dataset.setting] = el.value.trim();
      saveSettings().then(() => toast('Saved'));
    }
    if (el.dataset.shipField) {
      state.settings.ships[Number(el.dataset.i)][el.dataset.shipField] = el.value.trim();
      state.settings.shipsUpdatedAt = Date.now();
      saveSettings().then(() => toast('Saved'));
    }
  });

  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (el.closest('[data-editor]')) saveDraftLocal();
    if (el.dataset.input === 'summary') {
      saveSummaryText(el.dataset.key, el.value);
      const pv = $('#reportPreview');
      if (pv && el.dataset.rich) { pv.innerHTML = reportHtml(el.value); pv.hidden = !el.value.trim(); }
    }
    if (el.classList.contains('crew-count')) updateCrewTotal();
    if (el.dataset.input === 'area-search') {
      const q = el.value.trim().toLowerCase().replace(/\s+/g, '');
      $$('.area-pick').forEach((b) => { b.hidden = q && !b.dataset.area.toLowerCase().replace(/\s+/g, '').includes(q); });
    }
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
  if (!sync.canUseFolder()) await sync.migrateConfirmations().catch(() => {});
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
    toast('An unsaved entry was restored');
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
  $('#main').innerHTML = `<div class="empty"><p><b>Something went wrong at startup.</b></p><p class="muted">${esc(err.message)}</p></div>`;
});
