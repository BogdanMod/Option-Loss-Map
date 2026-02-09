'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapFlow, type MapFlowHandle } from '@/components/MapFlow';
import MapLegend, { type LegendFocus } from '@/components/MapLegend';
import { useSearchParams } from 'next/navigation';
import { t } from '@/lib/i18n';
import { MapModelSchema } from '@/lib/map/schema';
import type { DecisionInput } from '@/lib/map/engine';
import { exampleDecisionInputs, getExampleDecisionInput } from '@/lib/examples/exampleDecision';
import type { MapEdge, MapModel, MapNode } from '@/lib/map/types';
import type { DecisionRecord } from '@/lib/history/types';
import { summarizeMap } from '@/lib/history/summarize';
import { addRecord, loadHistory, updateRecord } from '@/lib/history/storage';
import { usePlan } from '@/lib/billing/usePlan';
import { encodeSharePayload } from '@/lib/share/encode';
import type { MapSharePayload } from '@/lib/share/mapPayload';
import { getAnonUserId } from '@/lib/analytics/anon';
import { trackEvent } from '@/lib/analytics/track';

const getConfidenceColor = (level: MapEdge['metrics']['confidence']) => {
  switch (level) {
    case 'high':
      return 'text-mint-500';
    case 'medium':
      return 'text-amber-500';
    default:
      return 'text-rose-500';
  }
};

const localizeConfidence = (level: MapEdge['metrics']['confidence']) => {
  switch (level) {
    case 'high':
      return t('confidenceHigh');
    case 'medium':
      return t('confidenceMedium');
    default:
      return t('confidenceLow');
  }
};

const metricOrder = ['F', 'T', 'O', 'S'] as const;

const stableStringify = (value: unknown) => {
  const seen = new WeakSet<object>();
  const stringify = (val: unknown): string => {
    if (val && typeof val === 'object') {
      if (seen.has(val as object)) return '"[circular]"';
      seen.add(val as object);
      if (Array.isArray(val)) {
        return `[${val.map((item) => stringify(item)).join(',')}]`;
      }
      const entries = Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
      return `{${entries.map(([key, v]) => `"${key}":${stringify(v)}`).join(',')}}`;
    }
    return JSON.stringify(val);
  };
  return stringify(value);
};

const buildMainEffect = (metrics: MapEdge['metrics'] | undefined, mergedLabel?: string) => {
  if (!metrics) return '';
  const pairs = metricOrder
    .map((key) => ({ key, value: metrics[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((item) => item.key)
    .sort()
    .join('');

  let base = 'Фиксация ключевых ограничений';
  if (pairs === 'OT') base = 'Ускорение за счёт организационной фиксации и снижения гибкости';
  if (pairs === 'FS') base = 'Фиксация стратегии через капитальные и архитектурные обязательства';
  if (pairs === 'ST') base = 'Быстрый прогресс ценой закрытия альтернативных направлений';
  if (pairs === 'OS') base = 'Закрепление структуры и стратегии ограничивающее манёвр';
  if (pairs === 'FT') base = 'Ускорение при росте затрат и временных обязательств';
  if (pairs === 'FO') base = 'Закрепление процессов через финансовые и организационные обязательства';

  if (mergedLabel && mergedLabel.length <= 26) {
    return `${base} Сходятся траектории в ${mergedLabel}`;
  }
  return base;
};


type ReasonItem = { id: string; text: string; tags: string[]; score: number; isKey?: boolean };

const buildReasons = (tags: string[], extracted: unknown): ReasonItem[] => {
  const reasons: ReasonItem[] = [];
  const hasExtracted =
    extracted &&
    typeof extracted === 'object' &&
    'irreversibilitySignals' in (extracted as Record<string, unknown>);
  const signals = hasExtracted
    ? (extracted as { irreversibilitySignals: Record<string, string[]> }).irreversibilitySignals
    : null;

  const computeScore = (tagList: string[]) => {
    if (!tagList.length) return 0;
    let score = 0;
    tagList.forEach((tag) => {
      if (tag === 'strategic_closure' || tag === 'vendor_lockin') score += 3;
      else if (tag === 'hiring_lock' || tag === 'org_inertia') score += 2;
      else if (tag === 'long_timeline' || tag === 'slow_revert') score += 2;
      else if (tag === 'fixed_cost' || tag === 'sunk_cost') score += 2;
      else score += 1;
    });
    return score;
  };

  const pushReason = (id: string, text: string, tagList: string[]) => {
    if (reasons.some((item) => item.id === id)) return;
    reasons.push({ id, text, tags: tagList, score: computeScore(tagList) });
  };

  if (tags.includes('hiring_lock') || tags.includes('org_inertia') || signals?.organizational?.length) {
    pushReason(
      'org',
      'Есть признаки найма или закрепления ролей поэтому растёт организационная необратимость',
      ['hiring_lock', 'org_inertia']
  );
}
  if (tags.includes('long_timeline') || tags.includes('slow_revert') || signals?.time?.length) {
    pushReason('time', 'Длинный цикл изменений поэтому растёт временная необратимость', [
      'long_timeline',
      'slow_revert'
    ]);
  }
  if (tags.includes('fixed_cost') || tags.includes('sunk_cost') || signals?.financial?.length) {
    pushReason(
      'finance',
      'Инфраструктурные или капитальные обязательства повышают финансовую необратимость',
      ['fixed_cost', 'sunk_cost']
    );
  }
  if (tags.includes('strategic_closure') || tags.includes('vendor_lockin') || signals?.strategic?.length) {
    pushReason(
      'strategy',
      'Закрываются альтернативные направления поэтому растёт стратегическая необратимость',
      ['strategic_closure', 'vendor_lockin']
    );
  }
  if (tags.includes('scope_growth')) {
    pushReason('scope', 'Рост скоупа увеличивает сложность отката', ['scope_growth']);
  }

  const sorted = [...reasons].sort((a, b) => b.score - a.score);
  const topIds = new Set(sorted.slice(0, 2).map((item) => item.id));
  return reasons
    .map((item) => ({ ...item, isKey: topIds.has(item.id) }))
    .slice(0, 5);
};

const emptyInput: DecisionInput = {
  domain: 'data',
  title: '',
  currentStateText: '',
  options: [
    { id: 'A', label: '', description: '' },
    { id: 'B', label: '', description: '' },
    { id: 'C', label: '', description: '' }
  ],
  constraints: ['']
};

function MapPageInner() {
  const { features, plan } = usePlan();
  const [input, setInput] = useState<DecisionInput>(emptyInput);
  const [mapModel, setMapModel] = useState<MapModel | null>(null);
  const [mapVersion, setMapVersion] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [llmExtracted, setLlmExtracted] = useState<unknown>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [focusEnabled, setFocusEnabled] = useState(true);
  const mapFlowRef = useRef<MapFlowHandle | null>(null);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [historyItems, setHistoryItems] = useState<DecisionRecord[]>([]);
  const [screenState, setScreenState] = useState<'empty' | 'input' | 'analysis'>('empty');
  const [isDemoView, setIsDemoView] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<'mine' | 'example'>('mine');
  const [exampleIndex, setExampleIndex] = useState(0);
  const prevInputRef = useRef<DecisionInput | null>(null);
  const prevScreenStateRef = useRef<'empty' | 'input' | 'analysis'>('empty');
  const [highlightMode, setHighlightMode] = useState<'none' | 'closedFuture' | 'reason' | 'metric'>('none');
  const [highlightQuery, setHighlightQuery] = useState<{
    type: 'closedFuture' | 'reason' | 'metric';
    title?: string;
    category?: string;
    tags?: string[];
    nodeIds?: string[];
    key?: 'F' | 'T' | 'O' | 'S';
  } | null>(null);
  const [highlightIds, setHighlightIds] = useState<{ nodeIds: string[]; edgeIds: string[] }>({
    nodeIds: [],
    edgeIds: []
  });
  const [pinnedHighlight, setPinnedHighlight] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<MapNode | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const focusDebounceRef = useRef<number | null>(null);
  const isHistoryLimitReached = historyItems.length >= features.historyLimit;
  const searchParams = useSearchParams();
  const [legendFocus, setLegendFocus] = useState<LegendFocus | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [hintState, setHintState] = useState({ hover: false, click: false, panel: false });
  const [hintsReady, setHintsReady] = useState(false);
  const lastAnalysisRef = useRef<number | null>(null);

  const selectedOption = useMemo(
    () =>
      mapModel?.edges.find((edge) => edge.optionId === selectedOptionId && edge.source === 'current') ?? null,
    [mapModel, selectedOptionId]
  );
  const selectedOptionLabel = useMemo(
    () => input.options.find((option) => option.id === selectedOptionId)?.label ?? selectedOptionId,
    [input.options, selectedOptionId]
  );

  const metrics = selectedOption?.metrics;
  const totalFutureStates =
    mapModel?.summary.totalFutureStates ??
    new Set(
      (mapModel?.nodes ?? [])
        .filter((node) => node.type === 'future' || node.type === 'merged')
        .map((node) => node.id)
    ).size;
  const optionTags = useMemo(
    () =>
      mapModel?.nodes
        ?.filter((node) => node.type === 'future' && node.optionId === selectedOptionId)
        .flatMap((node) => node.tags ?? []) ?? [],
    [mapModel, selectedOptionId]
  );

  const dominantMerged = useMemo(() => {
    if (!mapModel) return null;
    const mergedIds = new Set(mapModel.nodes.filter((node) => node.type === 'merged').map((node) => node.id));
    const counts = new Map<string, number>();
    mapModel.edges
      .filter((edge) => edge.optionId === selectedOptionId && mergedIds.has(edge.target))
      .forEach((edge) => {
        counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
      });
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const chosenId = sorted[0]?.[0] ?? mapModel.nodes.filter((node) => node.type === 'merged').slice(-1)[0]?.id;
    return mapModel.nodes.find((node) => node.id === chosenId) ?? null;
  }, [mapModel, selectedOptionId]);

  const mainEffect = buildMainEffect(metrics, dominantMerged?.label);
  const reasons = buildReasons(optionTags, llmExtracted);
  const closedFuturesFlat = useMemo(() => {
    const all = selectedOption?.closedFutures ?? [];
    const priority = { strategy: 0, org: 1, budget: 2 };
    return [...all].sort((a, b) => {
      const aScore = a.category ? priority[a.category] : 3;
      const bScore = b.category ? priority[b.category] : 3;
      return aScore - bScore;
    });
  }, [selectedOption]);
  const closedTop = closedFuturesFlat.slice(0, 5);
  const closedRest = closedFuturesFlat.slice(5);
  const hasMap = Boolean(mapModel);
  const filledOptionsCount = input.options.filter((option) => option.label.trim()).length;
  const canBuild = Boolean(input.title.trim()) && filledOptionsCount >= 2;
  const hasTitle = Boolean(input.title.trim());
  const optionStaggerBase = 160;
  const optionStaggerStep = 60;
  const buildButtonDelay = optionStaggerBase + (input.options.length - 1) * optionStaggerStep + 80;

  const allNodes = useMemo(() => mapModel?.nodes ?? [], [mapModel]);
  const allEdges = useMemo(() => mapModel?.edges ?? [], [mapModel]);
  const selectedPathIds = useMemo(() => {
    if (!mapModel || !selectedOptionId) return { nodeIds: [], edgeIds: [] };
    const edges = mapModel.edges.filter((edge) => edge.optionId === selectedOptionId);
    const nodeIds = new Set<string>();
    edges.forEach((edge) => {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    });
    return { nodeIds: Array.from(nodeIds), edgeIds: edges.map((edge) => edge.id) };
  }, [mapModel, selectedOptionId]);

  const handleOptionChange = (index: number, field: 'label' | 'description', value: string) => {
    setInput((prev) => {
      const next = [...prev.options];
      const target = next[index];
      if (!target) return prev;
      next[index] = { ...target, [field]: value };
      return { ...prev, options: next };
    });
  };

  const handleOptionIdChange = (index: number, value: string) => {
    setInput((prev) => {
      const next = [...prev.options];
      const target = next[index];
      if (!target) return prev;
      next[index] = { ...target, id: value.toUpperCase().slice(0, 1) };
      return { ...prev, options: next };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBuilding) return;
    setIsBuilding(true);
    try {
      const cleanedOptions = input.options
        .map((option) => ({
          ...option,
          id: option.id.trim() || String.fromCharCode(65 + input.options.indexOf(option)),
          label: option.label.trim(),
          description: option.description?.trim() ?? ''
        }))
        .filter((option) => option.id && option.label);

      if (cleanedOptions.length < 2) {
        setError({ title: t('errorBuildTitle'), message: t('errorMinOptions') });
        setIsBuilding(false);
        return;
      }

      const cleanedConstraints = input.constraints.map((item) => item.trim()).filter(Boolean);
      const cleanedInput: DecisionInput = {
        ...input,
        options: cleanedOptions,
        constraints: cleanedConstraints
      };

      const response = await fetch('/api/build-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedInput)
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data?.message || t('errorBuildMessage'));
      }

      const data = (await response.json()) as { map: MapModel; extracted?: unknown; llmUsed?: boolean };
      MapModelSchema.parse(data.map);
      setMapModel(data.map);
      setMapVersion((prev) => prev + 1);
      setFocusedNode(null);
      setSelectedOptionId(data.map.summary.bestForOptionsPreserved || cleanedInput.options[0]?.id || 'A');
      setError(null);
      setInput(cleanedInput);
      setLlmExtracted(data.extracted ?? null);
      setIsDemoView(false);
      setEditorMode('mine');
      setPinnedHighlight(null);
      clearHighlight(true);
      setShowAllClosed(false);
      setScreenState('analysis');
      trackEvent('map_built', { page: '/map', plan, source: 'user' });
      if (data.llmUsed === false) {
        setError({ title: t('llmFallbackTitle'), message: t('llmFallbackNotice') });
      }
      requestAnimationFrame(() => {
        mapFlowRef.current?.fit();
        graphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      console.error(err);
      if ((err as { issues?: unknown[] })?.issues) {
        setError({ title: t('errorValidationTitle'), message: t('errorValidationMessage') });
      } else {
        setError({ title: t('errorBuildTitle'), message: t('errorBuildMessage') });
      }
    } finally {
      setIsBuilding(false);
    }
  };

  const handleViewExample = async () => {
    setIsBuilding(true);
    try {
      prevScreenStateRef.current = screenState;
      if (!isDemoView) {
        prevInputRef.current = input;
      }
      const exampleInput = getExampleDecisionInput(exampleIndex);
      const response = await fetch('/api/build-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exampleInput)
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data?.message || t('errorBuildMessage'));
      }

      const data = (await response.json()) as { map: MapModel; extracted?: unknown };
      MapModelSchema.parse(data.map);
      const demoEdges = data.map.edges.filter(
        (edge) =>
          edge.optionId === (data.map.summary.bestForOptionsPreserved || exampleInput.options[0]?.id || 'A')
      );
      const demoNodeIds = new Set<string>();
      demoEdges.forEach((edge) => {
        demoNodeIds.add(edge.source);
        demoNodeIds.add(edge.target);
      });
      setMapModel(data.map);
      setMapVersion((prev) => prev + 1);
      setFocusedNode(null);
      setSelectedOptionId(data.map.summary.bestForOptionsPreserved || exampleInput.options[0]?.id || 'A');
      setError(null);
      setInput(exampleInput);
      setLlmExtracted(data.extracted ?? null);
      setIsDemoView(true);
      setEditorMode('example');
      setHighlightMode('reason');
      setHighlightIds({ nodeIds: Array.from(demoNodeIds), edgeIds: demoEdges.map((edge) => edge.id) });
      setScreenState('analysis');
      trackEvent('demo_viewed', { page: '/map', plan, source: 'demo' });
      requestAnimationFrame(() => {
        mapFlowRef.current?.fit();
        graphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      console.error(err);
      setError({ title: t('errorBuildTitle'), message: t('errorBuildMessage') });
    } finally {
      setIsBuilding(false);
    }
  };

  const handleExitDemo = () => {
    setIsDemoView(false);
    setEditorMode('mine');
    setFocusedNode(null);
    setScreenState(prevScreenStateRef.current || 'empty');
    if (prevInputRef.current) {
      setInput(prevInputRef.current);
    } else {
      setInput(emptyInput);
    }
    setMapModel(null);
    setSelectedOptionId('');
  };

  const handleSaveHistory = () => {
    if (!mapModel) return;
    if (isHistoryLimitReached) return;
    const inputKey = stableStringify(input);
    const existing = historyItems.find((item) => stableStringify(item.input) === inputKey);
    const summary = summarizeMap(mapModel);
    const anonUserId = getAnonUserId();
    const now = Date.now();
    if (existing) {
      const shouldUpdate = window.confirm(t('historyUpdateConfirm'));
      if (!shouldUpdate) return;
      const updatedRecord: DecisionRecord = {
        ...existing,
        anonUserId: existing.anonUserId ?? anonUserId ?? undefined,
        createdAt: now,
        title: input.title,
        domain: input.domain,
        input,
        map: mapModel,
        summary
      };
      const updated = updateRecord(existing.id, updatedRecord);
      setHistoryItems(updated);
      trackEvent('map_saved', { page: '/map', plan, source: isDemoView ? 'demo' : 'user' });
      return;
    }

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${now}-${Math.random()}`;
    const record: DecisionRecord = {
      id,
      anonUserId: anonUserId ?? undefined,
      createdAt: now,
      title: input.title,
      domain: input.domain,
      input,
      map: mapModel,
      summary
    };
    const next = addRecord(record);
    setHistoryItems(next);
    trackEvent('map_saved', { page: '/map', plan, source: isDemoView ? 'demo' : 'user' });
  };

  const clearHighlight = useCallback((force = false) => {
    if (pinnedHighlight && !force) return;
    setHighlightMode('none');
    setHighlightQuery(null);
    setHighlightIds({ nodeIds: [], edgeIds: [] });
  }, [pinnedHighlight]);

  const computeHighlightIds = useCallback((tags?: string[], nodeIds?: string[], includeOptionEdges = true) => {
    const tagSet = new Set(tags ?? []);
    const nodesFromTags = allNodes
      .filter((node) => node.tags?.some((tag) => tagSet.has(tag)))
      .map((node) => node.id);
    const nodeIdSet = new Set([...(nodeIds ?? []), ...nodesFromTags]);
    const optionEdgeIds = includeOptionEdges && selectedOptionId
      ? allEdges.filter((edge) => edge.optionId === selectedOptionId).map((edge) => edge.id)
      : [];
    const relatedEdgeIds = allEdges
      .filter((edge) => nodeIdSet.has(edge.source) || nodeIdSet.has(edge.target))
      .map((edge) => edge.id);
    const edgeIds = Array.from(new Set([...optionEdgeIds, ...relatedEdgeIds]));
    return { nodeIds: Array.from(nodeIdSet), edgeIds };
  }, [allEdges, allNodes, selectedOptionId]);

  const computeHighlightIdsWithPath = useCallback((tags?: string[], nodeIds?: string[]) => {
    const base = computeHighlightIds(tags, nodeIds, false);
    const nodeSet = new Set(base.nodeIds);
    const additionalEdgeIds: string[] = [];
    const additionalNodes: string[] = [];

    allEdges.forEach((edge) => {
      if (edge.source === 'current' && nodeSet.has(edge.target)) {
        additionalEdgeIds.push(edge.id);
      }
      if (nodeSet.has(edge.source)) {
        const targetNode = allNodes.find((node) => node.id === edge.target);
        if (targetNode?.type === 'merged') {
          additionalEdgeIds.push(edge.id);
          additionalNodes.push(edge.target);
        }
      }
    });

    const nextNodeIds = Array.from(new Set([...base.nodeIds, ...additionalNodes]));
    const nextEdgeIds = Array.from(new Set([...base.edgeIds, ...additionalEdgeIds]));
    return { nodeIds: nextNodeIds, edgeIds: nextEdgeIds };
  }, [allEdges, allNodes, computeHighlightIds]);

  const applyHighlight = (
    mode: 'closedFuture' | 'reason' | 'metric',
    query: { type: 'closedFuture' | 'reason' | 'metric'; title?: string; category?: string; tags?: string[]; nodeIds?: string[]; key?: 'F' | 'T' | 'O' | 'S' },
    ids: { nodeIds: string[]; edgeIds: string[] }
  ) => {
    setHighlightMode(mode);
    setHighlightQuery(query);
    setHighlightIds(ids);
  };

  const setHighlightFromClosedFuture = (
    item: MapEdge['closedFutures'][number],
    itemId?: string,
    force = false
  ) => {
    if (pinnedHighlight && !force && pinnedHighlight !== itemId) return null;
    const queryTags = item.relatedTags ?? [];
    const queryNodeIds = item.relatedNodeIds ?? [];
    const ids = computeHighlightIdsWithPath(queryTags, queryNodeIds);
    applyHighlight('closedFuture', {
      type: 'closedFuture',
      title: item.title,
      category: item.category,
      tags: queryTags,
      nodeIds: queryNodeIds
    }, ids);
    return ids;
  };

  const setHighlightFromReason = (tags: string[], itemId?: string, force = false) => {
    if (pinnedHighlight && !force && pinnedHighlight !== itemId) return null;
    const ids = computeHighlightIds(tags);
    applyHighlight('reason', { type: 'reason', tags }, ids);
    return ids;
  };

  const scheduleHighlightFocus = (nodeIds: string[]) => {
    if (!nodeIds.length) return;
    if (focusDebounceRef.current) {
      window.clearTimeout(focusDebounceRef.current);
    }
    focusDebounceRef.current = window.setTimeout(() => {
      if (nodeIds.length >= 2) {
        mapFlowRef.current?.fitToNodes(nodeIds);
      } else {
        mapFlowRef.current?.centerOnNode(nodeIds[0]);
      }
    }, 200);
  };

  const togglePinned = (id: string, apply: () => { nodeIds: string[]; edgeIds: string[] } | null) => {
    if (pinnedHighlight === id) {
      setPinnedHighlight(null);
      clearHighlight(true);
      return;
    }
    setPinnedHighlight(id);
    const ids = apply();
    if (ids) {
      scheduleHighlightFocus(ids.nodeIds);
    }
  };

  useEffect(() => {
    if (!highlightQuery) return;
    const ids = computeHighlightIds(highlightQuery.tags, highlightQuery.nodeIds);
    setHighlightIds(ids);
  }, [computeHighlightIds, highlightQuery]);

  useEffect(() => {
    setHistoryItems(loadHistory());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('zercon_map_hints');
      if (stored) {
        const parsed = JSON.parse(stored) as { hover?: boolean; click?: boolean; panel?: boolean };
        setHintState({
          hover: Boolean(parsed.hover),
          click: Boolean(parsed.click),
          panel: Boolean(parsed.panel)
        });
      }
    } catch {
      // ignore
    }
    setHintsReady(true);
  }, []);

  useEffect(() => {
    const recordId = searchParams?.get('open');
    if (!recordId) return;
    const items = loadHistory();
    const record = items.find((item) => item.id === recordId);
    if (!record) return;
    setHistoryItems(items);
    setInput(record.input);
    setMapModel(record.map);
    setMapVersion((prev) => prev + 1);
    setSelectedOptionId(record.map.summary.bestForOptionsPreserved || record.input.options[0]?.id || 'A');
    setError(null);
    setLlmExtracted(null);
    setPinnedHighlight(null);
    clearHighlight(true);
    setShowAllClosed(false);
    setScreenState('analysis');
    requestAnimationFrame(() => {
      mapFlowRef.current?.fit();
    });
  }, [clearHighlight, searchParams]);

  useEffect(() => {
    if (!mapModel || screenState !== 'analysis') return;
    if (lastAnalysisRef.current === mapVersion) return;
    lastAnalysisRef.current = mapVersion;
    trackEvent('analysis_viewed', { page: '/map', plan, source: isDemoView ? 'demo' : 'user' });
  }, [isDemoView, mapModel, mapVersion, plan, screenState]);

  const persistHintState = useCallback((next: { hover: boolean; click: boolean; panel: boolean }) => {
    setHintState(next);
    try {
      window.localStorage.setItem('zercon_map_hints', JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const markHintSeen = useCallback(
    (key: 'hover' | 'click' | 'panel') => {
      if (!hintsReady) return;
      if (hintState[key]) return;
      persistHintState({ ...hintState, [key]: true });
    },
    [hintState, hintsReady, persistHintState]
  );

  const buildSharePayload = useCallback((): MapSharePayload | null => {
    if (!mapModel) return null;
    return {
      title: input.title,
      context: input.currentStateText,
      selectedOptionId,
      selectedOptionLabel,
      summary: {
        optionLossPct: metrics?.optionLossPct ?? 0,
        pnrFlag: metrics?.pnrFlag ?? false,
        pnrText: metrics?.pnrText,
        mainEffect: mainEffect || '',
        totalFutureStates
      },
      map: mapModel,
      highlightIds: selectedPathIds,
      generatedAt: Date.now()
    };
  }, [input.currentStateText, input.title, mainEffect, mapModel, metrics, selectedOptionId, selectedOptionLabel, selectedPathIds, totalFutureStates]);

  const handleExport = () => {
    if (!mapModel || exportStatus === 'loading') return;
    const payload = buildSharePayload();
    if (!payload) return;
    setExportStatus('loading');
    const token = encodeSharePayload(payload);
    const url = `${window.location.origin}/export/${token}?print=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
    trackEvent('export_pdf', { page: '/map', plan, source: isDemoView ? 'demo' : 'user' });
    window.setTimeout(() => setExportStatus('done'), 800);
    window.setTimeout(() => setExportStatus('idle'), 2600);
  };

  const handleShare = () => {
    if (!mapModel) return;
    const payload = buildSharePayload();
    if (!payload) return;
    const token = encodeSharePayload(payload);
    const url = `${window.location.origin}/share/map/${token}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    navigator.clipboard?.writeText(url).catch(() => undefined);
    setShareNotice(t('shareMapCopied'));
    trackEvent('share_link_created', { page: '/map', plan, source: isDemoView ? 'demo' : 'user' });
    window.setTimeout(() => setShareNotice(null), 2200);
  };

  return (
    <main className="min-h-screen bg-transparent">
      <div className={`w-full px-6 py-12 ${screenState === 'input' ? 'mx-auto max-w-[820px]' : 'max-w-none'}`}>
        {screenState === 'empty' ? (
          <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center ui-crossfade">
            <div className="ui-section w-full max-w-[560px] px-8 py-10 text-center backdrop-blur">
              <div className="text-[12px] uppercase tracking-[0.3em] text-white/50">ZER · CON</div>
              <h1 className="mt-4 text-[24px] font-semibold text-white">{t('mapEmptyTitle')}</h1>
              <p className="mt-3 text-[15px] text-white/60">{t('mapEmptySubtitle')}</p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button type="button" className="ui-button-primary" onClick={handleViewExample}>
                  {t('mapEmptyExample')}
                </button>
                <button type="button" className="ui-button-secondary" onClick={() => setScreenState('input')}>
                  {t('mapEmptyStart')}
                </button>
              </div>
            </div>
          </section>
        ) : screenState === 'input' ? (
          <section className="ui-section px-8 py-10 backdrop-blur ui-crossfade">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-[26px] font-semibold text-white">{t('inputHeroTitle')}</h1>
                <button
                  type="button"
                  onClick={() => {
                    if (editorMode === 'example') {
                      handleExitDemo();
                      return;
                    }
                    handleViewExample();
                  }}
                  className="text-[13px] text-white/40 ui-transition hover:text-white/70"
                >
                  {editorMode === 'example' ? t('myDecisionMode') : t('viewExample')}
                </button>
              </div>
              <p className="text-[15px] text-white/60">{t('inputHeroSubtitle')}</p>
              <div className="text-[13px] text-white/40">{t('viewExampleHint')}</div>
            </div>

            <div className="relative mt-10">
              <div className={`ui-crossfade ${editorMode === 'mine' ? '' : 'ui-crossfade-hidden'}`}>
                <form className="grid gap-6" onSubmit={handleSubmit}>
                  <div className="space-y-5">
                    <div className="text-[11px] uppercase tracking-wide text-white/40">{t('inputGroupDecision')}</div>
                    <label className="grid gap-2">
                      <span className="text-[13px] text-white/60">{t('formTitleLabel')}</span>
                      <input
                        className="h-12 rounded-[12px] border border-white/0 bg-white/0 px-0 text-[18px] text-white ui-input ui-transition focus:bg-white/5"
                        value={input.title}
                        onChange={(event) => setInput((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder={t('inputTitlePlaceholder')}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-[13px] text-white/40">{t('formDomain')}</span>
                      <select
                        className="h-10 rounded-[10px] border border-white/0 bg-white/0 px-0 text-[13px] text-white/60 ui-input ui-transition focus:bg-white/5"
                        value={input.domain}
                        onChange={(event) =>
                          setInput((prev) => ({ ...prev, domain: event.target.value as DecisionInput['domain'] }))
                        }
                      >
                        <option value="product">{t('domainProduct')}</option>
                        <option value="architecture">{t('domainArchitecture')}</option>
                        <option value="data">{t('domainData')}</option>
                        <option value="hiring">{t('domainHiring')}</option>
                        <option value="pricing">{t('domainPricing')}</option>
                        <option value="market">{t('domainMarket')}</option>
                        <option value="custom">{t('domainCustom')}</option>
                      </select>
                    </label>
                  </div>

                  <div
                    className={`space-y-3 ui-disclose ${hasTitle ? 'ui-disclose-open' : ''}`}
                    style={{ transitionDelay: hasTitle ? '60ms' : '0ms' }}
                  >
                    <div className="text-[11px] uppercase tracking-wide text-white/40">{t('inputGroupContext')}</div>
                    <label className="grid gap-2">
                      <span className="text-[13px] text-white/60">{t('formCurrentState')}</span>
                      <textarea
                        className="min-h-[120px] rounded-[12px] border border-white/0 bg-white/0 px-0 py-2 text-[15px] text-white/70 ui-input ui-transition focus:bg-white/5"
                        value={input.currentStateText}
                        onChange={(event) => setInput((prev) => ({ ...prev, currentStateText: event.target.value }))}
                        placeholder={t('inputStatePlaceholder')}
                      />
                    </label>
                  </div>

                  <div
                    className={`grid gap-3 ui-disclose ${hasTitle ? 'ui-disclose-open' : ''}`}
                    style={{ transitionDelay: hasTitle ? '120ms' : '0ms' }}
                  >
                    <div className="text-[11px] uppercase tracking-wide text-white/40">{t('inputGroupPaths')}</div>
                    <div className="text-[13px] text-white/60">{t('formOptions')}</div>
                    <div className="grid gap-3">
                      {input.options.map((option, index) => (
                        <div
                          key={option.id}
                          className={`ui-card ui-option-card ui-option-card-soft px-4 py-4 ui-disclose ui-disclose-open ${
                            activeOptionIndex === index ? 'ui-option-active' : ''
                          }`}
                          style={{ transitionDelay: `${optionStaggerBase + index * optionStaggerStep}ms` }}
                        >
                          <div className="text-[11px] uppercase tracking-wide text-white/40">{t('optionPathLabel')}</div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-[120px_1fr]">
                            <input
                              className="h-10 rounded-[10px] border border-white/0 bg-white/0 px-0 text-[13px] text-white/70 ui-input ui-transition focus:bg-white/5"
                              value={option.id}
                              onChange={(event) => handleOptionIdChange(index, event.target.value)}
                              onFocus={() => setActiveOptionIndex(index)}
                              onBlur={() => setActiveOptionIndex((prev) => (prev === index ? null : prev))}
                              aria-label={t('formOptionId')}
                            />
                            <input
                              className="h-10 rounded-[10px] border border-white/0 bg-white/0 px-0 text-[15px] text-white ui-input ui-transition focus:bg-white/5"
                              value={option.label}
                              onChange={(event) => handleOptionChange(index, 'label', event.target.value)}
                              onFocus={() => setActiveOptionIndex(index)}
                              onBlur={() => setActiveOptionIndex((prev) => (prev === index ? null : prev))}
                              placeholder={t('formPlaceholderOption')}
                            />
                          </div>
                          <input
                            className="mt-2 h-10 rounded-[10px] border border-white/0 bg-white/0 px-0 text-[13px] text-white/70 ui-input ui-transition focus:bg-white/5"
                            value={option.description ?? ''}
                            onChange={(event) => handleOptionChange(index, 'description', event.target.value)}
                            onFocus={() => setActiveOptionIndex(index)}
                            onBlur={() => setActiveOptionIndex((prev) => (prev === index ? null : prev))}
                            placeholder={t('optionDescriptionHint')}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="text-[13px] text-white/40 ui-transition hover:text-white/70"
                      onClick={() =>
                        setInput((prev) => {
                          if (prev.options.length >= 4) return prev;
                          return {
                            ...prev,
                            options: [...prev.options, { id: String.fromCharCode(65 + prev.options.length), label: '' }]
                          };
                        })
                      }
                    >
                      {t('addPath')}
                    </button>
                    <div className="text-[13px] text-white/40">{t('inputOptionHint')}</div>
                  </div>

                  <button
                    type="submit"
                    disabled={isBuilding || !canBuild}
                    className={`ui-button-primary ui-fade-in ${canBuild ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    style={{
                      transform: canBuild ? 'translateY(0)' : 'translateY(6px)',
                      transitionDelay: canBuild ? `${buildButtonDelay}ms` : '0ms'
                    }}
                  >
                    {isBuilding ? t('formBuilding') : t('formBuild')}
                  </button>
                  {!canBuild ? <div className="text-[13px] text-white/40">{t('inputBuildHint')}</div> : null}
                </form>
              </div>

              <div className={`absolute inset-0 ui-crossfade ${editorMode === 'example' ? '' : 'ui-crossfade-hidden'}`}>
                <div key={`example-${exampleIndex}`} className="grid gap-6 ui-crossfade">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] text-white/40">{t('exampleModeTitle')}</div>
                      <div className="mt-1 text-[13px] text-white/50">{t('exampleModeSubtitle')}</div>
                    </div>
                    <button
                      type="button"
                      className="ui-button-secondary"
                      onClick={() => setEditorMode('mine')}
                    >
                      {t('exampleModeCta')}
                    </button>
                  </div>
                  <div>
                    <div className="text-[13px] text-white/50">{t('formTitleLabel')}</div>
                    <div className="mt-2 text-[18px] text-white">{getExampleDecisionInput(exampleIndex).title}</div>
                  </div>
                  <div>
                    <div className="text-[13px] text-white/50">{t('formDomain')}</div>
                    <div className="mt-2 text-[15px] text-white/70">
                      {getExampleDecisionInput(exampleIndex).domain === 'product'
                        ? t('domainProduct')
                        : getExampleDecisionInput(exampleIndex).domain === 'architecture'
                          ? t('domainArchitecture')
                          : getExampleDecisionInput(exampleIndex).domain === 'data'
                            ? t('domainData')
                            : getExampleDecisionInput(exampleIndex).domain === 'hiring'
                              ? t('domainHiring')
                              : getExampleDecisionInput(exampleIndex).domain === 'pricing'
                                ? t('domainPricing')
                                : getExampleDecisionInput(exampleIndex).domain === 'market'
                                  ? t('domainMarket')
                                  : t('domainCustom')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] text-white/50">{t('formCurrentState')}</div>
                    <div className="mt-2 text-[15px] text-white/70">
                      {getExampleDecisionInput(exampleIndex).currentStateText}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-[13px] text-white/50">{t('formOptions')}</div>
                    <div className="grid gap-2">
                      {getExampleDecisionInput(exampleIndex).options.map((option) => (
                        <div key={option.id} className="ui-card ui-option-card-soft px-4 py-3">
                          <div className="text-[11px] uppercase tracking-wide text-white/40">{t('optionPathLabel')}</div>
                          <div className="mt-2 text-[15px] text-white">{option.label}</div>
                          {option.description ? (
                            <div className="mt-1 text-[13px] text-white/60">{option.description}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-white/40">
                      {exampleDecisionInputs.map((_, index) => (
                        <button
                          key={`example-dot-${index}`}
                          type="button"
                          aria-label={`Пример ${index + 1}`}
                          className={`h-2.5 w-2.5 rounded-full border border-white/20 ${exampleIndex === index ? 'bg-white/60' : 'bg-white/10'}`}
                          onClick={() => setExampleIndex(index)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid min-h-[calc(100vh-3rem)] w-full grid-cols-[360px_minmax(0,1fr)] gap-8 ui-crossfade">
            <aside className="flex flex-col gap-4" onMouseEnter={() => markHintSeen('panel')}>
              <div className="ui-section px-5 py-5 backdrop-blur">
                <div className="ui-caption uppercase tracking-wide">{t('mapTitle')}</div>
                <h2 className="mt-3 text-[18px] font-semibold text-white">{input.title}</h2>
                <div className="mt-2 text-[13px] text-white/50">{input.currentStateText}</div>
                {isDemoView ? <div className="mt-3 text-[12px] text-white/50">{t('demoLabel')}</div> : null}
                {hintsReady && !hintState.panel ? (
                  <div className="mt-3 text-[12px] text-white/50">{t('hintPanel')}</div>
                ) : null}
              </div>

              <div className="ui-section px-5 py-5 backdrop-blur">
                <div className="text-[12px] uppercase tracking-wide text-white/40">{t('selectedOption')}</div>
                <div className="mt-2 text-[14px] text-white/70">{selectedOptionLabel}</div>
                <div className="mt-4 text-[12px] uppercase tracking-wide text-white/40">{t('blockSummary')}</div>
                <div className="mt-2 text-[22px] font-semibold text-white">{metrics?.optionLossPct ?? 0}%</div>
                <div className="mt-1 text-[12px] text-white/50">{t('optionLossContext', { count: totalFutureStates })}</div>
                <div className="mt-4 text-[12px] uppercase tracking-wide text-white/40">{t('pointOfNoReturn')}</div>
                <div className="mt-1 text-[13px] text-white/70">{metrics?.pnrFlag ? t('yes') : t('no')}</div>
                <div className="mt-1 text-[12px] text-white/50">
                  {metrics?.pnrFlag ? `${t('pnrYesPrefix')} ${metrics.pnrText}` : t('pnrNoText')}
                </div>
                <div className="mt-4 text-[12px] uppercase tracking-wide text-white/40">{t('mainEffectTitle')}</div>
                <div className="mt-1 text-[13px] text-white/70">{mainEffect || t('mainEffectEmpty')}</div>
                {focusedNode ? (
                  <div className="mt-4 rounded-[12px] border border-white/10 bg-white/5 px-3 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-white/40">{t('focusedNode')}</div>
                    <div className="mt-2 text-[13px] text-white">{focusedNode.label}</div>
                    {focusedNode.subtitle ? (
                      <div className="mt-1 text-[12px] text-white/60">{focusedNode.subtitle}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="ui-section px-5 py-4 backdrop-blur">
                <div className="text-[12px] uppercase tracking-wide text-white/40">{t('viewMode')}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="ui-button-secondary" onClick={() => setScreenState('input')}>
                    {t('editDecision')}
                  </button>
                  <button type="button" className="ui-button-secondary" onClick={() => setFocusEnabled((prev) => !prev)}>
                    {focusEnabled ? t('showAll') : t('focusOnSelected')}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ui-button-secondary"
                    onClick={() => mapFlowRef.current?.fit()}
                  >
                    {t('fitView')}
                  </button>
                  <button
                    type="button"
                    className="ui-button-secondary"
                    onClick={() => mapFlowRef.current?.centerOnCurrent()}
                  >
                    {t('centerView')}
                  </button>
                  <button
                    type="button"
                    className="ui-button-secondary"
                    onClick={() => {
                      mapFlowRef.current?.clearFocus();
                      setFocusedNode(null);
                    }}
                    disabled={!focusedNode}
                  >
                    {t('clearNodeFocus')}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isDemoView ? (
                    <button type="button" className="ui-button-primary" onClick={handleExitDemo}>
                      {t('returnToDecision')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ui-button-primary"
                      onClick={handleSaveHistory}
                      disabled={!hasMap || isHistoryLimitReached}
                    >
                      {t('saveDecision')}
                    </button>
                  )}
                  <button type="button" className="ui-button-secondary" onClick={handleShare} disabled={!hasMap}>
                    {t('shareMap')}
                  </button>
                  <button type="button" className="ui-button-secondary" onClick={handleExport} disabled={!hasMap}>
                    {exportStatus === 'loading'
                      ? t('exporting')
                      : exportStatus === 'done'
                        ? t('exportReady')
                        : t('exportAction')}
                  </button>
                </div>
                {shareNotice ? <div className="mt-2 text-[12px] text-white/50">{shareNotice}</div> : null}
              </div>
            </aside>

            <section className="flex flex-col gap-3" ref={graphRef}>
              <div className="min-h-[calc(100vh-8rem)] flex-1 ui-section backdrop-blur ui-map-shell ui-crossfade">
                <div className="ui-map-grid pointer-events-none z-0" />
                <div className="ui-map-shimmer pointer-events-none z-0 ui-map-shimmer-active" />
                <MapLegend active={legendFocus} onHover={setLegendFocus} />
                {hintsReady && (!hintState.hover || !hintState.click) ? (
                  <div className="ui-map-hints">
                    {!hintState.hover ? <div>{t('hintNodeHover')}</div> : null}
                    {!hintState.click ? <div>{t('hintNodeClick')}</div> : null}
                  </div>
                ) : null}
                {mapModel ? (
                  <div className="absolute inset-0 z-10 ui-map-awake">
                    <MapFlow
                      key={mapVersion}
                      model={mapModel}
                      selectedOptionId={selectedOptionId}
                      onSelectOption={setSelectedOptionId}
                      onFocusNode={setFocusedNode}
                      onNodeHover={() => markHintSeen('hover')}
                      onNodeClick={() => markHintSeen('click')}
                      focusEnabled={focusEnabled}
                      highlightMode={highlightMode}
                      highlightIds={highlightIds}
                      legendFocus={legendFocus}
                      ref={mapFlowRef}
                    />
                  </div>
                ) : null}
              </div>
              <div className="text-[12px] text-white/30">{t('zerconFootnote')}</div>
            </section>
          </div>
        )}
      </div>
    </main>
  );

}

export default function MapPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-transparent" />}>
      <MapPageInner />
    </Suspense>
  );
}
