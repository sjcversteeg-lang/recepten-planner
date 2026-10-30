// Opslag van alle gegevens.
// Versie 1 bewaart alles in de browser (localStorage). Alles wat de app leest of
// schrijft gaat via dit bestand, zodat we later een gedeelde database (bijv. Supabase)
// kunnen aansluiten zonder de rest van de app te veranderen. Zie docs/ARCHITECTUUR.md.

const SLEUTEL = 'receptenplanner.v1';
export const DATA_VERSIE = 2;

export const db = { data: null };

export function standaardInstellingen() {
  return {
    // Het hele gezin. kind: true = recept moet eenvoudig kunnen; kookt: false = kookt (nog) niet,
    // maar geeft wel hartjes en sterren.
    koks: [
      { naam: 'Bas', kind: false },
      { naam: 'Inge', kind: false },
      { naam: 'Pien', kind: true },
      { naam: 'Maup', kind: true },
      { naam: 'Koob', kind: true, kookt: false },
    ],
    // Standaard per weekdag (1 = maandag … 7 = zondag). Geldt voor elke nieuwe week.
    dagen: {
    // Kok en voetbal ma-do komen uit de agenda Gezin (vaste afspraken, okt 2026).
      1: { kok: 'Bas', vrij: null, voetbal: true, voetbalTekst: 'Koob 18:30' },
      2: { kok: 'Pien', vrij: null, voetbal: true, voetbalTekst: 'Maup 17:30' },
      3: { kok: 'Maup', vrij: 'Bas', voetbal: true, voetbalTekst: 'Koob 18:30' },
      4: { kok: 'Inge', vrij: 'Inge', voetbal: true, voetbalTekst: 'Maup 18:30' },
      // vastRecept: dit gerecht staat elke week op deze dag (wens van Inge: vrijdag kippenbout).
      5: { kok: 'Inge', vrij: 'Inge', voetbal: false, voetbalTekst: '', vastRecept: 'kippenbout-met-aardappelpartjes-en-sla' },
      6: { kok: 'Bas', vrij: null, voetbal: false, voetbalTekst: '' },
      7: { kok: 'Bas', vrij: null, voetbal: false, voetbalTekst: '' },
    },
    // De week loopt van de bezorgdag tot en met de dag ervoor. Plannen op dinsdag, bezorgen op woensdag.
    weekStart: 3,
    // Weekmix: zoveel avonden per soort gerecht.
    weekMix: { vis: 1, vlees: 3, vegetarisch: 3 },
    etenstijd: '18:00',
    etenstijdVoetbal: '17:30', // alleen als er geen tijd bij het voetbal staat
    eetDuur: 30, // minuten om te eten voor het voetbal
    // Vaste boodschappen: { id, naam, aantal, eenheid, elkeWeken, productnummer, prijs, laatst }
    vasteBoodschappen: [],
    aanbiedingen: '',
    personen: 5, // recepten worden hierop omgerekend
  };
}

function nieuweData() {
  return {
    versie: DATA_VERSIE,
    bronBijgewerkt: null,
    instellingen: standaardInstellingen(),
    recepten: [],
    verwijderdeRecepten: [],
    weken: {},
    voorraad: [],
    geschiedenis: [],
    lijsten: [],
    // per recept per persoon: { lekker: true, kan: true } (hartje en ster)
    waardering: {},
    voorraadGecontroleerd: null, // datum waarop de voorraad voor het laatst is nagekeken
  };
}

// Zorgt dat elk recept alle velden heeft (ook de velden die de app toevoegt).
export function normaliseerRecept(r) {
  const leeg = {
    id: null, naam: '', dieet: [], basis: null, bron: null, porties: null,
    bereidingstijd_min: null, bereidingstijd_max: null, ingredienten: [], stappen: [],
    varianten: [], status: 'alleen_naam', afgeleid: [], open_vragen: [], te_controleren: false,
    // velden van de app
    frequentie_weken: null, snel: false, kinderen_kunnen: false, nieuw: false,
    bewerkt_in_app: false, // true = in de app aangepast; dan niet meer overschrijven vanuit recepten.json
  };
  const uit = { ...leeg, ...r };
  uit.ingredienten = (uit.ingredienten || []).map(normaliseerIngredient);
  return uit;
}

export function normaliseerIngredient(i) {
  const uit = {
    naam: '', hoeveelheid: null, hoeveelheid_max: null, eenheid: null, toelichting: null,
    groep: 'hoofd', voorraadkast: false, ...i,
  };
  uit.ah = { productnummer: null, verpakking: null, verpakking_naam: null, prijs: null, ...(i.ah || {}) };
  return uit;
}

function vulAan(data) {
  const basis = nieuweData();
  for (const k of Object.keys(basis)) if (data[k] === undefined) data[k] = basis[k];
  data.instellingen = { ...standaardInstellingen(), ...data.instellingen };
  data.recepten = data.recepten.map(normaliseerRecept);
  if ((data.versie || 1) < 2) {
    // Versie 2 (feedback Inge): week vanaf woensdag, kasten en garage in plaats van de la,
    // vrijdag vast kippenbout. Oude weken (vanaf maandag) blijven bewaard als geschiedenis.
    const st = standaardInstellingen();
    data.instellingen.weekStart = st.weekStart;
    if (data.instellingen.dagen[5] && !data.instellingen.dagen[5].vastRecept) data.instellingen.dagen[5].vastRecept = st.dagen[5].vastRecept;
    for (const v of data.voorraad) if (v.plek === 'la') v.plek = v.eenheid === 'flesje' ? 'garage' : 'kast';
    data.versie = 2;
  }
  return data;
}

// Recepten uit data/recepten.json overnemen. Dat bestand is de receptendatabase: recepten worden
// daar aangepast, niet in de app (wens van Inge). Elke keer laden neemt de nieuwste versie over.
function voegBronToe(data, bron) {
  if (!bron || !Array.isArray(bron.recepten)) return;
  const weg = new Set(data.verwijderdeRecepten);
  for (const r of bron.recepten) {
    if (weg.has(r.id)) continue;
    const n = data.recepten.findIndex(x => x.id === r.id);
    if (n === -1) data.recepten.push(normaliseerRecept(r));
    else data.recepten[n] = normaliseerRecept(r);
  }
  data.bronBijgewerkt = bron.bijgewerkt || null;
}

export async function laad() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SLEUTEL)); } catch { data = null; }
  if (!data || typeof data !== 'object') data = nieuweData();
  vulAan(data);
  try {
    const res = await fetch('data/recepten.json', { cache: 'no-cache' });
    if (res.ok) voegBronToe(data, await res.json());
  } catch { /* offline: we werken met wat er al is */ }
  db.data = data;
  bewaar();
  return data;
}

export function bewaar() {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(db.data)); } catch (e) { console.error('Opslaan mislukt', e); }
}

export function exporteer() {
  return JSON.stringify({ ...db.data, geexporteerd: new Date().toISOString() }, null, 2);
}

export function importeer(tekst) {
  const data = JSON.parse(tekst);
  if (!data || !Array.isArray(data.recepten)) throw new Error('Dit is geen back-up van de recepten planner.');
  delete data.geexporteerd;
  db.data = vulAan(data);
  bewaar();
}

export async function wisAlles() {
  localStorage.removeItem(SLEUTEL);
  await laad();
}
