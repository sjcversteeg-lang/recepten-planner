// Rekenwerk zonder scherm: datums, weekmenu, voorstel, boodschappenlijst en voorraad.

export const DAGNAMEN = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
export const DAGCODES = ['', 'MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

// ---------- Datums ----------
export function dagKey(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function vanKey(key) {
  const [j, m, d] = key.split('-').map(Number);
  return new Date(j, m - 1, d);
}
export function plusDagen(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function weekdag(d) { return ((d.getDay() + 6) % 7) + 1; } // 1 = maandag
export function maandagVan(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return plusDagen(x, 1 - weekdag(x)); }
// Een week loopt van de bezorgdag (standaard woensdag) tot en met de dag ervoor.
export function weekStartVan(data, d) {
  const start = Number(data.instellingen.weekStart) || 1;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return plusDagen(x, -((weekdag(x) - start + 7) % 7));
}
export function weekStartKey(data, d = new Date()) { return dagKey(weekStartVan(data, d)); }
export function vandaagKey() { return dagKey(new Date()); }
export function weeknummer(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
  const jan1 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x - jan1) / 86400000 + 1) / 7);
}
export function kortDatum(d) { return `${d.getDate()} ${MAANDEN[d.getMonth()]}`; }
export function weekLabel(startKey) {
  const start = vanKey(startKey);
  return `Week ${weeknummer(start)} · ${kortDatum(start)} – ${kortDatum(plusDagen(start, 6))}`;
}
export function dagenTussen(vanK, totK) { return Math.round((vanKey(totK) - vanKey(vanK)) / 86400000); }
export function dagenGeleden(key) {
  return Math.round((vanKey(vandaagKey()) - vanKey(key)) / 86400000);
}
export function geledenTekst(key) {
  if (!key) return 'nog nooit';
  const n = dagenGeleden(key);
  if (n <= 0) return 'vandaag';
  if (n === 1) return 'gisteren';
  if (n < 14) return `${n} dagen geleden`;
  if (n < 60) return `${Math.round(n / 7)} weken geleden`;
  return `${Math.round(n / 30)} maanden geleden`;
}

// ---------- Getallen en eenheden ----------
export function getal(n) {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
}
export function euro(n) { return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }); }
const MEERVOUD = { blik: 'blikken', teen: 'tenen', pot: 'potten', pak: 'pakken', flesje: 'flesjes', zak: 'zakken', bol: 'bollen', bos: 'bossen', stuk: 'stuks' };
export function eenheidTekst(eenheid, n) {
  if (!eenheid || eenheid === 'stuk') return '';
  return n > 1 && MEERVOUD[eenheid] ? MEERVOUD[eenheid] : eenheid;
}
export function hoeveelheidTekst(i) {
  if (i.hoeveelheid === null || i.hoeveelheid === undefined) return '';
  const max = i.hoeveelheid_max ? `–${getal(i.hoeveelheid_max)}` : '';
  const n = i.hoeveelheid_max || i.hoeveelheid;
  return `${getal(i.hoeveelheid)}${max} ${eenheidTekst(i.eenheid, n)}`.trim();
}
const norm = s => (s || '').trim().toLowerCase();

// ---------- Recepten en geschiedenis ----------
export function recept(data, id) { return data.recepten.find(r => r.id === id) || null; }
export function laatstGegeten(data, id) {
  let laatst = null;
  for (const g of data.geschiedenis) if (g.recept === id && (!laatst || g.datum > laatst)) laatst = g.datum;
  return laatst;
}
export function maakId(data, naam) {
  const basis = norm(naam).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recept';
  let id = basis, n = 2;
  while (data.recepten.some(r => r.id === id) || data.verwijderdeRecepten.includes(id)) id = `${basis}-${n++}`;
  return id;
}
export function tijdTekst(r) {
  if (!r.bereidingstijd_min && !r.bereidingstijd_max) return '';
  if (r.bereidingstijd_min && r.bereidingstijd_max && r.bereidingstijd_min !== r.bereidingstijd_max) return `${r.bereidingstijd_min}–${r.bereidingstijd_max} min`;
  return `±${r.bereidingstijd_max || r.bereidingstijd_min} min`;
}
export function isSnel(r) { return r.snel || (r.bereidingstijd_max && r.bereidingstijd_max <= 30); }
export function isKind(data, naam) { return !!data.instellingen.koks.find(k => k.naam === naam && k.kind); }

// ---------- Omrekenen naar het aantal personen ----------
export function factor(data, r) {
  const p = Number(data.instellingen.personen) || 0;
  return r.porties && p ? p / r.porties : 1;
}
const HELE = ['stuk', 'teen', 'blik', 'pot', 'pak', 'zak', 'flesje', 'bos'];
function rondAf(n, eenheid) {
  if (HELE.includes(eenheid) || !eenheid) return Math.ceil(n * 2 - 1e-9) / 2;   // op halven naar boven
  if (['g', 'ml'].includes(eenheid)) return n >= 50 ? Math.round(n / 5) * 5 : Math.round(n);
  if (['tl', 'el'].includes(eenheid)) return Math.round(n * 2) / 2 || 0.5;
  return Math.round(n * 100) / 100;
}
// Ingrediënt met hoeveelheden voor ons gezin (het origineel blijft ongewijzigd).
export function geschaald(i, f) {
  if (f === 1 || i.hoeveelheid === null) return i;
  return { ...i, hoeveelheid: rondAf(i.hoeveelheid * f, i.eenheid), hoeveelheid_max: i.hoeveelheid_max ? rondAf(i.hoeveelheid_max * f, i.eenheid) : null };
}

// ---------- Hartjes en sterren ----------
export function waardering(data, id, naam) { return data.waardering[id]?.[naam] || {}; }
export function zetWaardering(data, id, naam, veld) {
  const w = ((data.waardering[id] ||= {})[naam] ||= {});
  w[veld] = !w[veld];
}
export function wieKan(data, id) { return Object.entries(data.waardering[id] || {}).filter(([, w]) => w.kan).map(([n]) => n); }
export function wieLekker(data, id) { return Object.entries(data.waardering[id] || {}).filter(([, w]) => w.lekker).map(([n]) => n); }
export function kinderenKunnen(data, r) { return r.kinderen_kunnen || wieKan(data, r.id).some(n => isKind(data, n)); }
// Nieuw recept: komt op de vaste lijst zodra genoeg gezinsleden het een hartje geven.
export const LIKES_VOOR_VAST = 4;
export function isNieuw(data, r) { return !!r.nieuw && wieLekker(data, r.id).length < LIKES_VOOR_VAST; }

// ---------- Weken ----------
export function week(data, startKey) {
  if (!data.weken[startKey]) {
    const start = vanKey(startKey);
    const dagen = {};
    for (let i = 0; i < 7; i++) {
      const d = plusDagen(start, i);
      const s = data.instellingen.dagen[weekdag(d)] || {};
      const vast = s.vastRecept && recept(data, s.vastRecept) ? s.vastRecept : null;
      dagen[dagKey(d)] = { recept: vast, kok: s.kok || null, voetbal: !!s.voetbal, voetbalTekst: s.voetbal ? s.voetbalTekst || '' : '', notitie: '' };
    }
    data.weken[startKey] = { dagen, extra: [], aanpassingen: {} };
  }
  return data.weken[startKey];
}
export function vrijOp(data, datumKey) {
  return data.instellingen.dagen[weekdag(vanKey(datumKey))]?.vrij || null;
}
const minuten = t => { const m = /(\d{1,2})[:.](\d{2})/.exec(t || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const klok = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
// Bij voetbal: eten een half uur (instelbaar) voor de tijd uit de agenda, bijv. 'Maup 17:30' -> 17:00.
export function etenstijd(data, dag) {
  const i = data.instellingen;
  if (!dag.voetbal) return i.etenstijd;
  const v = minuten(dag.voetbalTekst);
  return v === null ? i.etenstijdVoetbal : klok(v - (Number(i.eetDuur) || 30));
}
// Wanneer de kok moet beginnen: etenstijd min de bereidingstijd (zonder tijd rekenen we 45 minuten).
export function kookStart(data, dag, r) {
  const eten = minuten(etenstijd(data, dag));
  if (eten === null) return null;
  return klok(eten - ((r && (r.bereidingstijd_max || r.bereidingstijd_min)) || 45));
}

export function aanbiedingWoorden(data) {
  return data.instellingen.aanbiedingen.split(/[,;\n]/).map(norm).filter(Boolean);
}
// Seizoensgroente per maand (Nederland, globaal). Goedkoop en lekker, dus een klein pluspunt.
const SEIZOEN = [
  ['boerenkool', 'spruitjes', 'prei', 'knolselderij', 'rode kool', 'witlof', 'pastinaak', 'pompoen'],
  ['boerenkool', 'spruitjes', 'prei', 'knolselderij', 'rode kool', 'witlof', 'pastinaak'],
  ['prei', 'witlof', 'spinazie', 'rode kool', 'knolselderij'],
  ['spinazie', 'asperge', 'radijs', 'prei', 'andijvie'],
  ['asperge', 'spinazie', 'radijs', 'sla', 'andijvie', 'rabarber'],
  ['asperge', 'doperwten', 'courgette', 'bloemkool', 'broccoli', 'sla', 'tuinbonen'],
  ['courgette', 'tomaat', 'paprika', 'sperziebonen', 'bloemkool', 'broccoli', 'komkommer', 'sla'],
  ['courgette', 'tomaat', 'paprika', 'aubergine', 'sperziebonen', 'snijbonen', 'mais', 'komkommer'],
  ['pompoen', 'tomaat', 'paprika', 'aubergine', 'broccoli', 'bloemkool', 'courgette', 'prei'],
  ['pompoen', 'prei', 'bloemkool', 'broccoli', 'spruitjes', 'knolselderij', 'champignon', 'andijvie'],
  ['pompoen', 'boerenkool', 'spruitjes', 'prei', 'knolselderij', 'rode kool', 'witlof', 'champignon'],
  ['boerenkool', 'spruitjes', 'prei', 'knolselderij', 'rode kool', 'witlof', 'pastinaak', 'pompoen'],
];
export function seizoen(d = new Date()) { return SEIZOEN[d.getMonth()]; }

function bevatAanbieding(r, woorden) {
  const tekst = norm(r.naam + ' ' + r.ingredienten.map(i => i.naam).join(' '));
  return woorden.filter(w => tekst.includes(w)).length;
}

// Soort gerecht voor de weekmix. Een recept met meer soorten (bijv. stamppot met kaas of spek)
// telt als de soort waar nog het meest ruimte voor is.
function soort(r, over) {
  const d = r.dieet.length ? r.dieet : ['vegetarisch'];
  return d.reduce((a, b) => ((over[b] ?? 0) > (over[a] ?? 0) ? b : a));
}

// Hoeveel avonden van elke soort er in de week staan (voor de weekmix op het weekscherm).
export function weekMixTelling(data, startKey) {
  const over = { ...(data.instellingen.weekMix || {}) };
  const telling = { vis: 0, vlees: 0, vegetarisch: 0 };
  for (const d of Object.values(week(data, startKey).dagen)) {
    const r = d.recept && recept(data, d.recept);
    if (!r) continue;
    const s = soort(r, over);
    telling[s] = (telling[s] || 0) + 1;
    if (s in over) over[s]--;
  }
  return telling;
}

// Groente mag maar één keer per week voorkomen. Uitgezonderd (zitten vaak als mix ergens doorheen):
// paprika, champignon, ui, knoflook, tomaat, courgette en wortel; die staan daarom niet in deze lijst.
// We zoeken in de naam van het recept en de hoofdingrediënten. Per groente: [naam, zoekwoorden].
export const GROENTE_UITZONDERINGEN = ['paprika', 'champignon', 'ui', 'knoflook', 'tomaat', 'courgette', 'wortel'];
const GROENTEN = [
  ['andijvie', ['andijvie']], ['spinazie', ['spinazie']], ['bloemkool', ['bloemkool']], ['broccoli', ['broccoli']],
  ['prei', ['prei']], ['witlof', ['witlof']], ['sperziebonen', ['sperziebon', 'boontjes']], ['snijbonen', ['snijbon']],
  ['snijbiet', ['snijbiet']], ['paksoi', ['paksoi']], ['chinese kool', ['chinese kool']], ['spitskool', ['spitskool']],
  ['zuurkool', ['zuurkool']], ['rode kool', ['rode kool', 'rodekool']], ['boerenkool', ['boerenkool']],
  ['spruitjes', ['spruit']], ['aubergine', ['aubergine']], ['pompoen', ['pompoen']], ['venkel', ['venkel']],
  ['biet', [/\bbiet/]], ['doperwten', ['doperwt']], ['mais', ['mais']], ['komkommer', ['komkommer']],
  ['sla', [/\bsla\b/, 'ijsbergsla', 'veldsla', 'rucola']], ['asperge', ['asperge']], ['knolselderij', ['knolselderij']],
  ['pastinaak', ['pastinaak']],
];
const zonderAccent = t => norm(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export function groentenVan(r) {
  const tekst = zonderAccent([r.naam, ...r.ingredienten.filter(i => i.groep !== 'kruiden').map(i => i.naam)].join(' | '));
  return GROENTEN.filter(([, woorden]) => woorden.some(w => (typeof w === 'string' ? tekst.includes(w) : w.test(tekst)))).map(([g]) => g);
}

// Hoeveel verschillende voorstellen een dag hoogstens krijgt. Daarna zoekt de kok zelf een recept.
export const MAX_VOORSTELLEN = 5;
// Niets voorstellen wat in de afgelopen twee weken gegeten (of gepland) is.
export const NIET_HERHALEN_DAGEN = 14;

// Recepten die in de NIET_HERHALEN_DAGEN dagen voor de week gegeten of gepland zijn.
export function recentGegeten(data, startKey) {
  const recent = new Set();
  for (const g of data.geschiedenis) {
    const n = dagenTussen(g.datum, startKey);
    if (n > 0 && n <= NIET_HERHALEN_DAGEN) recent.add(g.recept);
  }
  for (const w of Object.values(data.weken)) {
    for (const [datum, d] of Object.entries(w.dagen || {})) {
      const n = dagenTussen(datum, startKey);
      if (d.recept && n > 0 && n <= NIET_HERHALEN_DAGEN) recent.add(d.recept);
    }
  }
  return recent;
}
export function voorstellenOver(dag) { return Math.max(0, MAX_VOORSTELLEN - (dag.voorgesteld || []).length); }

// Vult de lege dagen van een week met een voorstel (of alleen de dag `alleenDatum`).
// Regels (zie docs/ARCHITECTUUR.md):
// - nooit iets wat in de afgelopen twee weken gegeten of gepland is (vaste dagen zoals vrijdag kippenbout uitgezonderd);
// - per dag nooit twee keer hetzelfde voorstel, en hoogstens MAX_VOORSTELLEN voorstellen;
// - elke groente hoogstens één keer per week (behalve GROENTE_UITZONDERINGEN);
// - weekmix (1 vis, 3 vlees, 3 vega), liefst iets wat lang niet gegeten is, aanbiedingen en
//   seizoensgroente, snel bij voetbal, een ster van de kok als een kind kookt, hoogstens één nieuw recept per week.
// Geeft { gevuld, op } terug: op = datums waarvoor de voorstellen op zijn.
export function maakVoorstel(data, startKey, alleenDatum = null) {
  const w = week(data, startKey);
  const woorden = aanbiedingWoorden(data);
  const groente = seizoen(vanKey(startKey));
  const recent = recentGegeten(data, startKey);
  const gebruikt = new Set(Object.values(w.dagen).map(d => d.recept).filter(Boolean));
  const over = { ...(data.instellingen.weekMix || {}) };
  const weekGroenten = new Set();
  let nieuwe = 0;
  for (const [datum, d] of Object.entries(w.dagen)) {
    if (!d.recept || datum === alleenDatum) continue;
    const r = recept(data, d.recept);
    if (!r) continue;
    groentenVan(r).forEach(g => weekGroenten.add(g));
    const s = soort(r, over);
    if (s in over) over[s]--;
    if (isNieuw(data, r)) nieuwe++;
  }
  let gevuld = 0;
  const op = [];
  for (const [datum, dag] of Object.entries(w.dagen)) {
    if (alleenDatum ? datum !== alleenDatum : dag.recept) continue;
    const getoond = (dag.voorgesteld ||= []);
    if (getoond.length >= MAX_VOORSTELLEN) { op.push(datum); continue; }
    let beste = null, besteScore = -Infinity;
    for (const r of data.recepten) {
      if (gebruikt.has(r.id) || recent.has(r.id) || getoond.includes(r.id)) continue;
      if (groentenVan(r).some(g => weekGroenten.has(g))) continue;
      const nieuw = isNieuw(data, r);
      if (nieuw && nieuwe >= 1) continue;
      const laatst = laatstGegeten(data, r.id);
      const dagenTerug = laatst ? Math.round((vanKey(datum) - vanKey(laatst)) / 86400000) : 60;
      let score = Math.min(dagenTerug, 60);
      if (r.frequentie_weken && laatst && dagenTerug < r.frequentie_weken * 7) score -= 100;
      const s = soort(r, over);
      if (s in over) score += over[s] > 0 ? 40 : -60;
      if (nieuw) score -= 20; // liever bekende recepten; een nieuw recept alleen als het goed past
      score += 25 * bevatAanbieding(r, woorden);
      score += 10 * bevatAanbieding(r, groente);
      if (dag.voetbal) score += isSnel(r) ? 30 : -20;
      if (isKind(data, dag.kok)) score += waardering(data, r.id, dag.kok).kan ? 40 : kinderenKunnen(data, r) ? 15 : -10;
      score += 5 * wieLekker(data, r.id).length;
      if (r.status !== 'alleen_naam') score += 5;
      score += Math.random() * 15;
      if (score > besteScore) { besteScore = score; beste = r; }
    }
    if (beste) {
      if (dag.recept) gebruikt.delete(dag.recept);
      dag.recept = beste.id; gebruikt.add(beste.id); getoond.push(beste.id); gevuld++;
      groentenVan(beste).forEach(g => weekGroenten.add(g));
      const s = soort(beste, over);
      if (s in over) over[s]--;
      if (isNieuw(data, beste)) nieuwe++;
    }
  }
  return { gevuld, op };
}

// ---------- Voorraad ----------
export function voorraadItem(data, naam, eenheid) {
  return data.voorraad.find(v => norm(v.naam) === norm(naam) && (v.eenheid || null) === (eenheid || null)) || null;
}
export function voegVoorraadToe(data, naam, eenheid, hoeveelheid, plek) {
  const v = voorraadItem(data, naam, eenheid);
  if (v) v.hoeveelheid = rond(v.hoeveelheid + hoeveelheid);
  else data.voorraad.push({ id: crypto.randomUUID(), naam, eenheid: eenheid || null, hoeveelheid: rond(hoeveelheid), plek: plek || 'kast' });
}
const rond = n => Math.round(n * 100) / 100;

export function plekVoor(ingr) {
  if (ingr.voorraadkast || ['blik', 'pot', 'pak'].includes(ingr.eenheid)) return 'kast';
  if (ingr.eenheid === 'flesje') return 'garage';
  return 'koelkast';
}
export const PLEKKEN = { vriezer: 'Vriezer', koelkast: 'Koelkast', kast: 'Kasten', garage: 'Garage (drank)', overig: 'Overig' };

// Recept is gekookt: in de geschiedenis zetten en ingrediënten van de voorraad afhalen.
export function gekookt(data, receptId, datum, kok) {
  data.geschiedenis = data.geschiedenis.filter(g => !(g.recept === receptId && g.datum === datum));
  data.geschiedenis.push({ datum, recept: receptId, kok: kok || null });
  const r = recept(data, receptId);
  for (const i of r ? r.ingredienten.map(x => geschaald(x, factor(data, r))) : []) {
    if (i.hoeveelheid === null) continue;
    const v = voorraadItem(data, i.naam, i.eenheid);
    if (!v) continue;
    v.hoeveelheid = rond(v.hoeveelheid - i.hoeveelheid);
    if (v.hoeveelheid <= 0) data.voorraad = data.voorraad.filter(x => x !== v);
  }
}

// ---------- Boodschappenlijst ----------
function afdeling(regel) {
  if (regel.extra) return 'Extra';
  if (regel.voorraadkast) return 'Kruiden en kast';
  if (['blik', 'pot', 'pak', 'flesje'].includes(regel.eenheid)) return 'Blik en pot';
  return 'Vers';
}
export const AFDELINGEN = ['Vers', 'Blik en pot', 'Kruiden en kast', 'Vaste boodschappen', 'Extra'];

// Vaste boodschappen (melk, wc-papier …) komen op de lijst als ze weer aan de beurt zijn.
export function vasteNodig(data, startKey) {
  return (data.instellingen.vasteBoodschappen || []).filter(v => !v.laatst || v.laatst === startKey || dagenTussen(v.laatst, startKey) >= (Number(v.elkeWeken) || 1) * 7);
}

export function boodschappen(data, startKey) {
  const w = week(data, startKey);
  const regels = new Map();
  for (const dag of Object.values(w.dagen)) {
    const r = dag.recept && recept(data, dag.recept);
    if (!r) continue;
    for (const i of r.ingredienten.map(x => geschaald(x, factor(data, r)))) {
      if (!i.naam) continue;
      const key = norm(i.naam) + '|' + (i.eenheid || '');
      if (!regels.has(key)) regels.set(key, { key, naam: i.naam, eenheid: i.eenheid || null, nodig: 0, onbekend: false, recepten: [], voorraadkast: i.voorraadkast, ah: { ...i.ah } });
      const regel = regels.get(key);
      if (i.hoeveelheid === null) regel.onbekend = true; else regel.nodig += Number(i.hoeveelheid);
      if (!regel.recepten.includes(r.naam)) regel.recepten.push(r.naam);
      for (const k of ['productnummer', 'verpakking', 'verpakking_naam', 'prijs']) if (regel.ah[k] == null && i.ah[k] != null) regel.ah[k] = i.ah[k];
    }
  }
  const uit = [];
  for (const regel of regels.values()) {
    const adj = w.aanpassingen[regel.key] || {};
    if (adj.weg) continue;
    regel.nodig = rond(regel.nodig);
    const v = voorraadItem(data, regel.naam, regel.eenheid);
    regel.inVoorraad = v ? v.hoeveelheid : 0;
    const tekort = Math.max(0, rond(regel.nodig - regel.inVoorraad));
    const verp = Number(regel.ah.verpakking) || 0;
    let basis;
    if (verp > 0) {
      basis = Math.ceil(tekort / verp - 1e-9);
      regel.koopEenheid = regel.ah.verpakking_naam || 'st';
    } else {
      basis = Math.ceil(tekort - 1e-9);
      regel.koopEenheid = regel.eenheid || 'st';
    }
    if (regel.onbekend && basis === 0 && !(regel.inVoorraad > 0)) basis = 1;
    regel.aantal = Math.max(basis > 0 ? 1 : 0, basis + (adj.delta || 0));
    regel.restje = verp > 0 ? rond(regel.aantal * verp - tekort) : 0;
    const auto = regel.voorraadkast || (basis === 0);
    regel.opVoorraad = adj.opVoorraad ?? auto;
    if (!regel.opVoorraad && regel.aantal === 0) regel.aantal = 1;
    regel.prijs = regel.ah.prijs != null ? regel.aantal * Number(regel.ah.prijs) : null;
    regel.afdeling = afdeling(regel);
    uit.push(regel);
  }
  for (const v of vasteNodig(data, startKey)) {
    const key = 'vast|' + v.id;
    const adj = w.aanpassingen[key] || {};
    if (adj.weg) continue;
    const aantal = Math.max(1, (Number(v.aantal) || 1) + (adj.delta || 0));
    uit.push({ key, vast: true, id: v.id, naam: v.naam, aantal, koopEenheid: v.eenheid || 'st', recepten: [], ah: { productnummer: v.productnummer || null }, prijs: v.prijs != null ? aantal * v.prijs : null, opVoorraad: adj.opVoorraad ?? false, afdeling: 'Vaste boodschappen' });
  }
  for (const e of w.extra) {
    const opVoorraad = w.aanpassingen['extra|' + e.id]?.opVoorraad ?? false;
    uit.push({ key: 'extra|' + e.id, extra: true, id: e.id, naam: e.naam, aantal: e.aantal, koopEenheid: e.eenheid || 'st', recepten: [], ah: { productnummer: e.productnummer || null }, prijs: e.prijs != null ? e.aantal * e.prijs : null, opVoorraad, afdeling: 'Extra' });
  }
  uit.sort((a, b) => AFDELINGEN.indexOf(a.afdeling) - AFDELINGEN.indexOf(b.afdeling) || a.naam.localeCompare(b.naam, 'nl'));
  const teKopen = uit.filter(r => !r.opVoorraad);
  const totaal = teKopen.reduce((s, r) => s + (r.prijs || 0), 0);
  const zonderPrijs = teKopen.filter(r => r.prijs === null).length;
  return { regels: uit, teKopen, opVoorraad: uit.filter(r => r.opVoorraad), totaal, zonderPrijs };
}

// Weeklijst om in Claude Desktop (project 'Boodschappen AH', met ah-mcp) te plakken.
// Zo kort mogelijk om tokens te sparen: per regel productnummer, aantal en korte naam.
// De werkwijze staat in de projectinstructies, dus er komt geen uitleg bij.
// Regels zonder productnummer gaan apart, met de verpakking erbij, zodat Claude alleen die hoeft te zoeken.
export function ahTekst(lijst, label) {
  const verp = r => r.ah.verpakking ? `${r.koopEenheid} ${getal(r.ah.verpakking)} ${r.eenheid || ''}`.trim() : r.koopEenheid;
  const met = lijst.teKopen.filter(r => r.ah.productnummer).map(r => `${r.ah.productnummer} ${r.aantal}x ${r.naam}`);
  const zonder = lijst.teKopen.filter(r => !r.ah.productnummer).map(r => `${r.aantal}x ${r.naam} (${verp(r)})`);
  return [`Weeklijst ${label.split(' · ')[0]}`, ...met, ...(zonder.length ? ['Zoeken:', ...zonder] : [])].join('\n');
}

// Boodschappen zijn binnen: op voorraad zetten en de lijst bewaren.
export function gekocht(data, startKey) {
  const lijst = boodschappen(data, startKey);
  for (const r of lijst.teKopen) {
    if (r.vast) { const v = data.instellingen.vasteBoodschappen.find(x => x.id === r.id); if (v) v.laatst = startKey; continue; }
    if (r.extra || r.onbekend && r.nodig === 0) continue;
    const verp = Number(r.ah.verpakking) || 0;
    const hoeveel = verp > 0 ? r.aantal * verp : r.aantal;
    voegVoorraadToe(data, r.naam, r.eenheid, hoeveel, plekVoor(r));
  }
  data.lijsten.unshift({
    id: crypto.randomUUID(),
    week: startKey,
    datum: vandaagKey(),
    totaal: lijst.totaal,
    regels: lijst.teKopen.map(r => ({ naam: r.naam, aantal: r.aantal, eenheid: r.koopEenheid, productnummer: r.ah.productnummer || null, prijs: r.prijs })),
  });
  return lijst.teKopen.length;
}

// ---------- Zelf een recept invoeren ----------
// Eén ingrediënt per regel, zoals je het opschrijft: "400 g kipfilet", "2 tenen knoflook, fijngesneden",
// "1-2 el sambal", "zout". We maken daar hetzelfde uniforme formaat van als in data/recepten.json.
const EENHEID_WOORDEN = {
  g: 'g', gr: 'g', gram: 'g', kg: 'kg', kilo: 'kg', ml: 'ml', cl: 'cl', dl: 'dl', l: 'l', liter: 'l',
  el: 'el', eetlepel: 'el', eetlepels: 'el', tl: 'tl', theelepel: 'tl', theelepels: 'tl',
  teen: 'teen', tenen: 'teen', teentje: 'teen', teentjes: 'teen',
  blik: 'blik', blikken: 'blik', blikje: 'blik', blikjes: 'blik',
  pot: 'pot', potten: 'pot', potje: 'pot', potjes: 'pot',
  pak: 'pak', pakken: 'pak', pakje: 'pak', pakjes: 'pak',
  zak: 'zak', zakken: 'zak', zakje: 'zak', zakjes: 'zak',
  flesje: 'flesje', flesjes: 'flesje', snuf: 'snuf', snufje: 'snuf',
  stuk: 'stuk', stuks: 'stuk', bos: 'bos', bosje: 'bos', bossen: 'bos',
};
// Naar de eenheden van de database (codelijst eenheid).
const OMREKENEN = { cl: ['ml', 10], dl: ['ml', 100] };
// Wat meestal in de kast staat; aangevuld met alles wat in bestaande recepten als voorraadkast staat.
const KAST_WOORDEN = ['zout', 'peper', 'olie', 'olijfolie', 'zonnebloemolie', 'boter', 'bloem', 'suiker', 'azijn', 'sojasaus',
  'ketjap', 'sambal', 'kerrie', 'komijn', 'paprikapoeder', 'kurkuma', 'oregano', 'tijm', 'bouillon', 'bouillonblokje',
  'honing', 'mosterd', 'chilivlokken', 'kaneel', 'nootmuskaat', 'gember poeder', 'knoflookpoeder', 'laurier'];

function leesGetal(s) {
  if (!s) return null;
  const breuk = { '½': 0.5, '¼': 0.25, '¾': 0.75 }[s];
  if (breuk) return breuk;
  const b = /^(\d+)\/(\d+)$/.exec(s);
  if (b) return Number(b[1]) / Number(b[2]);
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function kastNamen(data) {
  const s = new Set(KAST_WOORDEN);
  for (const r of data.recepten) for (const i of r.ingredienten) if (i.voorraadkast) s.add(norm(i.naam));
  return s;
}

export function leesIngredient(regel, kast = new Set()) {
  let t = regel.replace(/^[-*•·\s]+/, '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  let toelichting = null;
  const haakjes = /\(([^)]*)\)/.exec(t);
  if (haakjes) { toelichting = haakjes[1].trim() || null; t = t.replace(haakjes[0], ' ').replace(/\s+/g, ' ').trim(); }
  const komma = t.search(/,(?!\d)/); // niet de komma in 1,5
  if (komma > 0) { toelichting = [t.slice(komma + 1).trim(), toelichting].filter(Boolean).join('; ') || null; t = t.slice(0, komma).trim(); }
  const GETAL = '(\\d+(?:[.,]\\d+)?|\\d+\\/\\d+|[½¼¾])';
  const m = new RegExp(`^${GETAL}(?:\\s*(?:-|–|tot)\\s*${GETAL})?\\s*(.*)$`).exec(t);
  let hoeveelheid = null, hoeveelheid_max = null, eenheid = null, naam = t;
  if (m) {
    hoeveelheid = leesGetal(m[1]);
    hoeveelheid_max = leesGetal(m[2]);
    const [woord, ...rest] = m[3].split(' ');
    const e = EENHEID_WOORDEN[woord.replace(/\.$/, '').toLowerCase()];
    if (e && rest.length) { eenheid = e; naam = rest.join(' '); }
    else { eenheid = 'stuk'; naam = m[3]; }
    if (OMREKENEN[eenheid]) {
      const [nieuw, x] = OMREKENEN[eenheid];
      hoeveelheid *= x; if (hoeveelheid_max) hoeveelheid_max *= x; eenheid = nieuw;
    }
  }
  naam = naam.replace(/^(van|de|het)\s+/i, '').trim().toLowerCase();
  if (!naam) return null;
  const isKast = n => kast.has(n) || [...kast].some(k => k.length > 3 && n.endsWith(k) && n.split(' ').length <= 2);
  const inKast = naam.split(/ en | of /).every(isKast); // ook "peper en zout"
  return {
    naam, hoeveelheid, hoeveelheid_max: hoeveelheid_max && hoeveelheid_max > hoeveelheid ? hoeveelheid_max : null,
    eenheid, toelichting, groep: inKast ? 'kruiden' : 'hoofd', voorraadkast: inKast,
  };
}

export function leesIngredienten(tekst, kast) {
  return (tekst || '').split('\n').map(r => leesIngredient(r, kast)).filter(Boolean);
}

export function leesStappen(tekst) {
  return (tekst || '').split('\n').map(s => s.replace(/^\s*(\d+[.)]|[-*•·])\s*/, '').trim()).filter(Boolean);
}

// Maakt een recept in het uniforme formaat van data/recepten.json (schema_versie 2).
// invoer: { naam, dieet[], basis, porties, tijd, ingredienten[], stappen[], bron }
export function receptUitInvoer(data, invoer, bestaand = null) {
  const tijd = Number(invoer.tijd) || null;
  const heeftIngr = invoer.ingredienten.length > 0, heeftStappen = invoer.stappen.length > 0;
  const open = [];
  if (!invoer.porties) open.push('Voor hoeveel personen is dit recept?');
  if (!tijd) open.push('Hoe lang duurt het koken?');
  const zonder = invoer.ingredienten.filter(i => i.hoeveelheid === null && !i.voorraadkast).map(i => i.naam);
  if (zonder.length) open.push(`Hoeveel ${zonder.join(', ')}?`);
  return {
    ...(bestaand || {}),
    id: bestaand ? bestaand.id : maakId(data, invoer.naam),
    naam: invoer.naam.trim().replace(/^./, c => c.toUpperCase()),
    dieet: invoer.dieet,
    basis: invoer.basis || null,
    bron: invoer.bron?.trim() || 'zelf ingevoerd in de app',
    porties: Number(invoer.porties) || null,
    bereidingstijd_min: tijd, bereidingstijd_max: tijd,
    ingredienten: invoer.ingredienten,
    stappen: invoer.stappen,
    varianten: bestaand?.varianten || [],
    status: heeftIngr && heeftStappen ? 'concept' : 'alleen_naam',
    afgeleid: [`ingevoerd in de app op ${bestaand?.in_app_toegevoegd || vandaagKey()}`],
    open_vragen: open,
    te_controleren: true,
    nieuw: true,
    in_app_toegevoegd: bestaand?.in_app_toegevoegd || vandaagKey(),
  };
}

// Korte tekst om aan Claude te geven, zodat het recept in data/recepten.json komt (en op alle telefoons).
export function receptVoorDatabase(r) {
  const velden = ['id', 'naam', 'dieet', 'basis', 'bron', 'porties', 'bereidingstijd_min', 'bereidingstijd_max',
    'ingredienten', 'stappen', 'varianten', 'status', 'afgeleid', 'open_vragen', 'te_controleren', 'nieuw'];
  const uit = Object.fromEntries(velden.map(k => [k, r[k]]));
  uit.ingredienten = r.ingredienten.map(({ naam, hoeveelheid, hoeveelheid_max, eenheid, toelichting, groep, voorraadkast }) =>
    ({ naam, hoeveelheid, hoeveelheid_max, eenheid, toelichting, groep, voorraadkast }));
  return `Nieuw recept voor de receptendatabase (data/recepten.json):\n${JSON.stringify(uit)}`;
}
