#!/usr/bin/env python3
"""NP: porovnání textu Kompletního náhledu (stránky) s Wordem (document.xml) slovo po slově.
Použití: python3 -I np_porovnej.py <složka OUT> <tag>  → rozdílné úseky (částky a čísla začerněna █)."""
import sys, zipfile, re, json, difflib, html
d, tag = sys.argv[1], sys.argv[2]
x = zipfile.ZipFile(f'{d}/{tag}_word.docx').read('word/document.xml').decode('utf8')
x = re.sub(r'<w:tab/>', ' ', x); x = re.sub(r'<w:br[^>]*/>', '\n', x)
x = re.sub(r'</w:p>', '\n', x); x = re.sub(r'</w:tc>', '\n', x)
word = html.unescape(re.sub(r'<[^>]+>', '', x))
nah = open(f'{d}/{tag}_nahled.txt', encoding='utf8').read().replace('=====STRANA=====', ' ')
def tok(t):
    t = t.replace(' ', ' ').replace(' ', ' ').replace('‑', '-')
    return [w for w in re.split(r'\s+', t) if w]
a, b = tok(word), tok(nah)
open(f'{d}/{tag}_word.txt', 'w').write(word)
m = difflib.SequenceMatcher(None, a, b, autojunk=False)
skryj = lambda s: re.sub(r'\d', '█', s)
roz = [(op, ' '.join(a[i1:i2]), ' '.join(b[j1:j2])) for op, i1, i2, j1, j2 in m.get_opcodes() if op != 'equal']
print(f'{tag}: slov Word {len(a)}, náhled {len(b)}, shoda {m.ratio():.4f}, rozdílných úseků {len(roz)}')
for op, w, n in roz: print(f'  {op:7} WORD «{skryj(w)[:220]}»  NÁHLED «{skryj(n)[:220]}»')
