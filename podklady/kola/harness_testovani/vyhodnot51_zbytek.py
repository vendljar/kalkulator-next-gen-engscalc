# -*- coding: utf-8 -*-
"""Kolo 51: tok Word/zámek (pw_*), K29/K36, fuzz, víc šachet, víc zákazníků — jen počty a ID, bez cen.
python3 vyhodnot51_zbytek.py <KOLO> <BAL>"""
import json, sys, glob, subprocess, collections, ast
K, BAL = sys.argv[1:3]; N = BAL + '/nastroje/'
def nacti(vz):
    o = {}
    for f in sorted(glob.glob(K + '/' + vz)):
        r = json.load(open(f))['vysledky']; [o.update(r[s]) for s in r]
    return o
for tag in ('T', 'M'):
    W = nacti('pw_%s_*.json' % tag); ok = 0; zab = []; spatne = []; sodv = collections.Counter()
    for i, v in W.items():
        t = v.get('tok') or {}
        if v.get('chyba'): spatne.append((i, v['chyba'][:80])); continue
        if t.get('zabrana'): zab.append((i, t['zabrana'][60:130])); continue
        w = [t.get(k) for k in ('w_cz', 'w_de') if t.get(k)]
        good = all(str(x).startswith('1/0/') for x in w) and t.get('zamek') == 1 and str(t.get('w_sod', '')).startswith('1/') \
            and t.get('zamPo') == 1 and t.get('overeni') == 'shoda/0' and t.get('poShoda') == 1
        sodv[str(t.get('w_sod', '')).split('/')[1] if '/' in str(t.get('w_sod', '')) else '?'] += 1
        ok += good
        if not good: spatne.append((i, t))
    print('tok', tag, 'celkem', len(W), 'OK', ok, 'zábrany', len(zab), 'jinak', len(spatne), 'SoD nevyplněné symboly (počet: kalkulací)', dict(sodv))
    for z in zab: print('   zábrana', z)
    for s in spatne[:10]: print('   JINAK', s)
print('== K29/K36'); subprocess.run(['python3', N + 'cmp38.py', K + '/k2936_T.json', K + '/k2936_Mt.json', K + '/c_k2936.json'])
print('== fuzz'); subprocess.run(['python3', N + 'cmp_fuzz.py', BAL + '/plany/plan_fuzz.json', K])
print('== víc šachet')
vs = json.load(open(K + '/o_vs.json'))['vysledky']; c = collections.Counter()
for i, v in vs.items():
    c['cena=Σ' if v.get('cena') == v.get('ocek') else 'cena≠Σ'] += 1
    if v.get('rozpis'): c['rozpis=celkem' if v.get('rozpisSum') == v.get('cena') else 'rozpis≠celkem'] += 1
    for k in ('w_v16_cz', 'w_v17_cz', 'w_v17_de'): c[k + (' ok' if (v.get(k) or {}).get('ok') else ' zastaví')] += 1
    c['zámek ' + str(v.get('overeni'))] += 1; c['SoD vady ' + str((v.get('w_sod') or {}).get('vady', '—'))] += 1
    if v.get('zabrana'): c['zábrana'] += 1; print('   zábrana', i, v['zabrana'][:100])
print(len(vs), dict(c))
print('== víc zákazníků')
R = {}
for f in sorted(glob.glob(K + '/vz_*.json')):
    d = json.load(open(f)); r = d.get('vysledky', d); R.update(r if isinstance(r, dict) else {x['id']: x for x in r})
def ev(x):
    x = ast.literal_eval(x) if isinstance(x, str) else x
    if x.get('unik') or x.get('unikSod') or x.get('z1Kanarek'): return 'ÚNIK'
    return 'OK' if (x.get('z1Shoda') and x.get('cenaShoda')) else ('cena jiná' if not x.get('cenaShoda') else 'JINAK')
cs = collections.Counter(ev(v['sdilena']) for v in R.values()); cv = collections.Counter(ev(v['vlastni']) for v in R.values())
print(len(R), 'sdílená', dict(cs), 'vlastní', dict(cv), 'vlastní jiná:', [v['c'][-14:] for v in R.values() if ev(v['vlastni']) != 'OK'])
