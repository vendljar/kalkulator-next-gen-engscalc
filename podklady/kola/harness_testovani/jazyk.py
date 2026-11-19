import json,sys,os,subprocess,base64,io,zipfile,re,tempfile
base,envE,envH=sys.argv[1:4]
jar=tempfile.mktemp(dir='/tmp/claude-0/sp/jaz')
body=json.dumps({'email':os.environ[envE],'heslo':os.environ[envH]})
subprocess.run(['curl','-s','-c',jar,'-H','Content-Type: application/json','--data-binary','@-',base+'/api/prihlaseni'],input=body.encode(),capture_output=True)
def get(u): return json.loads(subprocess.run(['curl','-s','-b',jar,base+u],capture_output=True).stdout)
out={}
for t in ['sod_de','sod_en','sod_fr','sodProj_de','sodProj_en','sodProj_fr','nabidka_de','nabidka_en','plnaMoc']:
    o=get('/api/sablony?typ='+t)
    if not o.get('data'): out[t]='—'; continue
    x=zipfile.ZipFile(io.BytesIO(base64.b64decode(o['data']))).read('word/document.xml').decode()
    p=[re.sub(r'<[^>]+>','',s).strip() for s in x.split('</w:p>')]; p=[s for s in p if len(s)>3 and not re.fullmatch(r'\{\{[^}]*\}\}',s)]
    cz=sum(1 for s in p if re.search(r'[ěščřžůĚŠČŘŽŮ]',s))
    out[t]=f"{cz}/{len(p)} v{o.get('verze')} {o.get('nazev')}" + (f" symbolů {len(re.findall(r'{{[A-Z0-9_]+}}',x))}" if t=='plnaMoc' else '')
os.remove(jar)
for k,v in out.items(): print(base[8:20],k,v)
