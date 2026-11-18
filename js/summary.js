// Ukessammendrag til Marine Manager.
// A) Direkte med Claude via Anthropic API (egen API-nøkkel, lagres kun på enheten).
// B) «Kopier til Claude-appen»: instruks + notater kopieres og limes inn i Claude-appen.

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.4.0/+esm';
const MODEL = 'claude-opus-5-5';
const KEY_STORAGE = 'tilsyn-anthropic-key';

export const INSTRUCTIONS = `You help a site supervisor (owner's representative) at a shipyard write the weekly report for newbuildings.
You receive the supervisor's short field notes for one week, mostly written in Norwegian. Each note has a date, a time and, when given, a location on board (section, frame, deck, room).

Write a short weekly summary in English, to be pasted into the weekly report in Marine Manager.

Rules:
- Plain text only. No markdown: no #, no **, no tables. Use "- " for bullets.
- One block per vessel: the vessel name on its own line, followed by 3-7 bullets.
- Where the notes support it, cover: main work and progress; notable observations, deviations or quality issues; meetings and decisions; open items to follow up.
- Merge related notes instead of listing every note. Keep each bullet short, ideally one line.
- Use correct English shipbuilding terminology. Mention the location (e.g. "section 210, frame 42") only when it adds value.
- Do not add facts, numbers or judgements that are not in the notes. If a vessel has no notes, write "- No notes recorded this week."
- Output only the summary, with no introduction or closing remarks.`;

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

function locEn(loc) {
  if (!loc) return '';
  const p = [];
  if (loc.section) p.push(`section ${loc.section}`);
  if (loc.frame) p.push(`frame ${loc.frame}`);
  if (loc.deck) p.push(/^\d+$/.test(loc.deck) ? `deck ${loc.deck}` : loc.deck);
  if (loc.room) p.push(loc.room);
  return p.join(', ');
}

/**
 * Lager en ren tekstversjon av ukas notater for alle skip.
 * @param {string} weekLabel f.eks. "Week 47 (16.11.2026 - 22.11.2026)"
 * @param {{name:string, hull:string, entries:object[]}[]} ships entries sortert kronologisk
 */
export function buildNotes(weekLabel, ships) {
  const out = [weekLabel, ''];
  for (const s of ships) {
    out.push(`=== ${s.name}${s.hull ? ` (${s.hull})` : ''} ===`);
    if (!s.entries.length) { out.push('(no notes)', ''); continue; }
    let lastDate = '';
    for (const e of s.entries) {
      if (e.date !== lastDate) {
        const [y, m, d] = e.date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        out.push(`${DAY_EN[dt.getDay()]} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`);
        lastDate = e.date;
      }
      const parts = [e.time];
      const loc = locEn(e.location);
      if (loc) parts.push(loc);
      parts.push((e.text || '').replace(/\s*\n\s*/g, ' / ').trim() || '(photo only, no text)');
      const n = e.photoIds?.length || 0;
      out.push(`- ${parts.join(' | ')}${n ? ` [${n} photo${n > 1 ? 's' : ''}]` : ''}`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

/** Tekst som limes inn i Claude-appen (variant B). */
export const promptForChat = (notes) => `${INSTRUCTIONS}\n\nHere are the notes:\n\n${notes}`;

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

export async function summarizeWithClaude(notes) {
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
      system: INSTRUCTIONS,
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
