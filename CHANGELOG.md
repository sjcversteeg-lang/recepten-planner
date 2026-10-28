# Changelog

Alle wijzigingen per versie. Nieuwste bovenaan.

## [0.1.0] – 2026-10-28

Eerste versie (MVP) voor de testweek met het gezin.

### Toegevoegd
- Weekmenu met recept van vandaag, kok per dag, voetbal en vrije dagen; bladeren door weken.
- *Voorstel*: vult lege dagen met recepten die lang niet gegeten zijn, met groente in de aanbieding, snel bij voetbal en eenvoudig als een kind kookt.
- Receptenlijst (56 recepten uit `data/recepten.json`) met zoeken en filters; recept bekijken, bewerken, nieuw maken, verwijderen.
- Per recept: frequentie ("niet vaker dan eens per … weken"), snel, kinderen kunnen het, nieuw; per ingrediënt AH-productnummer, verpakkingsgrootte en prijs.
- Boodschappenlijst uit het weekmenu: optellen over recepten, aftrekken van voorraad, afronden op verpakkingen, restje tonen, op voorraad aanvinken, − / + / weg per artikel, extra artikelen, totale kosten (idee van Maup).
- *Kopieer voor Albert Heijn*: tekst om in Claude Desktop (project "Boodschappen AH") te plakken.
- *Boodschappen zijn binnen*: zet gekochte artikelen in de voorraad en bewaart de lijst (*Opgeslagen lijsten*).
- Voorraad per plek (vriezer, koelkast, la, kast) met − / +; *Gekookt* boekt gebruikte ingrediënten af en zet het recept in de eetgeschiedenis.
- Instellingen: koks, vaste week, etenstijden, back-up maken/terugzetten, alles wissen.
- Documentatie: README, architectuur, GitHub Pages-stappenplan, testronde.
- Recepten uit Notion: 8 recepten aangevuld en 10 toegevoegd (66 in totaal), met ingrediënten, hoeveelheden en stappen.
- Omrekenen naar het aantal personen (Instellingen, standaard 5) in recept, boodschappenlijst en voorraad.
- Hartje (vind ik lekker) en ster (kan ik zelf maken) per persoon bij elk recept. Het voorstel kiest voor een kokend kind liefst een recept met zijn of haar ster; filter *Kinderen kunnen het*.
- Aangevulde recepten in `data/recepten.json` komen ook binnen op apparaten die de app al gebruiken, behalve recepten die in de app zijn bewerkt.
- Vaste week uit de agenda Gezin: ma Bas, di Pien, wo Maup, do Inge koken; voetbal ma t/m do (Koob ma/wo 18:30, Maup di 17:30 en do 18:30).
- Gezin van vijf in de standaardinstellingen: Bas, Inge, Pien en Maup koken; Koob kookt niet, maar geeft wel hartjes en sterren (instelling *kookt* per persoon).

### Bekende beperkingen
- Gegevens staan per apparaat (nog geen gedeelde database).
- Agenda "Gezin" en AH-aanbiedingen worden nog niet automatisch gelezen; vul ze met de hand in.
- 18 van de 66 recepten hebben ingrediënten; de andere moeten nog worden aangevuld.
