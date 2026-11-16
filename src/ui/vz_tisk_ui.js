/* ============================================================
 * VÍC ZÁKAZNÍKŮ — TISK Z POHLEDU ZÁKAZNÍKA (VZ-E2 #601, návrh § 4, R1, R2)
 *
 * Jediné místo obrazovky, kde se vybírá zákazník pro dokument: otevřený
 * zákazník přepínače (VZ_UI.otevreny, E1), jinak řídící. Vstupy tisku
 * (Word, náhledy, krycí listy, SoD, plná moc, porovnání, specifikace,
 * detail) berou zakázku a variantu odsud — generátory dál čtou
 * zak.objednatel a ostatní zákazníky v pohledu nemají.
 * Zakázka s jedním zákazníkem: vzTiskPohled vrací TÝŽ objekt ZAK (dnešek).
 * ============================================================ */

/* Id otevřeného zákazníka ('' = řídící). */
function vzTiskId() {
  /* E1: vzOtevrenyId srovná jinou zakázku a neplatné id (→ řídící). */
  if (typeof vzOtevrenyId === 'function' && typeof vzRidiciId === 'function' && typeof ZAK !== 'undefined') {
    const id = vzOtevrenyId();
    return id === vzRidiciId(ZAK) ? '' : String(id || '');
  }
  return (typeof VZ_UI !== 'undefined' && VZ_UI && VZ_UI.otevreny) ? String(VZ_UI.otevreny) : '';
}

/* Je funkce víc zákazníků vypnutá? (neznámý stav = vypnutá — bezpečnější) */
function vzTiskVypnuto() {
  return typeof viceZakaznikuZapnuto === 'function' ? !viceZakaznikuZapnuto() : true;
}

/* Zábrana tisku pro otevřeného zákazníka (hláška nebo ''). Volá ji brána
 * dokumentů (dokumentZabrana) i tisky mimo registr. */
function vzTiskZabranaUi(typ, varianta) {
  if (typeof vzTiskZabrana !== 'function' || typeof ZAK === 'undefined') return '';
  return vzTiskZabrana(ZAK, vzTiskId(), varianta || null, typ, { vypnuto: vzTiskVypnuto() });
}

/* Vstup tisku: { zak, varianta } z pohledu otevřeného zákazníka, nebo null
 * (zábrana — hláška už zazněla). `varianta` nepovinná. */
function vzTiskVstup(typ, varianta, stav) {
  const duvod = vzTiskZabranaUi(typ, varianta);
  if (duvod) {
    if (typeof stav === 'function') stav('Dokument nevznikl — ' + duvod);
    if (typeof hlaska === 'function') hlaska(duvod, { nadpis: 'Dokument nelze vytvořit' });
    return null;
  }
  /* E3: dotisk zákazníkovi nese snímek adresáta z jeho razítka (varianta). */
  const komu = vzTiskId();
  const zak = typeof vzTiskPohled === 'function' ? vzTiskPohled(ZAK, komu, varianta || undefined) : ZAK;
  if (!zak) {
    if (typeof hlaska === 'function') hlaska('Zákazník pro tisk v zakázce není.', { nadpis: 'Dokument nelze vytvořit' });
    return null;
  }
  const v = varianta === undefined ? undefined
    : (typeof vzTiskVarianta === 'function' ? vzTiskVarianta(zak, varianta) : varianta);
  if (varianta !== undefined && varianta && !v) {
    if (typeof hlaska === 'function') hlaska('Varianta není nabídka otevřeného zákazníka.', { nadpis: 'Dokument nelze vytvořit' });
    return null;
  }
  return { zak, varianta: v, komu };
}

/* VZ-E3 (#602): pro koho je tisk — do razítka „komu" (zamekPoTisku, okno
 * náhledu). Jen u zakázky s víc zákazníky, jinak null (náhled i zámek
 * bajt po bajtu jako dnes). Id se bere z okamžiku, kdy dokument vznikl. */
function vzTiskZamekNavic(vt) {
  if (typeof vzRezim !== 'function' || typeof ZAK === 'undefined' || !vzRezim(ZAK)) return null;
  const id = vt && typeof vt.komu === 'string' ? vt.komu : vzTiskId();
  return { zakaznik: id || vzRidiciId(ZAK) };
}

/* Pohled bez hlášek (obrazovkové náhledy dat); při chybě ZAK u jednoho
 * zákazníka, jinak pohled řídícího. */
function vzTiskZakTicho() {
  if (typeof vzTiskPohled !== 'function') return ZAK;
  return vzTiskPohled(ZAK, vzTiskId()) || vzTiskPohled(ZAK, '') || ZAK;
}

/* Číslo zakázky do tisku mimo generátory (porovnání, detail, specifikace):
 * u pohledu dalšího zákazníka s písmenem. */
function vzTiskCislo(zak) {
  const c = (zak && zak.cislo) || '';
  return typeof vzPismenoPohledu === 'function' ? vzCisloSPismenem(c, vzPismenoPohledu(zak)) : c;
}

/* Pruh v kartě „Cenová nabídka (CN)" (jen 2+ zákazníků, R2). */
function vzTiskPruhHtml() {
  if (typeof vzTiskPruhText !== 'function' || typeof ZAK === 'undefined') return '';
  const t = vzTiskPruhText(ZAK, vzTiskId(), null);
  return t ? `<div class="vz-tisk-pruh" style="margin:6px 0 10px;padding:6px 10px;border-left:4px solid #1d4ed8;background:#eef2ff;font-weight:600">${esc(t)}</div>` : '';
}

/* Je otevřený DALŠÍ zákazník (ne řídící) u zakázky s víc zákazníky? */
function vzTiskJinyZakaznik() {
  const p = vzTiskZakTicho();
  return !!(p && p !== ZAK && p.vzPohledZakaznika && typeof vzRidiciId === 'function' && p.vzPohledZakaznika.id !== vzRidiciId(ZAK));
}

/* Tisk technické specifikace (okno aplikace → PDF) pro otevřeného zákazníka. */
function vzTiskSpecifikace(L) {
  const vt = vzTiskVstup('specifikace', typeof aktivniVarianta === 'function' ? aktivniVarianta(ZAK) : undefined);
  if (!vt) return;
  tiskSNazvem(nazevExportu('specifikace', { cislo: vzTiskCislo(vt.zak), jazyk: L }));
}

/* Obsluha tlačítka tisku specifikace: u jednoho zákazníka PŮVODNÍ text
 * (stránka bajt po bajtu jako dnes), u víc zákazníků přes vzTiskSpecifikace. */
function vzTiskSpecOnclick(jazykVyraz) {
  return (typeof vzRezim === 'function' && vzRezim(ZAK)) ? 'vzTiskSpecifikace(' + jazykVyraz + ')'
    : "tiskSNazvem(nazevExportu('specifikace', { cislo: ZAK.cislo, jazyk: " + jazykVyraz + " }))";
}

/* Tisk CN z karty Zákazníci zakázky (E2 bod 5): otevře zákazníka (a jeho
 * variantu, vzOtevri z E1) a spustí dnešní „Kompletní náhled a tisk nabídky". */
function vzTiskCN(id) {
  if (typeof vzOtevri === 'function') vzOtevri(id);
  if (typeof nabidkaOckDokument === 'function') return nabidkaOckDokument();
}

/* Číslo nabídky zákazníka pro kartu a poznámku dealu: číslo varianty + písmeno. */
function vzTiskCisloZakaznika(zak, z, v) {
  const c = (typeof variantaCislo === 'function' && v) ? variantaCislo(zak, v) : String((zak && zak.cislo) || '');
  return (z && typeof vzCisloSPismenem === 'function') ? vzCisloSPismenem(c, z.pismeno) : c;
}
