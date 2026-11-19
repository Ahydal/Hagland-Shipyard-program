# Tilsynsdagbok

En enkel app for byggetilsyn på nybygg. Du går rundt om bord, **tar bilder og skriver korte notater**,
og registrerer hvor om bord det var (seksjon, spant, dekk og rom). Alt havner sortert i OneDrive, og appen
lager ukessammendrag til Marine Manager.

**App:** https://ahydal.github.io/Hagland-Shipyard-program/ (bruk store bokstaver i adressen som vist)

## Kom i gang

Appen er på engelsk. Knappenavnene under er de du ser i appen.

1. **PC (Chrome eller Edge):**
   - Åpne appen og installer den med ikonet i adressefeltet.
   - Lag en mappe i OneDrive, for eksempel `OneDrive - R.G. HAGLAND AS\Desktop\Tilsyns app`.
   - Trykk **«Choose OneDrive folder»** i appen og velg mappa. Appen lager `Inbox` (en eldre `Innboks` virker også) og `From PC`.
2. **iPhone (Safari):**
   - Åpne appen, trykk Del-knappen og velg **«Legg til på Hjem-skjerm»**.
   - OneDrive-appen må være installert og logget inn.

## Daglig bruk

**På iPhone:**
1. Velg skip og trykk **«Take photo»**. Velg eventuelt firma (knapper fra dagens bemanning), skriv et par ord og fyll ut sted, og trykk **«Save»** (eller **«Save and take next photo»**).
2. **Manpower:** trykk på linja og legg inn firma og antall personer om bord. «Same as …» kopierer forrige dag.
3. **Send til PC:** trykk **«Send to OneDrive»** → **«Open share menu»** → **«Arkiver i Filer»** → OneDrive → app-mappa → **Inbox**.
4. **Hent fra PC:** trykk **«Get from PC»** og velg `From PC/site-diary-from-pc.json` i OneDrive.
   Du får da med endringer gjort på PC-en: registreringer, bemanning, slettinger og bilder.

**Inspeksjon:** huk av **«Inspection»**, velg resultat (Accepted / With comments / Rejected) og hvem som deltok. Det kommer tydelig med i dags- og ukesrapporten
(avviste inspeksjoner havner under «Findings»). Hvem som kan delta, settes under Settings → Inspections.

**Faste tanker og rom:** under Settings → *Tanks and rooms* legger du inn lista per skip (én per linje). Trykk **«List»** ved «Room / tank» for å velge.
Lista deles mellom iPhone og PC, og bestemmer rekkefølgen på bildemappene. I «Photos» på PC kan et område få nytt navn med **«Rename»**. Bildene flyttes da også.

**Sending som ikke kom fram:** endringer regnes ikke som levert før PC-en har bekreftet dem via «Get from PC». Til da blir de med i hver sending,
så ingenting går tapt hvis en fil aldri kom fram til OneDrive. Tips: åpne OneDrive-appen et øyeblikk etter at du har sendt.

**Registrert på feil skip?** Åpne registreringen, velg riktig skip i **«Vessel»** og trykk **«Save»**.

**På PC:** når appen er åpen, henter den inn sendingene automatisk (hvert 2. minutt). Bilder og Word-dagbok («Daily log») havner i
`<mappe>\<skip>\<dato>\`. Endringer du gjør på PC-en, skrives til `From PC` slik at iPhone kan hente dem.

**Bilder per område:** fanen **«Photos»** på PC viser bildene sortert i mapper etter område. Området er «Room / tank» (f.eks. `DB 1 PS`),
ellers Deck, ellers Section. `DB1 PS`, `db1 ps` og `DB 1 PS` havner i samme mappe. De samme mappene ligger i OneDrive under
`<skip>\By area\<område>\`, og bildene flyttes dit automatisk hvis du endrer området.

**Rapporter til Marine Manager** (lages per skip, på engelsk):
- **Daily report:** «Good afternoon», så «<Firma> – N people on board» med korte setninger, og til slutt signatur. Navn og stilling legger du inn under Settings → Reports.
- **Weekly report** (fanen «Week»): en kort, generell oppsummering av uka (ikke dag for dag) til «Description»-feltet i MM, og ferdig tittel, for eksempel «NB 853. Week 47 (Nov 16, 2026 - Nov 22, 2026)».
- Trykk **«Write with AI»** (krever API-nøkkel) eller **«Copy for Claude app»**, og så **«Copy text»**.

Se [PLAN.md](PLAN.md) for detaljer og videre planer.

## Kjøre lokalt

```bash
python3 -m http.server 8000
# åpne http://localhost:8000
```

## Teknisk

Ren HTML/CSS/JavaScript uten byggesteg. Eksterne biblioteker lastes fra jsDelivr bare når de trengs:
`docx` lager Word-filene på PC, og `@anthropic-ai/sdk` brukes til AI-sammendraget.

| Fil | Innhold |
| --- | --- |
| `index.html` | Rammeverk |
| `js/app.js` | Visninger: dagbok, uke/dashbord, innstillinger, registrering |
| `js/db.js` | Lokal lagring (IndexedDB) |
| `js/sync.js` | OneDrive: pakkefil fra iPhone, mappe-synk og Word-dagbok på PC |
| `js/summary.js` | Ukessammendrag (Claude API / kopier til Claude-appen) |
| `css/styles.css` | Utseende (mobil og PC) |
| `sw.js` | Bruk uten nett. **Øk `CACHE`-versjonen når filer endres.** |
