import sys,zipfile,re,glob,os
K={'A':['KANAR-A-KONTAKT','KANAR-A-ZASTUPCE','99811014'],'A2':['KANAR-A2-ZASTUPCE'],'B':['KANAR-B-KONTAKT','99811022'],'C':['KANAR-C-KONTAKT','KANAR-C-ZASTPROJ','CZKANARC2','99811031']}
for f in sorted(glob.glob(sys.argv[1]+'/*_*_*.docx')):
    z=zipfile.ZipFile(f); t=' '.join(re.sub(r'<[^>]+>','',z.read(n).decode('utf-8','ignore')) for n in z.namelist() if n.endswith('.xml'))
    h=f.replace('.docx','.html.txt'); th=open(h).read() if os.path.exists(h) else ''
    found={k:[c for c in v if c in t] for k,v in K.items()}; foundh={k:[c for c in v if c in th] for k,v in K.items()}
    extra=''
    if 'kryci' in f:
        extra=' | KL: zástupce sekce=%s banka=%s účet=%s zápis=%s' % (bool(re.search(r'[Ss]mluvn',t)), bool(re.search(r'[Bb]anka',t)), bool(re.search(r'[Úú]čet|IBAN',t)), bool(re.search(r'[Zz]ápis|zapsan',t)))
    print(os.path.basename(f)[:-5].ljust(28), 'Word:',{k:len(v) for k,v in found.items() if v}, ' náhled:',{k:len(v) for k,v in foundh.items() if v}, extra)
