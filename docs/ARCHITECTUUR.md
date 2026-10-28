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
| `#/week?week=JJJJ-MM-DD` | Weekmenu (maandag van de week; zonder = deze week) |
| `#/recepten` | Receptenlijst en eetgeschiedenis |
| `#/recept/<id>` | Recept bekijken (`?datum=` voor de context van die dag) |
| `#/recept-bewerk/<id>`, `#/recept-nieuw` | Recept bewerken of toevoegen |
| `#/boodschappen?week=…` | Boodschappenlijst van een week |
| `#/lijsten` | Opgeslagen boodschappenlijsten |
| `#/voorraad` | Voorraad |
| `#/instellingen` | Instellingen en back-up |

Elk scherm is een functie `schermX()` die `{ html, koppel }` teruggeeft: eerst wordt de HTML getekend, daarna koppelt `koppel()` de knoppen. Na elke wijziging: `opslaan()` en `render()`.

## Datamodel (localStorage-sleutel `receptenplanner.v1`)

```js
{
  versie: 1,
  bronBijgewerkt: "2026-10-27",          // datum van data/recepten.json
  instellingen: {
    koks: [{ naam: "Bas", kind: false }, …],
    dagen: { 1: { kok: "Inge", vrij: null, voetbal: false }, … 7: … },  // 1 = maandag
    etenstijd: "18:00", etenstijdVoetbal: "17:30",
    aanbiedingen: "prei, broccoli"
  },
  recepten: [ /* schema van recepten.json, plus: frequentie_weken, snel, kinderen_kunnen, nieuw;
                 per ingrediënt: ah: { productnummer, verpakking, verpakking_naam, prijs } */ ],
  verwijderdeRecepten: ["id", …],        // zodat ze niet terugkomen uit recepten.json
  weken: {
    "2026-10-26": {                     // maandag van de week
      dagen: { "2026-10-26": { recept: "id", kok: "Inge", voetbal: false, notitie: "" }, … },
      extra: [{ id, naam, aantal, eenheid, prijs }],           // extra boodschappen
      aanpassingen: { "<naam>|<eenheid>": { delta, weg, opVoorraad } }  // handmatig op de lijst
    }
  },
  voorraad: [{ id, naam, hoeveelheid, eenheid, plek: "vriezer|koelkast|la|kast|overig" }],
  geschiedenis: [{ datum, recept, kok }],
  lijsten: [{ id, week, datum, totaal, regels: [{ naam, aantal, eenheid, productnummer, prijs }] }]
}
```

Bij het opstarten worden recepten uit `data/recepten.json` toegevoegd die nog niet in de app staan.
Recepten die je in de app hebt aangepast worden **niet** overschreven.

## Regels

**Voorstel** (`maakVoorstel` in logic.js), per lege dag, hoogste score wint:
- + aantal dagen sinds laatst gegeten (max 60); nog nooit gegeten telt als 60
- − 100 als het recept korter geleden is gegeten dan de ingestelde frequentie
- + 25 per groente uit de aanbieding in naam of ingrediënten
- voetbal: + 30 als het recept snel is (vinkje *snel* of max. 30 min), anders − 20
- kok is een kind: + 30 als *kinderen kunnen dit*, anders − 10
- + 5 als het recept meer dan alleen een naam heeft; + een beetje toeval
- recepten met *nieuw* worden niet automatisch gekozen; die plan je zelf (max. 1 per week)

**Boodschappenlijst** (`boodschappen`): ingrediënten met dezelfde naam en eenheid worden opgeteld.
Daarvan gaat af wat in de voorraad staat (zelfde naam en eenheid). Is een verpakkingsgrootte bekend,
dan wordt afgerond naar hele verpakkingen en het restje getoond (1,5 zak nodig → 2 kopen, 0,5 over).
Ingrediënten *uit de kast* en alles wat al in voorraad is staan standaard onder *Op voorraad*.

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
