const EXTENSION_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  sh: 'shell',
  sql: 'sql',
  txt: 'plaintext',
};

const DISPLAY_NAMES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  html: 'HTML',
  json: 'JSON',
  markdown: 'Markdown',
  python: 'Python',
  yaml: 'YAML',
  xml: 'XML',
  shell: 'Shell',
  sql: 'SQL',
  plaintext: 'Plain Text',
};

export function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx + 1).toLowerCase();
}

export function languageFromFilename(filename: string): string {
  return EXTENSION_MAP[extensionOf(filename)] ?? 'plaintext';
}

export function languageDisplayName(languageId: string): string {
  return DISPLAY_NAMES[languageId] ?? 'Plain Text';
}

export function monacoUriPath(fileId: string, path: string): string {
  const safe = path.replace(/^\/+/, '');
  return `/${fileId}/${safe}`;
}