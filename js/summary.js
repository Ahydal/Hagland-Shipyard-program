// Ukessammendrag og dagsrapport til Marine Manager.
// A) Direkte med Claude via Anthropic API (egen API-nøkkel, lagres kun på enheten).
// B) «Kopier til Claude-appen»: instruks + notater kopieres og limes inn i Claude-appen.

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.4.0/+esm';
const MODEL = 'claude-opus-5-5';
const KEY_STORAGE = 'tilsyn-anthropic-key';

// Stilen følger Hagland sine rapporter i Marine Manager. Eksemplene er oppdiktede (ingen ekte navn).
const WEEK_INSTRUCTIONS = `You help a site supervisor (owner's representative) at a shipyard write the weekly report for ONE newbuilding vessel.
You receive the supervisor's short field notes for one week, written in Norwegian or English. Each note has a date, a time and, when given, a subcontractor/company and a location on board (section, frame, deck, room).

Write a short, general summary of the week in English for the "Description" field of the weekly report in Marine Manager.

Style - follow this structure and tone (the content below is only an invented example):

Steel and outfitting: Erection of the aft sections continued and sections 120 and 121 were accepted by Class. Pipe and cable installation is progressing in the engine room.

Hatch covers: Hatch covers Nos. 2 and 3 were pressure tested and accepted. Painting of the remaining covers is in progress.

Main Engine (ME): The main engine has been delivered and the foundation has received its first coat of paint.

Findings: Surface preparation in several tanks did not meet the specification and has to be redone.

Concerns: Progress remains behind schedule.

Rules:
- Give a general overview of the whole week: main progress, important issues and what is outstanding. Do NOT go through the week day by day and do not mention dates or weekdays.
- Keep it short and simple: about 4-7 short paragraphs and roughly 80-200 words in total. Leave out minor details and routine items.
- Plain text only. No markdown, no bullets, no bold. Separate paragraphs with one blank line.
- Start each paragraph with a short topic, area or subcontractor followed by a colon. Merge related notes into one paragraph that states the status at the end of the week.
- Add "Findings:" and "Concerns:" paragraphs only when the notes support them.
- Formal, factual, full sentences with correct English shipbuilding terminology.
- Do not add facts, numbers, names or judgements that are not in the notes. If there are no notes, write "No notes recorded this week."
- Output only the description text, with no title, greeting or closing remarks.`;

const DAY_INSTRUCTIONS = `You help a site supervisor (owner's representative) at a shipyard write the daily report for ONE newbuilding vessel.
You receive the supervisor's short field notes for one day, written in Norwegian or English, grouped by subcontractor/company, together with the number of people each company had on board.

Write the daily report in English, to be pasted into Marine Manager or an e-mail.

Style - follow this structure and tone (the content below is only an invented example):

Good afternoon,

Example Painting – 9 people on board
Grinding and surface preparation works are in progress in tanks Nos. 1 DB PS & SB and 2 DB PS & SB.
Surface preparation in tank No. 4 DB PS & SB has been inspected by the paint supplier and the owner. The tank was rejected.
Example Electro – 10 people on board
Cable termination in the IAS cabinets is in progress. Cable pulling to the CO2 room is also in progress.
Example Shipyard
The yard project managers were on site until 12:00.

Kind regards,
Name
Title

Rules:
- Plain text only. No markdown, no bullets, no bold.
- Start with "Good afternoon," and a blank line.
- One block per company, in the order given. The heading line is "<Company> – <N> people on board" (use "1 person on board" for one). Use the number exactly as given. If no manpower is given for a company, write just the company name.
- Under each heading write 1-3 short, factual sentences describing that company's work today, based only on its notes. Present tense ("is in progress") for ongoing work, past tense for completed work.
- If a company has manpower but no notes, write only the heading line.
- Notes without a company: place them under the company they clearly belong to; otherwise put them in a final block with the heading "General".
- Use correct English shipbuilding terminology. Mention locations only when they add value.
- Do not add facts, numbers, names or judgements that are not in the notes.
- End with a blank line and the sign-off exactly as given in the notes ("Kind regards," and the lines after it).
- Output only the report.`;

const INSTRUCTIONS = { week: WEEK_INSTRUCTIONS, day: DAY_INSTRUCTIONS };

/* ---------- API-nøkkel ---------- */

export function getApiKey() {
  try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
}
export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch { /* ignorer */ }
}

/* ---------- Notater som tekst ---------- */

const DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function locEn(loc) {
  if (!loc) return '';
  const p = [];
  if (loc.section) p.push(`section ${loc.section}`);
  if (loc.frame) p.push(`frame ${loc.frame}`);
  if (loc.deck) p.push(/^\d+$/.test(loc.deck) ? `deck ${loc.deck}` : loc.deck);
  if (loc.room) p.push(loc.room);
  return p.join(', ');
}

function noteLine(e, { withCompany = true } = {}) {
  const parts = [e.time];
  if (withCompany && e.company) parts.push(e.company);
  const loc = locEn(e.location);
  if (loc) parts.push(loc);
  parts.push((e.text || '').replace(/\s*\n\s*/g, ' / ').trim() || '(photo only, no text)');
  const n = e.photoIds?.length || 0;
  return `- ${parts.join(' | ')}${n ? ` [${n} photo${n > 1 ? 's' : ''}]` : ''}`;
}

const dayHeading = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DAY_EN[new Date(y, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
};

/** «Nov 09, 2026» – samme datoformat som rapporttitlene i Marine Manager. */
export const mmDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTH_EN[m - 1]} ${String(d).padStart(2, '0')}, ${y}`;
};

/**
 * Ukenotater for ett skip.
 * @param {{name:string, hull:string}} ship
 * @param {string} label f.eks. "NB 853. Week 47 (Nov 16, 2026 - Nov 22, 2026)"
 * @param {object[]} entries kronologisk
 */
export function buildWeekNotes(label, ship, entries) {
  const out = [label, `Vessel: ${ship.name}${ship.hull ? ` (${ship.hull})` : ''}`, ''];
  if (!entries.length) out.push('(no notes)');
  let last = '';
  for (const e of entries) {
    if (e.date !== last) { out.push(dayHeading(e.date)); last = e.date; }
    out.push(noteLine(e));
  }
  return out.join('\n').trim();
}

/**
 * Dagsnotater for ett skip, gruppert per firma.
 * @param {string} label
 * @param {{name:string, hull:string}} ship
 * @param {{company:string, count:number}[]} crew bemanning (rekkefølgen brukes i rapporten)
 * @param {object[]} entries kronologisk
 * @param {string} signOff f.eks. "Kind regards,\nOla Nordmann\nSite Supervisor"
 */
export function buildDayNotes(label, ship, crew, entries, signOff) {
  const out = [label, `Vessel: ${ship.name}${ship.hull ? ` (${ship.hull})` : ''}`, ''];
  const norm = (c) => (c || '').trim().toLowerCase();
  const companies = [];
  crew.forEach((r) => { if (r.company && !companies.some((c) => norm(c.name) === norm(r.company))) companies.push({ name: r.company, count: Number(r.count) || 0 }); });
  entries.forEach((e) => { if (e.company && !companies.some((c) => norm(c.name) === norm(e.company))) companies.push({ name: e.company, count: null }); });
  for (const c of companies) {
    out.push(`## ${c.name}${c.count ? ` – manpower: ${c.count}` : ' – manpower: not given'}`);
    const list = entries.filter((e) => norm(e.company) === norm(c.name));
    if (list.length) list.forEach((e) => out.push(noteLine(e, { withCompany: false })));
    else out.push('(no notes)');
    out.push('');
  }
  const rest = entries.filter((e) => !e.company);
  if (rest.length) {
    out.push('## Notes without company');
    rest.forEach((e) => out.push(noteLine(e, { withCompany: false })));
    out.push('');
  }
  if (!companies.length && !rest.length) out.push('(no notes and no manpower recorded)', '');
  out.push('Sign-off to use:', signOff || 'Kind regards,');
  return out.join('\n').trim();
}

/** Tekst som limes inn i Claude-appen (variant B). kind: 'week' | 'day' */
export const promptForChat = (notes, kind = 'week') => `${INSTRUCTIONS[kind]}\n\nHere are the notes:\n\n${notes}`;

/* ---------- Variant A: Claude API ---------- */

function explainError(err, Anthropic) {
  const is = (cls) => cls && err instanceof cls;
  if (is(Anthropic.AuthenticationError)) return 'The API key was not accepted. Check the key under Settings.';
  if (is(Anthropic.PermissionDeniedError)) return 'The API key does not have access.';
  if (is(Anthropic.RateLimitError)) return 'Too many requests right now. Try again in a minute.';
  if (is(Anthropic.BadRequestError)) {
    return /credit|balance/i.test(err.message)
      ? 'The credit on the Anthropic account is used up. Top up under “Billing” at console.anthropic.com.'
      : `Invalid request: ${err.message}`;
  }
  if (is(Anthropic.APIConnectionError)) return 'Cannot reach Claude. Check the network connection.';
  if (is(Anthropic.APIError)) return `Error from Claude (${err.status ?? 'unknown'}). Try again a bit later.`;
  return err?.message || String(err);
}

async function client() {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key. Add one under Settings.');
  let Anthropic;
  try {
    ({ default: Anthropic } = await import(SDK_URL));
  } catch {
    throw new Error('Could not load Claude. A network connection is required.');
  }
  // Nøkkelen er brukerens egen og ligger kun på denne enheten (én bruker, ingen server).
  return { Anthropic, c: new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 }) };
}

async function ask({ system, content, maxTokens = 16000, refusalMsg }) {
  const { Anthropic, c } = await client();
  let response;
  try {
    response = await c.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content }],
    });
  } catch (err) {
    throw new Error(explainError(err, Anthropic));
  }
  if (response.stop_reason === 'refusal') throw new Error(refusalMsg);
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('Got an empty answer from Claude. Try again.');
  return text;
}

export function summarizeWithClaude(notes, kind = 'week') {
  return ask({
    system: INSTRUCTIONS[kind],
    content: notes,
    refusalMsg: 'Claude could not write this report. Try “Copy for Claude app” instead.',
  });
}
