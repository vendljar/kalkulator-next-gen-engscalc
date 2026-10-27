/* ============================================================
 * MAPA POLÍ PIPEDRIVE ↔ POLE KALKULAČKY (9. 8. 2026, #16; párování podle
 * přesného názvu od 21. 10. 2026, #114)
 *
 * Vlastní pole se v Pipedrive neadresují názvem, ale čtyřicetiznakovým
 * hashem (`dcf558aac1ae…`). Hash je pro každý účet jiný a v kódu nemá co
 * dělat — kdo by si zdrojáky naklonoval, dostal by aplikaci, která píše
 * do cizích polí. Mapa se proto skládá až na serveru z definic polí
 * (`GET /api/v2/dealFields`) podle NÁZVU pole.
 *
 * PROČ PŘESNÝ NÁZEV, A NE VZOR (21. 10. 2026). Do té doby se párovalo volně
 * podle vzorů („záruk", „pokut", „firma") a vyhrával nejkratší vyhovující
 * název. Integrátor 21. 10. 2026 založil 54 nových polí podle tabulky
 * `Pipedrive_nova_pole_dealu` (revize J. V. 14. 10.) a jejich názvy ta slova
 * obsahují taky. Test nad skutečnými definicemi ukázal, že by se doba záruky
 * spárovala se „Zádržné – po dobu záruky", pokuta za den s „Limit smluvních
 * pokut (%)" a objednatel s „Podepisující firma (pokud jiná)" — u čtení
 * prázdný krycí list, u zápisu číslo záruky ve výběrovém poli zádržného.
 * Názvy jsou teď dohodnuté písemně, takže se páruje PŘESNĚ podle názvu
 * (bez ohledu na velikost písmen, mezery a druh pomlčky) A podle typu pole.
 * Přejmenování pole v CRM se pak projeví jako „chybí pole" v přehledu, ne
 * jako tichý zápis jinam. Název je smlouva s integrátorem, hash ne.
 *
 * Ověřeno na skutečném účtu 9. 8. 2026 (308 dealů, 1 820 organizací):
 *  · trojice splatnost 14 dní / první splátka 50 % / druhá splátka 40 % je
 *    vyplněná skoro u všech dealů (21. 10. 2026: 370 z 372),
 *  · IČO je vlastní pole ORGANIZACE („IČ"), typu ČÍSLO — nuly na začátku
 *    se v Pipedrive ztrácejí, doplňuje je `pdIco()`,
 *  · DIČ ani fakturační adresa v CRM nejsou vůbec,
 *  · ZÁKAZNÍK (smluvní partner) je organizace a osoba dealu. „Zdroj
 *    poptávky – Organizace / Osoba" je ten, kdo poptávku přinesl: 21. 10.
 *    2026 ze 138 vyplněných 119× výtahová společnost, ale 19× jiná role
 *    (poptávkový server, stavební i správcovská společnost, investor,
 *    konzultant, projektant) — za zákazníka se proto nebere. Organizace
 *    dealu má všechny role (investor 142×, výtahová společnost 136×, …).
 *
 * KDO JE ZDROJEM (pravidlo J. V. 21. 10. 2026: „do pipedrive by se mělo
 * přenášet to, co je v kalkulačním nástroji"). Každé pole má JEDNOHO
 * vlastníka a nic se nesynchronizuje oběma směry: zadání z Pipedrive
 * (zákazník, adresa, typ zakázky) se čte do kalkulace; co vznikne
 * v kalkulaci (krycí list řídící varianty), se zapisuje do Pipedrive a do
 * kalkulace se zpátky nečte. Ruční změnu takového pole v Pipedrive přepíše
 * další zápis řídící varianty — obchodník ji uvidí v potvrzení (#115).
 * ============================================================ */

/* Typy polí Pipedrive, které smí stát za údajem daného druhu. */
const TYP = {
  text: ['varchar', 'text', 'varchar_auto'],
  cislo: ['double'],
  procento: ['double'],
  datum: ['date'],
  volba: ['enum'],
  volby: ['set'],
  mena: ['monetary'],
  uzivatel: ['user'],
  osoba: ['people'],
  organizace: ['org'],
};

/* Jedna definice = JEDNO pole Pipedrive. Kdo by tentýž název zapsal
 * dvakrát, dostal by dva zápisy do jednoho pole — hlídá test.
 *
 *   klic   stálý klíč u nás (`pdDealNaNase` a přehled mapy ho čtou),
 *   nazev  PŘESNÝ název pole v Pipedrive (podle tabulky s integrátorem),
 *   druh   co za údaj to je (určuje dovolený typ pole i převod hodnoty),
 *   kl     pole krycího listu OCK / PROJ, se kterým údaj souvisí — u zápisu
 *          zdroj hodnoty (id pole; seznam id = údaj složený z více polí;
 *          „@…" = údaj z kalkulace),
 *   smer   jediný vlastník: 'cteni' zdrojem je CRM (čte se do kalkulace, nikdy
 *          se nezapisuje) · 'zapis' zdrojem je kalkulace (zapisuje se, do
 *          kalkulace se nečte) · 'nic' kalkulátor pole jen zná (plní ho
 *          člověk nebo automatizace). Obousměrné pole neexistuje.
 *   prevod zvláštní převod hodnoty (`pd_prevod.mjs`).
 *
 * Kdo pole čte a kdo do něj píše, rozhoduje jen tahle tabulka — zápis
 * (#115) se podle ní řídí, nic jiného si nevymýšlí. */
const D = (klic, nazev, druh, kl, smer, navic) =>
  Object.assign({ klic, nazev, popis: nazev, druh, typ: TYP[druh], kl: kl || null, smer }, navic || {});

export const POLE_DEALU = [
  /* --- pole, která v Pipedrive byla už před 21. 10. 2026 --- */
  D('typZakazky', 'Typ zakázky', 'volba', null, 'cteni'),
  D('adresaStavby', 'Adresa realizace', 'text', null, 'cteni'),
  /* Kdo poptávku přinesl — NE zákazník (ten je organizace a osoba dealu,
   * viz hlavička). Kalkulátor pole zná, aby ho přehled mapy nehlásil jako
   * nezařazené; do kalkulace ho zatím nepřebírá. */
  D('zdrojFirma', 'Zdroj poptávky - Organizace', 'organizace', null, 'cteni'),
  D('zdrojOsoba', 'Zdroj poptávky - Osoba', 'osoba', null, 'cteni'),
  /* Obchodníci ho vyplňují v Pipedrive (21. 10. 2026: u 85 z 85 vyhraných
   * dealů, 83× po datu výhry) — zdrojem je CRM. V kalkulaci jen předvyplní
   * Konečné předání díla (krycí list OCK); kalkulace ho nepřepisuje. */
  D('terminPlneni', 'Předpokládané datum ukončení realizace', 'datum', { ock: 'terminPredani' }, 'cteni'),
  D('zpusobFakturace', 'Způsob fakturace', 'volba', { ock: 'zpusobFakturace', proj: 'zpusobFakturace' }, 'zapis', {
    /* P10.5 (J. V. 29. 9. 2026): „náš standard je 50, 40, 10" — tedy po
     * milnících; dřívější výchozí „Náš standard / měsíční" aplikace čte
     * jako „Po milnících". */
    synonyma: { 'po milnicich': 'Náš standard', 'nas standard mesicni': 'Náš standard',
      'po dokonceni jednotlivych stupnu dokumentace': 'Po dokončení stupňů dokumentace' } }),
  D('splatnostDni', 'Splatnost faktur (dny)', 'cislo', { ock: 'splatnostDni', proj: 'splatnostDni' }, 'zapis'),
  /* Jen OCK. PROJ má proměnný plán plateb a jeho platby nese „Platební
   * kalendář SoD PROJ"; zálohu PROJ kalkulátor neposílá ani u nabídky
   * z doby před plánem (rozhodnutí J. V. 23. 10. 2026, #512). */
  D('zaloha1Proc', 'První splátka (%)', 'procento', { ock: 'zaloha1' }, 'zapis'),
  D('faktura2Proc', 'Druhá splátka (%)', 'procento', { ock: 'faktura2' }, 'zapis'),
  D('fakturaKoncProc', 'Třetí splátka (%)', 'procento', { ock: 'fakturaKonc' }, 'zapis'),
  D('zarukaMesicu', 'Doba trvání záruky (počet měsíců)', 'cislo', { ock: 'zarukaMesicu' }, 'zapis'),
  D('zadrzneProc', 'Zádržné – do odstranění VaN', 'volba', { ock: ['zadrzne', 'zadrzneProc'] }, 'zapis',
    { prevod: 'zadrzne' }),
  D('pokutaProcDen', 'Smluvní pokuta – prodlení dodávky / odevzdání (% / den)', 'cislo',
    { ock: 'pokutaDodavka', proj: 'pokutaTermin' }, 'zapis'),

  /* --- nová pole od integrátora (21. 10. 2026) --- */
  D('cisloNabidky', 'Číslo nabídky (CN)', 'text', { ock: 'cisloCN', proj: 'cisloCN' }, 'zapis'),
  /* Uživatel, osoba, organizace: hodnotou je ID záznamu v Pipedrive. Krycí
   * list drží jména a kontakty jako text; uživatele dohledá až zápis (#115)
   * podle e-mailu, osoby a organizace kalkulátor jen čte (vrstva 2, §5.2). */
  D('nabidkuVypracoval', 'Nabídku vypracoval', 'uzivatel', { ock: 'dodZpracoval', proj: 'dodZpracoval' }, 'zapis'),
  D('priplatkyNabidka', 'Příplatky v nabídce', 'text', { ock: 'priplatkyNabidka' }, 'zapis'),
  D('hlavniProjektant', 'Hlavní projektant', 'uzivatel', { proj: 'hlavniProjektant' }, 'zapis'),
  D('odpovednaOsoba', 'Odpovědná osoba za projekci', 'uzivatel', { proj: 'odpovednyEmail' }, 'zapis'),
  D('kontaktSmluvni', 'Kontakt – ve věcech smluvních', 'osoba',
    { ock: 'zastSmluvniJmeno', proj: 'zastSmluvniJmeno' }, 'cteni'),
  D('kontaktObchodni', 'Kontakt – ve věcech obchodních', 'osoba',
    { ock: 'zastObchodniJmeno', proj: 'zastObchodniJmeno' }, 'cteni'),
  D('kontaktTechnicky', 'Kontakt – ve věcech technických', 'osoba',
    { ock: 'zastTechnickyJmeno', proj: 'zastTechnickyJmeno' }, 'cteni'),
  D('typSmlouvy', 'Typ smlouvy', 'volba', { ock: 'typSmlouvy', proj: 'typSmlouvy' }, 'zapis',
    { synonyma: { 'cizi': 'Smlouva zákazníka' } }),
  D('typProjektu', 'Typ projektu', 'volba', { ock: 'typProjektu', proj: 'typProjektu' }, 'zapis'),
  D('pamatkovaOchrana', 'Objekt v památkové ochraně', 'volba', { proj: 'pamatkovaOchrana' }, 'zapis'),
  D('licence', 'Licence k projektové dokumentaci', 'volba', { proj: 'autorskaPrava' }, 'zapis',
    { podleZacatku: true }),
  D('platnostMesicu', 'Platnost nabídky (měsíce)', 'cislo', { ock: 'platnostNabidky', proj: 'platnostNabidky' },
    'zapis', { jednotka: 'mesic' }),
  D('zadrzneZaruka', 'Zádržné – po dobu záruky', 'volba', { ock: ['zadrzneZaruka', 'zadrzneZarukaProc'] }, 'zapis',
    { prevod: 'zadrzne' }),
  D('pokutaSplatnost', 'Smluvní pokuta – prodlení splatnosti (% / den)', 'cislo',
    { ock: 'pokutaSplatnost', proj: 'pokutaSplatnost' }, 'zapis'),
  D('pokutaLimit', 'Limit smluvních pokut (%)', 'cislo', { ock: 'pokutaLimit', proj: 'pokutaLimit' }, 'zapis',
    { prevod: 'limit' }),
  D('podminkyJine', 'Platební podmínky – jiné', 'text', { ock: 'pokutyJine', proj: 'pokutyJine' }, 'zapis'),
  /* Sazba DPH se do kalkulace z CRM nikdy nečte — rozhoduje o ceně. */
  D('sazbaDph', 'Sazba DPH', 'volba', { ock: ['sazbaDph', 'sodDphRezim'], proj: ['sazbaDph'] }, 'zapis',
    { prevod: 'dph' }),
  D('pojisteni', 'Pojištění odpovědnosti projektanta', 'volba', { proj: 'pojisteni' }, 'zapis',
    { podleZacatku: true }),
  D('terminDodaniTydny', 'Termín dodání OCK (týdny)', 'cislo', { ock: 'terminDodani' }, 'zapis', { jednotka: 'tyden' }),
  D('atyp', 'ATYP', 'volba', { ock: '@atyp' }, 'zapis', { prevod: 'atyp' }),
  /* OCK předvyplňuje datum podpisu DATEM TISKU — to není podpis, posílá se
   * jen ručně zadané datum (rozbor 6. 10., #23). */
  D('datumPodpisu', 'Datum podpisu smlouvy', 'datum', { ock: 'sodDatumPodpisu', proj: 'terminZahajeni' }, 'zapis',
    { jenRucne: ['ock'] }),
  D('terminPrevzeti', 'Převzetí staveniště k montáži šachty', 'datum', { ock: 'terminPrevzeti' }, 'zapis'),
  D('terminMontaz', 'Ukončení montáže šachty a předání montáži výtahu', 'datum', { ock: 'terminMontaz' }, 'zapis'),
  D('terminZamereni', 'Předání výstupů ze zaměření', 'datum', { proj: 'terminZamereni' }, 'zapis'),
  D('terminStudie', 'Odevzdání studie proveditelnosti', 'datum', { proj: 'terminStudie' }, 'zapis'),
  D('terminDpz', 'Odevzdání DPZ', 'datum', { proj: 'terminDpz' }, 'zapis'),
  D('terminPovoleni', 'Předpoklad povolení záměru', 'datum', { proj: 'terminPovoleni' }, 'zapis'),
  D('terminDps', 'Odevzdání DPS', 'datum', { proj: 'terminDps' }, 'zapis'),
  D('terminJine', 'Jiné termíny', 'text', { ock: 'terminJine', proj: 'terminJine' }, 'zapis'),
  D('odchylky', 'Odchylky oproti smluvnímu standardu', 'text', { ock: 'odchylky' }, 'zapis'),
  /* Odvozené z kalkulace (3D sken, sekce DPZ/DPS) — z CRM se nečtou. */
  D('zamereniStrojovna', 'Zaměření strojovny', 'volba', { ock: 'zamereniStrojovna' }, 'zapis'),
  D('situacniFoto', 'Situační fotografie', 'volba', { ock: 'situacniFoto' }, 'zapis'),
  D('dokumentace', 'Dokumentace v rozsahu', 'volby', { ock: ['dsp', 'provadeciDok'] }, 'zapis',
    { prevod: 'dokumentace' }),
  D('cenaNezahrnuje', 'Cena nezahrnuje', 'text', { ock: 'cenaNezahrnuje', proj: 'cenaNezahrnuje' }, 'zapis'),
  D('rozsahJine', 'Jiné dohodnuté činnosti', 'text', { proj: 'rozsahJine' }, 'zapis'),
  /* Platby 1–8 kalkulátor NEPLNÍ — ani u nabídky PROJ z doby před plánem
   * plateb (rozhodnutí J. V. 23. 10. 2026, #512). Nové nabídky mají proměnný
   * plán, osm pevných částek by u nich lhalo. Pole zůstávají v mapě, aby je
   * přehled nehlásil jako nezařazená; platby nese kalendář níž. */
  D('platba1', 'Platba 1 – po podpisu smlouvy', 'mena', null, 'nic'),
  D('platba2', 'Platba 2 – při předání 2D výstupů ze zaměření', 'mena', null, 'nic'),
  D('platba3', 'Platba 3 – DPZ pro podání na dotčené orgány', 'mena', null, 'nic'),
  D('platba4', 'Platba 4 – DPZ pro podání na stavební úřad', 'mena', null, 'nic'),
  D('platba5', 'Platba 5 – po vydání pravomocného povolení záměru', 'mena', null, 'nic'),
  D('platba6', 'Platba 6 – po předání kompletní DPS', 'mena', null, 'nic'),
  D('platba7', 'Platba 7 – po dokončení ekonomické zadávací části', 'mena', null, 'nic'),
  D('platba8', 'Platba 8 – po doporučení dodavatele realizace', 'mena', null, 'nic'),
  /* Seznam plateb smlouvy o dílo PROJ, jedna věta na platbu („Platba ve výši
   * … Kč + DPH proběhne <milník>.") — tentýž text jako {{SODP_PLATEBNI_KALENDAR}}
   * ze stejného dopočtu (planPdKalendar v src/plan_plateb.js). Jen Velký
   * text: krátký text pojme 255 znaků a delší plán by se nevešel. Dokud pole
   * integrátor nezaloží, přehled ho hlásí jako chybějící a nic se nezapisuje. */
  D('platebniKalendar', 'Platební kalendář SoD PROJ', 'text', { proj: '@kalendar' }, 'zapis', { typ: ['text'] }),
  D('spravniPoplatky', 'Správní poplatky stavebnímu úřadu (nad rámec ceny)', 'mena',
    { proj: 'sodpSpravniPoplatky' }, 'zapis'),
  D('pokutaSoucinnost', 'Pokuta za prodlení zákazníka se součinností (Kč / den)', 'mena',
    { ock: 'sodPokutaDenni', proj: 'sodpPokutaDenni' }, 'zapis'),
  D('podpisFirma', 'Podepisující firma (pokud jiná)', 'organizace',
    { ock: 'objPodpisFirma', proj: 'objPodpisFirma' }, 'cteni'),
  D('podpis2', 'Druhý podepisující za zákazníka', 'osoba', { ock: 'objPodpis2Jmeno', proj: 'objPodpis2Jmeno' }, 'cteni'),
  D('kopie1', 'Faktury v kopii na (1)', 'text', { ock: 'objKopie1', proj: 'objKopie1' }, 'zapis'),
  D('kopie2', 'Faktury v kopii na (2)', 'text', { ock: 'objKopie2', proj: 'objKopie2' }, 'zapis'),
  /* Datum narození a bydliště zmocnitele jsou osobní údaje plné moci — do CRM
   * je kalkulátor nekopíruje (rozbor 6. 10., P6). */
  D('zmocnitel', 'Zmocnitel (plná moc)', 'osoba', null, 'nic'),
  /* Krycí list drží, KDO byl informován (text); datum plní automatizace. */
  D('informovanoBo', 'Informováno Backoffice', 'datum', null, 'nic'),
  D('informovanoTech', 'Informováno Technické odd.', 'datum', null, 'nic'),
];

/* Pole organizace. IČ je v účtu číselné; „IČO" se bere taky, kdyby se pole
 * jednou založilo pod tímhle jménem. */
export const POLE_ORGANIZACE = [
  Object.assign(D('ico', 'IČ', 'cislo', null, 'cteni'), { nazvy: ['IČ', 'IČO'], typ: ['double', 'varchar', 'text'] }),
  D('typOrganizace', 'Role', 'volba', null, 'cteni'),
];

/* Verze tvaru uložené mapy (cache v pd_pole.mjs). Mapa z doby párování
 * podle vzorů (do 21. 10. 2026) nesla tři pole spárovaná se špatným polem
 * CRM — po nasazení se nesmí číst ani do konce své jednodenní platnosti. */
export const PD_POLE_VERZE = 2;

/* Vlastní pole, která čte detail dealu (pdDealNaNase). Jen o těchhle má
 * obchodník slyšet, když v CRM chybí — chybějící pole pro zápis řeší
 * přehled mapy. Zákazník a kontakt jsou standardní pole dealu, mapu nepotřebují. */
export const PD_CTENI = ['typZakazky', 'adresaStavby', 'terminPlneni'];

/* Název pole pro porovnání: velikost písmen, mezery a druh pomlčky (‐ – — -)
 * nerozhodují; diakritika ano („Typ zakázky" není „Typ zakazky"). */
export function pdNazevNorm(n) {
  return String(n == null ? '' : n).normalize('NFC').trim().toLocaleLowerCase('cs')
    .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, ' ');
}

/* Z odpovědi `dealFields` / `organizationFields` udělá mapu klíč → hash.
 * Bere JEN vlastní pole (jejich klíč je čtyřicetiznakový hash) a páruje
 * PŘESNĚ podle názvu a typu:
 *   chybi          pole s tím názvem v CRM není,
 *   typNesedi      název sedí, typ ne (do pole se nezapisuje — zápis čísla
 *                  do výběru by Pipedrive odmítl, nebo hůř přijal),
 *   nejednoznacne  pole s tím názvem je v CRM víckrát,
 *   nezarazeno     vlastní pole CRM, která mapa nezná (pro přehled #114).
 * Ani jeden z prvních tří případů se do mapy nedostane. */
export function pdMapaZPoli(pole, definice = POLE_DEALU) {
  const vlastni = (pole || [])
    .filter((p) => p && p.is_custom_field !== false && p.edit_flag !== false)
    .filter((p) => /^[0-9a-f]{40}$/.test(String(p.field_code || p.key || '')))
    .map((p) => ({
      hash: String(p.field_code || p.key),
      nazev: String(p.field_name || p.name || ''),
      typ: String(p.field_type || ''),
      volby: Array.isArray(p.options) ? p.options : null,
      zapisovatelne: p.is_writable !== false,
    }));
  const podleNazvu = new Map();
  for (const p of vlastni) {
    const k = pdNazevNorm(p.nazev);
    podleNazvu.set(k, (podleNazvu.get(k) || []).concat([p]));
  }

  const mapa = {}, popisy = {}, chybi = [], typNesedi = [], nejednoznacne = [], pouzite = new Set();
  for (const d of definice) {
    const nazvy = d.nazvy || [d.nazev];
    const kandidati = [...new Set(nazvy.flatMap((n) => podleNazvu.get(pdNazevNorm(n)) || []))];
    const zaznam = { klic: d.klic, popis: d.popis, nazev: d.nazev };
    if (!kandidati.length) { chybi.push(zaznam); continue; }
    if (kandidati.length > 1) { nejednoznacne.push(Object.assign(zaznam, { pocet: kandidati.length })); continue; }
    const p = kandidati[0];
    if (d.typ && !d.typ.includes(p.typ)) {
      typNesedi.push(Object.assign(zaznam, { ocekavano: d.typ.join(' / '), je: p.typ }));
      continue;
    }
    mapa[d.klic] = p.hash;
    popisy[d.klic] = { nazev: p.nazev, typ: p.typ, volby: p.volby, zapisovatelne: p.zapisovatelne };
    pouzite.add(p.hash);
  }
  return {
    mapa, popisy, chybi, typNesedi, nejednoznacne,
    nezarazeno: vlastni.filter((p) => !pouzite.has(p.hash))
      .map((p) => ({ hash: p.hash, nazev: p.nazev, typ: p.typ })),
  };
}

/* Vlastní pole mají ve v2 různý tvar podle typu: číslo, text, ale
 * u výběru objekt {id,label}, u peněz {value,currency}, u adresy objekt
 * s podklíči a u vícevýběru pole. Tohle je jediné místo, kde se to rozplétá. */
export function pdHodnota(surova) {
  if (surova === null || surova === undefined) return '';
  if (Array.isArray(surova)) return surova.map(pdHodnota).filter(Boolean).join(', ');
  if (typeof surova === 'object') {
    if (surova.label !== undefined) return String(surova.label);
    if (surova.formatted_address) return String(surova.formatted_address);
    if (surova.value !== undefined) return pdHodnota(surova.value);
    return '';
  }
  return String(surova);
}

/* IČO z pole organizace. V účtu je to pole typu ČÍSLO, takže IČO s nulami
 * na začátku (00064581) Pipedrive drží jako 64581 — a takové by neprošlo
 * kontrolním součtem ani ARES. České IČO má vždy osm číslic, nuly se tedy
 * doplní zleva. Co číslem není (nebo je delší), se vrátí, jak je — nic se
 * nevymýšlí. */
export function pdIco(surova) {
  const t = pdHodnota(surova).replace(/\s+/g, '');
  const m = /^(\d{1,8})(?:\.0+)?$/.exec(t);
  return m ? m[1].padStart(8, '0') : t;
}

/* Číslo nabídky z názvu dealu. Na skutečném účtu tenhle tvar splňuje
 * 92,9 % dealů (`CN-84 …`), dalších 4,5 % má tvar `OPR12-2025`.
 * Když se netrefíme, vrátíme prázdno a číslo si obchodník doplní sám —
 * hádat číslo nabídky by bylo horší než ho nechat prázdné. */
export function pdCisloZNazvu(nazev) {
  const m = /^\s*(CN|OVP-CN|OPR)[\s-]*([0-9]+(?:[-/][0-9]+)?)/i.exec(String(nazev || ''));
  return m ? (m[1].toUpperCase() + '-' + m[2]) : '';
}

/* Zbytek názvu za číslem = název akce. */
export function pdNazevAkce(nazev) {
  const t = String(nazev || '').trim();
  const m = /^\s*(?:CN|OVP-CN|OPR)[\s-]*[0-9]+(?:[-/][0-9]+)?\s*[-–—:]?\s*(.*)$/i.exec(t);
  return (m && m[1].trim()) || t;
}

/* Sestaví z dealu (a z jeho organizace a osoby) zadání pro hlavičku nové
 * kalkulace: číslo a název akce, adresu, zákazníka, IČO, kontakt a typ
 * zakázky. Podmínky krycího listu (splatnost, zálohy, záruka, pokuty) se
 * z CRM NEČTOU — jejich vlastníkem je kalkulace a do Pipedrive se zapisují
 * (pravidlo J. V. 21. 10. 2026, viz hlavička).
 *
 * Zásada: cena se NEPŘEBÍRÁ do výpočtu. `hodnotaCrm` se vrací jen pro
 * porovnání „v CRM je X, spočítali jste Y" — cena je vždycky výsledek
 * kalkulace, nikdy převzaté číslo (pravidlo projektu: ceny se nevymýšlejí). */
export function pdDealNaNase(deal, mapa, dopln = {}) {
  const d = deal || {};
  const cf = d.custom_fields || {};
  const ber = (klic) => (mapa && mapa[klic] ? pdHodnota(cf[mapa[klic]]) : '');
  const org = dopln.organizace || null;
  const osoba = dopln.osoba || null;
  const icoHash = dopln.mapaOrganizace && dopln.mapaOrganizace.ico;

  const kontakty = (o) => {
    const e = ((o && o.emails) || []).map((x) => x && x.value).filter(Boolean);
    const t = ((o && o.phones) || []).map((x) => x && x.value).filter(Boolean);
    return [e[0], t[0]].filter(Boolean).join(', ');
  };

  return {
    id: d.id,
    /* --- hlavička kalkulace --- */
    cislo: pdCisloZNazvu(d.title),
    nazevAkce: pdNazevAkce(d.title),
    adresa: ber('adresaStavby'),
    objednatel: (org && org.name) || '',
    ico: (org && icoHash && pdIco((org.custom_fields || {})[icoHash])) || '',
    kontakt: osoba ? [osoba.first_name, osoba.last_name].filter(Boolean).join(' ') : '',
    kontaktObjednatel: kontakty(osoba),
    typZakazky: ber('typZakazky'),
    terminPlneni: ber('terminPlneni'),
    /* --- informativní, do výpočtu nevstupuje --- */
    hodnotaCrm: typeof d.value === 'number' ? d.value : null,
    mena: d.currency || '',
    faze: d.stage_id || null,
    stav: d.status || '',
    aktualizovano: d.update_time || '',
  };
}

/* Konečná faktura, když chybí třetí splátka — dopočítá se do sta procent.
 * Vrací prázdno, když zálohy nedávají smysl, ať se do krycího listu
 * nedostane nesmysl. (Detail dealu ji od 21. 10. 2026 nevolá: podmínky
 * se z CRM nečtou.) */
export function pdZbytekDoSta(zaloha, faktura2) {
  /* Prázdno není nula (pravidlo projektu). `Number('')` je nula, takže bez
   * téhle kontroly by z chybějící zálohy vyšla konečná faktura 60 % — číslo,
   * které nikdo nezadal a které by se dostalo do krycího listu. */
  if (String(zaloha).trim() === '' || String(faktura2).trim() === '') return '';
  const a = Number(String(zaloha).replace(',', '.'));
  const b = Number(String(faktura2).replace(',', '.'));
  if (!isFinite(a) || !isFinite(b)) return '';
  const z = 100 - a - b;
  return (z > 0 && z < 100) ? String(Math.round(z * 100) / 100) : '';
}

/* ============================================================
 * PŘEHLED MAPY POLÍ PRO NASTAVENÍ (#114, 26. 10. 2026)
 *
 * Z uložené mapy (pdPoleMapa) složí řádky pro administrátora: každé pole
 * kalkulace jedním řádkem se stavem
 *   sparovano      pole v CRM je, název i typ sedí,
 *   chybi          pole s dohodnutým názvem v CRM není (i přejmenované),
 *   typNesedi      název sedí, typ ne — nečte se ani nezapisuje,
 *   nejednoznacne  název je v CRM víckrát — nečte se ani nezapisuje,
 * a k tomu seznam nezařazených vlastních polí CRM. Ruční přiřazení se
 * nedělá: název je dohoda s integrátorem (hlavička souboru).
 *
 * Skládá se při každé odpovědi z mapy v cache a z definic v kódu — změna
 * definic se tak v přehledu ukáže hned, ne až po vypršení cache.
 * ============================================================ */
export const PD_PREHLED_STAVY = ['sparovano', 'chybi', 'typNesedi', 'nejednoznacne'];

/* Zdroj podle krycího listu: OCK, PROJ, obojí, nebo nic (pole jen čte CRM). */
function pdPrehledZdroj(kl) {
  if (!kl) return [];
  return ['ock', 'proj'].filter((k) => kl[k] != null && kl[k] !== '').map((k) => k.toUpperCase());
}

function pdPrehledOblast(oblast, definice, m) {
  const najdi = (s, klic) => (s || []).find((x) => x && x.klic === klic) || null;
  return definice.map((d) => {
    const r = {
      oblast, klic: d.klic, nazev: d.nazev, druh: d.druh,
      typ: (d.typ || []).join(' / '), smer: d.smer, zdroj: pdPrehledZdroj(d.kl),
      stav: 'chybi', crmNazev: '', crmTyp: '', pocet: 0, zapisovatelne: null,
    };
    const hash = m.mapa && m.mapa[d.klic];
    if (hash) {
      const p = (m.popisy && m.popisy[d.klic]) || {};
      r.stav = 'sparovano';
      r.crmNazev = p.nazev || d.nazev;
      r.crmTyp = p.typ || '';
      r.zapisovatelne = p.zapisovatelne !== false;
      return r;
    }
    const t = najdi(m.typNesedi, d.klic);
    if (t) { r.stav = 'typNesedi'; r.crmNazev = t.nazev || d.nazev; r.crmTyp = t.je || ''; return r; }
    const n = najdi(m.nejednoznacne, d.klic);
    if (n) { r.stav = 'nejednoznacne'; r.pocet = n.pocet || 2; return r; }
    /* Ani v mapě, ani v žádném seznamu (mapa z jiné sady definic) = chybí:
     * nečte se ani nezapisuje, takže to administrátor vidět musí. */
    return r;
  });
}

export function pdPrehledMapy(m, defDealu = POLE_DEALU, defOrg = POLE_ORGANIZACE) {
  const x = m || {};
  const radky = pdPrehledOblast('deal', defDealu, x).concat(pdPrehledOblast('organizace', defOrg, {
    mapa: x.mapaOrganizace, popisy: x.popisyOrganizace, typNesedi: x.typNesediOrganizace,
    nejednoznacne: x.nejednoznacneOrganizace,
  }));
  /* Pole, jehož název definice zná, je už v řádcích jako „jiný typ" nebo
   * „dvakrát" — mezi nezařazenými by se hlásilo podruhé. */
  const zname = new Set(defDealu.flatMap((d) => d.nazvy || [d.nazev]).map(pdNazevNorm));
  const nezarazeno = (x.nezarazeno || []).filter((p) => !zname.has(pdNazevNorm(p.nazev)))
    .map((p) => ({ nazev: String(p.nazev || ''), typ: String(p.typ || '') }))
    .sort((a, b) => a.nazev.localeCompare(b.nazev, 'cs'));
  const souhrn = { celkem: radky.length, nezarazeno: nezarazeno.length };
  for (const s of PD_PREHLED_STAVY) souhrn[s] = radky.filter((r) => r.stav === s).length;
  return { radky, nezarazeno, souhrn, poridano: x.poridano || null, verze: x.verze || null };
}

/* ============================================================
 * DOHODNUTÁ POLE BEZ TOKENU (#536, 27. 10. 2026)
 *
 * Definice polí dealu a organizace ve tvaru odpovědi API v2
 * (`dealFields` / `organizationFields`) složené z tabulky v kódu — tedy
 * z toho, co je dohodnuté s integrátorem, ne z účtu. Používají ji dvě místa:
 *   · simulátor Pipedrive (lib/pipedrive_simulator.mjs) jako odpověď API,
 *   · suchý běh zápisu (/api/pd/nanecisto), když napojení není nastavené —
 *     náhled pak říká „podle dohodnuté tabulky, neověřeno v CRM".
 *
 * Názvy a typy jsou z POLE_DEALU; volby výběrových polí jsou SKUTEČNÉ texty
 * voleb z účtu (stav 21. 10. 2026, tytéž jako v netlify/test_pd_prevod.mjs).
 * ID voleb ani hashe polí skutečné nejsou: hash je odvozený z názvu, takže
 * je stálý a nikdy se nepotká se skutečným (skutečný je náhodný). Pole, které
 * v Pipedrive dosud chybí (Platební kalendář SoD PROJ), se bez `vsechna`
 * nevrací — simulátor tak ukazuje dnešní stav účtu.
 * ============================================================ */
export const PD_VOLBY_UCTU = {
  typZakazky: ['Realizace', 'Projekce'],
  zpusobFakturace: ['Náš standard', 'Měsíční', 'Po dokončení stupňů dokumentace'],
  zadrzneProc: ['Ne', '5%', '10%', '15%', '20%'],
  zadrzneZaruka: ['Ne', '5%', '10%', '15%', '20%'],
  typSmlouvy: ['Naše bez úprav', 'Naše s úpravami', 'Smlouva zákazníka'],
  typProjektu: ['Nový projekt (novostavba)', 'Rekonstrukce objektu'],
  pamatkovaOchrana: ['Ano', 'Ne'],
  licence: ['Nevýhradní – pro účel stavby dle smlouvy', 'Výhradní'],
  sazbaDph: ['21 %', '12 %', '0 % – přenesená daňová povinnost'],
  pojisteni: ['Ano – dle pojistné smlouvy zhotovitele', 'Ne'],
  atyp: ['Ano', 'Ne'],
  zamereniStrojovna: ['Ano', 'Ne'],
  situacniFoto: ['Ve složce', 'Nejsou k dispozici'],
  dokumentace: ['DSP', 'Prováděcí dokumentace'],
  typOrganizace: ['Investor', 'Výtahová společnost', 'Stavební společnost', 'Správcovská společnost', 'Projektant'],
};
/* Pole, která má účet jako Velký text (ostatní textová jsou krátký text). */
const PD_VELKY_TEXT = ['adresaStavby', 'podminkyJine', 'terminJine', 'odchylky', 'cenaNezahrnuje', 'rozsahJine',
  'platebniKalendar'];
/* Pole, která integrátor k 27. 10. 2026 ještě nezaložil. */
export const PD_DOSUD_NEZALOZENA = ['platebniKalendar'];

/* Stálý čtyřicetiznakový „hash" z názvu (FNV-1a po pěti kolech, bez
 * závislosti na node:crypto — modul se smí načíst kdekoli). */
export function pdHashZNazvu(nazev) {
  let out = '';
  for (let kolo = 0; kolo < 5; kolo++) {
    let h = 0x811c9dc5 ^ (kolo * 0x9e3779b1);
    for (const ch of 'kng-dohoda|' + kolo + '|' + String(nazev)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return out;
}

function pdPoleZDefinic(definice, volby, vsechna, idOd) {
  let id = idOd;
  return definice
    .filter((d) => vsechna || !PD_DOSUD_NEZALOZENA.includes(d.klic))
    .map((d) => {
      const typ = PD_VELKY_TEXT.includes(d.klic) && (d.typ || []).includes('text') ? 'text' : (d.typ || ['varchar'])[0];
      const labels = volby[d.klic];
      return {
        field_code: pdHashZNazvu(d.nazev), field_name: d.nazev, field_type: typ,
        is_custom_field: true, is_writable: true,
        options: labels ? labels.map((label) => ({ id: id++, label })) : null,
      };
    });
}

/* { deal: [...], organizace: [...] } — pole jako z API v2. */
export function pdPoleDohodnuta(volby = {}) {
  const vsechna = !!volby.vsechna;
  return {
    deal: pdPoleZDefinic(POLE_DEALU, PD_VOLBY_UCTU, vsechna, 100),
    organizace: pdPoleZDefinic(POLE_ORGANIZACE, PD_VOLBY_UCTU, vsechna, 900),
  };
}
