/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AVLNodeSnapshot, StepSnapshot, TreeOperationResult, StepTelemetry } from '../types/tree';

export class AVLNode {
  id: string;
  key: number;
  height: number;
  left: AVLNode | null;
  right: AVLNode | null;

  constructor(key: number, id?: string) {
    this.key = key;
    this.height = 1;
    this.left = null;
    this.right = null;
    this.id = id || `avl-${key}-${Math.random().toString(36).substring(2, 7)}`;
  }

  get balanceFactor(): number {
    const leftH = this.left ? this.left.height : 0;
    const rightH = this.right ? this.right.height : 0;
    return leftH - rightH;
  }

  updateHeight(): void {
    const leftH = this.left ? this.left.height : 0;
    const rightH = this.right ? this.right.height : 0;
    this.height = Math.max(leftH, rightH) + 1;
  }

  clone(): AVLNode {
    const copy = new AVLNode(this.key, this.id);
    copy.height = this.height;
    if (this.left) copy.left = this.left.clone();
    if (this.right) copy.right = this.right.clone();
    return copy;
  }

  toSnapshot(): AVLNodeSnapshot {
    return {
      id: this.id,
      key: this.key,
      height: this.height,
      balanceFactor: this.balanceFactor,
      left: this.left ? this.left.toSnapshot() : null,
      right: this.right ? this.right.toSnapshot() : null,
    };
  }
}

export class AVLTree {
  root: AVLNode | null = null;
  private rotationCountLastOp = 0;

  constructor(initialKeys?: number[]) {
    if (initialKeys && initialKeys.length > 0) {
      for (const k of initialKeys) {
        this.insertSilent(k);
      }
    }
  }

  clone(): AVLTree {
    const newTree = new AVLTree();
    if (this.root) {
      newTree.root = this.root.clone();
    }
    return newTree;
  }

  clear(): void {
    this.root = null;
    this.rotationCountLastOp = 0;
  }

  getHeight(): number {
    return this.root ? this.root.height : 0;
  }

  getNodeCount(node: AVLNode | null = this.root): number {
    if (!node) return 0;
    return 1 + this.getNodeCount(node.left) + this.getNodeCount(node.right);
  }

  getAllKeys(node: AVLNode | null = this.root, keys: number[] = []): number[] {
    if (!node) return keys;
    this.getAllKeys(node.left, keys);
    keys.push(node.key);
    this.getAllKeys(node.right, keys);
    return keys;
  }

  getBalanceFactorRange(): { min: number; max: number } {
    if (!this.root) return { min: 0, max: 0 };
    let min = 0;
    let max = 0;
    const traverse = (node: AVLNode | null) => {
      if (!node) return;
      const bf = node.balanceFactor;
      if (bf < min) min = bf;
      if (bf > max) max = bf;
      traverse(node.left);
      traverse(node.right);
    };
    traverse(this.root);
    return { min, max };
  }

  private createTelemetry(
    stepsNeeded: string,
    operationResult: string,
    isSuccess: boolean
  ): StepTelemetry {
    const bfRange = this.getBalanceFactorRange();
    const bfStr = this.root ? `[${bfRange.min}, ${bfRange.max}]` : '0';
    return {
      height: this.getHeight(),
      nodeCount: this.getNodeCount(),
      keyCount: this.getAllKeys().length,
      balanceOrOccupancy: `BF range: ${bfStr} (Strict AVL: [-1, 1])`,
      stepsNeeded,
      operationResult,
      isSuccess,
    };
  }

  insertSilent(key: number): void {
    this.root = this.insertNodeSilent(this.root, key);
  }

  private insertNodeSilent(node: AVLNode | null, key: number): AVLNode {
    if (!node) return new AVLNode(key);
    if (key < node.key) {
      node.left = this.insertNodeSilent(node.left, key);
    } else if (key > node.key) {
      node.right = this.insertNodeSilent(node.right, key);
    } else {
      return node; // Duplicate
    }

    node.updateHeight();
    const bf = node.balanceFactor;

    // LL
    if (bf > 1 && (node.left ? node.left.balanceFactor >= 0 : false)) {
      return this.rotateRight(node);
    }
    // RR
    if (bf < -1 && (node.right ? node.right.balanceFactor <= 0 : false)) {
      return this.rotateLeft(node);
    }
    // LR
    if (bf > 1 && (node.left ? node.left.balanceFactor < 0 : false)) {
      node.left = this.rotateLeft(node.left!);
      return this.rotateRight(node);
    }
    // RL
    if (bf < -1 && (node.right ? node.right.balanceFactor > 0 : false)) {
      node.right = this.rotateRight(node.right!);
      return this.rotateLeft(node);
    }

    return node;
  }

  // --- Rotations ---
  private rotateRight(y: AVLNode): AVLNode {
    const x = y.left!;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    y.updateHeight();
    x.updateHeight();
    return x;
  }

  private rotateLeft(x: AVLNode): AVLNode {
    const y = x.right!;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    x.updateHeight();
    y.updateHeight();
    return y;
  }

  // --- Step-by-Step Operations ---

  insert(key: number): TreeOperationResult {
    const rawSnapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[] = [];
    this.rotationCountLastOp = 0;

    // Initial snapshot
    rawSnapshots.push({
      title: `Starting Insertion of Key ${key}`,
      description: `Initiate insertion of key ${key} into the AVL tree following binary search tree properties.`,
      phase: 'start',
      highlightNodeIds: this.root ? [this.root.id] : [],
      highlightKeys: [key],
      avlTree: this.root ? this.root.toSnapshot() : null,
      telemetry: this.createTelemetry('Evaluating...', `Inserting key ${key}`, true),
      codeExplanation: `Traverse starting from root to find insertion position for key ${key}.`,
    });

    let duplicateFound = false;

    const insertAndTrace = (node: AVLNode | null, path: AVLNode[]): AVLNode => {
      if (!node) {
        const newNode = new AVLNode(key);
        rawSnapshots.push({
          title: `Inserted New Node ${key}`,
          description: `Key ${key} placed as a new leaf node at height 1. Next, ancestor heights and balance factors will be checked.`,
          phase: 'insert',
          highlightNodeIds: [newNode.id],
          highlightKeys: [key],
          avlTree: this.buildVirtualSnapshotWithNewNode(path, newNode),
          telemetry: this.createTelemetry('In progress', `Node ${key} added at leaf`, true),
          codeExplanation: `BST placement complete. Ascending to verify balance factor balance = height(left) - height(right).`,
        });
        return newNode;
      }

      path.push(node);

      if (key < node.key) {
        rawSnapshots.push({
          title: `Compare with Node ${node.key}`,
          description: `${key} < ${node.key}: branching left down the subtree.`,
          phase: 'search',
          highlightNodeIds: [node.id],
          highlightKeys: [key, node.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Traversing', `Descending left from ${node.key}`, true),
          codeExplanation: `BST traversal: key ${key} is less than ${node.key}, follow left child pointer.`,
        });
        node.left = insertAndTrace(node.left, [...path]);
      } else if (key > node.key) {
        rawSnapshots.push({
          title: `Compare with Node ${node.key}`,
          description: `${key} > ${node.key}: branching right down the subtree.`,
          phase: 'search',
          highlightNodeIds: [node.id],
          highlightKeys: [key, node.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Traversing', `Descending right from ${node.key}`, true),
          codeExplanation: `BST traversal: key ${key} is greater than ${node.key}, follow right child pointer.`,
        });
        node.right = insertAndTrace(node.right, [...path]);
      } else {
        duplicateFound = true;
        rawSnapshots.push({
          title: `Duplicate Key ${key}`,
          description: `Key ${key} already exists in the tree at node ${node.key}. AVL trees maintain unique keys.`,
          phase: 'complete',
          highlightNodeIds: [node.id],
          highlightKeys: [key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('1 step', `Key ${key} already exists (duplicate)`, false),
          codeExplanation: `Duplicate key detected. No modification performed.`,
        });
        return node;
      }

      if (duplicateFound) return node;

      // Update height and compute BF
      node.updateHeight();
      const bf = node.balanceFactor;

      rawSnapshots.push({
        title: `Calculate BF for Node ${node.key}`,
        description: `Node ${node.key} height updated to ${node.height}. Balance Factor (L - R) = ${bf}.`,
        phase: Math.abs(bf) > 1 ? 'detect_imbalance' : 'rebalance',
        highlightNodeIds: [node.id],
        highlightKeys: [node.key],
        unbalancedNodeId: Math.abs(bf) > 1 ? node.id : undefined,
        avlTree: this.root ? this.root.toSnapshot() : null,
        telemetry: this.createTelemetry(
          'Checking balance',
          Math.abs(bf) > 1 ? `Imbalance detected at node ${node.key} (BF = ${bf})` : `Node ${node.key} balanced (BF = ${bf})`,
          true
        ),
        codeExplanation: `Balance Factor = height(${node.left?.key ?? 'null'}) - height(${node.right?.key ?? 'null'}) = ${bf}. Required: -1 <= BF <= 1.`,
      });

      // LL Case
      if (bf > 1 && (node.left ? node.left.balanceFactor >= 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `Left-Left (LL) Imbalance at ${node.key}`,
          description: `Node ${node.key} has BF = ${bf} (left-heavy) and left child ${node.left!.key} has BF >= 0. Performing Single Right Rotation.`,
          phase: 'rotate',
          rotationType: 'LL',
          highlightNodeIds: [node.id, node.left!.id],
          highlightKeys: [node.key, node.left!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Rotation', `LL Case: Single Right Rotation on ${node.key}`, true),
          codeExplanation: `LL rotation pulls left child ${node.left!.key} up to become root of this subtree, with ${node.key} as right child.`,
        });

        const rotated = this.rotateRight(node);

        rawSnapshots.push({
          title: `LL Rotation Complete`,
          description: `Single Right Rotation complete. Subtree root is now ${rotated.key} with BF = ${rotated.balanceFactor}.`,
          phase: 'rebalance',
          rotationType: 'LL',
          highlightNodeIds: [rotated.id],
          highlightKeys: [rotated.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Balanced', `LL rotation completed on ${node.key}`, true),
          codeExplanation: `Heights and balance factors restored to valid AVL range.`,
        });
        return rotated;
      }

      // RR Case
      if (bf < -1 && (node.right ? node.right.balanceFactor <= 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `Right-Right (RR) Imbalance at ${node.key}`,
          description: `Node ${node.key} has BF = ${bf} (right-heavy) and right child ${node.right!.key} has BF <= 0. Performing Single Left Rotation.`,
          phase: 'rotate',
          rotationType: 'RR',
          highlightNodeIds: [node.id, node.right!.id],
          highlightKeys: [node.key, node.right!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Rotation', `RR Case: Single Left Rotation on ${node.key}`, true),
          codeExplanation: `RR rotation elevates right child ${node.right!.key} to subtree root, pushing ${node.key} down as left child.`,
        });

        const rotated = this.rotateLeft(node);

        rawSnapshots.push({
          title: `RR Rotation Complete`,
          description: `Single Left Rotation complete. Subtree root is now ${rotated.key} with BF = ${rotated.balanceFactor}.`,
          phase: 'rebalance',
          rotationType: 'RR',
          highlightNodeIds: [rotated.id],
          highlightKeys: [rotated.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Balanced', `RR rotation completed on ${node.key}`, true),
          codeExplanation: `Heights and balance factors restored to valid AVL range.`,
        });
        return rotated;
      }

      // LR Case
      if (bf > 1 && (node.left ? node.left.balanceFactor < 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `Left-Right (LR) Imbalance at ${node.key}`,
          description: `Node ${node.key} has BF = ${bf} (left-heavy) and left child ${node.left!.key} has BF = ${node.left!.balanceFactor} (right-heavy). Requires Double Rotation: Left on ${node.left!.key}, then Right on ${node.key}.`,
          phase: 'rotate',
          rotationType: 'LR',
          highlightNodeIds: [node.id, node.left!.id],
          highlightKeys: [node.key, node.left!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Double Rotation', `LR Step 1: Left rotate child ${node.left!.key}`, true),
          codeExplanation: `Step 1 of LR: Rotate left on child ${node.left!.key} to align both signs in the left branch.`,
        });

        node.left = this.rotateLeft(node.left!);

        rawSnapshots.push({
          title: `LR Step 1 Complete (Left Rotation on ${node.left.key})`,
          description: `Left child rotation complete. Now executing Step 2: Single Right Rotation on ${node.key}.`,
          phase: 'rotate',
          rotationType: 'LR',
          highlightNodeIds: [node.id, node.left.id],
          highlightKeys: [node.key, node.left.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Double Rotation', `LR Step 2: Right rotate parent ${node.key}`, true),
          codeExplanation: `Child is now aligned. Performing final right rotation on ${node.key}.`,
        });

        const rotated = this.rotateRight(node);

        rawSnapshots.push({
          title: `LR Double Rotation Complete`,
          description: `LR rotation fully resolved. New subtree root is ${rotated.key} with BF = ${rotated.balanceFactor}.`,
          phase: 'rebalance',
          rotationType: 'LR',
          highlightNodeIds: [rotated.id],
          highlightKeys: [rotated.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Balanced', `LR rotation completed on ${node.key}`, true),
          codeExplanation: `Subtree perfectly rebalanced after two rotation steps.`,
        });
        return rotated;
      }

      // RL Case
      if (bf < -1 && (node.right ? node.right.balanceFactor > 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `Right-Left (RL) Imbalance at ${node.key}`,
          description: `Node ${node.key} has BF = ${bf} (right-heavy) and right child ${node.right!.key} has BF = ${node.right!.balanceFactor} (left-heavy). Requires Double Rotation: Right on ${node.right!.key}, then Left on ${node.key}.`,
          phase: 'rotate',
          rotationType: 'RL',
          highlightNodeIds: [node.id, node.right!.id],
          highlightKeys: [node.key, node.right!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Double Rotation', `RL Step 1: Right rotate child ${node.right!.key}`, true),
          codeExplanation: `Step 1 of RL: Rotate right on child ${node.right!.key} to align both signs in the right branch.`,
        });

        node.right = this.rotateRight(node.right!);

        rawSnapshots.push({
          title: `RL Step 1 Complete (Right Rotation on ${node.right.key})`,
          description: `Right child rotation complete. Now executing Step 2: Single Left Rotation on ${node.key}.`,
          phase: 'rotate',
          rotationType: 'RL',
          highlightNodeIds: [node.id, node.right.id],
          highlightKeys: [node.key, node.right.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Double Rotation', `RL Step 2: Left rotate parent ${node.key}`, true),
          codeExplanation: `Child is now aligned. Performing final left rotation on ${node.key}.`,
        });

        const rotated = this.rotateLeft(node);

        rawSnapshots.push({
          title: `RL Double Rotation Complete`,
          description: `RL rotation fully resolved. New subtree root is ${rotated.key} with BF = ${rotated.balanceFactor}.`,
          phase: 'rebalance',
          rotationType: 'RL',
          highlightNodeIds: [rotated.id],
          highlightKeys: [rotated.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Balanced', `RL rotation completed on ${node.key}`, true),
          codeExplanation: `Subtree perfectly rebalanced after two rotation steps.`,
        });
        return rotated;
      }

      return node;
    };

    this.root = insertAndTrace(this.root, []);

    // Final completed snapshot
    const totalSteps = rawSnapshots.length + 1;
    const finalResultBadge = duplicateFound
      ? `Key ${key} was a duplicate (no changes)`
      : this.rotationCountLastOp > 0
      ? `Key ${key} inserted with ${this.rotationCountLastOp} rotation(s)`
      : `Key ${key} inserted smoothly (tree remained balanced)`;

    const finalTelemetry = this.createTelemetry(
      `Insert ${key} took ${totalSteps} steps${this.rotationCountLastOp > 0 ? ` (${this.rotationCountLastOp} rotation)` : ''}`,
      finalResultBadge,
      !duplicateFound
    );

    rawSnapshots.push({
      title: duplicateFound ? `Insertion Skipped (Duplicate)` : `Insertion of Key ${key} Complete`,
      description: duplicateFound
        ? `Tree unchanged since key ${key} was already present.`
        : `Key ${key} is securely positioned in the AVL tree with height ${this.getHeight()}. Invariants preserved.`,
      phase: 'complete',
      highlightNodeIds: [],
      highlightKeys: [key],
      avlTree: this.root ? this.root.toSnapshot() : null,
      telemetry: finalTelemetry,
      codeExplanation: `AVL Tree is strictly balanced: all node balance factors in {-1, 0, 1}.`,
    });

    const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
      ...snap,
      stepIndex: idx + 1,
      totalSteps: rawSnapshots.length,
      // Fix snapshots to reflect final tree in early steps or consistent tree state
      avlTree: snap.avlTree ?? (this.root ? this.root.toSnapshot() : null),
    }));

    return {
      snapshots,
      finalTelemetry,
    };
  }

  delete(key: number): TreeOperationResult {
    const rawSnapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[] = [];
    this.rotationCountLastOp = 0;

    rawSnapshots.push({
      title: `Starting Deletion of Key ${key}`,
      description: `Locate key ${key} via binary search tree traversal, remove it, and rebalance ancestors bottom-up.`,
      phase: 'start',
      highlightNodeIds: this.root ? [this.root.id] : [],
      highlightKeys: [key],
      avlTree: this.root ? this.root.toSnapshot() : null,
      telemetry: this.createTelemetry('Evaluating...', `Deleting key ${key}`, true),
      codeExplanation: `Search down the tree to locate key ${key}.`,
    });

    let keyFound = false;

    const findMin = (node: AVLNode): AVLNode => {
      let curr = node;
      while (curr.left) curr = curr.left;
      return curr;
    };

    const deleteAndTrace = (node: AVLNode | null): AVLNode | null => {
      if (!node) {
        rawSnapshots.push({
          title: `Key ${key} Not Found`,
          description: `Reached leaf null pointer without encountering key ${key}. No deletion occurred.`,
          phase: 'not_found',
          highlightNodeIds: [],
          highlightKeys: [key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Finished', `Key ${key} not found`, false),
          codeExplanation: `Target key ${key} does not exist in the tree.`,
        });
        return null;
      }

      if (key < node.key) {
        rawSnapshots.push({
          title: `Searching Left for ${key}`,
          description: `${key} < ${node.key}: moving to left child.`,
          phase: 'search',
          highlightNodeIds: [node.id],
          highlightKeys: [key, node.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Searching', `Inspecting left subtree of ${node.key}`, true),
          codeExplanation: `Follow left pointer to find ${key}.`,
        });
        node.left = deleteAndTrace(node.left);
      } else if (key > node.key) {
        rawSnapshots.push({
          title: `Searching Right for ${key}`,
          description: `${key} > ${node.key}: moving to right child.`,
          phase: 'search',
          highlightNodeIds: [node.id],
          highlightKeys: [key, node.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Searching', `Inspecting right subtree of ${node.key}`, true),
          codeExplanation: `Follow right pointer to find ${key}.`,
        });
        node.right = deleteAndTrace(node.right);
      } else {
        // Key found
        keyFound = true;
        rawSnapshots.push({
          title: `Found Node ${node.key} to Delete`,
          description: `Located target key ${key}. Determining removal strategy based on child count.`,
          phase: 'delete',
          highlightNodeIds: [node.id],
          highlightKeys: [node.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Removing', `Removing node ${node.key}`, true),
          codeExplanation: `Node found. Cases: 0 children (leaf), 1 child, or 2 children (requires successor replacement).`,
        });

        // Case 1 or 2: 0 or 1 child
        if (!node.left || !node.right) {
          const replacement = node.left ? node.left : node.right;
          if (!replacement) {
            rawSnapshots.push({
              title: `Removed Leaf Node ${key}`,
              description: `Node ${key} had no children. Spliced out directly.`,
              phase: 'delete',
              highlightNodeIds: [],
              highlightKeys: [key],
              avlTree: null, // will be updated
              telemetry: this.createTelemetry('Removed', `Leaf node ${key} removed`, true),
              codeExplanation: `Leaf deletion: replaced with null.`,
            });
            return null;
          } else {
            rawSnapshots.push({
              title: `Bypassed Node ${key} with Child ${replacement.key}`,
              description: `Node ${key} had 1 child (${replacement.key}). Replaced with its child.`,
              phase: 'delete',
              highlightNodeIds: [replacement.id],
              highlightKeys: [key, replacement.key],
              avlTree: null,
              telemetry: this.createTelemetry('Replaced', `Node ${key} replaced by child ${replacement.key}`, true),
              codeExplanation: `Single child deletion: promote child to node's position.`,
            });
            return replacement;
          }
        } else {
          // Case 3: 2 children. Find in-order successor (min in right subtree)
          const successor = findMin(node.right);
          rawSnapshots.push({
            title: `Identify In-Order Successor ${successor.key}`,
            description: `Node ${key} has two children. Successor is the smallest node in right subtree: ${successor.key}.`,
            phase: 'search',
            highlightNodeIds: [node.id, successor.id],
            highlightKeys: [node.key, successor.key],
            avlTree: this.root ? this.root.toSnapshot() : null,
            telemetry: this.createTelemetry('Successor found', `In-order successor is ${successor.key}`, true),
            codeExplanation: `In-order successor maintains BST order. Replace ${node.key} key with ${successor.key}, then delete successor.`,
          });

          node.key = successor.key;
          node.id = `avl-${successor.key}-${Math.random().toString(36).substring(2, 7)}`;

          // Delete successor from right subtree
          const prevKey = key;
          // Temporarily delete successor
          node.right = this.deleteNodeSilent(node.right, successor.key);

          rawSnapshots.push({
            title: `Substituted with Successor ${successor.key}`,
            description: `Replaced key ${prevKey} with successor key ${successor.key}. Successor node removed from right subtree.`,
            phase: 'delete',
            highlightNodeIds: [node.id],
            highlightKeys: [successor.key],
            avlTree: this.root ? this.root.toSnapshot() : null,
            telemetry: this.createTelemetry('Replaced', `Successor ${successor.key} substituted`, true),
            codeExplanation: `Successor copied. Rebalancing right subtree ancestors.`,
          });
        }
      }

      if (!node) return null;

      node.updateHeight();
      const bf = node.balanceFactor;

      rawSnapshots.push({
        title: `Check Balance on Ancestor ${node.key}`,
        description: `Ancestor ${node.key} height is ${node.height}, BF = ${bf}.`,
        phase: Math.abs(bf) > 1 ? 'detect_imbalance' : 'rebalance',
        highlightNodeIds: [node.id],
        highlightKeys: [node.key],
        unbalancedNodeId: Math.abs(bf) > 1 ? node.id : undefined,
        avlTree: this.root ? this.root.toSnapshot() : null,
        telemetry: this.createTelemetry('Checking balance', `Ancestor ${node.key} BF = ${bf}`, true),
        codeExplanation: `Verifying AVL balance factor condition after deletion.`,
      });

      // Rotations on deletion
      // LL
      if (bf > 1 && (node.left ? node.left.balanceFactor >= 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `LL Rotation after Deletion at ${node.key}`,
          description: `Left child is left-heavy or balanced. Performing Single Right Rotation.`,
          phase: 'rotate',
          rotationType: 'LL',
          highlightNodeIds: [node.id, node.left!.id],
          highlightKeys: [node.key, node.left!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Rotation', `LL Rotation on ${node.key}`, true),
          codeExplanation: `Right rotation on ${node.key}.`,
        });
        return this.rotateRight(node);
      }

      // LR
      if (bf > 1 && (node.left ? node.left.balanceFactor < 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `LR Double Rotation after Deletion at ${node.key}`,
          description: `Left child is right-heavy. Performing Left-Right Double Rotation.`,
          phase: 'rotate',
          rotationType: 'LR',
          highlightNodeIds: [node.id, node.left!.id],
          highlightKeys: [node.key, node.left!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Double Rotation', `LR Double Rotation on ${node.key}`, true),
          codeExplanation: `Left rotate on ${node.left!.key}, then right rotate on ${node.key}.`,
        });
        node.left = this.rotateLeft(node.left!);
        return this.rotateRight(node);
      }

      // RR
      if (bf < -1 && (node.right ? node.right.balanceFactor <= 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `RR Rotation after Deletion at ${node.key}`,
          description: `Right child is right-heavy or balanced. Performing Single Left Rotation.`,
          phase: 'rotate',
          rotationType: 'RR',
          highlightNodeIds: [node.id, node.right!.id],
          highlightKeys: [node.key, node.right!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Rotation', `RR Rotation on ${node.key}`, true),
          codeExplanation: `Left rotation on ${node.key}.`,
        });
        return this.rotateLeft(node);
      }

      // RL
      if (bf < -1 && (node.right ? node.right.balanceFactor > 0 : false)) {
        this.rotationCountLastOp++;
        rawSnapshots.push({
          title: `RL Double Rotation after Deletion at ${node.key}`,
          description: `Right child is left-heavy. Performing Right-Left Double Rotation.`,
          phase: 'rotate',
          rotationType: 'RL',
          highlightNodeIds: [node.id, node.right!.id],
          highlightKeys: [node.key, node.right!.key],
          unbalancedNodeId: node.id,
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Double Rotation', `RL Double Rotation on ${node.key}`, true),
          codeExplanation: `Right rotate on ${node.right!.key}, then left rotate on ${node.key}.`,
        });
        node.right = this.rotateRight(node.right!);
        return this.rotateLeft(node);
      }

      return node;
    };

    this.root = deleteAndTrace(this.root);

    const totalSteps = rawSnapshots.length + 1;
    const finalResultBadge = !keyFound
      ? `Key ${key} was not found (no changes)`
      : this.rotationCountLastOp > 0
      ? `Key ${key} deleted with ${this.rotationCountLastOp} rebalance rotation(s)`
      : `Key ${key} deleted (tree remained balanced)`;

    const finalTelemetry = this.createTelemetry(
      `Delete ${key} took ${totalSteps} steps${this.rotationCountLastOp > 0 ? ` (${this.rotationCountLastOp} rotation)` : ''}`,
      finalResultBadge,
      keyFound
    );

    rawSnapshots.push({
      title: !keyFound ? `Deletion Terminated (Key Not Found)` : `Deletion of Key ${key} Complete`,
      description: !keyFound
        ? `No node with key ${key} existed in the tree.`
        : `Node removed and tree balanced. New height is ${this.getHeight()}.`,
      phase: 'complete',
      highlightNodeIds: [],
      highlightKeys: [key],
      avlTree: this.root ? this.root.toSnapshot() : null,
      telemetry: finalTelemetry,
      codeExplanation: `AVL Tree rebalanced successfully.`,
    });

    const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
      ...snap,
      stepIndex: idx + 1,
      totalSteps: rawSnapshots.length,
      avlTree: snap.avlTree ?? (this.root ? this.root.toSnapshot() : null),
    }));

    return {
      snapshots,
      finalTelemetry,
    };
  }

  private deleteNodeSilent(node: AVLNode | null, key: number): AVLNode | null {
    if (!node) return null;
    if (key < node.key) {
      node.left = this.deleteNodeSilent(node.left, key);
    } else if (key > node.key) {
      node.right = this.deleteNodeSilent(node.right, key);
    } else {
      if (!node.left || !node.right) {
        return node.left ? node.left : node.right;
      }
      let min = node.right;
      while (min.left) min = min.left;
      node.key = min.key;
      node.right = this.deleteNodeSilent(node.right, min.key);
    }

    node.updateHeight();
    const bf = node.balanceFactor;

    if (bf > 1 && (node.left ? node.left.balanceFactor >= 0 : false)) {
      return this.rotateRight(node);
    }
    if (bf > 1 && (node.left ? node.left.balanceFactor < 0 : false)) {
      node.left = this.rotateLeft(node.left!);
      return this.rotateRight(node);
    }
    if (bf < -1 && (node.right ? node.right.balanceFactor <= 0 : false)) {
      return this.rotateLeft(node);
    }
    if (bf < -1 && (node.right ? node.right.balanceFactor > 0 : false)) {
      node.right = this.rotateRight(node.right!);
      return this.rotateLeft(node);
    }

    return node;
  }

  search(key: number): TreeOperationResult {
    const rawSnapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[] = [];
    let curr = this.root;
    let found = false;

    rawSnapshots.push({
      title: `Search for Key ${key}`,
      description: `Starting search from tree root for key ${key}.`,
      phase: 'start',
      highlightNodeIds: curr ? [curr.id] : [],
      highlightKeys: [key],
      avlTree: this.root ? this.root.toSnapshot() : null,
      telemetry: this.createTelemetry('Searching...', `Looking for ${key}`, true),
      codeExplanation: `Compare search key ${key} with current node key.`,
    });

    while (curr) {
      if (key === curr.key) {
        found = true;
        rawSnapshots.push({
          title: `Key ${key} Found!`,
          description: `Matched key ${key} at node ${curr.id} (height ${curr.height}, BF ${curr.balanceFactor}).`,
          phase: 'found',
          highlightNodeIds: [curr.id],
          highlightKeys: [key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry(`${rawSnapshots.length} steps`, `Key ${key} found!`, true),
          codeExplanation: `Lookup succeeded in O(log n) time.`,
        });
        break;
      } else if (key < curr.key) {
        rawSnapshots.push({
          title: `${key} < ${curr.key}: Go Left`,
          description: `Key ${key} is smaller than node ${curr.key}. Moving down to left child.`,
          phase: 'search',
          highlightNodeIds: [curr.id],
          highlightKeys: [key, curr.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Searching', `Descending left from ${curr.key}`, true),
          codeExplanation: `Binary search property: left subtree holds values < ${curr.key}.`,
        });
        curr = curr.left;
      } else {
        rawSnapshots.push({
          title: `${key} > ${curr.key}: Go Right`,
          description: `Key ${key} is larger than node ${curr.key}. Moving down to right child.`,
          phase: 'search',
          highlightNodeIds: [curr.id],
          highlightKeys: [key, curr.key],
          avlTree: this.root ? this.root.toSnapshot() : null,
          telemetry: this.createTelemetry('Searching', `Descending right from ${curr.key}`, true),
          codeExplanation: `Binary search property: right subtree holds values > ${curr.key}.`,
        });
        curr = curr.right;
      }
    }

    if (!found) {
      rawSnapshots.push({
        title: `Key ${key} Not Found`,
        description: `Reached null pointer. Key ${key} does not exist in the tree.`,
        phase: 'not_found',
        highlightNodeIds: [],
        highlightKeys: [key],
        avlTree: this.root ? this.root.toSnapshot() : null,
        telemetry: this.createTelemetry(`${rawSnapshots.length} steps`, `Key ${key} not found`, false),
        codeExplanation: `Exhausted search path without a match.`,
      });
    }

    const finalTelemetry = this.createTelemetry(
      `Search ${key} took ${rawSnapshots.length} steps`,
      found ? `Key ${key} found in AVL tree` : `Key ${key} not found in AVL tree`,
      found
    );

    const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
      ...snap,
      stepIndex: idx + 1,
      totalSteps: rawSnapshots.length,
      avlTree: this.root ? this.root.toSnapshot() : null,
      telemetry: idx === rawSnapshots.length - 1 ? finalTelemetry : snap.telemetry,
    }));

    return {
      snapshots,
      finalTelemetry,
    };
  }

  private buildVirtualSnapshotWithNewNode(path: AVLNode[], newNode: AVLNode): AVLNodeSnapshot | null {
    if (!this.root) return newNode.toSnapshot();
    const clonedRoot = this.root.clone();

    // Attach newNode to copy of tree for snapshot
    const attach = (node: AVLNode) => {
      if (path.length > 0 && node.id === path[path.length - 1].id) {
        if (newNode.key < node.key) {
          node.left = newNode.clone();
        } else {
          node.right = newNode.clone();
        }
        return;
      }
      if (node.left) attach(node.left);
      if (node.right) attach(node.right);
    };

    attach(clonedRoot);
    return clonedRoot.toSnapshot();
  }
}
