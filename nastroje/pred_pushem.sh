#!/usr/bin/env bash
# MÍSTNÍ NÁHRADA CI (24. 9. 2026, rozhodnutí J. V. „testovat lokálně").
#
# GitHub Actions se od 24. 9. 2026 při pushi nespouští samo (jen při pushi na
# main a ručně: GitHub → Actions → Testy → Run workflow). Před pushem na
# test-draft/test proto tytéž kroky pouští tenhle skript v cloudovém sezení
# Claude nebo na stroji s Node 22 + Pythonem 3.
#
# OD 26. 9. 2026 (A5) JE TO JEN OBAL nad nastroje/testovaci_kolo.sh — tam je
# jediný seznam kroků, který pouští i CI (.github/workflows/testy.yml):
#
#   bash nastroje/pred_pushem.sh            = testovaci_kolo.sh --bez-mutaci
#                                             (sestavení, všechny sady v Node,
#                                             všechny prohlížečové harnessy,
#                                             statické kontroly)
#   bash nastroje/pred_pushem.sh --mutace   = testovaci_kolo.sh
#                                             (navíc mutace jádra i serveru —
#                                             když se měnil server nebo jádro;
#                                             trvá kolem 40 minut, NEPŘERUŠOVAT)
#
# Firemní šablony (nejsou v repozitáři) předejte přes KNG_PODKLADY=<složka>,
# jinak se harnessy, které je potřebují, hlásí jako přeskočené.
# Spouštět PO commitu (kontrola verze měří proti datu posledního commitu).
# Návratový kód 0 = vše zelené, jinak počet selhaných kroků.

cd "$(dirname "$0")/.." || exit 1
if [ "${1:-}" = "--mutace" ]; then shift; exec bash nastroje/testovaci_kolo.sh "$@"; fi
exec bash nastroje/testovaci_kolo.sh --bez-mutaci "$@"
