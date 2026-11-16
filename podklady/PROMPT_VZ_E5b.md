# Prompt VZ-E5b — Pipedrive: organizace dealu = vítězný zákazník při Prodáno

Společná pravidla: `PROMPT_VZ_SPOLECNE.md`. Návrh § 7.4 (závazný popis), § 7.3. Větev `claude/vz-e5b` nad SHA od
koordinace (po E4). Odhad: 1 sezení. **RIZIKOVÁ — po dokončení revize poradce** (aplikace poprvé zakládá
organizaci v Pipedrive a přepojuje deal).

Rozhodnutí J. V. 16. 11. 2026: „organizace by se v Pipedrive měla přepsat na vítězného zákazníka a vítězná
varianta je řídící cenou v Pipedrive“.

## Cíl

Po prodeji jinému zákazníkovi server najde v Pipedrive organizaci podle IČO vítěze (nebo ji založí) a přepojí na
ni deal. Selhání prodej neohrozí a zápis jde zopakovat.

## Krok 0

`netlify/functions/pd_organizace.mjs` (akce `nahled` / `zapis`, podmínka shody IČO, limity), `netlify/lib/pd_vazba.mjs`
(`pdVazbaSmiMenit`, `pdIcoShoda`, `pdOrgHodnoty`, `pdProtokol`), `netlify/lib/pd_mapa.mjs` (`pdIco`, pole
organizace), `netlify/lib/ares_server.mjs`, `netlify/lib/pipedrive.mjs` (`pdZavolej`, `pdStropCerstvych`,
`casLimitMs`), simulátor, oddíly K40c a B217 v `BEZPECNOST_MEZE.md`. **Cesty a parametry Pipedrive (hledání
organizací podle vlastního pole, založení organizace, změna `org_id` dealu) ověř v oficiální dokumentaci
Pipedrive API** a zapiš do hlavičky souboru; do skutečného účtu nevolej.

## Co udělat

1. **Nová akce** `POST /api/pd/organizace { soubor, akce: 'vitez' }` (týž soubor funkce, vlastní větev kódu):
   přesně kroky 1–5 z návrhu § 7.4 — podmínky, načtení dealu a organizace, hledání podle IČO s **ověřením každého
   kandidáta** (`pdIco`, kontrolní číslice), jedna shoda → použít, žádná → založit (ARES, jinak hlavička; IČ do
   pole z mapy; DIČ jen když pole je; vlastník = vlastník dealu), víc shod → nic a seznam názvů, pak
   `PATCH` dealu jen `{ org_id }`, stav do `zak.pdOrgVitez`, protokol, smazání cache dealu.
2. **Stavy** `zapsano` (s `nalezena` | `zalozena`), `shoda`, `bez-ico`, `vice`, `bez-prava`, `chyba`, `strop`.
   `pdOrgVitez` píše jen server (hodnota z prohlížeče se zahodí; při běžném uložení se drží z uložené verze).
3. **Kdo smí:** e-mail relace = `prodano.kdo` uložené verze, nebo autor zakázky, nebo administrátor — a právo
   `crm.pipedrive` (B80). Ostatní 403. Neprodaná zakázka nebo zakázka bez `vzRidici`: 409.
4. **Limity:** volání Pipedrive 2,5 s, celá akce 9 s včetně ARES, strop 10 pokusů / h na deal a 20 / h na uživatele,
   výhradní úsek zakázky, druhé čtení před zápisem stavu.
5. **Idempotence:** před založením vždy nové hledání; opakování po selhání PATCH nezaloží druhou organizaci.
6. **Obrazovka:** háček `vzPoProdeji()` z E4 akci zavolá sám po uložení prodeje; při jiném stavu než `zapsano` /
   `shoda` upozornění u řádku Stav Pipedrive a v kartě Zákazníci zakázky s důvodem a tlačítkem „Zkusit zápis znovu“
   (podle prototypu, snímek `v3_2_*`); vždy věta, že kontaktní osoba dealu se nemění.
7. **K40c:** ověř testem, že před přepsáním „Opravit firmu“ vrací 409 (neshoda IČO) a po přepsání funguje nad
   organizací vítěze; webhook po přepsání firmu v hlavičce nepřepíše.
8. **Simulátor:** hledání organizací, `POST /organizations`, `PATCH /deals/<id>` s `org_id`, scénáře výpadku,
   limitu a visení pro tyto cesty.
9. **Mez** do `BEZPECNOST_MEZE.md` (číslo od koordinace): co akce dělá a nedělá (neslučuje duplicity, nemění osobu
   dealu, původní organizaci nemění ani nemaže, při odemčení prodeje nic nevrací, souběh dvou instancí může založit
   organizaci dvakrát).

## Testy (jen simulátor a předaný `fetch` pro ARES)

`netlify/test_vz_organizace.mjs`: nalezena / založena z ARES / založena z hlavičky při výpadku ARES / víc shod /
kandidát s jiným IČO, než hledání tvrdí / bez IČO / shoda / bez práva / cizí uživatel 403 / neprodaná 409 / jeden
zákazník 409 / PATCH selže po založení → opakování nezaloží druhou / časový limit / strop / podvržené `pdOrgVitez` /
název firmy s HTML a řídicími znaky / nic se neposílá do původní organizace (kontrola seznamu požadavků
simulátoru). `overit_vz_organizace.mjs` pro upozornění a opakování. Mutace serveru „[VZ E5b]“ — každá podmínka
(IČO kandidáta, víc shod, právo, prodáno) musí mít svoji mutaci.

## Co nedělat

Slučování duplicit, změna osoby dealu, zápis hodnoty a polí dealu, automatické spuštění z webhooku, vracení
organizace při odemčení prodeje.
