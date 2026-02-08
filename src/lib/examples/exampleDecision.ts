import type { DecisionInput } from '@/lib/map/engine';

export const exampleDecisionInput: DecisionInput = {
  domain: 'data',
  title: 'Внутренняя аналитическая платформа',
  currentStateText: 'Разрозненная аналитика, разные инструменты, нужен единый контур на 18 месяцев.',
  options: [
    { id: 'A', label: 'Собственная платформа', description: 'Своя команда + кастомный пайплайн' },
    { id: 'B', label: 'Гибридный подход', description: 'Партнёр + ограниченный внутренний контур' },
    { id: 'C', label: 'Покупка и интеграция', description: 'Вендорская платформа + интеграции' }
  ],
  constraints: [
    'Срок — 18 месяцев',
    'Ограничение по капзатратам (CapEx)',
    'Нужен быстрый запуск первых витрин'
  ]
};
