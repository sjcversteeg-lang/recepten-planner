// Opslag van alle gegevens.
// Versie 1 bewaart alles in de browser (localStorage). Alles wat de app leest of
// schrijft gaat via dit bestand, zodat we later een gedeelde database (bijv. Supabase)
// kunnen aansluiten zonder de rest van de app te veranderen. Zie docs/ARCHITECTUUR.md.

const SLEUTEL = 'receptenplanner.v1';
export const DATA_VERSIE = 1;

export const db = { data: null };

export function standaardInstellingen() {
  return {
    // kind: true = recept moet eenvoudig kunnen (zie 'Recept aanpassen aan de kok')
    koks: [
      { naam: 'Bas', kind: false },
      { naam: 'Inge', kind: false },
      { naam: 'Pien', kind: true },
    ],
    // Standaard per weekdag (1 = maandag … 7 = zondag). Geldt voor elke nieuwe week.
    dagen: {
      1: { kok: 'Inge', vrij: null, voetbal: false },
      2: { kok: 'Inge', vrij: null, voetbal: false },
      3: { kok: 'Bas', vrij: 'Bas', voetbal: false },
      4: { kok: 'Inge', vrij: 'Inge', voetbal: false },
      5: { kok: 'Inge', vrij: 'Inge', voetbal: false },
      6: { kok: 'Bas', vrij: null, voetbal: false },
      7: { kok: 'Bas', vrij: null, voetbal: false },
    },
    etenstijd: '18:00',
    etenstijdVoetbal: '17:30',
    aanbiedingen: '',
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
  return data;
}

// Nieuwe recepten uit data/recepten.json toevoegen; eigen wijzigingen blijven staan.
function voegBronToe(data, bron) {
  if (!bron || !Array.isArray(bron.recepten)) return;
  const bekend = new Set(data.recepten.map(r => r.id));
  const weg = new Set(data.verwijderdeRecepten);
  for (const r of bron.recepten) {
    if (!bekend.has(r.id) && !weg.has(r.id)) data.recepten.push(normaliseerRecept(r));
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
