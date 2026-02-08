'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  EdgeLabelRenderer,
  BaseEdge,
  getBezierPath,
  Handle,
  NodeProps,
  EdgeProps,
  Position,
  useEdgesState,
  useNodesState,
  Edge,
  Node
} from 'reactflow';
import dagre from 'dagre';
import type { MapModel, MapNode, MapEdge } from '@/lib/map/types';
import { t } from '@/lib/i18n';
import { useTheme } from '@/lib/theme/ThemeProvider';

const nodeWidth = 240;
const nodeHeight = 86;
const mergedWidth = 280;

type NodeImportance = 'current' | 'primary' | 'secondary' | 'distant';
const primaryTags = new Set(['strategic_closure', 'vendor_lockin', 'fixed_cost', 'org_inertia', 'hiring_lock']);
const distantTags = new Set(['flexibility_low', 'scope_limit', 'compliance_risk', 'integration_risk']);

const resolveImportance = (nodeType: MapNode['type'], tags: string[] = []): NodeImportance => {
  if (nodeType === 'current') return 'current';
  if (nodeType === 'merged') return 'primary';
  if (tags.some((tag) => primaryTags.has(tag))) return 'primary';
  if (tags.some((tag) => distantTags.has(tag))) return 'distant';
  return 'secondary';
};

const getLayoutedElements = (nodes: MapNode[], edges: MapEdge[]) => {
  const visibleMap = new Map<string, string>();
  const hiddenSet = new Set<string>();
  const titleIndex = new Map<string, string>();

  nodes.forEach((node) => {
    if (node.type !== 'future') return;
    const normalized = node.label.toLowerCase().trim();
    const existing = titleIndex.get(normalized);
    if (existing) {
      hiddenSet.add(node.id);
      visibleMap.set(node.id, existing);
    } else {
      titleIndex.set(normalized, node.id);
    }
  });

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 140, nodesep: 70 });

  nodes.forEach((node) => {
    if (hiddenSet.has(node.id)) return;
    const width = node.type === 'merged' ? mergedWidth : nodeWidth;
    dagreGraph.setNode(node.id, { width, height: nodeHeight });
  });

  edges.forEach((edge) => {
    const source = visibleMap.get(edge.source) ?? edge.source;
    const target = visibleMap.get(edge.target) ?? edge.target;
    if (source === target) return;
    dagreGraph.setEdge(source, target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return {
      id: node.id,
      type: node.type,
      data: {
        label: node.label,
        subtitle: node.subtitle,
        optionId: node.optionId,
        nodeType: node.type,
        tags: node.tags ?? []
      },
      position: {
        x: (dagreNode?.x ?? 0) - (node.type === 'merged' ? mergedWidth / 2 : nodeWidth / 2),
        y: (dagreNode?.y ?? 0) - nodeHeight / 2
      },
      hidden: hiddenSet.has(node.id)
    };
  });

  const layoutedEdges = edges
    .map((edge) => {
      const source = visibleMap.get(edge.source) ?? edge.source;
      const target = visibleMap.get(edge.target) ?? edge.target;
      if (source === target) return null;
      return {
        id: edge.id,
        source,
        target,
        type: source === 'current' ? 'option-edge' : 'smoothstep',
        data: {
          optionId: edge.optionId,
          label: source === 'current' ? `${t('optionLabel')} ${edge.optionId}` : ''
        }
      };
    })
    .filter(Boolean) as unknown as { id: string; source: string; target: string; type: string; data: unknown }[];

  return { nodes: layoutedNodes, edges: layoutedEdges, visibleMap };
};

type NodeData = {
  label: string;
  subtitle?: string;
  optionId?: string;
  nodeType?: MapNode['type'];
  tags?: string[];
  importance?: NodeImportance;
  isHighlighted?: boolean;
  isFocused?: boolean;
};

function CurrentNode({ data }: NodeProps<NodeData>) {
  return (
    <div
      className={`w-[240px] ui-node ui-node-current ui-transition ${data.isFocused ? 'ui-node-focused' : ''} ${
        data.isHighlighted ? 'ui-node-highlighted' : ''
      }`}
    >
      <div className="text-[13px] uppercase tracking-wide text-white/50">{t('current')}</div>
      <div className="mt-2 text-[14px] font-medium text-white ui-clamp-2">{data.label}</div>
      {data.subtitle ? (
        <div className="mt-1 text-[12px] text-white/60 ui-clamp-2">{data.subtitle}</div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-white/40" />
    </div>
  );
}

function FutureNode({ data }: NodeProps<NodeData>) {
  const importance = data.importance ?? 'secondary';
  return (
    <div
      data-importance={importance}
      className={`w-[240px] ui-node ui-node-${importance} ui-transition ${data.isFocused ? 'ui-node-focused' : ''} ${
        data.isHighlighted ? 'ui-node-highlighted' : ''
      }`}
    >
      <div className="text-[13px] uppercase tracking-wide text-white/50">{t('futureState')}</div>
      <div className="mt-2 text-[14px] font-medium text-white ui-clamp-2">{data.label}</div>
      {data.subtitle ? (
        <div className="mt-1 text-[12px] text-white/60 ui-clamp-2">{data.subtitle}</div>
      ) : null}
      <Handle type="target" position={Position.Left} className="!bg-white/40" />
      <Handle type="source" position={Position.Right} className="!bg-white/40" />
    </div>
  );
}

function MergedNode({ data }: NodeProps<NodeData>) {
  return (
    <div
      className={`w-[280px] ui-node ui-node-primary ui-transition ${data.isFocused ? 'ui-node-focused' : ''} ${
        data.isHighlighted ? 'ui-node-highlighted' : ''
      }`}
    >
      <div className="text-[12px] uppercase tracking-[0.2em] text-white/50">Сходятся траектории</div>
      <div className="mt-2 flex items-center gap-2 text-[12px] uppercase tracking-[0.2em] text-white/50">
        <span className="flex h-6 items-center rounded-full border border-white/20 bg-white/10 px-2">
          <span className="mr-1 inline-flex h-3 w-3 items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="currentColor">
              <path d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v7A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-7A1.5 1.5 0 0 1 5.5 10H7Zm2-2v2h6V8a3 3 0 0 0-6 0Z" />
            </svg>
          </span>
          {t('merged')}
        </span>
      </div>
      <div className="mt-2 text-[15px] font-medium ui-clamp-2">{data.label}</div>
      <div className="mt-1 text-[12px] text-white/60">Здесь теряется манёвр</div>
      {data.subtitle ? <div className="mt-2 text-[12px] text-white/50 ui-clamp-2">{data.subtitle}</div> : null}
      <Handle type="target" position={Position.Left} className="!bg-white/40" />
    </div>
  );
}

function OptionEdge({ id, sourceX, sourceY, targetX, targetY, data, selected }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY
  });

  return (
    <>
      <g className={selected ? 'rf-edge-selected' : ''}>
        <BaseEdge id={id} path={edgePath} />
      </g>
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`
          }}
          className="pointer-events-none rounded-full border border-white/10 bg-ink-900/70 px-2 py-1 text-[11px] uppercase tracking-wide text-white/60"
        >
          {data?.label ?? t('optionLabel')}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = {
  current: CurrentNode,
  future: FutureNode,
  merged: MergedNode
};

const edgeTypes = {
  'option-edge': OptionEdge
};

type MapFlowProps = {
  model: MapModel;
  selectedOptionId: string;
  onSelectOption: (optionId: string) => void;
  onFocusNode?: (node: MapNode | null) => void;
  focusEnabled: boolean;
  highlightMode: 'none' | 'closedFuture' | 'reason' | 'metric';
  highlightIds: { nodeIds: string[]; edgeIds: string[] };
};

export type MapFlowHandle = {
  fit: () => void;
  centerOnCurrent: () => void;
  centerOnNode: (nodeId: string) => void;
  fitToNodes: (nodeIds: string[]) => void;
  clearFocus: () => void;
};

export const MapFlow = forwardRef<MapFlowHandle, MapFlowProps>(function MapFlow(
  { model, selectedOptionId, onSelectOption, onFocusNode, focusEnabled, highlightMode, highlightIds },
  ref
) {
  const layouted = useMemo(() => getLayoutedElements(model.nodes, model.edges), [model]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layouted.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layouted.edges);
  const [flowInstance, setFlowInstance] = useState<{
    fitView: (args?: { padding?: number; nodes?: Node[] }) => void;
    setCenter: (x: number, y: number, opts?: { zoom?: number; duration?: number }) => void;
  } | null>(null);
  const { theme } = useTheme();
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const highlightActive =
    highlightMode !== 'none' && (highlightIds.nodeIds.length > 0 || highlightIds.edgeIds.length > 0);
  const focusId = !highlightActive && focusEnabled ? hoveredOptionId ?? selectedOptionId : null;
  const activeNodeId = pinnedNodeId ?? hoveredNodeId;

  const highlightNodeIdSet = useMemo(() => {
    const resolved = new Set<string>();
    highlightIds.nodeIds.forEach((id) => {
      resolved.add(layouted.visibleMap.get(id) ?? id);
    });
    return resolved;
  }, [highlightIds.nodeIds, layouted.visibleMap]);

  const highlightEdgeIdSet = useMemo(() => new Set(highlightIds.edgeIds), [highlightIds.edgeIds]);

  useEffect(() => {
    // Синхронизируем внутреннее состояние ReactFlow при обновлении модели.
    // Здесь позже будет LLM: возможны дополнительные типы нод и рёбер.
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [layouted.nodes, layouted.edges, setEdges, setNodes]);

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        flowInstance?.fitView({ padding: 0.2 });
      },
      centerOnCurrent: () => {
        const current = nodes.find((node) => node.id === 'current');
        if (!current || !flowInstance) return;
        const x = current.position.x + nodeWidth / 2;
        const y = current.position.y + nodeHeight / 2;
        flowInstance.setCenter(x, y, { zoom: 1, duration: 300 });
      },
      centerOnNode: (nodeId: string) => {
        if (!flowInstance) return;
        const resolvedId = layouted.visibleMap.get(nodeId) ?? nodeId;
        const target = nodes.find((node) => node.id === resolvedId);
        if (!target) return;
        const x = target.position.x + (target.type === 'merged' ? mergedWidth / 2 : nodeWidth / 2);
        const y = target.position.y + nodeHeight / 2;
        flowInstance.setCenter(x, y, { zoom: 1, duration: 300 });
      },
      fitToNodes: (nodeIds: string[]) => {
        if (!flowInstance) return;
        const resolvedIds = nodeIds.map((id) => layouted.visibleMap.get(id) ?? id);
        const targets = nodes.filter((node) => resolvedIds.includes(node.id));
        if (!targets.length) return;
        flowInstance.fitView({ padding: 0.25, nodes: targets });
      },
      clearFocus: () => {
        setPinnedNodeId(null);
        setHoveredNodeId(null);
        onFocusNode?.(null);
      }
    }),
    [flowInstance, nodes, layouted.visibleMap, onFocusNode]
  );

  const activeFocus = useMemo(() => {
    if (!activeNodeId) return null;
    const resolvedId = layouted.visibleMap.get(activeNodeId) ?? activeNodeId;
    const connectedEdges = edges.filter((edge) => edge.source === resolvedId || edge.target === resolvedId);
    const connectedNodeIds = new Set<string>([resolvedId]);
    connectedEdges.forEach((edge) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    return {
      nodeIds: connectedNodeIds,
      edgeIds: new Set(connectedEdges.map((edge) => edge.id)),
      focusId: resolvedId
    };
  }, [activeNodeId, edges, layouted.visibleMap]);

  const hoverFocus = useMemo(() => {
    if (!hoveredNodeId || pinnedNodeId) return null;
    const resolvedId = layouted.visibleMap.get(hoveredNodeId) ?? hoveredNodeId;
    const targetNode = nodes.find((node) => node.id === resolvedId);
    if (!targetNode || targetNode.type !== 'future') return null;
    const edge = edges.find((item) => item.source === 'current' && item.target === resolvedId);
    const nodeIds = new Set<string>(['current', resolvedId]);
    const edgeIds = edge ? new Set<string>([edge.id]) : new Set<string>();
    return { nodeIds, edgeIds };
  }, [hoveredNodeId, pinnedNodeId, layouted.visibleMap, edges, nodes]);

  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          importance: resolveImportance(node.type as MapNode['type'], (node.data as NodeData).tags),
          isHighlighted: highlightActive
            ? highlightNodeIdSet.has(node.id)
            : node.data.optionId === selectedOptionId,
          isFocused: activeFocus ? activeFocus.nodeIds.has(node.id) : false
        },
        style: highlightActive
          ? { opacity: highlightNodeIdSet.has(node.id) ? 1 : 0.18 }
          : hoverFocus
            ? { opacity: hoverFocus.nodeIds.has(node.id) ? 1 : 0.3 }
            : activeFocus
              ? { opacity: activeFocus.nodeIds.has(node.id) ? 1 : 0.22 }
              : focusId && node.data.optionId && node.data.optionId !== focusId
                ? { opacity: 0.22 }
                : { opacity: 1 }
      })),
    [nodes, selectedOptionId, focusId, highlightActive, highlightNodeIdSet, activeFocus, hoverFocus]
  );

  const decoratedEdges = useMemo(
    () =>
      edges.map((edge) => {
        if (highlightActive) {
          const isHighlighted =
            highlightEdgeIdSet.has(edge.id) ||
            highlightNodeIdSet.has(edge.source) ||
            highlightNodeIdSet.has(edge.target);
          return {
            ...edge,
            className: isHighlighted ? 'rf-edge-selected' : '',
            style: {
              stroke: isHighlighted ? 'rgba(120,140,255,0.6)' : 'rgba(120,140,255,0.25)',
              strokeWidth: isHighlighted ? 2 : 1.1,
              opacity: isHighlighted ? 1 : 0.2
            }
          };
        }

        if (hoverFocus) {
          const isActive =
            hoverFocus.edgeIds.has(edge.id) ||
            hoverFocus.nodeIds.has(edge.source) ||
            hoverFocus.nodeIds.has(edge.target);
          return {
            ...edge,
            className: isActive ? 'rf-edge-selected' : '',
            style: {
              stroke: isActive ? 'rgba(120,140,255,0.55)' : 'rgba(120,140,255,0.2)',
              strokeWidth: isActive ? 1.6 : 1,
              opacity: isActive ? 1 : 0.3
            }
          };
        }

        if (activeFocus) {
          const isActive =
            activeFocus.edgeIds.has(edge.id) ||
            activeFocus.nodeIds.has(edge.source) ||
            activeFocus.nodeIds.has(edge.target);
          return {
            ...edge,
            className: isActive ? 'rf-edge-selected' : '',
            style: {
              stroke: isActive ? 'rgba(120,140,255,0.6)' : 'rgba(120,140,255,0.2)',
              strokeWidth: isActive ? 1.8 : 1,
              opacity: isActive ? 1 : 0.2
            }
          };
        }

        const isSelected = edge.data?.optionId === selectedOptionId;
        const isFocused = focusId && edge.data?.optionId === focusId;
        const isDimmed = focusId && edge.data?.optionId && edge.data?.optionId !== focusId;
        return {
          ...edge,
          className: isSelected ? 'rf-edge-selected' : '',
          style: {
            stroke: isSelected || isFocused ? 'rgba(120,140,255,0.6)' : 'rgba(120,140,255,0.3)',
            strokeWidth: isSelected || isFocused ? 1.8 : 1.1,
            opacity: isDimmed ? 0.25 : 1
          }
        };
      }),
    [edges, selectedOptionId, focusId, highlightActive, highlightEdgeIdSet, highlightNodeIdSet, activeFocus, hoverFocus]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (edge.data?.optionId) {
        onSelectOption(edge.data.optionId);
      }
    },
    [onSelectOption]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const resolvedId = layouted.visibleMap.get(node.id) ?? node.id;
      if (pinnedNodeId === resolvedId) {
        setPinnedNodeId(null);
        onFocusNode?.(null);
      } else {
        setPinnedNodeId(resolvedId);
        const found = model.nodes.find((item) => item.id === resolvedId) ?? null;
        onFocusNode?.(found);
      }
      if (node.data?.optionId) {
        onSelectOption(node.data.optionId);
      }
    },
    [onSelectOption, pinnedNodeId, layouted.visibleMap, model.nodes, onFocusNode]
  );

  const handleEdgeHover = useCallback((edge: Edge | null) => {
    if (edge?.data?.optionId) {
      setHoveredOptionId(edge.data.optionId);
    } else {
      setHoveredOptionId(null);
    }
  }, []);

  const handleNodeHover = useCallback((node: Node | null) => {
    if (node?.data?.optionId) {
      setHoveredOptionId(node.data.optionId);
    } else {
      setHoveredOptionId(null);
    }
    if (!pinnedNodeId) {
      if (node && node.type === 'future') {
        setHoveredNodeId(layouted.visibleMap.get(node.id) ?? node.id);
      } else {
        setHoveredNodeId(null);
      }
    }
  }, [layouted.visibleMap, pinnedNodeId]);

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!flowInstance) return;
      const resolvedId = layouted.visibleMap.get(node.id) ?? node.id;
      const target = nodes.find((item) => item.id === resolvedId);
      if (!target) return;
      const x = target.position.x + (target.type === 'merged' ? mergedWidth / 2 : nodeWidth / 2);
      const y = target.position.y + nodeHeight / 2;
      flowInstance.setCenter(x, y, { zoom: 1, duration: 220 });
    },
    [flowInstance, layouted.visibleMap, nodes]
  );

  return (
    <ReactFlow
      key={`${model.summary.totalFutureStates}-${model.nodes.length}-${model.edges.length}`}
      nodes={decoratedNodes}
      edges={decoratedEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onEdgeClick={handleEdgeClick}
      onNodeClick={handleNodeClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onPaneClick={() => {
        if (pinnedNodeId) {
          setPinnedNodeId(null);
          onFocusNode?.(null);
        }
      }}
      onEdgeMouseEnter={(_, edge) => handleEdgeHover(edge)}
      onEdgeMouseLeave={() => handleEdgeHover(null)}
      onNodeMouseEnter={(_, node) => handleNodeHover(node)}
      onNodeMouseLeave={() => handleNodeHover(null)}
      onInit={setFlowInstance}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      className="h-full w-full ui-section bg-ink-950/40"
    >
      <Background color={gridColor} gap={28} />
      <Controls className="!border-0 !bg-ink-900/70 !text-white/60" />
    </ReactFlow>
  );
});
