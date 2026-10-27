#!/usr/bin/env bash
# SEC-M, čočka repo: dodavatelský řetězec (package.json, package-lock.json, CI).
#
# Použití (z kořene repa):  bash podklady/SECM_pokusy/repo/dodavatelsky_retezec.sh [ref]
#   ref = výchozí HEAD; pro srovnání origin/claude/integrace-16-10.
# Síť: jen registry.npmjs.org (npm audit / npm view), nic jiného.
set -u
REF=${1:-HEAD}
KOREN=$(cd "$(dirname "$0")/../../.." && pwd)
T=$(mktemp -d)
g() { git -C "$KOREN" show "$REF:$1"; }
g package.json > "$T/package.json"; g package-lock.json > "$T/package-lock.json"
fail=0; info=0
python3 -I - "$T/package.json" "$T/package-lock.json" <<'PY' || fail=1
import json, sys
pj = json.load(open(sys.argv[1])); lk = json.load(open(sys.argv[2]))
ok = True
for jm, rozsah in {**pj.get('dependencies', {}), **pj.get('devDependencies', {})}.items():
    pres = not any(c in rozsah for c in '^~*xX><|')
    print('  závislost %s rozsah %s → %s' % (jm, rozsah, 'přesná' if pres else 'ROZSAH (nepřipnuto v package.json)'))
for cesta, p in lk.get('packages', {}).items():
    if not cesta:
        continue
    r = p.get('resolved', ''); i = p.get('integrity', '')
    print('  zámek %s %s resolved=%s integrity=%s installScript=%s' % (
        cesta, p.get('version'), r.split('/-/')[0], (i[:12] + '…') if i else 'CHYBÍ', p.get('hasInstallScript', False)))
    if not r.startswith('https://registry.npmjs.org/') or not i.startswith('sha512-') or p.get('hasInstallScript'):
        ok = False; print('  FAIL: zdroj mimo registr / chybí integrita / instalační skript')
sys.exit(0 if ok else 1)
PY
# integrita zámku == registr, a drift rozsahu ^ (nejvyšší verze v rozsahu vs. zamčená)
zam=$(python3 -I -c "import json,sys;p=json.load(open(sys.argv[1]))['packages']['node_modules/@netlify/blobs'];print(p['version'],p['integrity'])" "$T/package-lock.json")
ver=${zam% *}; integ=${zam#* }
reg=$(cd "$T" && timeout 60 npm view "@netlify/blobs@$ver" dist.integrity 2>/dev/null)
if [ -z "$reg" ]; then echo "  INFO: registr nedostupný — integritu neověřuji"; info=1
elif [ "$reg" = "$integ" ]; then echo "  OK: integrita @netlify/blobs@$ver v zámku = registr"
else echo "  FAIL: integrita v zámku se liší od registru"; fail=1; fi
rozsah=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['dependencies']['@netlify/blobs'])" "$T/package.json")
nejv=$(cd "$T" && timeout 60 npm view "@netlify/blobs@$rozsah" version 2>/dev/null | tail -1 | awk '{print $NF}' | tr -d "'")
[ -n "$nejv" ] && echo "  rozsah $rozsah: nejvyšší v registru $nejv, zamčeno $ver ($([ "$nejv" = "$ver" ] && echo 'bez driftu' || echo 'DRIFT: npm install bez zámku by vzal jinou verzi'))"
aud=$(cd "$T" && timeout 90 npm audit --package-lock-only --json 2>/dev/null | python3 -I -c "import json,sys;m=json.load(sys.stdin)['metadata']['vulnerabilities'];print(m['total'],m)" 2>/dev/null)
[ -n "$aud" ] && echo "  npm audit --package-lock-only: zranitelností ${aud%% *}" || { echo "  INFO: npm audit neproběhl"; info=1; }
[ -n "$aud" ] && [ "${aud%% *}" != "0" ] && fail=1
# CI
for wf in $(git -C "$KOREN" ls-tree --name-only "$REF" .github/workflows/); do
  c=$(g "$wf")
  nep=$(printf '%s\n' "$c" | grep -E '^\s*-?\s*uses:' | grep -vcE '@[0-9a-f]{40}')
  perm=$(printf '%s\n' "$c" | grep -E '^permissions:' -A1 | tail -1 | tr -d ' ')
  co=$(printf '%s\n' "$c" | grep -c 'actions/checkout@'); pc=$(printf '%s\n' "$c" | grep -c 'persist-credentials: false')
  npmi=$(printf '%s\n' "$c" | grep -cE 'npm (i|install) ')
  npmci=$(printf '%s\n' "$c" | grep -cE 'npm ci')
  echo "  $wf: akce nepřipnuté na SHA=$nep, permissions=$perm, checkout=$co (persist-credentials:false u $pc), npm i/install=$npmi, npm ci=$npmci"
  [ "$nep" != "0" ] && fail=1
done
ng=$(g netlify.toml | grep -E '^\s*NODE_VERSION' | tr -d ' ')
echo "  netlify.toml: $ng; build = $(g netlify.toml | grep -E '^\s*command' | tr -s ' ')"
[ -z "$(git -C "$KOREN" ls-tree --name-only "$REF" ci/ 2>/dev/null)" ] && echo "  INFO: ci/package-lock.json (zámek Playwrightu, SEC-N7) chybí — Playwright v CI bez zámku" && info=1
[ -z "$(git -C "$KOREN" ls-tree --name-only "$REF" .github/dependabot.yml 2>/dev/null)" ] && echo "  INFO: .github/dependabot.yml chybí (SEC-I13)" && info=1
rm -rf "$T"
if [ $fail -ne 0 ]; then echo "VÝSLEDEK: FAIL ($REF)"; else echo "VÝSLEDEK: OK ($REF) — zámek jen z registru s integritou, 0 zranitelností, akce na SHA$([ $info -ne 0 ] && echo '; zbytky viz INFO')"; fi
exit $fail
