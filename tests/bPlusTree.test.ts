/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { BPlusTree } from '../src/algorithms/bPlusTree';

describe('BPlusTree Implementation & Splitting / Merging', () => {
  it('handles leaf split and root creation in order 3 B+ tree', () => {
    const tree = new BPlusTree(3);
    tree.insert(10);
    tree.insert(20);
    // Capacity of order 3 is max 2 keys. Inserting 3rd key triggers split.
    const result = tree.insert(30);

    // Root should now be an internal node with 1 key and 2 children
    expect(tree.root.isLeaf).toBe(false);
    expect(tree.root.keys.length).toBe(1);
    expect(tree.root.children.length).toBe(2);
    expect(tree.getHeight()).toBe(2);

    // Check linked leaves
    const leftLeaf = tree.root.children[0];
    const rightLeaf = tree.root.children[1];
    expect(leftLeaf.isLeaf).toBe(true);
    expect(rightLeaf.isLeaf).toBe(true);
    expect(leftLeaf.nextLeaf?.id).toBe(rightLeaf.id);
    expect(rightLeaf.prevLeaf?.id).toBe(leftLeaf.id);

    // Snapshots should record leaf split
    const splitSnap = result.snapshots.find(s => s.phase === 'split_leaf');
    expect(splitSnap).toBeDefined();
  });

  it('handles internal node split and secondary root growth', () => {
    // Order 3 tree: inserting multiple keys causes leaf splits, then parent internal split
    const tree = new BPlusTree(3);
    [10, 20, 30, 40, 50, 60, 70].forEach(k => tree.insert(k));

    expect(tree.getHeight()).toBeGreaterThanOrEqual(2);
    const keys = tree.getAllKeys();
    expect(keys).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  it('performs range query across linked leaf nodes', () => {
    const tree = new BPlusTree(4, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
    const rangeResult = tree.rangeQuery(25, 75);

    expect(rangeResult.finalTelemetry.isSuccess).toBe(true);
    const matchedKeys = rangeResult.snapshots[rangeResult.snapshots.length - 1].highlightKeys;
    expect(matchedKeys).toEqual([30, 40, 50, 60, 70]);
  });

  it('handles sibling borrowing and merging during deletion', () => {
    const tree = new BPlusTree(3, [10, 20, 30, 40]);
    expect(tree.getAllKeys()).toEqual([10, 20, 30, 40]);

    // Deleting 10 may trigger borrow or merge
    const result = tree.delete(10);
    expect(tree.getAllKeys()).toEqual([20, 30, 40]);
    expect(result.snapshots.length).toBeGreaterThan(0);

    // Deleting 20
    tree.delete(20);
    expect(tree.getAllKeys()).toEqual([30, 40]);
  });

  it('searches keys in B+ tree accurately', () => {
    const tree = new BPlusTree(3, [5, 15, 25, 35, 45]);
    const found = tree.search(25);
    expect(found.finalTelemetry.isSuccess).toBe(true);

    const notFound = tree.search(99);
    expect(notFound.finalTelemetry.isSuccess).toBe(false);
  });
});
