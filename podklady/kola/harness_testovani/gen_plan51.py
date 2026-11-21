# -*- coding: utf-8 -*-
"""Plán kola 51 (z balíčku gen_plan.py, rozšířeno): N nových náhodných kalkulací (N = násobek 50, výchozí 100) nad TEST sadou + regresní sady z předchozího plánu.

python3 gen_plan51.py <export.json> <predchozi_plan.json> <seed> <pismeno> <vystup_plan.json> [N]
  - export.json: export z testu (zak = TEST zakázky K28/K29/K36),
  - predchozi_plan.json: plán minulého kola (plany/plan49.json),
  - seed: semínko (doporučeno RRRRMMDD dne kola), pismeno: předpona ID nové sady (např. E → E01–E50).
Nová sada jde do klíče 'nah'; dřívější 'nah' minulého kola se přesune do 'nah<písmeno>' (např. nahD) a nejstarší
regresní sada vypadne (kolo 51: 408 kalkulací)."""
import json, random, sys
EXP, PRED, SEED, PIS, OUT = sys.argv[1:6]
N = int(sys.argv[6]) if len(sys.argv) > 6 else 100; assert N % 50 == 0; X = N // 50  # násobek skladby sady po 50
R = random.Random(int(SEED))
d = json.load(open(EXP, encoding='utf-8'))
K28 = {c.split(' - ')[-1].split('-')[1]: c for c in d['zak'] if ' - K28-' in c}
ids = sorted(K28)
C = [i for i in ids if i.startswith('C')]; Z = [i for i in ids if i.startswith('Z')]; Pp = [i for i in ids if i.startswith('P')]
VOL = ['prechodove', 'leseniVnitrni', 'leseniVnejsi', 'leseniHlava', 'haky', 'zabradli', 'sokl']
ND = ['bez', 'sklo', 'plech', 'material']; BOKY = ['sklo', 'plech', 'material']


def ock(i, baze, mustky=False, novy=False, hrana=None):
    typ = R.choice(['exteriérová', 'interiérová']); nast = R.randint(2, 12)
    zdvih = round(nast * R.uniform(2.6, 3.4) - R.uniform(0, 2.5), 2)
    vol = {k: R.random() < 0.35 for k in VOL}
    if R.random() < 0.6: del vol['leseniHlava']
    m = dict(id=i, zaklad=K28[baze], typ=typ, prepni=True, zdvih=zdvih, nastupiste=nast, prejezd=round(R.uniform(3.4, 4.6), 2),
             prohluben=round(R.uniform(1.2, 1.6), 2), sirka=round(R.uniform(1.3, 2.3), 2), hloubka=round(R.uniform(1.3, 2.5), 2),
             cistyVstupMm=R.choice([800, 900, 1000, 1100]), vol=vol, nadDvermi=R.choice(ND),
             marze=R.choice([0.15, 0.18, 0.2, 0.22, 0.25]), dph=R.choice([0.12, 0.21]))
    if R.random() < 0.6: b = R.choice(BOKY); m['bokyVypln'] = b; m['bokyDveri'] = b
    if mustky:
        m['mustkyKs'] = R.choice([1, 2, nast - 1, nast, R.randint(1, nast)]); m['mustekSirkaMm'] = R.choice([900, 1200, 1500])
        m['mustekHloubkaMm'] = R.choice([600, 900, 1000, 1200, 1500, 2500])
    if novy: m['novyCenik'] = True
    if hrana == 'nizka': m.update(nastupiste=2, zdvih=2.8)
    if hrana == 'vysoka': m.update(nastupiste=15, zdvih=46.5)
    if hrana == 'jedno': m.update(nastupiste=1, zdvih=0.0)
    if hrana == 'mustekPrazdny': m.update(mustkyKs=2, mustekSirkaMm=1200, mustekHloubkaMm='')
    if hrana == 'mustek6000': m.update(mustkyKs=1, mustekSirkaMm=1200, mustekHloubkaMm=6000)
    if hrana == 'vseVol': m['vol'] = {k: True for k in VOL}
    return m


nah = []; n = [0]
def nid(): n[0] += 1; return ('%s%03d' if N >= 100 else '%s%02d') % (PIS, n[0])
for x in range(X):  # každý blok 50 = 15 C + 15 C s můstky + 6 hran + 9 zahraničních + 5 PROJ
    for k in range(15): nah.append(ock(nid(), R.choice(C), novy=k < 5))
    for k in range(15): nah.append(ock(nid(), R.choice(C), mustky=True, novy=k < 7))
    for h in ['nizka', 'vysoka', 'jedno', 'mustekPrazdny', 'mustek6000', 'vseVol']: nah.append(ock(nid(), R.choice(C), novy=True, hrana=h))
    for k in range(9): nah.append(ock(nid(), R.choice(Z), mustky=k < 6, novy=k in (0, 1, 3, 6)))
    for k in range(5): nah.append(dict(id=nid(), zaklad=K28[R.choice(Pp)], f=[round(R.uniform(0.5, 1.8), 3) for _ in range(40)]))
P = json.load(open(PRED, encoding='utf-8'))
# regrese: minulá nová sada + tři nejnovější starší náhodné sady, cílené L+G a C
starsi = [k for k in P if k.startswith('nah') and k != 'nah']
plan = {'std': P['std'], 'nah': nah, 'nah' + P['nah'][0]['id'][0]: P['nah']}
for k in starsi[:3]: plan[k] = P[k]
plan['cil'] = P['cil']; plan['cilC'] = P['cilC']
ids = [m['id'] for k in plan if k != 'std' for m in plan[k]]
assert len(ids) == len(set(ids)), 'duplicitní ID – zvolte jiné písmeno'
json.dump(plan, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print({k: len(v) for k, v in plan.items()})
