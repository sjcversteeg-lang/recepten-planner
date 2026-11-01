# Architectuur

Doel: een app die iedereen in het gezin snapt, en die we stap voor stap kunnen uitbreiden.
Daarom bewust simpel: gewone HTML, CSS en JavaScript, zonder build-stap of framework.
GitHub Pages serveert de bestanden zoals ze in de repository staan.

## Bestanden

```
index.html            Opbouw van de pagina + tabbalk onderin
css/style.css         Stijl (wit, grijze vlakken, zwart, één groen accent; zie ontwerp-mockups)
js/app.js             Alle schermen + de router (adresbalk #/week, #/recept/<id>, …)
js/logic.js           Rekenwerk zonder scherm: datums, voorstel, boodschappenlijst, voorraad
js/store.js           Opslag: laden, bewaren, back-up. Enige plek die localStorage aanraakt
data/recepten.json    De receptendatabase (schema_versie 2), bron voor nieuwe recepten
manifest.webmanifest  Zodat de app op het beginscherm van een telefoon kan
```

## Schermen (routes)

| Adres | Scherm |
|---|---|
| `#/week?week=JJJJ-MM-DD` | Weekmenu (eerste dag van de week, standaard woensdag; zonder = deze week) |
| `#/recepten` | Receptenlijst en eetgeschiedenis |
| `#/recept/<id>` | Recept bekijken (`?datum=` voor de context van die dag) |
| `#/boodschappen?week=…` | Boodschappenlijst van een week |
| `#/lijsten` | Opgeslagen boodschappenlijsten |
| `#/voorraad` | Voorraad |
| `#/instellingen` | Instellingen en back-up |

Elk scherm is een functie `schermX()` die `{ html, koppel }` teruggeeft: eerst wordt de HTML getekend, daarna koppelt `koppel()` de knoppen. Na elke wijziging: `opslaan()` en `render()`.

## Datamodel (localStorage-sleutel `receptenplanner.v1`)

```js
{
  versie: 2,
  bronBijgewerkt: "2026-10-27",          // datum van data/recepten.json
  instellingen: {
    koks: [{ naam: "Bas", kind: false }, …],
    dagen: { 1: { kok: "Bas", vrij: null, voetbal: true, voetbalTekst: "Koob 18:30" }, …
             5: { …, vastRecept: "kippenbout-met-aardappelpartjes-en-sla" }, … 7: … },  // 1 = maandag
    weekStart: 3,                        // week loopt van woensdag (bezorging) t/m dinsdag
    weekMix: { vis: 1, vlees: 3, vegetarisch: 3 },
    etenstijd: "18:00", etenstijdVoetbal: "17:30", eetDuur: 30,
    vasteBoodschappen: [{ id, naam, aantal, eenheid, elkeWeken, productnummer, prijs, laatst }],
    aanbiedingen: "prei, broccoli",
    personen: 5                          // recepten worden hierop omgerekend
  },
  recepten: [ /* schema van recepten.json, plus: frequentie_weken, snel, kinderen_kunnen, nieuw;
                 per ingrediënt: ah: { productnummer, verpakking, verpakking_naam, prijs } */ ],
  verwijderdeRecepten: ["id", …],        // zodat ze niet terugkomen uit recepten.json
  weken: {
    "2026-10-28": {                     // eerste dag van de week (weekStart)
      dagen: { "2026-10-26": { recept: "id", kok: "Inge", voetbal: false, notitie: "" }, … },
      extra: [{ id, naam, aantal, eenheid, prijs }],           // extra boodschappen
      aanpassingen: { "<naam>|<eenheid>": { delta, weg, opVoorraad } }  // handmatig op de lijst
    }
  },
  voorraad: [{ id, naam, hoeveelheid, eenheid, plek: "vriezer|koelkast|kast|garage|overig" }],
  voorraadGecontroleerd: "2026-10-30", // laatste keer *Klopt* bij Voorraad
  geschiedenis: [{ datum, recept, kok }],
  lijsten: [{ id, week, datum, totaal, regels: [{ naam, aantal, eenheid, productnummer, prijs }] }],
  waardering: { "<recept-id>": { "Pien": { lekker: true, kan: true } } }   // hartje en ster
}
```

`data/recepten.json` is de receptendatabase. Recepten worden daar aangepast (door Claude of in GitHub), niet in de
app. Bij het opstarten neemt de app de nieuwste versie over. Een nieuw recept heeft `nieuw: true`; zodra het 4
hartjes heeft (`LIKES_VOOR_VAST`) telt het als vast recept. Later zetten we dan ook `nieuw: false` in het bestand.

Vanaf versie 2 migreert `store.js` oude gegevens: week vanaf woensdag, *la* wordt *kast* (flesjes naar *garage*),
vrijdag vast kippenbout. Oude weken (vanaf maandag) blijven bewaard.

**Omrekenen:** hoeveelheden staan in `recepten.json` zoals in het originele recept, voor `porties` personen.
De app vermenigvuldigt met `instellingen.personen / porties` (`factor` en `geschaald` in logic.js) en rondt af:
stuks, tenen, blikken op halven naar boven, grammen en milliliters op 5, lepels op halven.

## Regels

**Voorstel** (`maakVoorstel` in logic.js), per lege dag, hoogste score wint:
- dagen met een vast recept (vrijdag kippenbout) worden bij een nieuwe week al ingevuld
- weekmix: + 40 als er van die soort (vis, vlees, vega) nog avonden over zijn, − 60 als de soort al vol is;
  een recept met meer soorten (stamppot met kaas of spek) telt als de soort met de meeste ruimte
- − 200 als het recept vorige week op het menu stond of gegeten is (niet twee weken achter elkaar)
- + aantal dagen sinds laatst gegeten (max 60); nog nooit gegeten telt als 60
- − 100 als het recept korter geleden is gegeten dan de ingestelde frequentie
- + 25 per product uit de aanbieding in naam of ingrediënten; + 10 per seizoensgroente van die maand
- voetbal: + 30 als het recept snel is (vinkje *snel* of max. 30 min), anders − 20
- kok is een kind: + 40 als dat kind een ster gaf (kan ik maken), + 15 als een ander kind een ster gaf, anders − 10
- + 5 per hartje (vind ik lekker)
- + 5 als het recept meer dan alleen een naam heeft; + een beetje toeval
- hoogstens één nieuw recept per week, met − 20 zodat bekende recepten voorgaan

**Boodschappenlijst** (`boodschappen`): ingrediënten met dezelfde naam en eenheid worden opgeteld.
Daarvan gaat af wat in de voorraad staat (zelfde naam en eenheid). Is een verpakkingsgrootte bekend,
dan wordt afgerond naar hele verpakkingen en het restje getoond (1,5 zak nodig → 2 kopen, 0,5 over).
Ingrediënten *uit de kast* en alles wat al in voorraad is staan standaard onder *Op voorraad*.

**Tijden**: bij voetbal is de etenstijd de tijd uit de voetbaltekst min `eetDuur` ("Maup 17:30" → 17:00).
*Begin met koken om* = etenstijd min de bereidingstijd (zonder tijd 45 minuten).

**Vaste boodschappen** komen op de lijst als ze `elkeWeken` weken niet gekocht zijn; *Boodschappen zijn binnen*
zet `laatst` op de week.

**Voorraad**: *Boodschappen zijn binnen* telt het gekochte op bij de voorraad; *Gekookt* trekt de
hoeveelheden van het recept eraf. Zo blijven restjes vanzelf staan.

## Volgende stap: gedeelde gegevens

Versie 0.1 bewaart per apparaat. Voor gedeelde gegevens tussen alle telefoons en computers is het
plan **Supabase** (gratis tier, database + inloggen, werkt direct vanuit een statische site):

1. Bas maakt een gratis account op supabase.com en een project "recepten-planner".
2. Eén tabel `gezin_data` met één rij per gezin (JSON-kolom), beveiligd met inloggen via e-mail-link (Row Level Security).
3. `js/store.js` krijgt `laad()`/`bewaar()` die naar Supabase lezen en schrijven; de rest van de app blijft gelijk.
4. De Supabase "anon key" en project-URL mogen in de code (ze zijn bedoeld voor publiek gebruik); de beveiliging zit in de tabelregels.

Overige ideeën voor later: agenda "Gezin" automatisch lezen, AH-aanbiedingen ophalen,
recept aanpassen aan de kok, vragen stellen aan de app, ideeën van Maup uit de ideeënkist.
