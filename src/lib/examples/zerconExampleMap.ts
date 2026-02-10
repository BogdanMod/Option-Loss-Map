import type { MapModel, MapNode, MapEdge } from '@/lib/map/types';
import type { DecisionInput } from '@/lib/map/engine';

export type ZerconExampleData = {
  decision: {
    title: string;
    description: string;
    consequence: string;
  };
  futureStates: Array<{
    title: string;
    description: string;
    consequence: string;
    severity?: 'low' | 'medium' | 'high';
    irreversibility?: Array<'F' | 'T' | 'O' | 'S'>;
    optionId?: string;
  }>;
  mergedStates: Array<{
    title: string;
    description: string;
    consequence: string;
  }>;
  pointOfNoReturn: string;
  mainEffect: string;
};

export const zerconExampleMaps: Record<string, ZerconExampleData> = {
  hiring: {
    decision: {
      title: 'Нанять первого сотрудника',
      description: 'Ты перестаёшь быть единственным исполнителем и фиксируешь регулярные выплаты.',
      consequence: 'Назад к режиму «сам всё делаю» быстро не вернёшься — увольнение бьёт по деньгам и срокам.'
    },
    futureStates: [
      {
        title: 'Деньги уходят каждый месяц',
        description: 'Появляется фиксированная зарплата и налоги.',
        consequence: 'Минус 1–2 месяца финансовой подушки при любом откате.',
        severity: 'high',
        irreversibility: ['F', 'O'],
        optionId: 'A'
      },
      {
        title: 'Часть задач уходит из головы',
        description: 'Ты отдаёшь исполнение и теряешь прямой контроль.',
        consequence: 'Ошибки замечаются позже и дороже.',
        severity: 'medium',
        irreversibility: ['O'],
        optionId: 'A'
      },
      {
        title: 'Планирование становится обязательным',
        description: 'Без задач сотрудник простаивает.',
        consequence: 'Каждая неделя без плана — прямые деньги в пустоту.',
        severity: 'medium',
        irreversibility: ['T', 'O'],
        optionId: 'A'
      },
      {
        title: 'Процессы начинают жить отдельно',
        description: 'Появляются правила и ожидания, которые сложно откатить.',
        consequence: 'Перестройка требует времени и разговоров.',
        severity: 'medium',
        irreversibility: ['O'],
        optionId: 'A'
      },
      {
        title: 'Скорость растёт ценой правок',
        description: 'Часть решений принимается в спешке.',
        consequence: 'Позже придётся возвращаться и чинить.',
        severity: 'low',
        irreversibility: ['T'],
        optionId: 'A'
      },
      {
        title: 'Сфера ответственности фиксируется',
        description: 'То, что делал ты, теперь делает другой человек.',
        consequence: 'Вернуть обратно — больно и долго.',
        severity: 'high',
        irreversibility: ['O'],
        optionId: 'A'
      }
    ],
    mergedStates: [
      {
        title: 'Разворот становится дорогим',
        description: 'Люди, задачи и деньги уже закреплены.',
        consequence: 'Поворот требует нового бюджета и месяцев работы.'
      }
    ],
    pointOfNoReturn:
      'После 3–4 месяцев регулярных выплат и закреплённого плана задач откат почти невозможен без потерь.',
    mainEffect: 'Ты получаешь скорость сейчас ценой фиксированных расходов потом.'
  },
  product: {
    decision: {
      title: 'Запускать продукт сейчас или дорабатывать',
      description: 'Ты фиксируешь публичный интерфейс и обещания пользователям.',
      consequence: 'Откатить изменения после запуска — потеря доверия и времени.'
    },
    futureStates: [
      {
        title: 'Пользователи начинают зависеть от функций',
        description: 'Люди строят процессы вокруг того, что уже работает.',
        consequence: 'Убрать или изменить — поток жалоб и отток.',
        severity: 'high',
        irreversibility: ['S', 'O'],
        optionId: 'A'
      },
      {
        title: 'Технический долг накапливается быстрее',
        description: 'Исправления делаются поверх работающего, а не с нуля.',
        consequence: 'Через полгода переписывать будет дороже, чем запускать заново.',
        severity: 'high',
        irreversibility: ['F', 'T'],
        optionId: 'A'
      },
      {
        title: 'Обратная связь диктует приоритеты',
        description: 'Пользователи требуют доработок, а не новых направлений.',
        consequence: 'Эксперименты откладываются на месяцы.',
        severity: 'medium',
        irreversibility: ['S', 'O'],
        optionId: 'A'
      },
      {
        title: 'Масштабирование становится обязательным',
        description: 'Рост нагрузки требует инфраструктуры, которую нельзя просто выключить.',
        consequence: 'Каждый месяц — новые фиксированные расходы.',
        severity: 'high',
        irreversibility: ['F', 'O'],
        optionId: 'A'
      },
      {
        title: 'Бренд и репутация фиксируются',
        description: 'Первые впечатления определяют, как продукт воспринимают.',
        consequence: 'Изменить позиционирование — долгий и дорогой процесс.',
        severity: 'medium',
        irreversibility: ['S'],
        optionId: 'A'
      }
    ],
    mergedStates: [
      {
        title: 'Продукт становится обязательством',
        description: 'Пользователи, инфраструктура и команда завязаны на текущую версию.',
        consequence: 'Остановка или кардинальный поворот — потеря всего накопленного.'
      }
    ],
    pointOfNoReturn:
      'После 1000+ активных пользователей и 6+ месяцев публичной работы откат к закрытой бете почти невозможен.',
    mainEffect: 'Ты получаешь обратную связь и рост сейчас ценой фиксации направления и технического долга.'
  },
  career: {
    decision: {
      title: 'Уволиться или остаться на текущей работе',
      description: 'Ты закрываешь один путь и открываешь другой, теряя стабильность.',
      consequence: 'Вернуться на прежнее место после увольнения — редко возможно без потерь.'
    },
    futureStates: [
      {
        title: 'Доход становится нестабильным',
        description: 'Нет гарантированной зарплаты каждый месяц.',
        consequence: 'Первые 3–6 месяцев без подушки — стресс и долги.',
        severity: 'high',
        irreversibility: ['F'],
        optionId: 'A'
      },
      {
        title: 'Сеть контактов меняется',
        description: 'Старые связи ослабевают, новые ещё не сложились.',
        consequence: 'Вернуться в прежний круг — сложно и долго.',
        severity: 'medium',
        irreversibility: ['O'],
        optionId: 'A'
      },
      {
        title: 'Репутация в индустрии перестраивается',
        description: 'Ты начинаешь ассоциироваться с новым направлением.',
        consequence: 'Вернуться к прежней роли — объяснять паузу и смену курса.',
        severity: 'medium',
        irreversibility: ['S'],
        optionId: 'A'
      },
      {
        title: 'Навыки начинают устаревать в старом контексте',
        description: 'Ты развиваешься в новом направлении, теряя актуальность в прежнем.',
        consequence: 'Вернуться на прежний уровень — месяцы переобучения.',
        severity: 'high',
        irreversibility: ['T', 'O'],
        optionId: 'A'
      },
      {
        title: 'Образ жизни фиксируется',
        description: 'Новый график, окружение и ритм становятся привычкой.',
        consequence: 'Вернуться к старому режиму — психологически и практически сложно.',
        severity: 'low',
        irreversibility: ['O'],
        optionId: 'A'
      }
    ],
    mergedStates: [
      {
        title: 'Возврат становится дорогим',
        description: 'Время, навыки и связи уже перестроены.',
        consequence: 'Вернуться к прежнему — потерять всё накопленное в новом направлении.'
      }
    ],
    pointOfNoReturn:
      'После 6+ месяцев в новом направлении и потери актуальности в прежнем возврат почти невозможен без потерь.',
    mainEffect: 'Ты получаешь свободу и рост сейчас ценой потери стабильности и возможности быстрого возврата.'
  }
};

export function buildMapFromZerconExample(
  example: ZerconExampleData,
  input: DecisionInput
): MapModel {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];

  // Current node
  const currentNode: MapNode = {
    id: 'current',
    type: 'current',
    title: example.decision.title,
    description: example.decision.description,
    consequence: example.decision.consequence,
    tags: ['current_state']
  };
  nodes.push(currentNode);

  // Future nodes
  const futureNodes: MapNode[] = example.futureStates.map((state, index) => ({
    id: `future-${index + 1}`,
    type: 'future',
    title: state.title,
    description: state.description,
    consequence: state.consequence,
    severity: state.severity,
    irreversibility: state.irreversibility,
    optionId: state.optionId || input.options[0]?.id || 'A',
    tags: ['future_state']
  }));
  nodes.push(...futureNodes);

  // Merged nodes
  const mergedNodes: MapNode[] = example.mergedStates.map((state, index) => ({
    id: `merged-${index + 1}`,
    type: 'merged',
    title: state.title,
    description: state.description,
    consequence: state.consequence,
    tags: ['merged', 'lock_in']
  }));
  nodes.push(...mergedNodes);

  // Calculate metrics
  const totalFutureStates = futureNodes.length + mergedNodes.length;
  const selectedOptionId = input.options[0]?.id || 'A';
  const selectedFutureNodes = futureNodes.filter((node) => node.optionId === selectedOptionId);
  const optionLossPct = Math.round(
    ((totalFutureStates - selectedFutureNodes.length) / totalFutureStates) * 100
  );

  // Calculate irreversibility score from future states
  const irreversibilityScores = futureNodes
    .filter((node) => node.optionId === selectedOptionId)
    .map((node) => {
      const irrev = node.irreversibility || [];
      return irrev.length * 25; // Each metric adds 25 points
    });
  const avgIrreversibility = Math.round(
    irreversibilityScores.reduce((a, b) => a + b, 0) / Math.max(irreversibilityScores.length, 1)
  );

  // Calculate F, T, O, S from future states
  const metrics = { F: 0, T: 0, O: 0, S: 0 };
  futureNodes
    .filter((node) => node.optionId === selectedOptionId)
    .forEach((node) => {
      const irrev = node.irreversibility || [];
      irrev.forEach((key) => {
        if (key === 'F') metrics.F += 25;
        if (key === 'T') metrics.T += 25;
        if (key === 'O') metrics.O += 25;
        if (key === 'S') metrics.S += 25;
      });
    });
  // Normalize to 0-100
  Object.keys(metrics).forEach((key) => {
    metrics[key as keyof typeof metrics] = Math.min(100, metrics[key as keyof typeof metrics]);
  });

  const pnrFlag = example.pointOfNoReturn.length > 50;
  const confidence: 'low' | 'medium' | 'high' = 'medium';

  // Edges from current to future nodes
  futureNodes.forEach((futureNode) => {
    edges.push({
      id: `edge-current-${futureNode.id}`,
      source: 'current',
      target: futureNode.id,
      optionId: futureNode.optionId || selectedOptionId,
      metrics: {
        optionLossPct,
        irreversibilityScore: avgIrreversibility,
        F: metrics.F,
        T: metrics.T,
        O: metrics.O,
        S: metrics.S,
        confidence,
        pnrFlag,
        pnrText: pnrFlag ? example.pointOfNoReturn : undefined
      },
      closedFutures: futureNodes
        .filter((node) => node.optionId !== futureNode.optionId)
        .map((node) => ({
          title: node.title,
          category: 'strategy' as const,
          relatedNodeIds: [node.id],
          relatedTags: node.tags || []
        })),
      evidence: []
    });
  });

  // Edges from future nodes to merged nodes
  if (mergedNodes.length > 0) {
    const firstMerged = mergedNodes[0];
    futureNodes
      .filter((node) => node.optionId === selectedOptionId)
      .forEach((futureNode) => {
        edges.push({
          id: `edge-${futureNode.id}-${firstMerged.id}`,
          source: futureNode.id,
          target: firstMerged.id,
          optionId: futureNode.optionId || selectedOptionId,
          metrics: {
            optionLossPct,
            irreversibilityScore: avgIrreversibility,
            F: metrics.F,
            T: metrics.T,
            O: metrics.O,
            S: metrics.S,
            confidence,
            pnrFlag,
            pnrText: pnrFlag ? example.pointOfNoReturn : undefined
          },
          closedFutures: [],
          evidence: []
        });
      });
  }

  return {
    nodes,
    edges,
    summary: {
      totalFutureStates,
      bestForOptionsPreserved: selectedOptionId,
      worstLockIn: input.options[input.options.length - 1]?.id || selectedOptionId
    }
  };
}

// Legacy export for backward compatibility
export const zerconExampleMap = zerconExampleMaps.hiring;
