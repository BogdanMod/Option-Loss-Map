export type DecisionDomain =
  | 'product'
  | 'architecture'
  | 'data'
  | 'hiring'
  | 'pricing'
  | 'market'
  | 'custom';

type FutureTemplate = {
  title: string;
  subtitle: string;
  tags: string[];
};

export const domainTemplates: Record<DecisionDomain, FutureTemplate[]> = {
  product: [
    {
      title: 'Фокус на ключевом сегменте',
      subtitle: 'Рост глубины ценности и узкий охват',
      tags: ['strategic_closure', 'scope_focus']
    },
    {
      title: 'Расширение платформы',
      subtitle: 'Рост поверхности продукта и взаимозависимостей',
      tags: ['scope_growth', 'org_inertia']
    },
    {
      title: 'Дифференциация через качество',
      subtitle: 'Инвестиции в пользовательский опыт (UX) и поддержку',
      tags: ['fixed_cost', 'strategic_closure']
    },
    {
      title: 'Интеграции как рост',
      subtitle: 'Усиление внешних зависимостей',
      tags: ['vendor_lockin', 'platform_commitment']
    },
    {
      title: 'Модульность предложений',
      subtitle: 'Больше опций для гибкой продажи',
      tags: ['flexibility_high', 'reversibility_high']
    },
    {
      title: 'Скоростной релиз',
      subtitle: 'Быстрый вывод и риск пересборки',
      tags: ['speed_high', 'reversibility_low']
    },
    {
      title: 'Закрепление на одном рынке',
      subtitle: 'Снижение вариативности выхода в новые рынки',
      tags: ['strategic_closure', 'market_focus']
    },
    {
      title: 'Фиксация ключевых процессов',
      subtitle: 'Регламенты и согласования усиливают инерцию',
      tags: ['org_inertia', 'process_change']
    },
    {
      title: 'Рост доли кастомных решений',
      subtitle: 'Сложнее откатиться на стандарт',
      tags: ['sunk_cost', 'reversibility_low']
    }
  ],
  architecture: [
    {
      title: 'Микросервисная архитектура',
      subtitle: 'Рост сложности и зависимостей',
      tags: ['org_inertia', 'process_change']
    },
    {
      title: 'Единый технологический стек',
      subtitle: 'Упрощение поддержки, риск монозависимости',
      tags: ['vendor_lockin', 'strategic_closure']
    },
    {
      title: 'Инфраструктурные контракты',
      subtitle: 'Долгие обязательства по инфраструктуре (infra)',
      tags: ['fixed_cost', 'infra_contracts']
    },
    {
      title: 'Рост скорости разработки',
      subtitle: 'Быстрее вывод, сложнее откат',
      tags: ['speed_high', 'reversibility_low']
    },
    {
      title: 'Внутренний платформенный слой',
      subtitle: 'Усиление внутренней зависимости',
      tags: ['platform_commitment', 'org_inertia']
    },
    {
      title: 'Снижение долгов по качеству',
      subtitle: 'Рост инвестиций в качество и тесты',
      tags: ['fixed_cost', 'long_timeline']
    },
    {
      title: 'Привязка к провайдеру',
      subtitle: 'Сложность миграции и смены поставщика',
      tags: ['vendor_lockin', 'reversibility_low']
    },
    {
      title: 'Оптимизация затрат',
      subtitle: 'Сильная зависимость от объёмов',
      tags: ['fixed_cost', 'strategic_closure']
    },
    {
      title: 'Долгий переходный период',
      subtitle: 'Параллельная поддержка двух контуров',
      tags: ['long_timeline', 'slow_revert']
    }
  ],
  data: [
    {
      title: 'Собственная витрина данных',
      subtitle: 'Рост контроля и затрат на поддержку',
      tags: ['fixed_cost', 'org_inertia']
    },
    {
      title: 'Покупка готовой платформы',
      subtitle: 'Быстрый запуск, зависимость от вендора',
      tags: ['vendor_lockin', 'speed_high']
    },
    {
      title: 'Партнёрская модель данных',
      subtitle: 'Совместная ответственность и риски',
      tags: ['platform_commitment', 'strategic_closure']
    },
    {
      title: 'Укрупнение доменов данных',
      subtitle: 'Больше совместных моделей и правил',
      tags: ['org_inertia', 'process_change']
    },
    {
      title: 'Фиксация моделей',
      subtitle: 'Сложнее менять смысловые структуры',
      tags: ['sunk_cost', 'reversibility_low']
    },
    {
      title: 'Повышение качества данных',
      subtitle: 'Долгий цикл улучшений',
      tags: ['long_timeline', 'slow_revert']
    },
    {
      title: 'Снижение гибкости экспериментов',
      subtitle: 'Дольше согласования и проверки',
      tags: ['org_inertia', 'reversibility_low']
    },
    {
      title: 'Инфраструктурные обязательства',
      subtitle: 'Контракты и фиксированные расходы',
      tags: ['infra_contracts', 'fixed_cost']
    },
    {
      title: 'Сдвиг в сторону отчётности',
      subtitle: 'Меньше возможностей для глубокой аналитики',
      tags: ['strategic_closure', 'scope_focus']
    }
  ],
  hiring: [
    {
      title: 'Рост постоянной команды',
      subtitle: 'Увеличение обязательств и инерции',
      tags: ['hiring_lock', 'org_inertia']
    },
    {
      title: 'Ставка на подрядчиков',
      subtitle: 'Быстрее масштабирование, ниже фиксация',
      tags: ['flexibility_high', 'speed_high']
    },
    {
      title: 'Стандартизация процессов',
      subtitle: 'Сложнее менять орг‑модель',
      tags: ['process_change', 'org_inertia']
    },
    {
      title: 'Инвестиции в компетенции',
      subtitle: 'Долгий цикл обучения',
      tags: ['long_timeline', 'fixed_cost']
    },
    {
      title: 'Закрепление ключевых ролей',
      subtitle: 'Сложность быстрой перестройки',
      tags: ['hiring_lock', 'reversibility_low']
    },
    {
      title: 'Снижение скорости найма',
      subtitle: 'Усиление фильтров и согласований',
      tags: ['slow_revert', 'org_inertia']
    },
    {
      title: 'Рост управленческого слоя',
      subtitle: 'Дополнительные уровни принятия решений',
      tags: ['org_inertia', 'process_change']
    },
    {
      title: 'Фиксация компенсационной модели',
      subtitle: 'Сложнее менять подход к мотивации',
      tags: ['strategic_closure', 'fixed_cost']
    }
  ],
  pricing: [
    {
      title: 'Переход на подписку',
      subtitle: 'Стабильность выручки, меньше гибкости',
      tags: ['fixed_cost', 'strategic_closure']
    },
    {
      title: 'Оплата по использованию',
      subtitle: 'Гибкость, но сложнее прогнозирование',
      tags: ['flexibility_high', 'reversibility_high']
    },
    {
      title: 'Жёсткая упаковка',
      subtitle: 'Меньше кастомных условий',
      tags: ['strategic_closure', 'reversibility_low']
    },
    {
      title: 'Сегментация по планам',
      subtitle: 'Рост сложности поддержания линейки',
      tags: ['org_inertia', 'process_change']
    },
    {
      title: 'Фиксированные скидки',
      subtitle: 'Труднее менять структуру цены',
      tags: ['sunk_cost', 'fixed_cost']
    },
    {
      title: 'Агрессивный рост объёма',
      subtitle: 'Нагрузка на инфраструктуру и поддержку',
      tags: ['fixed_cost', 'platform_commitment']
    },
    {
      title: 'Консервативная политика',
      subtitle: 'Сдерживает новые сегменты',
      tags: ['strategic_closure', 'market_focus']
    },
    {
      title: 'Снижение свободы экспериментов',
      subtitle: 'Меньше пространства для тестов',
      tags: ['reversibility_low', 'org_inertia']
    }
  ],
  market: [
    {
      title: 'Фокус на одном рынке',
      subtitle: 'Глубина против широты',
      tags: ['market_focus', 'strategic_closure']
    },
    {
      title: 'Мульти‑рынок',
      subtitle: 'Рост сложности и затрат',
      tags: ['fixed_cost', 'org_inertia']
    },
    {
      title: 'Локализация продукта',
      subtitle: 'Долгий цикл изменений',
      tags: ['long_timeline', 'process_change']
    },
    {
      title: 'Партнёрская экспансия',
      subtitle: 'Зависимость от партнёров',
      tags: ['vendor_lockin', 'strategic_closure']
    },
    {
      title: 'Усиление структуры выхода на рынок',
      subtitle: 'Рост расходов и обязательств (GTM)',
      tags: ['fixed_cost', 'hiring_lock']
    },
    {
      title: 'Снижение гибкости позиционирования',
      subtitle: 'Сложнее менять сегмент',
      tags: ['strategic_closure', 'reversibility_low']
    },
    {
      title: 'Ускорение выхода на рынок',
      subtitle: 'Высокая скорость, риск отката',
      tags: ['speed_high', 'slow_revert']
    },
    {
      title: 'Стабилизация каналов',
      subtitle: 'Меньше экспериментов с каналами',
      tags: ['org_inertia', 'process_change']
    }
  ],
  custom: [
    {
      title: 'Рост обязательств',
      subtitle: 'Увеличение фиксированных расходов',
      tags: ['fixed_cost', 'org_inertia']
    },
    {
      title: 'Ускорение реализации',
      subtitle: 'Скорость против обратимости',
      tags: ['speed_high', 'reversibility_low']
    },
    {
      title: 'Стратегическая фиксация',
      subtitle: 'Сужение пространства опций',
      tags: ['strategic_closure', 'platform_commitment']
    },
    {
      title: 'Снижение гибкости команды',
      subtitle: 'Больше процессов и согласований',
      tags: ['org_inertia', 'process_change']
    },
    {
      title: 'Фиксация инфраструктуры',
      subtitle: 'Контракты и долгие циклы',
      tags: ['infra_contracts', 'long_timeline']
    },
    {
      title: 'Ограничение экспериментов',
      subtitle: 'Сложнее проверять новые направления',
      tags: ['reversibility_low', 'strategic_closure']
    },
    {
      title: 'Рост стоимости отката',
      subtitle: 'Дороже вернуть прежнее состояние',
      tags: ['sunk_cost', 'slow_revert']
    },
    {
      title: 'Усиление партнёрской зависимости',
      subtitle: 'Сложнее сменить поставщиков',
      tags: ['vendor_lockin', 'strategic_closure']
    }
  ]
};
