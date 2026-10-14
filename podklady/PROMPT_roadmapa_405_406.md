# Prompt pro kódové sezení — roadmapa #405 a #406 (rozhodnutí J. V. 14. 10. 2026)

Komunikace česky. Jde jen o zápis do roadmapy, kód aplikace se nemění.

Založ větev `claude/k24-roadmapa-p5` nad `origin/test` (při zadání 3538875, v14.10.5; pokud se `test` mezitím posunul, vezmi aktuální). Do `test-draft`, `test` ani `main` nic neslučuj, o sloučení rozhodne J. V. Postupuj podle skillu `roadmapa-kng`: editovat jen `roadmapa/roadmap.json`, generované `ROADMAPA.html` a `ROADMAPA.md` jsou v `.gitignore` a needitují se.

## 1. Ověř volná čísla

Nejvyšší id v roadmapě musí být 404 a čísla 405 a 406 nesmí mít žádná větev (`git branch -r`, projdi `roadmapa/roadmap.json` ve větvích `claude/*`). Pokud jsou obsazená, vezmi další volná a odkazy níž přepiš.

## 2. Změny v `roadmapa/roadmap.json`

Formátování souboru zachovej. Je v něm smíšené `"klic" : hodnota` a `"klic": hodnota`, proto vkládej textově a soubor celý nepřeformátovávej (`json.dump` by změnil tisíce řádků). Odsazení nových položek má odpovídat sousedním položkám.

a) Položka #390 (P5, statika ve dvou řádcích): na konec doplň pole `pozn`:

```
"pozn" : "**Uzavřeno J. V. 14. 10. 2026** (po 23. a 24. kole): hodiny statiky opláštění 6 h v ceníku testu i ostré, řádek v režii u všech OCK, upozornění `statikaDvakrat` u 13 převedených zakázek ponechat — viz #405."
```

b) Nová položka #405 na konec pole `polozky`:

```
{
 "id" : "405",
 "vlna" : "B",
 "stav" : "hotovo",
 "dulezitost" : "",
 "slozitost" : "S",
 "hotovoV" : "v14.10.3 (ostrá i test, ověřeno ve 23. a 24. kole)",
 "nazev" : "K23T-N2: statika opláštění a „statika dvakrát“ — ponechat",
 "proc" : "23. kolo (test v14.10.1) a 24. kolo (ostrá v14.10.3): ceník má 6 h statiky opláštění, takže řádek STATICKÉ POSOUZENÍ OPLÁŠTĚNÍ vzniká u všech OCK. U 13 převedených zakázek (C032, C034, C045, C069, C086, C093, C094, C099, C103, C104, C105, C109, C112) převod ručně přepsal hodiny statiky OCK z Excelu, který v nich má i opláštění, a aplikace upozorní „statikaDvakrat“. Rozhodnutí J. V. 14. 10. 2026: „Je OK.“",
 "detail" : "Bez změny kódu ani převodu. Hodiny statiky opláštění zůstávají v ceníku (P5 / #390); kontrola statikaDvakrat zůstává jako informativní upozornění pro obchodníka, převod řádek statiky opláštění nevyřazuje.",
 "hotovoKdyz" : "Rozhodnutí zapsané v roadmapě a v protokolu 24. kola.",
 "kde" : "`src/kontroly.js` (statikaDvakrat), ceník OCK (statikaOplHod)",
 "zavisi" : [ { "id" : "390", "typ" : "tvrda", "proc" : "navazuje na dvouřádkovou statiku P5" } ]
}
```

c) Nová položka #406 hned za #405:

```
{
 "id" : "406",
 "vlna" : "B",
 "stav" : "hotovo",
 "dulezitost" : "",
 "slozitost" : "S",
 "hotovoV" : "v14.10.3 (ostrá i test, ověřeno ve 22.–24. kole)",
 "nazev" : "K19-N113: boky dveří „bez“ — mezeru řeší generální dodavatel",
 "proc" : "Kontrola bokyDveri (19. kolo) hlásí u 60 převedených OCK zakázek, že vedle šachetních dveří zůstane neoceněná mezera 0,5–0,6 m na každém nástupišti. Rozhodnutí J. V. 14. 10. 2026: „Pokud je to bez, tak je to bez a počítá se s tím, že prostor kolem dveří stavebně vyřeší generální dodavatel. Nech to takto a uzavři.“",
 "detail" : "Bez změny kódu ani převodu. Volba „bez“ na bocích dveří znamená, že prostor kolem dveří stavebně řeší generální dodavatel; převod z Excelu ji ponechává. Kontrola bokyDveri zůstává jako informativní upozornění (nebrání dokumentům).",
 "hotovoKdyz" : "Rozhodnutí zapsané v roadmapě a v protokolu 24. kola.",
 "kde" : "`src/kontroly.js` (bokyDveri)",
 "zavisi" : [ { "id" : "375", "typ" : "doporuceno", "proc" : "volby světlíků nad dveřmi a na bocích" } ]
}
```

d) `meta.poradi`: na konec přidej řádek:

```
{
 "text" : "14. 10. 2026 — rozhodnutí J. V. po 23. kole (test) a 24. kole (ostrá v14.10.3): P5 statika opláštění 6 h a upozornění „statika dvakrát“ u 13 převedených zakázek ponechat (#405, K23T-N2 uzavřen). K19-N113: boky dveří „bez“ ponechat, prostor kolem dveří řeší generální dodavatel (#406).",
 "hotovo" : true,
 "pozn" : "24. kolo v ostré: 148/148 na korunu shodných s testem, 138 uloženo, 137 vytištěno se zámkem „shoda“."
}
```

`meta.stavKDatu` a `meta.build` neměň: roadmapa za dávky 13. a 14. 10. ještě dorovnaná není a tenhle zápis ji jako celek neaktualizuje.

## 3. Ověření

```
cd roadmapa
python3 roadmapa.py --kontrola   # musí projít: 406 položek, žádný nález
python3 roadmapa.py              # vygeneruje HTML a MD (v .gitignore)
cd ..
git diff --stat                  # jen roadmapa/roadmap.json, řádově desítky řádků
```

Statická kontrola verze: commit musí vzniknout ve dni, který odpovídá `verze.txt` (v14.10.5 = 14. 10.). Pokud je jiný den, verzi nezvyšuj a napiš to J. V.: jde o zápis do roadmapy, ne o novou verzi.

## 4. Commit a push

Jeden commit, například „Roadmapa #405, #406: K23T-N2 a K19-N113 uzavřeny rozhodnutím J. V. 14. 10. 2026“. Zpráva končí řádky:

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UzJda7dEPM2AkgP8EDiKcR
```

Pushni větev `claude/k24-roadmapa-p5` a pošli J. V. odkaz na větev. Uveď, že jde jen o roadmapu a že sloučení do `test-draft` / `test` je na něm.

(Alternativa: v Testovani je hotová záplata `ROADMAPA_405_406.patch` se dvěma commity nad 3538875. `git am ROADMAPA_405_406.patch` ve větvi nad `origin/test` dá stejný výsledek.)
