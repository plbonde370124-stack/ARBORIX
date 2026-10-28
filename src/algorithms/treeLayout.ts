/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AVLNodeSnapshot, BPlusNodeSnapshot, TreeLayoutResult, NodePosition, EdgePath } from '../types/tree';

export function layoutAVLTree(root: AVLNodeSnapshot | null): TreeLayoutResult {
  if (!root) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: 0, maxX: 400, minY: 0, maxY: 300, width: 400, height: 300 },
    };
  }

  const NODE_SIZE = 54;
  const LEVEL_HEIGHT = 88;
  const HORIZONTAL_GAP = 28;

  // Step 1: Compute subtree widths
  interface LayoutNode {
    snapshot: AVLNodeSnapshot;
    left: LayoutNode | null;
    right: LayoutNode | null;
    width: number;
    x: number;
    y: number;
    depth: number;
    parentId: string | null;
  }

  function buildLayoutTree(node: AVLNodeSnapshot, depth: number, parentId: string | null): LayoutNode {
    const left = node.left ? buildLayoutTree(node.left, depth + 1, node.id) : null;
    const right = node.right ? buildLayoutTree(node.right, depth + 1, node.id) : null;

    let width = NODE_SIZE;
    if (left && right) {
      width = left.width + right.width + HORIZONTAL_GAP;
    } else if (left) {
      width = left.width + NODE_SIZE / 2 + HORIZONTAL_GAP;
    } else if (right) {
      width = right.width + NODE_SIZE / 2 + HORIZONTAL_GAP;
    }

    return {
      snapshot: node,
      left,
      right,
      width,
      x: 0,
      y: depth * LEVEL_HEIGHT,
      depth,
      parentId,
    };
  }

  const layoutRoot = buildLayoutTree(root, 0, null);

  // Step 2: Assign coordinates
  function assignCoordinates(node: LayoutNode, leftBound: number) {
    if (node.left && node.right) {
      assignCoordinates(node.left, leftBound);
      assignCoordinates(node.right, leftBound + node.left.width + HORIZONTAL_GAP);
      node.x = (node.left.x + node.right.x) / 2;
    } else if (node.left) {
      assignCoordinates(node.left, leftBound);
      node.x = node.left.x + (NODE_SIZE / 2 + HORIZONTAL_GAP / 2);
    } else if (node.right) {
      assignCoordinates(node.right, leftBound + (NODE_SIZE / 2 + HORIZONTAL_GAP / 2));
      node.x = node.right.x - (NODE_SIZE / 2 + HORIZONTAL_GAP / 2);
    } else {
      node.x = leftBound + NODE_SIZE / 2;
    }
  }

  assignCoordinates(layoutRoot, 60);

  // Step 3: Flatten into NodePosition[] and EdgePath[]
  const nodes: NodePosition[] = [];
  const edges: EdgePath[] = [];

  function collect(node: LayoutNode) {
    nodes.push({
      id: node.snapshot.id,
      x: node.x,
      y: node.y + 40,
      width: NODE_SIZE,
      height: NODE_SIZE,
      key: node.snapshot.key,
      balanceFactor: node.snapshot.balanceFactor,
      nodeHeight: node.snapshot.height,
      parentId: node.parentId,
    });

    if (node.left) {
      edges.push({
        id: `edge-${node.snapshot.id}-${node.left.snapshot.id}`,
        fromId: node.snapshot.id,
        toId: node.left.snapshot.id,
        x1: node.x,
        y1: node.y + 40 + NODE_SIZE / 2,
        x2: node.left.x,
        y2: node.left.y + 40 - NODE_SIZE / 2,
      });
      collect(node.left);
    }

    if (node.right) {
      edges.push({
        id: `edge-${node.snapshot.id}-${node.right.snapshot.id}`,
        fromId: node.snapshot.id,
        toId: node.right.snapshot.id,
        x1: node.x,
        y1: node.y + 40 + NODE_SIZE / 2,
        x2: node.right.x,
        y2: node.right.y + 40 - NODE_SIZE / 2,
      });
      collect(node.right);
    }
  }

  collect(layoutRoot);

  // Calculate bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    if (n.x - n.width / 2 < minX) minX = n.x - n.width / 2;
    if (n.x + n.width / 2 > maxX) maxX = n.x + n.width / 2;
    if (n.y - n.height / 2 < minY) minY = n.y - n.height / 2;
    if (n.y + n.height / 2 > maxY) maxY = n.y + n.height / 2;
  }

  const padding = 60;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  return {
    nodes,
    edges,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(400, maxX - minX),
      height: Math.max(300, maxY - minY),
    },
  };
}

export function layoutBPlusTree(root: BPlusNodeSnapshot | null): TreeLayoutResult {
  if (!root) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: 0, maxX: 400, minY: 0, maxY: 300, width: 400, height: 300 },
    };
  }

  const LEVEL_HEIGHT = 100;
  const LEAF_HORIZONTAL_GAP = 36;
  const KEY_CELL_WIDTH = 42;
  const NODE_HEIGHT = 46;

  function getNodeWidth(keysCount: number): number {
    return Math.max(88, keysCount * KEY_CELL_WIDTH + 24);
  }

  // 1. Gather all leaves in left-to-right order
  const leaves: BPlusNodeSnapshot[] = [];
  function collectLeaves(node: BPlusNodeSnapshot) {
    if (node.isLeaf) {
      leaves.push(node);
    } else if (node.children) {
      for (const child of node.children) {
        collectLeaves(child);
      }
    }
  }
  collectLeaves(root);

  // Calculate tree height
  function computeHeight(node: BPlusNodeSnapshot): number {
    if (node.isLeaf || !node.children || node.children.length === 0) return 1;
    return 1 + computeHeight(node.children[0]);
  }
  const treeHeight = computeHeight(root);

  // Map to store assigned positions
  const posMap = new Map<string, { x: number; y: number; width: number; height: number; parentId: string | null }>();

  // 2. Position leaves horizontally
  let currentLeafX = 60;
  const leafY = (treeHeight - 1) * LEVEL_HEIGHT + 60;

  for (const leaf of leaves) {
    const width = getNodeWidth(leaf.keys.length);
    posMap.set(leaf.id, {
      x: currentLeafX + width / 2,
      y: leafY,
      width,
      height: NODE_HEIGHT,
      parentId: null,
    });
    currentLeafX += width + LEAF_HORIZONTAL_GAP;
  }

  // 3. Bottom-up positioning of internal nodes centered over their children
  function positionInternal(node: BPlusNodeSnapshot, depth: number, parentId: string | null): number {
    if (node.isLeaf) {
      const p = posMap.get(node.id)!;
      p.parentId = parentId;
      return p.x;
    }

    if (!node.children || node.children.length === 0) {
      return 0;
    }

    const childXs: number[] = [];
    for (const child of node.children) {
      childXs.push(positionInternal(child, depth + 1, node.id));
    }

    const centerX = (childXs[0] + childXs[childXs.length - 1]) / 2;
    const width = getNodeWidth(node.keys.length);
    const y = depth * LEVEL_HEIGHT + 60;

    posMap.set(node.id, {
      x: centerX,
      y,
      width,
      height: NODE_HEIGHT,
      parentId,
    });

    return centerX;
  }

  positionInternal(root, 0, null);

  // 4. Build output nodes and edges
  const nodes: NodePosition[] = [];
  const edges: EdgePath[] = [];

  function collectTree(node: BPlusNodeSnapshot) {
    const pos = posMap.get(node.id)!;
    nodes.push({
      id: node.id,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      isLeaf: node.isLeaf,
      keys: node.keys,
      parentId: pos.parentId,
      nextLeafId: node.nextLeafId,
      prevLeafId: node.prevLeafId,
    });

    if (!node.isLeaf && node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childPos = posMap.get(child.id)!;
        edges.push({
          id: `edge-${node.id}-${child.id}`,
          fromId: node.id,
          toId: child.id,
          x1: pos.x,
          y1: pos.y + pos.height / 2,
          x2: childPos.x,
          y2: childPos.y - childPos.height / 2,
        });
        collectTree(child);
      }
    }
  }

  collectTree(root);

  // 5. Build horizontal leaf-linking arrows (`nextLeaf`)
  for (let i = 0; i < leaves.length - 1; i++) {
    const curr = posMap.get(leaves[i].id)!;
    const next = posMap.get(leaves[i + 1].id)!;
    edges.push({
      id: `leaf-link-${leaves[i].id}-${leaves[i + 1].id}`,
      fromId: leaves[i].id,
      toId: leaves[i + 1].id,
      x1: curr.x + curr.width / 2,
      y1: curr.y,
      x2: next.x - next.width / 2,
      y2: next.y,
      isLeafLink: true,
    });
  }

  // Bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const n of nodes) {
    if (n.x - n.width / 2 < minX) minX = n.x - n.width / 2;
    if (n.x + n.width / 2 > maxX) maxX = n.x + n.width / 2;
    if (n.y - n.height / 2 < minY) minY = n.y - n.height / 2;
    if (n.y + n.height / 2 > maxY) maxY = n.y + n.height / 2;
  }

  const padding = 70;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  return {
    nodes,
    edges,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(500, maxX - minX),
      height: Math.max(350, maxY - minY),
    },
  };
}
