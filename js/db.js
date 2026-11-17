// Enkel IndexedDB-innpakning. All data lagres lokalt på enheten.
const DB_NAME = 'tilsynsdagbok';
const DB_VERSION = 1;
let dbPromise;

export function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, DB_VERSION);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
        if (!d.objectStoreNames.contains('entries')) {
          const s = d.createObjectStore('entries', { keyPath: 'id' });
          s.createIndex('shipId', 'shipId');
          s.createIndex('ship_date', ['shipId', 'date']);
        }
        if (!d.objectStoreNames.contains('photos')) {
          const p = d.createObjectStore('photos', { keyPath: 'id' });
          p.createIndex('entryId', 'entryId');
          p.createIndex('shipId', 'shipId');
        }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbPromise;
}

const req = (r) => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

const done = (t) => new Promise((resolve, reject) => {
  t.oncomplete = () => resolve();
  t.onerror = () => reject(t.error);
  t.onabort = () => reject(t.error || new Error('Transaksjon avbrutt'));
});

async function store(name) {
  return (await open()).transaction(name, 'readonly').objectStore(name);
}

export async function get(name, key) { return req((await store(name)).get(key)); }
export async function getAll(name) { return req((await store(name)).getAll()); }
export async function getAllKeys(name) { return req((await store(name)).getAllKeys()); }
export async function getAllBy(name, index, query) {
  return req((await store(name)).index(index).getAll(query));
}

export async function putMany(name, values) {
  const t = (await open()).transaction(name, 'readwrite');
  const s = t.objectStore(name);
  values.forEach((v) => s.put(v));
  return done(t);
}
export const put = (name, value) => putMany(name, [value]);

export async function delMany(name, keys) {
  const t = (await open()).transaction(name, 'readwrite');
  const s = t.objectStore(name);
  keys.forEach((k) => s.delete(k));
  return done(t);
}
export const del = (name, key) => delMany(name, [key]);

/** Lagrer en registrering og oppdaterer/sletter tilhørende bilder i én transaksjon. */
export async function saveEntry(entry, photos, removedPhotoIds) {
  const t = (await open()).transaction(['entries', 'photos'], 'readwrite');
  t.objectStore('entries').put(entry);
  const ps = t.objectStore('photos');
  photos.forEach((p) => ps.put(p));
  removedPhotoIds.forEach((id) => ps.delete(id));
  return done(t);
}

/** Sletter en registrering og alle bildene som hører til den. */
export async function deleteEntry(id) {
  const t = (await open()).transaction(['entries', 'photos'], 'readwrite');
  t.objectStore('entries').delete(id);
  const idx = t.objectStore('photos').index('entryId');
  idx.openKeyCursor(IDBKeyRange.only(id)).onsuccess = (ev) => {
    const c = ev.target.result;
    if (c) { t.objectStore('photos').delete(c.primaryKey); c.continue(); }
  };
  return done(t);
}

/** Finner bilder som ikke hører til noen lagret registrering (f.eks. etter krasj). */
export async function orphanPhotoIds(exceptEntryId) {
  const entryIds = new Set(await getAllKeys('entries'));
  const idx = (await open()).transaction('photos', 'readonly').objectStore('photos').index('entryId');
  return new Promise((resolve, reject) => {
    const out = [];
    const r = idx.openKeyCursor();
    r.onsuccess = () => {
      const c = r.result;
      if (!c) return resolve(out);
      if (!entryIds.has(c.key) && c.key !== exceptEntryId) out.push(c.primaryKey);
      c.continue();
    };
    r.onerror = () => reject(r.error);
  });
}
