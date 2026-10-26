#!/bin/bash
B=https://testengscalc.netlify.app
O=${KNG_S2_OUT:-/tmp/s2_zivy}/out3; mkdir -p $O
i=0
req() { local m=$1 p=$2 n=$3; shift 3; i=$((i+1)); local f=$O/$(printf %03d $i)_$n
  curl -sS -X "$m" -D $f.h -o $f.b --max-time 30 "$@" "$B$p" 2>$f.err
  local st=$(grep -a '^HTTP/2' $f.h | tail -1 | awk '{print $2}')
  local sc=$(grep -ai '^set-cookie:' $f.h | tr -d '\r' | tr '\n' ' ')
  local ac=$(grep -ai '^access-control' $f.h | tr -d '\r' | tr '\n' ' ')
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$i" "$m" "$p" "$st" "$(head -c 120 $f.b | tr '\n\t\r' '   ')" "$sc" "$ac"
  sleep 1.1; }
J='Content-Type: application/json'
ZLY='Origin: https://zly.example'
VL="Origin: $B"
# cizí Origin u zápisů (bez relace)
req POST /api/zakazky zak_cizi -H "$J" -H "$ZLY" --data-binary '{}'
req POST /api/zakazky zak_null -H "$J" -H 'Origin: null' --data-binary '{}'
req POST /api/zakazky zak_text -H 'Content-Type: text/plain' -H "$VL" --data-binary '{}'
req DELETE /api/zakazky?soubor=x zak_del
req PUT /api/zakazky zak_put -H "$J" --data-binary '{}'
req HEAD /api/ja ja_head
req GET /api/ja ja_cizi -H "$ZLY"
req GET /api/ja ja_cookie_falesna -H 'Cookie: relace=eyJlbWFpbCI6ImFAYi5jeiJ9.AAAA'
req GET /api/zdravi zdravi_cizi -H "$ZLY"
# přihlášení / odhlášení: tvar odpovědí
req POST /api/prihlaseni prih_cizi -H "$J" -H "$ZLY" --data-binary '{"email":"x","heslo":"y"}'
req POST /api/prihlaseni prih_null -H "$J" -H 'Origin: null' --data-binary '{"email":"x","heslo":"y"}'
req POST /api/prihlaseni prih_form -H 'Content-Type: application/x-www-form-urlencoded' -H "$VL" --data-binary 'email=x&heslo=y'
req POST /api/prihlaseni prih_prazdne -H "$J" -H "$VL" --data-binary '{}'
req POST /api/prihlaseni prih_toString -H "$J" -H "$VL" --data-binary '{"email":{"toString":1},"heslo":"y"}'
# JEDINÝ pokus s neplatným smyšleným účtem (pravidlo: nejvýš 2)
req POST /api/prihlaseni prih_neplatny -H "$J" -H "$VL" --data-binary '{"email":"nikdo.s2@priklad.cz","heslo":"Neplatne-heslo-S2-zkouska"}'
req POST /api/odhlaseni odhl_bez_relace -H "$J" -H "$VL" --data-binary '{}'
req POST /api/odhlaseni odhl_cizi -H "$J" -H "$ZLY" --data-binary '{}'
