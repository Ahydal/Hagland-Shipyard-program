import * as db from './db.js';

const APP_VERSION = '2.0.0';

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
};

const ship = () => state.settings.ships.find((s) => s.id === state.settings.activeShip) || state.settings.ships[0];

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
  if (state.view === 'settings') {
    $('#topbar').innerHTML = `
      <button class="icon-btn" data-action="nav" data-view="day" aria-label="Tilbake">${icon('left')}</button>
      <h1 class="topbar-title">Innstillinger</h1>`;
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
    <div class="topbar-brand" title="Tilsynsdagbok">${icon('ship')}</div>
    ${sel}
    <button class="icon-btn" data-action="nav" data-view="settings" aria-label="Innstillinger">${icon('gear')}</button>`;
}

let renderToken = 0;
async function render() {
  const token = ++renderToken;
  renderTopbar();
  const html = await VIEWS[state.view]();
  if (token !== renderToken) return;
  const main = $('#main');
  main.innerHTML = html;
  hydrateThumbs(main);
}

function entryCard(e) {
  const loc = fmtLoc(e.location);
  const ids = e.photoIds || [];
  return `
  <article class="entry" data-action="edit" data-id="${e.id}" tabindex="0">
    <div class="entry-top">
      <time>${esc(e.time || '')}</time>
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

      <div class="quick">
        <button class="btn primary big" data-action="quick-photo">${icon('camera')} Ta bilde</button>
        <button class="btn big" data-action="new-entry">${icon('pen')} Skriv notat</button>
      </div>

      ${entries.length ? `<p class="muted small daystats">${entries.length} ${entries.length === 1 ? 'registrering' : 'registreringer'} · ${nPhotos} ${nPhotos === 1 ? 'bilde' : 'bilder'}</p>` : ''}

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
        <h2>Bilder</h2>
        <label class="check"><input type="checkbox" data-change="stamp" ${s.stampPhotos ? 'checked' : ''}> Stemple skipsnavn, dato og klokkeslett i nye bilder</label>
      </div>

      <div class="card">
        <h2>Sikkerhetskopi</h2>
        <p class="muted">Inntil OneDrive er koblet til, ligger alt bare på denne enheten. Ta gjerne en kopi innimellom.</p>
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
/* Redigering av registrering                                          */
/* ------------------------------------------------------------------ */

const editorEl = () => $('#editor');

/** Tidligere brukte verdier per stedsfelt (til forslag), og sist brukte sted. */
async function locationHints() {
  const all = (await db.getAllBy('entries', 'shipId', ship().id)).map(normalize);
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

  state.draft = { entry: e, isNew: opts.restore ? opts.restore.isNew : isNew, photos, removed, added, dirty: !!opts.restore };
  renderEditor(await locationHints());
  const dlg = editorEl();
  if (!dlg.open) dlg.showModal();
  $('.ed-body', dlg).scrollTop = 0;
  if (opts.files?.length) await addFilesToDraft(opts.files);
  if (!opts.files?.length && isNew && !opts.restore) setTimeout(() => $('[name=text]', dlg)?.focus(), 50);
}

function renderEditor({ hints, last }) {
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
  e.time = f.elements.time.value || hhmm(new Date());
  LOC_FIELDS.forEach((lf) => { e.location[lf.key] = f.elements[`loc-${lf.key}`].value.trim(); });
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
  if (!quiet) toast('Lagret');
  requestPersist();
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
  const existing = new Map((await db.getAll('entries')).map((e) => [e.id, e]));
  const entries = (data.entries || []).filter((e) => !existing.has(e.id) || (e.updatedAt || 0) > (existing.get(e.id).updatedAt || 0));
  if (!confirm(`Importere ${data.entries?.length || 0} registreringer og ${data.photos?.length || 0} bilder?\n${entries.length} er nye eller oppdaterte. Ingenting blir slettet.`)) return;
  const photos = (data.photos || []).map((p) => ({ ...p, blob: b64ToBlob(p.blob), thumb: p.thumb ? b64ToBlob(p.thumb) : null }));
  await db.putMany('entries', entries);
  for (let i = 0; i < photos.length; i += 20) await db.putMany('photos', photos.slice(i, i + 20));
  const imported = (data.meta || []).find((m) => m.key === 'settings')?.value;
  if (imported?.ships) {
    imported.ships.forEach((s) => { if (!state.settings.ships.some((x) => x.id === s.id)) state.settings.ships.push(s); });
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

const openCamera = () => $('#quickCamera').click();

const ACTIONS = {
  nav: (el) => { state.view = el.dataset.view; window.scrollTo(0, 0); render(); },
  'switch-ship': async (el) => { state.settings.activeShip = el.dataset.ship; await saveSettings(); render(); },
  'day-step': (el) => { const d = addDays(state.date, Number(el.dataset.step)); if (d <= today()) { state.date = d; render(); } },
  'goto-today': () => { state.date = today(); render(); },
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
    await db.deleteEntry(d.entry.id);
    d.photos.forEach((p) => forgetThumb(p.id));
    clearDraftLocal();
    state.draft = null;
    editorEl().close();
    toast('Slettet');
    render();
  },
  'view-photo': async (el) => {
    const i = Number(el.dataset.index);
    if (el.dataset.draft) return openLightbox(state.draft.photos.map((p) => p.id), i);
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
    if (el.dataset.shipField) {
      state.settings.ships[Number(el.dataset.i)][el.dataset.shipField] = el.value.trim();
      saveSettings().then(() => toast('Lagret'));
    }
  });

  document.addEventListener('input', (ev) => {
    if (ev.target.closest('[data-editor]')) saveDraftLocal();
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
