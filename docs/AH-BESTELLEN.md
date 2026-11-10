# Boodschappen in het AH-mandje

## Zo werkt het (v0.5)
1. In de app: *Boodschappen* → vink aan wat je al hebt → *Kopieer weeklijst*.
2. Op de computer: **Claude Desktop** → nieuwe chat → onder het tekstvak alleen de koppeling **ah** aan.
3. Plakken en versturen. De eerste regel van de lijst is de opdracht voor Claude, dus er is geen project of
   uitleg nodig.
4. Eerste keer (of na een tijd): Claude vraagt om in te loggen bij AH. Open de link en log in, thuis op je eigen wifi.
5. Mandje nakijken en afrekenen in de AH-app. Claude rekent nooit af.

Zuinig: licht model (Haiku of Sonnet), elke week een nieuwe chat. Hoe meer ingrediënten een AH-productnummer
hebben in `data/recepten.json`, hoe minder Claude hoeft te zoeken.

De gekopieerde tekst ziet er zo uit:

```
Zet dit in mijn AH-winkelmandje (ah_update_cart_item). Niet afrekenen, niets anders wijzigen. …
Weeklijst Week 46
wi123456 2x Prei
Zoeken:
1x Spinazie (zak 400 g)
```

## Waarom niet: Claude klikt zelf in de browser
Afgewogen op 2026-11-10, op verzoek van Bas. Idee: Bas logt in op ah.nl, Claude zoekt en klikt de producten aan
(Claude in Chrome of computergebruik).

| | ah-koppeling (nu) | Claude in de browser |
|---|---|---|
| Veiligheid | Alleen mandje-functies; nagekeken versie v1.0.12; geen afrekenen | Claude bedient een ingelogde sessie waarin ook *afrekenen*, adres en betaalgegevens zitten. Webpagina's (advertenties, recepten-teksten) kunnen instructies bevatten die Claude misleiden. |
| Kosten (tokens) | Een paar korte opdrachten per week | Per product schermafbeeldingen lezen en klikken: grofweg tien tot honderd keer zo veel |
| Betrouwbaarheid | Werkt met productnummers, precies het juiste artikel | Breekt bij elke wijziging van de site, cookiemelding of pop-up; kiest makkelijker een verkeerd product |
| Snelheid | Ongeveer een minuut | Tien tot dertig minuten voor een weeklijst |
| Voorwaarden AH | Onofficiële app-koppeling; AH kan die blokkeren | Ook geautomatiseerd gebruik van de site; AH kan dat net zo goed blokkeren |

Conclusie: niet doen zolang de ah-koppeling werkt. Hoogstens als noodoplossing voor één los product, met Bas
erbij die meekijkt, en nooit voorbij het mandje.

## Afspraken (zie ook de beveiligingsafspraken)
- Vaste versie van ah-mcp (v1.0.12), geen automatische updates.
- In de chat alleen de koppeling *ah* aan, geen Gmail/Drive/Notion.
- Claude rekent niet af, leegt het mandje niet en wijzigt geen bestellingen.
