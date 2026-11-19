/* „Naposledy aktivní" (#ON, J. V. 19. 11. 2026): relativní čas v Nastavení →
 * Uživatelé. Časy se skládají místním konstruktorem Date, takže test nezávisí
 * na časovém pásmu stroje. Pojistka: před změnou formatNaposledy neexistuje
 * a sada padá hned na prvním volání. */
const { formatNaposledy, formatCasPresny } = require('./format.js');
let ok = 0, fail = 0;
const t = (n, a, b) => { if (a === b) ok++; else { fail++; console.log('FAIL ' + n + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); } };

const TED = new Date(2026, 10, 19, 10, 30, 0).getTime();      // 19. 11. 2026 10:30 místně
const iso = (...a) => new Date(...a).toISOString();
t('prázdné', formatNaposledy('', TED), '—');
t('nečitelné', formatNaposledy('včera večer', TED), '—');
t('před 20 s', formatNaposledy(iso(TED - 20000), TED), 'právě teď');
t('mírně v budoucnu', formatNaposledy(iso(TED + 30000), TED), 'právě teď');
t('před 3 min', formatNaposledy(iso(TED - 3 * 60000 - 10000), TED), 'před 3 min');
t('před 59 min', formatNaposledy(iso(TED - 59 * 60000), TED), 'před 59 min');
t('dnes ráno', formatNaposledy(iso(2026, 10, 19, 9, 2), TED), 'dnes 9:02');
t('dnes těsně po půlnoci', formatNaposledy(iso(2026, 10, 19, 0, 5), TED), 'dnes 0:05');
t('včera', formatNaposledy(iso(2026, 10, 18, 23, 50), TED), 'včera');
t('předevčírem = datum', formatNaposledy(iso(2026, 10, 17, 12, 0), TED), '17. 11. 2026');
t('přes přelom měsíce: včera', formatNaposledy(iso(2026, 10, 30, 22, 0), new Date(2026, 11, 1, 8, 0).getTime()), 'včera');
t('přes přelom roku: datum', formatNaposledy(iso(2025, 11, 30, 8, 0), new Date(2026, 0, 1, 8, 0).getTime()), '30. 12. 2025');
t('přesný čas', formatCasPresny(iso(2026, 10, 19, 9, 2, 7)), '19. 11. 2026 9:02:07');
t('přesný čas prázdný', formatCasPresny(''), '');

console.log(`test_on_naposledy: ${ok} OK, ${fail} FAIL`);
if (fail) process.exit(1);
