# -*- coding: utf-8 -*-
"""Kolo 52 (= vyhodnot51.py): sloučí dílčí běhy (p_<tag>_*.json → o_<tag>.json), porovná dvojice cmp38.py (c_*.json) a roztřídí rozdíly
čísel podle příčin. Bez cen na výstupu (jen počty a ID). python3 vyhodnot51.py <KOLO> <BAL> <plan52.json>"""
import json, sys, glob, subprocess, collections
K, BAL, PLAN = sys.argv[1:4]; N = BAL + '/nastroje/'
P = json.load(open(PLAN)); SADA = {m['id']: k for k in P if k != 'std' for m in P[k]}
for t in ('T', 'Mt', 'M', 'Tp'):
    subprocess.run(['python3', N + 'slouc.py', K + '/o_%s.json' % t] + sorted(glob.glob(K + '/p_%s_*.json' % t)), check=True)
PARY = (('T_Mt', 'T', 'Mt'), ('Mt_M', 'Mt', 'M'), ('Tp_T', 'Tp', 'T'))
for n, a, b in PARY:
    print('==', n); subprocess.run(['python3', N + 'cmp38.py', K + '/o_%s.json' % a, K + '/o_%s.json' % b, K + '/c_%s.json' % n], check=True)
def pricina(v):
    s = ' '.join(map(str, v.get('pol', {}).get('jen_A', []) + v.get('pol', {}).get('jen_B', [])))
    r = []
    if 'MATERIÁL VSG' in s: r.append('K40-N1')
    if 'STATICKÉ POSOUZENÍ OPL' in s: r.append('K50-N1')
    return '+'.join(r) or 'NEVYSVĚTLENO'
souhrn = {}
for n, a, b in PARY:
    C = json.load(open(K + '/c_%s.json' % n)); O = json.load(open(K + '/o_%s.json' % a))['vysledky']
    celkem = sum(len(O[s]) for s in O); l = {k: v for k, v in C.items() if 'l' in v or 'chyba' in v}
    tr = collections.Counter(pricina(v) if 'l' in v else 'chyba' for v in l.values())
    pole = collections.Counter(p for v in C.values() for p in v)
    nev = [k for k, v in l.items() if 'chyba' in v or pricina(v) == 'NEVYSVĚTLENO']
    pos = collections.Counter(SADA.get(k.split(':', 1)[1], 'std') for k in l)
    souhrn[n] = {'celkem': celkem, 'shodna_cisla': celkem - len(l), 'pricina': tr, 'pole': pole, 'podle_sady': pos, 'nevysvetleno': nev[:40]}
    print(n, json.dumps(souhrn[n], ensure_ascii=False))
json.dump(souhrn, open(K + '/souhrn52.json', 'w'), ensure_ascii=False, indent=1)
