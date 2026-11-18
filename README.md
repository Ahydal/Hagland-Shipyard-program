# Tilsynsdagbok

En enkel app for byggetilsyn på nybygg. Du går rundt om bord, **tar bilder og skriver korte notater**
om det som skjer, og registrerer hvor om bord det var (seksjon, spant, dekk og rom).

Appen er laget for iPhone, og fungerer også på PC. Se [PLAN.md](PLAN.md) for hva som kommer:
synk til OneDrive, Word-dagbok per dag og ukessammendrag til Marine Manager.

## Slik brukes den

1. Velg skip øverst (Nybygg 1 / Nybygg 2).
2. Trykk **«Ta bilde»**, ta bildet, skriv et par ord og fyll ut sted om bord. Notat og sted kan hoppes over.
3. Trykk **«Lagre»**, eller **«Lagre og ta neste bilde»** for å fortsette rett til kameraet.
4. **«Skriv notat»** lager en registrering uten bilde.
5. Trykk på en registrering for å rette eller slette den. Pilene øverst blar mellom dager.

**Detaljer som er nyttige å vite:**
- Stedsfeltene foreslår verdier du har brukt før. «Samme som sist» fyller inn forrige sted.
- Appen virker uten nett. Alt lagres på telefonen.
- Ulagrede registreringer gjenopprettes hvis telefonen lukker appen mens kameraet er åpent.

## Status

Steg 1 av planen er ferdig. Inntil OneDrive er koblet til, ligger dataene **bare på enheten**.
Bruk Innstillinger → *Eksporter* for sikkerhetskopi.

## Kjøre lokalt

```bash
python3 -m http.server 8000
# åpne http://localhost:8000
```

Kamera, installasjon og bruk uten nett krever at appen åpnes via `https://` (eller `localhost`).

## Teknisk

Ren HTML/CSS/JavaScript uten byggesteg.

| Fil | Innhold |
| --- | --- |
| `index.html` | Rammeverk |
| `js/app.js` | Visninger, registrering, bilder, sikkerhetskopi |
| `js/db.js` | Lokal lagring (IndexedDB) |
| `css/styles.css` | Utseende (mobil og PC) |
| `sw.js` | Bruk uten nett. **Øk `CACHE`-versjonen når filer endres.** |
| `manifest.webmanifest`, `icons/` | Installasjon som app |
