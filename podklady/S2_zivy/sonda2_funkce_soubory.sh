#!/bin/bash
B=https://testengscalc.netlify.app
O=${KNG_S2_OUT:-/tmp/s2_zivy}/out2; mkdir -p $O
i=0
req() { local m=$1 p=$2 n=$3; shift 3; i=$((i+1)); local f=$O/$(printf %03d $i)_$n
  curl -sS -X "$m" -D $f.h -o $f.b --max-time 20 "$@" "$B$p" 2>$f.err
  local st=$(grep -a '^HTTP/2' $f.h | tail -1 | awk '{print $2}')
  local ct=$(grep -ai '^content-type:' $f.h | tail -1 | cut -d' ' -f2- | tr -d '\r')
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$i" "$m" "$p" "$st" "$(stat -c %s $f.b)" "$ct" "$(head -c 120 $f.b | tr '\n\t\r' '   ')"
  sleep 1.1; }
# A) výchozí cesta funkcí (zaloha_nocni JEDNOU, GET bez těla; dle dokumentace Netlify URL nejde)
for fn in analytika controlling controlling_export firma ja obnova odhlaseni pd_deal pd_dealy pd_pole pd_stav popisy prihlaseni program sablony schvalovani slovnik uzivatele vypocet zakazky zakaznici zaloha zaloha_vynuceno zdravi zobrazeni zaloha_nocni neexistuje; do
  req GET /.netlify/functions/$fn fn_$fn
done
# B) statické cesty mimo dist/
for p in /.git/HEAD /.git/config /.gitignore /.env /.github/workflows/testy.yml /podklady/ /podklady/SEC_AUDIT_24_10.md /PREDAVKA.md /CLAUDE.md /CHANGELOG.md /BEZPECNOST_MEZE.md /netlify.toml /build.py /package.json /package-lock.json /verze.txt /netlify/functions/zaloha.mjs /netlify/lib/sdilene.mjs /src/engine.js /src/zkusebni_cenik.js /src/app_template.html /server/server.js /nastroje/kontrola_udaju.py /roadmapa/roadmap.json /manual/obsah.json /_redirects /_headers /robots.txt /sitemap.xml /.well-known/security.txt /favicon.ico /favicon.svg /index.html.map /kalkulacka.html /kalkulacka_v25.10.1.html /kalkulacka_v25.10.0.html /kalkulacka_v24.10.1.html /dist/index.html /index.html /zaloha.json /cenik.xlsx /.netlify/ /.netlify/blobs/ /nahodna-cesta-404; do
  n=$(echo "$p" | tr '/.' '__'); req GET "$p" st$n
done
