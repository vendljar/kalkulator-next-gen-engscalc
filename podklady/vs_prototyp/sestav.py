import sys, re
S = sys.argv[1]; dist = open(S + '/' + (sys.argv[2] if len(sys.argv) > 2 else 'wti4') + '/dist/kalkulacka.html', encoding='utf-8').read()
r = lambda f: open(S + '/v4/' + f, encoding='utf-8').read()
def sloz(s_b, artefakt):
    h = dist
    i = h.index('<head>') + len('<head>')
    h = h[:i] + '\n<script>\n' + r('a1_prostredi.js') + '\n</script>\n' + h[i:]
    j = h.rindex('</body>')
    vloz = '<script>\n' + r('a2_cenik.js') + '\n</script>\n'
    if s_b: vloz += '<script>\n' + r('b_vice_sachet.js') + '\n</script>\n'
    h = h[:j] + vloz + h[j:]
    if artefakt:
        h = h.replace('<title>Kalkulátor OCK + PROJ</title>', '', 1)
        h = re.sub(r'^<!DOCTYPE html>\s*', '', h, count=1)
        h = h.replace('<html lang="cs">', '', 1).replace('<head>', '', 1).replace('</head>\n<body>', '', 1)
        k = h.rindex('</body>'); h = h[:k] + h[k:].replace('</body>', '', 1).replace('</html>', '', 1)
        h = '<title>Prototyp víc šachet OCK</title>\n<!-- PROTOTYP VS (#570): sestavená aplikace z integrace claude/integrace-16-10 0f16310 (v6.11.4 = další verze main) + vrstvy A1/A2 (offline, zkušební ceník) + B (víc šachet). Nic se neukládá ani neposílá. -->\n' + h
    return h
open(S + '/v4/baseline.html', 'w', encoding='utf-8').write(sloz(False, False))
open(S + '/v4/proto_test.html', 'w', encoding='utf-8').write(sloz(True, False))
open(S + '/v4/VS_PROTOTYP.html', 'w', encoding='utf-8').write(sloz(True, True))
print('ok', len(sloz(True, True)))
