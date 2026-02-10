import type { DecisionInput } from '@/lib/map/engine';

export const exampleDecisionInputs: DecisionInput[] = [
  {
    domain: 'hiring',
    title: 'Нанять первого сотрудника',
    currentStateText: 'Я всё делаю сам. Задач становится больше, времени не хватает.',
    options: [
      { id: 'A', label: 'Нанять сейчас', description: '' },
      { id: 'B', label: 'Подождать', description: '' },
      { id: 'C', label: 'Использовать фриланс', description: '' }
    ],
    constraints: []
  },
  {
    domain: 'product',
    title: 'Запускать продукт сейчас или дорабатывать',
    currentStateText: 'Продукт работает, но не идеален. Есть первые пользователи.',
    options: [
      { id: 'A', label: 'Запуск сейчас', description: '' },
      { id: 'B', label: 'Доработать ещё', description: '' },
      { id: 'C', label: 'Закрытая бета', description: '' }
    ],
    constraints: []
  },
  {
    domain: 'hiring',
    title: 'Уволиться или остаться на текущей работе',
    currentStateText: 'Работа стабильная, но нет роста и энергии.',
    options: [
      { id: 'A', label: 'Уволиться сейчас', description: '' },
      { id: 'B', label: 'Остаться', description: '' },
      { id: 'C', label: 'Искать параллельно', description: '' }
    ],
    constraints: []
  }
];

export const getExampleDecisionInput = (index: number) =>
  exampleDecisionInputs[index % exampleDecisionInputs.length] ?? exampleDecisionInputs[0];

// Map example indices to ZerCon example keys
export const getZerconExampleKey = (index: number): string | null => {
  const keys: (string | null)[] = ['hiring', 'product', 'career'];
  return keys[index % keys.length] ?? null;
};
