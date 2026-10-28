/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TreeType = 'avl' | 'bplus';
export type ViewMode = 'lab' | 'explorer';

export interface AVLNodeSnapshot {
  id: string;
  key: number;
  height: number;
  balanceFactor: number;
  left: AVLNodeSnapshot | null;
  right: AVLNodeSnapshot | null;
}

export interface BPlusNodeSnapshot {
  id: string;
  isLeaf: boolean;
  keys: number[];
  children?: BPlusNodeSnapshot[];
  nextLeafId?: string | null;
  prevLeafId?: string | null;
}

export type StepPhase = 
  | 'start'
  | 'search'
  | 'found'
  | 'not_found'
  | 'insert'
  | 'delete'
  | 'detect_imbalance'
  | 'rotate'
  | 'rebalance'
  | 'split_leaf'
  | 'split_internal'
  | 'borrow'
  | 'merge'
  | 'contract'
  | 'range_scan'
  | 'complete';

export interface StepTelemetry {
  height: number;
  nodeCount: number;
  keyCount: number;
  balanceOrOccupancy: string;
  stepsNeeded: string;
  operationResult: string;
  isSuccess: boolean;
}

export interface StepSnapshot {
  stepIndex: number;
  totalSteps: number;
  title: string;
  description: string;
  phase: StepPhase;
  highlightNodeIds: string[];
  highlightKeys: number[];
  highlightEdgeIds?: string[];
  rotationType?: 'LL' | 'RR' | 'LR' | 'RL';
  unbalancedNodeId?: string;
  avlTree?: AVLNodeSnapshot | null;
  bplusTree?: BPlusNodeSnapshot | null;
  telemetry: StepTelemetry;
  codeExplanation?: string;
}

export interface TreeOperationResult {
  snapshots: StepSnapshot[];
  finalTelemetry: StepTelemetry;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isLeaf?: boolean;
  keys?: number[];
  key?: number;
  balanceFactor?: number;
  nodeHeight?: number;
  parentId?: string | null;
  nextLeafId?: string | null;
  prevLeafId?: string | null;
}

export interface EdgePath {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isLeafLink?: boolean;
}

export interface TreeLayoutResult {
  nodes: NodePosition[];
  edges: EdgePath[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}
