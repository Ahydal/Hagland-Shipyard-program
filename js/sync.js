// OneDrive uten Microsoft-registrering:
//  iPhone → «Send til OneDrive» deler en pakkefil via del-menyen («Arkiver i Filer» → OneDrive/Tilsynsdagbok/Innboks).
//  PC     → appen har tilgang til OneDrive-mappa på disken (File System Access API i Chrome/Edge),
//           leser inn pakkene fra Innboks, og skriver bilder + Word-dagbok sortert per skip og dag.
import * as db from './db.js';

const DOCX_URL = 'https://cdn.jsdelivr.net/npm/docx@9.15.1/+esm';
const INBOX = 'Innboks';
const PROCESSED = 'Behandlet';

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
  return n.replace(/[. ]+$/, '') || 'Uten navn';
}

/* ------------------------------------------------------------------ */
/* iPhone: pakke og sende                                              */
/* ------------------------------------------------------------------ */

const isUnsent = (e) => !e.sentAt || (e.updatedAt || 0) > e.sentAt;

export async function getTombstones() {
  return (await db.get('meta', 'tombstones'))?.list || [];
}

/** Husk slettinger av registreringer som allerede er sendt, så PC-en også fjerner dem. */
export async function addTombstone(entry) {
  if (!entry?.sentAt) return;
  const list = await getTombstones();
  list.push({ id: entry.id, shipId: entry.shipId, date: entry.date, deletedAt: Date.now() });
  await db.put('meta', { key: 'tombstones', list });
}

export async function pendingCount() {
  const entries = await db.getAll('entries');
  return entries.filter(isUnsent).length + (await getTombstones()).length;
}

/** Lager pakkefil med alt som ikke er sendt. */
export async function buildBundle(settings) {
  const createdAt = Date.now();
  const entries = (await db.getAll('entries')).filter(isUnsent);
  const tombstones = await getTombstones();
  const parts = [
    `{"app":"tilsynsdagbok","version":3,"kind":"send","createdAt":${createdAt},`,
    `"settings":${JSON.stringify({ ships: settings.ships, shipsUpdatedAt: settings.shipsUpdatedAt || 0 })},`,
    `"entries":${JSON.stringify(entries.map(({ sentAt, ...e }) => e))},`,
    `"tombstones":${JSON.stringify(tombstones)},"photos":[`,
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
    count: entries.length + tombstones.length,
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
  const left = (await getTombstones()).filter((t) => !bundle.tombstoneIds.includes(t.id));
  await db.put('meta', { key: 'tombstones', list: left });
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
export async function applyBundle(data, settings) {
  let changed = 0;
  const accepted = new Set();
  for (const e of data.entries || []) {
    const cur = await db.get('entries', e.id);
    if (cur && (cur.updatedAt || 0) > (e.updatedAt || 0)) continue;
    const { sentAt, ...clean } = e;
    await db.put('entries', clean);
    accepted.add(e.id);
    changed++;
    // Fjern bilder som er tatt ut av registreringen
    const keep = new Set(e.photoIds || []);
    const old = (await db.getAllBy('photos', 'entryId', e.id)).filter((p) => !keep.has(p.id)).map((p) => p.id);
    if (old.length) await db.delMany('photos', old);
  }
  const photos = (data.photos || []).filter((p) => accepted.has(p.entryId) || !data.kind)
    .map((p) => ({ ...p, blob: b64ToBlob(p.blob), thumb: p.thumb ? b64ToBlob(p.thumb) : null }));
  for (let i = 0; i < photos.length; i += 20) await db.putMany('photos', photos.slice(i, i + 20));

  for (const t of data.tombstones || []) {
    const cur = await db.get('entries', t.id);
    if (cur && (cur.updatedAt || 0) <= t.deletedAt) { await db.deleteEntry(t.id); changed++; }
  }

  // Skipsnavn: bruk det som er sist endret
  const s = data.settings;
  if (s?.ships && (s.shipsUpdatedAt || 0) > (settings.shipsUpdatedAt || 0)) {
    s.ships.forEach((ship) => {
      const local = settings.ships.find((x) => x.id === ship.id);
      if (local) Object.assign(local, ship); else settings.ships.push(ship);
    });
    settings.shipsUpdatedAt = s.shipsUpdatedAt;
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
  await handle.getDirectoryHandle(INBOX, { create: true });
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

/** Leser inn nye pakker fra Innboks og flytter dem til Innboks/Behandlet. */
async function importInbox(root, settings) {
  const inbox = await root.getDirectoryHandle(INBOX, { create: true });
  let processed = null;
  let files = 0;
  let changed = 0;
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
  return { files, changed };
}

/* ---------- Sortert utskrift per skip og dag ---------- */

function photoBaseName(e, fmtLocShort) {
  const time = (e.time || '').replace(':', '');
  const loc = fmtLocShort(e.location);
  const text = (e.text || '').split('\n')[0].trim().slice(0, 50);
  return safeName([time, loc].filter(Boolean).join(' ') + (text ? ` - ${text}` : ''), 100);
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

async function buildDocx(ship, date, entries, photosById, fmtLoc, fmtLong) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } = await import(DOCX_URL);
  const children = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(`Dagbok – ${ship.name}${ship.hull ? ` (${ship.hull})` : ''}`)] }),
    new Paragraph({ children: [new TextRun({ text: fmtLong(date), italics: true })] }),
    new Paragraph({ children: [new TextRun({ text: `${entries.length} registreringer`, color: '666666' })] }),
  ];
  for (const e of entries) {
    const loc = fmtLoc(e.location);
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280 },
      children: [new TextRun(`kl. ${e.time}${loc ? `  ·  ${loc}` : ''}`)],
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
  const doc = new Document({ creator: 'Tilsynsdagbok', title: `Dagbok ${ship.name} ${date}`, sections: [{ children }] });
  return Packer.toBlob(doc);
}

const daySig = (shipName, entries) => shipName + '|' + entries.map((e) => `${e.id}:${e.updatedAt || 0}`).sort().join(',');

/** Skriver mappa for én dag: bilder + Word-dagbok. Fjerner filer som ikke lenger hører til. */
async function writeDay(root, ship, date, entries, prev, h) {
  const shipFolder = safeName(ship.name);
  const files = {}; // filnavn -> photoId | 'docx'
  const photos = new Map();
  if (entries.length) {
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
    const docName = safeName(`Dagbok ${ship.name} ${date}`) + '.docx';
    files[docName] = 'docx';
    await writeFile(dayDir, docName, await buildDocx(ship, date, entries, photos, h.fmtLoc, h.fmtLong));
  }
  // Rydd bort filer fra forrige gang som ikke lenger skal være der
  if (prev?.files) {
    try {
      const oldShip = await root.getDirectoryHandle(prev.folder);
      const oldDay = await oldShip.getDirectoryHandle(date);
      for (const name of Object.keys(prev.files)) {
        if (prev.folder !== shipFolder || !(name in files)) await removeQuiet(oldDay, name);
      }
      if (!entries.length || prev.folder !== shipFolder) await removeQuiet(oldShip, date); // bare hvis tom
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
  if (!root) throw new Error('Ingen OneDrive-mappe valgt.');
  if (await permission(root) !== 'granted') throw new Error('Appen mangler tilgang til mappa. Trykk «Koble til».');

  const inbox = await importInbox(root, settings);

  const entries = await db.getAll('entries');
  const groups = new Map();
  for (const e of entries) {
    const k = `${e.shipId}|${e.date}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  const outRecs = (await db.getAll('meta')).filter((m) => m.key.startsWith('out:'));
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
    const sig = daySig(ship.name, list);
    const prev = prevByKey.get(k);
    if (prev?.sig === sig) continue;
    h.onProgress?.(`Skriver ${ship.name} ${date} (${n}/${total}) …`);
    const res = await writeDay(root, ship, date, list, prev, h);
    if (list.length) await db.put('meta', { key: `out:${k}`, sig, ...res, at: Date.now() });
    else await db.del('meta', `out:${k}`);
    days++;
  }
  await db.put('meta', { key: 'lastSync', at: Date.now() });
  return { imported: inbox.files, changed: inbox.changed, days, folder: root.name };
}
