// OneDrive uten Microsoft-registrering:
//  iPhone → «Send til OneDrive» deler en pakkefil via del-menyen («Arkiver i Filer» → OneDrive/Tilsynsdagbok/Innboks).
//  PC     → appen har tilgang til OneDrive-mappa på disken (File System Access API i Chrome/Edge),
//           leser inn pakkene fra Innboks, og skriver bilder + Word-dagbok sortert per skip og dag.
import * as db from './db.js';

const DOCX_URL = 'https://cdn.jsdelivr.net/npm/docx@9.15.1/+esm';
const INBOX = 'Inbox';
const INBOX_NAMES = ['Inbox', 'Innboks']; // 'Innboks' fra eldre oppsett virker fortsatt
const PROCESSED = 'Processed';
const FROM_PC = 'From PC';
const SNAPSHOT = 'site-diary-from-pc.json';

export const canUseFolder = () => 'showDirectoryPicker' in window;

/* ------------------------------------------------------------------ */
/* Hjelpere                                                            */
/* ------------------------------------------------------------------ */

const blobToB64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});
export const b64ToBlob = (b64, type = 'image/jpeg') => {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
};

/** Gyldig fil-/mappenavn på Windows og OneDrive. */
export function safeName(s, max = 90) {
  let n = String(s || '').replace(/[<>:"/\\|?*\u0000-\u001f#%]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (n.length > max) n = n.slice(0, max).trim();
  return n.replace(/[. ]+$/, '') || 'Untitled';
}

/* ------------------------------------------------------------------ */
/* iPhone: pakke og sende                                              */
/* ------------------------------------------------------------------ */

const isUnsent = (e) => !e.sentAt || (e.updatedAt || 0) > e.sentAt;
/** Ikke bekreftet av PC-en ennå (bekreftes når iPhone henter «From PC»-fila). */
const isUnconfirmed = (e) => !e.confirmedAt || (e.updatedAt || 0) > e.confirmedAt;

/** Innstillinger som deles mellom iPhone og PC (skip, faste områder, inspeksjonsparter). */
export const sharedSettings = (st) => ({
  ships: st.ships, shipsUpdatedAt: st.shipsUpdatedAt || 0,
  areas: st.areas || {}, areasUpdatedAt: st.areasUpdatedAt || 0,
  parties: st.parties || null, partiesUpdatedAt: st.partiesUpdatedAt || 0,
});

export async function getTombstones() {
  return (await db.get('meta', 'tombstones'))?.list || [];
}

/** Husk slettinger av registreringer som allerede er sendt, så PC-en også fjerner dem (til PC-en har bekreftet). */
export async function addTombstone(entry) {
  if (!entry?.sentAt && !entry?.confirmedAt) return;
  const list = await getTombstones();
  list.push({ id: entry.id, shipId: entry.shipId, date: entry.date, deletedAt: Date.now() });
  await db.put('meta', { key: 'tombstones', list });
}

const isCrew = (m) => String(m.key).startsWith('crew:');
export const allCrew = async () => (await db.getAll('meta')).filter(isCrew);

/** Antall endringer som aldri er sendt (vises på «Send»-knappen). */
export async function pendingCount() {
  const entries = await db.getAll('entries');
  const crew = (await allCrew()).filter(isUnsent);
  return entries.filter(isUnsent).length + crew.length + (await getTombstones()).filter((t) => !t.sentAt).length;
}

/** Sendt, men ikke bekreftet av PC-en ennå. Tas automatisk med i neste sending. */
export async function unconfirmedCount() {
  const entries = (await db.getAll('entries')).filter((e) => !isUnsent(e) && isUnconfirmed(e));
  const crew = (await allCrew()).filter((c) => !isUnsent(c) && isUnconfirmed(c));
  return entries.length + crew.length + (await getTombstones()).filter((t) => t.sentAt).length;
}

/**
 * Lager pakkefil med alt som ikke er bekreftet av PC-en: nye endringer, og det som er sendt før
 * men kanskje aldri kom fram. PC-en hopper over det den allerede har.
 */
export async function buildBundle(settings) {
  const createdAt = Date.now();
  const entries = (await db.getAll('entries')).filter(isUnconfirmed);
  const tombstones = await getTombstones();
  const crew = (await allCrew()).filter(isUnconfirmed);
  const fresh = entries.filter(isUnsent).length + crew.filter(isUnsent).length + tombstones.filter((t) => !t.sentAt).length;
  const parts = [
    `{"app":"tilsynsdagbok","version":3,"kind":"send","createdAt":${createdAt},`,
    `"settings":${JSON.stringify(sharedSettings(settings))},`,
    `"entries":${JSON.stringify(entries.map(({ sentAt, confirmedAt, ...e }) => e))},`,
    `"tombstones":${JSON.stringify(tombstones.map(({ sentAt, ...t }) => t))},`,
    `"crew":${JSON.stringify(crew.map(({ sentAt, confirmedAt, ...c }) => c))},"photos":[`,
  ];
  let first = true;
  for (const e of entries) {
    for (const id of e.photoIds || []) {
      const p = await db.get('photos', id);
      if (!p) continue;
      const { blob, thumb, ...rest } = p;
      parts.push((first ? '' : ',') + JSON.stringify({ ...rest, blob: await blobToB64(blob), thumb: thumb ? await blobToB64(thumb) : null }));
      first = false;
    }
  }
  parts.push(']}');
  const d = new Date(createdAt);
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  return {
    blob: new Blob(parts, { type: 'application/json' }),
    filename: `tilsyn_${stamp}.json`,
    createdAt,
    entryIds: entries.map((e) => e.id),
    tombstoneIds: tombstones.map((t) => t.id),
    crewKeys: crew.map((c) => c.key),
    count: entries.length + tombstones.length + crew.length,
    fresh,
  };
}

/** Marker som sendt (bare det som ikke er endret etter at pakken ble laget). */
export async function markSent(bundle) {
  const updated = [];
  for (const id of bundle.entryIds) {
    const e = await db.get('entries', id);
    if (e && (e.updatedAt || 0) <= bundle.createdAt) updated.push({ ...e, sentAt: bundle.createdAt });
  }
  if (updated.length) await db.putMany('entries', updated);
  const crew = [];
  for (const key of bundle.crewKeys || []) {
    const c = await db.get('meta', key);
    if (c && (c.updatedAt || 0) <= bundle.createdAt) crew.push({ ...c, sentAt: bundle.createdAt });
  }
  if (crew.length) await db.putMany('meta', crew);
  // Slettinger beholdes til PC-en har bekreftet dem, men merkes som sendt
  const list = (await getTombstones()).map((t) => (bundle.tombstoneIds.includes(t.id) ? { ...t, sentAt: bundle.createdAt } : t));
  await db.put('meta', { key: 'tombstones', list });
  await db.put('meta', { key: 'lastSent', at: bundle.createdAt });
}

/** Deler pakken via iPhones del-meny. Returnerer true hvis brukeren fullførte. */
export async function shareBundle(bundle) {
  const variants = [
    new File([bundle.blob], bundle.filename, { type: 'application/json' }),
    new File([bundle.blob], bundle.filename.replace(/\.json$/, '.txt'), { type: 'text/plain' }),
  ];
  for (const file of variants) {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] }); // bare filen – en tittel blir en ekstra tekstfil i «Arkiver i Filer»
        return true;
      } catch (err) {
        if (err.name === 'AbortError') return false;
        throw err;
      }
    }
  }
  // Ingen del-meny (f.eks. PC uten mappe): last ned filen i stedet
  const a = document.createElement('a');
  a.href = URL.createObjectURL(bundle.blob);
  a.download = bundle.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}

/* ------------------------------------------------------------------ */
/* Innlesing av pakker (PC, og manuell import)                         */
/* ------------------------------------------------------------------ */

/** Slår en pakke inn i lokal database. Nyeste versjon av hver registrering vinner. */
export async function applyBundle(data, settings, { markSent = false } = {}) {
  let changed = 0;
  const accepted = new Set();
  const same = new Set();
  for (const e of data.entries || []) {
    const cur = await db.get('entries', e.id);
    if (cur && (cur.updatedAt || 0) > (e.updatedAt || 0)) continue;
    if (cur && (cur.updatedAt || 0) === (e.updatedAt || 0)) { same.add(e.id); continue; }
    const { sentAt, ...clean } = e;
    // Fra PC til iPhone: merk som sendt, så det ikke sendes tilbake igjen
    const { confirmedAt, ...clean2 } = clean;
    await db.put('entries', markSent ? { ...clean2, sentAt: clean2.updatedAt || Date.now(), confirmedAt: clean2.updatedAt || Date.now() } : clean2);
    accepted.add(e.id);
    changed++;
    // Fjern bilder som er tatt ut av registreringen
    const keep = new Set(e.photoIds || []);
    const old = (await db.getAllBy('photos', 'entryId', e.id)).filter((p) => !keep.has(p.id)).map((p) => p.id);
    if (old.length) await db.delMany('photos', old);
  }
  const wanted = [];
  for (const p of data.photos || []) {
    if (accepted.has(p.entryId) || !data.kind) wanted.push(p);
    else if (same.has(p.entryId) && !(await db.get('photos', p.id))) wanted.push(p); // manglende bilde
  }
  const photos = wanted.map((p) => ({ ...p, blob: b64ToBlob(p.blob), thumb: p.thumb ? b64ToBlob(p.thumb) : null }));
  for (let i = 0; i < photos.length; i += 20) await db.putMany('photos', photos.slice(i, i + 20));

  for (const c of data.crew || []) {
    if (!isCrew(c)) continue;
    const cur = await db.get('meta', c.key);
    if (cur && (cur.updatedAt || 0) >= (c.updatedAt || 0)) continue;
    const { sentAt, confirmedAt, ...clean } = c;
    await db.put('meta', markSent ? { ...clean, sentAt: clean.updatedAt || Date.now(), confirmedAt: clean.updatedAt || Date.now() } : clean);
    changed++;
  }

  for (const t of data.tombstones || []) {
    const cur = await db.get('entries', t.id);
    if (cur && (cur.updatedAt || 0) <= t.deletedAt) { await db.deleteEntry(t.id); changed++; }
  }

  // Delte innstillinger: bruk det som er sist endret
  const s = data.settings;
  if (s?.ships && (s.shipsUpdatedAt || 0) > (settings.shipsUpdatedAt || 0)) {
    s.ships.forEach((ship) => {
      const local = settings.ships.find((x) => x.id === ship.id);
      if (local) Object.assign(local, ship); else settings.ships.push(ship);
    });
    settings.shipsUpdatedAt = s.shipsUpdatedAt;
  }
  if (s?.areas && (s.areasUpdatedAt || 0) > (settings.areasUpdatedAt || 0)) {
    settings.areas = s.areas;
    settings.areasUpdatedAt = s.areasUpdatedAt;
  }
  if (s?.parties && (s.partiesUpdatedAt || 0) > (settings.partiesUpdatedAt || 0)) {
    settings.parties = s.parties;
    settings.partiesUpdatedAt = s.partiesUpdatedAt;
  }
  return changed;
}

/* ------------------------------------------------------------------ */
/* PC: OneDrive-mappe                                                  */
/* ------------------------------------------------------------------ */

export async function getRoot() {
  return (await db.get('meta', 'rootDir'))?.handle || null;
}

export async function pickRoot() {
  const handle = await window.showDirectoryPicker({ id: 'tilsynsdagbok', mode: 'readwrite', startIn: 'documents' });
  const old = await getRoot();
  if (!old || !(await old.isSameEntry(handle).catch(() => false))) {
    // Ny mappe: glem hva som er skrevet før, så alle dager skrives på nytt i den nye mappa
    const outKeys = (await db.getAllKeys('meta')).filter((k) => String(k).startsWith('out:'));
    if (outKeys.length) await db.delMany('meta', outKeys);
  }
  await db.put('meta', { key: 'rootDir', handle });
  await inboxDirs(handle);
  return handle;
}

export async function forgetRoot() {
  await db.del('meta', 'rootDir');
}

/** 'granted' | 'prompt' | 'denied'. Med request=true spørres brukeren (krever klikk). */
export async function permission(handle, request = false) {
  const opts = { mode: 'readwrite' };
  let p = await handle.queryPermission(opts);
  if (p !== 'granted' && request) p = await handle.requestPermission(opts);
  return p;
}

async function writeFile(dir, name, blob) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(blob);
  await w.close();
}

async function removeQuiet(dir, name, opts) {
  try { await dir.removeEntry(name, opts); } catch { /* finnes ikke / ikke tom */ }
}

/** Innboks-mappene som finnes ('Inbox' og/eller eldre 'Innboks'). Lager 'Inbox' hvis ingen finnes. */
async function inboxDirs(root) {
  const dirs = [];
  for (const n of INBOX_NAMES) {
    try { dirs.push(await root.getDirectoryHandle(n)); } catch { /* finnes ikke */ }
  }
  if (!dirs.length) dirs.push(await root.getDirectoryHandle(INBOX, { create: true }));
  return dirs;
}

/** Leser inn nye pakker fra innboksen og flytter dem til <innboks>/Processed. */
async function importInbox(root, settings) {
  let files = 0;
  let changed = 0;
  for (const inbox of await inboxDirs(root)) {
  let processed = null;
  for await (const [name, h] of inbox.entries()) {
    if (h.kind !== 'file' || !/^tilsyn.*\.(json|txt)$/i.test(name)) continue;
    let data;
    try { data = JSON.parse(await (await h.getFile()).text()); } catch { continue; }
    if (data?.app !== 'tilsynsdagbok') continue;
    changed += await applyBundle(data, settings);
    processed ??= await inbox.getDirectoryHandle(PROCESSED, { create: true });
    await writeFile(processed, name, await h.getFile());
    await removeQuiet(inbox, name);
    files++;
  }
  }
  return { files, changed };
}

/* ---------- Sortert utskrift per skip og dag ---------- */

function photoBaseName(e, fmtLocShort) {
  const time = (e.time || '').replace(':', '');
  const loc = fmtLocShort(e.location);
  const text = (e.text || '').split('\n')[0].trim().slice(0, 50);
  return safeName([time, e.company, loc].filter(Boolean).join(' ') + (text ? ` - ${text}` : ''), 100);
}

async function resizeForDoc(blob, max = 1280) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const out = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
  return { data: await out.arrayBuffer(), w, h };
}

async function buildDocx(ship, date, entries, photosById, crew, fmtLoc, fmtLong) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType } = await import(DOCX_URL);
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(`Daily log – ${ship.name}${ship.hull ? ` (${ship.hull})` : ''}`)] }),
    new Paragraph({ children: [new TextRun({ text: fmtLong(date), italics: true })] }),
    new Paragraph({ children: [new TextRun({ text: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`, color: '666666' })] }),
  ];
  const rows = (crew?.rows || []).filter((r) => r.company || r.count);
  if (rows.length) {
    const total = rows.reduce((n, r) => n + (Number(r.count) || 0), 0);
    const cell = (text, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(text), bold })] })] });
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240 }, children: [new TextRun(`Manpower on board: ${total}`)] }),
      new Table({
        width: { size: 60, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell('Company', true), cell('People', true)] }),
          ...rows.map((r) => new TableRow({ children: [cell(r.company || '–'), cell(Number(r.count) || 0)] })),
          new TableRow({ children: [cell('Total', true), cell(total, true)] }),
        ],
      }),
    );
  }
  if (entries.length) children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240 }, children: [new TextRun('Entries')] }));
  for (const e of entries) {
    const loc = fmtLoc(e.location);
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280 },
      children: [new TextRun(`${e.time}${e.company ? `  ·  ${e.company}` : ''}${loc ? `  ·  ${loc}` : ''}`)],
    }));
    if (e.inspection) children.push(new Paragraph({
      children: [new TextRun({
        text: `Inspection${e.inspection.result ? `: ${({ accepted: 'Accepted', comments: 'Accepted with comments', rejected: 'Rejected' })[e.inspection.result]}` : ''}${e.inspection.parties?.length ? ` (attended by ${e.inspection.parties.join(', ')})` : ''}`,
        bold: true,
        color: e.inspection.result === 'rejected' ? 'B91C1C' : e.inspection.result === 'accepted' ? '15803D' : 'B45309',
      })],
    }));
    for (const line of (e.text || '').split('\n')) {
      if (line.trim()) children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
    for (const id of e.photoIds || []) {
      const p = photosById.get(id);
      if (!p) continue;
      try {
        const img = await resizeForDoc(p.blob);
        const width = 420;
        children.push(new Paragraph({
          spacing: { before: 120 },
          children: [new ImageRun({ type: 'jpg', data: img.data, transformation: { width, height: Math.round((img.h / img.w) * width) } })],
        }));
      } catch (err) { console.warn('Bilde hoppet over i Word', err); }
    }
  }
  const doc = new Document({ creator: 'Site Diary', title: `Daily log ${ship.name} ${date}`, sections: [{ children }] });
  return Packer.toBlob(doc);
}

const daySig = (shipName, entries, crew) => 'v3|' + shipName + '|' + entries.map((e) => `${e.id}:${e.updatedAt || 0}`).sort().join(',') + `|crew:${crew?.updatedAt || 0}`;

/** Skriver mappa for én dag: bilder + Word-dagbok. Fjerner filer som ikke lenger hører til. */
async function writeDay(root, ship, date, entries, crew, prev, h) {
  const shipFolder = safeName(ship.name);
  const files = {}; // filnavn -> photoId | 'docx'
  const photos = new Map();
  const hasContent = entries.length || crew?.rows?.length;
  if (hasContent) {
    const shipDir = await root.getDirectoryHandle(shipFolder, { create: true });
    const dayDir = await shipDir.getDirectoryHandle(date, { create: true });
    for (const e of entries) {
      const base = photoBaseName(e, h.fmtLocShort);
      for (let i = 0; i < (e.photoIds || []).length; i++) {
        const id = e.photoIds[i];
        const p = await db.get('photos', id);
        if (!p) continue;
        photos.set(id, p);
        let name = `${base}${e.photoIds.length > 1 ? ` (${i + 1})` : ''}.jpg`;
        for (let n = 2; files[name]; n++) name = `${base} (${i + 1}-${n}).jpg`;
        files[name] = id;
        const same = prev?.folder === shipFolder && prev?.files?.[name] === id;
        if (!same) await writeFile(dayDir, name, p.blob);
      }
    }
    const docName = safeName(`Daily log ${ship.name} ${date}`) + '.docx';
    files[docName] = 'docx';
    await writeFile(dayDir, docName, await buildDocx(ship, date, entries, photos, crew, h.fmtLoc, h.fmtLong));
  }
  // Rydd bort filer fra forrige gang som ikke lenger skal være der
  if (prev?.files) {
    try {
      const oldShip = await root.getDirectoryHandle(prev.folder);
      const oldDay = await oldShip.getDirectoryHandle(date);
      for (const name of Object.keys(prev.files)) {
        if (prev.folder !== shipFolder || !(name in files)) await removeQuiet(oldDay, name);
      }
      if (!hasContent || prev.folder !== shipFolder) await removeQuiet(oldShip, date); // bare hvis tom
    } catch { /* mappa finnes ikke lenger */ }
  }
  return { folder: shipFolder, files };
}

/**
 * Full synk på PC: les inn Innboks, og skriv ut alle dager som er endret.
 * @param {object} settings  innstillinger (skip), kan bli oppdatert med skipsnavn fra iPhone
 * @param {{fmtLoc:Function, fmtLocShort:Function, fmtLong:Function, onProgress?:Function}} h
 */
export async function syncFolder(settings, h) {
  const root = await getRoot();
  if (!root) throw new Error('No OneDrive folder selected.');
  if (await permission(root) !== 'granted') throw new Error('The app has no access to the folder. Click “Connect”.');

  const inbox = await importInbox(root, settings);

  const entries = await db.getAll('entries');
  const groups = new Map();
  for (const e of entries) {
    const k = `${e.shipId}|${e.date}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const meta = await db.getAll('meta');
  const crewByKey = new Map();
  meta.filter(isCrew).forEach((c) => {
    const k = `${c.shipId}|${c.date}`;
    crewByKey.set(k, c);
    if (!groups.has(k)) groups.set(k, []);
  });
  const outRecs = meta.filter((m) => m.key.startsWith('out:'));
  outRecs.forEach((m) => { const k = m.key.slice(4); if (!groups.has(k)) groups.set(k, []); });
  const prevByKey = new Map(outRecs.map((m) => [m.key.slice(4), m]));

  let days = 0;
  const total = groups.size;
  let n = 0;
  for (const [k, list] of groups) {
    n++;
    const [shipId, date] = k.split('|');
    const ship = settings.ships.find((s) => s.id === shipId) || { id: shipId, name: shipId, hull: '' };
    list.sort((a, b) => (a.time || '').localeCompare(b.time || '') || (a.createdAt || 0) - (b.createdAt || 0));
    const crew = crewByKey.get(k) || null;
    const sig = daySig(ship.name, list, crew);
    const prev = prevByKey.get(k);
    if (prev?.sig === sig) continue;
    h.onProgress?.(`Writing ${ship.name} ${date} (${n}/${total}) …`);
    const res = await writeDay(root, ship, date, list, crew, prev, h);
    if (list.length || crew?.rows?.length) await db.put('meta', { key: `out:${k}`, sig, ...res, at: Date.now() });
    else await db.del('meta', `out:${k}`);
    days++;
  }
  const areas = await writeAreas(root, settings, h);
  const snapshot = await writeSnapshot(root, settings);
  await db.put('meta', { key: 'lastSync', at: Date.now() });
  return { imported: inbox.files, changed: inbox.changed, days, areas, folder: root.name, snapshot };
}

/* ------------------------------------------------------------------ */
/* PC → iPhone                                                         */
/* ------------------------------------------------------------------ */

/** PC: husk slettinger, så iPhone også fjerner dem når den henter endringer. */
export async function addPcTombstone(entry) {
  if (!entry) return;
  const list = (await db.get('meta', 'pcTombstones'))?.list || [];
  list.push({ id: entry.id, shipId: entry.shipId, date: entry.date, deletedAt: Date.now() });
  await db.put('meta', { key: 'pcTombstones', list: list.slice(-2000) });
}

/**
 * Skriver «From PC/site-diary-from-pc.json» med alt iPhone trenger for å få PC-endringer:
 * registreringer, bemanning, slettinger, skipsnavn og bilder som er lagt inn på PC.
 * Skrives bare når noe er endret.
 */
async function writeSnapshot(root, settings) {
  const entries = await db.getAll('entries');
  const crew = await allCrew();
  const tombstones = (await db.get('meta', 'pcTombstones'))?.list || [];
  const sig = [
    entries.map((e) => `${e.id}:${e.updatedAt || 0}`).sort().join(','),
    crew.map((c) => `${c.key}:${c.updatedAt || 0}`).sort().join(','),
    tombstones.length, JSON.stringify(sharedSettings(settings)),
  ].join('|');
  if ((await db.get('meta', 'snapshotSig'))?.sig === sig) return false;

  const createdAt = Date.now();
  const parts = [
    `{"app":"tilsynsdagbok","version":3,"kind":"pc-snapshot","createdAt":${createdAt},`,
    `"settings":${JSON.stringify(sharedSettings(settings))},`,
    `"entries":${JSON.stringify(entries.map(({ sentAt, confirmedAt, ...e }) => e))},`,
    `"crew":${JSON.stringify(crew.map(({ sentAt, confirmedAt, ...c }) => c))},`,
    `"tombstones":${JSON.stringify(tombstones)},"photos":[`,
  ];
  let first = true;
  const ids = await db.getAllKeys('photos');
  for (const id of ids) {
    const p = await db.get('photos', id);
    if (p?.origin !== 'pc') continue; // bilder fra iPhone har iPhone allerede
    const { blob, thumb, ...rest } = p;
    parts.push((first ? '' : ',') + JSON.stringify({ ...rest, blob: await blobToB64(blob), thumb: thumb ? await blobToB64(thumb) : null }));
    first = false;
  }
  parts.push(']}');
  const dir = await root.getDirectoryHandle(FROM_PC, { create: true });
  await writeFile(dir, SNAPSHOT, new Blob(parts, { type: 'application/json' }));
  await db.put('meta', { key: 'snapshotSig', sig, at: createdAt });
  return true;
}

/** iPhone: les fila fra PC-en og slå den inn. Returnerer antall endringer. */
export async function importFromPc(file, settings) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('This is not a valid file.'); }
  if (data?.app !== 'tilsynsdagbok') throw new Error('This file is not from Site Diary.');
  const changed = await applyBundle(data, settings, { markSent: true });

  // Bekreft alt PC-en har (samme eller nyere versjon) – det trenger ikke sendes igjen
  const pcEntries = new Map((data.entries || []).map((e) => [e.id, e.updatedAt || 0]));
  const confirmed = [];
  for (const e of await db.getAll('entries')) {
    const pc = pcEntries.get(e.id);
    if (pc !== undefined && pc >= (e.updatedAt || 0) && isUnconfirmed(e)) {
      confirmed.push({ ...e, sentAt: Math.max(e.sentAt || 0, e.updatedAt || 0), confirmedAt: e.updatedAt || Date.now() });
    }
  }
  if (confirmed.length) await db.putMany('entries', confirmed);
  const pcCrew = new Map((data.crew || []).map((c) => [c.key, c.updatedAt || 0]));
  const crewOk = [];
  for (const c of await allCrew()) {
    const pc = pcCrew.get(c.key);
    if (pc !== undefined && pc >= (c.updatedAt || 0) && isUnconfirmed(c)) {
      crewOk.push({ ...c, sentAt: Math.max(c.sentAt || 0, c.updatedAt || 0), confirmedAt: c.updatedAt || Date.now() });
    }
  }
  if (crewOk.length) await db.putMany('meta', crewOk);
  // Slettinger er bekreftet når PC-fila er nyere enn slettingen og ikke har registreringen
  const left = (await getTombstones()).filter((t) => pcEntries.has(t.id) || (data.createdAt || 0) < t.deletedAt);
  await db.put('meta', { key: 'tombstones', list: left });

  await db.put('meta', { key: 'lastFromPc', at: data.createdAt || Date.now(), importedAt: Date.now() });
  return { changed, confirmed: confirmed.length + crewOk.length, createdAt: data.createdAt };
}

/* ------------------------------------------------------------------ */
/* Bilder sortert per område («By area»)                               */
/* ------------------------------------------------------------------ */

const BY_AREA = 'By area';
const NO_AREA = 'No location';

/** «DB1 PS», «db 1 ps» og «DB 1 PS» blir samme område: «DB 1 PS». */
function canonArea(raw) {
  const t = String(raw || '').trim()
    .replace(/([A-Za-zÆØÅæøå])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-zÆØÅæøå])/g, '$1 $2')
    .replace(/\s+/g, ' ');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/**
 * Området et bilde hører til: Room/tank, ellers Deck, ellers Section.
 * @returns {{key:string, name:string}}
 */
export function areaOf(loc) {
  let name = '';
  if (loc?.room) name = canonArea(loc.room);
  else if (loc?.deck) name = /^\d+$/.test(loc.deck.trim()) ? `Deck ${loc.deck.trim()}` : canonArea(loc.deck);
  else if (loc?.section) name = `Section ${String(loc.section).trim()}`;
  if (!name) name = NO_AREA;
  return { key: name.toLowerCase(), name };
}

/** Visningsnavn per område: den skrivemåten som er brukt oftest (f.eks. «DB 1 PS» framfor «Db 1 ps»). */
export function areaNames(entries) {
  const count = new Map();
  for (const e of entries) {
    const { key, name } = areaOf(e.location);
    if (!count.has(key)) count.set(key, new Map());
    const m = count.get(key);
    m.set(name, (m.get(name) || 0) + 1);
  }
  const out = new Map();
  for (const [key, m] of count) out.set(key, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  return out;
}
export const NO_AREA_NAME = NO_AREA;

/** Kopi av hvert bilde i <skip>/By area/<område>/. Flytter/sletter når område, skip eller tekst endres. */
async function writeAreas(root, settings, h) {
  const entries = await db.getAll('entries');
  const names = areaNames(entries);
  const meta = await db.getAll('meta');
  const prev = new Map(meta.filter((m) => String(m.key).startsWith('area:')).map((m) => [m.key.slice(5), m]));
  const wanted = new Map(); // photoId -> { ship, area, name }
  const used = new Map(); // mappe -> sett med filnavn (unngå like navn)
  for (const e of entries) {
    const ship = settings.ships.find((x) => x.id === e.shipId);
    if (!ship) continue;
    const area = names.get(areaOf(e.location).key);
    const time = (e.time || '').replace(':', '');
    const text = (e.text || '').split('\n')[0].trim().slice(0, 50);
    const base = safeName(`${e.date} ${time}${e.company ? ` ${e.company}` : ''}${text ? ` - ${text}` : ''}`, 110);
    (e.photoIds || []).forEach((id, i) => {
      const folder = `${safeName(ship.name)}/${safeName(area)}`;
      if (!used.has(folder)) used.set(folder, new Set());
      let name = `${base}${e.photoIds.length > 1 ? ` (${i + 1})` : ''}.jpg`;
      for (let n = 2; used.get(folder).has(name); n++) name = `${base} (${i + 1}-${n}).jpg`;
      used.get(folder).add(name);
      wanted.set(id, { ship: safeName(ship.name), area: safeName(area), name });
    });
  }

  const dirCache = new Map();
  const areaDir = async (shipName, area, create) => {
    const k = `${shipName}/${area}`;
    if (dirCache.has(k)) return dirCache.get(k);
    const shipDir = await root.getDirectoryHandle(shipName, { create });
    const by = await shipDir.getDirectoryHandle(BY_AREA, { create });
    const d = await by.getDirectoryHandle(area, { create });
    dirCache.set(k, d);
    return d;
  };

  let changed = 0;
  // Fjern kopier som er flyttet eller slettet
  for (const [id, rec] of prev) {
    const w = wanted.get(id);
    if (w && w.ship === rec.ship && w.area === rec.area && w.name === rec.name) continue;
    try {
      const d = await areaDir(rec.ship, rec.area, false);
      await removeQuiet(d, rec.name);
      const by = await (await root.getDirectoryHandle(rec.ship)).getDirectoryHandle(BY_AREA);
      await removeQuiet(by, rec.area); // bare hvis tom
      dirCache.delete(`${rec.ship}/${rec.area}`);
    } catch { /* finnes ikke lenger */ }
    if (!w) { await db.del('meta', `area:${id}`); changed++; }
  }
  // Skriv nye / flyttede
  let n = 0;
  for (const [id, w] of wanted) {
    const rec = prev.get(id);
    if (rec && rec.ship === w.ship && rec.area === w.area && rec.name === w.name) continue;
    const p = await db.get('photos', id);
    if (!p) continue;
    if (++n % 10 === 0) h.onProgress?.(`Sorting photos by area (${n}) …`);
    await writeFile(await areaDir(w.ship, w.area, true), w.name, p.blob);
    await db.put('meta', { key: `area:${id}`, ...w });
    changed++;
  }
  return changed;
}

/**
 * Engangs-overgang: registreringer sendt før bekreftelse fantes. Det som ble sendt for mer enn
 * to døgn siden regnes som levert; det nyere tas med i neste sending.
 */
export async function migrateConfirmations() {
  if (await db.get('meta', 'confirmMigrated')) return;
  const cutoff = Date.now() - 2 * 864e5;
  const ok = (x) => x.sentAt && !x.confirmedAt && x.sentAt < cutoff && (x.updatedAt || 0) <= x.sentAt;
  const entries = (await db.getAll('entries')).filter(ok).map((e) => ({ ...e, confirmedAt: e.updatedAt || e.sentAt }));
  if (entries.length) await db.putMany('entries', entries);
  const crew = (await allCrew()).filter(ok).map((c) => ({ ...c, confirmedAt: c.updatedAt || c.sentAt }));
  if (crew.length) await db.putMany('meta', crew);
  await db.put('meta', { key: 'confirmMigrated', at: Date.now() });
}
