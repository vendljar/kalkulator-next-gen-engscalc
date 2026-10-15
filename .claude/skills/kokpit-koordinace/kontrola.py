import json,sys
t=open(sys.argv[1],encoding='utf-8').read()
a=t.index('<script id="data" type="application/json">')+42; b=t.index('</script>',a)
d=json.loads(t[a:b]); assert all(k in d for k in ('aktualizace','cekaNaJV','dlazdice','faze','sezeni','log'))
print('kokpit JSON OK:',len(d['sezeni']),'sezení')
