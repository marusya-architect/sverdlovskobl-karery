(()=>{
const specs=[
 ['housing','П · Жилая территория','#c4ad7a','area'],
 ['places','П · Населённые пункты','#795548','point'],
 ['roads','Т · Основные дороги','#e8924a','line'],
 ['stops','Т · Остановки и станции','#1b72b3','point'],
 ['rail','Т · Железные дороги','#666b73','line'],
 ['forest','Л · Леса, парки и рекреационные территории','#6aa45c','area'],
 ['water','Л · Водоёмы','#53a5cf','area'],
 ['rivers','Л · Реки и каналы','#53a5cf','line'],
 ['protected','Ограничения · ООПТ по OSM','#b34281','area'],
 ['industry','И · Промышленные и деловые территории','#886aa7','area'],
 ['depth','ИГ · Глубина / высота объектов','#705c42','point']
];
map.createPane('context');map.getPane('context').style.zIndex=350;
map.createPane('context-depth');map.getPane('context-depth').style.zIndex=610;
const section=document.createElement('section');section.id='context-layers';
section.innerHTML='<h2>Данные для выбора сценария</h2><p class="context-note">Независимые слои · можно включать несколько. Подробные слои появляются при приближении карты; нужный масштаб указан после включения. Это исходные признаки, а не готовая оценка пригодности.</p><div class="q context-options"></div><details class="context-help"><summary>Что нужно для оценки по матрице</summary><div class="context-method"></div></details>';
$('side').insertBefore(section,$('reset'));
const explanation=`<p><b>П · Положение.</b> Границы и структура населённых пунктов, жилая застройка, центры и устойчивые связи с городом. На сайте используется приближение по расстоянию до жилой территории; оно не доказывает центральное положение.</p>
<p><b>ИГ · Инженерно-геологическая сложность.</b> Рельеф и уклоны, глубина карьера / высота отвала, грунты, подземные воды, устойчивость бортов, опасные процессы. Есть глубина / высота из базы; инженерные изыскания и подтверждённые опасные процессы не подключены.</p>
<p><b>Т · Транспортная доступность.</b> Дороги, подъезды, остановки и станции; пешие маршруты, расписания и время поездки. На сайте — расстояния по прямой: остановка ≤ 1 км → 3; ≤ 2,5 км или основная дорога ≤ 1 км → 2; иначе 1. Это не расчёт 10–15 минут пешком или 30–45 минут в час пик.</p>
<p><b>Л · Ландшафтная выразительность.</b> Водоёмы, леса, рельеф, видовые точки и объекты туристического интереса. Слои воды и растительности дают контекст; самостоятельная рекреационная ценность требует обследования.</p>
<p><b>И · Инвестиционная привлекательность.</b> Инженерные сети и мощности, спрос, права на землю, разрешённое использование, лицензии, стоимость подготовки и риски. Промышленные и деловые территории показаны только как окружение. Сейчас И — условная оценка по положению, доступности и состоянию объекта, без экономического расчёта.</p>
<p><b>Проверка допустимости.</b> Нужны актуальные генпланы, ПЗЗ, ЕГРН/ЗОУИТ, водоохранные и санитарные зоны, режимы ООПТ, загрязнение и горные отводы. ООПТ по OSM — справочный слой, не официальный реестр ограничений. Отсутствие объекта в выгрузке не означает отсутствие ограничения.</p>
<p><b>Источники.</b> Локальные слои OSM из папки «Диплома/кугис», обрезанные по Свердловской области; дата актуальности не подтверждена. Геометрия упрощена примерно на 30 м для обзора. Глубина / высота — та же база, что в карточках объектов. Слои окружения не отфильтровываются вместе с реестром.</p>`;
section.querySelector('.context-method').innerHTML=explanation;
const oldMatrix=matrix;matrix=()=>{oldMatrix();const d=document.createElement('details');d.className='context-help';d.innerHTML='<summary>Данные, критерии и ограничения оценки</summary>'+explanation;$('matrix').append(d)};matrix();
const legend=document.createElement('div');legend.id='context-legend';$('legend').parentElement.append(legend);
const states=[];
function symbol(id,color,type){return '<i aria-hidden="true" class="context-symbol '+type+(id==='rail'?' rail':'')+'" style="--symbol:'+color+'"></i>'}

function bounds(f){const b=[Infinity,Infinity,-Infinity,-Infinity];function walk(a){if(typeof a[0]==='number'){b[0]=Math.min(b[0],a[0]);b[1]=Math.min(b[1],a[1]);b[2]=Math.max(b[2],a[0]);b[3]=Math.max(b[3],a[1])}else a.forEach(walk)}function geom(g){if(g.coordinates)walk(g.coordinates);else(g.geometries||[]).forEach(geom)}geom(f.geometry);return b}
function refresh(s){if(!s.input.checked||!s.layer)return;s.layer.clearLayers();if(map.getZoom()<s.minZoom){s.status.textContent='Приблизьте карту: '+s.minZoom+'+';return}const b=map.getBounds();const visible=s.data.features.filter(f=>f.bbox[0]<=b.getEast()&&f.bbox[2]>=b.getWest()&&f.bbox[1]<=b.getNorth()&&f.bbox[3]>=b.getSouth());s.layer.addData({type:'FeatureCollection',features:visible});s.status.textContent=visible.length.toLocaleString('ru')+' в окне'}
map.on('moveend',()=>states.forEach(refresh));
function legendSync(){legend.innerHTML=states.filter(s=>s.input.checked&&s.layer&&map.hasLayer(s.layer)).map(s=>'<div class="lg">'+symbol(s.id,s.color,s.type)+'<span>'+esc(s.title)+'</span></div>').join('');if(legend.innerHTML)legend.insertAdjacentHTML('afterbegin','<h4>Данные для сценария</h4>');if(states.some(s=>s.id==='depth'&&s.input.checked))legend.insertAdjacentHTML('beforeend','<h4>Глубина / высота</h4><div class="lg"><i class="context-symbol point" style="--symbol:#999"></i><span>Нет данных</span></div><div class="lg"><i class="context-symbol point" style="--symbol:#d7c3a2"></i><span>≤ 0 м</span></div><div class="lg"><i class="context-symbol point" style="--symbol:#bf8b38"></i><span>Более 0 и менее 30 м</span></div><div class="lg"><i class="context-symbol point" style="--symbol:#654323"></i><span>≥ 30 м</span></div>')}
function depthData(){return {type:'FeatureCollection',features:features.map(f=>({type:'Feature',properties:{id:f.properties.id,name:f.properties.name,depth:f.properties.depth},geometry:{type:'Point',coordinates:[f.properties.center[1],f.properties.center[0]]}}))}}
for(const [id,title,color,type] of specs){
 const label=document.createElement('label'),input=document.createElement('input'),sw=document.createElement('i'),name=document.createElement('span'),status=document.createElement('small');
 input.type='checkbox';input.id='context-'+id;sw.className='context-symbol '+type+(id==='rail'?' rail':'');sw.style.setProperty('--symbol',color);sw.setAttribute('aria-hidden','true');name.textContent=title;status.className='context-status';status.setAttribute('aria-live','polite');
 label.append(input,sw,name,status);section.querySelector('.context-options').append(label);
 const state={id,title,color,type,input,status,layer:null,minZoom:({housing:8,forest:9,water:8,rivers:8,stops:9})[id]||0};states.push(state);
 input.onchange=async()=>{
  if(!input.checked){if(state.layer)map.removeLayer(state.layer);legendSync();return}
  if(!state.layer){input.disabled=true;status.textContent='Загрузка…';try{
   let data;if(id==='depth')data=depthData();else{const response=await fetch('context/'+id+'.geojson');if(!response.ok)throw new Error('HTTP '+response.status);data=await response.json()}
   state.data=data;data.features.forEach(f=>f.bbox=f.bbox||bounds(f));
   state.layer=L.geoJSON(null,{pane:'context',style:{color,weight:type==='line'?1.8:1,fillOpacity:.35,dashArray:id==='rail'?'5 4':undefined},pointToLayer:(f,ll)=>L.circleMarker(ll,{pane:id==='depth'?'context-depth':'context',radius:id==='depth'?7:4,color:id==='depth'?(f.properties.depth==null?'#999':f.properties.depth>=30?'#654323':f.properties.depth>0?'#bf8b38':'#d7c3a2'):color,weight:2,fillOpacity:.8}),onEachFeature:(f,l)=>{const p=f.properties;l.bindTooltip(esc(p.name||title));l.bindPopup('<b>'+esc(p.name||title)+'</b><p>'+esc(title)+'</p>'+(id==='depth'?'<p>'+esc(p.id)+' · '+(p.depth==null?'Глубина / высота не указана':esc(p.depth)+' м')+'</p>':'<p>Источник: локальная выгрузка OpenStreetMap. Актуальность требует проверки.</p>'))}});
   status.textContent=data.features.length.toLocaleString('ru');
  }catch(error){input.checked=false;status.textContent='Не удалось загрузить — включите повторно';}finally{input.disabled=false}}
  if(input.checked&&state.layer){state.layer.addTo(map);refresh(state)}legendSync();
 };
}
})();
