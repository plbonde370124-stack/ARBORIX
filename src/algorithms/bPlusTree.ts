/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BPlusNodeSnapshot, StepSnapshot, TreeOperationResult, StepTelemetry } from '../types/tree';

export class BPlusNode {
  id: string;
  isLeaf: boolean;
  keys: number[];
  children: BPlusNode[]; // populated if !isLeaf
  nextLeaf: BPlusNode | null = null; // populated if isLeaf
  prevLeaf: BPlusNode | null = null; // populated if isLeaf

  constructor(isLeaf: boolean, id?: string) {
    this.isLeaf = isLeaf;
    this.keys = [];
    this.children = [];
    this.id = id || `bp-${isLeaf ? 'leaf' : 'int'}-${Math.random().toString(36).substring(2, 7)}`;
  }

  toSnapshot(): BPlusNodeSnapshot {
    return {
      id: this.id,
      isLeaf: this.isLeaf,
      keys: [...this.keys],
      children: this.isLeaf ? undefined : this.children.map(c => c.toSnapshot()),
      nextLeafId: this.nextLeaf ? this.nextLeaf.id : null,
      prevLeafId: this.prevLeaf ? this.prevLeaf.id : null,
    };
  }

  cloneNodeOnly(): BPlusNode {
    const copy = new BPlusNode(this.isLeaf, this.id);
    copy.keys = [...this.keys];
    return copy;
  }
}

export class BPlusTree {
  root: BPlusNode;
  order: number; // m: 3, 4, 5, 6
  private splitsCountLastOp = 0;

  constructor(order: number = 3, initialKeys?: number[]) {
    this.order = Math.max(3, Math.min(6, order));
    this.root = new BPlusNode(true);
    if (initialKeys && initialKeys.length > 0) {
      for (const k of initialKeys) {
        this.insertSilent(k);
      }
    }
  }

  get minLeafKeys(): number {
    return Math.ceil((this.order - 1) / 2);
  }

  get maxKeys(): number {
    return this.order - 1;
  }

  get minInternalKeys(): number {
    return Math.ceil(this.order / 2) - 1;
  }

  clear(): void {
    this.root = new BPlusNode(true);
    this.splitsCountLastOp = 0;
  }

  getHeight(node: BPlusNode = this.root): number {
    if (node.isLeaf) return 1;
    return 1 + this.getHeight(node.children[0]);
  }

  getNodeCount(node: BPlusNode = this.root): number {
    if (node.isLeaf) return 1;
    let count = 1;
    for (const child of node.children) {
      count += this.getNodeCount(child);
    }
    return count;
  }

  getAllKeys(): number[] {
    // Traverse linked leaf nodes starting at the leftmost leaf
    let curr: BPlusNode = this.root;
    while (!curr.isLeaf && curr.children.length > 0) {
      curr = curr.children[0];
    }
    const keys: number[] = [];
    let leaf: BPlusNode | null = curr;
    while (leaf) {
      keys.push(...leaf.keys);
      leaf = leaf.nextLeaf;
    }
    return keys;
  }

  getLeafOccupancy(): string {
    let curr: BPlusNode = this.root;
    while (!curr.isLeaf && curr.children.length > 0) {
      curr = curr.children[0];
    }
    let totalKeys = 0;
    let totalCapacity = 0;
    let leaf: BPlusNode | null = curr;
    while (leaf) {
      totalKeys += leaf.keys.length;
      totalCapacity += this.maxKeys;
      leaf = leaf.nextLeaf;
    }
    if (totalCapacity === 0) return '0%';
    const pct = Math.round((totalKeys / totalCapacity) * 100);
    return `${pct}% (Keys: ${totalKeys} / Max ${totalCapacity})`;
  }

  private createTelemetry(
    stepsNeeded: string,
    operationResult: string,
    isSuccess: boolean
  ): StepTelemetry {
    return {
      height: this.getHeight(),
      nodeCount: this.getNodeCount(),
      keyCount: this.getAllKeys().length,
      balanceOrOccupancy: `Leaf Occupancy: ${this.getLeafOccupancy()}`,
      stepsNeeded,
      operationResult,
      isSuccess,
    };
  }

  cloneTree(): BPlusTree {
    const newTree = new BPlusTree(this.order);
    const leafMap = new Map<string, BPlusNode>();

    const cloneSubtree = (node: BPlusNode): BPlusNode => {
      const copy = node.cloneNodeOnly();
      if (node.isLeaf) {
        leafMap.set(node.id, copy);
      } else {
        copy.children = node.children.map(child => cloneSubtree(child));
      }
      return copy;
    };

    newTree.root = cloneSubtree(this.root);

    // Re-link leaf nodes
    let origCurr: BPlusNode = this.root;
    while (!origCurr.isLeaf && origCurr.children.length > 0) {
      origCurr = origCurr.children[0];
    }
    let origLeaf: BPlusNode | null = origCurr;
    let prevClonedLeaf: BPlusNode | null = null;

    while (origLeaf) {
      const cloned = leafMap.get(origLeaf.id);
      if (cloned) {
        if (prevClonedLeaf) {
          prevClonedLeaf.nextLeaf = cloned;
          cloned.prevLeaf = prevClonedLeaf;
        }
        prevClonedLeaf = cloned;
      }
      origLeaf = origLeaf.nextLeaf;
    }

    return newTree;
  }

  // --- Insertion ---
  insertSilent(key: number): void {
    const leaf = this.findLeafNode(this.root, key);
    // Duplicate check
    if (leaf.keys.includes(key)) return;

    // Insert into leaf in sorted position
    let insertIdx = 0;
    while (insertIdx < leaf.keys.length && leaf.keys[insertIdx] < key) {
      insertIdx++;
    }
    leaf.keys.splice(insertIdx, 0, key);

    // Overflow check
    if (leaf.keys.length >= this.order) {
      this.splitLeafSilent(leaf);
    }
  }

  private findLeafNode(node: BPlusNode, key: number): BPlusNode {
    if (node.isLeaf) return node;
    let i = 0;
    while (i < node.keys.length && key >= node.keys[i]) {
      i++;
    }
    return this.findLeafNode(node.children[i], key);
  }

  private splitLeafSilent(leaf: BPlusNode): void {
    const parent = this.findParent(this.root, leaf);
    const splitIndex = Math.ceil(this.order / 2);

    const rightLeaf = new BPlusNode(true);
    rightLeaf.keys = leaf.keys.splice(splitIndex);

    // Update doubly linked list
    rightLeaf.nextLeaf = leaf.nextLeaf;
    if (rightLeaf.nextLeaf) rightLeaf.nextLeaf.prevLeaf = rightLeaf;
    leaf.nextLeaf = rightLeaf;
    rightLeaf.prevLeaf = leaf;

    const promotedKey = rightLeaf.keys[0];

    if (!parent) {
      const newRoot = new BPlusNode(false);
      newRoot.keys = [promotedKey];
      newRoot.children = [leaf, rightLeaf];
      this.root = newRoot;
    } else {
      let insertIdx = 0;
      while (insertIdx < parent.keys.length && parent.keys[insertIdx] < promotedKey) {
        insertIdx++;
      }
      parent.keys.splice(insertIdx, 0, promotedKey);
      parent.children.splice(insertIdx + 1, 0, rightLeaf);

      if (parent.keys.length >= this.order) {
        this.splitInternalSilent(parent);
      }
    }
  }

  private splitInternalSilent(node: BPlusNode): void {
    const parent = this.findParent(this.root, node);
    const midIndex = Math.floor(node.keys.length / 2);
    const promotedKey = node.keys[midIndex];

    const rightNode = new BPlusNode(false);
    rightNode.keys = node.keys.splice(midIndex + 1);
    rightNode.children = node.children.splice(midIndex + 1);

    // Remove the promoted middle key from left internal
    node.keys.splice(midIndex, 1);

    if (!parent) {
      const newRoot = new BPlusNode(false);
      newRoot.keys = [promotedKey];
      newRoot.children = [node, rightNode];
      this.root = newRoot;
    } else {
      let insertIdx = 0;
      while (insertIdx < parent.keys.length && parent.keys[insertIdx] < promotedKey) {
        insertIdx++;
      }
      parent.keys.splice(insertIdx, 0, promotedKey);
      parent.children.splice(insertIdx + 1, 0, rightNode);

      if (parent.keys.length >= this.order) {
        this.splitInternalSilent(parent);
      }
    }
  }

  private findParent(current: BPlusNode, target: BPlusNode): BPlusNode | null {
    if (current.isLeaf) return null;
    for (const child of current.children) {
      if (child.id === target.id) return current;
      const found = this.findParent(child, target);
      if (found) return found;
    }
    return null;
  }

  // --- Step-by-Step Insert ---
  insert(key: number): TreeOperationResult {
    const rawSnapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[] = [];
    this.splitsCountLastOp = 0;

    rawSnapshots.push({
      title: `Starting B+ Tree Insertion of ${key}`,
      description: `Begin routing down from root to locate the target leaf node for key ${key} (Order m = ${this.order}).`,
      phase: 'start',
      highlightNodeIds: [this.root.id],
      highlightKeys: [key],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('In progress', `Inserting key ${key}`, true),
      codeExplanation: `Internal routing nodes direct traversal using separator keys. Leaf nodes hold all data items.`,
    });

    // Step 1: Traverse to leaf
    let curr = this.root;
    while (!curr.isLeaf) {
      let i = 0;
      while (i < curr.keys.length && key >= curr.keys[i]) {
        i++;
      }
      const nextChild = curr.children[i];
      const separatorDesc = i < curr.keys.length
        ? `${key} < ${curr.keys[i]} -> take child branch ${i}`
        : `${key} >= ${curr.keys[curr.keys.length - 1]} -> take rightmost branch ${i}`;

      rawSnapshots.push({
        title: `Route via Internal Node`,
        description: `Inspecting routing node [${curr.keys.join(', ')}]. ${separatorDesc}.`,
        phase: 'search',
        highlightNodeIds: [curr.id, nextChild.id],
        highlightKeys: [key],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Traversing', `Routing through internal node`, true),
        codeExplanation: `In a B+ Tree, internal nodes act purely as guideposts. Keys in internal node partition key ranges into ${curr.children.length} subtrees.`,
      });

      curr = nextChild;
    }

    const leaf = curr;

    // Duplicate check
    if (leaf.keys.includes(key)) {
      rawSnapshots.push({
        title: `Duplicate Key ${key}`,
        description: `Key ${key} already exists in leaf node [${leaf.keys.join(', ')}]. B+ trees maintain unique keys.`,
        phase: 'complete',
        highlightNodeIds: [leaf.id],
        highlightKeys: [key],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('1 step', `Key ${key} already exists (duplicate)`, false),
        codeExplanation: `Duplicate key detected in leaf node. No modification made.`,
      });

      const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
        ...snap,
        stepIndex: idx + 1,
        totalSteps: rawSnapshots.length,
      }));
      return {
        snapshots,
        finalTelemetry: rawSnapshots[rawSnapshots.length - 1].telemetry,
      };
    }

    // Insert into leaf
    let insertIdx = 0;
    while (insertIdx < leaf.keys.length && leaf.keys[insertIdx] < key) {
      insertIdx++;
    }
    leaf.keys.splice(insertIdx, 0, key);

    rawSnapshots.push({
      title: `Insert Key ${key} into Leaf`,
      description: `Key ${key} placed in sorted order in leaf node. Current leaf keys: [${leaf.keys.join(', ')}].`,
      phase: 'insert',
      highlightNodeIds: [leaf.id],
      highlightKeys: [key],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Evaluating capacity', `Placed key ${key} in leaf`, true),
      codeExplanation: `Leaf node capacity is m - 1 = ${this.maxKeys}. Current count is ${leaf.keys.length}.`,
    });

    // Handle Leaf Overflow
    if (leaf.keys.length >= this.order) {
      this.splitsCountLastOp++;
      rawSnapshots.push({
        title: `Leaf Overflow Detected (Capacity ${this.maxKeys})`,
        description: `Leaf has ${leaf.keys.length} keys, exceeding maximum capacity ${this.maxKeys}. Initiating leaf split.`,
        phase: 'split_leaf',
        highlightNodeIds: [leaf.id],
        highlightKeys: leaf.keys,
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Splitting', `Leaf overflow: ${leaf.keys.length} >= ${this.order}`, true),
        codeExplanation: `When a leaf exceeds capacity, it splits into two halves. The smallest key of the right half is copied up to the parent.`,
      });

      this.splitLeafWithSnapshots(leaf, rawSnapshots);
    }

    const finalTelemetry = this.createTelemetry(
      `Insert ${key} took ${rawSnapshots.length + 1} steps${this.splitsCountLastOp > 0 ? ` (${this.splitsCountLastOp} split)` : ''}`,
      this.splitsCountLastOp > 0
        ? `Key ${key} inserted with ${this.splitsCountLastOp} split(s)`
        : `Key ${key} inserted without splits`,
      true
    );

    rawSnapshots.push({
      title: `Insertion of Key ${key} Complete`,
      description: `B+ Tree properties satisfied. All leaf nodes are linked at depth ${this.getHeight()}.`,
      phase: 'complete',
      highlightNodeIds: [],
      highlightKeys: [key],
      bplusTree: this.root.toSnapshot(),
      telemetry: finalTelemetry,
      codeExplanation: `Invariants hold: leaf occupancy at ${this.getLeafOccupancy()}, internal nodes well-formed.`,
    });

    const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
      ...snap,
      stepIndex: idx + 1,
      totalSteps: rawSnapshots.length,
    }));

    return {
      snapshots,
      finalTelemetry,
    };
  }

  private splitLeafWithSnapshots(
    leaf: BPlusNode,
    snapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[]
  ): void {
    const parent = this.findParent(this.root, leaf);
    const splitIndex = Math.ceil(this.order / 2);

    const rightLeaf = new BPlusNode(true);
    rightLeaf.keys = leaf.keys.splice(splitIndex);

    // Update doubly linked list pointers
    rightLeaf.nextLeaf = leaf.nextLeaf;
    if (rightLeaf.nextLeaf) rightLeaf.nextLeaf.prevLeaf = rightLeaf;
    leaf.nextLeaf = rightLeaf;
    rightLeaf.prevLeaf = leaf;

    const promotedKey = rightLeaf.keys[0];

    snapshots.push({
      title: `Leaf Split: Created Sibling Leaf`,
      description: `Left leaf keeps [${leaf.keys.join(', ')}]. Right leaf gets [${rightLeaf.keys.join(', ')}]. Leaf linked-list pointers linked. Separator key ${promotedKey} will be promoted to parent.`,
      phase: 'split_leaf',
      highlightNodeIds: [leaf.id, rightLeaf.id],
      highlightKeys: [promotedKey],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Promoting key', `Leaf split into two; promoting separator ${promotedKey}`, true),
      codeExplanation: `In B+ trees, the split key ${promotedKey} remains in the right leaf as the data element, and a copy moves up as a router.`,
    });

    if (!parent) {
      // Root split: create new root
      const newRoot = new BPlusNode(false);
      newRoot.keys = [promotedKey];
      newRoot.children = [leaf, rightLeaf];
      this.root = newRoot;

      snapshots.push({
        title: `Root Growth: New Root Created`,
        description: `Old leaf was the root. Created new internal root node with separator [${promotedKey}] and 2 child pointers. Tree height increased to ${this.getHeight()}.`,
        phase: 'split_internal',
        highlightNodeIds: [newRoot.id],
        highlightKeys: [promotedKey],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Root growth', `Height increased to ${this.getHeight()}`, true),
        codeExplanation: `B+ Tree grows from the top when the root node splits.`,
      });
    } else {
      let insertIdx = 0;
      while (insertIdx < parent.keys.length && parent.keys[insertIdx] < promotedKey) {
        insertIdx++;
      }
      parent.keys.splice(insertIdx, 0, promotedKey);
      parent.children.splice(insertIdx + 1, 0, rightLeaf);

      snapshots.push({
        title: `Inserted Separator ${promotedKey} into Parent`,
        description: `Parent node [${parent.keys.join(', ')}] now routes to the new right leaf.`,
        phase: 'split_leaf',
        highlightNodeIds: [parent.id],
        highlightKeys: [promotedKey],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Updated parent', `Separator ${promotedKey} added to parent`, true),
        codeExplanation: `Parent updated with routing separator and child pointer.`,
      });

      if (parent.keys.length >= this.order) {
        this.splitInternalWithSnapshots(parent, snapshots);
      }
    }
  }

  private splitInternalWithSnapshots(
    node: BPlusNode,
    snapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[]
  ): void {
    this.splitsCountLastOp++;
    const parent = this.findParent(this.root, node);
    const midIndex = Math.floor(node.keys.length / 2);
    const promotedKey = node.keys[midIndex];

    const rightNode = new BPlusNode(false);
    rightNode.keys = node.keys.splice(midIndex + 1);
    rightNode.children = node.children.splice(midIndex + 1);

    // Unlike leaf split, internal middle key is extracted and pushed up
    node.keys.splice(midIndex, 1);

    snapshots.push({
      title: `Internal Node Split (Middle Key ${promotedKey})`,
      description: `Internal node split: left keeps [${node.keys.join(', ')}], right gets [${rightNode.keys.join(', ')}]. Promoted middle key ${promotedKey} moves up.`,
      phase: 'split_internal',
      highlightNodeIds: [node.id, rightNode.id],
      highlightKeys: [promotedKey],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Internal split', `Middle key ${promotedKey} promoted up`, true),
      codeExplanation: `Unlike leaf nodes, internal nodes DO NOT keep a duplicate of the promoted key. It moves strictly up.`,
    });

    if (!parent) {
      const newRoot = new BPlusNode(false);
      newRoot.keys = [promotedKey];
      newRoot.children = [node, rightNode];
      this.root = newRoot;

      snapshots.push({
        title: `New Root Created from Internal Split`,
        description: `Root was split. New internal root created with key [${promotedKey}]. Tree height increased to ${this.getHeight()}.`,
        phase: 'split_internal',
        highlightNodeIds: [newRoot.id],
        highlightKeys: [promotedKey],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Root expansion', `Height increased to ${this.getHeight()}`, true),
        codeExplanation: `Internal root split increases tree depth by 1 level.`,
      });
    } else {
      let insertIdx = 0;
      while (insertIdx < parent.keys.length && parent.keys[insertIdx] < promotedKey) {
        insertIdx++;
      }
      parent.keys.splice(insertIdx, 0, promotedKey);
      parent.children.splice(insertIdx + 1, 0, rightNode);

      snapshots.push({
        title: `Separator ${promotedKey} Pushed to Parent`,
        description: `Parent node [${parent.keys.join(', ')}] updated.`,
        phase: 'split_internal',
        highlightNodeIds: [parent.id],
        highlightKeys: [promotedKey],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Parent updated', `Parent now has ${parent.keys.length} keys`, true),
        codeExplanation: `Child pointers connected to new internal sibling.`,
      });

      if (parent.keys.length >= this.order) {
        this.splitInternalWithSnapshots(parent, snapshots);
      }
    }
  }

  // --- Search ---
  search(key: number): TreeOperationResult {
    const rawSnapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[] = [];
    rawSnapshots.push({
      title: `Search for Key ${key} in B+ Tree`,
      description: `Starting top-down traversal from root to find key ${key}.`,
      phase: 'start',
      highlightNodeIds: [this.root.id],
      highlightKeys: [key],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Searching', `Searching for ${key}`, true),
      codeExplanation: `Compare search key with internal separator keys to navigate to target leaf.`,
    });

    let curr = this.root;
    while (!curr.isLeaf) {
      let i = 0;
      while (i < curr.keys.length && key >= curr.keys[i]) {
        i++;
      }
      const nextChild = curr.children[i];
      rawSnapshots.push({
        title: `Internal Routing Decision`,
        description: `At internal node [${curr.keys.join(', ')}]. Follow child pointer at index ${i}.`,
        phase: 'search',
        highlightNodeIds: [curr.id, nextChild.id],
        highlightKeys: [key],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Searching', `Descending via pointer ${i}`, true),
        codeExplanation: `In B+ Tree, data records only live at leaf level; internal nodes only direct the search.`,
      });
      curr = nextChild;
    }

    const leaf = curr;
    const found = leaf.keys.includes(key);

    if (found) {
      rawSnapshots.push({
        title: `Key ${key} Found in Leaf Node!`,
        description: `Key ${key} is present in leaf node [${leaf.keys.join(', ')}].`,
        phase: 'found',
        highlightNodeIds: [leaf.id],
        highlightKeys: [key],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry(`${rawSnapshots.length} steps`, `Key ${key} found!`, true),
        codeExplanation: `Direct leaf lookup completed in O(log_m n) steps.`,
      });
    } else {
      rawSnapshots.push({
        title: `Key ${key} Not Found`,
        description: `Reached target leaf [${leaf.keys.join(', ')}], but key ${key} is absent.`,
        phase: 'not_found',
        highlightNodeIds: [leaf.id],
        highlightKeys: [key],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry(`${rawSnapshots.length} steps`, `Key ${key} not found`, false),
        codeExplanation: `Leaf does not contain key ${key}. Search concludes.`,
      });
    }

    const finalTelemetry = this.createTelemetry(
      `Search ${key} took ${rawSnapshots.length} steps`,
      found ? `Key ${key} found at leaf level` : `Key ${key} not found in B+ Tree`,
      found
    );

    const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
      ...snap,
      stepIndex: idx + 1,
      totalSteps: rawSnapshots.length,
      telemetry: idx === rawSnapshots.length - 1 ? finalTelemetry : snap.telemetry,
    }));

    return {
      snapshots,
      finalTelemetry,
    };
  }

  // --- Range Query ---
  rangeQuery(from: number, to: number): TreeOperationResult {
    const rawSnapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[] = [];
    const minVal = Math.min(from, to);
    const maxVal = Math.max(from, to);

    rawSnapshots.push({
      title: `Range Query [${minVal} .. ${maxVal}]`,
      description: `Finding initial leaf containing smallest key >= ${minVal}, then scanning horizontally across leaf linked list.`,
      phase: 'start',
      highlightNodeIds: [this.root.id],
      highlightKeys: [],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Starting range query', `Query [${minVal} .. ${maxVal}]`, true),
      codeExplanation: `B+ trees excel at range queries because all leaf nodes are connected sequentially in a doubly-linked list.`,
    });

    // Traverse down to find start leaf
    let curr = this.root;
    while (!curr.isLeaf) {
      let i = 0;
      while (i < curr.keys.length && minVal >= curr.keys[i]) {
        i++;
      }
      curr = curr.children[i];
    }

    const matchedKeys: number[] = [];
    let leaf: BPlusNode | null = curr;
    let stop = false;

    rawSnapshots.push({
      title: `Reached Starting Leaf Node`,
      description: `Starting sequential leaf scan at leaf [${leaf.keys.join(', ')}].`,
      phase: 'range_scan',
      highlightNodeIds: [leaf.id],
      highlightKeys: [],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Leaf located', `Starting sequential scan`, true),
      codeExplanation: `Now traversing leaf nodes horizontally using nextLeaf pointers without returning to internal nodes.`,
    });

    while (leaf && !stop) {
      const leafMatches: number[] = [];
      for (const k of leaf.keys) {
        if (k >= minVal && k <= maxVal) {
          matchedKeys.push(k);
          leafMatches.push(k);
        } else if (k > maxVal) {
          stop = true;
          break;
        }
      }

      rawSnapshots.push({
        title: `Scanned Leaf [${leaf.keys.join(', ')}]`,
        description: leafMatches.length > 0
          ? `Collected matching keys [${leafMatches.join(', ')}] from this leaf. Total matched so far: ${matchedKeys.length}.`
          : `No keys in this leaf matched range [${minVal} .. ${maxVal}].`,
        phase: 'range_scan',
        highlightNodeIds: [leaf.id],
        highlightKeys: [...matchedKeys],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry(
          'Scanning leaves',
          `Matched: [${matchedKeys.join(', ')}]`,
          true
        ),
        codeExplanation: `Sequential leaf scan: O(log_m n + k) efficiency where k is the number of items in range.`,
      });

      if (!stop) {
        leaf = leaf.nextLeaf;
      }
    }

    const finalTelemetry = this.createTelemetry(
      `Range query [${minVal} .. ${maxVal}] found ${matchedKeys.length} keys`,
      `Found ${matchedKeys.length} key(s): [${matchedKeys.join(', ')}]`,
      true
    );

    rawSnapshots.push({
      title: `Range Query Complete`,
      description: `Range query [${minVal} .. ${maxVal}] completed. Found ${matchedKeys.length} matching key(s): [${matchedKeys.join(', ')}].`,
      phase: 'complete',
      highlightNodeIds: [],
      highlightKeys: matchedKeys,
      bplusTree: this.root.toSnapshot(),
      telemetry: finalTelemetry,
      codeExplanation: `Sequential scan concluded. Notice that no internal parent nodes needed to be re-visited.`,
    });

    const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
      ...snap,
      stepIndex: idx + 1,
      totalSteps: rawSnapshots.length,
    }));

    return {
      snapshots,
      finalTelemetry,
    };
  }

  // --- Deletion (Borrow / Merge) ---
  delete(key: number): TreeOperationResult {
    const rawSnapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[] = [];
    rawSnapshots.push({
      title: `Starting B+ Tree Deletion of ${key}`,
      description: `Traverse to leaf node, remove key ${key}, and handle underflow if keys fall below minimum required (${this.minLeafKeys}).`,
      phase: 'start',
      highlightNodeIds: [this.root.id],
      highlightKeys: [key],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Locating', `Deleting key ${key}`, true),
      codeExplanation: `In B+ Tree, deletion only removes data from leaf nodes. Underflow triggers borrowing from siblings or merging.`,
    });

    // Step 1: Find leaf
    let curr = this.root;
    while (!curr.isLeaf) {
      let i = 0;
      while (i < curr.keys.length && key >= curr.keys[i]) {
        i++;
      }
      curr = curr.children[i];
    }

    const leaf = curr;
    const keyIdx = leaf.keys.indexOf(key);

    if (keyIdx === -1) {
      rawSnapshots.push({
        title: `Key ${key} Not Found`,
        description: `Target leaf [${leaf.keys.join(', ')}] does not contain key ${key}. No deletion performed.`,
        phase: 'not_found',
        highlightNodeIds: [leaf.id],
        highlightKeys: [key],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Finished', `Key ${key} not found`, false),
        codeExplanation: `Key does not exist in leaf nodes.`,
      });

      const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
        ...snap,
        stepIndex: idx + 1,
        totalSteps: rawSnapshots.length,
      }));
      return {
        snapshots,
        finalTelemetry: rawSnapshots[rawSnapshots.length - 1].telemetry,
      };
    }

    // Remove key from leaf
    leaf.keys.splice(keyIdx, 1);

    rawSnapshots.push({
      title: `Key ${key} Removed from Leaf`,
      description: `Removed key ${key}. Leaf keys remaining: [${leaf.keys.join(', ')}]. Checking underflow constraint (min keys: ${this.minLeafKeys}).`,
      phase: 'delete',
      highlightNodeIds: [leaf.id],
      highlightKeys: [],
      bplusTree: this.root.toSnapshot(),
      telemetry: this.createTelemetry('Key removed', `Remaining keys in leaf: ${leaf.keys.length}`, true),
      codeExplanation: `Leaf now has ${leaf.keys.length} keys. If this is fewer than ceil((m-1)/2) = ${this.minLeafKeys}, underflow handling starts.`,
    });

    // Check underflow
    if (leaf.id !== this.root.id && leaf.keys.length < this.minLeafKeys) {
      this.handleLeafUnderflow(leaf, rawSnapshots);
    } else {
      // If key was the leftmost key in leaf, update parent separator if needed
      this.updateParentSeparators(this.root);
    }

    const finalTelemetry = this.createTelemetry(
      `Delete ${key} took ${rawSnapshots.length + 1} steps`,
      `Key ${key} successfully deleted`,
      true
    );

    rawSnapshots.push({
      title: `Deletion of Key ${key} Complete`,
      description: `B+ Tree rebalanced and underflow resolved. Tree height is ${this.getHeight()}.`,
      phase: 'complete',
      highlightNodeIds: [],
      highlightKeys: [],
      bplusTree: this.root.toSnapshot(),
      telemetry: finalTelemetry,
      codeExplanation: `B+ Tree invariants satisfied: all leaves have at least ${this.minLeafKeys} keys.`,
    });

    const snapshots: StepSnapshot[] = rawSnapshots.map((snap, idx) => ({
      ...snap,
      stepIndex: idx + 1,
      totalSteps: rawSnapshots.length,
    }));

    return {
      snapshots,
      finalTelemetry,
    };
  }

  private handleLeafUnderflow(
    leaf: BPlusNode,
    snapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[]
  ): void {
    const parent = this.findParent(this.root, leaf);
    if (!parent) return;

    const childIndex = parent.children.indexOf(leaf);
    const leftSibling = childIndex > 0 ? parent.children[childIndex - 1] : null;
    const rightSibling = childIndex < parent.children.length - 1 ? parent.children[childIndex + 1] : null;

    // Case 1: Borrow from left sibling
    if (leftSibling && leftSibling.keys.length > this.minLeafKeys) {
      const borrowedKey = leftSibling.keys.pop()!;
      leaf.keys.unshift(borrowedKey);
      // Update separator in parent
      parent.keys[childIndex - 1] = leaf.keys[0];

      snapshots.push({
        title: `Borrowed Key ${borrowedKey} from Left Sibling`,
        description: `Left sibling had spare keys. Transferred key ${borrowedKey} to current leaf. Updated parent separator to ${leaf.keys[0]}.`,
        phase: 'borrow',
        highlightNodeIds: [leftSibling.id, leaf.id, parent.id],
        highlightKeys: [borrowedKey],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Redistribution', `Borrowed ${borrowedKey} from left sibling`, true),
        codeExplanation: `Borrowing preserves both leaf node sizes without costly merge.`,
      });
      return;
    }

    // Case 2: Borrow from right sibling
    if (rightSibling && rightSibling.keys.length > this.minLeafKeys) {
      const borrowedKey = rightSibling.keys.shift()!;
      leaf.keys.push(borrowedKey);
      // Update separator in parent
      parent.keys[childIndex] = rightSibling.keys[0];

      snapshots.push({
        title: `Borrowed Key ${borrowedKey} from Right Sibling`,
        description: `Right sibling had spare keys. Transferred key ${borrowedKey} to current leaf. Updated parent separator to ${rightSibling.keys[0]}.`,
        phase: 'borrow',
        highlightNodeIds: [leaf.id, rightSibling.id, parent.id],
        highlightKeys: [borrowedKey],
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Redistribution', `Borrowed ${borrowedKey} from right sibling`, true),
        codeExplanation: `Borrowing from right sibling updates separator in parent to right sibling's new first key.`,
      });
      return;
    }

    // Case 3: Merge with left sibling
    if (leftSibling) {
      leftSibling.keys.push(...leaf.keys);
      // Update doubly linked list
      leftSibling.nextLeaf = leaf.nextLeaf;
      if (leaf.nextLeaf) leaf.nextLeaf.prevLeaf = leftSibling;

      // Remove separator and leaf child from parent
      parent.keys.splice(childIndex - 1, 1);
      parent.children.splice(childIndex, 1);

      snapshots.push({
        title: `Merged Leaf with Left Sibling`,
        description: `Neither sibling could lend keys. Merged current leaf into left sibling [${leftSibling.keys.join(', ')}]. Spliced out separator from parent.`,
        phase: 'merge',
        highlightNodeIds: [leftSibling.id, parent.id],
        highlightKeys: leftSibling.keys,
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Merge', `Merged leaf with left sibling`, true),
        codeExplanation: `Leaf merge combines contents into one node and removes the separator from the parent.`,
      });

      this.checkInternalUnderflow(parent, snapshots);
      return;
    }

    // Case 4: Merge with right sibling
    if (rightSibling) {
      leaf.keys.push(...rightSibling.keys);
      leaf.nextLeaf = rightSibling.nextLeaf;
      if (rightSibling.nextLeaf) rightSibling.nextLeaf.prevLeaf = leaf;

      // Remove separator and rightSibling child from parent
      parent.keys.splice(childIndex, 1);
      parent.children.splice(childIndex + 1, 1);

      snapshots.push({
        title: `Merged Leaf with Right Sibling`,
        description: `Merged right sibling into current leaf [${leaf.keys.join(', ')}]. Spliced out separator from parent.`,
        phase: 'merge',
        highlightNodeIds: [leaf.id, parent.id],
        highlightKeys: leaf.keys,
        bplusTree: this.root.toSnapshot(),
        telemetry: this.createTelemetry('Merge', `Merged leaf with right sibling`, true),
        codeExplanation: `Leaf merge unites adjacent leaves into a single node.`,
      });

      this.checkInternalUnderflow(parent, snapshots);
    }
  }

  private checkInternalUnderflow(
    node: BPlusNode,
    snapshots: Omit<StepSnapshot, 'stepIndex' | 'totalSteps'>[]
  ): void {
    if (node.id === this.root.id) {
      // Root contraction
      if (node.keys.length === 0 && node.children.length === 1) {
        this.root = node.children[0];
        snapshots.push({
          title: `Root Contraction: Height Reduced`,
          description: `Root node had 0 keys and 1 child. Promoted child to be the new root. Tree height decreased to ${this.getHeight()}.`,
          phase: 'contract',
          highlightNodeIds: [this.root.id],
          highlightKeys: this.root.keys,
          bplusTree: this.root.toSnapshot(),
          telemetry: this.createTelemetry('Contraction', `Height decreased to ${this.getHeight()}`, true),
          codeExplanation: `When root shrinks to single child, that child becomes the new root.`,
        });
      }
      return;
    }

    if (node.keys.length < this.minInternalKeys) {
      const parent = this.findParent(this.root, node);
      if (!parent) return;

      const idx = parent.children.indexOf(node);
      const leftSib = idx > 0 ? parent.children[idx - 1] : null;
      const rightSib = idx < parent.children.length - 1 ? parent.children[idx + 1] : null;

      // Borrow internal from left
      if (leftSib && leftSib.keys.length > this.minInternalKeys) {
        const parentKey = parent.keys[idx - 1];
        const borrowedKey = leftSib.keys.pop()!;
        const borrowedChild = leftSib.children.pop()!;

        node.keys.unshift(parentKey);
        node.children.unshift(borrowedChild);
        parent.keys[idx - 1] = borrowedKey;

        snapshots.push({
          title: `Borrowed Key from Left Internal Sibling`,
          description: `Internal node underflow resolved by borrowing from left sibling via parent key rotation.`,
          phase: 'borrow',
          highlightNodeIds: [node.id, leftSib.id, parent.id],
          highlightKeys: [borrowedKey],
          bplusTree: this.root.toSnapshot(),
          telemetry: this.createTelemetry('Internal Borrow', `Rotated key through parent`, true),
          codeExplanation: `Internal borrowing rotates separator key through the parent.`,
        });
        return;
      }

      // Borrow internal from right
      if (rightSib && rightSib.keys.length > this.minInternalKeys) {
        const parentKey = parent.keys[idx];
        const borrowedKey = rightSib.keys.shift()!;
        const borrowedChild = rightSib.children.shift()!;

        node.keys.push(parentKey);
        node.children.push(borrowedChild);
        parent.keys[idx] = borrowedKey;

        snapshots.push({
          title: `Borrowed Key from Right Internal Sibling`,
          description: `Internal node underflow resolved by borrowing from right sibling via parent key rotation.`,
          phase: 'borrow',
          highlightNodeIds: [node.id, rightSib.id, parent.id],
          highlightKeys: [borrowedKey],
          bplusTree: this.root.toSnapshot(),
          telemetry: this.createTelemetry('Internal Borrow', `Rotated key through parent`, true),
          codeExplanation: `Internal borrowing rotates separator key through the parent.`,
        });
        return;
      }

      // Merge internal with left
      if (leftSib) {
        const parentKey = parent.keys.splice(idx - 1, 1)[0];
        parent.children.splice(idx, 1);

        leftSib.keys.push(parentKey, ...node.keys);
        leftSib.children.push(...node.children);

        snapshots.push({
          title: `Merged Internal Node with Left Sibling`,
          description: `Merged internal node and parent key ${parentKey} into left sibling.`,
          phase: 'merge',
          highlightNodeIds: [leftSib.id, parent.id],
          highlightKeys: [parentKey],
          bplusTree: this.root.toSnapshot(),
          telemetry: this.createTelemetry('Internal Merge', `Merged internal nodes`, true),
          codeExplanation: `Internal merge combines children and brings down the separator key from the parent.`,
        });

        this.checkInternalUnderflow(parent, snapshots);
        return;
      }

      // Merge internal with right
      if (rightSib) {
        const parentKey = parent.keys.splice(idx, 1)[0];
        parent.children.splice(idx + 1, 1);

        node.keys.push(parentKey, ...rightSib.keys);
        node.children.push(...rightSib.children);

        snapshots.push({
          title: `Merged Internal Node with Right Sibling`,
          description: `Merged internal right sibling and parent key ${parentKey} into current node.`,
          phase: 'merge',
          highlightNodeIds: [node.id, parent.id],
          highlightKeys: [parentKey],
          bplusTree: this.root.toSnapshot(),
          telemetry: this.createTelemetry('Internal Merge', `Merged internal nodes`, true),
          codeExplanation: `Internal merge unites siblings and parent separator.`,
        });

        this.checkInternalUnderflow(parent, snapshots);
      }
    }
  }

  private updateParentSeparators(node: BPlusNode): void {
    if (node.isLeaf) return;
    for (let i = 0; i < node.keys.length; i++) {
      const rightChild = node.children[i + 1];
      if (rightChild.isLeaf && rightChild.keys.length > 0) {
        node.keys[i] = rightChild.keys[0];
      }
      this.updateParentSeparators(node.children[i]);
    }
    this.updateParentSeparators(node.children[node.children.length - 1]);
  }
}
