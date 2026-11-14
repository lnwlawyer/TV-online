#!/usr/bin/env python3
"""Check user-authorized M3U sources; export only network-verified HLS/MP4 URLs.
Network checks are not proof of copyright permission or browser/TV compatibility.
"""
import argparse, concurrent.futures, csv, pathlib, re, urllib.request, urllib.error, urllib.parse

SOURCES = {
 'thailand': 'https://iptv-org.github.io/iptv/countries/th.m3u',
 'news': 'https://iptv-org.github.io/iptv/categories/news.m3u',
 'sports': 'https://iptv-org.github.io/iptv/categories/sports.m3u',
 'movies-channels': 'https://iptv-org.github.io/iptv/categories/movies.m3u',
 'series-channels': 'https://iptv-org.github.io/iptv/categories/series.m3u',
 'documentary': 'https://iptv-org.github.io/iptv/categories/documentary.m3u',
}
HEADERS={'User-Agent':'OnlineTVPlaylistValidator/0.3 (authorized-stream-check)'}
def fetch(url, max_bytes=2000000, timeout=8):
 req=urllib.request.Request(url,headers=HEADERS)
 with urllib.request.urlopen(req,timeout=timeout) as r:
  if r.status!=200: raise ValueError('HTTP '+str(r.status))
  return r.read(max_bytes+1),r.headers.get('Content-Type','')
def entries(text):
 pending=None
 for line in text.splitlines():
  line=line.strip()
  if line.startswith('#EXTINF:'):
   name=line.split(',',1)[-1].strip()
   attrs=dict(re.findall(r'([\w-]+)="([^"]*)"',line))
   pending={'name':name,'logo':attrs.get('tvg-logo',''),'group':attrs.get('group-title','')}
  elif line and not line.startswith('#') and pending:
   u=urllib.parse.urlparse(line)
   if u.scheme in ('http','https') and u.hostname:
    yield {**pending,'url':line}
   pending=None

def check(item):
 url=item['url']
 try:
  body,ctype=fetch(url,max_bytes=160000,timeout=8)
  low=url.lower().split('?')[0]
  if b'#EXTM3U' in body[:2000]:
   manifest=body.decode('utf-8-sig','replace')
   lines=[x.strip() for x in manifest.splitlines() if x.strip() and not x.startswith('#')]
   if not lines: return item,'unverified','manifest has no referenced media'
   # Master manifests can point to another playlist; check one nested manifest.
   first=urllib.parse.urljoin(url,lines[0])
   if first.lower().split('?')[0].endswith('.m3u8'):
    sub,_=fetch(first,max_bytes=160000,timeout=8)
    if b'#EXTM3U' not in sub[:2000]: return item,'unverified','variant not HLS'
    manifest=sub.decode('utf-8-sig','replace')
    lines=[x.strip() for x in manifest.splitlines() if x.strip() and not x.startswith('#')]
    if not lines: return item,'unverified','variant has no segments'
    first=urllib.parse.urljoin(first,lines[0])
   # Probe first segment; response may be huge, limit bytes.
   seg,segtype=fetch(first,max_bytes=4096,timeout=8)
   if not seg: return item,'unverified','empty segment'
   return item,'network_ok','manifest and first media reference reachable'
  if low.endswith('.mp4') or 'video/mp4' in ctype.lower():
   if body[:8].find(b'ftyp')>=0 or b'ftyp' in body[:64]:return item,'network_ok','MP4 header reachable'
  return item,'unverified','not recognizable HLS/MP4'
 except Exception as e:return item,'unverified',str(e)[:140]

def main():
 p=argparse.ArgumentParser()
 p.add_argument('--sources',nargs='+',choices=sorted(SOURCES),default=['thailand'])
 p.add_argument('--playlist',action='append',default=[],help='additional M3U URL you are authorized to use')
 p.add_argument('--out',default='verified-channels.m3u')
 p.add_argument('--workers',type=int,default=8)
 a=p.parse_args(); found={}; failures=[]
 for label,url in [(k,SOURCES[k]) for k in a.sources]+[(f'custom-{i}',v) for i,v in enumerate(a.playlist)]:
  try:
   data,_=fetch(url,max_bytes=15000000,timeout=20)
   count=0
   for item in entries(data.decode('utf-8-sig','replace')):
    found.setdefault(item['url'],item);count+=1
   print(label,':',count,'entries')
  except Exception as e:failures.append((label,str(e)));print(label,': download failed:',e)
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(a.workers,16))) as pool:
  for item,status,detail in pool.map(check,found.values()):results.append((item,status,detail))
 def safe(s):return re.sub(r'[\r\n"]',' ',s or '')
 out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
 with out.open('w',encoding='utf-8',newline='\n') as f:
  f.write('#EXTM3U\n')
  for item,status,detail in results:
   if status=='network_ok':
    f.write(f'#EXTINF:-1 tvg-logo="{safe(item["logo"])}" group-title="{safe(item["group"])}",{safe(item["name"])}\n{item["url"]}\n')
 with out.with_suffix('.csv').open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.writer(f);w.writerow(['name','url','status','reason']);w.writerows((x['name'],x['url'],s,d) for x,s,d in results)
 print('Network verified:',sum(s=='network_ok' for _,s,_ in results),'/',len(results));print('Output:',out)
 if failures:print('Source download failures:',failures)
 print('NOTE: network_ok does not guarantee browser playback or redistribution rights.')
if __name__=='__main__':main()
