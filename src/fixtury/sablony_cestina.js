/* Smyšlené odstavce pro kontrolu češtiny v jazykové verzi šablony (C7,
 * K48-N1). Nejsou to firemní texty — jen věty ve stylu smlouvy, aby testy
 * nesly obě situace z kola 48:
 *   DE_PRELOZENA  — přeložená smlouva (jako Sablona_SOD_REALIZACE_v5_DE):
 *                   německé věty, mezi nimi adresa s českou diakritikou;
 *   DE_Z_CESTINY  — „DE" vyrobená z české verze slovníkem: přeložily se jen
 *                   nadpisy a pár vět, zbytek zůstal česky (110 ze 143);
 *   DE_HRANICE    — 30 % českých odstavců: nad mezí 20 %, ale daleko pod
 *                   většinou — chytí mez, ne odhad „jaký je to jazyk". */
const DE_VETY = [
  'Werkvertrag {{CISLO_NABIDKY}}',
  'Der Auftragnehmer verpflichtet sich, das Werk gemäß diesem Vertrag auszuführen.',
  'Der Auftraggeber verpflichtet sich, das Werk zu übernehmen und den Preis zu zahlen.',
  'Der Preis für das Werk beträgt {{CENA_CELKEM}} ohne Mehrwertsteuer.',
  'Die Lieferung erfolgt bis zum {{TERMIN_DODANI}}.',
  'Die Montage wird von dem Auftragnehmer mit eigenen Mitarbeitern ausgeführt.',
  'Für Mängel haftet der Auftragnehmer nach den gesetzlichen Bestimmungen.',
  'Dieser Vertrag tritt mit der Unterzeichnung durch beide Parteien in Kraft.',
  'Änderungen und Ergänzungen bedürfen der Schriftform.',
  'Gerichtsstand ist der Sitz des Auftragnehmers.',
  'Die Vertragsstrafe beträgt {{SOD_POKUTA}} pro Tag des Verzugs.',
  'Der Auftraggeber stellt die Baustelle rechtzeitig zur Verfügung.',
  'Rechnungen sind innerhalb von {{SPLATNOST}} Tagen fällig.',
  'Beide Parteien haben den Vertrag gelesen und stimmen ihm zu.',
];
const CZ_VETY = [
  'Zhotovitel se zavazuje provést dílo podle této smlouvy.',
  'Objednatel se zavazuje dílo převzít a zaplatit za něj cenu.',
  'Cena díla je stanovena dohodou smluvních stran.',
  'Termín dokončení díla je uveden v příloze této smlouvy.',
  'Zhotovitel odpovídá za vady díla podle občanského zákoníku.',
  'Smlouva nabývá účinnosti dnem podpisu oběma stranami.',
  'Změny smlouvy jsou možné pouze písemným dodatkem.',
  'Objednatel předá zhotoviteli staveniště nejpozději v den zahájení prací.',
  'Faktura je splatná do {{SPLATNOST}} dnů od jejího doručení.',
  'Smluvní pokuta činí {{SOD_POKUTA}} za každý den prodlení.',
  'Obě strany prohlašují, že si smlouvu přečetly a souhlasí s ní.',
  'Zhotovitel je povinen udržovat na staveništi pořádek a čistotu.',
];
const ADRESA = 'Musterfirma s.r.o., Českomoravská 1, Praha 9';

const DE_PRELOZENA = DE_VETY.concat([ADRESA, '{{OBJEDNATEL_NAZEV}}', '12 345']);
/* nadpis + 3 německé věty, zbytek česky (přes 70 % odstavců česky) */
const DE_Z_CESTINY = DE_VETY.slice(0, 4).concat(CZ_VETY, CZ_VETY.slice(0, 3));
/* 10 německých a 4 české odstavce + adresa: 5 / 15 ≈ 33 % */
const DE_HRANICE = DE_VETY.slice(0, 10).concat(CZ_VETY.slice(0, 4), [ADRESA]);

if (typeof module !== 'undefined') module.exports = { DE_PRELOZENA, DE_Z_CESTINY, DE_HRANICE, DE_VETY, CZ_VETY, ADRESA };
