const objectCards = (() => {
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

  return {basis, checks, related: p => groupMap.related(p.id)};
})();
