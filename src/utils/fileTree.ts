import type { FileNode } from '@/types';
import { languageFromFilename } from './language';
import { uid } from './id';

export function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

export function findNode(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function findParent(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.children?.some((c) => c.id === id)) return node;
    if (node.children) {
      const hit = findParent(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function pathOf(nodes: FileNode[], id: string): string {
  const segments: string[] = [];
  const walk = (list: FileNode[], trail: string[]): boolean => {
    for (const node of list) {
      const next = [...trail, node.name];
      if (node.id === id) {
        segments.push(...next);
        return true;
      }
      if (node.children && walk(node.children, next)) return true;
    }
    return false;
  };
  walk(nodes, []);
  return segments.join('/');
}

export function ancestorIds(nodes: FileNode[], id: string): string[] {
  const trail: string[] = [];
  const walk = (list: FileNode[], acc: string[]): boolean => {
    for (const node of list) {
      if (node.id === id) {
        trail.push(...acc);
        return true;
      }
      if (node.children && walk(node.children, [...acc, node.id])) return true;
    }
    return false;
  };
  walk(nodes, []);
  return trail;
}

export function updateNode(
  nodes: FileNode[],
  id: string,
  updater: (node: FileNode) => FileNode | null,
): FileNode[] {
  let changed = false;
  const next: FileNode[] = [];

  for (const node of nodes) {
    if (node.id === id) {
      changed = true;
      const replacement = updater(node);
      if (replacement) next.push(replacement);
      continue;
    }
    if (node.children) {
      const children = updateNode(node.children, id, updater);
      if (children !== node.children) {
        changed = true;
        next.push({ ...node, children });
        continue;
      }
    }
    next.push(node);
  }
  return changed ? next : nodes;
}

export function insertNode(
  nodes: FileNode[],
  parentId: string | null,
  child: FileNode,
): FileNode[] {
  if (parentId === null) return sortNodes([...nodes, child]);
  return updateNode(nodes, parentId, (parent) => {
    if (parent.type !== 'folder') return parent;
    return { ...parent, children: sortNodes([...(parent.children ?? []), child]) };
  });
}

export function removeNode(nodes: FileNode[], id: string): FileNode[] {
  return updateNode(nodes, id, () => null);
}

export function renameNode(nodes: FileNode[], id: string, name: string): FileNode[] {
  return updateNode(nodes, id, (node) => {
    const renamed: FileNode = { ...node, name };
    if (node.type === 'file') renamed.language = languageFromFilename(name);
    return renamed;
  });
}

export function setFileContent(
  nodes: FileNode[],
  id: string,
  content: string,
): FileNode[] {
  return updateNode(nodes, id, (node) =>
    node.type === 'file' && node.content !== content ? { ...node, content } : node,
  );
}

export function createFileNode(name: string, content = ''): FileNode {
  return {
    id: uid('file'),
    name,
    type: 'file',
    language: languageFromFilename(name),
    content,
  };
}

export function createFolderNode(name: string): FileNode {
  return { id: uid('dir'), name, type: 'folder', children: [] };
}

export function collectFiles(nodes: FileNode[]): FileNode[] {
  const out: FileNode[] = [];
  const walk = (list: FileNode[]) => {
    for (const node of list) {
      if (node.type === 'file') out.push(node);
      else if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

export function countFiles(nodes: FileNode[]): number {
  return collectFiles(nodes).length;
}

export function collectFilePaths(
  nodes: FileNode[],
): Array<{ node: FileNode; path: string }> {
  const out: Array<{ node: FileNode; path: string }> = [];
  const walk = (list: FileNode[], trail: string) => {
    for (const node of list) {
      const path = trail ? `${trail}/${node.name}` : node.name;
      if (node.type === 'file') out.push({ node, path });
      else if (node.children) walk(node.children, path);
    }
  };
  walk(nodes, '');
  return out;
}

export function cloneTree(nodes: FileNode[]): FileNode[] {
  return nodes.map((node) =>
    node.type === 'folder' ? { ...node, id: uid('dir'), children: cloneTree(node.children ?? []) } : { ...node, id: uid('file') },
  );
}

export function isDescendant(
  nodes: FileNode[],
  maybeAncestorId: string,
  nodeId: string,
): boolean {
  const ancestor = findNode(nodes, maybeAncestorId);
  if (!ancestor?.children) return false;
  return findNode(ancestor.children, nodeId) !== null;
}

export function uniqueName(siblings: FileNode[], desired: string): string {
  const taken = new Set(siblings.map((s) => s.name.toLowerCase()));
  if (!taken.has(desired.toLowerCase())) return desired;
  const dot = desired.lastIndexOf('.');
  const base = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : '';
  for (let i = 1; i < 500; i += 1) {
    const candidate = i === 1 ? `${base} copy${ext}` : `${base} copy ${i}${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
}