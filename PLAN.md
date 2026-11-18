# Plan – Tilsynsdagbok

## Formål
En enkel app for byggetilsynet på de to Hagland-nybyggene: **gå rundt om bord, ta bilder og
raskt skrive ned hva som skjer**. Appen lager også et **kort ukessammendrag på engelsk** som limes
inn i ukesrapporten i Marine Manager.

## Rammer
| | Valg |
|---|---|
| Brukere | Kun én bruker (byggetilsynet) |
| Enheter | iPhone (enkel, i felt) og Windows-PC (mer oversikt) |
| Type app | Web-app installert på hjemskjermen (PWA): https://ahydal.github.io/Hagland-Shipyard-program/ |
| Lagring | Lokalt på enheten, og så OneDrive-mappa via PC-en (se under) |
| Sammendrag | Engelsk, ett samlet sammendrag for begge skip. Kun tekst som kopieres inn i MM. |

## Funksjoner

### iPhone – registrering ✅
- Velg skip, trykk **«Ta bilde»**, og skriv et kort notat. Sted angis med **Seksjon, Spant, Dekk og Rom**,
  med forslag og «Samme som sist».
- **«Lagre og ta neste bilde»**, og notater uten bilde.
- Virker uten nett. Det du registrerer gjenopprettes hvis iPhone lukker appen.
- **«Send til OneDrive»**: én pakkefil deles via del-menyen («Arkiver i Filer» →
  OneDrive/Tilsynsdagbok/Innboks). Bare nye eller endrede registreringer, og slettinger, sendes.

### PC – oversikt ✅
- Startsiden er **ukeoversikten**. Den viser ukas registreringer for begge skip (filter på skip og tekst),
  antall per dag, mest brukte steder og ukas bilder.
- **OneDrive-mappe**: velg `OneDrive\Tilsynsdagbok` én gang. Når appen er åpen (sjekker hvert 2. minutt):
  - leser den inn pakker fra `Innboks` og flytter dem til `Innboks/Behandlet`
  - skriver bilder og Word-dagbok sortert per skip og dag:
    ```
    Tilsynsdagbok/
       Innboks/            ← iPhone legger pakker her
       Nybygg 1/
          2026-11-18/
             0912 Seksj 210 Maskinrom - Sveis på spant 42.jpg
             Dagbok Nybygg 1 2026-11-18.docx
       Nybygg 2/ ...
    ```
  - Endringer og slettinger fra iPhone oppdaterer filene og dagboken.
- Krever Chrome eller Edge på PC-en.

### Ukessammendrag til Marine Manager ✅
- **«Lag med AI»**: Claude lager sammendraget direkte. Krever egen Anthropic API-nøkkel og koster under 1 kr per gang.
- **«Kopier til Claude-appen»**: kopierer instruks og notater, som limes inn i Claude-appen. Ingen nøkkel trengs.
- Teksten kan rettes, og **«Kopier sammendrag»** gjør den klar til å limes inn i MM.

## Hvorfor ikke automatisk OneDrive-opplasting fra iPhone?
Automatisk opplasting krever at appen registreres i Microsoft Azure. Det krever igjen en Azure-konto med
abonnement, som en privat Microsoft-konto ikke har. Løsningen over virker uten Azure, uten innlogging
og uten kostnader. Prisen er ett trykk på «Send» på iPhone.

## Mulige neste steg
- Rydde bort bilder på iPhone som er sendt og eldre enn N dager.
- Faste valg / nedtrekk for seksjoner og dekk når listene er kjent.
- Eksempel på tidligere ukesrapport fra MM, for å finjustere stil og lengde på sammendraget.
