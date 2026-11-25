/* Zápis prodeje do dealu v Pipedrive (PV #597, rozsah J. V. — PIPEDRIVE_SPUSTENI.md B1).
 *
 * POST /api/pd/prodej { soubor, akce: 'nahled', strany?, zdroje? }
 *   → 200 { ok, rezim, deal: { id, nazev, stav, faze }, radky: [...], souhrn, duvody, zastaveno,
 *           cizi: { cislo } | null, otisk, zapisPovolen, nicKZapisu, hodnotaZdroj, varovani }
 * POST /api/pd/prodej { soubor, akce: 'zapis', strany?, zdroje?, otisk, prevzit? }
 *   → 200 { ok, stav: 'zapsano', zapsano: [názvy polí], razitko, varovani }
 *   400 neplatný požadavek, 401/403 přihlášení / původ / právo crm.pipedrive / kdo nesmí,
 *   404 zakázka, 409 neprodaná, bez dealu, vazba neověřená, zápis zastaven (fáze, stav dealu),
 *   změna od náhledu (kod 'zmeneno'), cizí číslo nabídky (kod 'ciziCislo'), 429 strop,
 *   502/504 Pipedrive, 503 napojení nenastavené / zápis vypnutý (PIPEDRIVE_ZAPIS).
 *
 * Pravidla (zadání dávky PV, B1, #115, #545, #704-7, K8-S3, #588/K40c):
 *   · jen PRODANÁ zakázka (v.prodano), jen kdo prodej smí zapsat: administrátor,
 *     vedoucí, autor zakázky nebo ten, kdo prodal; k tomu právo crm.pipedrive;
 *   · deal id jen z ULOŽENÉ zakázky; zápis jen s platnou vazbou deal ↔ zakázka
 *     (pd_overeni.mjs: vazba z webhooku, nebo odkaz na kalkulaci v dealu);
 *   · hodnotu dealu, kalendář PROJ, ATYP a strany počítá server z uložené
 *     zakázky (lib/pd_prodej.mjs); klient dodává jen texty krycího listu;
 *   · vlastník dealu podle „Čísla nabídky (CN)“ v dealu (#115 B): jiné číslo
 *     zastaví zápis; převzetí jen vědomým `prevzit: true` (tlačítko s
 *     potvrzením) + poznámka k dealu + protokol;
 *   · souběh: otisk (deal, update_time, přesné tělo PATCH, cizí CN) z náhledu
 *     musí sedět při zápisu — jinak 409 a nový náhled;
 *   · jen změněná pole jedním PATCH; stav dealu (status) nikdy;
 *   · časový limit volání a celku, strop pokusů na deal (čerpají i neúspěšné);
 *   · výsledek do záznamu prodeje v.prodano.pipedrive = { stav: 'zapsano', kdy }
 *     nebo { stav: 'chyba', kdy, duvod } a do protokolu zakázky; selhání zápisu
 *     prodej NEZASTAVÍ (prodej je uložený dřív, zápis jde zopakovat).
 * E-maily uživatelů Pipedrive se klientovi nevracejí (jen jména). */
import { uloziste, json, vyhradne } from '../lib/sdilene.mjs';
import { jadro, jadroChyba } from '../lib/jadro.mjs';
import {
  pdPristup, pdNastaveno, pdRezim, pdZavolej, PdChyba, pdStropCerstvych, pdZapisPovolen, PD_ZAPIS_VYPNUTY, PD_DEAL_MAX, PD_CACHE_ULOZISTE,
} from '../lib/pipedrive.mjs';
import { POLE_DEALU, pdHodnota } from '../lib/pd_mapa.mjs';
import { pdZamyslenyZapis, pdFazeKonfigurace, pdDnesPraha } from '../lib/pd_prevod.mjs';
import { pdDohledej } from '../lib/pd_dohledani.mjs';
import { pdDealPatriZakazce } from '../lib/pd_overeni.mjs';
import { pdWebhookOdkaz } from '../lib/pd_webhook.mjs';
import { pdRejstrikZapis, pdProtokol } from '../lib/pd_vazba.mjs';
import { pdPoznamkaObsah } from '../lib/pd_poznamka.mjs';
import { pdPoleMapa } from './pd_pole.mjs';
import { pdNanecistoStrana } from './pd_nanecisto.mjs';
import {
  pdProdejStrany, pdProdejZmeny, pdProdejCnSedi, pdProdejOtisk, pdProdejOznacRadky, pdProdejStavZaznam, pdProdejPrevzetiText,
  pdProdejPrevzetiCeka, pdProdejChybaVeta, PD_PRODEJ_STROP, PD_PRODEJ_VOLANI_MS, PD_PRODEJ_CELKEM_MS,
} from '../lib/pd_prodej.mjs';

const SOUBOR_TVAR = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const TELO_MAX = 512 * 1024;
const OTISK_TVAR = /^[0-9a-f]{32}$/;
const ROLE_VZDY = ['Administrátor', 'Vedoucí'];

/* Moduly náhledu (pdnPodklad, plán plateb, nabídka PROJ) až při prvním
 * použití, s doslovnou cestou (bundler ji vystopuje — jadro_moduly.cjs). */
let PD_JADRO = null;
function jadroPd() {
  if (!PD_JADRO) PD_JADRO = import('../lib/jadro_pd.cjs');
  return PD_JADRO;
}

/* Kdo smí zapsat prodej: administrátor, vedoucí, autor zakázky, kdo prodal. */
export function pdProdejSmi(zak, prodano, relace) {
  const r = relace || {};
  if (ROLE_VZDY.includes(r.role)) return true;
  const ja = String(r.email || '').trim().toLowerCase();
  if (!ja) return false;
  return String((zak && zak.autor) || '').trim().toLowerCase() === ja
    || String((prodano && prodano.kdo) || '').trim().toLowerCase() === ja;
}

/* Časový rozpočet celého požadavku: každé volání nejvýš PD_PRODEJ_VOLANI_MS
 * a dohromady PD_PRODEJ_CELKEM_MS (pod limitem funkce Netlify 10 s). */
function volani() {
  const konec = Date.now() + PD_PRODEJ_CELKEM_MS;
  return (cesta, volby = {}) => {
    const zbyva = konec - Date.now();
    if (zbyva < 200) throw new PdChyba('Pipedrive neodpověděl včas — zápis se nedokončil (časový limit).', 504);
    return pdZavolej(cesta, { ...volby, casLimitMs: Math.min(PD_PRODEJ_VOLANI_MS, zbyva), pokusu: 1 });
  };
}

const chybaPd = (e) => json({ ok: false, chyba: e.message }, (e.stav >= 500 || e.stav === 401) ? 502 : e.stav);

export default async (req) => {
  const { chyba, relace } = await pdPristup(req);
  if (chyba) return chyba;
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);
  let telo;
  try {
    const text = await req.text();
    if (text.length > TELO_MAX) return json({ ok: false, chyba: 'Podklad zápisu je příliš velký.' }, 413);
    telo = JSON.parse(text || 'null');
  } catch (e) { return json({ ok: false, chyba: 'Neplatný JSON.' }, 400); }
  if (!telo || typeof telo !== 'object' || Array.isArray(telo)) return json({ ok: false, chyba: 'Neplatný požadavek.' }, 400);
  const soubor = typeof telo.soubor === 'string' ? telo.soubor : '';
  const akce = ['nahled', 'zapis'].includes(telo.akce) ? telo.akce : '';
  if (!SOUBOR_TVAR.test(soubor) || !akce) return json({ ok: false, chyba: 'Chybí zakázka nebo akce.' }, 400);
  if (telo.stav !== undefined || telo.status !== undefined)
    return json({ ok: false, chyba: 'Prodáno mění fázi dealu, ne jeho stav (#545).' }, 400);
  const otiskKlienta = typeof telo.otisk === 'string' ? telo.otisk : '';
  if (akce === 'zapis' && !OTISK_TVAR.test(otiskKlienta))
    return json({ ok: false, chyba: 'Chybí potvrzení náhledu — nejdřív zobrazte, co se zapíše.' }, 400);
  const prevzit = telo.prevzit === true;
  /* Revize PV V1: texty krycího listu (`strany`) se z požadavku NEČTOU — skládá
   * je server z uložené zakázky; z těla jen popisky zdroje pro tabulku. */
  const zdroje = {};
  for (const k of ['ock', 'proj']) zdroje[k] = (pdNanecistoStrana({ hodnoty: telo.zdroje && telo.zdroje[k] }) || {}).hodnoty || {};

  let ULO, JEKLY;
  try { ({ ULO, JEKLY } = await jadro()); await jadroPd(); } catch (e) { PD_JADRO = null; return jadroChyba(e); }
  const G = globalThis;
  const s = await uloziste('zakazky');
  const prvni = await s.cti('z/' + soubor);
  if (!prvni || typeof prvni !== 'object') return json({ ok: false, chyba: 'Zakázka nenalezena.' }, 404);
  const dealPredem = G.ctrlPdDealIdNorm(prvni.pdDealId) || '';
  /* Revize PV S2: zápis do téhož dealu jeden po druhém (v instanci funkce) —
   * druhý souběžný požadavek přečte deal znovu, uvidí nový update_time → 409. */
  if (akce === 'zapis' && dealPredem) return vyhradne('pd_prodej/deal:' + dealPredem, () => zpracuj(req, relace, s, soubor, akce, otiskKlienta, prevzit, zdroje, ULO, JEKLY, G, telo));
  return zpracuj(req, relace, s, soubor, akce, otiskKlienta, prevzit, zdroje, ULO, JEKLY, G, telo);
};

async function zpracuj(req, relace, s, soubor, akce, otiskKlienta, prevzit, zdroje, ULO, JEKLY, G, telo) {
  const ulozena = await s.cti('z/' + soubor);
  if (!ulozena || typeof ulozena !== 'object') return json({ ok: false, chyba: 'Zakázka nenalezena.' }, 404);
  const prod = G.prodStav(ulozena);
  if (!prod) return json({ ok: false, chyba: 'Zakázka není prodaná — zápis prodeje do Pipedrive jde až po stisku Prodáno.' }, 409);
  if (!pdProdejSmi(ulozena, prod.prodano, relace))
    return json({ ok: false, chyba: 'Prodej do Pipedrive zapisuje autor zakázky, kdo prodal, vedoucí nebo administrátor.' }, 403);
  const deal = G.ctrlPdDealIdNorm(ulozena.pdDealId) || '';
  if (!deal) return json({ ok: false, chyba: 'Zakázka není navázaná na deal v Pipedrive (číslo obchodního případu v Controllingu).' }, 409);
  if (!pdNastaveno()) return json({ ok: false, chyba: 'Napojení na Pipedrive není nastavené — zápis nejde připravit.' }, 503);
  const kdo = String(relace.jmeno || relace.email || '');
  const variantaId = prod.v.id;

  /* Výsledek pokusu o zápis do záznamu prodeje a protokolu (jen akce „zapis“).
   * Zahájené převzetí (S1) se drží, dokud zápis neskončí „zapsano“. */
  const zaznamenej = async (stav, duvod, veta, prevzetiNove = null) => {
    const v = await vyhradne('zakazky/z/' + soubor, async () => {
      const zak = await s.cti('z/' + soubor);
      const p = zak ? G.prodStav(zak) : null;
      if (!p || p.v.id !== variantaId) return {};   // prodej mezitím odemčen — nic se nepřipisuje
      p.v.prodano.pipedrive = pdProdejStavZaznam(stav, duvod, undefined, prevzetiNove || pdProdejPrevzetiCeka(p.v.prodano));
      pdProtokol(zak, kdo, veta);
      const razitko = ULO.uloRazitkoNove();
      zak.uloRazitko = razitko;
      await s.zapis('z/' + soubor, zak);
      return { zak, razitko };
    });
    if (v.zak) await pdRejstrikZapis(s, ULO, vyhradne, v.zak, soubor, v.razitko, String(relace.email || ''));
    return v.razitko || '';
  };
  /* `text` = vlastní pevná věta (do záznamu a protokolu); `podrobnost` = surový
   * text chyby Pipedrive jen do odpovědi (revize PV S4). */
  const selhani = async (status, text, extra = {}, podrobnost = '') => {
    const razitko = await zaznamenej('chyba', text, 'Zápis prodeje do dealu ' + deal + ' se nepovedl: ' + text);
    return json({ ok: false, stav: 'chyba', chyba: text, ...(podrobnost && podrobnost !== text ? { podrobnost } : {}), razitko, ...extra }, status);
  };
  const selhaniPd = (status, e) => selhani(status, pdProdejChybaVeta(e), {}, e && e.message);

  const strop = akce === 'zapis'
    ? await pdStropCerstvych('deal:' + deal, 'prodej-zapis', PD_PRODEJ_STROP)
    : await pdStropCerstvych(relace.email, 'prodej', PD_DEAL_MAX);
  if (!strop) return json({ ok: false, chyba: akce === 'zapis' ? 'Zápis prodeje do tohoto dealu byl za poslední hodinu zkoušen příliš často.'
    : 'Náhled zápisu jste za poslední hodinu spustili příliš často. Zkuste to později.' }, 429);
  /* B235/B236: bez PIPEDRIVE_ZAPIS = ano se do skutečného Pipedrive nic nezapíše (náhled jen čte). */
  if (akce === 'zapis' && !pdZapisPovolen()) return selhani(503, PD_ZAPIS_VYPNUTY);

  const zavolej = volani();
  const varovani = [];
  if (pdRezim() === 'simulator') varovani.push('Odpovídá SIMULÁTOR Pipedrive se smyšlenými daty — nic z toho není skutečné CRM.');
  let pole, dealData, uzivatele, fazeSeznam;
  try {
    pole = await pdPoleMapa();
    /* Platná vazba deal ↔ zakázka (#704-7): vazba z webhooku nebo odkaz v dealu. */
    const ov = await pdDealPatriZakazce(ulozena, deal, { zavolej: (c) => zavolej(c), poleMapa: async () => pole,
      odkaz: pdWebhookOdkaz(soubor, req) }, G);
    if (!ov.ok) return akce === 'zapis' ? selhani(409, ov.duvod, { kod: 'neovereno' })
      : json({ ok: false, stav: 'neovereno', chyba: ov.duvod }, 409);
    dealData = await zavolej('/api/v2/deals/' + Number(deal));
    if (!dealData || typeof dealData !== 'object') throw new PdChyba('Pipedrive deal zakázky nezná.', 404);
    const u = await zavolej('/api/v1/users');
    /* PD2 U6 (a PV N1): uživatel Pipedrive jen aktivní (active_flag). */
    uzivatele = Array.isArray(u) ? u.filter((x) => x && x.active_flag !== false)
      .map((x) => ({ id: x.id, name: String(x.name || '') || ('uživatel Pipedrive ' + x.id), email: x.email })) : undefined;
    const f = await zavolej('/api/v2/stages', { dotaz: { limit: 500 } });
    fazeSeznam = Array.isArray(f) ? f.map((x) => ({ id: x.id, name: x.name, pipeline_id: x.pipeline_id })) : [];
  } catch (e) {
    if (e instanceof PdChyba) return akce === 'zapis' ? selhaniPd(e.stav === 404 ? 404 : 502, e) : chybaPd(e);
    throw e;
  }

  const podklad = pdProdejStrany(ulozena, G, JEKLY);
  if (podklad.chyba) return json({ ok: false, chyba: podklad.chyba }, 409);
  /* PD2: osoby / organizace pro pole „jen do prázdného“ (souběžně, pod lhůtou;
   * při zápisu z dealu čteného ve výhradní sekci — ID jdou do PATCH a otisku). */
  const dohl = await pdDohledej(POLE_DEALU, podklad.strany, pole, dealData, (c, o) => zavolej(c, o));
  const v = pdZamyslenyZapis(POLE_DEALU, podklad.strany, pole,
    { uzivatele, mena: 'CZK', deal: dealData, dohledano: dohl.dohledano, dnes: pdDnesPraha() },
    { faze: 'prodano', fazeSeznam, fazeKonfigurace: pdFazeKonfigurace() }, zdroje);
  const zmeny = v.patch ? pdProdejZmeny(v.patch, dealData) : { patch: null, klice: [], hodnota: false, faze: false };
  if (zmeny.patch && zmeny.patch.status !== undefined) delete zmeny.patch.status;   // #545: stav nikdy (pojistka)
  const mapa = (pole && pole.mapa) || {};
  const cnDealu = mapa.cisloNabidky ? pdHodnota(((dealData.custom_fields || {})[mapa.cisloNabidky])).trim() : '';
  const cisloZak = String((typeof G.zakazkaCisloVedouci === 'function' ? G.zakazkaCisloVedouci(ulozena) : ulozena.cislo) || '');
  const cizi = cnDealu && !pdProdejCnSedi(cisloZak, cnDealu, ulozena) ? cnDealu : '';
  const otisk = pdProdejOtisk(deal, dealData.update_time, zmeny.patch, cizi);
  const radky = pdProdejOznacRadky(v.radky, mapa, zmeny);
  const zapsanoNazvy = radky.filter((r) => r.posle).map((r) => r.nazev);

  if (akce === 'nahled') {
    return json({ ok: true, rezim: pdRezim(), deal: { id: dealData.id, nazev: dealData.title || '', stav: dealData.status || '',
      faze: dealData.stage_id || null }, radky, souhrn: v.souhrn, duvody: v.duvody, zastaveno: v.zastaveno || '',
    cizi: cizi ? { cislo: cizi } : null, otisk, zapisPovolen: pdZapisPovolen(), nicKZapisu: !zmeny.patch,
    hodnotaZdroj: podklad.zdrojCeny.ock === 'sod' ? 'sod' : 'nabidka', varovani });
  }

  /* ---------- ZÁPIS ---------- */
  if (v.zastaveno) return selhani(409, v.zastaveno, { kod: 'zastaveno' });
  if (otiskKlienta !== otisk)
    return json({ ok: false, kod: 'zmeneno', chyba: 'Deal v Pipedrive nebo podklad zápisu se od náhledu změnil — nic se nezapsalo. '
      + 'Zobrazte náhled znovu a potvrďte nové hodnoty.' }, 409);
  if (cizi && !prevzit)
    return json({ ok: false, kod: 'ciziCislo', cislo: cizi, chyba: 'Deal patří nabídce ' + cizi + ' (Číslo nabídky v dealu) — nic se nezapsalo. '
      + 'Převzít deal pro tuto nabídku jde jen vědomým tlačítkem „Převzít deal“.' }, 409);
  /* PŘEVZETÍ (revize PV S1): úmysl do protokolu a záznamu prodeje PŘED PATCH.
   * Proběhne-li PATCH v Pipedrive, ale odpověď nedorazí, další pokus už cizí CN
   * neuvidí — poznámku k dealu a větu „PŘEVZAT“ pak dopíše podle záznamu. */
  const ceka = pdProdejPrevzetiCeka(prod.prodano);
  const prevzetiOd = cizi || (ceka ? ceka.od : '');
  if (cizi) await zaznamenej('chyba', 'Převzetí dealu zahájeno — výsledek zápisu zatím nepotvrzen.',
    'Převzetí dealu ' + deal + ' od nabídky ' + cizi + ' — zahájeno (zápis prodeje)', { od: cizi, kdy: new Date().toISOString() });
  try {
    if (zmeny.patch) await zavolej('/api/v2/deals/' + Number(deal), { metoda: 'PATCH', telo: zmeny.patch });
  } catch (e) {
    if (e instanceof PdChyba) return selhaniPd(e.stav === 504 ? 504 : 502, e);
    throw e;
  }
  try { await (await uloziste(PD_CACHE_ULOZISTE)).smaz('deal:' + deal); } catch (e) { /* cache detailu jen zestárne */ }
  const ted = new Date().toISOString();
  if (prevzetiOd) {
    /* Převzetí (#115 bod 4): poznámka k dealu — kdo, kdy, z jaké zakázky. Chyba poznámky zápis nevrací. */
    try {
      await zavolej('/api/v1/notes', { metoda: 'POST', telo: { deal_id: Number(deal),
        content: pdPoznamkaObsah(pdProdejPrevzetiText(cisloZak, prevzetiOd, relace.jmeno || '', ted)) } });
    } catch (e) {
      varovani.push('Poznámka o převzetí se k dealu nezapsala (' + pdProdejChybaVeta(e) + ') Zápis prodeje proběhl.');
    }
  }
  const veta = 'Zápis prodeje do dealu ' + deal + ' (varianta ' + String((typeof G.variantaCislo === 'function' ? G.variantaCislo(ulozena, prod.v) : variantaId) || '')
    + '): '
    /* PD2: převzetí PŘED výčtem polí — protokol drží 600 znaků a dlouhý výčet
     * (víc zapsaných polí) by větu o převzetí uřízl. */
    + (prevzetiOd ? 'deal PŘEVZAT od nabídky ' + prevzetiOd + (cizi ? '' : ' (dokončeno po nepotvrzeném pokusu)') + '; ' : '')
    + (zapsanoNazvy.length ? 'zapsáno — ' + zapsanoNazvy.join(', ') : 'deal už měl všechny hodnoty, nic se neměnilo');
  const razitko = await zaznamenej('zapsano', '', veta);
  return json({ ok: true, stav: 'zapsano', zapsano: zapsanoNazvy, prevzato: !!prevzetiOd, razitko, varovani });
}

export const config = { path: '/api/pd/prodej' };
