import sys,zipfile,re,os
def rozbor(f):
    z=zipfile.ZipFile(f); out={}
    names=z.namelist()
    hf=[n for n in names if re.match(r'word/(header|footer)\d*\.xml$',n)]
    instr=[];simple=[];pevne=[]
    for n in hf+['word/document.xml']:
        x=z.read(n).decode('utf-8','ignore')
        for i in re.findall(r'<w:instrText[^>]*>([^<]*)</w:instrText>',x):
            if re.search(r'PAGE|NUMPAGES|SECTIONPAGES',i): instr.append(n[5:-4]+':'+i.strip())
        for i in re.findall(r'<w:fldSimple[^>]*w:instr="([^"]*)"',x):
            if re.search(r'PAGE|NUMPAGES',i): simple.append(n[5:-4]+':'+i.strip())
        if n in hf:
            t=re.sub(r'<[^>]+>','|',x); t=re.sub(r'\|+','|',t)
            m=re.findall(r'(?:Strana|Seite|Page|str\.)[^|]{0,5}\|?\s*\d+',t)
            if m: pevne.append(n[5:-4]+':'+';'.join(m[:2]))
    s=z.read('word/settings.xml').decode('utf-8','ignore') if 'word/settings.xml' in names else ''
    upd=bool(re.search(r'<w:updateFields[^>]*w:val="(true|1)"',s)) or ('<w:updateFields/>' in s)
    # fldChar celistvost: begin/separate/end počty v hlavičkách a zápatích
    fc={k:0 for k in ('begin','separate','end')}
    for n in hf:
        x=z.read(n).decode('utf-8','ignore')
        for k in fc: fc[k]+=len(re.findall(r'w:fldCharType="'+k+'"',x))
    return dict(zapati=len(hf),instr=instr,simple=simple,pevnyText=pevne,updateFields=upd,fldChar=fc)
for f in sys.argv[1:]: print(os.path.basename(f).ljust(28), rozbor(f))
