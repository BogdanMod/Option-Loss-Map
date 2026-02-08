import type { DecisionInput } from '@/lib/map/engine';
import type { ExtractedDecision } from './schemas';

export function buildExtractPrompt(input: DecisionInput): string {
  return `Ты структурируешь ввод пользователя. Ты НЕ даёшь советов и НЕ оцениваешь варианты.
Запрещённые слова: "советую", "лучше", "выберите", "рекомендую", "стоит", "надо".
Верни JSON строго по схеме. Если данных нет — пустые массивы, не выдумывай.

Ввод:
Домен: ${input.domain}
Название: ${input.title}
Текущее состояние: ${input.currentStateText}
Варианты: ${input.options.map((opt) => `${opt.id}: ${opt.label}${opt.description ? ` — ${opt.description}` : ''}`).join('; ')}
Ограничения: ${input.constraints.join('; ')}
`;
}

export function buildFutureStatesPrompt(extracted: ExtractedDecision, option: { id: string; label: string; description?: string }): string {
  return `Ты извлекаешь структуру. Не даёшь рекомендаций. Не предсказываешь.
Запрещённые слова: "советую", "лучше", "выберите", "рекомендую", "стоит", "надо".
Нужно сгенерировать 6–7 будущих состояний как классы состояний, не прогноз.
Каждое состояние: title, subtitle (1 строка), tags только из словаря, category, evidence.
Ответ строго JSON по схеме.

Вариант: ${option.id} — ${option.label}${option.description ? ` (${option.description})` : ''}
Контекст:
${JSON.stringify(extracted, null, 2)}
`;
}
