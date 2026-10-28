/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TreeType, StepSnapshot, StepTelemetry, AVLNodeSnapshot, BPlusNodeSnapshot } from './types/tree';
import { AVLTree } from './algorithms/avlTree';
import { BPlusTree } from './algorithms/bPlusTree';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { RightStepsGuide } from './components/RightStepsGuide';
import { TreeCanvas } from './components/TreeCanvas';

export default function App() {
  const [treeType, setTreeType] = useState<TreeType>('avl');
  const [bplusOrder, setBplusOrder] = useState<number>(3);

  // Tree instances
  const avlTreeRef = useRef<AVLTree>(new AVLTree([40, 20, 60, 10, 30, 50, 70]));
  const bplusTreeRef = useRef<BPlusTree>(new BPlusTree(3, [10, 20, 30, 40, 50, 60]));

  // Live snapshots for tree canvas
  const [avlSnapshot, setAvlSnapshot] = useState<AVLNodeSnapshot | null>(null);
  const [bplusSnapshot, setBplusSnapshot] = useState<BPlusNodeSnapshot | null>(null);

  // Recorded operation snapshots for Steps Guide
  const [recordedSnapshots, setRecordedSnapshots] = useState<StepSnapshot[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Live Telemetry state
  const [telemetry, setTelemetry] = useState<StepTelemetry>({
    height: 3,
    nodeCount: 7,
    keyCount: 7,
    balanceOrOccupancy: 'BF range: [0, 0] (Strict AVL: [-1, 1])',
    stepsNeeded: 'Initialized',
    operationResult: 'AVL Tree ready with 7 balanced nodes',
    isSuccess: true,
  });

  // Sync tree live state to UI
  const syncLiveState = useCallback((lastStepsNeeded?: string, lastOpResult?: string, isSuccess = true) => {
    if (treeType === 'avl') {
      const avl = avlTreeRef.current;
      const snap = avl.root ? avl.root.toSnapshot() : null;
      setAvlSnapshot(snap);

      const bfRange = avl.getBalanceFactorRange();
      const bfStr = avl.root ? `[${bfRange.min}, ${bfRange.max}]` : '0';

      setTelemetry({
        height: avl.getHeight(),
        nodeCount: avl.getNodeCount(),
        keyCount: avl.getAllKeys().length,
        balanceOrOccupancy: `BF range: ${bfStr} (Strict AVL: [-1, 1])`,
        stepsNeeded: lastStepsNeeded || 'Ready',
        operationResult: lastOpResult || 'AVL Tree ready',
        isSuccess,
      });
    } else {
      const bp = bplusTreeRef.current;
      const snap = bp.root.toSnapshot();
      setBplusSnapshot(snap);

      setTelemetry({
        height: bp.getHeight(),
        nodeCount: bp.getNodeCount(),
        keyCount: bp.getAllKeys().length,
        balanceOrOccupancy: `Leaf Occupancy: ${bp.getLeafOccupancy()}`,
        stepsNeeded: lastStepsNeeded || 'Ready',
        operationResult: lastOpResult || `B+ Tree (Order ${bp.order}) ready`,
        isSuccess,
      });
    }
  }, [treeType]);

  // Initial sync on mount or tree type switch
  useEffect(() => {
    syncLiveState();
  }, [treeType, syncLiveState]);

  // Process an operation's recorded snapshots
  const handleOperationResult = (result: { snapshots: StepSnapshot[]; finalTelemetry: StepTelemetry }, autoPlay = true) => {
    setRecordedSnapshots(result.snapshots);
    setCurrentStepIndex(0);
    setTelemetry(result.finalTelemetry);

    // Update live snapshot
    if (treeType === 'avl') {
      setAvlSnapshot(avlTreeRef.current.root ? avlTreeRef.current.root.toSnapshot() : null);
    } else {
      setBplusSnapshot(bplusTreeRef.current.root.toSnapshot());
    }

    if (autoPlay && result.snapshots.length > 1) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setCurrentStepIndex(result.snapshots.length - 1);
    }
  };

  // Playback timer loop
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (isPlaying && recordedSnapshots.length > 0) {
      const intervalMs = Math.round(1400 / playbackSpeed);
      timerRef.current = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < recordedSnapshots.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, recordedSnapshots.length, playbackSpeed]);

  // Keyboard navigation Left/Right arrow
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') {
        setIsPlaying(false);
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setIsPlaying(false);
        setCurrentStepIndex(prev => Math.min(recordedSnapshots.length - 1, prev + 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [recordedSnapshots.length]);

  // User Actions
  const handleInsert = (key: number) => {
    if (treeType === 'avl') {
      const result = avlTreeRef.current.insert(key);
      handleOperationResult(result);
    } else {
      const result = bplusTreeRef.current.insert(key);
      handleOperationResult(result);
    }
  };

  const handleSearch = (key: number) => {
    if (treeType === 'avl') {
      const result = avlTreeRef.current.search(key);
      handleOperationResult(result);
    } else {
      const result = bplusTreeRef.current.search(key);
      handleOperationResult(result);
    }
  };

  const handleDelete = (key: number) => {
    if (treeType === 'avl') {
      const result = avlTreeRef.current.delete(key);
      handleOperationResult(result);
    } else {
      const result = bplusTreeRef.current.delete(key);
      handleOperationResult(result);
    }
  };

  const handleRangeQuery = (from: number, to: number) => {
    if (treeType === 'bplus') {
      const result = bplusTreeRef.current.rangeQuery(from, to);
      handleOperationResult(result);
    }
  };

  const handleResetTree = () => {
    setIsPlaying(false);
    setRecordedSnapshots([]);
    setCurrentStepIndex(0);
    if (treeType === 'avl') {
      avlTreeRef.current.clear();
      syncLiveState('Cleared', 'AVL Tree cleared to empty state');
    } else {
      bplusTreeRef.current.clear();
      syncLiveState('Cleared', `B+ Tree (Order ${bplusOrder}) cleared to empty state`);
    }
  };

  const handleBplusOrderChange = (order: number) => {
    setBplusOrder(order);
    bplusTreeRef.current = new BPlusTree(order, [10, 20, 30, 40, 50, 60]);
    setRecordedSnapshots([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    syncLiveState('Order Updated', `B+ Tree reinitialized with Order m = ${order}`);
  };

  const handleTreeTypeChange = (type: TreeType) => {
    setTreeType(type);
    setIsPlaying(false);
    setRecordedSnapshots([]);
    setCurrentStepIndex(0);
  };

  // Presets
  const handleApplyPreset = (presetId: string) => {
    setIsPlaying(false);
    if (treeType === 'avl') {
      switch (presetId) {
        case 'avl_balanced':
          avlTreeRef.current = new AVLTree([40, 20, 60, 10, 30, 50, 70]);
          setRecordedSnapshots([]);
          syncLiveState('Preset Applied', 'Balanced 7-Node AVL Tree loaded');
          break;
        case 'avl_ll': {
          avlTreeRef.current = new AVLTree([30, 20]);
          const result = avlTreeRef.current.insert(10);
          handleOperationResult(result);
          break;
        }
        case 'avl_rr': {
          avlTreeRef.current = new AVLTree([10, 20]);
          const result = avlTreeRef.current.insert(30);
          handleOperationResult(result);
          break;
        }
        case 'avl_lr': {
          avlTreeRef.current = new AVLTree([30, 10]);
          const result = avlTreeRef.current.insert(20);
          handleOperationResult(result);
          break;
        }
        case 'avl_rl': {
          avlTreeRef.current = new AVLTree([10, 30]);
          const result = avlTreeRef.current.insert(20);
          handleOperationResult(result);
          break;
        }
        case 'avl_delete_rebalance': {
          avlTreeRef.current = new AVLTree([20, 10, 40, 5, 30, 50, 60]);
          const result = avlTreeRef.current.delete(5);
          handleOperationResult(result);
          break;
        }
      }
    } else {
      switch (presetId) {
        case 'bplus_balanced':
          bplusTreeRef.current = new BPlusTree(bplusOrder, [10, 20, 30, 40, 50, 60]);
          setRecordedSnapshots([]);
          syncLiveState('Preset Applied', `Balanced B+ Tree (Order ${bplusOrder}) loaded`);
          break;
        case 'bplus_leaf_split': {
          bplusTreeRef.current = new BPlusTree(3, [10, 20]);
          const result = bplusTreeRef.current.insert(30);
          handleOperationResult(result);
          break;
        }
        case 'bplus_internal_split': {
          bplusTreeRef.current = new BPlusTree(3, [10, 20, 30, 40, 50]);
          const result = bplusTreeRef.current.insert(60);
          handleOperationResult(result);
          break;
        }
        case 'bplus_range_demo': {
          bplusTreeRef.current = new BPlusTree(bplusOrder, [10, 20, 30, 40, 50, 60, 70, 80]);
          const result = bplusTreeRef.current.rangeQuery(20, 60);
          handleOperationResult(result);
          break;
        }
        case 'bplus_borrow_merge': {
          bplusTreeRef.current = new BPlusTree(3, [10, 20, 30, 40]);
          const result = bplusTreeRef.current.delete(10);
          handleOperationResult(result);
          break;
        }
      }
    }
  };

  // Determine current active snapshot to display on canvas
  const activeSnapshot = recordedSnapshots.length > 0
    ? recordedSnapshots[currentStepIndex]
    : null;

  const currentDisplayAvl = activeSnapshot
    ? activeSnapshot.avlTree ?? null
    : avlSnapshot;

  const currentDisplayBplus = activeSnapshot
    ? activeSnapshot.bplusTree ?? null
    : bplusSnapshot;

  const highlightNodeIds = activeSnapshot ? activeSnapshot.highlightNodeIds : [];
  const highlightKeys = activeSnapshot ? activeSnapshot.highlightKeys : [];
  const unbalancedNodeId = activeSnapshot ? activeSnapshot.unbalancedNodeId : undefined;
  const rotationType = activeSnapshot ? activeSnapshot.rotationType : undefined;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070B12] text-white overflow-hidden select-none">
      {/* 1. Top Header with prominent center tabs for AVL & B+ Tree */}
      <Header
        treeType={treeType}
        onTreeTypeChange={handleTreeTypeChange}
        bplusOrder={bplusOrder}
        onBplusOrderChange={handleBplusOrderChange}
        onResetTree={handleResetTree}
        nodeCount={telemetry.nodeCount}
        height={telemetry.height}
      />

      {/* 2. Main 3-Column Layout: LeftPanel (Tree Lab), Center (Canvas), Right (Steps Guide) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left: Tree Lab with Insert / Search / Delete / Range tabs */}
        <LeftPanel
          treeType={treeType}
          onInsert={handleInsert}
          onSearch={handleSearch}
          onDelete={handleDelete}
          onRangeQuery={handleRangeQuery}
          onApplyPreset={handleApplyPreset}
          telemetry={activeSnapshot ? activeSnapshot.telemetry : telemetry}
        />

        {/* Center: Pure SVG Interactive Canvas */}
        <main className="flex-1 relative flex flex-col min-h-0 min-w-0 bg-[#181514]">
          <TreeCanvas
            treeType={treeType}
            avlSnapshot={currentDisplayAvl}
            bplusSnapshot={currentDisplayBplus}
            highlightNodeIds={highlightNodeIds}
            highlightKeys={highlightKeys}
            unbalancedNodeId={unbalancedNodeId}
            rotationType={rotationType}
          />
        </main>

        {/* Right: Elaborate Steps Guide for Explaining Operations and Clarifying Doubts */}
        <RightStepsGuide
          treeType={treeType}
          snapshots={recordedSnapshots}
          currentStepIndex={currentStepIndex}
          onSelectStep={idx => {
            setIsPlaying(false);
            setCurrentStepIndex(idx);
          }}
          isPlaying={isPlaying}
          onPlayToggle={() => setIsPlaying(p => !p)}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          onRestart={() => {
            setCurrentStepIndex(0);
            setIsPlaying(true);
          }}
        />
      </div>
    </div>
  );
}
