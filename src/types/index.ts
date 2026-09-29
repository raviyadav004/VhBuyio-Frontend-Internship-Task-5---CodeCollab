export type FileNodeType = 'file' | 'folder';

export interface FileNode {
  id: string;
  name: string;
  type: FileNodeType;
  language?: string;
  content?: string;
  children?: FileNode[];
}

export interface Project {
  id: string;
  name: string;
  language: string;
  colorIndex: number;
  files: FileNode[];
  createdAt: number;
  updatedAt: number;
}

export type PresenceStatus = 'online' | 'idle' | 'offline';
export interface CollabUser {
  id: string;
  name: string;
  initials: string;
  colorIndex: number;
  status: PresenceStatus;
  isLocal: boolean;
  activeFileId: string | null;
  isTyping: boolean;
  lastActiveAt: number;
}

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

export interface RemoteCursor {
  userId: string;
  fileId: string;
  position: EditorPosition;
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  updatedAt: number;
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';
export type ActivityKind = | 'join' | 'leave' | 'edit' | 'open' | 'create' | 'delete' | 'rename' | 'save' | 'connection';
export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  userId: string | null;
  message: string;
  timestamp: number;
}

export interface OpenTab {
  fileId: string;
  name: string;
  path: string;
  language: string;
  pinned: boolean;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  bracketPairColorization: boolean;
  fontFamily: string;
}

export type ThemeName = 'dark' | 'light' | 'midnight';
export type SidebarView = 'explorer' | 'collaboration' | 'activity';