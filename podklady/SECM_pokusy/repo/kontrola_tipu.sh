#!/usr/bin/env bash
# SEC-M, čočka repo: nastroje/kontrola_udaju.py (verze z pracovní kopie = main)
# nad stromem tipu KAŽDÉHO refu úplného klonu (větve, tagy, ostatní refy).
#
# Použití (z kořene repa):
#   bash podklady/SECM_pokusy/repo/kontrola_tipu.sh <mirror.git> [pracovní složka]
#
# Každý tip se rozbalí `git archive` do dočasné složky, přepíše se do ní
# kontrola_udaju.py a povolene_kontakty.txt z main (aby se všechny refy měřily
# stejným metrem) a spustí se. Vypíše počet nálezů a jejich TYPY (hodnoty ne).
set -u
M=${1:?cesta k mirror klonu}
PRAC=${2:-$(mktemp -d)}
KOREN=$(cd "$(dirname "$0")/../../.." && pwd)
mkdir -p "$PRAC"
cist=0; spinave=0
while read -r ref; do
  d="$PRAC/strom"; rm -rf "$d"; mkdir -p "$d"
  git --git-dir "$M" archive "$ref" | tar -x -C "$d"
  mkdir -p "$d/nastroje"
  cp "$KOREN/nastroje/kontrola_udaju.py" "$KOREN/nastroje/povolene_kontakty.txt" "$d/nastroje/"
  out=$(python3 -I "$d/nastroje/kontrola_udaju.py" 2>&1); kod=$?
  if [ $kod -eq 0 ]; then
    cist=$((cist + 1))
  else
    spinave=$((spinave + 1))
    typy=$(printf '%s\n' "$out" | grep -E '^  ' | sed -E 's/^  ([^:]+):[0-9]+  ([^:]+):.*/\2 (\1)/' | sort | uniq -c | tr -s ' ' | tr '\n' ';')
    echo "NÁLEZ ${ref#refs/}: $typy"
  fi
done < <(git --git-dir "$M" for-each-ref --format='%(refname)')
rm -rf "$PRAC/strom"
echo "VÝSLEDEK: refů čistých $cist, s nálezem $spinave (kontrola_udaju.py z main)"
