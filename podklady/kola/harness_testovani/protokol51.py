# Protokol kola 51 (z protokol50.py) – jen prodejní ceny TEST zakázek, bez nákladů a jednotkových cen.
import json, glob, ast, collections, openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
import sys
K = sys.argv[1].rstrip('/') + '/'
P = json.load(open(K + 'plan51.json')); SADA = {m['id']: k for k in P if isinstance(P[k], list) for m in P[k] if isinstance(m, dict)}
def nacti(f):
    r = json.load(open(K + f))['vysledky']; out = {}
    for s in ('std', 'nah'):
        x = r.get(s, []); out.update(x if isinstance(x, dict) else {y['id']: y for y in x})
    return out
O = {t: nacti('o_%s.json' % t) for t in ('T', 'Mt', 'M', 'Tp')}
C = {n: json.load(open(K + 'c_%s.json' % n)) for n in ('T_Mt', 'Mt_M', 'Tp_T')}
def cena(o):
    try: return int(o['l'].split(';')[2])
    except Exception: return None
def lisi(cmp, i): return any(k.split(':')[-1] == i and 'l' in v for k, v in C[cmp].items())
def pricina(i, par='T_Mt'):
    v = next((v for k, v in C[par].items() if k.split(':')[-1] == i and 'l' in v), None)
    if not v: return ''
    s = ' '.join(map(str, v['pol']['jen_A'] + v['pol']['jen_B']))
    r = []
    if 'MATERIÁL VSG' in s: r.append('K40-N1')
    if 'STATICKÉ POSOUZENÍ OPL' in s: r.append('K50-N1')
    return ', '.join(r) or 'NEVYSVĚTLENO'
HF = Font(bold=True, color='FFFFFF'); HFILL = PatternFill('solid', fgColor='1D4ED8')
OK = PatternFill('solid', fgColor='E3F5E5'); BAD = PatternFill('solid', fgColor='FDE4E4'); WR = Alignment(wrap_text=True, vertical='top')
wb = openpyxl.Workbook()
def list_(nazev, hlav, radky, sirky):
    ws = wb.create_sheet(nazev); ws.append(hlav)
    for c in ws[1]: c.font = HF; c.fill = HFILL; c.alignment = WR
    for r in radky: ws.append(r)
    for k, w in enumerate(sirky, 1): ws.column_dimensions[get_column_letter(k)].width = w
    ws.freeze_panes = 'B2'; return ws
ws = wb.active; ws.title = 'Přehled'
prehled = json.load(open(K + 'prehled.json'))
for r in prehled: ws.append(r)
ws.column_dimensions['A'].width = 34; ws.column_dimensions['B'].width = 26; ws.column_dimensions['C'].width = 90
for c in ws[1]: c.font = HF; c.fill = HFILL
def radky(ids):
    out = []
    for i in ids:
        t, mt, m, tp = (cena(O[x].get(i, {})) for x in ('T', 'Mt', 'M', 'Tp'))
        out.append([i, SADA.get(i, 'std'), O['T'].get(i, {}).get('typ', ''), t, mt, m, tp, 'shoda' if t == mt else 'rozdíl', 'shoda' if tp == t else 'rozdíl', pricina(i), pricina(i, 'Tp_T')])
    return out
H = ['ID', 'sada', 'typ', 'cena T (test v19.11.11)', 'cena Mt (main, data testu)', 'cena M (main, data main)', 'cena Tp (test v19.11.2)', 'T × Mt', 'Tp × T', 'příčina T × Mt', 'příčina Tp × T']
S = [12, 8, 14, 16, 16, 16, 16, 9, 9, 16, 16]
ids = list(O['T'].keys())
std = [i for i in ids if SADA.get(i, 'std') == 'std']; nove = [i for i in ids if SADA.get(i) == 'nah']; cil = [i for i in ids if SADA.get(i) in ('cil', 'cilC')]
reg = [i for i in ids if i not in std and i not in nove and i not in cil]
for n, sel in (('50 standardních', std), ('Nová sada F (100)', nove), ('Regrese', reg), ('Cílené L+G a C01–C24', cil)):
    w = list_(n, H, radky(sel), S)
    for row in w.iter_rows(min_row=2):
        for c in row[7:9]: c.fill = OK if c.value == 'shoda' else BAD
vs = json.load(open(K + 'o_vs.json'))['vysledky']
list_('Víc šachet (40)', ['ID', 'typ', 'šachet', 'cena = Σ', 'rozpis = celkem', 'SoD vady', 'CN v16', 'CN v17 CZ', 'CN v17 DE', 'zámek', 'zábrana'],
      [[i, v['typ'], v['n'], v.get('cena') == v.get('ocek'), (v.get('rozpisSum') == v.get('cena')) if v.get('rozpis') else '— (1 šachta)', v['w_sod'].get('vady', '—'),
        'ok' if v['w_v16_cz'].get('ok') else 'zastaví', 'ok' if v['w_v17_cz'].get('ok') else 'zastaví', 'ok' if v['w_v17_de'].get('ok') else 'zastaví', str(v.get('overeni')), (v.get('zabrana') or '')[:80]] for i, v in vs.items()],
      [8, 10, 8, 10, 14, 9, 10, 10, 10, 10, 60])
R = {}
for f in sorted(glob.glob(K + 'vz_*.json')):
    d = json.load(open(f)); r = d.get('vysledky', d); R.update(r if isinstance(r, dict) else {x['id']: x for x in r})
def ev(x):
    x = ast.literal_eval(x) if isinstance(x, str) else x
    return 'OK' if (x.get('z1Shoda') and x.get('cenaShoda') and not x.get('z1Kanarek') and not x.get('unik') and not x.get('unikSod')) else ('cena jiná (K49-N2)' if not x.get('cenaShoda') else 'JINAK')
list_('Víc zákazníků (216)', ['zakázka', 'sdílená varianta', 'vlastní varianta'], [[v['c'], ev(v['sdilena']), ev(v['vlastni'])] for v in R.values()], [44, 22, 22])
nal = json.load(open(K + 'nalezy.json'))
list_('Nálezy', ['ID', 'vážnost', 'co', 'stav'], nal, [10, 10, 100, 40])
for w in wb.worksheets:
    for row in w.iter_rows():
        for c in row: c.alignment = WR
wb.save(K + '../VYHODNOCENI_TESTU_KOLO51_TEST_MAIN_2026-11-21.xlsx'); print('uloženo')
