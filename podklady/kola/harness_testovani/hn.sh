#!/usr/bin/env bash
# HN #646 na TESTU (22. 11. 2026): overit_sod.mjs (05a496d) nad skutečnými šablonami smluv z testu.
# Šablony se stahují jen čtením (hn_sablony.js); KNG_PODKLADY ukazuje na jejich složku.
# Pojistka: harness před HN (cda289e) nad týmiž šablonami musí padat (čekáno 46/5).
# Použití: bash hn.sh <scratch složka>   (worktree 05a496d se sestavením se vyrobí do <scratch>/wt05)
set -u
SP="${1:?scratch složka}"; REPO="$(git rev-parse --show-toplevel)"; H="$REPO/podklady/kola/harness_testovani"
[ -d "$SP/wt05" ] || git -C "$REPO" worktree add -f "$SP/wt05" 05a496d
cd "$SP/wt05" && [ -f dist/kalkulacka.html ] || KNG_NEZVYSOVAT_VERZI=1 python3 build.py
[ -e node_modules ] || ln -s "$REPO/node_modules" node_modules   # ESM import playwright NODE_PATH nečte
NODE_PATH=$(npm root -g) node "$H/hn_sablony.js" https://testengscalc.netlify.app KNG_TEST_EMAIL KNG_TEST_HESLO "$SP/hn_podklady" | sed -E 's/[[:alnum:]._%+-]+@[[:alnum:].-]+/<email>/g'
KNG_PODKLADY="$SP/hn_podklady" node overit_sod.mjs > "$SP/hn_log1.txt" 2>&1; echo "nový harness kód $? — ✓ $(grep -c '✓' "$SP/hn_log1.txt") ✗ $(grep -c '✗' "$SP/hn_log1.txt")"
git show cda289e:overit_sod.mjs > overit_sod_stary.mjs
KNG_PODKLADY="$SP/hn_podklady" node overit_sod_stary.mjs > "$SP/hn_log_stary.txt" 2>&1; echo "starý harness kód $? — ✓ $(grep -c '✓' "$SP/hn_log_stary.txt") ✗ $(grep -c '✗' "$SP/hn_log_stary.txt")"
rm -f overit_sod_stary.mjs
