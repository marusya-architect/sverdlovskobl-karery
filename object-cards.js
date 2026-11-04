const objectCards = (() => {
  const links = [
    {
      title: 'Новая Линза',
      ids: ['SO-0001', 'SO-0748'],
      source: 'В реестре отвал записан под названием «Отвал Новая Линза».'
    }
  ];
  const highlighted = L.layerGroup().addTo(map);
  map.on('click popupopen', () => highlighted.clearLayers());
  const metres = value => Number.isFinite(value) ? value.toLocaleString('ru') + ' м' : 'нет сведений';

  function basis(p) {
    const housing = 'До жилой застройки ' + metres(p.home) + ' (П ' + p.criteria[0] + ')';
    const transport = p.stop <= 2500 || p.road > 1000
      ? 'до остановки ' + metres(p.stop)
      : 'до основной дороги ' + metres(p.road);
    let second = transport + ' (Т ' + p.criteria[2] + ')';
    if (p.scenario === 'В+' && p.landscape && p.landscape !== 'нет данных') {
      second = 'ландшафт — ' + p.landscape + ' (Л ' + p.criteria[3] + ')';
    } else if (p.criteria[1] === 3 && Number.isFinite(p.depth)) {
      second = (p.kind === 'карьер' ? 'глубина' : 'высота') + ' ' + metres(p.depth) + ' (ИГ 3)';
    }
    const match = p.exact ? 'Точное совпадение' : 'Ближайшее сочетание';
    return '<div class="sec"><b>Основание сценария</b>' + esc(housing + ', ' + second) +
      '. ' + match + ' по пяти критериям, строка ' + esc(p.row) + '.</div>';
  }

  function checks(p) {
    const engineering = p.missing ? 'Глубина или высота не указана, инженерный критерий принят условно.' :
      'В карточке указана глубина или высота ' + metres(p.depth) + '.';
    const topics = [
      ['Устойчивость бортов и грунтов', engineering + ' Нужны результаты инженерных изысканий.'],
      ['Загрязнение почвы и воды', 'Нужны результаты обследования почвы и воды.'],
      ['Безопасный доступ и обслуживание', 'До основной дороги ' + metres(p.road) + ' по прямой. Требуется проверить фактический въезд и аварийный подъезд.'],
      ['Правовое основание использования', 'Требуется сверить права на участок, разрешённое использование и ограничения.']
    ];
    return '<details class="sec"><summary>Что требуется подтвердить</summary>' +
      topics.map(([title, hint]) => '<p><strong>' + title + '</strong> · нет сведений о проверке<br>' + esc(hint) + '</p>').join('') + '</details>';
  }

  function related(p) {
    const group = links.find(item => item.ids.includes(p.id));
    if (!group) return '';
    const peers = group.ids.filter(id => id !== p.id).map(id => features.find(f => f.properties.id === id)?.properties.name).filter(Boolean);
    return '<div class="sec"><b>Связанные территории</b>' + esc(group.title) + ' · ' + esc(peers.join(', ')) +
      '<p>' + esc(group.source) + '</p><button type="button" class="chip" data-show-group="' + esc(p.id) + '">Показать вместе</button></div>';
  }

  map.on('popupopen', ({popup: opened}) => {
    const button = opened.getElement().querySelector('[data-show-group]');
    if (button) button.onclick = () => showGroup(button.dataset.showGroup);
  });

  function showGroup(id) {
    const group = links.find(item => item.ids.includes(id));
    if (!group) return;
    const members = features.filter(f => group.ids.includes(f.properties.id));
    const extent = L.geoJSON(members).getBounds();
    map.closePopup();
    highlighted.clearLayers();
    for (const feature of members) {
      const p = feature.properties;
      L.circleMarker(p.center, {radius: 8, weight: 3, color: '#1d2321', fillColor: '#fff', fillOpacity: 1})
        .bindTooltip(esc(p.name), {permanent: true, direction: p.kind === 'отвал' ? 'top' : 'bottom'})
        .on('click', () => L.popup().setLatLng(p.center).setContent(popup(p)).openOn(map))
        .addTo(highlighted);
    }
    map.fitBounds(extent, {padding: [48, 40], maxZoom: 16});
  }
  return {basis, checks, related};
})();
