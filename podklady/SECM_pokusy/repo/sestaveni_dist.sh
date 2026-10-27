#!/usr/bin/env bash
# SEC-M, čočka repo: co jde do dist/ (to, co Netlify publikuje: publish = "dist").
#
# Použití (z kořene repa):  bash podklady/SECM_pokusy/repo/sestaveni_dist.sh [ref] [pracovní složka]
#   ref = výchozí HEAD (main); např. origin/claude/integrace-16-10 pro srovnání.
#
# Rozbalí strom refu `git archive` do dočasné složky (pracovní kopie zůstane
# netknutá), spustí `python3 build.py` s KNG_NEZVYSOVAT_VERZI=1 a ověří:
#   1) dist/ obsahuje jen HTML (žádné .env, .json, .js, podklady),
#   2) v HTML nejsou tajemství ani osobní údaje (kontrola_udaju.py nad kopií
#      dist/*.html — e-maily/telefony mimo povolený seznam, tokeny),
#   3) DEFAULT_CENIK v sestavení je vynulovaný (nenulové jen dph*), zkušební
#      ceník (zkusebniCenik) a značky podkladů/předávek v sestavení nejsou.
set -u
REF=${1:-HEAD}
PRAC=${2:-$(mktemp -d)}
KOREN=$(cd "$(dirname "$0")/../../.." && pwd)
d="$PRAC/sestaveni"; rm -rf "$d"; mkdir -p "$d"
git -C "$KOREN" archive "$REF" | tar -x -C "$d"
( cd "$d" && KNG_NEZVYSOVAT_VERZI=1 python3 build.py >/dev/null ) || { echo "VÝSLEDEK: FAIL — build.py selhal"; exit 1; }
fail=0
echo "Obsah dist/:"; (cd "$d/dist" && ls -la | tail -n +4 | awk '{print "  "$5"  "$9}')
jine=$(cd "$d/dist" && ls | grep -vE '\.html$' || true)
if [ -n "$jine" ]; then echo "  FAIL: v dist/ je i jiný soubor než HTML: $jine"; fail=1; else echo "  OK: jen HTML"; fi
# 2) kontrola údajů nad kopií HTML (nástroj z pracovní kopie = main)
k="$PRAC/kontrola"; rm -rf "$k"; mkdir -p "$k/nastroje" "$k/src"
cp "$d/dist/index.html" "$k/src/index.html"
cp "$KOREN/nastroje/kontrola_udaju.py" "$KOREN/nastroje/povolene_kontakty.txt" "$k/nastroje/"
out=$(python3 -I "$k/nastroje/kontrola_udaju.py" 2>&1); kod=$?
if [ $kod -ne 0 ]; then
  echo "  FAIL: kontrola_udaju nad dist/index.html: $(printf '%s\n' "$out" | grep -cE '^  ') nálezů (typy: $(printf '%s\n' "$out" | grep -E '^  ' | sed -E 's/^  [^ ]+  ([^:]+):.*/\1/' | sort | uniq -c | tr -s ' ' | tr '\n' ';'))"
  fail=1
else
  echo "  OK: kontrola_udaju nad dist/index.html čistá"
fi
# 3) ceník a stopy podkladů
python3 -I - "$d/dist/index.html" <<'PY' || fail=1
import re, sys
t = open(sys.argv[1], encoding='utf-8').read()
i = t.find('const DEFAULT_CENIK = {'); j = t.find('\n};', i)
blok = re.sub(r'//[^\n]*', '', re.sub(r'/\*.*?\*/', '', t[i:j], flags=re.S))
nenul = sorted(set(k for k, v in re.findall(r'(\w+)\s*:\s*(-?\d+(?:\.\d+)?)', blok) if float(v) != 0))
ok = True
mimo = [k for k in nenul if not k.startswith('dph')]
print('  DEFAULT_CENIK v sestavení: nenulové klíče %s' % (nenul or '(žádné)'))
if mimo:
    print('  FAIL: nenulová ceníková hodnota mimo DPH: %s' % mimo); ok = False
for stopa in ('zkusebniCenik', 'PREDAVKA', 'SEC_AUDIT', 'S1_pokusy', 'TAJEMSTVI_RELACE', 'ADMIN_INIT_HESLO', 'PIPEDRIVE_API_TOKEN'):
    n = t.count(stopa)
    print('  %-20s výskytů v HTML: %d' % (stopa, n))
    if stopa in ('zkusebniCenik', 'S1_pokusy', 'SEC_AUDIT') and n:
        ok = False
sys.exit(0 if ok else 1)
PY
rm -rf "$d" "$k"
[ $fail -eq 0 ] && echo "VÝSLEDEK: OK — dist/ ($REF) nese jen HTML bez tajemství, osobních údajů a ceníku" || echo "VÝSLEDEK: FAIL ($REF)"
exit $fail
