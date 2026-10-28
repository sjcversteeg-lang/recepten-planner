# Recepten planner

Een eenvoudige web-app voor ons gezin: per week de recepten plannen, zien wie er kookt,
het recept van vandaag openen, een boodschappenlijst maken die rekening houdt met de voorraad,
en die lijst doorzetten naar Albert Heijn.

**Openen:** https://sjcversteeg-lang.github.io/recepten-planner/ (werkt zodra GitHub Pages aan staat, zie [docs/GITHUB-PAGES.md](docs/GITHUB-PAGES.md)).

Op je telefoon: open de link in Safari of Chrome en kies *Zet op beginscherm*. Dan staat de app tussen je andere apps.

## Wat kan versie 0.1

| Scherm | Wat je er doet |
|---|---|
| **Week** | Recept van vandaag bovenaan. Per dag: recept, wie kookt, voetbal, wie vrij is. Knop *Voorstel* vult lege dagen. Vul in welke groente in de aanbieding is. Bladeren naar vorige/volgende week. |
| **Recepten** | Alle 66 recepten, zoeken en filteren (vega, vlees, vis, snel, kinderen kunnen het, aan te vullen). Recept bekijken (ingrediënten / bereiding, omgerekend naar jullie aantal personen), *Gekookt* aantikken, *Inplannen*, *Bewerken* of een nieuw recept maken. Per persoon een hartje (lekker) en een ster (kan ik maken). Tabblad *Gegeten* = eetgeschiedenis. |
| **Boodschappen** | Lijst uit het weekmenu, afgerond op hele verpakkingen. Vink aan wat je al hebt (*Op voorraad*). Per artikel − / + / weg, iets extra toevoegen, totale kosten. *Kopieer weeklijst* zet de lijst klaar om in Claude Desktop te plakken. *Boodschappen zijn binnen* zet alles in de voorraad en bewaart de lijst. |
| **Voorraad** | Wat er in de vriezer, koelkast, la en kast ligt. Wordt bijgewerkt na boodschappen en na *Gekookt*. Restjes (een halve zak spinazie) blijven staan, zodat je de volgende keer minder koopt. |
| **Instellingen** (knop rechtsboven op Week) | Wie koken er (en wie is een kind), aantal personen, vaste kok/vrije dag/voetbal per weekdag, etenstijden, back-up maken en terugzetten. |

## Belangrijk: waar staan de gegevens?

Versie 0.1 bewaart alles **in de browser van het apparaat** (localStorage). Dat betekent:

- Wat je op je telefoon invult, zie je nog niet op de telefoon van Inge.
- Met *Instellingen → Back-up maken* krijg je een bestand dat je op een ander apparaat kunt terugzetten.
- De recepten zelf komen uit [`data/recepten.json`](data/recepten.json) in deze repository.

Een gedeelde database voor alle apparaten is de volgende stap; zie [docs/ARCHITECTUUR.md](docs/ARCHITECTUUR.md#volgende-stap-gedeelde-gegevens).

## Documentatie

- [docs/GITHUB-PAGES.md](docs/GITHUB-PAGES.md) – stap voor stap: de app online zetten en een nieuwe versie uitrollen
- [docs/TESTRONDE.md](docs/TESTRONDE.md) – wat we in de eerste testweek uitproberen
- [docs/ARCHITECTUUR.md](docs/ARCHITECTUUR.md) – hoe de app in elkaar zit, datamodel, regels van het voorstel
- [CHANGELOG.md](CHANGELOG.md) – wat er per versie veranderd is

## Lokaal draaien (voor ontwikkelaars)

Geen installatie of build nodig, alleen een simpele webserver:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
