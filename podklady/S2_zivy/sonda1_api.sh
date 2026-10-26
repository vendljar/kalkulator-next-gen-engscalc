#!/bin/bash
# Sonda S2: jeden řádek na dotaz; hlavičky+tělo do out/. Max ~1 dotaz/s.
B=https://testengscalc.netlify.app
O=${KNG_S2_OUT:-/tmp/s2_zivy}/out; mkdir -p $O
i=0
req() { # metoda cesta jmeno [curl args...]
  local m=$1 p=$2 n=$3; shift 3; i=$((i+1))
  local f=$O/$(printf %03d $i)_$n
  curl -sS -X "$m" -D $f.h -o $f.b --max-time 20 "$@" "$B$p" 2>$f.err
  local st=$(grep -a '^HTTP/2' $f.h | tail -1 | awk '{print $2}')   # poslední stavový řádek (první je CONNECT proxy)
  printf '%s\t%s\t%s\t%s\t%s\n' "$i" "$m" "$p" "$st" "$(head -c 160 $f.b | tr '\n\t' '  ')"
  sleep 1.1
}
EP="analytika controlling controlling/export firma ja obnova odhlaseni pd/deal pd/dealy pd/pole pd/stav popisy prihlaseni program sablony schvalovani slovnik uzivatele vypocet zakazky zakaznici zaloha zaloha_vynuceno zdravi zobrazeni"
for e in $EP; do
  n=${e//\//_}
  req GET /api/$e ${n}_get
  [ $e = odhlaseni ] || req POST /api/$e ${n}_postjson -H 'Content-Type: application/json' --data-binary '{neplatny'
  req OPTIONS /api/$e ${n}_opt -H 'Origin: https://zly.example' -H 'Access-Control-Request-Method: POST'
done
