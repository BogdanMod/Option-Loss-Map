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

export function buildFutureStatesPrompt(
  extracted: ExtractedDecision,
  option: { id: string; label: string; description?: string }
): string {
  return `Ты формулируешь последствия решений языком ZerCon. Никаких советов. Никаких абстракций.
Запрещённые слова: "советую", "лучше", "выберите", "рекомендую", "стоит", "надо", "гибкость", "оптимизация", "эффективность", "качество".
Каждый узел обязан отвечать хотя бы на один вопрос: что станет дольше/дороже/трудно откатить/потребует людей и процессов/где исчезает быстрый манёвр.
Структура каждого узла:
1) title — ударный заголовок, разговорный, 5–7 слов.
2) subtitle — ОДНА строка в формате:
"Пояснение: ... Следствие: ...".
В пояснении — конкретные действия и ограничения. В следствии — время/деньги/необратимость/зависимость.
Никаких нейтральных формулировок.

Нужно сгенерировать 6–7 будущих состояний как классы состояний, не прогноз.
Каждое состояние: title, subtitle (1 строка), tags только из словаря, category, evidence.
Ответ строго JSON по схеме.

Вариант: ${option.id} — ${option.label}${option.description ? ` (${option.description})` : ''}
Контекст:
${JSON.stringify(extracted, null, 2)}
`;
}

export function buildZerconRewritePromptV2(
  nodes: Array<{ id: string; type: string; title: string; summary?: string; detail?: string; description?: string; tags?: string[] }>,
  context: {
    decisionTitle: string;
    decisionDomain: string;
    currentState: string;
    constraints: string[];
    options: Array<{ id: string; label: string; description?: string }>;
    extracted: ExtractedDecision | null;
    anchorPack: {
      decisionTitle: string;
      decisionDescription: string;
      options: Array<{ id: string; label: string; description: string }>;
      constraints: string[];
      actors: string[];
      resources: string[];
      obligations: string[];
      irreversibleSignals: {
        financial: string[];
        time: string[];
        organizational: string[];
        strategic: string[];
      };
      normalizedAnchors: string[];
    };
  },
  strictMode: boolean = false
): string {
  const nodesDescription = nodes
    .map((node) => {
      const role =
        node.type === 'current'
          ? 'текущее состояние решения'
          : node.type === 'merged'
            ? 'точка схождения траекторий (фиксация)'
            : 'будущее состояние';
      return `- ID: ${node.id}, роль: ${role}, текущий title: "${node.title}", текущий detail: "${node.detail || node.description || 'отсутствует'}"`;
    })
    .join('\n');

  const extractedInfo = context.extracted
    ? `
Извлечённая структура:
- Домен: ${context.extracted.domain}
- Акторы: ${context.extracted.actors.join(', ') || 'нет'}
- Ресурсы: ${context.extracted.resources.join(', ') || 'нет'}
- Обязательства: ${context.extracted.commitments.join(', ') || 'нет'}
- Сигналы необратимости:
  * Финансовые: ${context.extracted.irreversibilitySignals.financial.join(', ') || 'нет'}
  * Временные: ${context.extracted.irreversibilitySignals.time.join(', ') || 'нет'}
  * Организационные: ${context.extracted.irreversibilitySignals.organizational.join(', ') || 'нет'}
  * Стратегические: ${context.extracted.irreversibilitySignals.strategic.join(', ') || 'нет'}
`
    : '';

  const anchorsList = context.anchorPack.normalizedAnchors.slice(0, 50).join(', '); // Ограничиваем для промпта

  // Формируем списки разрешённых и запрещённых тем
  const allowedTopics = [
    context.decisionTitle,
    context.currentState,
    ...context.constraints,
    ...context.options.map((o) => o.label),
    ...(context.extracted?.actors || []),
    ...(context.extracted?.resources || []),
    ...(context.extracted?.commitments || []),
    ...context.anchorPack.normalizedAnchors.slice(0, 30)
  ]
    .filter(Boolean)
    .join(', ');

  return `Ты — строгий перефразер (meaning-preserving rewrite) для узлов карты решений ZerCon.

КРИТИЧЕСКИ ВАЖНО — ТЫ НЕ ГЕНЕРИРУЕШЬ НОВЫЕ СМЫСЛЫ:
- Твоя задача: переписать исходный узел (originalTitle/originalDetail) в ZerCon-стиле, СОХРАНЯЯ смысл.
- ЗАПРЕЩЕНО добавлять новые сущности и факты, которых нет в decisionTitle/decisionContext/variants/extractedDecision.
- Если узел про налоги/покупку бизнеса — НЕ подменяй тему на "инфраструктуру/команду/контракты".
- Используй лексику из input пользователя; не уходи в общие слова.

${strictMode ? 'СТРОГИЙ РЕЖИМ: ' : ''}GROUNDING:
- НЕЛЬЗЯ придумывать новые домены/сущности, которых нет в anchors.
- Запрещённые примеры (если их нет в anchors): "пакеты", "сегменты", "поддержка", "рынок", "клиенты", "продажи", "маркетинг", "инфраструктура", "команда", "найм", "расходы", "контракты", "юридические шаги".
- Каждый detail ОБЯЗАН содержать минимум 2 якоря из anchors (точные слова/фразы или очевидные парафразы).
- В поле evidence укажи, какие именно anchors использованы (массив строк).
- Если якорей недостаточно для конкретного узла, верни uncertainty="high", relevance_score<0.6, detail: "Нужны данные: <какие именно>".

ПРАВИЛА ПЕРЕФРАЗИРОВАНИЯ:
1. Title: 3–6 слов, конкретное действие или фиксация. СОХРАНЯЙ смысл originalTitle. Никаких абстрактных слов ("улучшение", "развитие", "оптимизация", "эффективность").
2. Detail: 2–4 предложения (180–320 символов), структура:
   а) Что фиксируется (конкретно, используя anchors, СОХРАНЯЯ смысл originalDetail)
   б) Почему откат дорог/сложен (время/деньги/процессы, используя anchors)
   в) Что закрывается/теряется как опция (используя anchors)
3. ОБЯЗАТЕЛЬНО: Detail ДОЛЖЕН содержать:
   (a) минимум 2 якоря из anchors (точные слова/фразы или очевидные парафразы)
   (b) хотя бы ОДИН явный маркер измеримости (см. ниже)
   (c) быть конкретным и "земным": причина -> механизм -> измеримый след
   БЕЗ МАРКЕРА ИЗМЕРИМОСТИ И ЯКОРЕЙ УЗЕЛ НЕДОПУСТИМ!
4. measurable_marker: ОТДЕЛЬНОЕ поле, явный маркер измеримости:
   - Если в контексте есть явные числа/сроки/деньги/роль/процесс/контракт — используй их.
   - Если явных нет — используй ОДИН нейтральный маркер БЕЗ выдумывания фактов, строго в рамках темы узла:
     • "в горизонте 4–12 недель" (если речь про проверку/сделку/налоги/дьюдилидженс)
     • "1–2 итерации согласований" (если речь про согласования/юристов)
     • "1 ключевой владелец процесса" (если речь про ответственность)
     • "рост фиксированных обязательств" (если речь про необратимость)
   НЕЛЬЗЯ писать "контракт на 12 мес" или "+1 роль" если это не следует из контекста.
5. relevance_score: число 0..1, насколько переписанный текст релевантен исходному смыслу (originalTitle/originalDetail).
   - 0.8–1.0: отличная релевантность, смысл сохранён
   - 0.6–0.8: хорошая релевантность, есть небольшие отклонения
   - <0.6: низкая релевантность, смысл потерян или добавлены новые факты
6. uncertainty: "low" | "medium" | "high"
   - "low": уверен, что переписывание сохраняет смысл и использует только anchors
   - "medium": есть сомнения, но в целом релевантно
   - "high": не уверен, что удалось сохранить смысл или использовать anchors; возможно, нужны дополнительные данные
7. notes: опционально, примечания (если есть)
8. measureType: укажи тип маркера измеримости ("time"|"money"|"role"|"process"|"contract").
9. evidence: массив строк — какие anchors использованы в detail.
10. Summary (опционально): 1 строка, краткое резюме если title слишком общий.
11. Язык: русский, деловой, точный, "системные последствия".
12. Запрещены: абстракции, консультантский язык, общие слова без предмета, намёки без явных маркеров, выдумывание сущностей.

КОНТЕКСТ РЕШЕНИЯ:
Название: ${context.decisionTitle}
Домен: ${context.decisionDomain}
Текущее состояние: ${context.currentState}
Ограничения: ${context.constraints.join('; ') || 'нет'}
Варианты: ${context.options.map((opt) => `${opt.id}: ${opt.label}${opt.description ? ` (${opt.description})` : ''}`).join('; ')}
${extractedInfo}

РАЗРЕШЁННЫЕ ТЕМЫ (Allowed topics) — используй ТОЛЬКО эти слова/фразы:
${allowedTopics || 'Якоря не предоставлены'}

ЗАПРЕЩЁННЫЕ ТЕМЫ (Forbidden topics) — НЕ используй, если их нет в разрешённых:
инфраструктура, команда, найм, расходы, контракты, юридические шаги, пакеты, сегменты, поддержка, рынок, клиенты, продажи, маркетинг

${strictMode ? '\nСТРОГИЙ РЕЖИМ: Используй ТОЛЬКО слова из разрешённых тем выше. НЕ придумывай новые сущности.' : ''}

УЗЛЫ ДЛЯ ПЕРЕПИСЫВАНИЯ:
${nodesDescription}

Верни JSON с массивом nodes, где каждый узел содержит:
- id (обязательно)
- title (обязательно, сохраняй смысл originalTitle)
- summary (опционально)
- detail (обязательно, минимум 120 символов, сохраняй смысл originalDetail)
- measurable_marker (обязательно, отдельное поле)
- relevance_score (обязательно, 0..1)
- uncertainty (обязательно, "low"|"medium"|"high")
- notes (опционально)
- measureType (опционально)
- evidence (обязательно, массив строк)
- tags (опционально)
- signals (опционально)

Для каждого id в списке должен быть результат.`;
}
