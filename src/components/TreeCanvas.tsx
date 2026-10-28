/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TreeType, AVLNodeSnapshot, BPlusNodeSnapshot, NodePosition } from '../types/tree';
import { layoutAVLTree, layoutBPlusTree } from '../algorithms/treeLayout';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, X, Info } from 'lucide-react';

interface TreeCanvasProps {
  treeType: TreeType;
  avlSnapshot: AVLNodeSnapshot | null;
  bplusSnapshot: BPlusNodeSnapshot | null;
  highlightNodeIds: string[];
  highlightKeys: number[];
  unbalancedNodeId?: string;
  rotationType?: string;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  treeType,
  avlSnapshot,
  bplusSnapshot,
  highlightNodeIds,
  highlightKeys,
  unbalancedNodeId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<NodePosition | null>(null);

  // Compute Layout
  const layout = React.useMemo(() => {
    if (treeType === 'avl') {
      return layoutAVLTree(avlSnapshot);
    } else {
      return layoutBPlusTree(bplusSnapshot);
    }
  }, [treeType, avlSnapshot, bplusSnapshot]);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || layout.nodes.length === 0) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    const bounds = layout.bounds;

    const scaleX = (containerW - 80) / bounds.width;
    const scaleY = (containerH - 80) / bounds.height;
    const newZoom = Math.min(1.3, Math.max(0.4, Math.min(scaleX, scaleY)));

    const boundsCenterX = (bounds.minX + bounds.maxX) / 2;
    const boundsCenterY = (bounds.minY + bounds.maxY) / 2;

    const newPanX = containerW / 2 - boundsCenterX * newZoom;
    const newPanY = containerH / 2 - boundsCenterY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [layout]);

  useEffect(() => {
    fitToScreen();
  }, [treeType, fitToScreen]);

  useEffect(() => {
    if (selectedNode && !layout.nodes.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [layout.nodes, selectedNode]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-control')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(2.5, Math.max(0.2, zoom * zoomFactor));

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative flex-1 w-full h-full bg-[#070B12] overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Background Cybernetic Dot Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
        <defs>
          <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#334155" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>

      {/* Floating Canvas Controls (Fit, Zoom, Reset) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#0D131F]/90 backdrop-blur-md border border-[#1E293B] p-1.5 rounded-xl shadow-xl z-30 interactive-control">
        <button
          onClick={() => setZoom(z => Math.min(2.5, z * 1.2))}
          className="p-1.5 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.2, z / 1.2))}
          className="p-1.5 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitToScreen}
          className="p-1.5 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-cyan-400 transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            fitToScreen();
          }}
          className="p-1.5 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-white transition-colors"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main SVG Viewport */}
      <svg className="w-full h-full">
        <defs>
          {/* Arrowhead marker for B+ Tree leaf linked list */}
          <marker
            id="leaf-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F59E0B" />
          </marker>

          {/* Gradients */}
          <linearGradient id="avl-node-default" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="avl-node-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          <linearGradient id="avl-node-unbalanced" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#9F1239" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. Branch Edges */}
          {layout.edges.map(edge => {
            const isHighlighted =
              highlightNodeIds.includes(edge.fromId) && highlightNodeIds.includes(edge.toId);

            if (edge.isLeafLink) {
              // Horizontal curved arrow between B+ leaf nodes
              const dx = edge.x2 - edge.x1;
              const curveY = edge.y1 + 18;
              const pathD = `M ${edge.x1} ${edge.y1} C ${edge.x1 + dx * 0.3} ${curveY}, ${edge.x2 - dx * 0.3} ${curveY}, ${edge.x2} ${edge.y2}`;
              return (
                <g key={edge.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    markerEnd="url(#leaf-arrow)"
                    opacity="0.9"
                  />
                </g>
              );
            }

            // Normal hierarchical branch edge
            const midY = (edge.y1 + edge.y2) / 2;
            const pathD = `M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`;

            return (
              <path
                key={edge.id}
                d={pathD}
                fill="none"
                stroke={isHighlighted ? '#06B6D4' : '#232E42'}
                strokeWidth={isHighlighted ? 3 : 1.8}
                filter={isHighlighted ? 'url(#glow-cyan)' : undefined}
                className="transition-colors duration-200"
              />
            );
          })}

          {/* 2. Nodes */}
          {layout.nodes.map(node => {
            const isHighlighted = highlightNodeIds.includes(node.id);
            const isUnbalanced = unbalancedNodeId === node.id;
            const isSelected = selectedNode?.id === node.id;

            if (treeType === 'avl') {
              // Circular AVL Node with Balance Factor Badge
              const radius = node.width / 2;
              const bf = node.balanceFactor ?? 0;
              const isBfImbalanced = Math.abs(bf) >= 2;

              let fillUrl = 'url(#avl-node-default)';
              let strokeColor = '#334155';

              if (isUnbalanced || isBfImbalanced) {
                fillUrl = 'url(#avl-node-unbalanced)';
                strokeColor = '#FDA4AF';
              } else if (isHighlighted) {
                fillUrl = 'url(#avl-node-highlight)';
                strokeColor = '#38BDF8';
              } else if (isSelected) {
                strokeColor = '#06B6D4';
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer group"
                >
                  {/* Subtle outer halo */}
                  <circle
                    r={radius + 4}
                    fill="none"
                    stroke={isHighlighted ? '#06B6D4' : isUnbalanced ? '#F43F5E' : '#38BDF8'}
                    strokeWidth="2"
                    opacity={isHighlighted || isUnbalanced || isSelected ? 0.7 : 0}
                    className="transition-opacity duration-300"
                  />

                  {/* Main Circle */}
                  <circle
                    r={radius}
                    fill={fillUrl}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    className="transition-all duration-300 group-hover:stroke-cyan-400"
                  />

                  {/* Key Label */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FFFFFF"
                    fontSize="15"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {node.key}
                  </text>

                  {/* Balance Factor Floating Badge */}
                  <g transform={`translate(${radius - 6}, ${-radius + 6})`}>
                    <circle
                      r="10"
                      fill={isBfImbalanced ? '#F43F5E' : bf !== 0 ? '#1E293B' : '#0F172A'}
                      stroke={isBfImbalanced ? '#FDA4AF' : '#334155'}
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isBfImbalanced ? '#FFFFFF' : bf !== 0 ? '#38BDF8' : '#94A3B8'}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {bf > 0 ? `+${bf}` : `${bf}`}
                    </text>
                  </g>
                </g>
              );
            } else {
              // B+ Tree Rectangular Node
              const isLeaf = node.isLeaf;
              const keys = node.keys || [];
              const halfW = node.width / 2;
              const halfH = node.height / 2;

              let nodeBgColor = isLeaf ? '#0F172A' : '#1E293B';
              let borderColor = isLeaf ? '#B45309' : '#334155';

              if (isHighlighted) {
                borderColor = '#06B6D4';
                nodeBgColor = '#15253D';
              } else if (isSelected) {
                borderColor = '#F59E0B';
              }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer group"
                >
                  {/* Node Outer Container */}
                  <rect
                    x={-halfW}
                    y={-halfH}
                    width={node.width}
                    height={node.height}
                    rx={isLeaf ? 10 : 6}
                    fill={nodeBgColor}
                    stroke={borderColor}
                    strokeWidth={isSelected || isHighlighted ? 2.5 : 1.5}
                    className="transition-all duration-300 group-hover:stroke-cyan-400"
                  />

                  {/* Leaf Tag Badge */}
                  {isLeaf && (
                    <g transform={`translate(${-halfW + 10}, ${-halfH - 8})`}>
                      <rect
                        x="-4"
                        y="-4"
                        width="36"
                        height="14"
                        rx="4"
                        fill="#F59E0B"
                        className="shadow-sm"
                      />
                      <text
                        x="14"
                        y="5"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="800"
                        fill="#0F172A"
                        fontFamily="monospace"
                      >
                        LEAF
                      </text>
                    </g>
                  )}

                  {/* Internal Router Tag Badge */}
                  {!isLeaf && (
                    <g transform={`translate(${-halfW + 10}, ${-halfH - 8})`}>
                      <rect
                        x="-4"
                        y="-4"
                        width="46"
                        height="14"
                        rx="4"
                        fill="#334155"
                        stroke="#475569"
                        strokeWidth="0.8"
                      />
                      <text
                        x="19"
                        y="5"
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="700"
                        fill="#CBD5E1"
                        fontFamily="monospace"
                      >
                        ROUTER
                      </text>
                    </g>
                  )}

                  {/* Keys Grid Cells */}
                  {keys.map((k, idx) => {
                    const cellW = 38;
                    const startX = -halfW + 12 + idx * (cellW + 4);
                    const isKeyHighlighted = highlightKeys.includes(k);

                    return (
                      <g key={idx} transform={`translate(${startX}, ${-halfH + 8})`}>
                        <rect
                          width={cellW}
                          height={node.height - 16}
                          rx="5"
                          fill={isKeyHighlighted ? '#06B6D4' : '#070B12'}
                          stroke={isKeyHighlighted ? '#38BDF8' : '#1E293B'}
                          strokeWidth="1"
                        />
                        <text
                          x={cellW / 2}
                          y={(node.height - 16) / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isKeyHighlighted ? '#070B12' : '#F8FAFC'}
                          fontSize="13"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {k}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            }
          })}
        </g>
      </svg>

      {/* Selected Node Inspector Floating Glass Card */}
      {selectedNode && (
        <div className="absolute bottom-5 left-5 bg-[#0D131F]/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-4 shadow-2xl z-30 max-w-sm text-xs text-white animate-fadeIn interactive-control">
          <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
                <Info className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm tracking-wide">
                {treeType === 'avl'
                  ? `Node Inspector (Key: ${selectedNode.key})`
                  : `${selectedNode.isLeaf ? 'Leaf' : 'Internal Router'} Node`}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded-lg hover:bg-[#1E293B] text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono">
            <div>
              <span className="text-slate-400">ID: </span>
              <span className="text-cyan-400 font-semibold">{selectedNode.id.slice(0, 14)}</span>
            </div>
            {treeType === 'avl' && (
              <>
                <div>
                  <span className="text-slate-400">Height: </span>
                  <span className="text-white font-bold">{selectedNode.nodeHeight}</span>
                </div>
                <div>
                  <span className="text-slate-400">Balance Factor: </span>
                  <span className={Math.abs(selectedNode.balanceFactor ?? 0) >= 2 ? 'text-rose-400 font-extrabold' : 'text-cyan-300'}>
                    {selectedNode.balanceFactor}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Status: </span>
                  <span className={Math.abs(selectedNode.balanceFactor ?? 0) <= 1 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-bold'}>
                    {Math.abs(selectedNode.balanceFactor ?? 0) <= 1 ? 'Balanced' : 'Imbalanced'}
                  </span>
                </div>
              </>
            )}

            {treeType === 'bplus' && (
              <>
                <div>
                  <span className="text-slate-400">Type: </span>
                  <span className={selectedNode.isLeaf ? 'text-amber-400 font-bold' : 'text-indigo-400 font-bold'}>
                    {selectedNode.isLeaf ? 'Data Leaf' : 'Routing Node'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Keys: </span>
                  <span className="text-white font-bold">[{selectedNode.keys?.join(', ')}]</span>
                </div>
                {selectedNode.isLeaf && (
                  <>
                    <div>
                      <span className="text-slate-400">Next Leaf: </span>
                      <span className="text-amber-400">{selectedNode.nextLeafId ? 'Linked →' : 'End of List'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Prev Leaf: </span>
                      <span className="text-amber-400">{selectedNode.prevLeafId ? '← Linked' : 'Start of List'}</span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty State Banner */}
      {layout.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-[#0D131F] border border-[#1E293B] flex items-center justify-center text-cyan-400 mb-3 shadow-lg">
            <Info className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">Tree is currently empty</h2>
          <p className="text-xs text-slate-400 max-w-sm">
            Use the Left Panel to Insert keys or run a preset scenario.
          </p>
        </div>
      )}
    </div>
  );
};
