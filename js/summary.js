// Ukessammendrag og dagsrapport til Marine Manager.
// A) Direkte med Claude via Anthropic API (egen API-nøkkel, lagres kun på enheten).
// B) «Kopier til Claude-appen»: instruks + notater kopieres og limes inn i Claude-appen.

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.4.0/+esm';
const MODEL = 'claude-opus-5-5';
const KEY_STORAGE = 'tilsyn-anthropic-key';

// Stilen følger Hagland sine rapporter i Marine Manager. Eksemplene er oppdiktede (ingen ekte navn).
const WEEK_INSTRUCTIONS = `You help a site supervisor (owner's representative) at a shipyard write the weekly report for ONE newbuilding vessel.
You receive the supervisor's short field notes for one week, mostly written in Norwegian. Each note has a date, a time and, when given, a subcontractor/company and a location on board (section, frame, deck, room).

Write the "Description" text of the weekly report in English, to be pasted into Marine Manager.

Style - follow this structure and tone (the content below is only an invented example):

Example Yard Location:

Hatch Covers Nos. 2 and 3: The hatch covers were presented to Class and the owner for inspection. The pressure tests and final inspections were completed and accepted without comments.

Hatch Covers Nos. 6 and 7: The first coat of paint has been applied.

Observation: The temperature inside the painting hall is too low and the humidity too high, which may affect the quality of the coating application.

Example Steel Subcontractor:

Sections Nos. 120 and 121: The sections were inspected by Class and the site team. The construction was accepted.

Findings: Sharp edges have not been properly treated in several locations within the technical areas.

Main Engine (ME): The main engine has been delivered. The ME foundation has received its first coat of paint.

Inspections: No official inspection invitations have been received.

Concerns:

Poor communication between subcontractors.

Rules:
- Plain text only. No markdown, no bullets, no bold. Separate paragraphs with one blank line.
- Group the text under a heading line ending with ":" for each location or subcontractor when the notes make that clear. Otherwise group by system or area.
- Start each paragraph with the item or topic followed by a colon (e.g. "Section 210:", "Main Engine (ME):", "Observation:", "Findings:").
- Merge related notes from different days into one paragraph that states the current status at the end of the week.
- Formal, factual, full sentences. Past tense for completed work, present tense for ongoing work. Correct English shipbuilding terminology.
- Add "Inspections:" and "Concerns:" sections at the end only when the notes support them.
- Do not add facts, numbers, names or judgements that are not in the notes. If there are no notes, write "No notes recorded this week."
- Output only the description text, with no title, greeting or closing remarks.`;

const DAY_INSTRUCTIONS = `You help a site supervisor (owner's representative) at a shipyard write the daily report for ONE newbuilding vessel.
You receive the supervisor's short field notes for one day, mostly written in Norwegian, grouped by subcontractor/company, together with the number of people each company had on board.

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
  if (is(Anthropic.AuthenticationError)) return 'API-nøkkelen ble ikke godkjent. Sjekk nøkkelen under Innstillinger.';
  if (is(Anthropic.PermissionDeniedError)) return 'API-nøkkelen mangler tilgang.';
  if (is(Anthropic.RateLimitError)) return 'For mange forespørsler akkurat nå. Prøv igjen om et minutt.';
  if (is(Anthropic.BadRequestError)) {
    return /credit|balance/i.test(err.message)
      ? 'Kreditten på Anthropic-kontoen er brukt opp. Fyll på under «Billing» på console.anthropic.com.'
      : `Ugyldig forespørsel: ${err.message}`;
  }
  if (is(Anthropic.APIConnectionError)) return 'Får ikke kontakt med Claude. Sjekk nettforbindelsen.';
  if (is(Anthropic.APIError)) return `Feil fra Claude (${err.status ?? 'ukjent'}). Prøv igjen litt senere.`;
  return err?.message || String(err);
}

export async function summarizeWithClaude(notes, kind = 'week') {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Ingen API-nøkkel. Legg den inn under Innstillinger.');

  let Anthropic;
  try {
    ({ default: Anthropic } = await import(SDK_URL));
  } catch {
    throw new Error('Kunne ikke laste Claude. Krever nettforbindelse.');
  }

  // Nøkkelen er brukerens egen og ligger kun på denne enheten (én bruker, ingen server).
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
  let response;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: INSTRUCTIONS[kind],
      messages: [{ role: 'user', content: notes }],
    });
  } catch (err) {
    throw new Error(explainError(err, Anthropic));
  }

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude kunne ikke lage dette sammendraget. Prøv «Kopier til Claude-appen» i stedet.');
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('Fikk et tomt svar fra Claude. Prøv igjen.');
  return text;
}
