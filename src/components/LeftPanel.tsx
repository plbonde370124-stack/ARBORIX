/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TreeType, StepTelemetry } from '../types/tree';
import { Plus, Search, Trash2, ArrowRightLeft, Dices, Sparkles, BookOpen } from 'lucide-react';

interface LeftPanelProps {
  treeType: TreeType;
  onInsert: (key: number) => void;
  onSearch: (key: number) => void;
  onDelete: (key: number) => void;
  onRangeQuery: (from: number, to: number) => void;
  onApplyPreset: (presetId: string) => void;
  telemetry: StepTelemetry;
}

export type OperationTab = 'insert' | 'search' | 'delete' | 'range';

export const LeftPanel: React.FC<LeftPanelProps> = ({
  treeType,
  onInsert,
  onSearch,
  onDelete,
  onRangeQuery,
  onApplyPreset,
  telemetry,
}) => {
  const [activeTab, setActiveTab] = useState<OperationTab>('insert');
  const [singleKey, setSingleKey] = useState<string>('42');
  const [rangeFrom, setRangeFrom] = useState<string>('20');
  const [rangeTo, setRangeTo] = useState<string>('60');

  const handleExecute = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeTab === 'insert') {
      const num = parseInt(singleKey, 10);
      if (!isNaN(num)) onInsert(num);
    } else if (activeTab === 'search') {
      const num = parseInt(singleKey, 10);
      if (!isNaN(num)) onSearch(num);
    } else if (activeTab === 'delete') {
      const num = parseInt(singleKey, 10);
      if (!isNaN(num)) onDelete(num);
    } else if (activeTab === 'range') {
      const from = parseInt(rangeFrom, 10);
      const to = parseInt(rangeTo, 10);
      if (!isNaN(from) && !isNaN(to)) onRangeQuery(from, to);
    }
  };

  const handleRandomKey = () => {
    const rand = Math.floor(Math.random() * 90) + 10;
    setSingleKey(rand.toString());
    if (activeTab === 'insert') {
      onInsert(rand);
    }
  };

  const avlPresets = [
    { id: 'avl_balanced', label: 'Balanced 7-Node Tree' },
    { id: 'avl_ll', label: 'Trigger LL Single Right' },
    { id: 'avl_rr', label: 'Trigger RR Single Left' },
    { id: 'avl_lr', label: 'Trigger LR Double Rotation' },
    { id: 'avl_rl', label: 'Trigger RL Double Rotation' },
    { id: 'avl_delete_rebalance', label: 'Deletion Rebalance' },
  ];

  const bplusPresets = [
    { id: 'bplus_balanced', label: 'Balanced Tree Sample' },
    { id: 'bplus_leaf_split', label: 'Trigger Leaf Split' },
    { id: 'bplus_internal_split', label: 'Trigger Root & Internal Split' },
    { id: 'bplus_range_demo', label: 'Range Scan [20 to 60]' },
    { id: 'bplus_borrow_merge', label: 'Sibling Borrow / Merge' },
  ];

  const presets = treeType === 'avl' ? avlPresets : bplusPresets;

  return (
    <aside className="w-80 bg-[#0D131F] border-r border-[#1E293B] flex flex-col shrink-0 select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#0B0F19]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-white tracking-wide">Tree Lab</h2>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
          Interactive
        </span>
      </div>

      {/* Operation Tabs: [Insert] [Search] [Delete] [Range] */}
      <div className="p-3 border-b border-[#1E293B] bg-[#070B12]/80">
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#0D131F] rounded-xl border border-[#1E293B]">
          <button
            onClick={() => setActiveTab('insert')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              activeTab === 'insert'
                ? 'bg-gradient-to-br from-cyan-500 to-teal-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/60'
            }`}
            title="Insert key into tree"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Insert</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              activeTab === 'search'
                ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/60'
            }`}
            title="Search for key in tree"
          >
            <Search className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveTab('delete')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              activeTab === 'delete'
                ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/60'
            }`}
            title="Delete key and rebalance"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setActiveTab('range')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              activeTab === 'range'
                ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/60'
            }`}
            title="Scan range of keys"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Range</span>
          </button>
        </div>
      </div>

      {/* Operation Form Section */}
      <div className="p-4 flex flex-col gap-3.5 border-b border-[#1E293B] bg-[#0D131F]">
        {activeTab !== 'range' ? (
          <form onSubmit={handleExecute} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300 font-medium">
                {activeTab === 'insert' && 'Value to insert:'}
                {activeTab === 'search' && 'Value to locate:'}
                {activeTab === 'delete' && 'Value to remove:'}
              </label>
              <button
                type="button"
                onClick={handleRandomKey}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Generate random integer"
              >
                <Dices className="w-3 h-3" />
                <span>Random</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={singleKey}
                onChange={e => setSingleKey(e.target.value)}
                placeholder="Integer"
                className="flex-1 bg-[#070B12] border border-[#1E293B] rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
              />
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm ${
                  activeTab === 'insert'
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : activeTab === 'search'
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                }`}
              >
                {activeTab === 'insert' && 'Insert'}
                {activeTab === 'search' && 'Search'}
                {activeTab === 'delete' && 'Delete'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {activeTab === 'insert' &&
                `Inserts key into ${treeType === 'avl' ? 'AVL Tree with bottom-up height & rotation checks' : 'B+ Tree with leaf/internal split checks'}.`}
              {activeTab === 'search' &&
                `Traverses ${treeType === 'avl' ? 'BST branch pointers' : 'internal routing separators down to leaf node'}.`}
              {activeTab === 'delete' &&
                `Removes key and triggers ${treeType === 'avl' ? 'ancestor rebalancing rotations' : 'sibling borrow or merge operations'}.`}
            </p>
          </form>
        ) : (
          <form onSubmit={handleExecute} className="flex flex-col gap-2.5">
            <label className="text-xs text-slate-300 font-medium">Scan key interval [From .. To]:</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">From (Min):</span>
                <input
                  type="number"
                  value={rangeFrom}
                  onChange={e => setRangeFrom(e.target.value)}
                  className="bg-[#070B12] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">To (Max):</span>
                <input
                  type="number"
                  value={rangeTo}
                  onChange={e => setRangeTo(e.target.value)}
                  className="bg-[#070B12] border border-[#1E293B] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all active:scale-95"
            >
              Execute Range Query
            </button>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {treeType === 'bplus'
                ? 'Follows horizontal nextLeaf pointers across linked leaf nodes sequentially in O(log n + k).'
                : 'Traverses in-order binary subtrees between specified bounds.'}
            </p>
          </form>
        )}
      </div>

      {/* Quick Presets Section */}
      <div className="p-4 border-b border-[#1E293B] flex-1 bg-[#0D131F]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sample Presets</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">1-Click</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p.id)}
              className="group text-left px-3 py-2 rounded-lg bg-[#070B12] hover:bg-[#1E293B] border border-[#1E293B] hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between shadow-sm"
            >
              <span className="group-hover:translate-x-0.5 transition-transform">{p.label}</span>
              <span className="text-cyan-400 text-[11px] font-mono opacity-80 group-hover:opacity-100 group-hover:text-cyan-300">
                Run →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Telemetry Summary Card */}
      <div className="p-3.5 bg-[#070B12] border-t border-[#1E293B]">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Live Telemetry</span>
          <span className="text-cyan-400 font-mono">Realtime</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-[#0D131F] p-2.5 rounded-lg border border-[#1E293B]">
            <div className="text-[10px] text-slate-500 font-sans">Tree Height</div>
            <div className="text-base font-extrabold text-cyan-400">{telemetry.height}</div>
          </div>
          <div className="bg-[#0D131F] p-2.5 rounded-lg border border-[#1E293B]">
            <div className="text-[10px] text-slate-500 font-sans">Key Count</div>
            <div className="text-base font-extrabold text-indigo-400">{telemetry.keyCount}</div>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-400 bg-[#0D131F] p-2 rounded-lg border border-[#1E293B]/70 font-mono">
          <span className="text-amber-400 font-sans font-semibold">Balance: </span>
          <span>{telemetry.balanceOrOccupancy}</span>
        </div>
      </div>
    </aside>
  );
};
