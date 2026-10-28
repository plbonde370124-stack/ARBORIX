/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { AVLTree } from '../src/algorithms/avlTree';

describe('AVLTree Implementation & Rotations', () => {
  it('handles Left-Left (LL) Single Right Rotation', () => {
    const tree = new AVLTree();
    // Inserting decreasing values: 30, 20, 10
    tree.insert(30);
    tree.insert(20);
    const result = tree.insert(10);

    // Root should become 20, left 10, right 30
    expect(tree.root).not.toBeNull();
    expect(tree.root!.key).toBe(20);
    expect(tree.root!.left!.key).toBe(10);
    expect(tree.root!.right!.key).toBe(30);
    expect(tree.getHeight()).toBe(2);

    // Verify rotation snapshot was captured
    const rotationSnap = result.snapshots.find(s => s.rotationType === 'LL');
    expect(rotationSnap).toBeDefined();
    expect(rotationSnap?.title).toContain('LL');
  });

  it('handles Right-Right (RR) Single Left Rotation', () => {
    const tree = new AVLTree();
    // Inserting increasing values: 10, 20, 30
    tree.insert(10);
    tree.insert(20);
    const result = tree.insert(30);

    // Root should become 20, left 10, right 30
    expect(tree.root).not.toBeNull();
    expect(tree.root!.key).toBe(20);
    expect(tree.root!.left!.key).toBe(10);
    expect(tree.root!.right!.key).toBe(30);
    expect(tree.getHeight()).toBe(2);

    const rotationSnap = result.snapshots.find(s => s.rotationType === 'RR');
    expect(rotationSnap).toBeDefined();
  });

  it('handles Left-Right (LR) Double Rotation', () => {
    const tree = new AVLTree();
    // Inserting: 30, 10, 20
    tree.insert(30);
    tree.insert(10);
    const result = tree.insert(20);

    // Root should become 20, left 10, right 30
    expect(tree.root).not.toBeNull();
    expect(tree.root!.key).toBe(20);
    expect(tree.root!.left!.key).toBe(10);
    expect(tree.root!.right!.key).toBe(30);
    expect(tree.getHeight()).toBe(2);

    const rotationSnap = result.snapshots.find(s => s.rotationType === 'LR');
    expect(rotationSnap).toBeDefined();
    expect(rotationSnap?.title).toContain('LR');
  });

  it('handles Right-Left (RL) Double Rotation', () => {
    const tree = new AVLTree();
    // Inserting: 10, 30, 20
    tree.insert(10);
    tree.insert(30);
    const result = tree.insert(20);

    // Root should become 20, left 10, right 30
    expect(tree.root).not.toBeNull();
    expect(tree.root!.key).toBe(20);
    expect(tree.root!.left!.key).toBe(10);
    expect(tree.root!.right!.key).toBe(30);
    expect(tree.getHeight()).toBe(2);

    const rotationSnap = result.snapshots.find(s => s.rotationType === 'RL');
    expect(rotationSnap).toBeDefined();
    expect(rotationSnap?.title).toContain('RL');
  });

  it('handles AVL Tree Deletion causing rebalance and rotations', () => {
    const tree = new AVLTree([20, 10, 40, 5, 30, 50, 60]);
    // Deleting 5 will cause right heavy imbalance on 10 or parent
    const result = tree.delete(5);
    expect(tree.getAllKeys()).not.toContain(5);

    // Invariants: for all nodes, |balanceFactor| <= 1
    const checkBalance = (node: typeof tree.root) => {
      if (!node) return;
      expect(Math.abs(node.balanceFactor)).toBeLessThanOrEqual(1);
      checkBalance(node.left);
      checkBalance(node.right);
    };
    checkBalance(tree.root);
    expect(result.snapshots.length).toBeGreaterThan(0);
  });

  it('handles search correctly for existing and missing keys', () => {
    const tree = new AVLTree([50, 25, 75, 10, 30, 60, 90]);
    const foundResult = tree.search(30);
    expect(foundResult.finalTelemetry.isSuccess).toBe(true);

    const missingResult = tree.search(999);
    expect(missingResult.finalTelemetry.isSuccess).toBe(false);
  });
});
