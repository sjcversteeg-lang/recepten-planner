// Schermen van de app. Elk scherm is een functie die HTML teruggeeft en daarna
// de knoppen koppelt. De adresbalk (#/week, #/recept/<id>, …) bepaalt welk scherm.
import { db, laad, bewaar, exporteer, importeer, wisAlles, normaliseerRecept, normaliseerIngredient } from './store.js';
import * as L from './logic.js';

const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const D = () => db.data;

const ICON = {
  instellingen: '<svg viewBox="0 0 24 24"><path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/></svg>',
  terug: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  links: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  rechts: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  kar: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.4 11h11L21 7H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg>',
  label: '<svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg>',
  vink: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  min: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  prullenbak: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pijl: '<svg viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  ster: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>',
};

// ---------- Hulpjes ----------
function toast(tekst) {
  const t = document.getElementById('toast');
  t.textContent = tekst;
  t.classList.add('zichtbaar');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('zichtbaar'), 2600);
}
function opslaan() { bewaar(); }
function on(sel, ev, fn, root = app) { root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => fn(e, el))); }

function huidigeMaandag() {
  const m = /week=(\d{4}-\d{2}-\d{2})/.exec(location.hash);
  return m ? m[1] : L.dagKey(L.maandagVan(new Date()));
}
function weekTitel(maandagKey) {
  const nu = L.dagKey(L.maandagVan(new Date()));
  const verschil = Math.round((L.vanKey(maandagKey) - L.vanKey(nu)) / (7 * 86400000));
  if (verschil === 0) return 'Deze week';
  if (verschil === 1) return 'Volgende week';
  if (verschil === -1) return 'Vorige week';
  return `Week ${L.weeknummer(L.vanKey(maandagKey))}`;
}
function vindDagVoorRecept(id) {
  // Eerste dag in deze of volgende week waarop dit recept gepland staat.
  const ma = L.maandagVan(new Date());
  for (const m of [ma, L.plusDagen(ma, 7)]) {
    const w = D().weken[L.dagKey(m)];
    if (!w) continue;
    for (const [datum, dag] of Object.entries(w.dagen)) if (dag.recept === id && datum >= L.vandaagKey()) return { datum, dag };
  }
  return null;
}
async function kopieer(tekst) {
  try { await navigator.clipboard.writeText(tekst); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = tekst; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}
function download(naam, tekst) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([tekst], { type: 'application/json' }));
  a.download = naam; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- Sheet (venster van onderen) ----------
function sheet(html, koppel) {
  const achter = document.createElement('div');
  achter.className = 'sheet-achter';
  achter.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="greep"></div>${html}</div>`;
  const sluit = () => { achter.remove(); render(); };
  achter.addEventListener('click', e => { if (e.target === achter) sluit(); });
  document.body.appendChild(achter);
  koppel(achter.querySelector('.sheet'), sluit);
  return sluit;
}

// ================= WEEK =================
function schermWeek() {
  const ma = huidigeMaandag();
  const w = L.week(D(), ma);
  const vandaag = L.vandaagKey();
  const vd = w.dagen[vandaag];
  let kaart = '';
  if (vd) {
    const r = vd.recept && L.recept(D(), vd.recept);
    const sub = [vd.kok ? `${esc(vd.kok)} kookt` : null, `eten om ${esc(L.etenstijd(D(), vd))}`, r && L.tijdTekst(r)].filter(Boolean).join(' · ');
    kaart = `
      <section class="kaart">
        <div class="regel1"><span class="dag">Vandaag · ${L.DAGNAMEN[L.weekdag(new Date())]}</span>${vd.voetbal ? '<span class="label oranje">Voetbal</span>' : ''}</div>
        <h2>${r ? esc(r.naam) : 'Nog niets gepland'}</h2>
        <p class="sub">${sub}</p>
        ${r ? `<a class="knop zwart breed" href="#/recept/${esc(r.id)}">Bekijk recept</a>`
            : `<button class="knop zwart breed" data-dag="${vandaag}">Kies een recept</button>`}
      </section>`;
  }
  const rijen = Object.entries(w.dagen).map(([datum, dag]) => {
    const r = dag.recept && L.recept(D(), dag.recept);
    const vrij = L.vrijOp(D(), datum);
    const labels = [
      dag.voetbal ? '<span class="label oranje">Voetbal</span>' : '',
      vrij ? `<span class="label groen">${esc(vrij)} vrij</span>` : '',
      r && r.nieuw ? '<span class="label paars">Nieuw</span>' : '',
      r && D().geschiedenis.some(g => g.recept === r.id && g.datum === datum) ? '<span class="label grijs">Gekookt</span>' : '',
    ].join('');
    const code = L.DAGCODES[L.weekdag(L.vanKey(datum))];
    return `<li><button class="rij" data-dag="${datum}">
      <span class="dagcode ${datum === vandaag ? 'vandaag' : ''}">${code}</span>
      <span class="hoofd"><span class="naam ${r ? '' : 'leeg'}">${r ? esc(r.naam) : 'Kies een recept'}</span></span>
      <span class="rechts">${labels}<span>${esc(dag.kok || '')}</span></span>
    </button></li>`;
  }).join('');
  const aanb = D().instellingen.aanbiedingen.trim();
  const leeg = Object.values(w.dagen).filter(d => !d.recept).length;
  return {
    html: `
    <header class="kop">
      <div><p class="boven">${esc(L.weekLabel(ma))}</p><h1>${weekTitel(ma)}</h1></div>
      <div class="kop-knoppen">
        <a class="rond" href="#/week?week=${L.dagKey(L.plusDagen(L.vanKey(ma), -7))}" aria-label="Vorige week">${ICON.links}</a>
        <a class="rond" href="#/week?week=${L.dagKey(L.plusDagen(L.vanKey(ma), 7))}" aria-label="Volgende week">${ICON.rechts}</a>
        <a class="rond" href="#/instellingen" aria-label="Instellingen">${ICON.instellingen}</a>
      </div>
    </header>
    ${kaart}
    <ul class="lijst">${rijen}</ul>
    <button class="aanbieding" id="aanb">${ICON.label}<span>${aanb ? `In de aanbieding: ${esc(aanb)}` : 'Tik om de groente in de aanbieding in te vullen'}</span></button>
    <div class="knoprij">
      <button class="knop" id="voorstel" ${leeg ? '' : 'disabled'}>${ICON.ster} Voorstel${leeg ? ` (${leeg})` : ''}</button>
      <a class="knop groen" href="#/boodschappen?week=${ma}">${ICON.kar} Boodschappen</a>
    </div>`,
    koppel() {
      on('[data-dag]', 'click', (e, el) => dagSheet(ma, el.dataset.dag));
      on('#voorstel', 'click', () => {
        const n = L.maakVoorstel(D(), ma); opslaan(); render();
        toast(n ? `${n} ${n === 1 ? 'dag' : 'dagen'} ingevuld. Tik op een dag om te wisselen.` : 'Geen recept gevonden.');
      });
      on('#aanb', 'click', () => aanbiedingSheet());
    },
  };
}

function aanbiedingSheet() {
  sheet(`<h2>Aanbiedingen deze week</h2>
    <p class="hint">Welke groente is bij Albert Heijn in de aanbieding? Scheid met komma's. Het voorstel kiest dan liever recepten met deze groente.</p>
    <label class="veld"><input id="aanbInvoer" value="${esc(D().instellingen.aanbiedingen)}" placeholder="prei, broccoli, aubergine"></label>
    <button class="knop zwart breed" id="ok">Bewaren</button>`, (s, sluit) => {
    on('#ok', 'click', () => { D().instellingen.aanbiedingen = s.querySelector('#aanbInvoer').value; opslaan(); sluit(); }, s);
  });
}

function dagSheet(ma, datum) {
  const w = L.week(D(), ma);
  const dag = w.dagen[datum];
  const d = L.vanKey(datum);
  const titel = `${L.DAGNAMEN[L.weekdag(d)].replace(/^./, c => c.toUpperCase())} ${L.kortDatum(d)}`;
  const koks = D().instellingen.koks.map(k => k.naam);
  sheet(`
    <h2>${titel}</h2>
    <div class="chips" id="koks">${koks.map(k => `<button class="chip ${dag.kok === k ? 'aan' : ''}" data-kok="${esc(k)}">${esc(k)}</button>`).join('')}</div>
    <label class="vink"><input type="checkbox" id="voetbal" ${dag.voetbal ? 'checked' : ''}> Voetbal: vroeg en snel eten</label>
    <input class="zoek" id="zoek" placeholder="Zoek een recept" autocomplete="off">
    <div class="keuzes" id="keuzes"></div>
    <div class="knoprij">
      ${dag.recept ? '<button class="knop smal" id="leeg">Leegmaken</button>' : ''}
      ${dag.recept ? `<a class="knop" href="#/recept/${esc(dag.recept)}?datum=${datum}" id="bekijk">Bekijk recept</a>` : ''}
      <button class="knop zwart" id="klaar">Klaar</button>
    </div>`, (s, sluit) => {
    const toon = () => {
      const q = s.querySelector('#zoek').value.trim().toLowerCase();
      const lijst = D().recepten
        .filter(r => !q || r.naam.toLowerCase().includes(q))
        .map(r => ({ r, laatst: L.laatstGegeten(D(), r.id) }))
        .sort((a, b) => (b.r.id === dag.recept) - (a.r.id === dag.recept) || (a.laatst || '') .localeCompare(b.laatst || '') || a.r.naam.localeCompare(b.r.naam, 'nl'));
      s.querySelector('#keuzes').innerHTML = `<ul class="lijst">${lijst.map(({ r, laatst }) => `
        <li><button class="rij ${r.id === dag.recept ? 'gekozen' : ''}" data-recept="${esc(r.id)}">
          <span class="hoofd"><span class="naam">${esc(r.naam)}</span><span class="klein">${[L.isSnel(r) ? 'snel' : '', r.kinderen_kunnen ? 'kinderen kunnen dit' : '', 'laatst ' + L.geledenTekst(laatst)].filter(Boolean).join(' · ')}</span></span>
          ${r.id === dag.recept ? ICON.vink : ''}
        </button></li>`).join('')}</ul>`;
      on('[data-recept]', 'click', (e, el) => { dag.recept = el.dataset.recept; opslaan(); sluit(); }, s);
    };
    toon();
    s.querySelector('#zoek').addEventListener('input', toon);
    on('[data-kok]', 'click', (e, el) => {
      dag.kok = el.dataset.kok; opslaan();
      s.querySelectorAll('[data-kok]').forEach(c => c.classList.toggle('aan', c === el));
    }, s);
    on('#voetbal', 'change', (e, el) => { dag.voetbal = el.checked; opslaan(); }, s);
    on('#leeg', 'click', () => { dag.recept = null; opslaan(); sluit(); }, s);
    on('#klaar', 'click', sluit, s);
    on('#bekijk', 'click', () => document.querySelector('.sheet-achter')?.remove(), s);
  });
}

// ================= RECEPTEN =================
const filters = { zoek: '', filter: 'alle', tab: 'recepten' };
const FILTERS = {
  alle: ['Alle', () => true],
  vegetarisch: ['Vega', r => r.dieet.includes('vegetarisch')],
  vlees: ['Vlees', r => r.dieet.includes('vlees')],
  vis: ['Vis', r => r.dieet.includes('vis')],
  snel: ['Snel', r => L.isSnel(r)],
  kinderen: ['Kinderen', r => r.kinderen_kunnen],
  aanvullen: ['Aan te vullen', r => r.status !== 'compleet'],
};

function schermRecepten() {
  const segment = `<div class="segment">
    <button data-tab="recepten" class="${filters.tab === 'recepten' ? 'aan' : ''}">Recepten · ${D().recepten.length}</button>
    <button data-tab="gegeten" class="${filters.tab === 'gegeten' ? 'aan' : ''}">Gegeten · ${D().geschiedenis.length}</button>
  </div>`;
  let inhoud;
  if (filters.tab === 'gegeten') {
    const g = [...D().geschiedenis].sort((a, b) => b.datum.localeCompare(a.datum));
    inhoud = g.length ? `<ul class="lijst">${g.map(x => {
      const r = L.recept(D(), x.recept);
      return `<li><a class="rij" href="#/recept/${esc(x.recept)}"><span class="hoofd"><span class="naam">${esc(r ? r.naam : x.recept)}</span>
        <span class="klein">${L.kortDatum(L.vanKey(x.datum))}${x.kok ? ` · ${esc(x.kok)} kookte` : ''}</span></span></a></li>`;
    }).join('')}</ul>` : '<p class="leeg-staat">Nog niets gegeten. Tik bij een recept op "Gekookt".</p>';
  } else {
    const q = filters.zoek.toLowerCase();
    const lijst = D().recepten.filter(r => FILTERS[filters.filter][1](r) && (!q || r.naam.toLowerCase().includes(q)))
      .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
    inhoud = `
      <input class="zoek" id="zoek" placeholder="Zoek een recept" value="${esc(filters.zoek)}" autocomplete="off">
      <div class="chips">${Object.entries(FILTERS).map(([k, [naam]]) => `<button class="chip ${filters.filter === k ? 'aan' : ''}" data-filter="${k}">${naam}</button>`).join('')}</div>
      <ul class="lijst" id="receptlijst">${lijst.map(r => {
        const sub = [r.basis, r.dieet.join(' / '), L.tijdTekst(r), 'laatst ' + L.geledenTekst(L.laatstGegeten(D(), r.id))].filter(Boolean).join(' · ');
        const status = r.status === 'compleet' ? '' : r.status === 'concept' ? '<span class="label oranje">concept</span>' : '<span class="label grijs">alleen naam</span>';
        return `<li><a class="rij" href="#/recept/${esc(r.id)}"><span class="hoofd"><span class="naam">${esc(r.naam)}</span><span class="klein">${esc(sub)}</span></span><span class="rechts">${r.nieuw ? '<span class="label paars">Nieuw</span>' : ''}${status}</span></a></li>`;
      }).join('') || '<li class="leeg-staat">Geen recepten gevonden.</li>'}</ul>`;
  }
  return {
    html: `<header class="kop"><div><p class="boven">${D().recepten.filter(r => r.status === 'compleet').length} compleet</p><h1>Recepten</h1></div>
      <div class="kop-knoppen"><a class="rond" href="#/recept-nieuw" aria-label="Nieuw recept">${ICON.plus}</a></div></header>
      ${segment}${inhoud}`,
    koppel() {
      on('[data-tab]', 'click', (e, el) => { filters.tab = el.dataset.tab; render(); });
      on('[data-filter]', 'click', (e, el) => { filters.filter = el.dataset.filter; render(); });
      on('#zoek', 'input', (e, el) => {
        filters.zoek = el.value;
        const pos = el.selectionStart; render();
        const z = app.querySelector('#zoek'); z.focus(); z.setSelectionRange(pos, pos);
      });
    },
  };
}

const receptTab = { tab: 'ingredienten' };
function schermRecept(id) {
  const r = L.recept(D(), id);
  if (!r) return { html: '<p class="leeg-staat">Recept niet gevonden.</p><a class="knop breed" href="#/recepten">Naar recepten</a>' };
  const m = /datum=(\d{4}-\d{2}-\d{2})/.exec(location.hash);
  const gepland = m ? { datum: m[1], dag: D().weken[L.dagKey(L.maandagVan(L.vanKey(m[1])))]?.dagen[m[1]] } : vindDagVoorRecept(id);
  const context = gepland?.dag
    ? `${L.DAGNAMEN[L.weekdag(L.vanKey(gepland.datum))].replace(/^./, c => c.toUpperCase())}${gepland.dag.kok ? ` · ${esc(gepland.dag.kok)} kookt` : ''}`
    : '';
  const meta = [L.tijdTekst(r), r.dieet.join(' / '), r.basis, r.porties ? `${r.porties} pers.` : '', `Laatst: ${L.geledenTekst(L.laatstGegeten(D(), id))}`].filter(Boolean);
  const voorraadLabel = i => {
    const v = L.voorraadItem(D(), i.naam, i.eenheid);
    if (!v) return i.voorraadkast ? 'uit de kast' : '';
    return i.hoeveelheid && v.hoeveelheid < i.hoeveelheid ? `${L.getal(v.hoeveelheid)} op voorraad` : 'op voorraad';
  };
  const ingr = r.ingredienten.length
    ? r.ingredienten.map(i => `<div class="ingr"><span class="hv">${esc(L.hoeveelheidTekst(i))}</span>
        <span class="nm">${esc(i.naam.replace(/^./, c => c.toUpperCase()))}${i.toelichting ? `<span class="klein" style="display:block;color:var(--zacht);font-size:14px">${esc(i.toelichting)}</span>` : ''}</span>
        <span class="vr">${esc(voorraadLabel(i))}</span></div>`).join('')
    : '<p class="hint">Nog geen ingrediënten. Tik op Bewerken om ze toe te voegen.</p>';
  const stappen = r.stappen.length ? `<ol class="stappen">${r.stappen.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '<p class="hint">Nog geen bereiding.</p>';
  const varianten = r.varianten.length ? `<div class="notitie"><strong>Varianten</strong><ul>${r.varianten.map(v => `<li>${esc(v.naam)}${v.toelichting ? `: ${esc(v.toelichting)}` : ''}</li>`).join('')}</ul></div>` : '';
  const vragen = r.open_vragen.length ? `<details class="meer"><summary>Nog ${r.open_vragen.length} open ${r.open_vragen.length === 1 ? 'vraag' : 'vragen'} bij dit recept</summary><ul>${r.open_vragen.map(v => `<li>${esc(v)}</li>`).join('')}</ul></details>` : '';
  const vandaagGekookt = D().geschiedenis.some(g => g.recept === id && g.datum === (gepland?.datum || L.vandaagKey()));
  return {
    html: `
      <div class="terugrij"><a class="terug" href="javascript:history.back()" aria-label="Terug">${ICON.terug}</a>
        <a class="knop klein" href="#/recept-bewerk/${esc(id)}">Bewerken</a></div>
      ${context ? `<p class="context">${context}</p>` : ''}
      <h1 class="titel">${esc(r.naam)}</h1>
      <div class="meta">${meta.map(x => `<span>${esc(x)}</span>`).join('')}</div>
      <div class="segment">
        <button data-rt="ingredienten" class="${receptTab.tab === 'ingredienten' ? 'aan' : ''}">Ingrediënten</button>
        <button data-rt="bereiding" class="${receptTab.tab === 'bereiding' ? 'aan' : ''}">Bereiding</button>
      </div>
      ${receptTab.tab === 'ingredienten' ? ingr : stappen + varianten}
      ${vragen}
      <div class="knoprij vastonder">
        <button class="knop smal" id="plan">Inplannen</button>
        <button class="knop groen" id="gekookt" ${vandaagGekookt ? 'disabled' : ''}>${ICON.vink} Gekookt</button>
      </div>`,
    koppel() {
      on('[data-rt]', 'click', (e, el) => { receptTab.tab = el.dataset.rt; render(); });
      on('#gekookt', 'click', () => {
        const datum = gepland?.datum && gepland.datum <= L.vandaagKey() ? gepland.datum : L.vandaagKey();
        L.gekookt(D(), id, datum, gepland?.dag?.kok); opslaan(); render();
        toast('Opgeslagen in de eetgeschiedenis. Gebruikte voorraad is afgeboekt.');
      });
      on('#plan', 'click', () => planSheet(id));
    },
  };
}

function planSheet(id) {
  const ma = L.dagKey(L.maandagVan(new Date()));
  const weken = [ma, L.dagKey(L.plusDagen(L.vanKey(ma), 7))];
  sheet(`<h2>Inplannen</h2>${weken.map(m => {
    const w = L.week(D(), m);
    return `<p class="sectie">${weekTitel(m)}</p><ul class="lijst">${Object.entries(w.dagen).map(([datum, dag]) => {
      const r = dag.recept && L.recept(D(), dag.recept);
      return `<li><button class="rij" data-plan="${m}|${datum}"><span class="dagcode">${L.DAGCODES[L.weekdag(L.vanKey(datum))]}</span>
        <span class="hoofd"><span class="naam ${r ? '' : 'leeg'}">${r ? esc(r.naam) : 'leeg'}</span></span><span class="rechts">${esc(dag.kok || '')}</span></button></li>`;
    }).join('')}</ul>`;
  }).join('')}`, (s, sluit) => {
    on('[data-plan]', 'click', (e, el) => {
      const [m, datum] = el.dataset.plan.split('|');
      L.week(D(), m).dagen[datum].recept = id; opslaan(); sluit(); toast('Ingepland.');
    }, s);
  });
}

// ---------- Recept bewerken ----------
const EENHEDEN = ['', 'stuk', 'teen', 'blik', 'pot', 'pak', 'zak', 'flesje', 'bos', 'g', 'kg', 'ml', 'l', 'tl', 'el', 'snuf'];
function schermReceptBewerk(id) {
  const bestaand = id ? L.recept(D(), id) : null;
  if (id && !bestaand) return { html: '<p class="leeg-staat">Recept niet gevonden.</p>' };
  const r = normaliseerRecept(structuredClone(bestaand || { naam: '', nieuw: true, ingredienten: [] }));
  const ingrRij = (i, n) => `
    <details class="meer ingr-blok" ${i.naam ? '' : 'open'}>
      <summary><strong>${esc(i.naam || 'Nieuw ingrediënt')}</strong><span style="color:var(--zacht)">${esc(L.hoeveelheidTekst(i))}</span></summary>
      <div class="ingr-bewerk">
        <input name="hoeveelheid" inputmode="decimal" placeholder="aantal" value="${esc(L.getal(i.hoeveelheid))}">
        <select name="eenheid">${EENHEDEN.map(e => `<option value="${e}" ${(i.eenheid || '') === e ? 'selected' : ''}>${e || '–'}</option>`).join('')}</select>
        <input name="naam" placeholder="ingrediënt" value="${esc(i.naam)}">
      </div>
      <div class="ingr-extra">
        <label>Toelichting<input name="toelichting" value="${esc(i.toelichting || '')}"></label>
        <label>AH-productnummer<input name="productnummer" value="${esc(i.ah.productnummer || '')}"></label>
        <label>Verpakking (in ${esc(i.eenheid || 'eenheid')})<input name="verpakking" inputmode="decimal" placeholder="bijv. 300" value="${esc(L.getal(i.ah.verpakking))}"></label>
        <label>Naam verpakking<input name="verpakking_naam" placeholder="zak, bak, pak" value="${esc(i.ah.verpakking_naam || '')}"></label>
        <label>Prijs per verpakking (€)<input name="prijs" inputmode="decimal" value="${esc(L.getal(i.ah.prijs))}"></label>
        <label class="vink" style="align-self:end"><input type="checkbox" name="voorraadkast" ${i.voorraadkast ? 'checked' : ''}> Uit de kast</label>
      </div>
      <button type="button" class="knop klein rood" data-weg="${n}">${ICON.prullenbak} Verwijderen</button>
    </details>`;
  const html = `
    <div class="terugrij"><a class="terug" href="javascript:history.back()" aria-label="Terug">${ICON.terug}</a></div>
    <h1 class="titel" style="font-size:26px">${bestaand ? 'Recept bewerken' : 'Nieuw recept'}</h1>
    <form id="form">
      <label class="veld"><span>Naam</span><input name="naam" required value="${esc(r.naam)}"></label>
      <div class="veld"><span>Dieet</span>${['vegetarisch', 'vlees', 'vis'].map(d => `<label class="vink"><input type="checkbox" name="dieet" value="${d}" ${r.dieet.includes(d) ? 'checked' : ''}> ${d}</label>`).join('')}</div>
      <div class="twee">
        <label class="veld"><span>Basis</span><select name="basis">${['', 'pasta', 'aardappel', 'rijst', 'taart', 'brood'].map(b => `<option value="${b}" ${(r.basis || '') === b ? 'selected' : ''}>${b || '–'}</option>`).join('')}</select></label>
        <label class="veld"><span>Personen</span><input name="porties" inputmode="numeric" value="${esc(r.porties ?? '')}"></label>
        <label class="veld"><span>Tijd van (min)</span><input name="tmin" inputmode="numeric" value="${esc(r.bereidingstijd_min ?? '')}"></label>
        <label class="veld"><span>Tijd tot (min)</span><input name="tmax" inputmode="numeric" value="${esc(r.bereidingstijd_max ?? '')}"></label>
      </div>
      <label class="veld"><span>Hoe vaak? Niet vaker dan eens per … weken</span><input name="frequentie" inputmode="numeric" placeholder="leeg = maakt niet uit" value="${esc(r.frequentie_weken ?? '')}"></label>
      <label class="vink"><input type="checkbox" name="snel" ${r.snel ? 'checked' : ''}> Snel klaar (goed voor voetbaldagen)</label>
      <label class="vink"><input type="checkbox" name="kinderen" ${r.kinderen_kunnen ? 'checked' : ''}> De kinderen kunnen dit maken</label>
      <label class="vink"><input type="checkbox" name="nieuw" ${r.nieuw ? 'checked' : ''}> Nieuw recept (nog niet eerder gemaakt)</label>
      <label class="veld"><span>Status</span><select name="status">
        <option value="alleen_naam" ${r.status === 'alleen_naam' ? 'selected' : ''}>alleen naam</option>
        <option value="concept" ${r.status === 'concept' ? 'selected' : ''}>concept</option>
        <option value="compleet" ${r.status === 'compleet' ? 'selected' : ''}>compleet</option></select></label>
      <p class="sectie">Ingrediënten</p>
      <div id="ingrs">${r.ingredienten.map(ingrRij).join('')}</div>
      <button type="button" class="knop klein" id="ingrPlus">${ICON.plus} Ingrediënt</button>
      <p class="sectie">Bereiding</p>
      <label class="veld"><span>Eén stap per regel</span><textarea name="stappen">${esc(r.stappen.join('\n'))}</textarea></label>
      <div class="knoprij">
        ${bestaand ? '<button type="button" class="knop smal rood" id="verwijder">Verwijderen</button>' : ''}
        <button class="knop zwart">Bewaren</button>
      </div>
    </form>`;
  const getalOfNull = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  return {
    html,
    koppel() {
      const f = app.querySelector('#form');
      const leesIngr = () => [...f.querySelectorAll('.ingr-blok')].map((b, n) => {
        const v = name => b.querySelector(`[name="${name}"]`);
        const oud = r.ingredienten[n] || {};
        return normaliseerIngredient({
          ...oud,
          naam: v('naam').value.trim(), hoeveelheid: getalOfNull(v('hoeveelheid').value), eenheid: v('eenheid').value || null,
          toelichting: v('toelichting').value.trim() || null, voorraadkast: v('voorraadkast').checked,
          groep: v('voorraadkast').checked ? 'kruiden' : (oud.groep || 'hoofd'),
          ah: { productnummer: v('productnummer').value.trim() || null, verpakking: getalOfNull(v('verpakking').value), verpakking_naam: v('verpakking_naam').value.trim() || null, prijs: getalOfNull(v('prijs').value) },
        });
      });
      const herteken = () => {
        f.querySelector('#ingrs').innerHTML = r.ingredienten.map(ingrRij).join('');
        on('[data-weg]', 'click', (e, el) => { r.ingredienten = leesIngr(); r.ingredienten.splice(+el.dataset.weg, 1); herteken(); }, f);
      };
      herteken();
      on('#ingrPlus', 'click', () => { r.ingredienten = leesIngr(); r.ingredienten.push(normaliseerIngredient({})); herteken(); });
      on('#verwijder', 'click', () => {
        if (!confirm(`"${r.naam}" verwijderen?`)) return;
        D().recepten = D().recepten.filter(x => x.id !== id);
        D().verwijderdeRecepten.push(id); opslaan(); location.hash = '#/recepten';
      });
      f.addEventListener('submit', e => {
        e.preventDefault();
        const fd = new FormData(f);
        const nieuw = {
          ...r,
          naam: fd.get('naam').trim(), dieet: fd.getAll('dieet'), basis: fd.get('basis') || null,
          porties: getalOfNull(fd.get('porties')), bereidingstijd_min: getalOfNull(fd.get('tmin')), bereidingstijd_max: getalOfNull(fd.get('tmax')),
          frequentie_weken: getalOfNull(fd.get('frequentie')), snel: fd.get('snel') === 'on', kinderen_kunnen: fd.get('kinderen') === 'on', nieuw: fd.get('nieuw') === 'on',
          status: fd.get('status'), ingredienten: leesIngr().filter(i => i.naam),
          stappen: fd.get('stappen').split('\n').map(s => s.trim()).filter(Boolean),
        };
        if (bestaand) Object.assign(bestaand, nieuw);
        else { nieuw.id = L.maakId(D(), nieuw.naam); nieuw.bron = 'app'; D().recepten.push(normaliseerRecept(nieuw)); }
        opslaan();
        location.replace(`#/recept/${bestaand ? id : nieuw.id}`);
        toast('Recept bewaard.');
      });
    },
  };
}

// ================= BOODSCHAPPEN =================
const bsTab = { tab: 'kopen' };
function schermBoodschappen() {
  const ma = huidigeMaandag();
  const w = L.week(D(), ma);
  const lijst = L.boodschappen(D(), ma);
  const aantalRecepten = Object.values(w.dagen).filter(d => d.recept).length;
  const regels = bsTab.tab === 'kopen' ? lijst.teKopen : lijst.opVoorraad;
  let groep = '';
  const rijen = regels.map(r => {
    const kop = r.afdeling !== groep ? `<li class="sectie" style="border:0">${esc(r.afdeling)}</li>` : '';
    groep = r.afdeling;
    let sub = r.recepten.join(', ');
    if (r.opVoorraad) sub = r.voorraadkast && !r.inVoorraad ? 'Uit de kast' : 'Op voorraad';
    else if (r.inVoorraad > 0 && r.nodig) sub = `${L.getal(r.inVoorraad)} van ${L.getal(r.nodig)} al in huis`;
    else if (r.restje > 0) sub = `Nodig ${L.getal(r.nodig)} ${r.eenheid || ''} · ${L.getal(r.restje)} blijft over`;
    else if (r.onbekend && !r.nodig) sub += ' · hoeveelheid onbekend';
    const aanb = L.aanbiedingWoorden(D()).some(a => r.naam.toLowerCase().includes(a)) ? '<span class="label oranje">Aanbieding</span>' : '';
    return `${kop}<li><div class="rij" style="cursor:default">
      <button class="check ${r.opVoorraad ? 'aan' : ''}" data-check="${esc(r.key)}" aria-label="Op voorraad">${r.opVoorraad ? ICON.vink : ''}</button>
      <span class="hoofd"><span class="naam ${r.opVoorraad ? 'doorgestreept' : ''}">${esc(r.naam.replace(/^./, c => c.toUpperCase()))}</span><span class="klein">${esc(sub)}</span></span>
      ${aanb}
      ${r.opVoorraad ? '' : `<span class="teller">
        <button data-min="${esc(r.key)}" aria-label="Minder">${r.aantal <= 1 ? ICON.prullenbak : ICON.min}</button>
        <span class="aantal">${r.aantal} ${esc(L.eenheidTekst(r.koopEenheid, r.aantal) || 'st')}</span>
        <button data-plus="${esc(r.key)}" aria-label="Meer">${ICON.plus}</button></span>`}
    </div></li>`;
  }).join('');
  const totaal = bsTab.tab === 'kopen' && lijst.teKopen.length ? `<div class="totaal"><span>Totale kosten<br><span class="klein">${lijst.zonderPrijs ? `${lijst.zonderPrijs} artikelen nog zonder prijs` : 'alle prijzen bekend'}</span></span><span>${L.euro(lijst.totaal)}</span></div>` : '';
  return {
    html: `
      <header class="kop"><div><p class="boven">${esc(L.weekLabel(ma).split(' · ')[0])} · ${aantalRecepten} recepten</p><h1>Boodschappen</h1></div>
        <div class="kop-knoppen"><a class="rond" href="#/lijsten" aria-label="Opgeslagen lijsten">${ICON.label}</a></div></header>
      <div class="segment">
        <button data-bt="kopen" class="${bsTab.tab === 'kopen' ? 'aan' : ''}">Te kopen · ${lijst.teKopen.length}</button>
        <button data-bt="voorraad" class="${bsTab.tab === 'voorraad' ? 'aan' : ''}">Op voorraad · ${lijst.opVoorraad.length}</button>
      </div>
      <p class="hint">${bsTab.tab === 'kopen' ? 'Vink aan wat je al in huis hebt. De rest gaat naar Albert Heijn.' : 'Dit hoef je niet te kopen. Vink uit als het toch op is.'}</p>
      ${aantalRecepten ? '' : `<p class="leeg-staat">Nog geen recepten gepland voor deze week.<br><a href="#/week?week=${ma}">Naar het weekmenu</a></p>`}
      <ul class="lijst">${rijen}</ul>
      ${totaal}
      ${bsTab.tab === 'kopen' ? `<button class="knop klein" id="extra" style="margin-top:12px">${ICON.plus} Iets extra (melk, brood …)</button>` : ''}
      ${lijst.teKopen.length ? `<div class="vastonder">
        <button class="knop groen breed" id="ah">${ICON.pijl} Kopieer voor Albert Heijn · ${lijst.teKopen.length}</button>
        <button class="knop breed" id="gekocht" style="margin-top:8px;background:#fff">Boodschappen zijn binnen</button>
      </div>` : ''}`,
    koppel() {
      const adj = key => (w.aanpassingen[key] ||= {});
      const regel = key => lijst.regels.find(r => r.key === key);
      on('[data-bt]', 'click', (e, el) => { bsTab.tab = el.dataset.bt; render(); });
      on('[data-check]', 'click', (e, el) => { const r = regel(el.dataset.check); adj(r.key).opVoorraad = !r.opVoorraad; opslaan(); render(); });
      on('[data-plus]', 'click', (e, el) => {
        const r = regel(el.dataset.plus);
        if (r.extra) w.extra.find(x => x.id === r.id).aantal++; else adj(r.key).delta = (adj(r.key).delta || 0) + 1;
        opslaan(); render();
      });
      on('[data-min]', 'click', (e, el) => {
        const r = regel(el.dataset.min);
        if (r.aantal <= 1) {
          if (r.extra) w.extra = w.extra.filter(x => x.id !== r.id); else adj(r.key).weg = true;
          toast(`${r.naam} verwijderd van de lijst.`);
        } else if (r.extra) w.extra.find(x => x.id === r.id).aantal--;
        else adj(r.key).delta = (adj(r.key).delta || 0) - 1;
        opslaan(); render();
      });
      on('#extra', 'click', () => extraSheet(w));
      on('#ah', 'click', async () => {
        const ok = await kopieer(L.ahTekst(lijst, L.weekLabel(ma)));
        toast(ok ? 'Gekopieerd. Plak het in Claude Desktop, project "Boodschappen AH".' : 'Kopiëren lukte niet.');
      });
      on('#gekocht', 'click', () => {
        if (!confirm('Alles op de lijst is gekocht? Dan zet ik het in de voorraad en bewaar ik de lijst.')) return;
        const n = L.gekocht(D(), ma); opslaan(); render();
        toast(`${n} artikelen in de voorraad gezet. Lijst bewaard.`);
      });
    },
  };
}

function extraSheet(w) {
  sheet(`<h2>Iets extra</h2>
    <label class="veld"><span>Wat</span><input id="xNaam" placeholder="melk"></label>
    <div class="twee"><label class="veld"><span>Aantal</span><input id="xAantal" inputmode="numeric" value="1"></label>
    <label class="veld"><span>Prijs per stuk (€, mag leeg)</span><input id="xPrijs" inputmode="decimal"></label></div>
    <button class="knop zwart breed" id="ok">Toevoegen</button>`, (s, sluit) => {
    on('#ok', 'click', () => {
      const naam = s.querySelector('#xNaam').value.trim();
      if (!naam) return;
      const prijs = parseFloat(s.querySelector('#xPrijs').value.replace(',', '.'));
      w.extra.push({ id: crypto.randomUUID(), naam, aantal: Math.max(1, parseInt(s.querySelector('#xAantal').value) || 1), eenheid: 'st', prijs: Number.isFinite(prijs) ? prijs : null });
      opslaan(); sluit();
    }, s);
  });
}

function schermLijsten() {
  const l = D().lijsten;
  return {
    html: `<div class="terugrij"><a class="terug" href="#/boodschappen" aria-label="Terug">${ICON.terug}</a></div>
      <h1 class="titel" style="font-size:28px">Opgeslagen lijsten</h1>
      ${l.length ? l.map(x => `<details class="meer"><summary><strong>${esc(L.weekLabel(x.week))}</strong></summary>
        <p class="hint">Binnen op ${L.kortDatum(L.vanKey(x.datum))} · ${x.regels.length} artikelen${x.totaal ? ` · ${L.euro(x.totaal)}` : ''}</p>
        <ul class="lijst">${x.regels.map(r => `<li class="rij" style="min-height:40px;padding:8px 0"><span class="hoofd">${esc(r.naam)}</span><span class="rechts">${r.aantal} ${esc(r.eenheid)}</span></li>`).join('')}</ul></details>`).join('')
        : '<p class="leeg-staat">Nog geen lijsten. Tik bij Boodschappen op "Boodschappen zijn binnen" om een lijst te bewaren.</p>'}`,
  };
}

// ================= VOORRAAD =================
function schermVoorraad() {
  const per = {};
  for (const v of D().voorraad) (per[v.plek] ||= []).push(v);
  const secties = Object.entries(L.PLEKKEN).filter(([k]) => per[k]?.length).map(([k, naam]) => `
    <p class="sectie">${naam}</p>
    <ul class="lijst">${per[k].sort((a, b) => a.naam.localeCompare(b.naam, 'nl')).map(v => `
      <li><div class="rij" style="cursor:default">
        <button class="hoofd" data-bewerk="${v.id}" style="background:none;border:0;text-align:left;padding:0;cursor:pointer"><span class="naam">${esc(v.naam.replace(/^./, c => c.toUpperCase()))}</span></button>
        <span class="teller">
          <button data-vmin="${v.id}" aria-label="Minder">${ICON.min}</button>
          <span class="aantal">${L.getal(v.hoeveelheid)} ${esc(L.eenheidTekst(v.eenheid, v.hoeveelheid))}</span>
          <button data-vplus="${v.id}" aria-label="Meer">${ICON.plus}</button>
        </span></div></li>`).join('')}</ul>`).join('');
  return {
    html: `<header class="kop"><div><p class="boven">${D().voorraad.length} artikelen</p><h1>Voorraad</h1></div>
      <div class="kop-knoppen"><button class="rond" id="nieuw" aria-label="Toevoegen">${ICON.plus}</button></div></header>
      <p class="hint">Wat ligt er in de vriezer, de la en de kast? De boodschappenlijst houdt hier rekening mee. Na "Gekookt" wordt het gebruikte afgeboekt.</p>
      ${secties || '<p class="leeg-staat">De voorraad is nog leeg.</p>'}`,
    koppel() {
      const vind = id => D().voorraad.find(v => v.id === id);
      const stap = v => (v.hoeveelheid % 1 !== 0 || ['g', 'ml'].includes(v.eenheid)) ? (['g', 'ml'].includes(v.eenheid) ? 50 : 0.5) : 1;
      on('[data-vplus]', 'click', (e, el) => { const v = vind(el.dataset.vplus); v.hoeveelheid = Math.round((v.hoeveelheid + stap(v)) * 100) / 100; opslaan(); render(); });
      on('[data-vmin]', 'click', (e, el) => {
        const v = vind(el.dataset.vmin); v.hoeveelheid = Math.round((v.hoeveelheid - stap(v)) * 100) / 100;
        if (v.hoeveelheid <= 0) { D().voorraad = D().voorraad.filter(x => x !== v); toast(`${v.naam} is op.`); }
        opslaan(); render();
      });
      on('[data-bewerk]', 'click', (e, el) => voorraadSheet(vind(el.dataset.bewerk)));
      on('#nieuw', 'click', () => voorraadSheet(null));
    },
  };
}

function voorraadSheet(v) {
  const x = v || { naam: '', hoeveelheid: 1, eenheid: null, plek: 'vriezer' };
  sheet(`<h2>${v ? 'Voorraad aanpassen' : 'Voorraad toevoegen'}</h2>
    <label class="veld"><span>Wat</span><input id="vNaam" value="${esc(x.naam)}" placeholder="spinazie"></label>
    <div class="twee">
      <label class="veld"><span>Hoeveel</span><input id="vHv" inputmode="decimal" value="${esc(L.getal(x.hoeveelheid))}"></label>
      <label class="veld"><span>Eenheid</span><select id="vEh">${EENHEDEN.map(e => `<option value="${e}" ${(x.eenheid || '') === e ? 'selected' : ''}>${e || '–'}</option>`).join('')}</select></label>
    </div>
    <label class="veld"><span>Waar</span><select id="vPlek">${Object.entries(L.PLEKKEN).map(([k, n]) => `<option value="${k}" ${x.plek === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <p class="hint">Tip: gebruik dezelfde naam en eenheid als in het recept (bijv. "bonen" en "blik"), dan rekent de boodschappenlijst ermee.</p>
    <div class="knoprij">${v ? '<button class="knop smal rood" id="weg">Weg</button>' : ''}<button class="knop zwart" id="ok">Bewaren</button></div>`, (s, sluit) => {
    on('#ok', 'click', () => {
      const naam = s.querySelector('#vNaam').value.trim();
      const hv = parseFloat(s.querySelector('#vHv').value.replace(',', '.'));
      if (!naam || !Number.isFinite(hv)) return toast('Vul een naam en hoeveelheid in.');
      const nieuw = { naam, hoeveelheid: hv, eenheid: s.querySelector('#vEh').value || null, plek: s.querySelector('#vPlek').value };
      if (v) Object.assign(v, nieuw); else D().voorraad.push({ id: crypto.randomUUID(), ...nieuw });
      opslaan(); sluit();
    }, s);
    on('#weg', 'click', () => { D().voorraad = D().voorraad.filter(y => y !== v); opslaan(); sluit(); }, s);
  });
}

// ================= INSTELLINGEN =================
function schermInstellingen() {
  const i = D().instellingen;
  const koks = i.koks.map(k => k.naam);
  const kokSelect = (n, waarde, leeg) => `<select class="invoer" data-dagveld="${n}">${leeg ? `<option value="">${leeg}</option>` : ''}${koks.map(k => `<option ${waarde === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>`;
  return {
    html: `<div class="terugrij"><a class="terug" href="#/week" aria-label="Terug">${ICON.terug}</a></div>
      <h1 class="titel" style="font-size:28px">Instellingen</h1>
      <p class="sectie">Wie koken er</p>
      <ul class="lijst">${i.koks.map((k, n) => `<li><div class="rij" style="cursor:default"><span class="hoofd"><span class="naam">${esc(k.naam)}</span></span>
        <label class="vink" style="padding:0"><input type="checkbox" data-kind="${n}" ${k.kind ? 'checked' : ''}> kind</label>
        <button class="knop klein" data-kokweg="${n}" aria-label="Verwijder ${esc(k.naam)}">${ICON.prullenbak}</button></div></li>`).join('')}</ul>
      <div class="knoprij"><input class="invoer" id="kokNaam" placeholder="Naam toevoegen"><button class="knop smal" id="kokPlus">${ICON.plus}</button></div>
      <p class="hint">"Kind" betekent: het voorstel kiest dan liever recepten die de kinderen kunnen maken.</p>

      <p class="sectie">Vaste week</p>
      <p class="hint">Dit wordt ingevuld bij elke nieuwe week. Per week kun je het daarna nog aanpassen.</p>
      ${[1, 2, 3, 4, 5, 6, 7].map(d => `<div style="padding:10px 0;border-bottom:1px solid var(--lijn)">
        <strong style="display:block;margin-bottom:6px">${L.DAGNAMEN[d].replace(/^./, c => c.toUpperCase())}</strong>
        <div class="twee">${kokSelect(`${d}|kok`, i.dagen[d].kok)}${kokSelect(`${d}|vrij`, i.dagen[d].vrij, 'niemand vrij')}</div>
        <label class="vink"><input type="checkbox" data-voetbal="${d}" ${i.dagen[d].voetbal ? 'checked' : ''}> Voetbal</label></div>`).join('')}

      <p class="sectie">Etenstijd</p>
      <div class="twee"><label class="veld"><span>Normaal</span><input type="time" id="tijd" value="${esc(i.etenstijd)}"></label>
        <label class="veld"><span>Bij voetbal</span><input type="time" id="tijdV" value="${esc(i.etenstijdVoetbal)}"></label></div>

      <p class="sectie">Gegevens</p>
      <p class="hint">Versie 1 bewaart alles op dit apparaat, in deze browser. Maak af en toe een back-up. Met een back-up kun je de gegevens ook naar een ander apparaat overzetten.</p>
      <div class="knoprij"><button class="knop" id="export">Back-up maken</button>
        <label class="knop" style="cursor:pointer">Back-up terugzetten<input type="file" id="import" accept="application/json,.json" hidden></label></div>
      <div class="knoprij"><button class="knop rood" id="wis">Alles wissen</button></div>
      <p class="hint">Recepten uit data/recepten.json, bijgewerkt ${esc(D().bronBijgewerkt || 'onbekend')}.</p>`,
    koppel() {
      on('[data-kind]', 'change', (e, el) => { i.koks[+el.dataset.kind].kind = el.checked; opslaan(); });
      on('[data-kokweg]', 'click', (e, el) => { const k = i.koks[+el.dataset.kokweg]; if (confirm(`${k.naam} verwijderen?`)) { i.koks.splice(+el.dataset.kokweg, 1); opslaan(); render(); } });
      on('#kokPlus', 'click', () => { const n = app.querySelector('#kokNaam').value.trim(); if (n) { i.koks.push({ naam: n, kind: false }); opslaan(); render(); } });
      on('[data-dagveld]', 'change', (e, el) => { const [d, veld] = el.dataset.dagveld.split('|'); i.dagen[d][veld] = el.value || null; opslaan(); });
      on('[data-voetbal]', 'change', (e, el) => { i.dagen[el.dataset.voetbal].voetbal = el.checked; opslaan(); });
      on('#tijd', 'change', (e, el) => { i.etenstijd = el.value; opslaan(); });
      on('#tijdV', 'change', (e, el) => { i.etenstijdVoetbal = el.value; opslaan(); });
      on('#export', 'click', () => download(`recepten-planner-backup-${L.vandaagKey()}.json`, exporteer()));
      on('#import', 'change', async (e, el) => {
        const f = el.files[0]; if (!f) return;
        try { importeer(await f.text()); toast('Back-up teruggezet.'); render(); } catch (err) { toast(err.message || 'Dit bestand kan ik niet lezen.'); }
      });
      on('#wis', 'click', async () => { if (confirm('Echt alles wissen? Maak eerst een back-up.')) { await wisAlles(); toast('Alles gewist.'); render(); } });
    },
  };
}

// ================= ROUTER =================
const ROUTES = [
  [/^#\/week/, schermWeek, 'week'],
  [/^#\/recepten/, schermRecepten, 'recepten'],
  [/^#\/recept-nieuw/, () => schermReceptBewerk(null), 'recepten'],
  [/^#\/recept-bewerk\/([^?]+)/, m => schermReceptBewerk(decodeURIComponent(m[1])), 'recepten'],
  [/^#\/recept\/([^?]+)/, m => schermRecept(decodeURIComponent(m[1])), 'recepten'],
  [/^#\/boodschappen/, schermBoodschappen, 'boodschappen'],
  [/^#\/lijsten/, schermLijsten, 'boodschappen'],
  [/^#\/voorraad/, schermVoorraad, 'voorraad'],
  [/^#\/instellingen/, schermInstellingen, 'week'],
];

let vorigeHash = null;
function render() {
  const hash = location.hash || '#/week';
  const route = ROUTES.find(([re]) => re.test(hash)) || ROUTES[0];
  const scherm = route[1](route[0].exec(hash));
  const scroll = hash === vorigeHash ? window.scrollY : 0;
  app.innerHTML = scherm.html;
  scherm.koppel?.();
  window.scrollTo(0, scroll);
  vorigeHash = hash;
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('aan', a.dataset.tab === route[2]));
}

window.addEventListener('hashchange', render);
laad().then(render).catch(err => {
  app.innerHTML = `<p class="leeg-staat">Er ging iets mis bij het laden: ${esc(err.message)}</p>`;
});
