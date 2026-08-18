const demoAssets = [
      {type:'inspiration',name:'沉浸式叙事开场',owner:'诗玉',tags:['插画','游戏化'],art:'art-a',image:'reference-03.png',title:'THE\nBOOK SPEAKS',sticker:'NEW'},
      {type:'icon',name:'柔软的天气动效',owner:'珍妮',tags:['动效','UI界面'],art:'art-b',image:'reference-02.png',title:'soft\nweather'},
      {type:'store',name:'Dice Dreams 商店图',owner:'张璇',tags:['游戏化','商店图'],art:'art-c',image:'reference-03.png',title:'DICE\nDREAMS',sticker:'HOT'},
      {type:'inspiration',name:'水果消除的角色语言',owner:'李斌',tags:['游戏化','插画'],art:'art-d',title:'FRUIT\nCAT'},
      {type:'store',name:'夏日活动页参考',owner:'范凯',tags:['商店图','活动'],art:'art-e',title:'SUMMER\nSPLASH'},
      {type:'icon',name:'彩色积木图标',owner:'诗玉',tags:['UI界面','动效'],art:'art-f',title:'BLOCK\nBLAST'},
      {type:'store',name:'关卡挑战弹窗',owner:'珍妮',tags:['游戏化','UI界面'],art:'art-g',title:'LEVEL\nUP'},
      {type:'inspiration',name:'轻量化数据面板',owner:'张璇',tags:['UI界面','动效'],art:'art-h',title:'DROP\nPEAK'},
      {type:'store',name:'海岛主题配色',owner:'李斌',tags:['插画','商店图'],art:'art-i',title:'ISLAND\nDAY'},
      {type:'store',name:'宝石奖励礼包',owner:'诗玉',tags:['游戏化','商店图'],art:'art-d',title:'GEM\nPACK'},
      {type:'store',name:'新手首充活动',owner:'珍妮',tags:['活动','商店图'],art:'art-f',title:'FIRST\nTOP UP'},
      {type:'store',name:'周末限定折扣',owner:'张璇',tags:['游戏化','商店图'],art:'art-a',title:'WEEKEND\nSALE'},
      {type:'store',name:'成长基金入口',owner:'李斌',tags:['UI界面','商店图'],art:'art-h',title:'GROW\nFUND'},
      {type:'store',name:'月度通行证展示',owner:'范凯',tags:['活动','商店图'],art:'art-b',title:'SEASON\nPASS'},
      {type:'store',name:'节日主题礼盒',owner:'诗玉',tags:['插画','商店图'],art:'art-g',title:'FESTIVAL\nBOX'}
    ];
    let assets = [];
    const app = document.querySelector('.app'), grid = document.querySelector('#grid'), empty = document.querySelector('#empty'), storeView = document.querySelector('#storeView'), storeRows = document.querySelector('#storeRows'), tagOptions = document.querySelector('#tagOptions'), newTagInput = document.querySelector('#newTagInput'), imageViewer = document.querySelector('#imageViewer'), viewerImage = document.querySelector('#viewerImage'), viewerArt = document.querySelector('#viewerArt'), viewerArtTitle = document.querySelector('#viewerArtTitle'), viewerCaption = document.querySelector('#viewerCaption'), overviewView = document.querySelector('#overviewView'), overviewBtn = document.querySelector('#overviewBtn'), overviewLabel = document.querySelector('#overviewLabel'), overviewSymbol = document.querySelector('#overviewSymbol'), copyToast = document.querySelector('#copyToast');
    const DEFAULT_STATE = {type:'inspiration', search:'', tags:[], appliedTags:[], owner:'all', sort:'recent', weekOnly:false, favoritesOnly:false, view:'library'};
    let state = loadDashboardState();
    const tagLibraries = { inspiration:['插画','游戏化','叙事','界面'], icon:['UI界面','动效','图标','状态'], store:['商店图','活动','礼包','折扣'] };
    const STORAGE_KEY='asset-library-workspace-v1';
    const MAX_IMPORT_BYTES=3*1024*1024;
    assets = loadAssets();
    let viewerItems = [], viewerIndex = 0, renderedStoreGroups = [];
    let copyToastTimer;
    function makeId(){return globalThis.crypto?.randomUUID?.()||`asset-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;}
    function loadDashboardState(){
      try{
        const stored=JSON.parse(localStorage.getItem('asset-library-workspace-v1')||'null');
        const type=stored?.dashboardState?.type;
        if(['inspiration','icon','store'].includes(type))return {...DEFAULT_STATE,type};
      }catch(error){}
      return {...DEFAULT_STATE};
    }
    function persistDashboardState(){
      try{
        const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};
        localStorage.setItem(STORAGE_KEY,JSON.stringify({...stored,dashboardState:{type:state.type}}));
      }catch(error){}
    }
    function normalizeAsset(raw,index=0){
      const rawType=String(raw?.type||raw?.kind||'').toLowerCase();
      const type=['inspiration','icon','store'].includes(rawType)?rawType:(state?.type||'inspiration');
      const name=String(raw?.name||raw?.title||raw?.productName||'未命名素材').trim()||'未命名素材';
      const image=raw?.image||raw?.imageUrl||raw?.image_url||'';
      const sourceUrl=raw?.sourceUrl||raw?.productUrl||raw?.product_url||raw?.pageUrl||raw?.url||'';
      const noteList=Array.isArray(raw?.notes)?raw.notes:(raw?.notes?[{author:'诗玉',text:String(raw.notes),time:'导入时添加'}]:[]);
      return {...raw,id:raw?.id||makeId(),type,name,owner:raw?.owner||raw?.collector||'诗玉',tags:Array.isArray(raw?.tags)?raw.tags.filter(Boolean):[],art:raw?.art||'art-a',image:String(image||''),sourceUrl:String(sourceUrl||''),favorite:Boolean(raw?.favorite),notes:noteList,title:String(raw?.title||name),savedAt:raw?.savedAt||raw?.createdAt||new Date(Date.now()-index*3600000).toISOString(),collectionId:String(raw?.collectionId||''),collectionSavedAt:raw?.collectionSavedAt||'',collectionOrder:Number.isFinite(Number(raw?.collectionOrder))?Number(raw.collectionOrder):0,sortOrder:Number.isFinite(Number(raw?.sortOrder))?Number(raw.sortOrder):index};
    }
    function loadAssets(){
      try{
        const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
        if(stored&&Array.isArray(stored.assets)){
          if(stored.tagLibraries&&typeof stored.tagLibraries==='object')Object.keys(tagLibraries).forEach(type=>{if(Array.isArray(stored.tagLibraries[type]))tagLibraries[type]=stored.tagLibraries[type];});
          return stored.assets.map(normalizeAsset);
        }
      }catch(error){}
      return demoAssets.map(normalizeAsset);
    }
    function persistWorkspace(){
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,savedAt:new Date().toISOString(),assets,tagLibraries,dashboardState:{type:state.type}}));window.__assetLibraryPersist?.(assets);return true;}
      catch(error){showCopyToast('本机储存空间不足，请先导出备份后再继续导入');return false;}
    }
    function getFilteredAssets(){
      return assets.filter(a=>(state.type==='all'||a.type===state.type)&&(!state.search||(a.name+(a.tags||[]).join('')).toLowerCase().includes(state.search.toLowerCase()))&&(!state.appliedTags.length||state.appliedTags.every(t=>(a.tags||[]).includes(t)))&&(state.owner==='all'||a.owner===state.owner)&&(!state.weekOnly||Date.now()-new Date(a.savedAt).getTime()<=7*24*60*60*1000)&&(!state.favoritesOnly||a.favorite));
    }
    function sanitizeFilename(value){return String(value||'素材').replace(/[\\/:*?"<>|]/g,'-').slice(0,72)||'素材';}
    function imageExtension(image){const dataMatch=String(image||'').match(/^data:image\/([a-zA-Z0-9+.-]+)/);if(dataMatch)return dataMatch[1]==='jpeg'?'jpg':dataMatch[1];const urlMatch=String(image||'').match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/);return urlMatch?urlMatch[1]:'png';}
    async function downloadAsset(asset,sequence=''){
      if(!asset?.image){showCopyToast('这是一张展示素材，暂时没有可下载的原图');return false;}
      const link=document.createElement('a');
      link.download=`${sanitizeFilename(asset.name)}${sequence?`-${sequence}`:''}.${imageExtension(asset.image)}`;
      try{
        const response=await fetch(asset.image);
        if(!response.ok)throw new Error('image unavailable');
        const objectUrl=URL.createObjectURL(await response.blob());
        link.href=objectUrl;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1200);
      }catch(error){link.href=asset.image;document.body.append(link);link.click();link.remove();}
      return true;
    }
    async function downloadStoreAssets(items){
      let count=0;
      for(const [index,asset] of items.entries()){if(await downloadAsset(asset,String(index+1).padStart(2,'0'))){count+=1;await new Promise(resolve=>setTimeout(resolve,180));}}
      if(count)showCopyToast(`已开始下载 ${count} 张商店图`);
    }
    function openSource(asset){
      if(!asset?.sourceUrl){showCopyToast('该素材暂未记录来源链接');return;}
      window.open(asset.sourceUrl,'_blank','noopener');
    }
    function importType(raw){const type=String(raw?.type||raw?.kind||'').toLowerCase();return ['inspiration','icon','store'].includes(type)?type:state.type;}
    function importedAssetsFromData(data){
      const source=Array.isArray(data)?data:(Array.isArray(data?.assets)?data.assets:(Array.isArray(data?.records)?data.records:[]));
      return source.flatMap(raw=>{
        const images=raw?.asset_images||raw?.images;
        if(importType(raw)==='store'&&Array.isArray(images)&&images.length)return images.map((image,index)=>normalizeAsset({...raw,type:'store',image:image?.image_url||image?.imageUrl||image?.url||image,productUrl:raw.productUrl||raw.sourceUrl,name:raw.name||raw.productName||raw.app_id||'导入商店图',title:raw.title||raw.productName||'导入商店图',id:`${raw.id||makeId()}-${index}`},index));
        return normalizeAsset({...raw,type:importType(raw)});
      });
    }
    function isDuplicate(candidate){return assets.some(asset=>(candidate.image&&asset.image===candidate.image)||(candidate.sourceUrl&&asset.sourceUrl===candidate.sourceUrl)||(asset.type===candidate.type&&asset.name===candidate.name&&!candidate.image&&!candidate.sourceUrl));}
    function addImportedAssets(candidates){
      const unique=candidates.filter(candidate=>!isDuplicate(candidate));
      if(!unique.length){showCopyToast('没有新增素材，重复内容已跳过');return 0;}
      assets.unshift(...unique);
      unique.forEach(asset=>asset.tags.forEach(tag=>{const library=tagLibraries[asset.type];if(library&&!library.includes(tag))library.push(tag);}));
      persistWorkspace();render();showCopyToast(`已导入 ${unique.length} 条素材`);return unique.length;
    }
    function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});}
    async function importFiles(fileList){
      const files=[...fileList];const candidates=[];let skipped=0;
      for(const file of files){
        if(file.type==='application/json'||/\.json$/i.test(file.name)){
          try{candidates.push(...importedAssetsFromData(JSON.parse(await file.text())));}catch(error){skipped+=1;}
        }else if(file.type.startsWith('image/')){
          if(file.size>MAX_IMPORT_BYTES){skipped+=1;continue;}
          const name=file.name.replace(/\.[^.]+$/,'')||'导入图片';
          candidates.push(normalizeAsset({type:state.type,name,title:name,owner:state.owner==='all'?'诗玉':state.owner,tags:[],image:await fileToDataUrl(file),savedAt:new Date().toISOString()}));
        }
      }
      const added=addImportedAssets(candidates);
      if(skipped)showCopyToast(added?`已导入 ${added} 条，${skipped} 个文件无法导入`:'文件无法导入：请使用 JSON 或 3MB 以内的图片');
    }
    function exportVisibleAssets(){
      const payload={format:'asset-library-export',version:1,exportedAt:new Date().toISOString(),filters:{type:state.type,owner:state.owner,tags:state.appliedTags,weekOnly:state.weekOnly,favoritesOnly:state.favoritesOnly},assets:getFilteredAssets()};
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');
      link.href=url;link.download=`采集库-${typeLabel(state.type)}-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);showCopyToast(`已导出 ${payload.assets.length} 条素材`);
    }
    function syncTopbarHeight(){document.documentElement.style.setProperty('--topbar-height',`${document.querySelector('.topbar').offsetHeight}px`);}
    function addNoteDeleteControls(){document.querySelectorAll('.inspiration-note-picker, .store-note-picker').forEach(picker=>{picker.querySelectorAll('.note-entry').forEach((entry,index)=>{const meta=entry.querySelector('.note-entry-meta');if(!meta||meta.querySelector('.note-delete'))return;meta.insertAdjacentHTML('beforeend',`<button class="note-delete" type="button" data-note-delete="${index}" title="删除笔记" aria-label="删除笔记"><span class="trash-icon" aria-hidden="true"></span></button>`);});});}
    function storeGroupKey(asset){if(asset.collectionId)return asset.collectionId;const saved=new Date(asset.collectionSavedAt||asset.savedAt||0).getTime();const legacyBatch=Number.isFinite(saved)?Math.floor(saved/5000):asset.id;return `legacy:${asset.sourceUrl||asset.id}:${legacyBatch}`;}
    function storeGroupTime(group){return Math.max(...group.items.map(asset=>{const order=Number(asset.collectionOrder);if(Number.isFinite(order)&&order>0)return order;const saved=new Date(asset.collectionSavedAt||asset.savedAt||0).getTime();return Number.isFinite(saved)?saved:0;}));}
    function groupStoreAssets(items){const byKey=new Map();items.forEach(asset=>{const key=storeGroupKey(asset);let group=byKey.get(key);if(!group){group={key,items:[]};byKey.set(key,group);}group.items.push(asset);});return [...byKey.values()].map(group=>({...group,savedAt:storeGroupTime(group),items:[...group.items].sort((a,b)=>Number(a.sortOrder||0)-Number(b.sortOrder||0)||new Date(a.savedAt)-new Date(b.savedAt))})).sort((a,b)=>b.savedAt-a.savedAt);}
    function storeAssetsForKey(key){return assets.filter(asset=>asset.type==='store'&&storeGroupKey(asset)===key);}
    function storeDate(asset){const date=new Date(asset?.collectionSavedAt||asset?.savedAt||Date.now());return Number.isNaN(date.getTime())?'--':date.toISOString().slice(0,10).replaceAll('-','.');}
    function showCopyToast(message){copyToast.textContent=message;copyToast.classList.add('is-visible');clearTimeout(copyToastTimer);copyToastTimer=setTimeout(()=>copyToast.classList.remove('is-visible'),1600);}
    async function copyAssetImage(asset){
      if(asset.image&&navigator.clipboard?.write&&window.ClipboardItem){try{const response=await fetch(asset.image),blob=await response.blob();await navigator.clipboard.write([new ClipboardItem({[blob.type||'image/png']:blob})]);showCopyToast('图片已复制');return;}catch(error){}}
      const fallback=asset.image||asset.name;
      try{await navigator.clipboard?.writeText(fallback);}catch(error){}
      showCopyToast(asset.image?'已复制图片地址':'已复制素材名称');
    }
    function showViewer(index){
      if(!viewerItems.length)return;
      viewerIndex=(index+viewerItems.length)%viewerItems.length;
      const asset=viewerItems[viewerIndex];
      viewerCaption.textContent=`${viewerIndex+1} / ${viewerItems.length} · ${asset.name}`;
      const hasImage=Boolean(asset.image);
      viewerImage.hidden=!hasImage;
      viewerArt.classList.toggle('is-visible',!hasImage);
      if(hasImage){viewerImage.src=asset.image;viewerImage.alt=asset.name;}else{viewerArt.className=`viewer-art is-visible asset-art ${asset.art}`;viewerArtTitle.innerHTML=asset.title.replaceAll('\n','<br>');}
      imageViewer.classList.add('is-open');
      imageViewer.setAttribute('aria-hidden','false');
    }
    function closeViewer(){imageViewer.classList.remove('is-open');imageViewer.setAttribute('aria-hidden','true');}
    function activeTagLibrary(){return tagLibraries[state.type]||tagLibraries.inspiration;}
    function typeLabel(type){return {inspiration:'灵感发现',icon:'Icon',store:'商店图'}[type]||type;}
    function renderOverview(){
      const favorites=assets.filter(asset=>asset.favorite).length;
      const ownerCounts=Object.entries(assets.reduce((counts,asset)=>{counts[asset.owner]=(counts[asset.owner]||0)+1;return counts;},{})).sort((a,b)=>b[1]-a[1]);
      const tagCounts=Object.entries(assets.reduce((counts,asset)=>{asset.tags.forEach(tag=>counts[tag]=(counts[tag]||0)+1);return counts;},{})).sort((a,b)=>b[1]-a[1]).slice(0,4);
      const sourceNames={inspiration:'Pinterest',icon:'Figma Community',store:'Google Play'};
      const sourceCounts=Object.entries(assets.reduce((counts,asset)=>{const source=sourceNames[asset.type];counts[source]=(counts[source]||0)+1;return counts;},{})).sort((a,b)=>b[1]-a[1]);
      const recent=assets.filter(asset=>asset.type==='inspiration').slice(0,6), maxOwner=Math.max(...ownerCounts.map(([,count])=>count),1), maxTag=Math.max(...tagCounts.map(([,count])=>count),1), maxSource=Math.max(...sourceCounts.map(([,count])=>count),1);
      const favoriteRate=assets.length?Math.round(favorites/assets.length*100):0;
      overviewView.innerHTML=`
        <div class="overview-heading"><div><h1>素材概览</h1><p>查看采集进度、素材分布与最近新增内容</p></div><span class="overview-date">更新于 2026.08.13</span></div>
        <div class="overview-stats">
          <article class="overview-stat"><span class="overview-stat-label">素材总数</span><strong class="overview-stat-value">${assets.length}</strong><span class="overview-stat-note">当前采集库</span></article>
          <article class="overview-stat"><span class="overview-stat-label">本周新增</span><strong class="overview-stat-value">${Math.min(assets.length,7)}</strong><span class="overview-stat-note">最近 7 天采集</span></article>
          <article class="overview-stat"><span class="overview-stat-label">收藏率</span><strong class="overview-stat-value">${favoriteRate}%</strong><span class="overview-stat-note">已标记为重点素材</span></article>
        </div>
        <div class="overview-insights">
          <section class="overview-panel"><span class="overview-kicker">CONTRIBUTOR PULSE</span><h2>采集人贡献</h2><div class="contributor-chart">${ownerCounts.map(([owner,count])=>`<div class="contributor"><span class="contributor-count">${count}</span><div class="contributor-bar-track"><i class="contributor-bar" style="height:${Math.max(12,Math.round(count/maxOwner*100))}%"></i></div><span class="contributor-name">${owner}</span></div>`).join('')}</div></section>
          <section class="overview-panel"><span class="overview-kicker">TAG SIGNALS</span><h2>标签热度</h2><div class="signal-list">${tagCounts.map(([tag,count],index)=>`<div class="signal-row"><span class="signal-rank">0${index+1}</span><span class="signal-name">${tag}</span><b class="signal-count">${count}</b><div class="signal-meter"><i style="width:${Math.round(count/maxTag*100)}%"></i></div></div>`).join('')}</div></section>
          <section class="overview-panel"><span class="overview-kicker">SOURCE MIX</span><h2>来源分布</h2><div class="source-list">${sourceCounts.map(([source,count])=>`<div class="source-row"><span></span><span class="source-name">${source}</span><b class="source-count">${count}</b><div class="source-meter"><i style="width:${Math.round(count/maxSource*100)}%"></i></div></div>`).join('')}</div></section>
        </div>
        <section class="overview-recent"><div class="overview-section-head"><div><span class="overview-kicker">LATEST CAPTURES</span><h2>最近收集</h2></div><button class="overview-view-all" id="overviewViewAll" type="button">查看全部 ↗</button></div><div class="overview-list">${recent.map(asset=>`<article class="overview-item"><div class="overview-art">${asset.image?`<img src="${asset.image}" alt="${asset.name}">`:`<div class="asset-art ${asset.art}"><div class="art-title">${asset.title.replaceAll('\n','<br>')}</div></div>`}</div></article>`).join('')}</div></section>`;
      document.querySelector('#overviewViewAll').addEventListener('click',()=>{state.view='library';state.type='inspiration';state.tags=[];state.appliedTags=[];document.querySelectorAll('[data-type]').forEach(item=>item.classList.toggle('is-active',item.dataset.type==='inspiration'));render();});
    }
    function renderTagOptions(){tagOptions.innerHTML=activeTagLibrary().map(tag=>`<div class="tag-item"><button class="tag-option ${state.tags.includes(tag)?'is-active':''}" type="button" data-tag="${tag}">${tag}</button><button class="tag-remove" type="button" data-remove-tag="${tag}" aria-label="删除${tag}标签">×</button></div>`).join('');}
    function createTag(value){const tag=value.trim();if(!tag)return false;const library=activeTagLibrary();if(!library.includes(tag))library.push(tag);return true;}
    function render(){
      syncTopbarHeight();
      document.querySelectorAll('[data-type]').forEach(item=>item.classList.toggle('is-active',item.dataset.type===state.type));
      app.classList.toggle('is-overview',state.view==='overview');
      overviewLabel.textContent=state.view==='overview'?'素材库':'概览';
      overviewBtn.title=state.view==='overview'?'返回素材库':'概览';
      overviewBtn.setAttribute('aria-label',state.view==='overview'?'退出概览，返回素材库':'概览');
      overviewSymbol.textContent=state.view==='overview'?'→':'▦';
      if(state.view==='overview'){renderOverview();return;}
      state.tags=state.tags.filter(tag=>activeTagLibrary().includes(tag));
      state.appliedTags=state.appliedTags.filter(tag=>activeTagLibrary().includes(tag));
      renderTagOptions();
      document.querySelector('#weekFilter').classList.toggle('is-active',state.weekOnly);
      document.querySelector('#favoriteFilter').classList.toggle('is-active',state.favoritesOnly);
      const filtered = getFilteredAssets();
      const sorted = [...filtered].sort((a,b)=>state.sort==='oldest'?new Date(a.savedAt)-new Date(b.savedAt):new Date(b.savedAt)-new Date(a.savedAt));
      const isIconView=state.type==='icon', isInspirationView=state.type==='inspiration', usesCompactTools=isIconView||isInspirationView;
      const demoRatios=['.69','1.28','.78','1.08','.72','1.36','.86','1.16','.75','1.03'];
      const demoBackgrounds=['linear-gradient(150deg,#261441,#6c4ccd 54%,#f6bb8d)','linear-gradient(145deg,#075f8c,#23b8d2 58%,#a9ebc8)','linear-gradient(150deg,#f19779,#ed6f9d 45%,#8f64d9)','linear-gradient(145deg,#253459,#537be1 52%,#e3b3fb)','linear-gradient(145deg,#176e70,#28c6b9 52%,#f5d970)','linear-gradient(145deg,#792f61,#e66f91 48%,#f5c075)','linear-gradient(145deg,#dd803c,#f4c15f 52%,#fbf0ba)','linear-gradient(145deg,#135e75,#36a7d1 48%,#bcece2)','linear-gradient(145deg,#50315e,#9a68d6 53%,#e5a9dc)','linear-gradient(145deg,#293754,#5170bc 52%,#d6e998)'];
      grid.classList.toggle('icon-grid',isIconView);
      grid.classList.toggle('inspiration-grid',isInspirationView);
      grid.innerHTML = sorted.map((a,index)=>{const demo=isInspirationView&&!a.image, ratio=demoRatios[index%demoRatios.length], background=demoBackgrounds[index%demoBackgrounds.length], openAction=isIconView?`<button class="icon-card-action" type="button" data-icon-open title="跳转商店" aria-label="跳转商店">↗</button>`:'', notes=a.notes||[], noteAction=isInspirationView?`<div class="inspiration-note-picker"><button class="icon-card-action" type="button" data-inspiration-note title="记录笔记" aria-label="记录笔记">✎</button><div class="note-popover"><div class="note-popover-head"><b>收集笔记</b><span>${notes.length?`${notes.length} 条记录`:'记录灵感与用法'}</span></div><select class="note-author-select" data-note-author aria-label="选择记录人"><option value="诗玉">诗玉</option><option value="珍妮">珍妮</option><option value="张璇">张璇</option><option value="李斌">李斌</option><option value="范凯">范凯</option></select><textarea class="note-input" data-note-input maxlength="180" placeholder="记录收集灵感、可借鉴的设计或使用方式"></textarea><button class="note-save" type="button" data-note-save>添加笔记</button><div class="note-list">${notes.length?notes.map(note=>`<article class="note-entry"><span class="note-entry-avatar">${note.author.slice(0,1)}</span><div><div class="note-entry-meta"><b>${note.author}</b><span class="note-entry-time">${note.time}</span></div><p class="note-entry-text">${note.text}</p></div></article>`).join(''):`<p class="note-empty">还没有笔记。把这张图带来的灵感记录下来吧。</p>`}</div></div></div>`:'';return `<article class="asset ${demo?'is-demo':''}" data-asset-index="${assets.indexOf(a)}"${demo?` style="--preview-ratio:${ratio}"`:''}><div class="asset-art ${a.art}${a.image&&!demo?' has-image':''}"${isIconView?` data-icon-viewer-index="${index}" title="点击放大查看：${a.name}"`:''}${demo?` style="background:${background}"`:''}><button class="favorite-button ${a.favorite?'is-favorite':''}" type="button" data-favorite title="${a.favorite?'取消收藏':'收藏'}" aria-label="${a.favorite?'取消收藏':'收藏'}">${a.favorite?'♥':'♡'}</button>${a.image&&!demo?`<img src="${a.image}" alt="${a.name}" loading="lazy">`:''}<div class="art-title">${a.title.replaceAll('\n','<br>')}</div>${a.sticker?`<div class="art-sticker">${a.sticker}</div>`:''}</div><div class="asset-body"><div class="asset-name"><span>${a.name}</span><button class="asset-menu" title="更多操作">···</button></div><div class="asset-meta"><span>由 ${a.owner} 采集</span><span>今天</span></div><div class="asset-tags">${a.tags.map((tag,i)=>`<span class="tag ${i===0?'blue':''}">${tag}</span>`).join('')}</div>${usesCompactTools?`<div class="icon-card-tools">${openAction}<button class="icon-card-action" type="button" data-icon-copy title="复制" aria-label="复制">⧉</button><button class="icon-card-action" type="button" data-icon-download title="下载" aria-label="下载"><span class="download-icon" aria-hidden="true"></span></button><button class="icon-card-action delete" type="button" data-icon-delete title="删除"><span class="trash-icon" aria-hidden="true"></span></button><div class="icon-tag-picker"><button class="icon-card-action" type="button" data-icon-tag title="编辑标签" aria-label="编辑标签">#</button><div class="icon-tag-popover"><div class="icon-tag-options">${activeTagLibrary().map(tag=>`<button class="icon-tag-choice ${a.tags.includes(tag)?'is-active':''}" type="button" data-icon-tag-choice="${tag}">${tag}</button>`).join('')}</div></div></div>${noteAction}</div>`:''}</div></article>`;}).join('');
      const storeItems = sorted.filter(a=>a.type==='store');
      const isStoreView = state.type==='store';
      grid.style.display=isStoreView?'none':'block';
      storeView.classList.toggle('is-visible',isStoreView);
      viewerItems=isIconView?sorted:storeItems;
      renderedStoreGroups=groupStoreAssets(storeItems);
      storeRows.innerHTML=renderedStoreGroups.map((group,groupIndex)=>{const groupItems=group.items,lead=groupItems[0],notes=lead.notes||[];return `<div class="store-record" data-store-group="${group.key}"><span class="store-record-index">${String(groupIndex+1).padStart(2,'0')}</span><span class="store-record-date">${storeDate(lead)}</span><div class="store-record-gallery">${groupItems.map(a=>`<div class="store-thumb" title="点击放大查看：${a.name}" data-store-group="${group.key}" data-asset-id="${a.id}" data-store-image="${a.image||''}"><button class="store-favorite ${a.favorite?'is-favorite':''}" type="button" data-favorite title="${a.favorite?'取消收藏':'收藏'}" aria-label="${a.favorite?'取消收藏':'收藏'}">${a.favorite?'♥':'♡'}</button>${a.image?`<button class="store-copy" type="button" data-store-copy title="复制图片" aria-label="复制图片">⧉</button>`:''}${a.image?`<img src="${a.image}" alt="${a.name}">`:`<div class="asset-art ${a.art}"><div class="art-title">${a.title.replaceAll('\n','<br>')}</div></div>`}</div>`).join('')}</div><div class="store-row-actions"><button class="row-action" type="button" data-open-store title="跳转商店" aria-label="跳转商店">↗</button><button class="row-action" type="button" data-download-store title="下载商店图" aria-label="下载商店图"><span class="download-icon" aria-hidden="true"></span></button><div class="store-tag-picker"><button class="row-action" type="button" data-store-tag title="编辑商店图标签" aria-label="编辑商店图标签">#</button><div class="store-tag-popover"><div class="icon-tag-options">${tagLibraries.store.map(tag=>`<button class="icon-tag-choice ${groupItems.every(item=>item.tags.includes(tag))?'is-active':''}" type="button" data-store-tag-choice="${tag}">${tag}</button>`).join('')}</div></div></div><div class="store-note-picker"><button class="row-action" type="button" data-store-note title="记录商店图笔记" aria-label="记录商店图笔记">✎</button><div class="note-popover"><div class="note-popover-head"><b>商店图笔记</b><span>${notes.length?`${notes.length} 条记录`:'记录灵感与用法'}</span></div><select class="note-author-select" data-store-note-author aria-label="选择记录人"><option value="诗玉">诗玉</option><option value="珍妮">珍妮</option><option value="张璇">张璇</option><option value="李斌">李斌</option><option value="范凯">范凯</option></select><textarea class="note-input" data-store-note-input maxlength="180" placeholder="记录商店图的构图、玩法或使用场景"></textarea><button class="note-save" type="button" data-store-note-save>添加笔记</button><div class="note-list">${notes.length?notes.map(note=>`<article class="note-entry"><span class="note-entry-avatar">${note.author.slice(0,1)}</span><div><div class="note-entry-meta"><b>${note.author}</b><span class="note-entry-time">${note.time}</span></div><p class="note-entry-text">${note.text}</p></div></article>`).join(''):`<p class="note-empty">还没有笔记。把这组商店图的灵感记录下来吧。</p>`}</div></div></div><button class="row-action delete" type="button" data-delete-store title="删除商店图" aria-label="删除商店图"><span class="trash-icon" aria-hidden="true"></span></button></div></div>`;}).join('');
      storeRows.querySelectorAll('.store-thumb[data-store-image]').forEach(thumb=>{const image=thumb.querySelector('img');if(!image)return;const applyRatio=()=>thumb.classList.toggle('is-landscape',image.naturalWidth>image.naturalHeight);if(image.complete)applyRatio();else image.addEventListener('load',applyRatio,{once:true});});
      addNoteDeleteControls();
      empty.style.display=sorted.length?'none':'block';
    }
    document.querySelector('#search').addEventListener('input',e=>{state.search=e.target.value;render();});
    document.querySelector('#tagOptions').addEventListener('click',e=>{const removeButton=e.target.closest('[data-remove-tag]');if(removeButton){const value=removeButton.dataset.removeTag;if(confirm(`确认删除“${value}”标签吗？`)){const library=activeTagLibrary(),index=library.indexOf(value);if(index>-1)library.splice(index,1);state.tags=state.tags.filter(tag=>tag!==value);state.appliedTags=state.appliedTags.filter(tag=>tag!==value);persistWorkspace();render();}return;}const button=e.target.closest('[data-tag]');if(!button)return;const value=button.dataset.tag;state.tags=state.tags.includes(value)?state.tags.filter(tag=>tag!==value):[...state.tags,value];button.classList.toggle('is-active',state.tags.includes(value));});
    function createTopTag(){if(createTag(newTagInput.value)){newTagInput.value='';persistWorkspace();render();}}
    document.querySelector('#createTagBtn').addEventListener('click',createTopTag);
    newTagInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();createTopTag();}});
    document.querySelector('#typeOptions').addEventListener('click',e=>{const button=e.target.closest('[data-type]');if(!button)return;state.type=button.dataset.type;state.tags=[];state.appliedTags=[];persistDashboardState();document.querySelectorAll('[data-type]').forEach(item=>item.classList.toggle('is-active',item===button));render();});
    document.querySelector('#weekFilter').addEventListener('click',()=>{state.weekOnly=!state.weekOnly;render();});
    document.querySelector('#favoriteFilter').addEventListener('click',()=>{state.favoritesOnly=!state.favoritesOnly;render();});
    document.querySelector('#sortOptions').addEventListener('click',e=>{const removeButton=e.target.closest('[data-remove-sort]');if(removeButton){const value=removeButton.dataset.removeSort;const label=removeButton.previousElementSibling.textContent;if(confirm(`确认删除“${label}”筛选项吗？`)){if(state.sort===value){const fallback=document.querySelector('[data-sort="recent"]');state.sort=fallback?fallback.dataset.sort:'';fallback?.classList.add('is-active');}removeButton.closest('.choice-item').remove();render();}return;}const button=e.target.closest('[data-sort]');if(!button)return;state.sort=button.dataset.sort;document.querySelectorAll('[data-sort]').forEach(item=>item.classList.toggle('is-active',item===button));render();});
    storeRows.addEventListener('click',e=>{const record=e.target.closest('.store-record');if(!record)return;const groupItems=storeAssetsForKey(record.dataset.storeGroup),lead=groupItems[0];if(!lead)return;const noteDelete=e.target.closest('[data-note-delete]');if(noteDelete){const index=Number(noteDelete.dataset.noteDelete);if(confirm('确认删除这条笔记吗？')){lead.notes.splice(index,1);persistWorkspace();render();showCopyToast('笔记已删除');}return;}const noteSave=e.target.closest('[data-store-note-save]');if(noteSave){const picker=noteSave.closest('.store-note-picker'),input=picker.querySelector('[data-store-note-input]'),author=picker.querySelector('[data-store-note-author]').value,text=input.value.trim();if(!text){input.focus();return;}lead.notes=[...(lead.notes||[]),{author,text,time:'刚刚'}];persistWorkspace();render();showCopyToast('笔记已添加');return;}const noteButton=e.target.closest('[data-store-note]');if(noteButton){const picker=noteButton.closest('.store-note-picker');document.querySelectorAll('.store-note-picker.is-open').forEach(item=>{if(item!==picker)item.classList.remove('is-open');});document.querySelectorAll('.store-tag-picker.is-open').forEach(item=>item.classList.remove('is-open'));picker.classList.toggle('is-open');record.classList.toggle('has-open-store-tools',picker.classList.contains('is-open'));if(picker.classList.contains('is-open'))setTimeout(()=>picker.querySelector('[data-store-note-input]').focus(),0);return;}const tagChoice=e.target.closest('[data-store-tag-choice]');if(tagChoice){const tag=tagChoice.dataset.storeTagChoice,willAdd=!groupItems.every(item=>item.tags.includes(tag));groupItems.forEach(asset=>{const has=asset.tags.includes(tag);if(willAdd&&!has)asset.tags=[...asset.tags,tag];else if(!willAdd&&has)asset.tags=asset.tags.filter(item=>item!==tag);});persistWorkspace();tagChoice.classList.toggle('is-active',willAdd);return;}const tagButton=e.target.closest('[data-store-tag]');if(tagButton){const picker=tagButton.closest('.store-tag-picker');document.querySelectorAll('.store-tag-picker.is-open').forEach(item=>{if(item!==picker)item.classList.remove('is-open');});document.querySelectorAll('.store-note-picker.is-open').forEach(item=>item.classList.remove('is-open'));picker.classList.toggle('is-open');record.classList.toggle('has-open-store-tools',picker.classList.contains('is-open'));return;}const copyButton=e.target.closest('[data-store-copy]');if(copyButton){const thumb=copyButton.closest('.store-thumb'),asset=assets.find(item=>item.id===thumb.dataset.assetId);if(asset)copyAssetImage(asset);return;}const favorite=e.target.closest('[data-favorite]');if(favorite){const thumb=favorite.closest('.store-thumb'),asset=assets.find(item=>item.id===thumb.dataset.assetId);if(asset){asset.favorite=!asset.favorite;persistWorkspace();render();}return;}const thumb=e.target.closest('.store-thumb[data-asset-id]');if(thumb){const index=groupItems.findIndex(asset=>asset.id===thumb.dataset.assetId);viewerItems=groupItems;showViewer(index);return;}if(e.target.closest('[data-open-store]')){openSource(lead);return;}if(e.target.closest('[data-download-store]')){downloadStoreAssets(groupItems);return;}if(e.target.closest('[data-delete-store]')&&confirm(`确认删除当前 ${groupItems.length} 张商店图吗？`)){assets=assets.filter(asset=>!(asset.type==='store'&&storeGroupKey(asset)===record.dataset.storeGroup));persistWorkspace();render();showCopyToast('商店图已删除');}});
    grid.addEventListener('click',e=>{const noteDelete=e.target.closest('[data-note-delete]');if(noteDelete){const card=noteDelete.closest('.asset'),asset=assets[Number(card.dataset.assetIndex)],index=Number(noteDelete.dataset.noteDelete);if(confirm('确认删除这条笔记吗？')){asset.notes.splice(index,1);persistWorkspace();render();showCopyToast('笔记已删除');}return;}const noteSave=e.target.closest('[data-note-save]');if(noteSave){const card=noteSave.closest('.asset'),asset=assets[Number(card.dataset.assetIndex)],picker=noteSave.closest('.inspiration-note-picker'),input=picker.querySelector('[data-note-input]'),author=picker.querySelector('[data-note-author]').value,text=input.value.trim();if(!text){input.focus();return;}asset.notes=[...(asset.notes||[]),{author,text,time:'刚刚'}];persistWorkspace();render();showCopyToast('笔记已添加');return;}const noteButton=e.target.closest('[data-inspiration-note]');if(noteButton){const picker=noteButton.closest('.inspiration-note-picker'),card=picker.closest('.asset');document.querySelectorAll('.inspiration-note-picker.is-open').forEach(item=>{if(item!==picker){item.classList.remove('is-open','align-right','opens-up');item.closest('.asset')?.classList.remove('has-open-notes');}});picker.classList.toggle('is-open');card.classList.toggle('has-open-notes',picker.classList.contains('is-open'));if(picker.classList.contains('is-open')){const rect=picker.getBoundingClientRect(),popover=picker.querySelector('.note-popover');picker.classList.toggle('align-right',window.innerWidth-rect.left<popover.offsetWidth+12);picker.classList.toggle('opens-up',window.innerHeight-rect.bottom<popover.offsetHeight+12);setTimeout(()=>picker.querySelector('[data-note-input]').focus(),0);}return;}const tagChoice=e.target.closest('[data-icon-tag-choice]');if(tagChoice){const card=tagChoice.closest('.asset'),asset=assets[Number(card.dataset.assetIndex)],tag=tagChoice.dataset.iconTagChoice;asset.tags=asset.tags.includes(tag)?asset.tags.filter(item=>item!==tag):[...asset.tags,tag];persistWorkspace();tagChoice.classList.toggle('is-active',asset.tags.includes(tag));return;}const tagButton=e.target.closest('[data-icon-tag]');if(tagButton){const picker=tagButton.closest('.icon-tag-picker'),card=picker.closest('.asset');document.querySelectorAll('.icon-tag-picker.is-open').forEach(item=>{if(item!==picker){item.classList.remove('is-open','opens-left');item.closest('.asset')?.classList.remove('has-open-tags');}});picker.classList.toggle('is-open');card.classList.toggle('has-open-tags',picker.classList.contains('is-open'));if(picker.classList.contains('is-open')){const rect=picker.getBoundingClientRect();picker.classList.toggle('opens-left',window.innerWidth-rect.right<132);}return;}const iconPreview=e.target.closest('[data-icon-viewer-index]');if(iconPreview&&!e.target.closest('[data-favorite]')){showViewer(Number(iconPreview.dataset.iconViewerIndex));return;}const card=e.target.closest('.asset');if(!card)return;const asset=assets[Number(card.dataset.assetIndex)];if(e.target.closest('[data-favorite]')){asset.favorite=!asset.favorite;persistWorkspace();render();return;}if(e.target.closest('[data-icon-open]')){openSource(asset);return;}if(e.target.closest('[data-icon-copy]')){copyAssetImage(asset);return;}if(e.target.closest('[data-icon-download]')){downloadAsset(asset).then(ok=>{if(ok)showCopyToast('已开始下载图片');});return;}if(e.target.closest('[data-icon-delete]')){if(confirm(`确认删除“${asset.name}”吗？`)){assets.splice(Number(card.dataset.assetIndex),1);persistWorkspace();render();showCopyToast('素材已删除');}}});
    document.querySelector('#viewerClose').addEventListener('click',closeViewer);
    document.querySelector('#viewerPrev').addEventListener('click',()=>showViewer(viewerIndex-1));
    document.querySelector('#viewerNext').addEventListener('click',()=>showViewer(viewerIndex+1));
    imageViewer.addEventListener('click',e=>{if(e.target===imageViewer)closeViewer();});
    document.addEventListener('keydown',e=>{if(!imageViewer.classList.contains('is-open'))return;if(e.key==='ArrowLeft'){e.preventDefault();showViewer(viewerIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();showViewer(viewerIndex+1);}if(e.key==='Escape')closeViewer();});
    document.querySelectorAll('.filter-menu').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open) document.querySelectorAll('.filter-menu').forEach(other=>{if(other!==menu) other.open=false;});}));
    document.addEventListener('click',e=>{const tagMenu=e.target.closest('.tag-menu');if(!tagMenu){const openTagMenu=document.querySelector('.tag-menu[open]');if(openTagMenu){state.appliedTags=[...state.tags];render();}document.querySelectorAll('.filter-menu[open]').forEach(menu=>menu.open=false);}if(!e.target.closest('.icon-tag-picker')) document.querySelectorAll('.icon-tag-picker.is-open').forEach(picker=>{picker.classList.remove('is-open','opens-left');picker.closest('.asset')?.classList.remove('has-open-tags');});if(!e.target.closest('.inspiration-note-picker')) document.querySelectorAll('.inspiration-note-picker.is-open').forEach(picker=>{picker.classList.remove('is-open','align-right','opens-up');picker.closest('.asset')?.classList.remove('has-open-notes');});if(!e.target.closest('.store-tag-picker, .store-note-picker')){document.querySelectorAll('.store-tag-picker.is-open, .store-note-picker.is-open').forEach(picker=>picker.classList.remove('is-open'));document.querySelectorAll('.store-record.has-open-store-tools').forEach(record=>record.classList.remove('has-open-store-tools'));}});
    const importInput=document.createElement('input');
    importInput.type='file';importInput.accept='image/*,.json,application/json';importInput.multiple=true;importInput.hidden=true;document.body.append(importInput);
    document.querySelector('#importBtn').addEventListener('click',()=>importInput.click());
    importInput.addEventListener('change',async()=>{if(importInput.files?.length)await importFiles(importInput.files);importInput.value='';});
    document.querySelector('#exportBtn').addEventListener('click',exportVisibleAssets);
    overviewBtn.addEventListener('click',()=>{state.view=state.view==='overview'?'library':'overview';render();});
    window.addEventListener('resize',syncTopbarHeight);
    render();
