/* VÝCHOZÍ SMYŠLENÝ ADMIN_EMAIL PRO SAMOSTATNÉ SPUŠTĚNÍ SERVEROVÝCH SAD
 * (K40-S4, dávka K40a, 11. 11. 2026).
 *
 * `netlify/lib/sdilene.mjs` čte ADMIN_EMAIL při načtení modulu a statické
 * importy se vyhodnocují dřív než kód sady — přiřazení `process.env` v těle
 * sady proto nestačí. Sada, která `sdilene.mjs` importuje staticky, dá tenhle
 * modul jako PRVNÍ import: ESM vyhodnocuje importy v pořadí zápisu, takže
 * proměnná je nastavená dřív, než se `sdilene.mjs` načte. Spuštěná samostatně
 * (bez spust_testy.sh) pak sada skončí OK/FAIL, ne výjimkou „ADMIN_EMAIL".
 * Adresa je smyšlená (vzor podklady/K10_pokusy/harness.mjs:7); nastavenou
 * hodnotu nepřepisuje. Jméno nezačíná „test_", aby ho spust_testy.sh nepouštěl. */
if (!process.env.ADMIN_EMAIL) {
  process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
  /* test_funkce hledá skutečnou adresu správce ve zdrojácích — smyšlenou,
   * kterou dosadil tenhle modul (a sám ji obsahuje), hledat nemá smysl. */
  process.env.KNG_ADMIN_EMAIL_VYCHOZI = '1';
}
