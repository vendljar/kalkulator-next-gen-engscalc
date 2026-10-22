import json,sys
t=open(sys.argv[1],encoding='utf-8').read()
zac='<script id="data" type="application/json">'
a=t.index(zac)+len(zac); b=t.index('</script>',a)
# K6-W1: prohlížeč ukončí datový blok na „</script“ v JAKÉKOLI velikosti písmen
# (i na „<!--“) — znak „<“ proto v datech být nesmí, zapisuje se jako <.
if '<' in t[a:b]:
    sys.exit('kokpit: v datovém bloku je znak „<“ (např. „</ScRiPt>“ ve jméně větve) — zapiš ho jako \\u003c')
d=json.loads(t[a:b]); assert all(k in d for k in ('aktualizace','cekaNaJV','dlazdice','faze','sezeni','log'))
print('kokpit JSON OK:',len(d['sezeni']),'sezení')
