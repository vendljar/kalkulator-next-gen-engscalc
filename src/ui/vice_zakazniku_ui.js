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
 * E3 (#602): stav nabídky v kartě („odeslána D. M. RRRR" / „rozpracovaná
 * (platí … z D. M.)"), odstranění zákazníka s odeslanou nabídkou jen
 * administrátorem (vzOdstranDuvod; potvrzení podle prototypu v3_3), zmrazené
 * údaje otevřeného dalšího zákazníka po odeslání (vzZakaznikPoleZmrazeno —
 * pole jen ke čtení, set / ARES / databáze odmítnuty) a číslo dokladu
 * z razítka (vzCisloDokladu) v seznamu variant a liště zámku.
 *
 * E4 (#603): řídícího zákazníka mění autor zakázky a administrátor (u prodané
 * zakázky zamčeno — vzRidiciZamceno); od T1 jen v hlavičce (níže), karta
 * ukazuje ★/☆. Prodáno u zákazníka s potvrzením na
 * stránce před → po (vzProdej v jednom uložení; po uložení háček
 * vzPoProdeji → zápis organizace vítěze E5b).
 * Co tu NENÍ (další etapy): rejstřík (E6).
 * Jména: jeden <script> — vše s předponou vz / VZ_.
 * ============================================================ */

const VZ_UI = {
  otevreny: '',      // id otevřeného zákazníka ('' = řídící)
  form: null,        // { kde, h: {5 polí}, zastupci, nova: 'stejna'|'vlastni', zdroj }
  odstranit: null,   // { id, smazat: true|false } — potvrzení na stránce
  prodej: null,      // E4: { id, varianta } — potvrzení prodeje u zákazníka na stránce
  zak: null,         // zakázka, ke které stav patří
  org: null,         // E5b: { zak, bezi, chyba, kod } — běžící / odmítnutý zápis organizace vítěze
  t1: null,          // T1: { zak, varianta, chyba } — zvolená sdílená řídící varianta, řídící zákazník zatím nevybrán
};
const VZ_FORM_KDE = 'vzNovy';   // „kde" formuláře pro ARES a našeptávač
const VZ_VLASTNI_RIDICI = 'Řídící zákazník: novou variantu založte „+ Nová varianta" a nastavte ji jako řídící.';
const VZ_ICO_ATR = ' placeholder="8 číslic" inputmode="numeric"';

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
  if (VZ_UI.zak !== z) { VZ_UI.zak = z; VZ_UI.otevreny = ''; VZ_UI.odstranit = null; VZ_UI.prodej = null; }   // jiná zakázka (načtení, Zpět)
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
 * zákazníka do jeho položky. Pole firmy (VZ_HLAVICKA_POLE) a od VZ-F1
 * (VZ-N3, #653) i zástupci (`ZAK.zastupci.<pole>`, VZ_ZASTUPCI_POLE) —
 * dřív šel zápis zástupců u otevřeného B/C do hlavičky řídícího a SoD A
 * pak nesla zástupce C. */
function vzCesta(cesta) {
  return vzCestaPro(cesta, vzOtevrenyIndex());
}
/* Totéž pro zákazníka s indexem `i` v ZAK.dalsiZakaznici (-1 = řídící). */
function vzCestaPro(cesta, i) {
  const s = String(cesta);
  const m = /^ZAK\.([A-Za-z]+)$/.exec(s);
  const mz = m ? null : /^ZAK\.zastupci\.([A-Za-z]+)$/.exec(s);
  if (m ? VZ_HLAVICKA_POLE.indexOf(m[1]) < 0 : !(mz && VZ_ZASTUPCI_POLE.indexOf(mz[1]) >= 0)) return cesta;
  if (!(i >= 0)) return cesta;
  const d = ZAK.dalsiZakaznici[i];
  if (!vzObj(d)) return cesta;
  if (!vzObj(d.hlavicka)) d.hlavicka = vzHlavickaZ(d.hlavicka);   // zajistí tvar položky
  if (!vzObj(d.zastupci)) d.zastupci = vzZastupciZ(d.zastupci);
  return m ? 'ZAK.dalsiZakaznici.' + i + '.hlavicka.' + m[1] : 'ZAK.dalsiZakaznici.' + i + '.zastupci.' + mz[1];
}
/* VZ-F1 (VZ-N3): cesta provázaného pole krycího listu (`bind`) pro ADRESÁTA
 * listu — stejného zákazníka, z jehož pohledu se list kreslí a tiskne
 * (vzTiskKomuUi: u prodané varianty vítěz, jinak otevřený zákazník). Pole
 * zákazníka (DIČ, zástupci) jdou do jeho položky; ostatní (název akce,
 * číslo, adresa stavby, hlavička PROJ) a jeden zákazník beze změny. */
function vzKlCesta(cesta) {
  const z = vzZakUI();
  if (!z || !vzRezimUI()) return cesta;
  const v = typeof aktivniVarianta === 'function' ? aktivniVarianta(z) : null;
  const komu = typeof vzTiskKomuUi === 'function' ? vzTiskKomuUi('kryci', v) : vzOtevrenyId();
  if (!komu || komu === vzRidiciId(z)) return cesta;
  const i = Array.isArray(z.dalsiZakaznici) ? z.dalsiZakaznici.findIndex(d => vzObj(d) && String(d.id) === String(komu)) : -1;
  return vzCestaPro(cesta, i);
}

/* VZ-F1 (VZ-N2, #655): varianty pro výběr „Otevřená varianta" v hlavičce —
 * jen varianty otevřeného zákazníka (vzVariantyZakaznika: řídící sdílené
 * a své, další zákazník svou a ty, které mu odešly); cizí vlastní varianty
 * se skryjí. Otevřená varianta zůstává vždy (výběr nesmí lhát). Vypnuto
 * nebo jeden zákazník → null = všechny varianty jako dřív. */
function vzVariantyHlavicka() {
  const z = vzZakUI();
  if (!z || !vzZap() || !vzRezimUI()) return null;
  const ids = new Set(vzVariantyZakaznika(z, vzOtevrenyId()));
  if (typeof aktivniVarianta === 'function') { const a = aktivniVarianta(z); if (a) ids.add(String(a.id)); }
  return (z.varianty || []).filter(v => v && ids.has(String(v.id)));
}

/* ZMRAZENÍ ÚDAJŮ DALŠÍHO ZÁKAZNÍKA (E3, návrh § 5): cesta z vzCesta
 * (`ZAK.dalsiZakaznici.<i>.hlavicka.<pole>`) → důvod z jádra
 * (vzZakaznikPoleZmrazeno) nebo ''. Jiné cesty (řídící, jeden zákazník)
 * vždy '' — hlavičku řídícího hlídá zámek hlavičky jako dřív. */
function vzCestaZmrazena(cesta) {
  const m = /^ZAK\.dalsiZakaznici\.(\d+)\.hlavicka\.([A-Za-z]+)$/.exec(String(cesta));
  const z = vzZakUI();
  if (!m || !z || !Array.isArray(z.dalsiZakaznici)) return '';
  const d = z.dalsiZakaznici[+m[1]];
  return vzObj(d) ? vzZakaznikPoleZmrazeno(z, String(d.id), m[2]) : '';
}
/* Atribut pole hlavičky (common.js zakaznikRow, icoRow): zmrazené pole jen
 * ke čtení s důvodem v bublině. U jednoho zákazníka a u řídícího vždy ''
 * (výstup hlavičky znak po znaku jako dřív). */
function vzPoleAttr(cesta) {
  const duvod = vzCestaZmrazena(cesta);
  return duvod ? ` readonly class="zmrazeno" title="${esc('🔒 ' + duvod)}"` : '';
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
    /* E3: po odeslání nabídky jemu se název, sídlo, IČO a DIČ nemění — ARES
     * přepisuje právě je (tlačítko zhasne, potvrzení se odmítne). */
    zmrazeno: vzZakaznikPoleZmrazeno(ZAK, String(d.id), 'objednatel'),
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
      set: (k, v) => { if (VZ_HLAVICKA_POLE.indexOf(k) >= 0) f.h[k] = vzText(v).slice(0, VZ_TEXT_MAX); vzFormPrekresli(); },
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
    /* E3: zmrazené pole (název, sídlo, IČO, DIČ po odeslání nabídky jemu) se
     * nezapíše; kontaktní osoba ano (výběr kontaktu z našeptávače). */
    set: (k, v) => {
      const duvod = vzZakaznikPoleZmrazeno(ZAK, String(d.id), k);
      if (duvod) { if (typeof hlaska === 'function') hlaska(duvod); render(); return; }
      set(vzCesta('ZAK.' + k), v);
    },
    zmrazeno: () => vzZakaznikPoleZmrazeno(ZAK, String(d.id), 'objednatel'),
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
  const pole = (klic, popis, navic) => `<div class="row"><label for="vzF_${esc(klic)}">${esc(popis)}</label><input type="text" id="vzF_${esc(klic)}" autocomplete="off"
      maxlength="${VZ_TEXT_MAX}" value="${esc(f.h[klic])}"${navic || ''} onchange="vzFormPole('${escJs(klic)}', this.value)"></div>`;
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
      <div>${pole('ico', 'IČO zákazníka', VZ_ICO_ATR)}${pole('dic', 'DIČ zákazníka')}${ares}</div></div>
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
/* Odešla zákazníkovi nabídka? (E3: razítko tisku s jeho id v zámku
 * kterékoli varianty — vzOdeslanoKomu; záznam bez razítka patří z1). */
function vzOdeslano(z) {
  return !!z && vzOdeslanoKomu(ZAK, z.id);
}
/* Role Administrátor přihlášeného uživatele (relace serveru). Bez přihlášení
 * není administrátor nikdo — bezpečnější výklad; server roli ověří sám. */
function vzJeAdminUI() {
  return typeof jeAdminOnline === 'function' && !!jeAdminOnline();
}
/* Den z ISO času „16. 11. 2026" (český čas, vzpDen); bez roku „16. 11.". */
function vzDenUI(iso, bezRoku) {
  const d = typeof vzpDen === 'function' ? vzpDen(iso) : '';
  return bezRoku ? d.replace(/\s*\d{4}$/, '') : d;
}
function vzSdileni(z, l) {
  const s = l.filter(x => x.varianta === z.varianta);
  return s.length > 1 ? 'sdílená: ' + s.map(vzNazevZ).join(' + ') : 'vlastní varianta';
}
function vzStavText(z) {
  const v = vzVarianta(z.varianta);
  if (!v) return 'varianta chybí';
  if (typeof variantaProdana === 'function' && variantaProdana(v)) return 'prodáno';
  /* E3 (§ 5): odeslána = v zámku JEHO varianty je tisk s jeho id; jinak
   * rozpracovaná, s poslední odeslanou nabídkou (vzPlatna), pokud nějaká je. */
  const s = vzStavNabidky(ZAK, z.id);
  if (s && s.stav === 'odeslana') return ('odeslána ' + vzDenUI(s.kdy)).trim();
  if (s && s.platna) return 'rozpracovaná (platí ' + s.platna.cislo + (vzDenUI(s.platna.kdy) ? ' z ' + vzDenUI(s.platna.kdy, true) : '') + ')';
  return 'rozpracovaná';
}

/* Smí se zákazník odstranit? '' = ano, jinak důvod (jádro vzOdstranDuvod:
 * řídící, prodaný, odeslaná nabídka bez role administrátora). */
function vzOdstranitDuvod(z) {
  return z ? vzOdstranDuvod(ZAK, z.id, vzJeAdminUI()) : 'Zákazník v zakázce není.';
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
  /* E3: odešla mu nabídka (razítko s jeho id) → doklad zůstává, písmeno se
   * už nepřidělí; smí jen administrátor (tlačítko jinak zhasnuté). */
  const odeslano = vzOdeslano(z);
  const platna = odeslano ? vzPlatna(ZAK, z.id) : null;
  const razitko = v ? vzRazitkoDotisku(v, z.id) : null;
  const cisloDokladu = (v && (vzCisloDokladu(ZAK, v) || (razitko && razitko.cislo))) || '';
  const varianta = !v ? 'chybí — nic se nemaže'
    : !jenJeho ? 'zůstává beze změny' + (ostatni.length ? ' — používá ji ' + esc(ostatni.join(', ')) : '')
        + (razitko ? '; razítko tisku pro tohoto zákazníka v zámku varianty zůstává' : '')
      : zamcena ? '<b>zůstává v zakázce zamčená</b> jako doklad' + (cisloDokladu ? ' s číslem ' + esc(cisloDokladu) : '')
        + ' — smazat ji lze jen jako dnes (právo mazat uzamčenou variantu)'
        : `<span class="vz-volba"><label><input type="radio" name="vzOdstranVar" value="smazat"${p.smazat ? ' checked' : ''} onchange="VZ_UI.odstranit.smazat=true"> smazat i jeho rozpracovanou variantu „${esc(v.nazev)}" (nikomu neodešla)</label>
          <label><input type="radio" name="vzOdstranVar" value="ponechat"${p.smazat ? '' : ' checked'} onchange="VZ_UI.odstranit.smazat=false"> ponechat ji v zakázce jako běžnou variantu</label></span>`;
  const zbyde = l.length - 1;
  const nabidka = platna
    ? r('Jeho nabídka ' + platna.cislo, 'odeslána ' + esc(vzDenUI(platna.kdy)) + ' → <b>doklad zůstává</b> v zakázce (razítko tisku se snímkem adresáta v zámku varianty, protokol)')
    : r('Jeho nabídka', 'rozpracovaná, neodeslaná → <b>zanikne</b>');
  return `<div class="vz-potvrzeni" id="vzOdstranPotvrzeni"><b>Odstranit zákazníka ${esc(vzNazevZ(z))} ze zakázky?</b>
    ${nabidka}
    ${r('Varianta „' + (v ? v.nazev : '?') + '"', varianta)}
    ${odeslano ? r('Kdo smí', 'jen <b>administrátor</b> — zákazníkovi už odešla nabídka') : ''}
    ${r('Písmeno -' + z.pismeno, odeslano ? 'už se nepřidělí jinému zákazníkovi (něco s ním odešlo)' : 'uvolní se — nic s ním neodešlo')}
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
    /* T1: řídící variantu určuje hlavička (Řídící varianta) — výběr u řídícího zamčený. */
    const proVar = !smi ? vzProcNe() : (z.ridici ? VZ_T1_KARTA_VAR : '');
    const odstrDuvod = vzOdstranitDuvod(z);
    const proProdej = smi ? vzProdejNelze(ZAK, z.id) : '';
    const tl = [
      `<button type="button" class="mini" onclick="vzNahled('${escJs(z.id)}')"${dis(zap, typeof VZ_VYPNUTO === 'string' ? VZ_VYPNUTO : '')} title="otevřít zákazníka a kartu Cenová nabídka">Náhled</button>`,
      `<button type="button" class="mini" onclick="vzTiskCN('${escJs(z.id)}')"${dis(zap, typeof VZ_VYPNUTO === 'string' ? VZ_VYPNUTO : '')} title="otevřít zákazníka a vytisknout jeho cenovou nabídku (VZ-E2)">Tisk CN</button>`,
      `<button type="button" class="mini" onclick="vzVlastniVarianta('${escJs(z.id)}')"${dis(smi && !z.ridici, !smi ? vzProcNe() : VZ_VLASTNI_RIDICI)}>Vlastní varianta</button>`,
      `<button type="button" class="mini" data-vz-prodano="${esc(z.id)}" onclick="vzProdejOtevri('${escJs(z.id)}')"${dis(smi && !proProdej, proProdej || vzProcNe())}>Prodáno</button>`,
      `<button type="button" class="mini" onclick="vzOdstranit('${escJs(z.id)}')"${dis(smi && !odstrDuvod, odstrDuvod || vzProcNe())}>Odstranit</button>`,
    ].join(' ');
    return `<tr class="${z.id === ot ? 'aktivni' : ''}" data-vz="${esc(z.id)}">
      <td data-l="Řídící">${zap ? `<span class="vz-t1-hvezda${z.ridici ? '' : ' mut'}" data-vz-ridici="${esc(z.id)}" title="${z.ridici ? 'řídící zákazník' : esc(VZ_T1_KARTA_HVEZDA)}">${z.ridici ? '★' : '☆'}</span>`
        /* T1 revize N4: s VYP hlavička výběr řídícího nemá — sloupec jako dřív (zhasnutý přepínač s důvodem). */
        : `<input type="radio" name="vzRidici_${kde}" data-vz-ridici="${esc(z.id)}"${z.ridici ? ' checked' : ''} disabled title="${esc(z.ridici ? 'řídící zákazník' : vzRidiciProcNe())}">`}</td>
      <td data-l="Zákazník"><button type="button" class="vz-jmeno" onclick="vzOtevri('${escJs(z.id)}')"${zap ? '' : ' disabled'} title="otevřít zákazníka v hlavičce">${esc(vzNazevZ(z))}</button>
        <div class="note">${z.hlavicka.ico ? 'IČO ' + esc(z.hlavicka.ico) : 'bez IČO'}${z.ridici ? ' · <b>řídící zákazník</b>' : ' · písmeno ' + esc(z.pismeno)}${z.id === ot ? ' · otevřený v hlavičce' : ''}</div></td>
      <td data-l="Číslo nabídky" class="vz-cislo">${v ? esc(vzTiskCisloZakaznika(ZAK, z, v)) : '—'}</td>
      <td data-l="Varianta nabídky"><select onchange="vzVariantaSet('${escJs(z.id)}', this.value)"${dis(smi && !z.ridici, proVar)}>${volby}${v ? '' : '<option selected value="">— chybí —</option>'}</select>
        <div class="note">${esc(vzSdileni(z, l))}</div></td>
      <td data-l="Stav">${esc(vzStavText(z))}</td>
      <td data-l="Cena bez DPH" class="vz-cena">${cena == null ? '—' : fmt0(cena)}</td></tr>
      <tr class="vz-akce-r${z.id === ot ? ' aktivni' : ''}"><td></td><td colspan="5" class="vz-akce">${tl}</td></tr>`;
  }).join('');
  const vyp = zap ? '' : `<div class="seznam-varovani" id="vzVypnuto_${kde}" style="margin:0 0 8px">funkce je vypnutá — ${esc(typeof VZ_VYPNUTO === 'string' ? VZ_VYPNUTO : '')}</div>`;
  const inner = `${vyp}<div class="note" style="margin-bottom:8px">Jednu zakázku může poptat víc zákazníků. Každý má <b>svou nabídku</b> — buď sdílí
      variantu s jiným zákazníkem, nebo má vlastní. <b>Řídící zákazník</b> je v hlavičce zakázky a jen jeho data nese deal v Pipedrive.${
      zap ? ' Řídícího určuje hlavička: <b>Řídící varianta</b> a <b>Řídící zákazník</b>; hvězdička ★ ukazuje, kdo jím je.' : ''}</div>
    <div class="vz-tab"><table><thead><tr><th>Řídící</th><th>Zákazník</th><th>Číslo nabídky</th><th>Varianta nabídky</th><th>Stav</th><th>Cena bez DPH</th></tr></thead>
      <tbody>${radky}</tbody></table></div>
    ${kde === 'ock' ? vzPotvrzeniHtml(l) + vzProdejPotvrzeniHtml(l) : ''}${vzOrgVitezHtml(ZAK)}
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
  vzOtevrenyId();   // srovná VZ_UI.zak (jiná zakázka) dřív, než se zapíše výběr
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
/* Překreslit formulář, jen když se pole na stránce liší od dat. Opuštění
 * pole Zákazník (onchange) přichází při mousedown na Zrušit / Přidat —
 * zbytečný render() mezi mousedown a mouseup by klik spolkl (nález
 * overit_vz_zadani.mjs). Výběr karty z našeptávače mění i jiná pole → render. */
function vzFormPrekresli() {
  const f = VZ_UI.form;
  const dom = typeof document !== 'undefined' && document.getElementById ? document : null;
  const lisi = !f || !dom || VZ_HLAVICKA_POLE.some(k => { const el = dom.getElementById('vzF_' + k); return !el || el.value !== f.h[k]; });
  if (lisi) { render(); return; }
  vzFormPsani(f.h.objednatel);
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
  vzOtevrenyId();   // srovná VZ_UI.zak dřív, než se zapíše výběr
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
  const odeslano = vzOdeslano(z);
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
    protokolZapis(ZAK, { co: 'Odstraněn zákazník' + (r.smazanaVarianta ? ' i s jeho rozpracovanou variantou' : '')
      + (odeslano ? ' s odeslanou nabídkou (doklad zůstává)' : ''),
      kde: 'zákazníci zakázky', kdo: vzKdo(), pred: nazev });
  render();
}

/* ---------- E4 (#603): řídící zákazník a Prodáno u zákazníka ---------- */

/* Smí přihlášený měnit řídícího? Nápověda pro přepínač — rozhoduje server
 * (vzServerRidici: autor zakázky, administrátor; zakázka z webhooku jen
 * administrátor). Bez přihlášení (práce se souborem) ano. */
function vzRidiciSmiUI() {
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV && ONLINE_STAV.ja) || null;
  if (!ja) return true;
  return vzRidiciSmiMenit(ZAK, { role: ja.role, email: ja.email });
}
/* Proč přepínač Řídící nejde ('' = jde). */
function vzRidiciProcNe() {
  const proc = vzRidiciZamceno(ZAK);
  if (proc) return proc;
  if (!vzSmiMenit()) return vzProcNe();
  if (!vzRidiciSmiUI()) return 'Řídícího zákazníka mění jen autor zakázky (u zakázek, které sám založil) nebo administrátor.';
  return '';
}

/* Otevře potvrzení prodeje u zákazníka (karta pod hlavičkou OCK). `varId`
 * nepovinně (Prodáno z krycího listu: otevřená varianta). */
function vzProdejOtevri(id, varId) {
  if (vzStop('zápis prodeje')) return;
  const z = vzZakaznik(ZAK, id);
  if (!z) return;
  const proc = vzProdejNelze(ZAK, z.id, varId);
  if (proc) { if (typeof hlaska === 'function') hlaska(proc); return; }
  VZ_UI.prodej = { id: z.id, varianta: varId ? String(varId) : z.varianta };
  VZ_UI.odstranit = null; VZ_UI.form = null;
  if (typeof prepniTab === 'function' && typeof TAB !== 'undefined' && TAB !== 'kalk') prepniTab('kalk');
  render();
  setTimeout(() => {
    const el = document.getElementById('vzProdejPotvrzeni');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  }, 0);
}

function vzProdejPotvrzeniHtml(l) {
  const p = VZ_UI.prodej;
  if (!p) return '';
  const z = l.find(x => x.id === p.id);
  const v = vzVarianta(p.varianta);
  if (!z || !v) return '';
  const r = (n, h) => `<div class="vz-pr"><span>${esc(n)}</span><span>${h}</span></div>`;
  const fmt = x => (x.cena && x.pred !== '' ? fmt0(+x.pred) : esc(x.pred || '—'));
  const fmtPo = x => (x.cena && x.po !== '' ? fmt0(+x.po) : esc(x.po || '—'));
  const radky = vzProdejPredPo(ZAK, z.id, v.id).map(x => r(x.co, `${fmt(x)} → <b>${fmtPo(x)}</b>`)).join('');
  const dnes = objDnes();
  const mez = prodDatumMez(v);
  const minD = (typeof prodUiSmiOdemknout === 'function' && prodUiSmiOdemknout() && mez.tvrda) ? mez.tvrda : mez.od;
  return `<div class="vz-potvrzeni" id="vzProdejPotvrzeni"><b>Prodáno zákazníkovi ${esc(vzNazevZ(z))} — nabídka ${esc(vzCisloSPismenem(vzCisloVarianty(ZAK, v), z.pismeno))}?</b>
    ${radky}
    ${r('Ostatní zákazníci', 'zůstávají v zakázce se zamčenými nabídkami (odstranit je jde dál, prodaného ne)')}
    ${r('Pipedrive', 'organizace dealu se přepíše na vítězného zákazníka; kontaktní osobu doplní obchodník v Pipedrive')}
    ${r('Zámek', 'krycí list i hlavička zakázky se definitivně zamknou; odemknout smí vedoucí nebo administrátor (řídícího zákazníka odemčení nevrací)')}
    <div class="vz-pt"><label>Datum prodeje <input type="date" id="vzProdejDatum" value="${esc(dnes)}" max="${esc(dnes)}"${minD ? ' min="' + esc(minD) + '"' : ''}></label>
      <button type="button" class="vz-modre" id="vzProdejAno" onclick="vzProdejPotvrd(true)">Prodáno</button>
      <button type="button" class="mini" id="vzProdejNe" onclick="vzProdejPotvrd(false)">Zrušit</button></div></div>`;
}

async function vzProdejPotvrd(ano) {
  const p = VZ_UI.prodej;
  const el = typeof document !== 'undefined' ? document.getElementById('vzProdejDatum') : null;
  const datum = el && el.value ? el.value : objDnes();
  VZ_UI.prodej = null;
  if (!ano || !p) { render(); return; }
  if (vzStop('zápis prodeje')) return;
  const v = vzVarianta(p.varianta);
  const proc = vzProdejNelze(ZAK, p.id, p.varianta);
  if (proc || !v) { if (typeof hlaska === 'function') hlaska(proc || 'Varianta neexistuje.'); render(); return; }
  const role = typeof prodUiRole === 'function' ? prodUiRole() : '';
  /* Výjimka z dolní meze data (K40-S1) — jako prodejUiProdej. */
  let duvod = '';
  const od = prodDatumOd(v);
  if (od && datum < od && typeof prodUiSmiOdemknout === 'function' && prodUiSmiOdemknout()
      && !prodDatumProblem(datum, v, undefined, { role, duvod: 'xxx' })) {
    const t = await dotaz('Datum prodeje je víc než ' + PROD_PRIJATO_TOLERANCE_DNI + ' dní před přijetím odeslané nabídky '
      + 'serverem. Napište důvod výjimky (zapíše se do historie prodeje):', '');
    if (t === null || t === undefined) { render(); return; }
    duvod = prodVyjimkaText(String(t));
    if (duvod.length < PROD_DUVOD_MIN) { hlaska('Bez důvodu nejde datum prodeje před mezí zapsat.'); render(); return; }
  }
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV.ja) ? ONLINE_STAV.ja.email : '';
  const zaloha = JSON.parse(JSON.stringify(ZAK));
  const nazev = vzNazevZ(vzZakaznik(ZAK, p.id));
  const r = vzProdej(ZAK, p.id, datum, { kdo: ja, role, duvod }, p.varianta);
  if (!r.ok) { if (typeof hlaska === 'function') hlaska(r.chyba); render(); return; }
  VZ_UI.otevreny = '';
  ZAK.aktivni = r.varianta;
  if (typeof syncVarianta === 'function') syncVarianta();
  if (typeof onlineZmenaUzivatele === 'function') onlineZmenaUzivatele({});
  const u = typeof prodUiUloz === 'function' ? await prodUiUloz() : { ok: true };
  if (!u.ok) {
    vzObnov(ZAK, zaloha);
    if (typeof syncVarianta === 'function') syncVarianta();
    if (typeof hlaska === 'function') hlaska(prodNeulozenoText('prodej', u.duvod));
    render();
    return;
  }
  if (typeof PROD_UI !== 'undefined') {
    PROD_UI.info = 'Prodáno zákazníkovi ' + nazev + (r.vymena ? ' — je teď řídícím zákazníkem.' : '.');
    PROD_UI.infoZak = ZAK;
  }
  if (typeof progZprava === 'function') progZprava('Prodáno zákazníkovi ' + nazev + '.');
  render();
  await vzPoProdeji(ZAK);
}

/* HÁČEK PO ULOŽENÍ PRODEJE (návrh § 7.4): u zakázky s víc zákazníky zápis
 * organizace dealu = vítěz (E5b vzPoProdejiPd — převezme pdOrgVitez a nové
 * razítko). Jeden zákazník / neprodaná / offline: nic. */
async function vzPoProdeji(zak) {
  if (!zak || !vzOrgTyka(zak)) return null;
  return vzPoProdejiPd(zak);
}

/* Prodáno z krycího listu u zakázky s víc zákazníky (sod_ui.js prodejUiProdej):
 * zákazník podle otevřeného — když mu otevřená varianta odešla; jinak první
 * zákazník, kterému odešla. Vrací true, když se o prodej postarala karta. */
function vzProdejZKryciho(v) {
  if (!vzRezimUI() || !vzZap() || !v) return false;
  const ot = vzOtevrenyId();
  const kandidati = [ot].concat(vzZakaznici(ZAK).map(z => z.id).filter(id => id !== ot));
  const id = kandidati.find(x => vzVariantaOdeslanaKomu(v, x)) || ot;
  vzProdejOtevri(id, v.id);
  return true;
}

/* Krycí list sdílené varianty: upozornění (jen víc zákazníků; jinak ''). */
function vzKlSdilenaPozn() {
  if (!vzRezimUI()) return '';
  const t = vzKlSdilenaText(ZAK, (aktivniVarianta(ZAK) || {}).id);
  return t ? `<div class="note vz-kl-sdilena" style="margin:4px 0 8px;padding:6px 8px;border:1px solid #e0c46c;background:#fff7d6;border-radius:6px">${esc(t)}</div>` : '';
}

/* Otevření zakázky s daty víc zákazníků (online_ui.js): vypínač se ze
 * serveru čte jen u takové zakázky; s VYP lišta (R21). */
function vzPoOtevreni(zak) {
  VZ_UI.otevreny = ''; VZ_UI.form = null; VZ_UI.odstranit = null; VZ_UI.prodej = null;
  if (!zak || typeof vzMaData !== 'function' || !vzMaData(zak) || typeof onlineNactiFunkce !== 'function') return;
  onlineNactiFunkce().then(() => {
    if (ZAK !== zak) return;
    if (!vzZap() && typeof onlineZprava === 'function') onlineZprava(VZ_VYPNUTO, 'varovani');
    render();
  });
}

/* ---------- E5b: organizace dealu = vítězný zákazník (§ 7.4) ----------
 * Po prodeji zakázky s víc zákazníky server přepíše organizaci dealu na
 * vítězného zákazníka (POST /api/pd/organizace { soubor, akce: 'vitez' },
 * functions/pd_organizace.mjs). Stav píše JEN server do zak.pdOrgVitez
 * a vrací nové razítko uložení (zakázku sám zapsal). Obrazovka:
 *  · stav 'zapsano' u prodané zakázky → věta VZ_ORG_KONTAKT (aplikace osobu
 *    dealu nemění, nečte ani nekontroluje — rozhodnutí J. V. 16. 11. 2026);
 *  · 'shoda' → nic;
 *  · ostatní stavy → „Organizace dealu se nepřepsala" + důvod + „Zkusit
 *    zápis znovu" (jen kdo smí: administrátor, autor, prodal — rozhoduje server).
 * Jen se zapnutou funkcí a u zakázky s vzRidici a 2+ zákazníky; jinak ''
 * (VYP / jeden zákazník = stránka beze změny o znak). Všechny texty z dat
 * přes esc() — názvy organizací z Pipedrive mohou nést HTML. */
const VZ_ORG_KONTAKT = 'Doplňte v Pipedrive kontaktní osobu vítězného zákazníka před posunem dealu na Vyhráno.';
const VZ_ORG_DUVOD = {
  'bez-ico': 'vítězný zákazník nemá platné IČO — doplňte ho, nebo změňte organizaci ručně v Pipedrive',
  vice: 'v Pipedrive je víc organizací s tímto IČO — sjednoťte je a zápis zopakujte',
  'bez-prava': 'k zápisu do Pipedrive nemáte právo — zápis zopakuje někdo s právem',
  chyba: 'Pipedrive neodpověděl',
  strop: 'vyčerpaný počet pokusů za hodinu — zkuste to později',
};
const VZ_ORG_STYL = 'background:#fff7d6;border:1px solid #e0c46c;border-radius:6px;padding:8px 10px;margin:6px 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center';

/* Prodaná varianta zakázky, nebo null. */
function vzProdanaVar(zak) {
  if (!zak || !Array.isArray(zak.varianty) || typeof variantaProdana !== 'function') return null;
  return zak.varianty.find(v => v && variantaProdana(v)) || null;
}
/* Zakázka, které se zápis organizace vítěze týká: víc zákazníků (vzRidici
 * + další zákazník) a prodaná. */
function vzOrgTyka(zak) {
  return !!zak && vzObj(zak.vzRidici) && typeof vzRezim === 'function' && vzRezim(zak) && !!vzProdanaVar(zak);
}
/* Smí uživatel zápis zopakovat? Jen nápověda pro tlačítko — rozhoduje server. */
function vzOrgSmi(zak) {
  const ja = (typeof ONLINE_STAV !== 'undefined' && ONLINE_STAV && ONLINE_STAV.ja) || null;
  if (!ja) return false;
  if (ja.role === 'Administrátor') return true;
  const e = String(ja.email || '').trim().toLowerCase();
  if (!e) return false;
  const v = vzProdanaVar(zak);
  const prodal = v && v.prodano && typeof v.prodano === 'object' ? String(v.prodano.kdo || '').trim().toLowerCase() : '';
  return e === String((zak && zak.autor) || '').trim().toLowerCase() || e === prodal;
}
function vzOrgTlacitko(zak) {
  if (!vzOrgSmi(zak)) return '';
  const bezi = !!(VZ_UI.org && VZ_UI.org.zak === zak && VZ_UI.org.bezi);
  return `<button type="button" class="mini cteni-ok noprint" data-vz-org="znovu" onclick="vzPoProdejiPd(ZAK)"${bezi ? ' disabled' : ''}
      title="znovu přepsat organizaci dealu v Pipedrive na vítězného zákazníka">${bezi ? 'Zapisuje se…' : 'Zkusit zápis znovu'}</button>`;
}

/* Upozornění u řádku Stav Pipedrive a v kartě Zákazníci zakázky ('' = nic). */
function vzOrgVitezHtml(zak) {
  if (!vzZap() || !vzOrgTyka(zak)) return '';
  const veta = (t) => esc(vzText(t).replace(/[.\s]+$/, ''));   // důvod bez koncové tečky (věta pokračuje)
  const blok = (druh, text, tl) => `<div class="vz-org-upoz noprint" role="status" data-vz-org="${druh}" style="${VZ_ORG_STYL}">
    <span style="flex:1 1 260px">${text}</span>${tl || ''}</div>`;
  const ch = VZ_UI.org && VZ_UI.org.zak === zak && VZ_UI.org.chyba ? VZ_UI.org : null;
  if (ch) {
    /* Odmítnutí serverem (403/404/409/400/503): chyba bez tlačítka u 403. */
    return blok('odmitnuto', '<b>Organizace dealu se nepřepsala</b> — ' + veta(ch.chyba) + '. Prodej je uložený.',
      ch.kod === 403 ? '' : vzOrgTlacitko(zak));
  }
  const o = zak.pdOrgVitez;
  if (!vzObj(o)) return '';
  const stav = String(o.stav || '');
  if (stav === 'zapsano') return blok('kontakt', `<span data-vz-org-veta="1">${esc(VZ_ORG_KONTAKT)}</span>`);
  if (!Object.prototype.hasOwnProperty.call(VZ_ORG_DUVOD, stav)) return '';   // 'shoda' a neznámé stavy: nic
  let duvod = vzText(o.duvod).trim().replace(/[.\s]+$/, '') || VZ_ORG_DUVOD[stav];
  const vice = vzObj(o.vice) ? o.vice : null;
  if (stav === 'vice' && vice) {
    const nazvy = (Array.isArray(vice.nazvy) ? vice.nazvy : []).map(vzText).filter(Boolean);
    const pocet = Number.isFinite(Number(vice.pocet)) && Number(vice.pocet) > 0 ? Number(vice.pocet) : nazvy.length;
    duvod += ' (' + pocet + ' organizací' + (nazvy.length ? ': ' + nazvy.join(', ') : '') + ')';
  }
  return blok('stav', '<b>Organizace dealu se nepřepsala</b> — ' + veta(duvod) + '. Prodej je uložený.', vzOrgTlacitko(zak));
}

/* Zápis organizace vítěze na serveru. Volá ji háček vzPoProdeji() (E4) po
 * úspěšném uložení prodeje; ručně tlačítko „Zkusit zápis znovu". Jen u zakázky
 * otevřené z online databáze (ONLINE_STAV.soubor), s vzRidici a prodané.
 * Převezme pdOrgVitez a nové razítko (server zakázku zapsal — bez převzetí
 * by další uložení skončilo kolizí) a překreslí. Chyby nehází ven: prodej je
 * už uložený. Vrací odpověď serveru, nebo null. */
async function vzPoProdejiPd(zak) {
  const os = typeof ONLINE_STAV !== 'undefined' ? ONLINE_STAV : null;
  const soubor = os && os.ja && os.soubor ? String(os.soubor) : '';
  if (!zak || zak !== vzZakUI() || !soubor || !vzOrgTyka(zak) || typeof onlineApi !== 'function') return null;
  if (VZ_UI.org && VZ_UI.org.zak === zak && VZ_UI.org.bezi) return null;   // dvojí stisk
  VZ_UI.org = { zak, bezi: true, chyba: '', kod: 0 };
  try { render(); } catch (e) { /* překreslení nesmí zastavit zápis */ }
  let o = null, chyba = '', kod = 0;
  try {
    o = await onlineApi('/api/pd/organizace', { soubor, akce: 'vitez' });
  } catch (e) {
    /* onlineApi hází i u 200 s ok:false — stav ('vice', 'chyba'…) je pak v e.data. */
    if (e && e.data && typeof e.data.stav === 'string') o = e.data;
    else { chyba = (e && e.message) || 'server neodpověděl'; kod = (e && e.stav) || 0; }
  }
  /* Mezitím otevřená jiná zakázka: odpověď (i razítko) k ní nepatří. */
  if (vzZakUI() !== zak || os.soubor !== soubor) { if (VZ_UI.org && VZ_UI.org.zak === zak) VZ_UI.org = null; return null; }
  VZ_UI.org = chyba ? { zak, bezi: false, chyba, kod } : null;
  if (o) {
    const pred = JSON.stringify(zak);
    const autosaveCisty = os.posledni === pred;
    const histCista = typeof historieNeulozeno === 'function' && !historieNeulozeno();
    /* nezapsano (revize P5): server stav do zakázky nezapsal (prodej mezitím odemčen / jiný deal) — nepřebírat. */
    if (vzObj(o.pdOrgVitez) && !o.nezapsano) zak.pdOrgVitez = o.pdOrgVitez;
    if (o.razitko) { zak.uloRazitko = String(o.razitko); os.razitko = String(o.razitko); }
    /* Zápis serveru není neuložená změna (vzor pdStavObnovUI). */
    if (autosaveCisty) os.posledni = JSON.stringify(zak);
    if (histCista && typeof historieOznacUlozeno === 'function') historieOznacUlozeno();
  }
  try { render(); } catch (e) { /* nic */ }
  return o;
}

/* ---------- T1: Řídící varianta a Řídící zákazník v hlavičce ----------
 * Rozhodnutí J. V. 18. 11. 2026, maketa podklady/T1_MAKETA_KALKULATOR.html.
 * Jen ZAP + 2+ zákazníků (vzT1Hlavicka vrací null → common.js kreslí dnešní
 * hlavičku znak po znaku, i s tlačítkem „nastavit jako řídící").
 *  - „Řídící varianta" nahrazuje tlačítko „nastavit jako řídící"; u každé
 *    varianty „(sdílená)" / „(vlastní X)" / „(bez zákazníka)" (jádro vzT1PopisVarianty);
 *  - „Řídící zákazník": u vlastní varianty zamčený (🔒 automaticky) s vysvětlením,
 *    u sdílené povinný výběr jen ze zákazníků, kterým varianta patří. Zvolená
 *    sdílená varianta bez zákazníka (VZ_UI.t1) se do dat nezapíše a uložení
 *    zastaví hláška i dialog (vzT1UlozStop — ruční uložení i autosave);
 *  - žlutý blok pod „Stav Pipedrive", když organizace dealu nesedí na řídícího
 *    (jádro vzOrgNesediText), a karta „Poznámka dealu v Pipedrive — náhled".
 * Práva jako výměna řídícího (E4): vzRidiciProcNe. Data mění jádro vzT1Nastav. */
const VZ_T1_KARTA_VAR = 'řídící variantu určuje hlavička — Řídící varianta';
const VZ_T1_KARTA_HVEZDA = 'řídícího určuje hlavička (Řídící varianta / Řídící zákazník)';
const VZ_T1_UPOZ_STYL = 'background:#fff7d6;border:1px solid #e0c46c;border-radius:6px;padding:8px 10px;margin:6px 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center';

/* T1 se kreslí: zapnutá funkce a 2+ zákazníků. */
function vzT1Aktivni() { return vzZap() && vzRezimUI(); }

/* Platná rozpracovaná volba sdílené řídící varianty, nebo null (srovná stav). */
function vzT1Ceka() {
  const t = VZ_UI.t1;
  if (!t) return null;
  if (!vzT1Aktivni() || t.zak !== ZAK || !vzVarianta(t.varianta) || t.varianta === vzRidiciVariantaId(ZAK)
      || vzVariantaDruh(ZAK, t.varianta).druh !== 'sdilena') { VZ_UI.t1 = null; return null; }
  return t;
}

function vzT1Seznam(l) { return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' a ' + l[l.length - 1]; }

/* Kdo patří variantě jen razítkem (nabídka z ní odešla, ukazuje jinam): věta do závorky. */
function vzT1RazitkaVeta(varId) {
  const v = vzVarianta(varId);
  if (!v) return '';
  return vzVariantaKomu(ZAK, varId).map(id => vzZakaznik(ZAK, id)).filter(z => z && z.varianta !== String(varId)).map(z => {
    const r = vzRazitkoDotisku(v, z.id);
    return (z.pismeno || vzNazevZ(z)) + ' z ní dostal nabídku ' + ((r && r.cislo) || vzCisloSPismenem(vzCisloVarianty(ZAK, v), z.pismeno));
  }).join('; ');
}

/* Řádky hlavičky (3. sloupec) — { blok, radky } nebo null (dnešní hlavička). */
function vzT1Hlavicka() {
  if (!vzT1Aktivni()) return null;
  const ceka = vzT1Ceka();
  const rv = vzRidiciVariantaId(ZAK);
  const vyb = ceka ? ceka.varianta : rv;
  const proc = vzRidiciProcNe();
  const dis = proc ? ` disabled title="${esc(proc)}"` : '';
  const opts = (ZAK.varianty || []).map(v => `<option value="${esc(v.id)}"${String(v.id) === vyb ? ' selected' : ''}>${esc(v.nazev)} ${esc(vzT1PopisVarianty(ZAK, v.id))}</option>`).join('');
  const rvRow = `<div class="row vz-t1-rv"><label>Řídící varianta</label>
    <select id="vzT1Rv" onchange="vzT1VarZmen(this.value)"${dis}>${opts}</select></div>`;
  const v = vzVarianta(vyb);
  const vNazev = v ? v.nazev : '';
  const d = vzVariantaDruh(ZAK, vyb);
  let rzRow;
  if (!ceka && d.druh !== 'sdilena') {
    const z = vzZakaznik(ZAK, vzRidiciId(ZAK));
    const st = vzT1Stitek(z);
    const veta = d.druh === 'vlastni'
      ? vNazev + ' je vlastní varianta zákazníka ' + st + ', proto je řídícím zákazníkem automaticky on. Jiného řídícího zákazníka vyberete se sdílenou variantou.'
      : vNazev + ' zatím nepatří žádnému jinému zákazníkovi — řídícím zůstává ' + st + '.';
    rzRow = `<div class="row vz-t1-rz"><label>Řídící zákazník<span class="pill mut" style="margin-left:12px">🔒 automaticky</span></label>
    <select id="vzT1Rz" class="vz-t1-zamek" disabled title="${esc('🔒 ' + veta)}"><option selected>${esc(st)}</option></select></div>
    <div class="vz-t1-vysv noprint">${esc(veta)}</div>`;
  } else {
    const R = vzRidiciId(ZAK);
    const chyba = !!(ceka && ceka.chyba);
    const volby = (ceka ? `<option value="" selected>— vyberte —</option>` : '')
      + d.komu.map(id => `<option value="${esc(id)}"${!ceka && id === R ? ' selected' : ''}>${esc(vzT1Stitek(vzZakaznik(ZAK, id)))}</option>`).join('');
    const raz = vzT1RazitkaVeta(vyb);
    const veta = vNazev + ' je sdílená — patří zákazníkům ' + vzT1Seznam(d.komu.map(id => vzNazevZ(vzZakaznik(ZAK, id))))
      + (raz ? ' (' + raz + ')' : '') + '. '
      + (ceka ? 'Vyberte, kdo z nich je řídící; bez výběru zakázku nejde uložit.' : 'Nabízejí se jen zákazníci, kterým varianta patří.');
    rzRow = `<div class="row vz-t1-rz"><label>Řídící zákazník<span class="pill ${ceka ? 'bad' : 'warn'}" style="margin-left:12px">povinné</span></label>
    <select id="vzT1Rz"${chyba ? ' class="vz-t1-chybi"' : ''} onchange="vzT1ZakZmen(this.value)"${dis}>${volby}</select></div>
    <div class="vz-t1-vysv noprint${chyba ? ' vz-t1-vysv-chyba' : ''}">${esc(veta)}</div>`;
  }
  const org = ceka ? '' : vzOrgNesediText(ZAK, true);   // rozpracovaný výběr: řídící zatím není (jako maketa)
  const blok = org ? `<div class="vz-t1-org noprint" role="status" data-vz-t1-org="1" style="${VZ_T1_UPOZ_STYL}">
    <span style="flex:1 1 220px">${esc(org).replace(/^(Řídící zákazník v kalkulaci: .*?) \(/, '<b>$1</b> (')}</span></div>` : '';
  return { blok, radky: rvRow + rzRow };
}

/* Rozhodnutí J. V. (d): krátké potvrzení JEN když se mění řídící zákazník
 * (i automaticky u vlastní varianty); změna samotné varianty bez dialogu.
 * `provest` se zavolá hned (bez dialogu) nebo po „Změnit". */
function vzT1Potvrd(zakId, provest) {
  if (!zakId || zakId === vzRidiciId(ZAK) || typeof potvrd !== 'function') return provest();   // bez dialogu hned
  return Promise.resolve(potvrd('Řídícím zákazníkem bude ' + vzT1Stitek(vzZakaznik(ZAK, zakId)) + ' — hlavička zakázky se změní.',
    { nadpis: 'Řídící zákazník', ano: 'Změnit', ne: 'Zrušit' })).then(x => (x ? provest() : render()), () => render());
}
/* Rozhodnutí J. V. (b): řídící zákazník přešel na variantu JEN podle razítka
 * odeslané nabídky (neukazoval na ni) → záznam do protokolu zakázky. */
function vzT1PodleRazitka(zakId, vid) {
  const z = vzZakaznik(ZAK, zakId);
  if (!z || z.varianta === vid) return '';
  const v = vzVarianta(vid);
  const r = v ? vzRazitkoDotisku(v, z.id) : null;
  return r ? 'Řídící zákazník ' + vzT1Stitek(z) + ' přešel na variantu „' + v.nazev + '“ podle odeslané nabídky ' + (r.cislo || '') : '';
}
function vzT1Hotovo(r, co, pred, po, razitko) {
  if (!r.zmena) { render(); return; }
  if (razitko && typeof protokolZapis === 'function')
    protokolZapis(ZAK, { co: razitko.trim(), kde: 'hlavička zakázky', kdo: vzKdo() });
  VZ_UI.otevreny = '';
  ZAK.aktivni = vzRidiciVariantaId(ZAK);
  syncVarianta();
  aktivniVarianta(ZAK).upraveno = new Date().toISOString();
  if (typeof zakUlozeniZprava === 'function') zakUlozeniZprava('');
  if (typeof protokolZapis === 'function')
    protokolZapis(ZAK, { co, kde: 'hlavička zakázky', kdo: vzKdo(), pred, po });
  render();
}
function vzT1Popis() {
  const v = vzVarianta(vzRidiciVariantaId(ZAK));
  return vzNazevZ(vzZakaznik(ZAK, vzRidiciId(ZAK))) + ' / ' + (v ? v.nazev : '');
}

/* Výběr „Řídící varianta": vlastní / bez zákazníka → hned; sdílená → čeká na zákazníka. */
function vzT1VarZmen(varId) {
  vzOtevrenyId();   // srovná VZ_UI.zak dřív, než se zapíše výběr
  if (vzStop('změna řídící varianty')) return;
  const proc = vzRidiciProcNe();
  if (proc || !vzVarianta(varId)) { if (proc && typeof hlaska === 'function') hlaska(proc); render(); return; }
  const vid = String(varId);
  if (vid === vzRidiciVariantaId(ZAK)) { VZ_UI.t1 = null; render(); return; }
  if (vzVariantaDruh(ZAK, vid).druh === 'sdilena') {
    VZ_UI.t1 = { zak: ZAK, varianta: vid, chyba: false };
    ZAK.aktivni = vid;
    syncVarianta();
    render();
    return;
  }
  VZ_UI.t1 = null;
  const kdo = vzT1Kandidati(ZAK, vid)[0];
  return vzT1Potvrd(kdo, () => {
    if (vzStop('změna řídící varianty')) return;
    const pred = vzT1Popis();
    const raz = vzT1PodleRazitka(kdo, vid);
    const r = vzT1Nastav(ZAK, vid);
    if (!r.ok) { if (typeof hlaska === 'function') hlaska(r.chyba); render(); return; }
    vzT1Hotovo(r, r.vymena ? 'Změna řídícího zákazníka (vlastní varianta)' : 'Změna řídící varianty', pred, vzT1Popis(), raz);
  });
}

/* Výběr „Řídící zákazník" u sdílené varianty (rozpracované nebo dnešní řídící). */
function vzT1ZakZmen(zakId) {
  vzOtevrenyId();
  if (vzStop('změna řídícího zákazníka')) return;
  const proc = vzRidiciProcNe();
  if (proc) { if (typeof hlaska === 'function') hlaska(proc); render(); return; }
  if (!zakId) { render(); return; }
  const ceka = vzT1Ceka();
  const vid = ceka ? ceka.varianta : vzRidiciVariantaId(ZAK);
  return vzT1Potvrd(String(zakId), () => {
    if (vzStop('změna řídícího zákazníka')) return;
    const pred = vzT1Popis();
    const raz = vzT1PodleRazitka(String(zakId), vid);
    const r = vzT1Nastav(ZAK, vid, zakId);
    if (!r.ok) { if (typeof hlaska === 'function') hlaska(r.chyba); render(); return; }
    VZ_UI.t1 = null;
    vzT1Hotovo(r, r.vymena ? 'Změna řídícího zákazníka' : 'Změna řídící varianty', pred, vzT1Popis(), raz);
  });
}

/* Zastavení uložení, dokud u sdílené řídící varianty chybí řídící zákazník.
 * `rucne`: hláška pod lištou i dialog (texty z makety); autosave tiše.
 * Vrací true = neukládat. */
function vzT1UlozStop(rucne) {
  const t = vzT1Ceka();
  if (!t) return false;
  if (!rucne) return true;   // autosave tiše (hlavička sama říká, že bez výběru se neukládá)
  const v = vzVarianta(t.varianta);
  const komu = vzVariantaKomu(ZAK, t.varianta).map(id => vzZakaznik(ZAK, id));
  t.chyba = true;
  if (typeof zakUlozeniZprava === 'function')
    zakUlozeniZprava('Zakázka se neuložila. Řídící varianta „' + v.nazev + '“ je sdílená — vyberte v hlavičce Řídící zákazník ('
      + vzT1Seznam(komu.map(vzNazevZ)) + ').', 'chyba');
  if (typeof hlaska === 'function') {
    const d = hlaska('Řídící varianta „' + v.nazev + '“ je sdílená. Vyberte v hlavičce Řídící zákazník — jednoho ze zákazníků, kterým varianta patří ('
      + komu.map(vzT1Stitek).join(', ') + ').', { nadpis: 'Zakázku nejde uložit', ano: 'Rozumím' });
    if (d && typeof d.then === 'function')
      d.then(() => { const el = typeof document !== 'undefined' ? document.getElementById('vzT1Rz') : null; if (el && el.focus) el.focus(); });
  }
  render();
  return true;
}

/* Seznam variant (Přehled cenových nabídek, sloupec Řídící): u 2+ zákazníků
 * se ZAP jde přepnutí přes hlavičku (T1). Vrací true, když se o to postaralo T1. */
function vzT1VarRidici(id) {
  if (!vzT1Aktivni()) return false;
  vzT1VarZmen(id);
  return true;
}

/* Karta „Poznámka dealu v Pipedrive — náhled" (jen ZAP + 2+ zákazníků; jinak ''). */
function vzPoznamkaKarta(kde) {
  if (!vzT1Aktivni() || typeof vzPoznamkaText !== 'function') return '';
  const ceka = vzT1Ceka();
  let t = vzPoznamkaText(ZAK);
  if (ceka) {
    const radky = t.split('\n').filter(x => !/^Řídící zákazník v kalkulaci: /.test(x));
    radky.push('(řídící zákazník není vybrán — poznámka se zapíše až s uložením)');
    t = radky.join('\n');
  }
  const text = (typeof vzPoznamkaSeZnackou === 'function' ? vzPoznamkaSeZnackou(ZAK, t) : '') || t;
  const html = esc(text).split('\n').map(r => /^Řídící zákazník v kalkulaci: |^\(řídící zákazník není vybrán/.test(r)
    ? `<span class="vz-t1-pozn-novy">${r}</span>` : r).join('\n');
  const deal = typeof ctrlPdDealIdNorm === 'function' ? ctrlPdDealIdNorm(ZAK.pdDealId) : String(ZAK.pdDealId || '');
  const znama = vzOrgDealuZnama(ZAK);
  const oid = vzOrgDealuId(ZAK);
  const org = oid ? vzZakaznik(ZAK, oid) : null;
  const prodana = !!vzProdanaVarianta(ZAK);
  /* Revize N3: skutečná organizace dealu (server ji čte při uložení), jinak odhad. */
  const orgNazev = znama ? (znama.org ? (znama.nazev || (org ? vzNazevZ(org) : 'bez názvu')) : 'deal nemá organizaci') : (org ? vzNazevZ(org) : '');
  const orgVeta = !deal ? 'Zakázka zatím nemá deal v Pipedrive — poznámka se zapíše, až ho mít bude.'
    : prodana ? 'Organizace dealu se po prodeji přepisuje na vítězného zákazníka.'
      : orgNazev ? 'Organizace dealu: <b>' + esc(orgNazev) + '</b>' + (znama ? '' : ' (odhad — ověří se při uložení)') + ' — mění se až prodejem.'
        : 'Organizace dealu se ověří při uložení.';
  /* Revize N5: noprint — názvy a ceny ostatních zákazníků nesmí do tisku záložky. */
  return `<div class="card vz-pozn-karta noprint" id="vzPoznKarta_${kde}"><h2><span style="flex:1">Poznámka dealu v Pipedrive — náhled</span></h2><div class="body">
    <div class="note" style="margin-bottom:8px">Text, který uložení zakázky zapíše do přepisované poznámky u dealu (bez kontaktů, osob a IČO). ${orgVeta}</div>
    <pre class="vz-t1-pozn">${html}</pre></div></div>`;
}
