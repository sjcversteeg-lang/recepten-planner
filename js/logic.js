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
export function vandaagKey() { return dagKey(new Date()); }
export function weeknummer(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
  const jan1 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x - jan1) / 86400000 + 1) / 7);
}
export function kortDatum(d) { return `${d.getDate()} ${MAANDEN[d.getMonth()]}`; }
export function weekLabel(maandagKey) {
  const ma = vanKey(maandagKey);
  return `Week ${weeknummer(ma)} · ${kortDatum(ma)} – ${kortDatum(plusDagen(ma, 6))}`;
}
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

// ---------- Weken ----------
export function week(data, maandagKey) {
  if (!data.weken[maandagKey]) {
    const ma = vanKey(maandagKey);
    const dagen = {};
    for (let i = 0; i < 7; i++) {
      const s = data.instellingen.dagen[i + 1] || {};
      dagen[dagKey(plusDagen(ma, i))] = { recept: null, kok: s.kok || null, voetbal: !!s.voetbal, voetbalTekst: s.voetbal ? s.voetbalTekst || '' : '', notitie: '' };
    }
    data.weken[maandagKey] = { dagen, extra: [], aanpassingen: {} };
  }
  return data.weken[maandagKey];
}
export function vrijOp(data, datumKey) {
  return data.instellingen.dagen[weekdag(vanKey(datumKey))]?.vrij || null;
}
export function etenstijd(data, dag) {
  return dag.voetbal ? data.instellingen.etenstijdVoetbal : data.instellingen.etenstijd;
}

export function aanbiedingWoorden(data) {
  return data.instellingen.aanbiedingen.split(/[,;\n]/).map(norm).filter(Boolean);
}
function bevatAanbieding(r, woorden) {
  const tekst = norm(r.naam + ' ' + r.ingredienten.map(i => i.naam).join(' '));
  return woorden.filter(w => tekst.includes(w)).length;
}

// Vult de lege dagen van een week met een voorstel. Regels (zie docs/ARCHITECTUUR.md):
// liefst iets wat lang niet gegeten is, niet vaker dan de ingestelde frequentie,
// voorkeur voor groente in de aanbieding, snel bij voetbal, eenvoudig als een kind kookt.
export function maakVoorstel(data, maandagKey) {
  const w = week(data, maandagKey);
  const woorden = aanbiedingWoorden(data);
  const gebruikt = new Set(Object.values(w.dagen).map(d => d.recept).filter(Boolean));
  let gevuld = 0;
  for (const [datum, dag] of Object.entries(w.dagen)) {
    if (dag.recept) continue;
    let beste = null, besteScore = -Infinity;
    for (const r of data.recepten) {
      if (gebruikt.has(r.id) || r.nieuw) continue;
      const laatst = laatstGegeten(data, r.id);
      const dagenTerug = laatst ? Math.round((vanKey(datum) - vanKey(laatst)) / 86400000) : 60;
      let score = Math.min(dagenTerug, 60);
      if (r.frequentie_weken && laatst && dagenTerug < r.frequentie_weken * 7) score -= 100;
      score += 25 * bevatAanbieding(r, woorden);
      if (dag.voetbal) score += isSnel(r) ? 30 : -20;
      if (isKind(data, dag.kok)) score += waardering(data, r.id, dag.kok).kan ? 40 : kinderenKunnen(data, r) ? 15 : -10;
      score += 5 * wieLekker(data, r.id).length;
      if (r.status !== 'alleen_naam') score += 5;
      score += Math.random() * 15;
      if (score > besteScore) { besteScore = score; beste = r; }
    }
    if (beste) { dag.recept = beste.id; gebruikt.add(beste.id); gevuld++; }
  }
  return gevuld;
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
  if (ingr.voorraadkast) return 'kast';
  if (['blik', 'pot', 'pak', 'flesje'].includes(ingr.eenheid)) return 'la';
  return 'koelkast';
}
export const PLEKKEN = { vriezer: 'Vriezer', koelkast: 'Koelkast', la: 'La (blik en pot)', kast: 'Kast (kruiden en droog)', overig: 'Overig' };

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
export const AFDELINGEN = ['Vers', 'Blik en pot', 'Kruiden en kast', 'Extra'];

export function boodschappen(data, maandagKey) {
  const w = week(data, maandagKey);
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

// Tekst om in Claude Desktop (project 'Boodschappen AH') te plakken.
export function ahTekst(lijst, label) {
  const regels = lijst.teKopen.map(r => {
    const nr = r.ah.productnummer ? `AH ${r.ah.productnummer}` : 'AH-nummer onbekend';
    return `- ${r.aantal} × ${r.naam} (${r.koopEenheid}) · ${nr}`;
  });
  return `Boodschappen ${label}\nZet deze artikelen in mijn AH-winkelmandje:\n${regels.join('\n')}`;
}

// Boodschappen zijn binnen: op voorraad zetten en de lijst bewaren.
export function gekocht(data, maandagKey) {
  const lijst = boodschappen(data, maandagKey);
  for (const r of lijst.teKopen) {
    if (r.extra || r.onbekend && r.nodig === 0) continue;
    const verp = Number(r.ah.verpakking) || 0;
    const hoeveel = verp > 0 ? r.aantal * verp : r.aantal;
    voegVoorraadToe(data, r.naam, r.eenheid, hoeveel, plekVoor(r));
  }
  data.lijsten.unshift({
    id: crypto.randomUUID(),
    week: maandagKey,
    datum: vandaagKey(),
    totaal: lijst.totaal,
    regels: lijst.teKopen.map(r => ({ naam: r.naam, aantal: r.aantal, eenheid: r.koopEenheid, productnummer: r.ah.productnummer || null, prijs: r.prijs })),
  });
  return lijst.teKopen.length;
}
