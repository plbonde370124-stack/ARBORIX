/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StepSnapshot, TreeType } from '../types/tree';
import {
  Compass,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface RightStepsGuideProps {
  treeType: TreeType;
  snapshots: StepSnapshot[];
  currentStepIndex: number;
  onSelectStep: (index: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onRestart: () => void;
}

export const RightStepsGuide: React.FC<RightStepsGuideProps> = ({
  treeType,
  snapshots,
  currentStepIndex,
  onSelectStep,
  isPlaying,
  onPlayToggle,
  playbackSpeed,
  onSpeedChange,
  onRestart,
}) => {
  const [isDoubtHelperOpen, setIsDoubtHelperOpen] = useState<boolean>(false);
  const activeStepRef = useRef<HTMLDivElement | null>(null);

  const currentSnapshot = snapshots[currentStepIndex] || null;
  const totalSteps = snapshots.length;

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStepIndex]);

  const getPhaseBadge = (snapshot: StepSnapshot) => {
    if (snapshot.rotationType) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.25)]">
          {snapshot.rotationType} Rotation
        </span>
      );
    }
    switch (snapshot.phase) {
      case 'split_leaf':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
            Leaf Split
          </span>
        );
      case 'split_internal':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.25)]">
            Internal Split
          </span>
        );
      case 'borrow':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Sibling Borrow
          </span>
        );
      case 'merge':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-600/20 text-amber-200 border border-amber-600/40">
            Sibling Merge
          </span>
        );
      case 'detect_imbalance':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            Imbalance
          </span>
        );
      case 'search':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-cyan-300 border border-cyan-800/40">
            Routing
          </span>
        );
      case 'range_scan':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Leaf Scan
          </span>
        );
      case 'complete':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
            Balanced
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-400">
            {snapshot.phase}
          </span>
        );
    }
  };

  return (
    <aside className="w-96 bg-[#0D131F] border-l border-[#1E293B] flex flex-col shrink-0 select-none overflow-hidden h-full z-10">
      {/* Top Header */}
      <div className="p-3.5 border-b border-[#1E293B] flex items-center justify-between bg-[#0B0F19]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
            <Compass className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-white tracking-wide">Steps Guide</h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#070B12] text-indigo-300 border border-[#1E293B]">
          {totalSteps > 0 ? `${totalSteps} Steps` : 'Standby'}
        </span>
      </div>

      {/* Playback & Step Controls Bar */}
      {totalSteps > 0 && (
        <div className="p-3.5 border-b border-[#1E293B] bg-[#070B12]/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-cyan-400 font-bold">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Speed:</span>
              <div className="flex items-center bg-[#0D131F] p-0.5 rounded-md border border-[#1E293B]">
                {[0.5, 1, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => onSpeedChange(speed)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-all ${
                      playbackSpeed === speed
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrubber slider */}
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStepIndex}
            onChange={e => onSelectStep(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />

          {/* Button Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onRestart}
              className="p-1.5 rounded-lg bg-[#0D131F] hover:bg-[#1E293B] text-slate-400 hover:text-white border border-[#1E293B] transition-colors"
              title="Restart from step 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectStep(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#111827] hover:bg-[#1E293B] disabled:opacity-30 text-slate-200 border border-[#1E293B] transition-all"
              >
                <SkipBack className="w-3 h-3" />
                <span>Prev</span>
              </button>

              <button
                onClick={onPlayToggle}
                className="flex items-center gap-1.5 px-4 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all active:scale-95"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>{currentStepIndex >= totalSteps - 1 ? 'Replay' : 'Play'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onSelectStep(Math.min(totalSteps - 1, currentStepIndex + 1))}
                disabled={currentStepIndex >= totalSteps - 1}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-[#111827] hover:bg-[#1E293B] disabled:opacity-30 text-slate-200 border border-[#1E293B] transition-all"
              >
                <span>Next</span>
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Spotlight on Current Step */}
        {currentSnapshot ? (
          <div className="bg-gradient-to-b from-[#111827] to-[#0D131F] border border-cyan-500/40 rounded-xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.12)] flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 flex items-center justify-center text-xs font-extrabold font-mono shadow-sm">
                  {currentSnapshot.stepIndex}
                </span>
                <span className="text-xs font-bold text-white tracking-wide">
                  {currentSnapshot.title}
                </span>
              </div>
              {getPhaseBadge(currentSnapshot)}
            </div>

            {/* Description */}
            <p className="text-xs text-slate-200 leading-relaxed font-normal">
              {currentSnapshot.description}
            </p>

            {/* Deep Algorithmic Explanation */}
            {currentSnapshot.codeExplanation && (
              <div className="bg-[#070B12] rounded-lg p-3 border border-[#1E293B] text-[11px] font-mono text-cyan-300 leading-relaxed shadow-inner">
                <div className="text-[10px] uppercase text-slate-400 mb-1 font-sans font-bold tracking-wider">
                  Algorithm Invariant / Rule:
                </div>
                {currentSnapshot.codeExplanation}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#070B12] border border-[#1E293B] rounded-xl p-5 text-center text-xs text-slate-400">
            <Sparkles className="w-7 h-7 text-cyan-400 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-200 mb-1">Awaiting operation</p>
            <p className="text-slate-400">
              Trigger an Insert, Search, Delete, or Range query from the left panel to follow the step-by-step breakdown.
            </p>
          </div>
        )}

        {/* Chronological Steps Breakdown List */}
        {totalSteps > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[10px]">
                Execution Timeline
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Interactive</span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {snapshots.map((snap, idx) => {
                const isSelected = idx === currentStepIndex;
                return (
                  <div
                    key={idx}
                    ref={isSelected ? activeStepRef : null}
                    onClick={() => onSelectStep(idx)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#1E293B] border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.2)] text-white'
                        : 'bg-[#070B12] border-[#1E293B] text-slate-400 hover:bg-[#111827] hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                        <span className="font-mono text-[11px] text-cyan-400">#{idx + 1}</span>
                        <span className="line-clamp-1">{snap.title}</span>
                      </div>
                      {getPhaseBadge(snap)}
                    </div>
                    <p className="text-[11px] line-clamp-2 leading-relaxed opacity-90">
                      {snap.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clarify Doubts & Core Concepts Guide */}
        <div className="mt-auto border-t border-[#1E293B] pt-3">
          <button
            onClick={() => setIsDoubtHelperOpen(!isDoubtHelperOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#070B12] hover:bg-[#111827] border border-[#1E293B] text-xs font-semibold text-slate-200 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>Clarify Doubts: {treeType === 'avl' ? 'AVL Rules' : 'B+ Tree Rules'}</span>
            </div>
            {isDoubtHelperOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {isDoubtHelperOpen && (
            <div className="mt-2.5 p-3.5 bg-[#070B12] rounded-xl border border-[#1E293B] text-xs text-slate-300 flex flex-col gap-3 animate-fadeIn leading-relaxed">
              {treeType === 'avl' ? (
                <>
                  <div>
                    <strong className="text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      Balance Factor:
                    </strong>
                    <div className="font-mono text-cyan-300 text-[11px] mt-1 bg-[#0D131F] p-1.5 rounded border border-[#1E293B]">
                      BF(node) = height(left) - height(right)
                    </div>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Balanced when BF &isin; &#123;-1, 0, 1&#125;. If |BF| &ge; 2, rebalancing rotation is triggered immediately.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#1E293B]">
                    <strong className="text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      The 4 AVL Rotations:
                    </strong>
                    <ul className="text-[11px] mt-1.5 space-y-1.5 text-slate-300 font-sans">
                      <li><strong className="text-cyan-400">LL (Single Right):</strong> BF=+2, left child BF &ge; 0.</li>
                      <li><strong className="text-cyan-400">RR (Single Left):</strong> BF=-2, right child BF &le; 0.</li>
                      <li><strong className="text-indigo-400">LR (Double):</strong> BF=+2, left child BF &lt; 0. Left-rotate child, then Right-rotate parent.</li>
                      <li><strong className="text-indigo-400">RL (Double):</strong> BF=-2, right child BF &gt; 0. Right-rotate child, then Left-rotate parent.</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <strong className="text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      B+ Tree Invariants (Order m):
                    </strong>
                    <ul className="text-[11px] mt-1.5 space-y-1.5 text-slate-300 font-sans">
                      <li>Leaves store up to <span className="text-amber-400 font-mono">m - 1</span> keys and min <span className="text-amber-400 font-mono">&lceil;(m-1)/2&rceil;</span> keys.</li>
                      <li>Internal nodes serve solely as routers with separator keys.</li>
                      <li>Leaves are horizontally linked via <strong className="text-amber-400 font-mono">nextLeaf</strong> pointers.</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-[#1E293B]">
                    <strong className="text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                      Splits & Range Scans:
                    </strong>
                    <p className="text-[11px] mt-1 text-slate-400">
                      When leaf node overflows (&ge; m keys), it splits in two. The smallest key of right leaf is copied up to the parent. Range queries scan leaf links horizontally in O(log n + k).
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
