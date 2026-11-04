const groupMap = (() => {
  const register = new Map(features.map(f => [f.properties.id, f]));
  const byMember = new Map();
  const layers = L.layerGroup();
  const indexed = new Map();
  const number = n => n.toLocaleString('ru');
  const ids = g => [...g.pits, ...g.edges.map(e => e.id)];
  const props = id => register.get(id).properties;
  const label = id => {
    const p = props(id);
    return (p.name === 'Без названия' ? p.kind : p.name) + ' · ' + id;
  };
  for (const group of territoryGroups) {
    indexed.set(group.id, group);
    for (const id of ids(group)) byMember.set(id, group);
  }

  // The same allowed criterion levels and row order used by build_data.py.
  const rules = [
    [[1,2],[1],[3],[1,2],[3]], [[2,3],[2,3],[3],[2,3],[3]],
    [[2,3,4],[2,3],[2,3],[3],[2]], [[3,4],[2,3],[2],[1,2],[1,2]],
    [[4],[3],[2,3],[3],[2,3]], [[4],[3],[1,2],[1],[1]],
    [[5],[1,2],[1],[1],[1]], [[5],[3],[1],[1],[1]]
  ];
  function assess(group) {
    const members = ids(group).map(props);
    const vals = members.map(p => p.criteria);
    const range = (i,fn) => fn(...vals.map(v => v[i]));
    const profile = [range(0,Math.max),range(1,Math.max),range(2,Math.min),range(3,Math.min),range(4,Math.min)];
    const scores = rules.map(row => row.reduce((sum,allowed,i) => sum + Math.min(...allowed.map(u => Math.abs(u-profile[i]))),0));
    const row = scores.indexOf(Math.min(...scores));
    const scenario = mx[row][5];
    const types = [...new Set(members.map(p => p.scenario))];
    const conflict = types.includes('Г+') && types.includes('А+');
    let decision;
    if (conflict) decision = 'Новый общий сценарий — поэтапное восстановление с функциональным разделением. Промышленное и жилое использование требуют раздельных площадок и проверки санитарных разрывов.';
    else if (types.length === 1 && types[0] === scenario) decision = 'Единый сценарий для всей группы предварительно согласуется с матрицей. Возможность его реализации зависит от проверок ниже.';
    else if (types.includes('Д−')) decision = 'Частичное освоение. На участках Д− приоритетны восстановление и консервация. На остальных следует отдельно проверить предлагаемые функции.';
    else if (types.includes('Г+') && types.length>1) decision = 'Частичное освоение с разделением функций. Для соседства промышленной площадки с другими зонами требуется проверка воздействия и защитных расстояний.';
    else decision = 'Поэтапное освоение по участкам. Различия между индивидуальными строками и групповой оценкой требуют проверки совместимости функций и доступа.';
    return {members,profile,row,scenario,decision,score:scores[row]};
  }
  function card(g) {
    const a = assess(g);
    const counts = new Map();
    for (const p of a.members) counts.set(p.scenario,(counts.get(p.scenario)||0)+1);
    const deep = a.members.filter(p=>p.depth>=30).length;
    const missing = a.members.filter(p=>p.missing).length;
    const wet = a.members.filter(p=>/затоп/i.test(p.landscape)).length;
    const remote = a.members.filter(p=>p.criteria[2]===1).length;
    const statuses = [
      ['Устойчивость', 'Высота или глубина от 30 м у '+deep+' объектов. Без отметки глубины или высоты — '+missing+'. Нужны изыскания.'],
      ['Почвы и воды', 'Затопление отмечено у '+wet+' объектов. Загрязнение требует анализов.'],
      ['Доступ', 'Низкая расчётная доступность у '+remote+' объектов. Нужна проверка подъезда и эвакуации.'],
      ['Правовой режим', 'Для общего использования требуется сверка участков, прав и ограничений.']
    ];
    const vol = n => n == null ? 'нет данных' : number(n)+' м³';
    const dumpSum = g.edges.reduce((sum,e)=>sum+(e.dumpVolume || 0),0);
    const pitEstimates = g.pits.map(id=>props(id)).map(p=>p.area>0 && p.depth>0 ? Math.round(p.area*10000*p.depth/2) : null);
    const complete = pitEstimates.every(n=>n!=null) && g.edges.every(e=>e.dumpVolume!=null);
    const pitSum = pitEstimates.reduce((sum,n)=>sum+(n||0),0);
    const balance = complete ? 'Суммарно: отвалы '+vol(dumpSum)+', выемки '+vol(pitSum)+'. '+
      (dumpSum>pitSum?'Объём отвалов превышает оценку выемок. Привязка требует пересмотра.':'По порядку объёмов явного превышения над выемками нет.') :
      'Для полного сопоставления объёмов группы не хватает размеров.';
    const links = g.edges.map(e => '<li><strong>'+esc(label(e.id))+'</strong> → '+esc(label(e.target))+
      '<br>'+(e.confirmed?'Подтверждено для месторождения по карточкам № 899 и № 202.':'Предполагаемая связь.')+
      ' Расстояние между геометриями '+number(e.dist)+' м. Отвал '+vol(e.dumpVolume)+', выемка '+vol(e.pitVolume)+'.'+
      (e.closeAlternative && !e.confirmed?' Есть близкая альтернатива.':'')+'</li>').join('');
    return '<h3>'+esc(g.title)+'</h3><p>'+g.pits.length+' карьерных записей · '+g.edges.length+' отвалов</p>'+
      '<b>Предварительный вывод</b><p>'+a.decision+'</p><p><strong>Допустимость освоения пока не подтверждена.</strong></p>'+
      '<details><summary>Матрица и сценарии участков</summary><p>Для группы: '+esc(a.scenario)+' · '+SC[a.scenario][0]+'. Строка '+(a.row+1)+', '+(a.score?'ближайшее сочетание':'точное совпадение')+'.</p>'+
      '<p>П / ИГ / Т / Л / И: '+a.profile.join(' / ')+'. Для всей группы взяты наиболее удалённое положение, максимальная инженерная сложность и минимальные Т, Л, И. Это проектное правило объединения.</p>'+
      '<p>'+[...counts].map(([k,n])=>esc(k)+' · '+SC[k][0]+' ('+n+')').join('<br>')+'</p><ul>'+a.members.map(p=>'<li>'+esc(label(p.id))+' — '+esc(p.scenario)+'</li>').join('')+'</ul></details>'+
      '<details><summary>Стоп-факторы группы</summary>'+statuses.map(([n,t])=>'<p><b>'+n+'</b> · нет документального подтверждения.<br>'+t+'</p>').join('')+'</details>'+
      '<details><summary>Основания связей</summary><p>'+balance+'</p><ul>'+links+'</ul><p>Расстояние измерено между контурами или реестровыми точками. В пределах 2 км от расстояния до ближайшего кандидата учитываются превышение объёма отвала над выемкой и совпадение названия в исходной записи. Сопоставимый кандидат отмечен при разнице оценок менее 200 м.</p>'+
      '<p>Оценка объёма = ½ площади основания × глубина или высота. Это условная геометрическая оценка. Для баланса вскрыши нужны доля вскрышных пород и коэффициент разрыхления. При отсутствии размеров объёмы не сравниваются.</p></details>';
  }
  const section = document.createElement('section');
  section.className = 'group-section';
  section.innerHTML = '<h2>Связанные территории</h2><button type="button" class="chip" aria-pressed="false">Связанные территории</button><div class="group-panel" hidden><label>Карточка группы<select></select></label><button class="group-fit" type="button">Показать вместе</button><article></article></div>';
  $('reset').before(section);
  const toggle = section.querySelector('.chip'), panel = section.querySelector('.group-panel');
  const select = panel.querySelector('select');
  for(const g of territoryGroups) select.add(new Option(g.title+' · '+g.id,g.id));
  const legend = document.createElement('div');
  legend.className='group-key'; legend.textContent='Связанные территории · один цвет на группу. Линии обозначают связи объектов.';
  $('legend').after(legend); legend.hidden=true;
  function render(group) {
    select.value=group.id;
    panel.querySelector('article').innerHTML=card(group);
  }
  function drawLayers() {
    map.createPane('group-view');map.getPane('group-view').style.zIndex=610;
    for(const [i,g] of territoryGroups.entries()){
      const color='hsl('+Math.round((i*137.508)%360)+' 58% 38%)';
      const shapes=L.featureGroup().addTo(layers);
      for(const id of ids(g)){
        const f=register.get(id);
        if(f.geometry.type.includes('Polygon'))L.geoJSON(f,{pane:'group-view',style:{color,weight:2,fillOpacity:.2}}).addTo(shapes);
        const symbol=L.circleMarker(f.properties.center,{pane:'group-view',radius:6,weight:1,color:'#fff',fillColor:color,fillOpacity:1}).addTo(shapes);
        symbol.bindTooltip(esc(label(id)));
      }
      for(const e of g.edges)L.polyline([props(e.id).center,props(e.target).center],{pane:'group-view',color,weight:3,dashArray:e.confirmed?undefined:'5 4'}).addTo(shapes);
      if(g.pits.length>1)for(const p of g.pits.slice(1))L.polyline([props(g.id).center,props(p).center],{pane:'group-view',color,weight:2}).addTo(shapes);
      shapes.on('click',()=>open(g.id,false));
    }
  }
  function enable(on){
    panel.hidden=legend.hidden=!on;toggle.setAttribute('aria-pressed',String(on));
    if(on){if(!layers.getLayers().length)drawLayers();layers.addTo(map);render(indexed.get(select.value));}
    else map.removeLayer(layers);
  }
  function open(id,zoom){
    const g=indexed.get(id);
    if(!g)return;
    if(!map.hasLayer(layers))enable(true);
    render(g);
    if(zoom)map.fitBounds(L.geoJSON(ids(g).map(k=>register.get(k))).getBounds(),{padding:[32,32],maxZoom:16});
    if(document.body.classList.contains('collapsed'))$('stog').click();
    section.scrollIntoView({block:'nearest'});
  }
  toggle.onclick=()=>{
    const on=!map.hasLayer(layers);
    enable(on);
    if(on)map.fitBounds(region.getBounds());
  };
  select.onchange=()=>open(select.value,true);
  panel.querySelector('.group-fit').onclick=()=>open(select.value,true);
  map.on('popupopen',({popup})=>{
    const b=popup.getElement().querySelector('[data-group-card]');
    if(b)b.onclick=()=>{map.closePopup();open(b.dataset.groupCard,true);};
  });
  function related(id){
    const g=byMember.get(id);
    if(!g)return '';
    return '<div class="sec"><b>Связанные территории</b>'+esc(g.title)+'<br><button class="chip" data-group-card="'+g.id+'">Показать вместе</button></div>';
  }
  return {related};
})();
