/**
 * Regression test для проверки защиты от галлюцинаций в ZerCon Rewrite
 * Тест проверяет, что LLM не добавляет новые сущности (инфраструктура/команда/контракты),
 * если их нет в input пользователя.
 */

import { calculateOverlapRatio } from './zercon';

// Тестовый кейс: покупка бизнеса с налоговыми рисками
const testCase = {
  decisionContext: 'Могу купить прибыльный бизнес по цене в 3 раза ниже рынка. Останавливают вопросы с налогами.',
  variants: ['Купить', 'Не покупать', 'Долго разбираться'],
  originalNode: {
    title: 'Будущее: Налоговые риски',
    detail: 'Неясные обязательства по прошлым периодам'
  }
};

// Разрешённые токены (из decisionContext + variants)
const allowedTokens = new Set<string>();
const allowedTexts = [
  testCase.decisionContext,
  ...testCase.variants
];
allowedTexts.forEach((text) => {
  const lower = text.toLowerCase();
  const words = lower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .filter((word) => !['могу', 'купить', 'прибыльный', 'бизнес', 'цене', 'раза', 'ниже', 'рынка', 'останавливают', 'вопросы', 'налогами', 'нельзя', 'покупать', 'долго', 'разбираться'].includes(word));
  words.forEach((word) => allowedTokens.add(word));
});
// Добавляем ключевые слова явно
['купить', 'бизнес', 'налог', 'риск', 'обязательство', 'период', 'прибыль', 'цена', 'рынок'].forEach((word) => allowedTokens.add(word));

// Запрещённые токены (не должны появляться в ответе)
const forbiddenTokens = ['инфраструктура', 'команда', 'найм', 'расход', 'контракт', 'юридический', 'шаг', 'пакет', 'сегмент', 'поддержка', 'клиент', 'продаж', 'маркетинг'];

// Симуляция ответа LLM (хороший случай — релевантный)
const goodResponse = {
  title: 'Налоговые обязательства фиксируются',
  detail: 'Покупка бизнеса создаёт риски по прошлым налоговым периодам. Проверка займёт 4–12 недель. Откат невозможен после сделки.'
};

// Симуляция ответа LLM (плохой случай — галлюцинация)
const badResponse = {
  title: 'Инфраструктура команды требует найма',
  detail: 'Покупка бизнеса требует найма новой команды и создания инфраструктуры. Контракты на 12 месяцев. Расходы на поддержку клиентов.'
};

// Тесты
function runRegressionTest() {
  console.log('=== ZerCon Regression Test: Защита от галлюцинаций ===\n');

  // Тест 1: Хороший ответ (релевантный)
  const goodOverlap = calculateOverlapRatio(
    `${goodResponse.title} ${goodResponse.detail}`,
    allowedTokens
  );
  console.log('Тест 1: Хороший ответ (релевантный)');
  console.log(`  Overlap ratio: ${goodOverlap.toFixed(2)}`);
  console.log(`  Ожидание: >= 0.18`);
  console.log(`  Результат: ${goodOverlap >= 0.18 ? '✅ PASS' : '❌ FAIL'}\n`);

  // Проверка на запрещённые токены
  const goodHasForbidden = forbiddenTokens.some((forbidden) =>
    `${goodResponse.title} ${goodResponse.detail}`.toLowerCase().includes(forbidden)
  );
  console.log(`  Запрещённые токены: ${goodHasForbidden ? '❌ FOUND' : '✅ NOT FOUND'}\n`);

  // Тест 2: Плохой ответ (галлюцинация)
  const badOverlap = calculateOverlapRatio(
    `${badResponse.title} ${badResponse.detail}`,
    allowedTokens
  );
  console.log('Тест 2: Плохой ответ (галлюцинация)');
  console.log(`  Overlap ratio: ${badOverlap.toFixed(2)}`);
  console.log(`  Ожидание: < 0.18 (должен быть отклонён)`);
  console.log(`  Результат: ${badOverlap < 0.18 ? '✅ PASS (отклонён)' : '❌ FAIL (не отклонён)'}\n`);

  // Проверка на запрещённые токены
  const badHasForbidden = forbiddenTokens.some((forbidden) =>
    `${badResponse.title} ${badResponse.detail}`.toLowerCase().includes(forbidden)
  );
  console.log(`  Запрещённые токены: ${badHasForbidden ? '✅ FOUND (ожидаемо)' : '❌ NOT FOUND'}\n`);

  // Итог
  const allPassed = goodOverlap >= 0.18 && !goodHasForbidden && badOverlap < 0.18;
  console.log(`=== Итог: ${allPassed ? '✅ ВСЕ ТЕСТЫ ПРОШЛИ' : '❌ ЕСТЬ ОШИБКИ'} ===\n`);

  return allPassed;
}

// Экспорт для использования в тестах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runRegressionTest, calculateOverlapRatio };
}

// Запуск при прямом вызове
if (require.main === module) {
  runRegressionTest();
}

