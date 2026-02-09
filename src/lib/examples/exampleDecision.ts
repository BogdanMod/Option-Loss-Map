import type { DecisionInput } from '@/lib/map/engine';

export const exampleDecisionInput: DecisionInput = {
  domain: 'hiring',
  title: 'Нанять первого сотрудника',
  currentStateText: 'Я всё делаю сам, задач становится больше, времени не хватает.',
  options: [
    { id: 'A', label: 'Нанять сейчас', description: '' },
    { id: 'B', label: 'Подождать', description: '' },
    { id: 'C', label: 'Использовать фриланс', description: '' }
  ],
  constraints: []
};
