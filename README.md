# Tilsynsdagbok – byggetilsyn nybygg

En enkel app for å følge opp hva som skjer om bord hver dag under bygging av nye skip.
Du kan ta bilder, skrive notater, registrere avvik og følge dem opp, og lage rapporter.
Den samme appen fungerer på **mobil** (iPhone/Android) og **PC/Mac**.

## Funksjoner

- **Dagbok per skip og dag.** Bytt mellom skipene øverst, og bla mellom dager.
- **«Ta bilde»** åpner kameraet direkte. Bildet lagres med en gang, og du kan legge på tittel og notat etterpå.
- **Kategorier:** Observasjon, Avvik, Inspeksjon/test, Fremdrift, Møte, HMS og Annet.
- **Sted om bord** og **referanse** (tegning, NCR-nr., sjekkliste). Appen foreslår steder du har brukt før.
- **Dagens oppsummering** for vær, bemanning og hovedaktiviteter.
- **Oppfølging:** punkter merket «Krever oppfølging» får ansvarlig, frist og status (åpen/lukket). Punkter over fristen vises øverst i rødt.
- **Bilder:** galleri over alle bilder per skip, med fullskjermvisning og nedlasting.
- **Søk** i alle registreringer.
- **Rapport** for valgt periode (dag, uke, måned) med bilder og en liste over åpne punkter. Den kan skrives ut eller lagres som PDF.
- **Virker uten nett.** All data lagres lokalt på enheten.
- **Sikkerhetskopi:** eksporter alt til én fil og importer den på en annen enhet, f.eks. fra mobil til PC.
- Valgfritt **dato/tid-stempel** i bildene.
- På PC kan bilder dras inn i appen eller limes inn med Ctrl+V.
- Ulagrede registreringer gjenopprettes hvis mobilen lukker appen mens kameraet er åpent.

## Ta i bruk

Appen er en *progressiv web-app* (PWA). Den må ligge på en HTTPS-adresse for at kamera, installasjon og bruk uten nett skal virke.

### Publisere med GitHub Pages (gratis for offentlige repo)

1. Gå til **Settings → Pages** i GitHub-repoet.
2. Under *Build and deployment* velger du **Deploy from a branch**, gren `main` og mappe `/ (root)`.
3. Etter et minutt eller to ligger appen på `https://<brukernavn>.github.io/<repo-navn>/`.

Andre statiske verter fungerer like bra, for eksempel Netlify, Cloudflare Pages eller en intern webserver.
Det finnes ingen server eller database. Det eneste som publiseres er selve appen.
Bildene og notatene dine forlater aldri enheten.

### Installere

- **iPhone/iPad:** åpne adressen i Safari → Del → «Legg til på Hjem-skjerm».
- **Android:** åpne i Chrome → meny ⋮ → «Installer app».
- **PC/Mac:** åpne i Chrome eller Edge → klikk installer-ikonet i adressefeltet.

### Kjøre lokalt (utvikling)

```bash
python3 -m http.server 8000
# åpne http://localhost:8000
```

## Viktig om lagring

- Dataene ligger **bare på enheten de ble registrert på**. Mobil og PC deler ikke data automatisk.
  Bruk **Innstillinger → Eksporter sikkerhetskopi** og **Importer fil** for å flytte data mellom enheter.
  Ved import blir dataene slått sammen, og ingenting slettes.
- Ta sikkerhetskopi jevnlig, f.eks. hver fredag, og lagre den på OneDrive/Teams eller lignende.
- Hvis du sletter nettleserdata for nettstedet, eller avinstallerer appen, forsvinner dataene.

## Teknisk

Ren HTML/CSS/JavaScript uten byggesteg eller avhengigheter.

| Fil | Innhold |
| --- | --- |
| `index.html` | Rammeverk for appen |
| `js/app.js` | Visninger, redigering, rapport, sikkerhetskopi |
| `js/db.js` | Lokal lagring (IndexedDB) |
| `css/styles.css` | Utseende, mobil/PC-tilpasning og utskrift |
| `sw.js` | Service worker for bruk uten nett. **Øk `CACHE`-versjonen når filer endres.** |
| `manifest.webmanifest`, `icons/` | Installasjon som app |

### Mulige neste steg

- Automatisk synkronisering mellom mobil og PC via en felles skytjeneste, f.eks. Microsoft 365/SharePoint eller Supabase.
- Faste sjekklister for inspeksjoner (f.eks. sveis, maling, rørtest).
- Generalarrangement-tegning der man kan merke av posisjonen for avvik.
- Eksport av avviksliste til Excel.
