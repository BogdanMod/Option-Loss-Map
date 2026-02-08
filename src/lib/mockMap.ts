export type IrreversibilityScore = {
  level: 'Low' | 'Medium' | 'High';
  score: number;
  F: number;
  T: number;
  O: number;
  S: number;
};

export type OptionMetrics = {
  optionLoss: number;
  irreversibility: IrreversibilityScore;
  confidence: 'High' | 'Medium' | 'Low';
  pnrFlag: boolean;
  pnrText: string;
};

export type MapNode = {
  id: string;
  type: 'current' | 'future_state' | 'merged_state';
  data: {
    label: string;
    subtitle?: string;
    optionId?: string;
  };
  position: { x: number; y: number };
};

export type MapEdge = {
  id: string;
  source: string;
  target: string;
  type: 'option-edge' | 'smoothstep';
  data: {
    optionId: string;
    label: string;
    metrics: OptionMetrics;
    closedFutures: string[];
    evidence: string[];
  };
};

export type MapSummary = {
  title: string;
  context: string;
  defaultOptionId: string;
  totalFutureStates?: number;
};

export type MapModel = {
  nodes: MapNode[];
  edges: MapEdge[];
  summary: MapSummary;
};

const metricsBuild: OptionMetrics = {
  optionLoss: 62,
  irreversibility: {
    level: 'High',
    score: 0.78,
    F: 0.82,
    T: 0.76,
    O: 0.84,
    S: 0.69
  },
  confidence: 'High',
  pnrFlag: true,
  pnrText: 'После найма 6+ инженеров и подписания 3‑летних инфраструктурных контрактов (infra)'
};

const metricsHybrid: OptionMetrics = {
  optionLoss: 39,
  irreversibility: {
    level: 'Medium',
    score: 0.52,
    F: 0.48,
    T: 0.55,
    O: 0.57,
    S: 0.46
  },
  confidence: 'Medium',
  pnrFlag: false,
  pnrText: 'Обязательства остаются модульными между партнёрами'
};

const metricsBuy: OptionMetrics = {
  optionLoss: 27,
  irreversibility: {
    level: 'Low',
    score: 0.31,
    F: 0.34,
    T: 0.28,
    O: 0.25,
    S: 0.33
  },
  confidence: 'Low',
  pnrFlag: false,
  pnrText: 'Смена вендора возможна в пределах 6 месяцев'
};

export const mockMap: MapModel = {
  summary: {
    title: 'Решение: построить внутреннюю аналитическую платформу',
    context: 'Объём: загрузка данных (ingestion), BI‑уровень (BI) и внутренние инструменты на 18 месяцев.',
    defaultOptionId: 'opt-build-core',
    totalFutureStates: 10
  },
  nodes: [
    {
      id: 'current',
      type: 'current',
      data: {
        label: 'Текущее состояние',
        subtitle: 'Разрозненная аналитика + вендорские дашборды'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-build-core',
      type: 'future_state',
      data: {
        label: 'Сборка собственной платформы',
        subtitle: 'Своя команда + кастомный пайплайн (pipeline)',
        optionId: 'opt-build-core'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-build-scale',
      type: 'future_state',
      data: {
        label: 'Масштабирование платформы данных',
        subtitle: 'Рост расходов + усиление орг‑структуры (org)',
        optionId: 'opt-build-core'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-build-ops',
      type: 'future_state',
      data: {
        label: 'Собственный контур поддержки',
        subtitle: '24/7 операции (ops) и уровни сервиса (SLA) внутри команды',
        optionId: 'opt-build-core'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-hybrid',
      type: 'future_state',
      data: {
        label: 'Гибридный стек',
        subtitle: 'Партнёр + ограниченный внутренний контур (in‑house)',
        optionId: 'opt-hybrid'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-hybrid-partner',
      type: 'future_state',
      data: {
        label: 'Укрепление партнёрской части',
        subtitle: 'Сильный вендорский стек (managed stack)',
        optionId: 'opt-hybrid'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-hybrid-lean',
      type: 'future_state',
      data: {
        label: 'Лёгкий внутренний контур (in‑house)',
        subtitle: 'Внутренними силами (in‑house) + минимум операций (ops)',
        optionId: 'opt-hybrid'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-buy',
      type: 'future_state',
      data: {
        label: 'Покупка и интеграция',
        subtitle: 'Вендорская платформа + интеграции',
        optionId: 'opt-buy'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-buy-fast',
      type: 'future_state',
      data: {
        label: 'Быстрый запуск',
        subtitle: 'Меньше кастома, быстрее время до ценности (time‑to‑value)',
        optionId: 'opt-buy'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'future-buy-lite',
      type: 'future_state',
      data: {
        label: 'Минимальный контур',
        subtitle: 'Отчётность (reporting) без сложных сценариев',
        optionId: 'opt-buy'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'merged',
      type: 'merged_state',
      data: {
        label: 'Через 12–18 месяцев',
        subtitle: 'Схождение траекторий + фиксация'
      },
      position: { x: 0, y: 0 }
    }
  ],
  edges: [
    {
      id: 'e-current-build',
      source: 'current',
      target: 'future-build-core',
      type: 'option-edge',
      data: {
        optionId: 'opt-build-core',
        label: 'Вариант A',
        metrics: metricsBuild,
        closedFutures: [
          'Стратегия: полный переход на управляемый стек (managed stack)',
          'Стратегия: откат к лёгким BI‑инструментам (BI)',
          'Команда: заморозка найма инженеров по данным (data engineering) на 12 мес.',
          'Стратегия: урезание до минимальной отчётности (reporting)',
          'Бюджет: перенос инфраструктурного бюджета (infra) в go‑to‑market (GTM)',
          'Стратегия: пилот только в одном рынке'
        ],
        evidence: [
          'План роста команды: +8 инженеров',
          'Капзатраты (CapEx) утверждены на 3‑летние обязательства',
          'Критичны кастомные модели и пайплайны'
        ]
      }
    },
    {
      id: 'e-current-hybrid',
      source: 'current',
      target: 'future-hybrid',
      type: 'option-edge',
      data: {
        optionId: 'opt-hybrid',
        label: 'Вариант B',
        metrics: metricsHybrid,
        closedFutures: [
          'Стратегия: полное владение интеллектуальной собственностью (IP) аналитики',
          'Стратегия: единый вендор без кастомного кода',
          'Команда: полное снятие операций (ops) с платформы данных',
          'Стратегия: нулевая зависимость от партнёров',
          'Команда: заморозка экспериментов с инструментами'
        ],
        evidence: [
          'Есть партнёрский контракт с условиями выхода (exit‑клаузами)',
          'Объём ограничен 2 доменами на 1‑й год'
        ]
      }
    },
    {
      id: 'e-current-buy',
      source: 'current',
      target: 'future-buy',
      type: 'option-edge',
      data: {
        optionId: 'opt-buy',
        label: 'Вариант C',
        metrics: metricsBuy,
        closedFutures: [
          'Стратегия: глубокая кастомизация под свои процессы',
          'Команда: развитие собственной витрины признаков (feature store)',
          'Стратегия: полное владение данными для монетизации',
          'Команда: масштабирование отдельной аналитической орг‑структуры',
          'Стратегия: дифференциация UX (пользовательского опыта) через кастомные дашборды'
        ],
        evidence: [
          'Бюджет ограничен лицензиями (SaaS)',
          'Операционная команда (ops) за минимизацию внутренних тулов'
        ]
      }
    },
    {
      id: 'e-build-scale',
      source: 'future-build-core',
      target: 'future-build-scale',
      type: 'smoothstep',
      data: {
        optionId: 'opt-build-core',
        label: 'Схождение',
        metrics: metricsBuild,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-build-ops',
      source: 'future-build-core',
      target: 'future-build-ops',
      type: 'smoothstep',
      data: {
        optionId: 'opt-build-core',
        label: 'Схождение',
        metrics: metricsBuild,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-hybrid-partner',
      source: 'future-hybrid',
      target: 'future-hybrid-partner',
      type: 'smoothstep',
      data: {
        optionId: 'opt-hybrid',
        label: 'Схождение',
        metrics: metricsHybrid,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-hybrid-lean',
      source: 'future-hybrid',
      target: 'future-hybrid-lean',
      type: 'smoothstep',
      data: {
        optionId: 'opt-hybrid',
        label: 'Схождение',
        metrics: metricsHybrid,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-buy-fast',
      source: 'future-buy',
      target: 'future-buy-fast',
      type: 'smoothstep',
      data: {
        optionId: 'opt-buy',
        label: 'Схождение',
        metrics: metricsBuy,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-buy-lite',
      source: 'future-buy',
      target: 'future-buy-lite',
      type: 'smoothstep',
      data: {
        optionId: 'opt-buy',
        label: 'Схождение',
        metrics: metricsBuy,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-build-merged',
      source: 'future-build-core',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-build-core',
        label: 'Схождение',
        metrics: metricsBuild,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-build-scale-merged',
      source: 'future-build-scale',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-build-core',
        label: 'Схождение',
        metrics: metricsBuild,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-build-ops-merged',
      source: 'future-build-ops',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-build-core',
        label: 'Схождение',
        metrics: metricsBuild,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-hybrid-merged',
      source: 'future-hybrid',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-hybrid',
        label: 'Схождение',
        metrics: metricsHybrid,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-hybrid-partner-merged',
      source: 'future-hybrid-partner',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-hybrid',
        label: 'Схождение',
        metrics: metricsHybrid,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-hybrid-lean-merged',
      source: 'future-hybrid-lean',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-hybrid',
        label: 'Схождение',
        metrics: metricsHybrid,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-buy-merged',
      source: 'future-buy',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-buy',
        label: 'Схождение',
        metrics: metricsBuy,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-buy-fast-merged',
      source: 'future-buy-fast',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-buy',
        label: 'Схождение',
        metrics: metricsBuy,
        closedFutures: [],
        evidence: []
      }
    },
    {
      id: 'e-buy-lite-merged',
      source: 'future-buy-lite',
      target: 'merged',
      type: 'smoothstep',
      data: {
        optionId: 'opt-buy',
        label: 'Схождение',
        metrics: metricsBuy,
        closedFutures: [],
        evidence: []
      }
    }
  ]
};
