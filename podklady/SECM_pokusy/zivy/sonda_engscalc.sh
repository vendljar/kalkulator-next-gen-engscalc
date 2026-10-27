#!/bin/bash
# SEC-M #538, část B: ostrý engscalc.netlify.app JEN PASIVNĚ (bez přihlášení, bez zápisů,
# žádné POST/PUT/DELETE). Popořadě 1 dotaz za 1,1 s, celkem 55 dotazů curl (+ ~3 z Playwrightu).
# Výstup: ${KNG_SECM_OUT:-/tmp/secm_zivy}/out/*.h|*.b a vysledek.tsv (čas UTC, metoda, cesta, kód, velikost, typ, začátek těla).
# Za proxy sezení je první řádek hlaviček "HTTP/1.1 200 Connection Established" — stav se bere z posledního HTTP/2.
B=https://engscalc.netlify.app
O=${KNG_SECM_OUT:-/tmp/secm_zivy}/out; mkdir -p "$O"
T=${KNG_SECM_OUT:-/tmp/secm_zivy}/vysledek.tsv
printf 'n\tcas_utc\tmetoda\tcesta\tkod\tbajty\ttyp\tacao\tzacatek_tela\n' > "$T"
i=0
req() { local m=$1 p=$2 n=$3; shift 3; i=$((i+1)); local f=$O/$(printf %03d $i)_$n
  local cas=$(date -u +%H:%M:%S)
  curl -sS -X "$m" -D "$f.h" -o "$f.b" --max-time 20 "$@" "$B$p" 2>"$f.err"
  local st=$(grep -a '^HTTP/' "$f.h" | tail -1 | awk '{print $2}')
  local ct=$(grep -ai '^content-type:' "$f.h" | tail -1 | cut -d' ' -f2- | tr -d '\r')
  local ac=$(grep -aic '^access-control-' "$f.h")
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$i" "$cas" "$m" "$p" "$st" "$(stat -c %s "$f.b")" "$ct" "$ac" "$(head -c 100 "$f.b" | tr '\n\t\r' '   ')" >> "$T"
  sleep 1.1; }
# 1) HTML (3)
for p in / /kalkulacka.html /kalkulacka_v25.10.1.html; do req GET "$p" "html$(echo $p | tr '/.' '__')"; done
# 2) /api/* bez relace, GET (25)
for a in analytika controlling controlling/export firma ja obnova odhlaseni pd/deal pd/dealy pd/pole pd/stav popisy prihlaseni program sablony schvalovani slovnik uzivatele vypocet zakazky zakaznici zaloha zaloha_vynuceno zdravi zobrazeni; do
  req GET "/api/$a" "api_$(echo $a | tr '/' '_')"
done
# 3) CORS preflight z cizího původu (2) — OPTIONS bez těla
req OPTIONS /api/zakazky pre_zakazky -H 'Origin: https://zly.example' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
req OPTIONS /api/prihlaseni pre_prihlaseni -H 'Origin: null' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
# 4) výchozí adresy funkcí (9), zaloha_nocni JEDNOU (K9-I9)
for fn in zakazky prihlaseni ja zaloha zaloha_vynuceno controlling_export obnova zaloha_nocni neexistuje; do
  req GET "/.netlify/functions/$fn" "fn_$fn"
done
# 5) skryté cesty (16)
for p in /.git/HEAD /.git/config /.env /package.json /netlify.toml /PREDAVKA.md /podklady/SEC_AUDIT_24_10.md /netlify/functions/zaloha.mjs /netlify/lib/sdilene.mjs /src/engine.js /server/server.js /nastroje/kontrola_udaju.py /index.html.map /kalkulacka.html.map /_redirects /verze.txt; do
  req GET "$p" "st$(echo $p | tr '/.' '__')"
done
echo "hotovo: $i dotazů" >&2
