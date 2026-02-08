export const tagDictionary: Record<string, string> = {
  hiring_lock: 'закрепление найма/штата',
  org_inertia: 'организационная инерция',
  fixed_cost: 'фиксированные затраты',
  sunk_cost: 'невозвратные затраты',
  vendor_lockin: 'зависимость от поставщика',
  long_timeline: 'длинный горизонт изменений',
  slow_revert: 'медленный откат',
  strategic_closure: 'закрытие стратегических альтернатив',
  flexibility_low: 'снижение гибкости',
  flexibility_high: 'повышенная гибкость',
  speed_high: 'ускорение запуска',
  speed_low: 'снижение скорости',
  variable_cost: 'переменные затраты',
  open_standards: 'открытые стандарты',
  low_sunk_cost: 'низкие невозвратные затраты',
  short_timeline: 'короткий горизонт изменений',
  scope_growth: 'расширение скоупа',
  scope_limit: 'ограничение скоупа',
  strategic_opening: 'стратегическое расширение',
  compliance_risk: 'риск комплаенса',
  integration_risk: 'риск интеграции'
};

export const humanizeTag = (tag: string) => tagDictionary[tag] ?? tag;
