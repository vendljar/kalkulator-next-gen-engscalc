/* AZ-1 — příznak strany zakázky (jenProj / jenOck) není po odeslání ani po Prodáno zmrazený.
 * Kterýkoli přihlášený obchodník (i cizí) ho u odeslané / PRODANÉ nabídky přepne obyčejným uložením;
 * tím se změní, která strana se „počítá" (hodnota dealu pro Pipedrive, export controllingu, kontroly).
 * Část B: strana vyřazená při zámku (jenProj) se při novém zámku neposuzuje (nepotvrzená ruční cena #561)
 * a po vypnutí příznaku se počítá BEZ dotisku — kontrola B153 visí jen na záznamu tisku od klienta.
 * Lokálně, paměťové úložiště, bez sítě:  node podklady/audit_2026-11-20/poc_AZ_1_strana_po_zamku.mjs */
import { nova, uloz, nacti, cO, cO2, zamkni, kopie, zam, G, JEKLY, verdikt } from './poc_AZ_zaklad.mjs';
const dnes = new Date().toISOString().slice(0, 10);
const imp = z => G.importZakazka(kopie(z));
const pohled = (g) => { const z = imp(g); const v = z.varianty[0];
  const pd = G.prodPdZapis(z, v, JEKLY); const ce = G.ctrlExportVarianty(z, v, { jekly: JEKLY });
  return { pdStrany: pd.hodnota.map(h => h.oblast).join('+') || '(nic)', pdKc: pd.hodnotaKc, ctrlStrany: ce.ok ? ce.strany.map(s => s.oblast).join('+') : 'chyba: ' + ce.chyba }; };
let zranitelne = 0;

console.log('— Část A: přepnutí strany u PRODANÉ nabídky cizím obchodníkem —');
{ const z = nova('AZ-1 A'); const v = z.varianty[0]; zamkni(z, v, 'nabidka');
  const r = await uloz(z, cO); let g = await nacti(r.soubor, cO);
  let a = kopie(g); a.varianty[0].prodano = { datum: dnes }; const rp = await uloz(a, cO, g.uloRazitko);
  g = await nacti(r.soubor, cO); const pred = pohled(g);
  console.log('obch1: nabídka OCK odeslána (' + r.status + ') a prodána (' + rp.status + '); hodnota dealu ze strany:', pred.pdStrany, '| controlling strany:', pred.ctrlStrany);
  a = kopie(g); a.jenProj = true;
  const rr = await uloz(a, cO2, g.uloRazitko);
  console.log('obch2 (cizí obchodník) uloží jenProj=true → HTTP', rr.status, rr.ok ? 'ULOŽENO' : rr.chyba);
  const g2 = await nacti(r.soubor, cO); const po = pohled(g2);
  console.log('po přepnutí: hodnota dealu ze strany:', po.pdStrany, '| controlling strany:', po.ctrlStrany, '| hodnota se změnila:', pred.pdKc !== po.pdKc);
  console.log('zámek i prodej beze změny:', JSON.stringify(g.varianty[0].zamek.vysledek) === JSON.stringify(g2.varianty[0].zamek.vysledek), !!g2.varianty[0].prodano, '| upravil:', g2.upravil);
  if (rr.ok && pred.pdStrany !== po.pdStrany) zranitelne++;
  a = kopie(g2); a.jenProj = false; a.jenOck = true; const r3 = await uloz(a, cO2, g2.uloRazitko);
  console.log('zpět a jenOck=true → HTTP', r3.status);
}

console.log('\n— Část B: strana OCK neposouzená při zámku se po vypnutí jenProj počítá bez dotisku —');
{ const cesta = 'C.montazniNosnik';
  const priprav = () => { const z = nova('AZ-1 B'); const v = z.varianty[0];
    v.data.cenik.montazniNosnik = 0;   // ruční cena 0 Kč, NEPOTVRZENÁ (bez zdroje, bez potvrzení)
    v.data.rucniCeny = { [cesta]: { hodnota: 0, dodavatel: '', cislo: '', datum: '', platnostDo: '', zaklad: null, potvrdil: null } };
    return z; };
  // kontrola: bez jenProj server nový zámek s nepotvrzenou ruční cenou odmítne
  { const z = priprav(); zamkni(z, z.varianty[0], 'nabidka'); const r = await uloz(z, cO); console.log('kontrola — zámek nabídky OCK s nepotvrzenou ruční cenou: HTTP', r.status, (r.chyba || '').slice(0, 90)); }
  const z = priprav(); z.jenProj = true; const v = z.varianty[0];
  zamkni(z, v, 'nabidkaProj');
  const r = await uloz(z, cO);
  console.log('s jenProj=true zámek dokumentem nabidkaProj: HTTP', r.status, r.ok ? 'ULOŽENO' : r.chyba, r.varovani || '');
  if (r.ok) {
    let g = await nacti(r.soubor, cO);
    let a = kopie(g); a.jenProj = false; const r2 = await uloz(a, cO, g.uloRazitko);
    console.log('vypnutí jenProj (bez dotisku): HTTP', r2.status, r2.ok ? 'ULOŽENO' : r2.chyba);
    g = await nacti(r.soubor, cO);
    a = kopie(g); a.varianty[0].prodano = { datum: dnes }; const r3 = await uloz(a, cO, g.uloRazitko);
    console.log('Prodáno: HTTP', r3.status, r3.ok ? 'ULOŽENO' : r3.chyba);
    g = await nacti(r.soubor, cO); const p = pohled(g);
    const rc = g.varianty[0].data.rucniCeny[cesta];
    console.log('prodaná odeslaná varianta: strany hodnoty dealu:', p.pdStrany, '| controlling:', p.ctrlStrany, '| ruční cena potvrzena:', !!(rc && rc.potvrdil), '| ověření zámku:', g.varianty[0].zamek.overeni && g.varianty[0].zamek.overeni.stav);
    if (r2.ok && r3.ok && /OCK/.test(p.pdStrany) && !(rc && rc.potvrdil)) zranitelne++;
  }
}
verdikt(zranitelne > 0, 'AZ-1: příznak strany (jenProj/jenOck) jde u odeslané i prodané nabídky přepnout kýmkoli; '
  + 'strana neposouzená při zámku se pak počítá bez dotisku (' + zranitelne + '/2 částí potvrzeno).');
