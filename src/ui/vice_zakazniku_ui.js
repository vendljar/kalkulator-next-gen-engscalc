/* ================= VÍC ZÁKAZNÍKŮ NA ZAKÁZCE — OBRAZOVKA (VZ-E1, roadmapa #600) =================
 *
 * Závazný návrh podklady/NAVRH_VICE_ZAKAZNIKU.md (v3) § 2a, § 6, § 8 a prototyp
 * podklady/vz_prototyp/ (snímky v2_*, v4_*, v5_*). Data a pravidla jsou v jádru
 * src/vice_zakazniku.js (E0: vzPridej, vzOdstran, vzZakaznici…); tady je jen
 * kreslení a obsluha. Vzor: víc šachet (src/ui/vice_sachet_ui.js, VS_UI).
 *
 * VYPÍNAČ: viceZakaznikuZapnuto() (Nastavení → Zkušební funkce, rozhoduje
 * server). VYP + jeden zákazník = každá kreslicí funkce vrací '' — obrazovka
 * je znak po znaku jako dřív (overit_vz_zadani.mjs). VYP + zakázka, která
 * další zákazníky UŽ MÁ: přepínač a karta jen ke čtení s větou VZ_VYPNUTO,
 * v hlavičce vždy řídící zákazník, každý zápis odmítnut (R21; server totéž).
 *
 * ZAP + jeden zákazník: navíc jen tlačítko „Přidat zákazníka" vedle popisku
 * Zákazník (jen kdo smí zakázku měnit, ne u prodané zakázky, ne v režimu jen
 * ke čtení). Tlačítko stojí ZA popiskem, ne v něm — po jeho odebrání je řádek
 * znak po znaku jako dřív (a klik na popisek ho nespouští).
 *
 * 2+ ZÁKAZNÍKŮ: přepínač zákazníků nad polem Zákazník, karta „Zákazníci
 * zakázky" pod hlavičkou (Kalkulace OCK) a v Přehledu cenových nabídek.
 * Pole Zákazník, Kontaktní osoba a IČO, ARES i databáze zákazníků pracují
 * s OTEVŘENÝM zákazníkem (VZ_UI.otevreny). Čtení a zápis jdou přes jedno
 * místo — vzCesta() mění cestu `ZAK.objednatel` na položku dalšího zákazníka
 * (`ZAK.dalsiZakaznici.<i>.hlavicka.objednatel`), takže set(), Zpět / Znovu
 * a neuložené změny fungují beze změny (vzor vsSyncZ).
 *
 * Co tu NENÍ (další etapy): čísla s písmenem a tisk pro zákazníka (E2),
 * zámek po zákaznících a odstranění zákazníka s odeslanou nabídkou (E3),
 * změna řídícího a Prodáno (E4), Pipedrive (E5), rejstřík (E6).
 * Jména: jeden <script> — vše s předponou vz / VZ_.
 * ============================================================ */

const VZ_UI = {
  otevreny: '',      // id otevřeného zákazníka ('' = řídící)
  form: null,        // { kde, h: {5 polí}, zastupci, nova: 'stejna'|'vlastni', zdroj }
  odstranit: null,   // { id, smazat: true|false } — potvrzení na stránce
  zak: null,         // zakázka, ke které stav patří
};
const VZ_FORM_KDE = 'vzNovy';   // „kde" formuláře pro ARES a našeptávač

function vzZap() {
  try { return typeof viceZakaznikuZapnuto === 'function' && viceZakaznikuZapnuto(); } catch (e) { return false; }
}
function vzZakUI() { return (typeof ZAK !== 'undefined' && ZAK) ? ZAK : null; }
function vzRezimUI() { const z = vzZakUI(); return !!z && typeof vzRezim === 'function' && vzRezim(z); }
function vzProdanaUI() {
  const z = vzZakUI();
  return !!z && Array.isArray(z.varianty) && typeof variantaProdana === 'function' && z.varianty.some(v => v && variantaProdana(v));
}
/* Smí uživatel zákazníky měnit? (zapnuto, ne jen ke čtení, ne náhled, ne prodaná) */
function vzSmiMenit() {
  if (!vzZap()) return false;
  if (typeof zamekCteniJe === 'function' && zamekCteniJe()) return false;
  if (typeof nahledAktivni === 'function' && nahledAktivni()) return false;
  return !vzProdanaUI();
}
function vzProcNe() {
  if (!vzZap()) return typeof VZ_VYPNUTO === 'string' ? VZ_VYPNUTO : 'Funkce víc zákazníků je vypnutá.';
  if (typeof zamekCteniJe === 'function' && zamekCteniJe()) return 'Zakázka je otevřená jen ke čtení — nejdřív ji odemkněte.';
  if (typeof nahledAktivni === 'function' && nahledAktivni()) return 'V náhledu za jiného uživatele se nic nezapisuje.';
  if (vzProdanaUI()) return 'Zakázka je prodaná — zákazníky teď nejde měnit (odemknout prodej smí vedoucí nebo administrátor).';
  return '';
}

/* Zápis zastaven? Vrací true a řekne proč (vzor vsStop). */
function vzStop(popis) {
  if (typeof nahledStop === 'function' && nahledStop(popis)) return true;
  if (typeof zamekCteniStop === 'function' && zamekCteniStop()) return true;
  const proc = vzProcNe();
  if (proc) { if (typeof hlaska === 'function') hlaska(proc); render(); return true; }
  return false;
}

/* ---------- otevřený zákazník (jedno místo pro čtení a zápis) ---------- */

/* Id otevřeného zákazníka. S vypnutou funkcí nebo jedním zákazníkem vždy
 * řídící; neexistující id (Zpět, odstranění) → řídící. */
function vzOtevrenyId() {
  const z = vzZakUI();
  if (!z) return '';
  const rid = vzRidiciId(z);
  if (VZ_UI.zak !== z) { VZ_UI.zak = z; VZ_UI.otevreny = ''; VZ_UI.odstranit = null; }   // jiná zakázka (načtení, Zpět)
  if (!vzRezimUI() || !vzZap()) return rid;
  const id = VZ_UI.otevreny;
  if (id && id !== rid && vzDalsi(z).some(d => String(d.id) === id)) return id;
  return rid;
}
/* Index otevřeného dalšího zákazníka v ZAK.dalsiZakaznici (-1 = řídící). */
function vzOtevrenyIndex() {
  const z = vzZakUI();
  const id = vzOtevrenyId();
  if (!z || !Array.isArray(z.dalsiZakaznici) || id === vzRidiciId(z)) return -1;
  return z.dalsiZakaznici.findIndex(d => vzObj(d) && String(d.id) === id);
}
function vzOtevrenyDalsi() {
  const i = vzOtevrenyIndex();
  if (i < 0) return null;
  const d = ZAK.dalsiZakaznici[i];
  if (!vzObj(d.hlavicka)) d.hlavicka = vzHlavickaZ(d.hlavicka);
  if (!vzObj(d.zastupci)) d.zastupci = vzZastupciZ(d.zastupci);
  return d;
}
/* Cesta pole hlavičky: u řídícího beze změny, u otevřeného dalšího
 * zákazníka do jeho položky. Jen pole firmy (VZ_HLAVICKA_POLE). */
function vzCesta(cesta) {
  const m = /^ZAK\.([A-Za-z]+)$/.exec(String(cesta));
  if (!m || VZ_HLAVICKA_POLE.indexOf(m[1]) < 0) return cesta;
  const i = vzOtevrenyIndex();
  if (i < 0) return cesta;
  vzOtevrenyDalsi();   // zajistí tvar položky
  return 'ZAK.dalsiZakaznici.' + i + '.hlavicka.' + m[1];
}

/* Objekt se stejnými klíči jako hlavička zakázky nad položkou dalšího
 * zákazníka (pro zakaznikPredvypln / zakaznikDoZakazky / zakaznikZeZakazky):
 * zápis jde rovnou do položky, `zakaznikId` se zahodí (klíč navíc v datech). */
function vzZakaznikProxy(d) {
  const o = {};
  VZ_HLAVICKA_POLE.forEach(k => Object.defineProperty(o, k, {
    enumerable: true, get() { return d.hlavicka[k]; }, set(v) { d.hlavicka[k] = vzText(v).slice(0, VZ_TEXT_MAX); },
  }));
  Object.defineProperty(o, 'zastupci', {
    enumerable: true, get() { return d.zastupci; },
    set(v) { d.zastupci = vzZastupciZ(v); },
  });
  Object.defineProperty(o, 'zakaznikId', { enumerable: false, get() { return ''; }, set() {} });
  return o;
}

/* ---------- cíle pro ARES a databázi zákazníků ---------- */

function vzNazevZ(z) { return (z && z.hlavicka && String(z.hlavicka.objednatel || '').trim()) || '(bez názvu)'; }
function vzKdo() { return (typeof NAST !== 'undefined' && NAST && NAST.uzivatel) || ''; }

/* ARES (ares_ui.js aresCil): formulář nového zákazníka a otevřený další
 * zákazník v hlavičce. Řídící zákazník = null (hlavička jako dřív). */
function vzAresCil(kde) {
  if (kde === VZ_FORM_KDE) {
    const f = VZ_UI.form;
    if (!f) return { hlavicka: vzHlavickaZ(null), zmrazeno: '' };
    return {
      hlavicka: f.h,
      ted: 'Ve formuláři teď',
      prepsat: 'Převzít údaje do formuláře',
      uzObsahuje: 'Formulář už tyhle údaje obsahuje – přepisovat není co.',
      zdroj: 'Údaje se převezmou jen na tomhle potvrzení.',
      zmrazeno: '',
      poPrepisu: (n) => { if (n) f.zdroj = 'ARES'; },
    };
  }
  if (kde !== 'ock' && kde !== 'proj') return null;
  const d = vzOtevrenyDalsi();
  if (!d) return null;
  return {
    hlavicka: d.hlavicka,
    zmrazeno: '',   // zmrazení údajů dalšího zákazníka zavádí E3/E4
    poPrepisu: (n) => {
      if (!n) return;
      aktivniVarianta(ZAK).upraveno = new Date().toISOString();
      if (typeof protokolZapis === 'function')
        protokolZapis(ZAK, { co: 'Údaje dalšího zákazníka převzaty z ARES (' + n + ')', kde: 'zákazníci zakázky', kdo: vzKdo(), po: vzNazevZ(d) });
    },
  };
}

/* Databáze zákazníků a našeptávač (zakaznici_ui.js zakazniciCil). */
function vzZakaznikCil(kde) {
  if (kde === VZ_FORM_KDE) {
    const f = VZ_UI.form;
    if (!f) return null;
    const d = { hlavicka: f.h, zastupci: f.zastupci };
    return {
      zak: vzZakaznikProxy(d),
      formular: true,
      set: (k, v) => { if (VZ_HLAVICKA_POLE.indexOf(k) >= 0) f.h[k] = vzText(v).slice(0, VZ_TEXT_MAX); render(); },
      zmrazeno: () => '',
      poPrevzeti: (n) => {
        f.zastupci = d.zastupci;
        f.zdroj = 'databáze zákazníků';
        if (typeof ZAK_DB !== 'undefined') ZAK_DB.hlaska = '';
        if (typeof prepniTab === 'function') prepniTab(f.kde === 'proj' ? 'proj' : 'kalk');
        render();
      },
    };
  }
  if (kde !== 'ock' && kde !== 'proj') return null;
  const d = vzOtevrenyDalsi();
  if (!d) return null;
  return {
    zak: vzZakaznikProxy(d),
    set: (k, v) => set(vzCesta('ZAK.' + k), v),
    zmrazeno: () => '',
    poPrevzeti: (n) => {
      aktivniVarianta(ZAK).upraveno = new Date().toISOString();
      if (typeof ZAK_DB !== 'undefined')
        ZAK_DB.hlaska = n ? 'K zákazníkovi ' + vzNazevZ(d) + ' se přeneslo ' + n + ' údajů. Cokoli tam přepíšete, se do karty samo nevrátí.'
          : 'U zákazníka ' + vzNazevZ(d) + ' už bylo všechno stejné — nic se nezměnilo.';
      render();
    },
  };
}
/* Karta zákazníka: s otevřeným formulářem navíc „Přenést do formuláře…". */
function vzZakaznikKartaTlacitka(klic) {
  if (!VZ_UI.form) return '';
  return `<button class="primary" id="vzKartaDoFormulare" onclick="zakaznikDoZakazkyUI('${escJs(klic)}','${VZ_FORM_KDE}')">Přenést do formuláře nového zákazníka</button>
      `;
}
function vzZakaznikKartaPopis() {
  const d = vzOtevrenyDalsi();
  return d ? 'Přenést k zákazníkovi ' + vzNazevZ(d) : 'Přenést do otevřené zakázky';
}

/* ---------- hlavička ---------- */

/* Tlačítko vedle popisku Zákazník (jen ZAP + jeden zákazník + smí měnit). */
function vzPridatTlacitko(kde) {
  if (!vzZakUI() || vzRezimUI() || !vzSmiMenit()) return '';
  const otevreno = !!(VZ_UI.form && VZ_UI.form.kde === kde);
  return `<button type="button" class="mini noprint vz-pridat" id="vzPridat_${kde}" onclick="vzFormOtevri('${kde}')"${otevreno ? ' disabled' : ''}
      title="Přidat dalšího zákazníka, který poptal tutéž zakázku">Přidat zákazníka</button>`;
}

/* Přepínač zákazníků nad polem Zákazník (jen 2+ zákazníků). */
function vzPrepinacRadek(kde) {
  if (!vzRezimUI()) return '';
  const l = vzZakaznici(ZAK);
  const ot = vzOtevrenyId();
  const zap = vzZap();
  const smi = vzSmiMenit();
  const chips = l.map(z => `<button type="button" class="vz-chip${z.id === ot ? ' on' : ''}" onclick="vzOtevri('${escJs(z.id)}')"${zap ? '' : ' disabled'}
      title="${esc(vzNazevZ(z) + (z.ridici ? ' — řídící zákazník' : ' — písmeno ' + z.pismeno))}">${z.ridici ? '★ ' : ''}${esc(vzNazevZ(z))}${z.pismeno ? ' · -' + esc(z.pismeno) : ''}</button>`).join('');
  const plus = zap ? `<button type="button" class="vz-chip vz-chip-plus" onclick="vzFormOtevri('${kde}')"${smi && l.length <= VZ_DALSI_MAX ? '' : ' disabled'}
      title="${esc(smi ? 'Přidat dalšího zákazníka' : vzProcNe())}">+</button>` : '';
  return `<div class="row noprint vz-prepinac-radek"><label>Zákazníci (${l.length})</label><span class="vz-chips" id="vzPrepinac_${kde}">${chips}${plus}</span></div>`;
}

/* Formulář „Nový zákazník na zakázce" (přes celou šířku karty hlavičky). */
function vzFormularBlok(kde) {
  const f = VZ_UI.form;
  if (!f || f.kde !== kde || !vzZakUI()) return '';
  const k = VZ_FORM_KDE;
  const pole = (klic, popis, navic) => `<div class="row"><label for="vzF_${klic}">${popis}</label><input type="text" id="vzF_${klic}" autocomplete="off"
      maxlength="${VZ_TEXT_MAX}" value="${esc(f.h[klic])}"${navic || ''} onchange="vzFormPole('${klic}', this.value)"></div>`;
  const zakaznik = `<div class="row"><label for="vzF_objednatel">Zákazník</label><span class="nasept-wrap" style="flex:1"><input type="text" id="vzF_objednatel"
      style="width:100%" autocomplete="off" maxlength="${VZ_TEXT_MAX}" value="${esc(f.h.objednatel)}" placeholder="název firmy — nebo ho doplňte z ARES / z databáze"
      onchange="naseptavacZakVyber(this.value,'${k}')" oninput="vzFormPsani(this.value); naseptavacZakKresli('${k}', this.value)"
      onfocus="if(typeof zakazniciNactiProNaseptavac==='function')zakazniciNactiProNaseptavac(); naseptavacZakKresli('${k}', this.value)"
      onblur="naseptavacZakSchovej('${k}')" onkeydown="if(event.key==='Escape')naseptavacZakSchovej('${k}')">
    <span class="nasept-box" id="naseptBoxZak_${k}" style="display:none"></span></span></div>`;
  const zakMozne = typeof zakazniciMozne === 'function' && zakazniciMozne();
  const dbBtn = `<button type="button" class="mini noprint" id="vzFormDb"${zakMozne ? '' : ' disabled'} onclick="vzFormDatabaze()"
      title="${esc('vybrat zákazníka z databáze zákazníků (doplní všechna pole)' + (zakMozne ? '' : ' — nejdřív se přihlaste k databázi (Nastavení → Databáze)'))}">Vybrat z databáze zákazníků</button>`;
  const ares = typeof aresRadek === 'function' ? aresRadek(k, false, dbBtn) : dbBtn;
  const pis = vzPismenoDalsi(ZAK);
  const rid = ridiciVarianta(ZAK);
  const ridNazev = vzNazevZ(vzZakaznici(ZAK)[0]);
  const hotovo = String(f.h.objednatel || '').trim() !== '';
  return `<div class="vz-blok noprint" id="vzFormular"><div class="vz-form"><b>Nový zákazník na zakázce</b>
    <div class="vz-form-pole"><div>${zakaznik}${pole('adresaObjednatele', 'Sídlo zákazníka')}${pole('kontakt', 'Kontaktní osoba')}</div>
      <div>${pole('ico', 'IČO zákazníka', ' placeholder="8 číslic" inputmode="numeric"')}${pole('dic', 'DIČ zákazníka')}${ares}</div></div>
    <div class="row vz-form-nab"><label>Nabídka</label><span class="vz-volba">
      <label><input type="radio" name="vzFormNova" value="stejna"${f.nova === 'stejna' ? ' checked' : ''} onchange="vzFormNova('stejna')"> stejná varianta jako ${esc(ridNazev)} („${esc(rid.nazev)}")</label>
      <label><input type="radio" name="vzFormNova" value="vlastni"${f.nova === 'vlastni' ? ' checked' : ''} onchange="vzFormNova('vlastni')"> vlastní varianta (kopie)</label></span></div>
    <div class="note">Zákazník dostane písmeno <b>${esc(pis)}</b> — jeho nabídky ponesou číslo …-${esc(pis)} (čísla s písmenem zavede další etapa).${f.zdroj ? ' Údaje: ' + esc(f.zdroj) + '.' : ''}</div>
    <div class="vz-form-tl"><button type="button" class="vz-modre" id="vzFormPridej" onclick="vzFormPridej()"${hotovo ? '' : ' disabled title="nejdřív vyplňte zákazníka — ručně, z ARES nebo z databáze"'}>Přidat zákazníka</button>
      <button type="button" class="mini" id="vzFormZrus" onclick="vzFormZavri()">Zrušit</button></div></div></div>`;
}

/* ---------- karta „Zákazníci zakázky" ---------- */

function vzVarianta(id) { return (ZAK.varianty || []).find(v => v && String(v.id) === String(id)) || null; }
function vzCenaVarianty(v) {
  if (!v || typeof spocitejVariantu !== 'function') return null;
  try { const c = spocitejVariantu(v); return c.ock ? c.ock.souhrn.zakladCena : null; } catch (e) { return null; }
}
/* Odešla zákazníkovi nabídka? (razítko tisku s jeho id — E3 — nebo jeho
 * vlastní varianta je zamčená). Bezpečnější výklad do E3: takového
 * zákazníka E1 odstranit nedovolí. */
function vzOdeslano(z) {
  if (!z) return false;
  if (vzRazitkaZakazniku(ZAK).some(r => r && String(r.id) === z.id)) return true;
  const v = vzVarianta(z.varianta);
  return !z.ridici && !!v && typeof variantaUzamcena === 'function' && variantaUzamcena(v) && vzVariantaJenJeho(ZAK, z.id, z.varianta);
}
function vzSdileni(z, l) {
  const s = l.filter(x => x.varianta === z.varianta);
  return s.length > 1 ? 'sdílená: ' + s.map(vzNazevZ).join(' + ') : 'vlastní varianta';
}
function vzStavText(z) {
  const v = vzVarianta(z.varianta);
  if (!v) return 'varianta chybí';
  if (typeof variantaProdana === 'function' && variantaProdana(v)) return 'prodáno';
  if (typeof variantaUzamcena === 'function' && variantaUzamcena(v)) return 'varianta zamčená (odeslaná)';
  return 'rozpracovaná';
}

function vzOdstranitDuvod(z) {
  if (z.ridici) return 'Řídícího zákazníka nejde odstranit, dokud se řídícím nestane jiný.';
  const v = vzVarianta(z.varianta);
  if (v && v.prodano && typeof v.prodano === 'object' && String(v.prodano.zakaznik || '') === z.id)
    return 'Zákazníkovi se prodalo — nejdřív odemknout prodej (vedoucí, administrátor).';
  if (vzOdeslano(z)) return 'Zákazníkovi už odešla nabídka — odstranění takového zákazníka zavede další etapa (jen administrátor).';
  return '';
}

function vzPotvrzeniHtml(l) {
  const p = VZ_UI.odstranit;
  if (!p) return '';
  const z = l.find(x => x.id === p.id);
  if (!z) return '';
  const v = vzVarianta(z.varianta);
  const jenJeho = !!v && vzVariantaJenJeho(ZAK, z.id, z.varianta);
  const zamcena = !!v && typeof variantaUzamcena === 'function' && variantaUzamcena(v);
  const ostatni = l.filter(x => x.id !== z.id && x.varianta === z.varianta).map(vzNazevZ);
  const r = (n, h) => `<div class="vz-pr"><span>${esc(n)}</span><span>${h}</span></div>`;
  const varianta = !v ? 'chybí — nic se nemaže'
    : !jenJeho ? 'zůstává beze změny' + (ostatni.length ? ' — používá ji ' + esc(ostatni.join(', ')) : '')
      : zamcena ? '<b>zůstává v zakázce zamčená</b> jako doklad'
        : `<span class="vz-volba"><label><input type="radio" name="vzOdstranVar" value="smazat"${p.smazat ? ' checked' : ''} onchange="VZ_UI.odstranit.smazat=true"> smazat i jeho rozpracovanou variantu „${esc(v.nazev)}" (nikomu neodešla)</label>
          <label><input type="radio" name="vzOdstranVar" value="ponechat"${p.smazat ? '' : ' checked'} onchange="VZ_UI.odstranit.smazat=false"> ponechat ji v zakázce jako běžnou variantu</label></span>`;
  const zbyde = l.length - 1;
  return `<div class="vz-potvrzeni" id="vzOdstranPotvrzeni"><b>Odstranit zákazníka ${esc(vzNazevZ(z))} ze zakázky?</b>
    ${r('Jeho nabídka', 'rozpracovaná, neodeslaná → <b>zanikne</b>')}
    ${r('Varianta „' + (v ? v.nazev : '?') + '"', varianta)}
    ${r('Písmeno -' + z.pismeno, 'uvolní se — nic s ním neodešlo')}
    ${r('Vzhled aplikace', zbyde > 1 ? 'beze změny (zůstávají ' + zbyde + ' zákazníci)'
      : '<s>přepínač zákazníků a karta Zákazníci zakázky</s> → <b>standardní kalkulace</b>, jen tlačítko „Přidat zákazníka"')}
    <div class="vz-pt"><button type="button" class="vz-cervene" id="vzOdstranAno" onclick="vzOdstranitPotvrd(true)">Odstranit zákazníka</button>
      <button type="button" class="mini" id="vzOdstranNe" onclick="vzOdstranitPotvrd(false)">Zrušit</button>
      <span>Údaje zákazníka (název, IČO, kontakt) se ze zakázky smažou; jeho karta v databázi zákazníků zůstává. Omyl vrátí tlačítko Zpět.</span></div></div>`;
}

/* Karta pod hlavičkou (kde = 'ock') a v Přehledu (kde = 'zakazka'). */
function vzKarta(kde) {
  if (!vzRezimUI()) return '';
  const l = vzZakaznici(ZAK);
  const zap = vzZap();
  const smi = vzSmiMenit();
  const ot = vzOtevrenyId();
  const dis = (b, t) => b ? '' : ` disabled title="${esc(t)}"`;
  const radky = l.map(z => {
    const v = vzVarianta(z.varianta);
    const cena = vzCenaVarianty(v);
    const volby = (ZAK.varianty || []).map(x => `<option value="${esc(x.id)}"${String(x.id) === z.varianta ? ' selected' : ''}>${esc(x.nazev)}</option>`).join('');
    const proVar = !smi ? vzProcNe() : (z.ridici ? 'řídící variantu mění „nastavit jako řídící" (u prodané zakázky ne)' : '');
    const odstrDuvod = vzOdstranitDuvod(z);
    const tl = [
      `<button type="button" class="mini" onclick="vzNahled('${escJs(z.id)}')"${dis(zap, typeof VZ_VYPNUTO === 'string' ? VZ_VYPNUTO : '')} title="otevřít zákazníka a kartu Cenová nabídka">Náhled</button>`,
      `<button type="button" class="mini" disabled title="Tisk pro zákazníka zavede další etapa (E2).">Tisk CN</button>`,
      `<button type="button" class="mini" onclick="vzVlastniVarianta('${escJs(z.id)}')"${dis(smi && !z.ridici, !smi ? vzProcNe() : 'Řídící zákazník: novou variantu založte „+ Nová varianta" a nastavte ji jako řídící.')}>Vlastní varianta</button>`,
      `<button type="button" class="mini" disabled title="Prodáno u zákazníka zavede další etapa (E4).">Prodáno</button>`,
      `<button type="button" class="mini" onclick="vzOdstranit('${escJs(z.id)}')"${dis(smi && !odstrDuvod, odstrDuvod || vzProcNe())}>Odstranit</button>`,
    ].join(' ');
    return `<tr class="${z.id === ot ? 'aktivni' : ''}" data-vz="${esc(z.id)}">
      <td data-l="Řídící"><input type="radio" name="vzRidici_${kde}"${z.ridici ? ' checked' : ''} disabled title="Změnu řídícího zákazníka zavede další etapa (E4)."></td>
      <td data-l="Zákazník"><button type="button" class="vz-jmeno" onclick="vzOtevri('${escJs(z.id)}')"${zap ? '' : ' disabled'} title="otevřít zákazníka v hlavičce">${esc(vzNazevZ(z))}</button>
        <div class="note">${z.hlavicka.ico ? 'IČO ' + esc(z.hlavicka.ico) : 'bez IČO'}${z.ridici ? ' · <b>řídící zákazník</b>' : ' · písmeno ' + esc(z.pismeno)}${z.id === ot ? ' · otevřený v hlavičce' : ''}</div></td>
      <td data-l="Číslo nabídky" class="vz-cislo">${v ? esc(variantaCislo(ZAK, v)) : '—'}</td>
      <td data-l="Varianta nabídky"><select onchange="vzVariantaSet('${escJs(z.id)}', this.value)"${dis(smi && !z.ridici, proVar)}>${volby}${v ? '' : '<option selected value="">— chybí —</option>'}</select>
        <div class="note">${esc(vzSdileni(z, l))}</div></td>
      <td data-l="Stav">${esc(vzStavText(z))}</td>
      <td data-l="Cena bez DPH" class="vz-cena">${cena == null ? '—' : fmt0(cena)}</td></tr>
      <tr class="vz-akce-r${z.id === ot ? ' aktivni' : ''}"><td></td><td colspan="5" class="vz-akce">${tl}</td></tr>`;
  }).join('');
  const vyp = zap ? '' : `<div class="seznam-varovani" id="vzVypnuto_${kde}" style="margin:0 0 8px">funkce je vypnutá — ${esc(typeof VZ_VYPNUTO === 'string' ? VZ_VYPNUTO : '')}</div>`;
  const inner = `${vyp}<div class="note" style="margin-bottom:8px">Jednu zakázku může poptat víc zákazníků. Každý má <b>svou nabídku</b> — buď sdílí
      variantu s jiným zákazníkem, nebo má vlastní. <b>Řídící zákazník</b> je v hlavičce zakázky a jen jeho data nese deal v Pipedrive.</div>
    <div class="vz-tab"><table><thead><tr><th>Řídící</th><th>Zákazník</th><th>Číslo nabídky</th><th>Varianta nabídky</th><th>Stav</th><th>Cena bez DPH</th></tr></thead>
      <tbody>${radky}</tbody></table></div>
    ${kde === 'ock' ? vzPotvrzeniHtml(l) : ''}
    ${zap ? `<div class="vz-pod"><button type="button" class="vz-modre" onclick="vzFormOtevri('ock')"${dis(smi && l.length <= VZ_DALSI_MAX, smi ? 'Zakázka má nejvýš ' + (VZ_DALSI_MAX + 1) + ' zákazníků.' : vzProcNe())}>Přidat zákazníka</button></div>` : ''}`;
  return `<div class="card vz-karta" id="vzKarta_${kde}"><h2><span style="flex:1">Zákazníci zakázky <span class="pill">zkušební funkce</span></span></h2><div class="body">${inner}</div></div>`;
}

/* Sloupec Zákazník v „Kalkulace v zakázce" (seznam_ui.js): u 2+ zákazníků
 * odvozený (kdo na variantu ukazuje) a jen ke čtení. '' = dnešní pole. */
function vzSeznamZakaznik(v) {
  if (!vzRezimUI() || !v) return '';
  const kdo = vzZakaznici(ZAK).filter(z => z.varianta === String(v.id)).map(vzNazevZ);
  const t = kdo.length ? kdo.join(', ') : '—';
  return `<td><input type="text" value="${esc(t)}" readonly class="vz-odvozeno" title="Zákazníky varianty určuje karta Zákazníci zakázky (víc zákazníků)."></td>`;
}

/* ---------- obsluha ---------- */

function vzOtevri(id) {
  if (!vzZap() || !vzRezimUI()) return;
  const z = vzZakaznik(ZAK, id);
  if (!z) return;
  VZ_UI.otevreny = z.ridici ? '' : z.id;
  if (typeof ARES !== 'undefined' && (ARES.kde === 'ock' || ARES.kde === 'proj')) { ARES.kde = ''; ARES.subjekt = null; ARES.chyba = ''; }
  /* Otevření zákazníka otevře jeho variantu. */
  if (vzVarianta(z.varianta) && String(ZAK.aktivni) !== z.varianta) { ZAK.aktivni = z.varianta; syncVarianta(); }
  render();
}

function vzNahled(id) {
  vzOtevri(id);
  if (typeof prepniTab === 'function' && typeof TAB !== 'undefined' && TAB !== 'kalk') prepniTab('kalk');
  setTimeout(() => {
    const el = document.getElementById('ock-nabidka') || document.getElementById('kalk-nabidka');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function vzFormOtevri(kde) {
  if (vzStop('přidání zákazníka')) return;
  if (vzRezimUI() && vzDalsi(ZAK).length >= VZ_DALSI_MAX) {
    if (typeof hlaska === 'function') hlaska('Zakázka má nejvýš ' + (VZ_DALSI_MAX + 1) + ' zákazníků.');
    return;
  }
  const k = kde === 'proj' ? 'proj' : 'ock';
  if (!VZ_UI.form || VZ_UI.form.kde !== k)
    VZ_UI.form = { kde: k, h: vzHlavickaZ(null), zastupci: vzZastupciPrazdni(), nova: 'stejna', zdroj: '' };
  VZ_UI.odstranit = null;
  render();
  setTimeout(() => {
    const el = document.getElementById('vzF_objednatel');
    if (el) { if (el.scrollIntoView) el.scrollIntoView({ block: 'center' }); el.focus(); }
  }, 0);
}
function vzFormZavri() {
  VZ_UI.form = null;
  if (typeof ARES !== 'undefined' && ARES.kde === VZ_FORM_KDE) { ARES.kde = ''; ARES.subjekt = null; ARES.chyba = ''; }
  render();
}
function vzFormPole(k, v) {
  const f = VZ_UI.form;
  if (!f || VZ_HLAVICKA_POLE.indexOf(k) < 0) return;
  f.h[k] = vzText(v).slice(0, VZ_TEXT_MAX);
  render();
}
/* Při psaní názvu se jen rozsvítí „Přidat zákazníka" (bez překreslení —
 * kurzor zůstává v poli). */
function vzFormPsani(v) {
  const f = VZ_UI.form;
  if (!f) return;
  f.h.objednatel = vzText(v).slice(0, VZ_TEXT_MAX);
  const b = document.getElementById('vzFormPridej');
  if (b) { const ok = f.h.objednatel.trim() !== ''; b.disabled = !ok; if (ok) b.removeAttribute('title'); }
}
function vzFormNova(v) { if (VZ_UI.form) VZ_UI.form.nova = v === 'vlastni' ? 'vlastni' : 'stejna'; }
function vzFormDatabaze() {
  if (!VZ_UI.form) return;
  if (typeof ZAK_DB !== 'undefined')
    ZAK_DB.hlaska = 'Vyberte zákazníka a v jeho kartě dejte „Přenést do formuláře nového zákazníka".';
  if (typeof prepniTab === 'function') prepniTab('zakaznici');
}

function vzFormPridej() {
  const f = VZ_UI.form;
  if (!f) return;
  if (vzStop('přidání zákazníka')) return;
  if (!String(f.h.objednatel || '').trim()) {
    if (typeof hlaska === 'function') hlaska('Vyplňte název zákazníka — ručně, z ARES nebo z databáze zákazníků.');
    return;
  }
  const vlastni = f.nova === 'vlastni';
  const r = vzPridej(ZAK, Object.assign({}, f.h, { zastupci: f.zastupci }), { vlastni, kdo: vzKdo() });
  if (!r.ok) { if (typeof hlaska === 'function') hlaska(r.chyba); render(); return; }
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  if (typeof protokolZapis === 'function')
    protokolZapis(ZAK, { co: 'Přidán zákazník (' + (f.zdroj || 'ručně') + ')' + (vlastni ? ' s vlastní variantou' : ''),
      kde: 'zákazníci zakázky', kdo: vzKdo(), po: String(f.h.objednatel).trim() });
  VZ_UI.form = null;
  if (typeof ARES !== 'undefined' && ARES.kde === VZ_FORM_KDE) { ARES.kde = ''; ARES.subjekt = null; ARES.chyba = ''; }
  /* Nový zákazník zůstává zavřený — v hlavičce je dál řídící (stejný pohled
   * jako před přidáním); otevře se v přepínači nebo v kartě. */
  syncVarianta();
  render();
}

function vzVariantaSet(id, varId) {
  if (vzStop('změna varianty zákazníka')) return;
  const z = vzZakaznik(ZAK, id);
  if (!z || z.ridici || !vzVarianta(varId)) { render(); return; }
  const d = ZAK.dalsiZakaznici.find(x => vzObj(x) && String(x.id) === z.id);
  if (!d) return;
  d.varianta = String(varId);
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  if (vzOtevrenyId() === z.id) { ZAK.aktivni = d.varianta; syncVarianta(); }
  render();
}

function vzVlastniVarianta(id) {
  if (vzStop('vlastní varianta zákazníka')) return;
  const z = vzZakaznik(ZAK, id);
  if (!z || z.ridici) return;
  const d = ZAK.dalsiZakaznici.find(x => vzObj(x) && String(x.id) === z.id);
  const zdroj = vzVarianta(z.varianta) ? z.varianta : vzRidiciVariantaId(ZAK);
  const kopie = typeof klonujVariantu === 'function' ? klonujVariantu(ZAK, zdroj, { aktivovat: false }) : null;
  if (!d || !kopie) { if (typeof hlaska === 'function') hlaska('Vlastní variantu se nepodařilo založit.'); return; }
  d.varianta = String(kopie.id);
  if (typeof protokolZapis === 'function')
    protokolZapis(ZAK, { co: 'Vlastní varianta pro dalšího zákazníka', kde: 'zákazníci zakázky', kdo: vzKdo(), po: vzNazevZ(z) + ' — ' + kopie.nazev });
  VZ_UI.otevreny = z.id;
  ZAK.aktivni = d.varianta;
  syncVarianta();
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  render();
}

function vzOdstranit(id) {
  if (vzStop('odstranění zákazníka')) return;
  const z = vzZakaznik(ZAK, id);
  if (!z) return;
  const duvod = vzOdstranitDuvod(z);
  if (duvod) { if (typeof hlaska === 'function') hlaska(duvod); return; }
  VZ_UI.odstranit = { id: z.id, smazat: true };
  VZ_UI.form = null;
  if (typeof prepniTab === 'function' && typeof TAB !== 'undefined' && TAB !== 'kalk') prepniTab('kalk');
  render();
  setTimeout(() => {
    const el = document.getElementById('vzOdstranPotvrzeni');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  }, 0);
}

function vzOdstranitPotvrd(ano) {
  const p = VZ_UI.odstranit;
  VZ_UI.odstranit = null;
  if (!ano || !p) { render(); return; }
  if (vzStop('odstranění zákazníka')) return;
  const z = vzZakaznik(ZAK, p.id);
  if (!z) { render(); return; }
  const duvod = vzOdstranitDuvod(z);
  if (duvod) { if (typeof hlaska === 'function') hlaska(duvod); render(); return; }
  const nazev = vzNazevZ(z);
  const r = vzOdstran(ZAK, z.id, { smazatVariantu: !!p.smazat });
  if (!r.ok) { if (typeof hlaska === 'function') hlaska(r.chyba); render(); return; }
  if (VZ_UI.otevreny === z.id) VZ_UI.otevreny = '';
  /* Otevřená varianta zůstává; po smazání jeho varianty (nebo když byla
   * otevřená jeho) se otevře řídící. */
  if (!vzVarianta(ZAK.aktivni)) ZAK.aktivni = vzRidiciVariantaId(ZAK);
  if (!vzRezimUI()) ZAK.aktivni = vzRidiciVariantaId(ZAK);
  syncVarianta();
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  if (typeof protokolZapis === 'function')
    protokolZapis(ZAK, { co: 'Odstraněn zákazník' + (r.smazanaVarianta ? ' i s jeho rozpracovanou variantou' : ''),
      kde: 'zákazníci zakázky', kdo: vzKdo(), pred: nazev });
  render();
}

/* Otevření zakázky s daty víc zákazníků (online_ui.js): vypínač se ze
 * serveru čte jen u takové zakázky; s VYP lišta (R21). */
function vzPoOtevreni(zak) {
  VZ_UI.otevreny = ''; VZ_UI.form = null; VZ_UI.odstranit = null;
  if (!zak || typeof vzMaData !== 'function' || !vzMaData(zak) || typeof onlineNactiFunkce !== 'function') return;
  onlineNactiFunkce().then(() => {
    if (ZAK !== zak) return;
    if (!vzZap() && typeof onlineZprava === 'function') onlineZprava(VZ_VYPNUTO, 'varovani');
    render();
  });
}
