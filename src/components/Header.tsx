/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TreeType } from '../types/tree';
import { GitBranch, RotateCcw, Layers, Sparkles } from 'lucide-react';

interface HeaderProps {
  treeType: TreeType;
  onTreeTypeChange: (type: TreeType) => void;
  bplusOrder: number;
  onBplusOrderChange: (order: number) => void;
  onResetTree: () => void;
  nodeCount: number;
  height: number;
}

export const Header: React.FC<HeaderProps> = ({
  treeType,
  onTreeTypeChange,
  bplusOrder,
  onBplusOrderChange,
  onResetTree,
  nodeCount,
  height,
}) => {
  return (
    <header className="bg-[#0D131F]/90 backdrop-blur-md border-b border-[#1E293B] px-5 py-2.5 flex items-center justify-between gap-4 shrink-0 select-none z-20">
      {/* Left: Brand */}
      <div className="flex items-center gap-3 min-w-[210px]">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <GitBranch className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Arborix
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
              Dual-Tree
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">AVL & B+ Tree Interactive Visualizer</p>
        </div>
      </div>

      {/* Top Center: Prominent Tabs for AVL Tree and B+ Tree */}
      <div className="flex items-center justify-center">
        <div className="flex items-center bg-[#070B12] p-1 rounded-xl border border-[#1E293B] shadow-inner gap-1">
          <button
            onClick={() => onTreeTypeChange('avl')}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
              treeType === 'avl'
                ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${treeType === 'avl' ? 'text-cyan-200' : 'text-slate-500'}`} />
            <span>AVL Tree</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
              treeType === 'avl' ? 'bg-black/30 text-cyan-200' : 'bg-[#1E293B] text-slate-400'
            }`}>
              Binary BST
            </span>
          </button>

          <button
            onClick={() => onTreeTypeChange('bplus')}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
              treeType === 'bplus'
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${treeType === 'bplus' ? 'text-amber-200' : 'text-slate-500'}`} />
            <span>B+ Tree</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
              treeType === 'bplus' ? 'bg-black/30 text-amber-200' : 'bg-[#1E293B] text-slate-400'
            }`}>
              Order {bplusOrder}
            </span>
          </button>
        </div>
      </div>

      {/* Right: B+ Order selector (if B+) + Status & Reset */}
      <div className="flex items-center gap-3 min-w-[210px] justify-end">
        {/* Order Selector for B+ Tree */}
        {treeType === 'bplus' && (
          <div className="flex items-center gap-1.5 bg-[#070B12] px-2.5 py-1 rounded-lg border border-[#1E293B] text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Order:</span>
            <div className="flex items-center gap-1">
              {[3, 4, 5, 6].map(m => (
                <button
                  key={m}
                  onClick={() => onBplusOrderChange(m)}
                  className={`w-5 h-5 rounded text-[11px] font-mono font-semibold transition-all ${
                    bplusOrder === m
                      ? 'bg-amber-500 text-[#070B12] shadow-sm scale-105'
                      : 'text-slate-400 hover:bg-[#1E293B] hover:text-slate-200'
                  }`}
                  title={`Set B+ Tree Order m = ${m}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Height & Node Count summary */}
        <div className="hidden lg:flex items-center gap-2.5 bg-[#070B12] px-3 py-1 rounded-lg border border-[#1E293B] text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">H:</span>
            <strong className="text-cyan-400 font-semibold">{height}</strong>
          </div>
          <span className="text-[#1E293B]">|</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Nodes:</span>
            <strong className="text-slate-200 font-semibold">{nodeCount}</strong>
          </div>
        </div>

        {/* Reset Tree */}
        <button
          onClick={onResetTree}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] hover:border-slate-600 transition-all active:scale-95 shadow-sm"
          title="Clear current tree"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
};
