# De app online zetten met GitHub Pages

GitHub Pages maakt van deze repository een gratis website. Je doet dit één keer.
Daarna komt elke wijziging die in de `main`-branch belandt vanzelf online (na 1 à 2 minuten).

## Stap 1 – De pull request samenvoegen (mergen)

Claude bouwt op een eigen branch en vraagt via een *pull request* (PR) om die wijzigingen in `main` te zetten.

1. Ga naar https://github.com/sjcversteeg-lang/recepten-planner/pulls
2. Klik op de pull request **"Eerste versie van de recepten planner (v0.1)"**.
3. Kijk eventueel onder het tabblad **Files changed** wat er verandert.
4. Klik onderaan op de groene knop **Merge pull request** en daarna op **Confirm merge**.

## Stap 2 – GitHub Pages aanzetten

1. Ga naar https://github.com/sjcversteeg-lang/recepten-planner/settings/pages
   (of: in de repository bovenaan **Settings**, dan links in het menu **Pages**).
2. Bij **Build and deployment** → **Source**: kies **Deploy from a branch**.
3. Bij **Branch**: kies **main** en daarnaast **/ (root)**. Klik **Save**.
4. Wacht 1 à 2 minuten en ververs de pagina. Bovenaan verschijnt:
   *Your site is live at https://sjcversteeg-lang.github.io/recepten-planner/*

## Stap 3 – Op je telefoon zetten

- **iPhone (Safari):** open de link → deelknop (vierkantje met pijl) → **Zet op beginscherm**.
- **Android (Chrome):** open de link → menu (drie puntjes) → **Toevoegen aan startscherm**.

## Later: een nieuwe versie

Claude maakt voor elke verbetering weer een pull request. Jij doet alleen stap 1 (mergen).
Na een paar minuten staat de nieuwe versie online; ververs de app als je hem al open had.

Let op: de repository is **openbaar**. Iedereen met de link kan de app en de recepten zien.
Wat je in de app invult (weekmenu, voorraad) staat alleen op je eigen apparaat en niet op GitHub.
