from bs4 import BeautifulSoup
import subprocess
from io import BytesIO
def urlopen(url,timeout=30):
 return BytesIO(subprocess.check_output(["curl","--fail","-L","-s","--max-time",str(timeout),url]))
from urllib.parse import urljoin,urlparse,quote
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json,re
base='https://nilgunoygur.com/'
home=urlopen(base).read().decode()
paths=sorted(set(a['href'][1:] for a in BeautifulSoup(home,'html.parser').select('a[href]') if a['href'].startswith('./')))
out={}
def read(path):
 raw=home if path=='/' else urlopen(base.rstrip('/')+quote(path,safe='/'),timeout=30).read().decode()
 soup=BeautifulSoup(raw,'html.parser')
 text=[]
 for el in soup.select('h1,h2,h3,h4,p'):
  t=el.get_text(' ',strip=True)
  if t and t not in [x['text'] for x in text]: text.append({'tag':el.name,'text':t})
 imgs=list(dict.fromkeys(i['src'].split('?')[0] for i in soup.select('img[src]')))
 links=list({a['href']: {'text':a.get_text(' ',strip=True),'href':a['href']} for a in soup.select('a[href]')}.values())
 return path,{'title':soup.title.get_text() if soup.title else path,'text':text,'images':imgs,'links':links}
with ThreadPoolExecutor(max_workers=8) as pool:
 for path,data in pool.map(read,paths):out[path]=data
Path('lib/reference.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
missing=set(urlparse(urljoin(base.rstrip('/')+p,x['href'])).path for p,d in out.items() for x in d['links'] if x['href'].startswith('.'))-set(out)
with ThreadPoolExecutor(max_workers=8) as pool:
 for path,data in pool.map(read,sorted(missing)):out[path]=data
Path('lib/reference.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
assets=sorted(set(i for p in out.values() for i in p['images']))
Path('public/images').mkdir(exist_ok=True)
def download(url):
 name=urlparse(url).path.split('/')[-1]
 Path('public/images',name).write_bytes(urlopen(url,timeout=30).read())
with ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(download,assets))
Path('public/fonts').mkdir(exist_ok=True)
for f in re.findall(r'@font-face\s*\{[^}]+\}',home):
 if 'Recoleta Medium' in f or 'font-family: "General Sans"' in f:
  url=re.search(r'url\("([^"]+)',f).group(1)
  weight=re.search(r'font-weight: (\d+)',f)
  name='general-'+weight.group(1)+'.woff2' if weight else 'recoleta.ttf'
  Path('public/fonts',name).write_bytes(urlopen(url).read())
print('Imported',len(out),'pages and',len(assets),'images')
for p,d in out.items():
 print('\nPAGE',p,'\n',json.dumps(d['text'][:13],ensure_ascii=False))
