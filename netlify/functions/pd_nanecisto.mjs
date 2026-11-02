/* Suchý běh zápisu do Pipedrive (#536, 27. 10. 2026).
 *
 * POST /api/pd/nanecisto  { strany: { ock?: zdroj, proj?: zdroj }, zdroje?, dealId?, faze? }
 *   → { ok, rezim, radky: [...], souhrn, varovani: [...], deal: { id, nazev } | null, patch, zastaveno }
 *
 * `faze: 'prodano'` (tlačítko „Prodáno", C4 #540, od #545 2. 11. 2026) přidá
 * přesun dealu do fáze „Vyhrané k podpisu SoD" — stav dealu (status) se
 * NEMĚNÍ, won přepne člověk v Pipedrive až po doručení podepsané SoD. Fáze se
 * čtou z Pipedrive (GET /api/v2/stages); cíl přenastaví proměnná
 * PIPEDRIVE_FAZE_PRODANO (id nebo název). Starý parametr `stav` se odmítne
 * (400) — Prodáno stav nemění. `patch` = tělo PATCH, které by odešlo
 * (pdZamyslenyZapis), nebo null se `zastaveno` = proč by se nezapsalo nic.
 *
 * „Co by se zapsalo do Pipedrive" u otevřené zakázky. Do Pipedrive se NIC
 * NEZAPISUJE — žádný PATCH, žádný POST; funkce jen čte (mapu polí, seznam
 * uživatelů a volitelně deal kvůli porovnání „v CRM je dnes …").
 *
 * `strany` skládá prohlížeč (src/pd_nanecisto.js) z krycích listů řídící
 * varianty: { hodnoty: { id → text }, rucne, atyp, kalendar, cena, mena }
 * — tentýž tvar, jaký čte pdDoPd. `zdroje` = popisky polí kalkulace pro
 * sloupec „Zdroj". Převod a výběr strany dělá pdNanecisto (lib/pd_prevod.mjs)
 * stejně jako budoucí zápis (#115).
 *
 * Mapa polí podle režimu (`rezim` v odpovědi):
 *   pipedrive  skutečná mapa z účtu (pdPoleMapa, cache den),
 *   simulator  mapa ze simulátoru (lib/pipedrive_simulator.mjs),
 *   dohoda     napojení není nastavené — pole a volby podle dohodnuté
 *              tabulky v kódu (pdPoleDohodnuta), neověřeno proti CRM.
 * Práva jako u ostatního čtení z Pipedrive: přihlášení, původ a právo
 * `crm.pipedrive` (pdPristup); dotazy do CRM se počítají do vlastního stropu
 * na uživatele (pdStropCerstvych, druh „nanecisto"). */
import { json } from '../lib/sdilene.mjs';
import { pdNastaveno, pdRezim, pdZavolej, PdChyba, pdPristup, pdStropCerstvych, PD_DEAL_MAX } from '../lib/pipedrive.mjs';
import { POLE_DEALU, pdMapaZPoli, pdPoleDohodnuta } from '../lib/pd_mapa.mjs';
import { pdZamyslenyZapis, PD_FAZE_UCELY, pdFazeKonfigurace } from '../lib/pd_prevod.mjs';
import { pdPoleMapa } from './pd_pole.mjs';

const TELO_MAX = 512 * 1024;
const KLICU_MAX = 400;
const TEXT_MAX = 20000;
const ID_TVAR = /^[A-Za-z0-9_@.-]{1,80}$/;

/* Jen známý tvar, nic navíc (vzor B68): text ke každému id, krátké řetězce,
 * číslo ceny. Co tvar nesplní, se zahodí — náhled se z toho nerozbije. */
function textova(o) {
  const out = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const k of Object.keys(o).slice(0, KLICU_MAX)) {
    if (!ID_TVAR.test(k)) continue;
    const v = o[k];
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = String(v).slice(0, TEXT_MAX);
  }
  return out;
}
export function pdNanecistoStrana(z) {
  if (!z || typeof z !== 'object' || Array.isArray(z)) return null;
  const s = { hodnoty: textova(z.hodnoty), rucne: textova(z.rucne) };
  if (z.atyp === true || z.atyp === false) s.atyp = z.atyp;
  if (typeof z.kalendar === 'string') s.kalendar = z.kalendar.slice(0, TEXT_MAX);
  if (typeof z.cena === 'number' && isFinite(z.cena)) s.cena = z.cena;
  if (typeof z.mena === 'string' && /^[A-Za-z]{3}$/.test(z.mena)) s.mena = z.mena.toUpperCase();
  return s;
}

export default async (req) => {
  const { chyba, relace } = await pdPristup(req);
  if (chyba) return chyba;
  if (req.method !== 'POST') return json({ ok: false, chyba: 'Použijte POST.' }, 405);

  let telo;
  try {
    const text = await req.text();
    if (text.length > TELO_MAX) return json({ ok: false, chyba: 'Podklad pro náhled je příliš velký.' }, 413);
    telo = JSON.parse(text || '{}');
  } catch (e) { return json({ ok: false, chyba: 'Neplatný podklad pro náhled.' }, 400); }
  const vstup = (telo && telo.strany) || {};
  const strany = {};
  for (const k of ['ock', 'proj']) { const s = pdNanecistoStrana(vstup[k]); if (s) strany[k] = s; }
  if (!strany.ock && !strany.proj)
    return json({ ok: false, chyba: 'Zakázka nemá stranu OCK ani PROJ, ze které by se dalo zapisovat.' }, 400);
  const zdroje = { ock: textova(telo.zdroje && telo.zdroje.ock), proj: textova(telo.zdroje && telo.zdroje.proj) };
  const dealTxt = telo.dealId === undefined || telo.dealId === null ? '' : String(telo.dealId).trim();
  if (dealTxt && !/^[0-9]{1,10}$/.test(dealTxt))
    return json({ ok: false, chyba: 'Neplatné číslo obchodního případu.' }, 400);

  if (telo.stav !== undefined && telo.stav !== null)
    return json({ ok: false, chyba: 'Prodáno mění fázi dealu, ne jeho stav (#545) — obnovte stránku.' }, 400);
  const faze = telo.faze === undefined || telo.faze === null ? '' : String(telo.faze);
  if (faze && !Object.prototype.hasOwnProperty.call(PD_FAZE_UCELY, faze))
    return json({ ok: false, chyba: 'Neplatný přesun fáze dealu (prodano).' }, 400);

  const rezim = pdNastaveno() ? pdRezim() : 'dohoda';
  const varovani = [];
  let pole, uzivatele, deal = null, fazeSeznam;
  try {
    if (rezim === 'dohoda') {
      pole = pdMapaZPoli(pdPoleDohodnuta({ vsechna: true }).deal, POLE_DEALU);
      varovani.push('Napojení na Pipedrive není nastavené — náhled stojí na dohodnuté tabulce polí '
        + 'a voleb v kalkulátoru, neověřené proti CRM. Uživatele Pipedrive (např. „Nabídku vypracoval") '
        + 'dohledá až zápis.');
    } else {
      /* Do CRM se jen čte — a i to se počítá do stropu na uživatele. */
      if (!(await pdStropCerstvych(relace.email, 'nanecisto', PD_DEAL_MAX)))
        return json({ ok: false, chyba: 'Náhled zápisu jste za poslední hodinu spustili příliš často. Zkuste to později.' }, 429);
      pole = await pdPoleMapa();
      try {
        const u = await pdZavolej('/api/v1/users');
        uzivatele = Array.isArray(u) ? u.map((x) => ({ id: x.id, name: x.name, email: x.email })) : undefined;
      } catch (e) {
        varovani.push('Seznam uživatelů Pipedrive se nenačetl — uživatelská pole dohledá až zápis.');
      }
      if (dealTxt) {
        try {
          deal = await pdZavolej('/api/v2/deals/' + Number(dealTxt));
        } catch (e) {
          varovani.push('Obchodní případ ' + dealTxt + ' se z Pipedrive nenačetl (' + (e && e.message) + ') — '
            + 'náhled neporovnává s tím, co je v CRM dnes.');
        }
      }
      if (faze) {
        /* Fáze pipeline (#545): kam Prodáno deal přesune. Bez nich se nezapíše nic. */
        try {
          const f = await pdZavolej('/api/v2/stages', { dotaz: { limit: 500 } });
          fazeSeznam = Array.isArray(f) ? f.map((x) => ({ id: x.id, name: x.name, pipeline_id: x.pipeline_id })) : [];
        } catch (e) {
          varovani.push('Fáze pipeline se z Pipedrive nenačetly (' + (e && e.message) + ') — přesun fáze nejde ověřit.');
        }
      }
      if (rezim === 'simulator')
        varovani.unshift('Odpovídá SIMULÁTOR Pipedrive se smyšlenými daty — nic z toho není skutečné CRM.');
    }
  } catch (e) {
    if (e instanceof PdChyba)
      return json({ ok: false, rezim, chyba: e.message }, (e.stav >= 500 || e.stav === 401) ? 502 : e.stav);
    throw e;
  }
  if (!dealTxt) varovani.push('Zakázka nemá číslo obchodního případu Pipedrive — není s čím porovnat.');
  const v = pdZamyslenyZapis(POLE_DEALU, strany, pole, { uzivatele, mena: 'CZK', deal },
    { faze, fazeSeznam, fazeKonfigurace: pdFazeKonfigurace(), dealNenacten: rezim !== 'dohoda' && dealTxt && !deal ? dealTxt : '' }, zdroje);
  return json({ ok: true, rezim, nic: 'Do Pipedrive se nic neodeslalo.', ...v, varovani,
    deal: deal ? { id: deal.id, nazev: deal.title || '', stav: deal.status || '', faze: deal.stage_id || null } : null });
};
export const config = { path: '/api/pd/nanecisto' };
