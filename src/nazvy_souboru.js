/* ============================================================
 * NÁZVY SOUBORŮ, KTERÉ KALKULÁTOR VYTVÁŘÍ (#533, pokyn J. V. 27. 10. 2026)
 *
 * „Nastav konvenci pojmenování souborů při exportu z kalkuláku, aby
 * respektovaly to, co exportují — např. ceník dnes Cenik_2026-OPR-CN-.xls,
 * přičemž ve skutečnosti obsahuje data OCK i PROJ a měl by tedy být
 * pojmenován např. CENIK_2026-OCK+PROJ_27.10.1.xlsx."
 *
 * Tvar:   TYP_<KLÍČ>-<OBSAH>_<verze aplikace>.<přípona>
 *   TYP     velkými písmeny bez diakritiky (CENIK, ZAKAZKA, NABIDKA, SOD …),
 *           víceslovný typ spojuje pomlčka (KRYCI-LIST, PLNA-MOC);
 *   KLÍČ    u souboru jedné zakázky ČÍSLO ZAKÁZKY (nese rok i pořadí, takže
 *           rok navíc by se jen opakoval), jinak rok (ceník varianty)
 *           nebo datum RRRR-MM-DD (snímek dat k danému dni: záloha,
 *           slovník, konfigurace …);
 *   OBSAH   co v souboru skutečně je: OCK, PROJ, OCK+PROJ, jazyk CZ/EN/DE/FR,
 *           varianta, zákazník … (části spojuje pomlčka, souběh „+");
 *   verze   verze aplikace bez „v" (27.10.1) — jen u interních souborů.
 *           DOKUMENTY PRO ZÁKAZNÍKA (nabídka, smlouva, plná moc, specifikace)
 *           ji nenesou: zákazník by ji zaměnil s revizí nabídky a číslo
 *           nabídky má stát hned za typem;
 *   přípona podle skutečného formátu (xlsx z xlsx.js je opravdový xlsx).
 * Bez mezer a diakritiky; podtržítko jen mezi úseky, uvnitř úseku pomlčka.
 *
 * VÝJIMKY — názvy, které se NEMĚNÍ, protože je hledá jiný nástroj:
 *   otisk_RRRR-MM-DD.json(.gz) a posledni_kopie.json (kopie zálohy na Disk —
 *   hledá je naplánovaná úloha, hlídka i úklid Disku, retence_zaloh.js),
 *   _nastaveni.json a _program.json (složka _DB se čte podle jména),
 *   šablony .docx a jejich jazykové mutace (nesou jméno nahraného souboru,
 *   které rejstřík šablon ukazuje jako verzi), přílohy poznámek (původní
 *   jméno od uživatele). Import / „načíst ze souboru" jméno nekontroluje
 *   nikde — pozná soubor podle obsahu, takže bere staré i nové názvy.
 *
 * Tabulka starý → nový název: podklady/NAZVY_SOUBORU.md,
 * test src/test_nazvy_souboru.js.
 * ============================================================ */

const NAZEV_SLOVO_NABIDKA = { cz: 'NABIDKA', en: 'PRICE-QUOTATION', de: 'ANGEBOT', fr: 'DEVIS' };

/* Jeden úsek názvu: bez diakritiky, mezery a podtržítka → pomlčka, jen
 * bezpečné znaky [A-Za-z0-9.+-]; „2026 - OPR - CN - 555.2" → „2026-OPR-CN-555.2". */
function nazevCast(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^A-Za-z0-9.+-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
}

/* 'v27.10.1' → '27.10.1'; cokoli jiného (vývojový běh, testy) → ''. */
function nazevVerzeAplikace(v) {
  const m = /^v?(\d+\.\d+\.\d+)$/.exec(String(v == null ? '' : v).trim());
  return m ? m[1] : '';
}
function nazevVerzeBuildu() {
  return nazevVerzeAplikace(typeof buildVerze === 'function' ? buildVerze() : '');
}

/* Místní den RRRR-MM-DD (toISOString by po půlnoci SELČ hlásil včerejšek). */
function nazevDen(d) {
  const x = d instanceof Date ? d : (d ? new Date(d) : new Date());
  if (isNaN(x)) return '';
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}
function nazevRok(d) { return nazevDen(d).slice(0, 4); }

/* Obecné složení: { typ, klic, obsah: [..], verze, pripona }.
 * verze: undefined = verze sestavení, false = bez verze, jinak daný řetězec. */
function nazevSouboru(o) {
  const typ = nazevCast(o.typ).toUpperCase() || 'SOUBOR';
  const usek = [nazevCast(o.klic)].concat((o.obsah || []).map(nazevCast)).filter(Boolean).join('-');
  const ver = o.verze === false ? '' : (o.verze === undefined ? nazevVerzeBuildu() : nazevVerzeAplikace(o.verze));
  const pripona = String(o.pripona || '').replace(/^\.+/, '').toLowerCase();
  return typ + (usek ? '_' + usek : '') + (ver ? '_' + ver : '') + (pripona ? '.' + pripona : '');
}

const nazevJazyk = L => String(L || 'cz').toUpperCase();
const nazevCislo = (c, nahrada) => nazevCast(c) || nahrada;
/* Souběh částí („OCK+PROJ"); prázdné vypadnou. */
const nazevSoubeh = casti => casti.filter(Boolean).map(s => String(s).toUpperCase()).join('+');

/* Druhy exportů — JEDINÉ místo, kde se rozhoduje, jak se soubor jmenuje.
 * Každá funkce vrací argument pro nazevSouboru(); `u` jsou údaje volajícího. */
const NAZVY_DRUHY = {
  /* Ceník aktivní varianty do Excelu (Kalkulace → Ceník → Export). Obsahuje
   * list „Ceník OCK" i „Ceník PROJ" (cenikToSheets). */
  cenik: u => ({ typ: 'CENIK', klic: nazevRok(u.datum), obsah: [nazevSoubeh([u.ock !== false && 'OCK', u.proj !== false && 'PROJ'])], pripona: 'xlsx' }),
  /* Platný ceník k přenosu mezi weby (Nastavení → Databáze), číslo verze databáze. */
  'cenik-platny': u => ({ typ: 'CENIK', klic: nazevDen(u.datum), obsah: ['PLATNY', u.verzeCeniku ? 'V' + u.verzeCeniku : '', 'OCK+PROJ'], pripona: 'json' }),
  /* Zakázka jako soubor (všechny varianty OCK i PROJ). */
  zakazka: u => ({ typ: 'ZAKAZKA', klic: nazevCislo(u.cislo, 'NOVA'), obsah: [u.bezCeniku ? 'BEZ-CENIKU' : ''], pripona: 'json' }),
  /* Dokumenty pro zákazníka — bez verze aplikace, přípona .docx / .pdf dodá volající. */
  nabidka: u => ({ typ: NAZEV_SLOVO_NABIDKA[u.jazyk] || NAZEV_SLOVO_NABIDKA.cz,
    klic: nazevCislo(u.cislo, u.oblast === 'proj' ? 'OVP-CN' : 'CN'),
    obsah: [String(u.oblast || 'ock').toUpperCase(), u.zakaznik, u.varianta, nazevJazyk(u.jazyk)], verze: false }),
  sod: u => ({ typ: 'SOD', klic: nazevCislo(u.cislo, u.oblast === 'proj' ? 'OVP-CN' : 'CN'),
    obsah: [String(u.oblast || 'ock').toUpperCase(), u.zakaznik, nazevJazyk(u.jazyk)], verze: false }),
  'plna-moc': u => ({ typ: 'PLNA-MOC', klic: nazevCast(u.cislo), obsah: ['PROJ', 'CZ'], verze: false }),
  specifikace: u => ({ typ: 'SPECIFIKACE', klic: nazevCislo(u.cislo, 'CN'), obsah: ['OCK', nazevJazyk(u.jazyk)], verze: false }),
  /* Interní dokumenty zakázky. */
  'kryci-list': u => ({ typ: 'KRYCI-LIST', klic: nazevCislo(u.cislo, 'CN'),
    obsah: [String(u.oblast || 'ock').toUpperCase(), String(u.list || 'backoffice').toUpperCase()] }),
  protokol: u => ({ typ: 'PROTOKOL', klic: nazevCislo(u.cislo, 'NOVA'), pripona: 'txt' }),
  'detail-polozek': u => ({ typ: 'DETAIL-POLOZEK', klic: nazevCislo(u.cislo, 'NOVA'), obsah: ['VARIANTY'] }),
  porovnani: u => ({ typ: 'POROVNANI-VARIANT', klic: nazevCislo(u.cislo, 'NOVA') }),
  'detail-vypoctu': u => ({ typ: 'DETAIL-VYPOCTU', klic: nazevCislo(u.cislo, 'NOVA'), obsah: ['OCK'] }),
  /* Controlling: předkalkulace jedné zakázky (strany OCK/PROJ, den exportu). */
  predkalkulace: u => ({ typ: 'PREDKALKULACE', klic: nazevCislo(u.cislo, 'ZAKAZKA'),
    obsah: [nazevSoubeh(u.oblasti || []), nazevDen(u.datum)], pripona: u.format || 'xlsx' }),
  /* Mapování nákladových položek na účty (Nastavení → Controlling, jen admin). */
  'controlling-mapovani': u => ({ typ: 'CONTROLLING', klic: nazevDen(u.datum), obsah: ['MAPOVANI'], pripona: 'xlsx' }),
  /* Hromadná předkalkulace za období nebo celá databáze (#508) se zúžením filtru. */
  'predkalkulace-hromadna': u => ({ typ: 'PREDKALKULACE',
    klic: u.vse ? nazevDen(u.datum) : nazevDen(u.od) + '-az-' + nazevDen(u.do),
    obsah: [u.vse ? 'CELA-DB' : ''].concat(u.zuzeni || []), pripona: u.format || 'xlsx' }),
  /* Záloha celé online databáze (stažení administrátorem). */
  zaloha: u => ({ typ: 'ZALOHA', klic: nazevDen(u.datum), obsah: ['ONLINE-DB'], pripona: 'json' }),
  /* Konfigurace aplikace (Nastavení → Konfigurace): vybrané sekce. */
  konfigurace: u => ({ typ: 'KONFIGURACE', klic: nazevDen(u.datum),
    obsah: [u.vse || !(u.sekce || []).length ? 'VSE' : nazevSoubeh(u.sekce)], pripona: 'json' }),
  /* Slovník překladů do Excelu — čeština + jazyky. */
  slovnik: u => ({ typ: 'SLOVNIK', klic: nazevDen(u.datum), obsah: [nazevSoubeh(['CZ'].concat(u.jazyky || []))], pripona: 'xlsx' }),
  'slovnik-jen-v-aplikaci': u => ({ typ: 'SLOVNIK', klic: nazevDen(u.datum), obsah: ['JEN-V-APLIKACI'], pripona: 'csv' }),
  /* Nepřeložené fráze pro překladatele: zdroj (šablona daného typu / specifikace) a jazyk. */
  neprelozene: u => ({ typ: 'NEPRELOZENE', klic: nazevDen(u.datum),
    obsah: [u.sablona ? 'SABLONA-' + String(u.sablona).toUpperCase() : 'SPECIFIKACE', nazevJazyk(u.jazyk)], pripona: 'csv' }),
  /* Data technické specifikace (číselníky a výchozí hodnoty, jen admin). */
  'specifikace-data': u => ({ typ: 'SPECIFIKACE', klic: nazevDen(u.datum), obsah: ['CISELNIKY'], pripona: 'json' }),
  /* Náhled „Co by se zapsalo do Pipedrive“ (suchý běh) jako CSV pro integrátora. */
  'pipedrive-nanecisto': u => ({ typ: 'PIPEDRIVE', klic: nazevCislo(u.cislo, 'NOVA'), obsah: ['NANECISTO'], pripona: 'csv' }),
};

/* nazevExportu('cenik', { ock: true, proj: true }) → 'CENIK_2026-OCK+PROJ_27.10.1.xlsx'.
 * u.verze / u.pripona přebijí výchozí (testy, PDF místo docx). */
function nazevExportu(druh, u) {
  const f = NAZVY_DRUHY[druh];
  if (!f) throw new Error('Neznámý druh exportu: ' + druh);
  const uu = u || {};
  const o = f(uu);
  if (uu.verze !== undefined && o.verze !== false) o.verze = uu.verze;   // dokument pro zákazníka verzi nenese nikdy
  if (uu.pripona !== undefined) o.pripona = uu.pripona;
  return nazevSouboru(o);
}

if (typeof module !== 'undefined') module.exports = {
  NAZEV_SLOVO_NABIDKA, NAZVY_DRUHY, nazevCast, nazevVerzeAplikace, nazevDen, nazevRok, nazevSouboru, nazevExportu,
};
