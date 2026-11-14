import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import Hls from 'hls.js';
import {parseM3U, exportM3U} from './playlist';
import './style.css';
const KEY = 'online-tv-th-channels-v1';
const SELECTED = 'online-tv-th-selected-v1';
const initial = [];
const thaiLivePages = [
  [
    "Thai PBS",
    "https://www.thaipbs.or.th/live"
  ],
  [
    "โทรทัศน์รัฐสภา",
    "https://www.tpchannel.org/live"
  ],
  [
    "TNN 16",
    "https://www.tnnthailand.com/live/"
  ],
  [
    "Workpoint 23",
    "https://www.workpointtv.com/live"
  ],
  [
    "True4U 24",
    "https://true4u.com/live/"
  ],
  [
    "ช่อง 8",
    "https://www.thaich8.com/live"
  ],
  [
    "MONO29",
    "https://www.monomax.me/livetv"
  ],
  [
    "9 MCOT HD",
    "https://tv.mcot.net/mcothd"
  ],
  [
    "one31",
    "https://www.one31.net/live"
  ],
  [
    "ไทยรัฐทีวี 32",
    "https://www.thairath.co.th/tv/live"
  ],
  [
    "ช่อง 3 HD",
    "https://ch3plus.com/live"
  ],
  [
    "อมรินทร์ทีวี 34",
    "https://www.amarintv.com/live"
  ],
  [
    "ช่อง 7HD",
    "https://www.ch7.com/en/live/"
  ],
  [
    "PPTV HD 36",
    "https://www.pptvhd36.com/live/"
  ]
];
const sections = {live:'Live TV',movies:'Movies',series:'Series'};
const kindOf = c => c.kind || 'live';
const playlistPaths = ['verified-live.m3u','verified-vod.m3u'];
const blankForm = {name:'',url:'',logo:'',category:'ทั่วไป',kind:'live'};

function readChannels() { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : initial; } catch { return initial; } }
function validHttp(url) {try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch {return false;} }
function App() {
  const [personal,setChannels] = useState(readChannels);
  const [catalog,setCatalog] = useState([]);
  const [credits,setCredits] = useState({});
  const [catalogError,setCatalogError] = useState(false);
  const [kind,setKind] = useState('live');
  const channels = useMemo(()=>[...personal,...catalog.filter(c=>!personal.some(p=>p.url===c.url))],[personal,catalog]);
  useEffect(()=>{
    const controller = new AbortController();
    Promise.all(playlistPaths.map(async path=>{
      const response = await fetch(import.meta.env.BASE_URL+path,{signal:controller.signal});
      if(!response.ok) throw new Error(path);
      const content = await response.text();
      if(!content.trimStart().startsWith('#EXTM3U')) throw new Error(path);
      return parseM3U(content, response.url);
    })).then(lists=>setCatalog(lists.flat())).catch(()=>{
      if(!controller.signal.aborted) setCatalogError(true);
    });
    fetch(import.meta.env.BASE_URL+'stream-credits.json',{signal:controller.signal})
      .then(response=>response.ok ? response.json() : {})
      .then(setCredits).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  const [selected,setSelected] = useState(()=>localStorage.getItem(SELECTED) || '');
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('ทั้งหมด');
  const [admin,setAdmin] = useState(false);
  const [displayMode,setDisplayMode] = useState(()=>localStorage.getItem('online-tv-display-mode') || 'auto');
  const [tvLayout,setTvLayout] = useState(()=>localStorage.getItem('online-tv-tv-layout') || 'overlay');
  const [tvMenu,setTvMenu] = useState(false);
  const [tvFocused,setTvFocused] = useState(0);
  const isTv = displayMode==='tv' || /Smart-TV|Tizen|Web0S|WebOS|HbbTV/i.test(navigator.userAgent);

  const [editing,setEditing] = useState(null);
  const [form,setForm] = useState(blankForm);
  const [notice,setNotice] = useState('');
  const [error,setError] = useState('');
  const [favorites,setFavorites] = useState(()=>{try{return JSON.parse(localStorage.getItem('online-tv-th-favorites-v1')) || []}catch{return []}});
  const video = useRef(null);
  const fileInput = useRef(null);
  const tvRefs = useRef([]);
  const tvStage = useRef(null);
  const current = channels.find(c=>c.id===selected) || null;
  const credit = credits[current?.url];
  useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(personal));},[personal]);
  useEffect(()=>{localStorage.setItem('online-tv-display-mode',displayMode);},[displayMode]);
  useEffect(()=>{localStorage.setItem('online-tv-tv-layout',tvLayout);},[tvLayout]);
  const sectionItems = useMemo(()=>channels.filter(c=>kindOf(c)===kind),[channels,kind]);
  useEffect(()=>{setTvFocused(0);},[kind]);
  useEffect(()=>{
    if(!isTv || admin) return;
    function key(event){
      if(['INPUT','TEXTAREA','SELECT','VIDEO'].includes(document.activeElement?.tagName)) return;
      const arrows = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
      if(!arrows.includes(event.key) && !['Enter','Escape','Backspace'].includes(event.key)) return;
      if(!(tvMenu || tvLayout==='split') && event.key==='Enter' && document.activeElement?.closest('button')) return;
      if(!(tvMenu || tvLayout==='split') && !arrows.includes(event.key) && event.key!=='Enter') return;
      event.preventDefault();
      if(event.key==='Escape' || event.key==='Backspace'){setTvMenu(false);return;}
      if(!(tvMenu || tvLayout==='split')){setTvMenu(true);return;}
      if(event.key==='Enter'){
        const item=sectionItems[tvFocused];
        if(item){setSelected(item.id);if(tvLayout==='overlay')setTvMenu(false);}
        return;
      }
      if(event.key==='ArrowLeft' || event.key==='ArrowRight'){
        const keys=Object.keys(sections);
        const step=event.key==='ArrowRight'?1:-1;
        setKind(keys[(keys.indexOf(kind)+step+keys.length)%keys.length]);
        setCategory('ทั้งหมด');
        return;
      }
      const step=event.key==='ArrowDown'?1:-1;
      setTvFocused(index=>Math.max(0,Math.min(sectionItems.length-1,index+step)));
    }
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  },[isTv,admin,tvMenu,tvLayout,tvFocused,sectionItems,kind]);
  useEffect(()=>{if(tvMenu)tvRefs.current[tvFocused]?.scrollIntoView({block:'nearest',inline:'nearest'});},[tvMenu,tvFocused,kind]);

  useEffect(()=>{localStorage.setItem(SELECTED,selected);},[selected]);
  useEffect(()=>{localStorage.setItem('online-tv-th-favorites-v1',JSON.stringify(favorites));},[favorites]);
  useEffect(()=>{
    const player = video.current;
    if (!player) return;
    setError('');
    player.pause(); player.removeAttribute('src'); player.load();
    if (!current) return;
    let hls;
    const onError = () => setError('ไม่สามารถเล่นสตรีมนี้ได้ โปรดตรวจสอบ URL, CORS, DRM หรือข้อจำกัดของผู้ให้บริการ');
    player.addEventListener('error',onError);
    if (!player.canPlayType('application/vnd.apple.mpegurl') && Hls.isSupported() && /\.m3u8(?:[/?#]|$)/i.test(current.url)) {
      hls = new Hls({enableWorker:true});
      hls.loadSource(current.url);
      hls.attachMedia(player);
      hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal) onError();});
    } else { player.src = current.url; player.load(); }
    return ()=>{player.removeEventListener('error',onError);if(hls)hls.destroy();player.pause();player.removeAttribute('src');player.load();};
  },[current?.id,current?.url]);
  const categories = useMemo(()=>['ทั้งหมด','รายการโปรด',...new Set(sectionItems.map(c=>c.category||'ทั่วไป'))], [sectionItems]);
  const filtered = sectionItems.filter(c => (category==='ทั้งหมด'||(category==='รายการโปรด'?favorites.includes(c.id):c.category===category)) && (c.name+' '+c.category).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  function choose(c){setSelected(c.id);if(isTv&&tvLayout==='overlay')setTvMenu(false);else window.scrollTo({top:0,behavior:'smooth'});}
  function save(e){e.preventDefault();if(!form.name.trim()||!validHttp(form.url)){setNotice('กรุณาระบุชื่อช่องและ URL ที่ขึ้นต้นด้วย http:// หรือ https://');return;}
    const item = {...form,name:form.name.trim(),url:form.url.trim(),category:form.category.trim()||'ทั่วไป',id:editing||crypto.randomUUID()};
    setChannels(old=>editing?old.map(c=>c.id===editing?item:c):[...old,item]);
    setNotice(editing?'แก้ไขช่องแล้ว':'เพิ่มช่องแล้ว');setEditing(null);setForm(blankForm);
  }
  function edit(c){setEditing(c.id);setForm({name:c.name,url:c.url,logo:c.logo||'',category:c.category||'ทั่วไป',kind:kindOf(c)});setAdmin(true);}
  function remove(c){if(!confirm(`ลบช่อง ${c.name} ?`))return;setChannels(old=>old.filter(x=>x.id!==c.id));if(selected===c.id)setSelected('');setFavorites(old=>old.filter(x=>x!==c.id));}
  async function importFile(event){
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file) return;
    try { importContent(await file.text()); }
    catch { setNotice('อ่านไฟล์ M3U ไม่สำเร็จ'); }
  }
  function importContent(content,base){
    const parsed=parseM3U(content,base,kind).map(c=>({...c,id:crypto.randomUUID()}));
    if(!parsed.length){setNotice('ไม่พบรายการใน Playlist M3U');return;}
    setChannels(old=>{
      const urls=new Set([...old,...catalog].map(c=>c.url));
      return [...old,...parsed.filter(c=>!urls.has(c.url)&&urls.add(c.url))];
    });
    setNotice('นำเข้า Playlist แล้ว ระบบข้าม URL ซ้ำ');
  }
  async function importRemote(event){
    event.preventDefault();
    const url=new FormData(event.currentTarget).get('playlist');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),15000);
    try {
      const target=new URL(url);
      if(target.protocol!=='https:' || target.username || target.password) throw new Error();
      const response=await fetch(target,{credentials:'omit',signal:controller.signal});
      if(!response.ok) throw new Error();
      importContent(await response.text(),response.url);
    } catch {setNotice('อ่าน Playlist จาก URL ไม่สำเร็จ โปรดตรวจสอบ HTTPS และ CORS');}
    finally {clearTimeout(timeout);}
  }
  function download(){const blob=new Blob([exportM3U(channels)],{type:'audio/x-mpegurl;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='my-channels.m3u';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function toggleFav(id){setFavorites(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);}
  return <div className={"app "+(isTv?"tvMode ":"")+(tvLayout==='split'?"tvSplit":"")}><header><div className="brand"><span className="brandIcon">▶</span><div><strong>ONLINE TV &amp; VOD</strong><small>ทีวีสดและวิดีโอตามต้องการ</small></div></div><div className="headerActions"><label className="modeLabel">โหมดหน้าจอ <select aria-label="โหมดหน้าจอ" value={displayMode} onChange={e=>{setDisplayMode(e.target.value);setTvMenu(false);}}><option value="auto">อัตโนมัติ (มือถือ/แท็บเล็ต/PC)</option><option value="tv">Smart TV / รีโมต</option></select></label>{isTv&&<button className="adminToggle" onClick={()=>{setTvLayout(v=>v==='overlay'?'split':'overlay');setTvMenu(false)}}>{tvLayout==='overlay'?'▤ แสดงช่องด้านข้าง':'▣ เมนูช่องซ้อน'}</button>}<button className="adminToggle" onClick={()=>setAdmin(!admin)}>{admin?'← กลับหน้าดูทีวี':'⚙ จัดการช่องทีวี'}</button></div></header>
    <main><nav className="sectionNav" aria-label="ประเภทสื่อ">{Object.entries(sections).map(([key,label])=><button key={key} aria-pressed={kind===key} onClick={()=>{setKind(key);setCategory('ทั้งหมด');setSearch('')}}>{label}</button>)}</nav>{catalogError&&<p className="error" role="status">โหลดรายการตั้งต้นไม่สำเร็จ</p>}<section className="playerPanel"><div className="tvStage" ref={tvStage}><div className="playerBox">{current?<video key={current.id} ref={video} controls playsInline autoPlay poster={validHttp(current.logo)?current.logo:undefined}/>:<div className="emptyPlayer"><div className="playMark">▶</div><strong>ยังไม่ได้เลือกรายการ</strong><span>เลือกรายการด้านล่าง หรือนำเข้า Playlist ของคุณ</span></div>}</div>
    {isTv&&<><button className="tvMenuTrigger" onClick={()=>setTvMenu(v=>!v)} aria-expanded={tvMenu}>☰ {tvMenu?'ซ่อนรายการช่อง':'รายการช่องทีวี'}</button>{(tvMenu||tvLayout==='split')&&<div className="tvChannelMenu" aria-label="รายการช่องสำหรับรีโมต"><div className="tvMenuTitle">{sections[kind]} · ← → เปลี่ยนประเภท <button onClick={()=>setTvMenu(false)}>✕ ปิด</button></div><div className="tvMenuGrid">{sectionItems.map((c,i)=><button key={c.id} ref={el=>tvRefs.current[i]=el} className={'tvMenuChannel '+(i===tvFocused?'focused ':'')+(c.id===selected?'playing':'')} onMouseEnter={()=>setTvFocused(i)} onClick={()=>{setTvFocused(i);choose(c)}}>{validHttp(c.logo)?<img src={c.logo} alt=""/>:<span>📺</span>}<strong>{c.name}</strong></button>)}</div>{!sectionItems.length&&<p>ยังไม่มีรายการในประเภทนี้</p>}</div>}</>}</div>
    <div className="playerFooter"><div><span className="eyebrow">{current?.category||'พร้อมรับชม'}</span><h2>{current?.name||'เลือกรายการเพื่อเริ่มเล่น'}</h2></div><button className="primary" disabled={!current} onClick={()=>{if(isTv)tvStage.current?.requestFullscreen?.();else video.current?.requestFullscreen?.()}}>⛶ ขยายเต็มจอ</button></div>{credit&&<p className="streamCredit">{credit.credit} · <a href={credit.rights} target="_blank" rel="noreferrer">แหล่งที่มา</a> · <a href={credit.license} target="_blank" rel="noreferrer">สัญญาอนุญาต</a></p>}{error&&<p className="error" role="alert">{error}</p>}</section>
    {admin&&<section className="panel"><div className="sectionHead"><h2>จัดการช่องทีวี</h2><span>ข้อมูลบันทึกในเบราว์เซอร์เครื่องนี้</span></div><div className="tools"><button onClick={()=>fileInput.current?.click()}>＋ นำเข้าไฟล์ M3U</button><input hidden type="file" accept=".m3u,.m3u8,.txt,audio/x-mpegurl" ref={fileInput} onChange={importFile}/><button onClick={download} disabled={!channels.length}>↓ ส่งออก M3U</button><button className="danger" onClick={()=>{if(confirm('ลบรายการที่เพิ่มเองทั้งหมดในเครื่องนี้?')){setChannels([]);setSelected('');setFavorites([]);}}} disabled={!personal.length}>ล้างรายการที่เพิ่มเอง</button></div>
      <form className="tools" onSubmit={importRemote}><label>URL Playlist <input name="playlist" type="url" required placeholder="https://…/playlist.m3u"/></label><button>นำเข้าจาก URL</button></form><form className="editor" onSubmit={save}><h3>{editing?'แก้ไขช่องทีวี':'เพิ่มช่องทีวีใหม่'}</h3><div className="fields"><label>ชื่อช่อง *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="เช่น ช่องตัวอย่าง"/></label><label>URL สตรีม *<input required type="url" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://.../stream.m3u8"/></label><label>URL โลโก้ (ไม่บังคับ)<input type="url" value={form.logo} onChange={e=>setForm({...form,logo:e.target.value})} placeholder="https://.../logo.png"/></label><label>ประเภท<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{Object.entries(sections).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>หมวดหมู่<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="ทั่วไป"/></label></div><div className="tools"><button className="primary" type="submit">{editing?'บันทึกการแก้ไข':'＋ เพิ่มช่อง'}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(blankForm);}}>ยกเลิก</button>}</div></form>{notice&&<p className="notice" role="status">{notice}</p>}</section>}
    <section className="panel channelPanel"><div className="sectionHead"><h2>{sections[kind]}</h2><span>{sectionItems.length} รายการ</span></div><div className="catalog"><input className="search" placeholder="⌕ ค้นหาช่องรายการ..." value={search} onChange={e=>setSearch(e.target.value)}/><div className="categories">{categories.map(cat=><button key={cat} className={cat===category?'active':''} onClick={()=>setCategory(cat)}>{cat}</button>)}</div>
    {filtered.length?<div className="channelGrid">{filtered.map(c=><div key={c.id} className={'channel '+(current?.id===c.id?'selected':'')}><button className="channelMain" onClick={()=>choose(c)}><div className="logo">{validHttp(c.logo)?<img src={c.logo} alt="" onError={e=>e.currentTarget.style.display='none'}/>:<span>📺</span>}</div><strong title={c.name}>{c.name}</strong><small>{c.category||'ทั่วไป'}</small></button><div className="channelActions"><button title="รายการโปรด" onClick={()=>toggleFav(c.id)}>{favorites.includes(c.id)?'★':'☆'}</button>{admin&&personal.some(item=>item.id===c.id)&&<><button title="แก้ไข" onClick={()=>edit(c)}>✎</button><button title="ลบ" onClick={()=>remove(c)}>×</button></>}</div></div>)}</div>:<div className="emptyList">{sectionItems.length?'ไม่พบรายการที่ตรงกับการค้นหา':'ยังไม่มีรายการในประเภทนี้'}</div>}</div></section>
    {kind==='live'&&<section className="panel" aria-label="ช่องทีวีไทยออนไลน์">
      <div className="sectionHead"><h2>ช่องทีวีไทยออนไลน์</h2><span>{thaiLivePages.length} ช่อง</span></div>
      <div className="catalog">
        <p>เลือกรายการเพื่อเปิดหน้าดูสดของสถานีหรือผู้ให้บริการ</p>
        <ul style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px',padding:0,listStyle:'none'}}>
          {thaiLivePages.filter(([name])=>name.toLowerCase().includes(search.trim().toLowerCase())).map(([name,url])=>
            <li key={name}><a className="adminToggle" style={{display:'block',textDecoration:'none'}} href={url} target="_blank" rel="noopener noreferrer">{name} ↗</a></li>
          )}
        </ul>
      </div>
    </section>}</main><footer>Online TV & VOD v0.4 · ใช้งานสตรีมที่ได้รับอนุญาตเท่านั้น · ไม่มีการส่งข้อมูลรายการช่องไปยังเซิร์ฟเวอร์</footer></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{}));}
