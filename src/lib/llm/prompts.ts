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

  return `Ты переписываешь тексты узлов карты решений в строгом формате ZerCon.

${strictMode ? 'СТРОГИЙ РЕЖИМ: ' : ''}КРИТИЧЕСКИ ВАЖНО — GROUNDING:
- НЕЛЬЗЯ придумывать новые домены/сущности, которых нет в anchors.
- Запрещённые примеры (если их нет в anchors): "пакеты", "сегменты", "поддержка", "рынок", "клиенты", "продажи", "маркетинг".
- Каждый detail ОБЯЗАН содержать минимум 2 якоря из anchors (точные слова/фразы или очевидные парафразы).
- В поле evidence укажи, какие именно anchors использованы (массив строк).
- Если якорей недостаточно для конкретного узла, верни detail: "Нужны данные: <какие именно>".

ПРАВИЛА:
1. Title: 3–6 слов, конкретное действие или фиксация. Никаких абстрактных слов ("улучшение", "развитие", "оптимизация", "эффективность").
2. Detail: 2–4 предложения (180–320 символов), структура:
   а) Что фиксируется (конкретно, используя anchors)
   б) Почему откат дорог/сложен (время/деньги/процессы, используя anchors)
   в) Что закрывается/теряется как опция (используя anchors)
3. ОБЯЗАТЕЛЬНО: Detail ДОЛЖЕН содержать:
   (a) минимум 2 якоря из anchors (точные слова/фразы или очевидные парафразы)
   (b) хотя бы ОДИН явный маркер измеримости:
       • ВРЕМЯ: "через 2–4 недели", "в течение 3 месяцев", "через полгода", "откат займёт месяцы"
       • ДЕНЬГИ: "постоянные ежемесячные расходы", "фиксированные обязательства", "дорого отменять"
       • РОЛИ/ЛЮДИ: "+1 постоянная роль", "требует вовлечения руководителя", "зависимость от конкретных людей"
       • ПРОЦЕССЫ: "появляются согласования", "изменения проходят через процесс", "решения перестают быть мгновенными"
       • КОНТРАКТЫ: "долгосрочные обязательства", "неформальный, но устойчивый контракт ожиданий"
   (c) быть конкретным и "земным": причина -> механизм -> измеримый след
   БЕЗ МАРКЕРА ИЗМЕРИМОСТИ И ЯКОРЕЙ УЗЕЛ НЕДОПУСТИМ!
4. measureType: укажи тип маркера измеримости ("time"|"money"|"role"|"process"|"contract").
5. evidence: массив строк — какие anchors использованы в detail.
6. Summary (опционально): 1 строка, краткое резюме если title слишком общий.
7. Язык: русский, деловой, точный, "системные последствия".
8. Запрещены: абстракции, консультантский язык, общие слова без предмета, намёки без явных маркеров, выдумывание сущностей.

КОНТЕКСТ РЕШЕНИЯ:
Название: ${context.decisionTitle}
Домен: ${context.decisionDomain}
Текущее состояние: ${context.currentState}
Ограничения: ${context.constraints.join('; ') || 'нет'}
Варианты: ${context.options.map((opt) => `${opt.id}: ${opt.label}${opt.description ? ` (${opt.description})` : ''}`).join('; ')}
${extractedInfo}

ЯКОРЯ (ANCHORS) — используй ТОЛЬКО эти слова/фразы:
${anchorsList || 'Якоря не предоставлены'}
${strictMode ? '\nСТРОГИЙ РЕЖИМ: Используй ТОЛЬКО слова из anchors выше. НЕ придумывай новые сущности.' : ''}

УЗЛЫ ДЛЯ ПЕРЕПИСЫВАНИЯ:
${nodesDescription}

Верни JSON с массивом nodes, где каждый узел содержит: id, title, summary (опционально), detail (обязательно, минимум 120 символов), tags (опционально), signals (опционально).
Для каждого id в списке должен быть результат.`;
}
