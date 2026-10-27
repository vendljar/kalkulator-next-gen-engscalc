#!/usr/bin/env python3
"""SEC-M, čočka repo: sken tajemství a osobních údajů ve VŠECH blobech úplného klonu.

Použití (z kořene repa):
  python3 -I podklady/SECM_pokusy/repo/sken_historie.py <cesta k --mirror klonu>

Projde všechny objekty dosažitelné z libovolného refu (větve, tagy, ostatní refy),
u každého blobu (textového) hledá vzory tajemství a osobních údajů a vypíše jen
MASKOVANOU podobu (první 4 znaky + délka), typ, první cestu, první commit (z
`git log --all --find-object`) a které tipy refů blob nesou. Nic necituje celé.

Povolený seznam kontaktů bere z nastroje/povolene_kontakty.txt pracovní kopie (main).
Výstup končí řádkem VÝSLEDEK.
"""
import collections
import os
import re
import subprocess
import sys

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(KOREN, 'nastroje'))

if len(sys.argv) < 2:
    sys.exit('použití: sken_historie.py <mirror.git>')
GIT = ['git', '--git-dir', sys.argv[1]]

SHA40 = r'[0-9a-fA-F]{40}'
VZORY = [
    ('token Pipedrive (kontext)', re.compile(
        r'(?:api[_-]?token|apitoken|x-api-token|PIPEDRIVE[_A-Z]*TOKEN)[\'"]?\s*(?:[:=,]|%3D)\s*[\'"]?(' + SHA40 + r')\b', re.I)),
    ('token GitHub', re.compile(r'\b(gh[pousr]_[A-Za-z0-9]{30,})\b')),
    ('token GitHub (jemný)', re.compile(r'\b(github_pat_[A-Za-z0-9_]{20,})')),
    ('klíč AWS', re.compile(r'\b(AKIA[0-9A-Z]{16})\b')),
    ('token Netlify', re.compile(r'\b(nfp_[A-Za-z0-9]{30,})\b')),
    ('token Slack', re.compile(r'\b(xox[baprs]-[A-Za-z0-9-]{20,})\b')),
    ('klíč Google', re.compile(r'\b(AIza[0-9A-Za-z_-]{35})\b')),
    ('klíč sk-', re.compile(r'\b(sk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,})')),
    ('JWT', re.compile(r'\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})')),
    ('privátní klíč', re.compile(r'(-----BEGIN [A-Z ]*PRIVATE KEY-----)')),
    ('odkaz cshk', re.compile(r'(claude\.ai/code/cshk_[A-Za-z0-9_-]{6,})')),
    ('odkaz claude.ai/share', re.compile(r'(claude\.ai/share/[0-9A-Za-z-]{8,})')),
    ('TAJEMSTVI_RELACE hodnota', re.compile(r'TAJEMSTVI_RELACE[\'"]?\s*[:=]\s*[\'"]?([^\s\'"`;,)]{8,})')),
    ('ADMIN_INIT_HESLO hodnota', re.compile(r'ADMIN_INIT_HESLO[\'"]?\s*[:=]\s*[\'"]?([^\s\'"`;,)]{6,})')),
    ('heslo v přiřazení', re.compile(r'(?:password|passwd|heslo)[\'"]?\s*[:=]\s*[\'"]([^\'"]{6,})[\'"]', re.I)),
    ('Netlify Blobs token/siteID', re.compile(r'(?:NETLIFY_(?:AUTH_)?TOKEN|NETLIFY_BLOBS_CONTEXT)[\'"]?\s*[:=]\s*[\'"]?([A-Za-z0-9_=-]{20,})')),
]
# zkušební hodnoty (test/harness) — samy o sobě nejsou nález, ale vypíšou se zvlášť
ZKUSEBNI = re.compile(r'zkus|test|docas|pokus|harness|priklad|example|xxx|tajne|tajemstvi|heslo|abc|1234|\$\{|process\.env|<|\.\.\.|…', re.I)

EMAIL = re.compile(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}')
TELEFON = re.compile(r'(?<![\w.,/-])(?:\+420[  -]?)?[67]\d{2}[  -]?\d{3}[  -]?\d{3}(?![\w])')
TELEFON_ZAHR = re.compile(r'\+4(?!20)\d{2}[  -]?\d{3}[  -]?\d{3}[  -]?\d{3}(?![\w])')


def maska(s):
    s = s.strip()
    return '%s…(%d zn.)' % (s[:4], len(s))


def nacti_povolene():
    em, dom, tel = set(), set(), set()
    for r in open(os.path.join(KOREN, 'nastroje', 'povolene_kontakty.txt'), encoding='utf-8'):
        r = r.split('#', 1)[0].strip()
        if not r:
            continue
        if r.startswith('*@'):
            dom.add(r[2:].lower())
        elif '@' in r:
            em.add(r.lower())
        else:
            tel.add(re.sub(r'\D', '', r)[-9:])
    return em, dom, tel


def git(*a):
    return subprocess.run(GIT + list(a), capture_output=True, text=True, check=True).stdout


def main():
    em_ok, dom_ok, tel_ok = nacti_povolene()
    # technické adresy, které nejsou osobní údaj
    tech = re.compile(r'(noreply|no-reply|users\.noreply\.github\.com|@anthropic\.com$|@netlify\.com$|@github\.com$)', re.I)
    objekty = git('rev-list', '--objects', '--all').splitlines()
    cesta_blobu = {}
    for r in objekty:
        sha, _, cesta = r.partition(' ')
        if cesta and sha not in cesta_blobu:
            cesta_blobu[sha] = cesta
    typy = subprocess.run(GIT + ['cat-file', '--batch-check'], input='\n'.join(cesta_blobu) + '\n',
                          capture_output=True, text=True, check=True).stdout.splitlines()
    bloby = [t.split()[0] for t in typy if t.split()[1] == 'blob' and int(t.split()[2]) < 20_000_000]
    p = subprocess.Popen(GIT + ['cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    nalezy = collections.defaultdict(lambda: {'bloby': set(), 'cesty': set()})  # (typ, hodnota) -> ...
    ceniky = []  # (blob, cesta, nenulové klíče)
    for sha in bloby:
        p.stdin.write((sha + '\n').encode()); p.stdin.flush()
        hlav = p.stdout.readline().split()
        n = int(hlav[2]); data = p.stdout.read(n); p.stdout.read(1)
        if b'\0' in data[:8000]:
            continue  # binární (obrázky); .xlsx/.docx zde neřešíme
        text = data.decode('utf-8', 'replace')
        cesta = cesta_blobu[sha]
        for popis, vzor in VZORY:
            for m in vzor.finditer(text):
                hod = m.group(1)
                if popis in ('TAJEMSTVI_RELACE hodnota', 'ADMIN_INIT_HESLO hodnota', 'heslo v přiřazení',
                             'Netlify Blobs token/siteID') and ZKUSEBNI.search(hod):
                    popis2 = popis + ' [zkušební/odkaz]'
                else:
                    popis2 = popis
                nalezy[(popis2, hod)]['bloby'].add(sha); nalezy[(popis2, hod)]['cesty'].add(cesta)
        for m in EMAIL.finditer(text):
            e = m.group(0).lower().rstrip('.')
            if e in em_ok or e.split('@', 1)[1] in dom_ok or tech.search(e):
                continue
            if re.search(r'\.(png|jpg|svg|js|css|mjs)$', e):
                continue
            nalezy[('e-mail mimo seznam', e)]['bloby'].add(sha); nalezy[('e-mail mimo seznam', e)]['cesty'].add(cesta)
        for vz in (TELEFON, TELEFON_ZAHR):
            for m in vz.finditer(text):
                t = re.sub(r'\D', '', m.group(0))[-9:]
                if t in tel_ok or len(set(t)) <= 2:
                    continue
                nalezy[('telefon mimo seznam', t)]['bloby'].add(sha); nalezy[('telefon mimo seznam', t)]['cesty'].add(cesta)
        i = text.find('const DEFAULT_CENIK = {')
        if i >= 0:
            j = text.find('\n};', i)
            blok = re.sub(r'/\*.*?\*/', '', text[i:j], flags=re.S)
            blok = re.sub(r'//[^\n]*', '', blok)
            nenul = sorted(set(k for k, v in re.findall(r'(\w+)\s*:\s*(-?\d+(?:\.\d+)?)', blok) if float(v) != 0))
            ceniky.append((sha, cesta, nenul))
    p.stdin.close(); p.wait()

    # tipy refů -> které bloby nesou (pro vybrané nálezy)
    refy = [r.split() for r in git('for-each-ref', '--format=%(refname) %(objectname)').splitlines()]
    hledane = set()
    for v in nalezy.values():
        hledane |= v['bloby']
    nese = collections.defaultdict(set)
    for ref, _ in refy:
        for r in git('ls-tree', '-r', ref).splitlines():
            sha = r.split()[2]
            if sha in hledane:
                nese[sha].add(ref.replace('refs/heads/', '').replace('refs/', ''))

    print('Projito refů: %d, objektů: %d, blobů (text i binární < 20 MB): %d' % (len(refy), len(objekty), len(bloby)))
    print()
    poradi = sorted(nalezy.items(), key=lambda kv: (kv[0][0], kv[0][1]))
    vazne = 0
    for (popis, hod), v in poradi:
        refy_nesou = set()
        for b in v['bloby']:
            refy_nesou |= nese.get(b, set())
        if popis.startswith('e-mail'):
            uk = hod.split('@')[0][:2] + '…@' + hod.split('@')[1]
        elif popis.startswith('telefon'):
            uk = hod[:3] + '…' + hod[-2:]
        else:
            uk = maska(hod)
        tipy = sorted(refy_nesou)
        tagy = [t for t in tipy if t.startswith('tags/')]
        vetve = [t for t in tipy if not t.startswith('tags/')]
        if '[zkušební' not in popis:
            vazne += 1
        print('[%s] %s | bloby %d | cesty: %s | tipy větví %d%s | tagy %d%s' % (
            popis, uk, len(v['bloby']), ', '.join(sorted(v['cesty']))[:160],
            len(vetve), (' (' + ', '.join(vetve[:8]) + (', …' if len(vetve) > 8 else '') + ')') if vetve else '',
            len(tagy), (' (' + ', '.join(tagy[:3]) + (', …' if len(tagy) > 3 else '') + ')') if tagy else ''))
    print()
    zakl = None
    for sha, cesta, nenul in ceniky:
        if cesta == 'src/engine.js':
            pass
    sady = collections.Counter(tuple(n) for _, _, n in ceniky)
    print('DEFAULT_CENIK: %d různých blobů; sady nenulových číselných klíčů (počet blobů):' % len(ceniky))
    for s, c in sady.most_common():
        print('  %3d× nenulové klíče: %s' % (c, ', '.join(s) if s else '(žádné)'))
    print()
    print('VÝSLEDEK: %d typů/hodnot nálezů mimo zkušební (k ručnímu posouzení), %d zkušebních.' % (
        vazne, len(nalezy) - vazne))


main()
