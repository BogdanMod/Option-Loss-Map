import type { MapModel, MapNode, MapEdge } from '@/lib/map/types';
import type { DecisionInput } from '@/lib/map/engine';

export type ZerconExampleData = {
  decision: {
    title: string;
    description: string;
    consequence: string;
    fixation?: string; // Hover-level 2: развёрнутая фиксация необратимости
  };
  futureStates: Array<{
    title: string;
    description: string;
    consequence: string;
    fixation?: string; // Hover-level 2: развёрнутая фиксация необратимости
    severity?: 'low' | 'medium' | 'high';
    irreversibility?: Array<'F' | 'T' | 'O' | 'S'>;
    optionId?: string;
  }>;
  mergedStates: Array<{
    title: string;
    description: string;
    consequence: string;
    fixation?: string; // Hover-level 2: развёрнутая фиксация необратимости
  }>;
  pointOfNoReturn: string;
  mainEffect: string;
};

export const zerconExampleMaps: Record<string, ZerconExampleData> = {
  hiring: {
    decision: {
      title: 'Нанять первого сотрудника',
      description: 'Ты перестаёшь быть единственным исполнителем и фиксируешь регулярные выплаты.',
      consequence: 'Назад к режиму «сам всё делаю» быстро не вернёшься — увольнение бьёт по деньгам и срокам.',
      fixation: 'После найма расходы и ожидания команды становятся постоянными. Даже если приоритеты меняются, решение продолжает потреблять деньги, внимание руководства и управленческую энергию. Увольнение — это не просто остановка, а потеря вложенного времени, разрыв процессов и необходимость объяснять паузу.'
    },
    futureStates: [
      {
        title: 'Деньги уходят каждый месяц',
        description: 'Появляется фиксированная зарплата и налоги.',
        consequence: 'Минус 1–2 месяца финансовой подушки при любом откате.',
        fixation: 'Зарплата и налоги становятся обязательными расходами независимо от доходов. Каждый месяц без исключений деньги уходят, даже если проект стоит на паузе или приоритеты изменились. Откат означает не только потерю вложенных средств, но и необходимость объяснять инвесторам или партнёрам, почему деньги потрачены впустую.',
        severity: 'high',
        irreversibility: ['F', 'O'],
        optionId: 'A'
      },
      {
        title: 'Часть задач уходит из головы',
        description: 'Ты отдаёшь исполнение и теряешь прямой контроль.',
        consequence: 'Ошибки замечаются позже и дороже.',
        fixation: 'То, что ты знал наизусть, теперь знает другой человек. Контекст, нюансы и быстрые решения перестают быть доступными напрямую. Ошибки обнаруживаются не сразу, а когда уже потрачено время и ресурсы. Вернуть контроль обратно — значит заново вникать в детали, которые ты уже делегировал.',
        severity: 'medium',
        irreversibility: ['O'],
        optionId: 'A'
      },
      {
        title: 'Планирование становится обязательным',
        description: 'Без задач сотрудник простаивает.',
        consequence: 'Каждая неделя без плана — прямые деньги в пустоту.',
        fixation: 'Спонтанность и быстрые эксперименты становятся дорогими. Каждое изменение требует пересмотра планов, объяснений и согласований. Неделя без чётких задач — это не просто пауза, а прямые потери: зарплата идёт, а результата нет. Гибкость превращается в роскошь, которую нельзя позволить.',
        severity: 'medium',
        irreversibility: ['T', 'O'],
        optionId: 'A'
      },
      {
        title: 'Процессы начинают жить отдельно',
        description: 'Появляются правила и ожидания, которые сложно откатить.',
        consequence: 'Перестройка требует времени и разговоров.',
        fixation: 'То, что раньше решалось одним разговором, теперь требует формальных процедур. Ожидания команды и процессы закрепляются, и любое изменение воспринимается как нарушение договорённостей. Откат процессов — это не просто возврат к старому, а необходимость объяснять, почему правила меняются, и перестраивать уже сложившиеся привычки.',
        severity: 'medium',
        irreversibility: ['O'],
        optionId: 'A'
      },
      {
        title: 'Скорость растёт ценой правок',
        description: 'Часть решений принимается в спешке.',
        consequence: 'Позже придётся возвращаться и чинить.',
        fixation: 'Быстрые решения накапливаются как технический долг в работе команды. То, что сделано в спешке, позже требует переделки, но уже с учётом того, что на это построено. Каждая правка стоит дороже, потому что затрагивает больше связанных элементов. Скорость сейчас оборачивается замедлением потом.',
        severity: 'low',
        irreversibility: ['T'],
        optionId: 'A'
      },
      {
        title: 'Сфера ответственности фиксируется',
        description: 'То, что делал ты, теперь делает другой человек.',
        consequence: 'Вернуть обратно — больно и долго.',
        fixation: 'То, что было твоей зоной ответственности, теперь закреплено за другим человеком. Вернуть это обратно — значит не просто взять задачи, а перестроить процессы, объяснить изменения команде и потерять время на передачу контекста. Каждый месяц разделения ответственности делает возврат дороже и сложнее.',
        severity: 'high',
        irreversibility: ['O'],
        optionId: 'A'
      }
    ],
    mergedStates: [
      {
        title: 'Разворот становится дорогим',
        description: 'Люди, задачи и деньги уже закреплены.',
        consequence: 'Поворот требует нового бюджета и месяцев работы.',
        fixation: 'Все траектории сходятся в одну точку: команда, процессы, бюджет и ожидания завязаны на текущее направление. Любой разворот — это не просто изменение планов, а необходимость перестраивать уже работающую систему. Новый бюджет, месяцы на перестройку, объяснения команде и инвесторам. Откат становится почти невозможным без потери всего накопленного.'
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
      consequence: 'Откатить изменения после запуска — потеря доверия и времени.',
      fixation: 'После публичного запуска продукт перестаёт быть экспериментом и становится обязательством. Пользователи строят процессы вокруг функций, команда завязана на текущую архитектуру, а инвесторы ожидают роста. Откат к закрытой бете — это не просто техническое решение, а потеря доверия, времени и накопленной аудитории.'
    },
    futureStates: [
      {
        title: 'Пользователи начинают зависеть от функций',
        description: 'Люди строят процессы вокруг того, что уже работает.',
        consequence: 'Убрать или изменить — поток жалоб и отток.',
        fixation: 'Каждая функция становится частью рабочих процессов пользователей. Убрать её — значит сломать то, на что люди уже полагаются. Изменить — значит заставить перестраивать привычные действия. Каждое изменение воспринимается как нарушение договорённости, даже если функция была в бете. Пользователи не прощают потери того, что уже работает.',
        severity: 'high',
        irreversibility: ['S', 'O'],
        optionId: 'A'
      },
      {
        title: 'Технический долг накапливается быстрее',
        description: 'Исправления делаются поверх работающего, а не с нуля.',
        consequence: 'Через полгода переписывать будет дороже, чем запускать заново.',
        fixation: 'Каждое быстрое исправление ложится слоем поверх существующего кода. Через полгода код превращается в лабиринт зависимостей, где изменение одного элемента требует правок в десятке мест. Переписать с нуля — значит остановить продукт на месяцы и потерять пользователей. Продолжать на старой основе — значит копить долг, который будет дороже с каждым месяцем.',
        severity: 'high',
        irreversibility: ['F', 'T'],
        optionId: 'A'
      },
      {
        title: 'Обратная связь диктует приоритеты',
        description: 'Пользователи требуют доработок, а не новых направлений.',
        consequence: 'Эксперименты откладываются на месяцы.',
        fixation: 'Каждый запрос пользователя становится приоритетом, который нельзя игнорировать. Новые направления и эксперименты откладываются, потому что текущие функции требуют доработок. Команда застревает в режиме поддержки вместо развития. Выход из этого цикла требует сознательного решения остановить развитие текущих функций, что воспринимается как предательство ожиданий пользователей.',
        severity: 'medium',
        irreversibility: ['S', 'O'],
        optionId: 'A'
      },
      {
        title: 'Масштабирование становится обязательным',
        description: 'Рост нагрузки требует инфраструктуры, которую нельзя просто выключить.',
        consequence: 'Каждый месяц — новые фиксированные расходы.',
        fixation: 'Каждый новый пользователь требует ресурсов серверов, баз данных и инфраструктуры. Эти расходы нельзя просто выключить — они становятся постоянными. Снижение нагрузки не означает пропорциональное снижение затрат: инфраструктура уже развёрнута и оплачена. Каждый месяц без роста — это деньги впустую, но и остановка роста означает потерю накопленного.',
        severity: 'high',
        irreversibility: ['F', 'O'],
        optionId: 'A'
      },
      {
        title: 'Бренд и репутация фиксируются',
        description: 'Первые впечатления определяют, как продукт воспринимают.',
        consequence: 'Изменить позиционирование — долгий и дорогой процесс.',
        fixation: 'Первые впечатления пользователей и медиа закрепляют восприятие продукта. Изменить позиционирование — значит не просто обновить сайт, а переубеждать уже сложившуюся аудиторию и медиа. Это требует времени, денег и риска потерять текущих пользователей, которые пришли за одним, а получат другое. Репутация становится якорем, который тянет вниз при попытке изменить курс.',
        severity: 'medium',
        irreversibility: ['S'],
        optionId: 'A'
      }
    ],
    mergedStates: [
      {
        title: 'Продукт становится обязательством',
        description: 'Пользователи, инфраструктура и команда завязаны на текущую версию.',
        consequence: 'Остановка или кардинальный поворот — потеря всего накопленного.',
        fixation: 'Все элементы сходятся: пользователи зависят от функций, инфраструктура требует постоянных расходов, команда завязана на текущую архитектуру, а инвесторы ожидают роста. Остановка или кардинальный поворот — это не просто техническое решение, а потеря всего накопленного: пользователей, репутации, времени и денег. Продукт перестаёт быть экспериментом и становится обязательством, которое нельзя просто выключить.'
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
      consequence: 'Вернуться на прежнее место после увольнения — редко возможно без потерь.',
      fixation: 'После увольнения ты теряешь не просто место работы, а стабильность дохода, привычный ритм и связи в индустрии. Вернуться на прежнее место — значит объяснять паузу, доказывать, что ты не ошибся, и восстанавливать доверие. Каждый месяц в новом направлении делает возврат дороже, потому что навыки устаревают, связи ослабевают, а репутация перестраивается.'
    },
    futureStates: [
      {
        title: 'Доход становится нестабильным',
        description: 'Нет гарантированной зарплаты каждый месяц.',
        consequence: 'Первые 3–6 месяцев без подушки — стресс и долги.',
        fixation: 'Каждый месяц без гарантированного дохода — это не просто отсутствие денег, а постоянный стресс и необходимость искать новые источники. Финансовая подушка тает быстрее, чем ожидалось, потому что расходы не останавливаются. Вернуться к стабильному доходу — значит либо найти новую работу (что требует времени), либо вернуться на прежнее место (что редко возможно без потерь в статусе и условиях).',
        severity: 'high',
        irreversibility: ['F'],
        optionId: 'A'
      },
      {
        title: 'Сеть контактов меняется',
        description: 'Старые связи ослабевают, новые ещё не сложились.',
        consequence: 'Вернуться в прежний круг — сложно и долго.',
        fixation: 'Связи в индустрии требуют постоянного поддержания. Месяцы в новом направлении означают, что старые контакты перестают быть актуальными, а новые ещё не сложились. Вернуться в прежний круг — значит не просто позвонить знакомым, а заново доказывать свою ценность и восстанавливать доверие. Каждый месяц разделения делает возврат дороже.',
        severity: 'medium',
        irreversibility: ['O'],
        optionId: 'A'
      },
      {
        title: 'Репутация в индустрии перестраивается',
        description: 'Ты начинаешь ассоциироваться с новым направлением.',
        consequence: 'Вернуться к прежней роли — объяснять паузу и смену курса.',
        fixation: 'Люди в индустрии начинают воспринимать тебя через призму нового направления. Вернуться к прежней роли — значит объяснять, почему ты ушёл и почему вернулся. Это не просто техническое решение, а необходимость переубеждать людей, которые уже перестроили своё восприятие. Репутация становится якорем, который тянет в новом направлении.',
        severity: 'medium',
        irreversibility: ['S'],
        optionId: 'A'
      },
      {
        title: 'Навыки начинают устаревать в старом контексте',
        description: 'Ты развиваешься в новом направлении, теряя актуальность в прежнем.',
        consequence: 'Вернуться на прежний уровень — месяцы переобучения.',
        fixation: 'Каждый месяц в новом направлении — это развитие новых навыков и потеря актуальности в старом. Вернуться на прежний уровень — значит не просто вспомнить старое, а заново изучить то, что изменилось за время отсутствия. Это требует месяцев переобучения, во время которых ты не можешь работать на прежнем уровне. Время работает против возврата.',
        severity: 'high',
        irreversibility: ['T', 'O'],
        optionId: 'A'
      },
      {
        title: 'Образ жизни фиксируется',
        description: 'Новый график, окружение и ритм становятся привычкой.',
        consequence: 'Вернуться к старому режиму — психологически и практически сложно.',
        fixation: 'Новый график, окружение и ритм становятся привычкой, которая формирует образ жизни. Вернуться к старому режиму — значит не просто изменить расписание, а перестроить уже сложившиеся привычки и отношения. Это психологически сложно, потому что требует отказа от того, к чему уже привык, и практически сложно, потому что окружение и связи уже перестроены.',
        severity: 'low',
        irreversibility: ['O'],
        optionId: 'A'
      }
    ],
    mergedStates: [
      {
        title: 'Возврат становится дорогим',
        description: 'Время, навыки и связи уже перестроены.',
        consequence: 'Вернуться к прежнему — потерять всё накопленное в новом направлении.',
        fixation: 'Все элементы сходятся: навыки развиваются в новом направлении, связи перестраиваются, репутация меняется, а образ жизни фиксируется. Вернуться к прежнему — значит не просто изменить направление, а потерять всё накопленное в новом: время, навыки, связи и репутацию. Каждый месяц делает возврат дороже, потому что инвестиции в новое направление растут, а актуальность в старом падает.'
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
    fixation: example.decision.fixation,
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
    fixation: state.fixation,
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
    fixation: state.fixation,
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
