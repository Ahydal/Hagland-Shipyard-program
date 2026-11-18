# Tilsynsdagbok

En enkel app for byggetilsyn på nybygg. Du går rundt om bord, **tar bilder og skriver korte notater**,
og registrerer hvor om bord det var (seksjon, spant, dekk og rom). Alt havner sortert i OneDrive, og appen
lager ukessammendrag til Marine Manager.

**App:** https://ahydal.github.io/Hagland-Shipyard-program/ (bruk store bokstaver i adressen som vist)

## Kom i gang

1. **PC (Chrome eller Edge):**
   - Åpne appen og installer den med ikonet i adressefeltet.
   - Lag mappa `OneDrive\Tilsynsdagbok` i Utforsker.
   - Trykk **«Velg OneDrive-mappe»** i appen og velg den mappa. Appen lager da `Innboks`.
2. **iPhone (Safari):**
   - Åpne appen, trykk Del-knappen og velg **«Legg til på Hjem-skjerm»**.
   - Installer også OneDrive-appen og logg inn, hvis du ikke har den.

## Daglig bruk

**På iPhone:**
1. Velg skip og trykk **«Ta bilde»**. Skriv et par ord og fyll ut sted, og trykk **«Lagre»** (eller **«Lagre og ta neste bilde»**).
   Registrert på feil skip? Åpne registreringen, velg riktig skip i **«Skip»**-feltet og trykk **«Lagre»**. Bildene og OneDrive-mappene flyttes med.
2. Når det passer, for eksempel på slutten av dagen: trykk **«Send til OneDrive»** → **«Åpne del-meny»** → **«Arkiver i Filer»** → **OneDrive → Tilsynsdagbok → Innboks**. iPhone husker mappa.

**På PC:** når appen er åpen, henter den inn sendingene automatisk. Bilder og Word-dagbok havner i
`Tilsynsdagbok\<skip>\<dato>\`. Startsiden viser ukeoversikten.

**Bemanning:** trykk på **«Bemanning»** i dagboken og legg inn firma og antall personer om bord, med − / +.
«Samme som …» kopierer forrige dag. Bemanningen sendes med til PC-en og kommer med i Word-dagboken.

**Dagsrapport:** trykk **«Dagsrapport»** i dagboken (fanen «Dagsrapport» på PC). Trykk **«Lag med AI»** eller **«Kopier til Claude-appen»**,
og så **«Kopier dagsrapport»**. Rapporten er på engelsk, med begge skip og bemanningen.

**Ukesrapport:** åpne ukeoversikten (kalender-ikonet på iPhone) og trykk **«Lag med AI»** eller **«Kopier til Claude-appen»**. Trykk så **«Kopier sammendrag»** og lim inn i Marine Manager.

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
