# Plan – Tilsynsdagbok

## Formål
En enkel app for byggetilsynet på de to Hagland-nybyggene. Den skal brukes til å
**gå rundt om bord, ta bilder og raskt skrive ned hva som skjer**. I tillegg skal den lage et
**kort ukessammendrag på engelsk** som limes inn i ukesrapporten i Marine Manager.

## Rammer
| | Valg |
|---|---|
| Brukere | Kun én bruker (byggetilsynet) |
| Enheter | iPhone (i felt), Windows-PC (kontor) |
| Type app | Web-app installert på hjemskjermen (PWA). Ingen App Store. |
| Lagring | Lokalt på telefonen først (virker uten nett) og så automatisk til **privat OneDrive** |
| Sammendrag | AI (Claude), på engelsk, ett samlet sammendrag for begge skip |

## Funksjoner

### 1. Registrering (iPhone)
- Velg skip øverst (Nybygg 1 / Nybygg 2).
- Stor knapp **«Ta bilde»**. Etterpå kan du skrive et kort notat og eventuelt sted om bord.
  Begge kan hoppes over.
- Sted angis med fire korte felt: **Seksjon, Spant, Dekk og Rom**. Forslagene bygger på det du har
  skrevet før, og «Samme som sist» fyller inn forrige sted med ett trykk.
- **«Lagre og ta neste bilde»** for å gå rundt og dokumentere mange ting raskt.
- **Notat uten bilde** er også mulig.
- Liste over dagens registreringer. Trykk på en for å rette eller slette.
- Bla til tidligere dager.
- Sky-ikon som viser status for opplasting («Alt lastet opp» / «3 venter på nett»).
- Det du registrerer gjenopprettes hvis iPhone lukker appen mens kameraet er åpent.

### 2. OneDrive
```
OneDrive / Apper / Tilsynsdagbok /
   Nybygg 1 /
      2026-11-18 /
         0912 Maskinrom - sveis spant 42.jpg
         Dagbok Nybygg 1 2026-11-18.docx
   Nybygg 2 / ...
```
- Bildene lastes opp med full kvalitet så snart det er nett.
- Word-dagboken for hver dag viser klokkeslett, sted, notat og bilder. Den oppdateres etter
  rundt 10 minutter uten nye registreringer, og alltid når dagen er over. Da slipper vi å
  laste den opp på nytt etter hvert bilde og spare mobildata.
- Registreringer som rettes eller slettes i appen, rettes eller slettes også i OneDrive.
- Appen har kun tilgang til sin egen mappe (`Apper/Tilsynsdagbok`).
- Innlogging med Microsoft-konto. På iPhone må man trolig logge inn på nytt omtrent én gang
  i døgnet. Det er en begrensning hos Microsoft. Registreringer lagres lokalt i mellomtiden.
- Innstilling for å rydde bort bilder fra telefonen som er lastet opp og er eldre enn N dager.

### 3. Ukessammendrag til Marine Manager
- Knapp **«Lag ukessammendrag»**. Velg uke (standard er inneværende uke).
- Notatene fra uka (bare tekst, ikke bilder) for begge skip sendes til Claude.
  Claude lager et kort sammendrag **på engelsk** med én seksjon per skip:
  hovedaktiviteter og fremdrift, viktige observasjoner, og hva som gjenstår eller må følges opp.
- Ren tekst med enkle punktlister, som er lett å lime inn i Marine Manager.
- Teksten kan rettes i appen før **«Kopier»**. Det lages ingen egen fil.
  Det eneste resultatet er teksten som limes inn i ukesrapporten i MM.
- Reserve uten nett eller AI: ei enkel liste over ukas notater.
- Krever en egen Anthropic API-nøkkel. Den legges inn under Innstillinger og lagres bare på
  enheten. Kostnaden er under 1 kr per sammendrag.
- Personvern: notatteksten sendes til Anthropic når sammendraget lages.

### Tatt ut fra prototypen
Kategorier, avvik og oppfølging med frister, rapportgenerator, søk, bildegalleri og
sikkerhetskopi til fil (OneDrive er sikkerhetskopien). Dette kan tas inn igjen senere ved behov.

## Rekkefølge
| Steg | Hva | Hvem |
|---|---|---|
| 1 | Forenkle appen til registrering (bilde + notat + sted) ✅ | Claude |
| 2 | Publisere appen på fast https-adresse (GitHub Pages eller Netlify) | Bruker + Claude |
| 3 | Registrere appen hos Microsoft (guide følger, ca. 10 min) | Bruker |
| 4 | OneDrive: innlogging, opplastingskø, mappestruktur | Claude |
| 5 | Word-dagbok per dag | Claude |
| 6 | Ukessammendrag med Claude og kopier-knapp | Claude |
| 7 | Opprette Anthropic-konto og API-nøkkel (guide følger) | Bruker |
| 8 | Prøve på iPhone i en uke og justere | Bruker + Claude |

## Åpne spørsmål
- Eksempel på en tidligere ukesrapport fra Marine Manager, for å treffe stil og lengde (valgfritt).
- Repoet er privat i dag. Det gjøres offentlig i steg 2 slik at GitHub Pages kan brukes gratis.
  Bare koden blir synlig. Bilder og notater ligger aldri i repoet.
