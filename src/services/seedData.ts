import type { CollabUser, FileNode, Project } from '@/types';
import { createFileNode, createFolderNode } from '@/utils/fileTree';

const APP_TSX = `import { useState } from "react";
import Header from "./Header";
import Editor from "./Editor";
import "./styles.css";
export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <Header title="My React App" />

      <main className="app__main">
        <h1>Hello World</h1>
        <p>You clicked {count} times.</p>

        <button type="button" onClick={() => setCount((c) => c + 1)}>
          Click me
        </button>

        <Editor value={"const answer = 42;"} language="javascript" />
      </main>
    </div>
  );
}
`;

const HEADER_TSX = `interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="header">
      <span className="header__logo" aria-hidden="true">
        {"</>"}
      </span>

      <div>
        <h2 className="header__title">{title}</h2>
        {subtitle ? <p className="header__subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}
`;

const EDITOR_TSX = `import { useEffect, useRef } from "react";

interface EditorProps {
  value: string;
  language: string;
  onChange?: (next: string) => void;
}

/** A deliberately tiny stand-in for a real code editor. */
export default function Editor({ value, language, onChange }: EditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.value !== value) {
      ref.current.value = value;
    }
  }, [value]);

  return (
    <div className="editor" data-language={language}>
      <textarea
        ref={ref}
        defaultValue={value}
        spellCheck={false}
        aria-label={\`Code editor (\${language})\`}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  );
}
`;

const BUTTON_TSX = `import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", children, ...rest }: ButtonProps) {
  return (
    <button className={\`btn btn--\${variant}\`} {...rest}>
      {children}
    </button>
  );
}
`;

const MODAL_TSX = `import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
`;

const SIDEBAR_TSX = `import { useMemo, useState } from "react";

interface Item {
  id: string;
  label: string;
}

export function Sidebar({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <nav className="sidebar" aria-label="Sections">
      <input
        type="search"
        value={query}
        placeholder="Filter..."
        aria-label="Filter sections"
        onChange={(event) => setQuery(event.target.value)}
      />

      <ul>
        {visible.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </nav>
  );
}
`;

const STYLES_CSS = `:root {
  --brand: #4f8cff;
  --surface: #1e1e2e;
  --text: #e6e6f0;
  --radius: 8px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Inter", system-ui, sans-serif;
  background: var(--surface);
  color: var(--text);
}

.app__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 20px;
}

.btn {
  border: none;
  border-radius: var(--radius);
  padding: 8px 16px;
  font: inherit;
  cursor: pointer;
  background: var(--brand);
  color: white;
}

.btn:hover {
  filter: brightness(1.08);
}

.btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
`;

const GLOBALS_CSS = `@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const PACKAGE_JSON = `{
  "name": "my-react-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
`;

const README_MD = `# My React App

A small sample project that ships with **CodeCollab**.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Structure

| Path | Purpose |
| --- | --- |
| \`src/App.tsx\` | Application shell |
| \`src/Header.tsx\` | Page header |
| \`components/\` | Reusable UI pieces |

> Try opening the command palette with **Ctrl + Shift + P**.
`;

const UTILS_PY = `"""Helper script bundled to show multi-language highlighting."""

from dataclasses import dataclass


@dataclass
class FileStat:
    name: str
    lines: int

    @property
    def is_large(self) -> bool:
        return self.lines > 500


def summarise(stats: list[FileStat]) -> dict[str, int]:
    total = sum(stat.lines for stat in stats)
    return {
        "files": len(stats),
        "lines": total,
        "large": sum(1 for stat in stats if stat.is_large),
    }


if __name__ == "__main__":
    print(summarise([FileStat("App.tsx", 120), FileStat("bundle.js", 900)]))
`;

function withChildren(name: string, children: FileNode[]): FileNode {
  return { ...createFolderNode(name), children };
}

export function createSampleFiles(): FileNode[] {
  return [
    withChildren('src', [
      createFileNode('App.tsx', APP_TSX),
      createFileNode('Header.tsx', HEADER_TSX),
      createFileNode('Editor.tsx', EDITOR_TSX),
      createFileNode('Button.tsx', BUTTON_TSX),
      createFileNode('styles.css', STYLES_CSS),
    ]),
    withChildren('components', [
      createFileNode('Modal.tsx', MODAL_TSX),
      createFileNode('Sidebar.tsx', SIDEBAR_TSX),
    ]),
    withChildren('styles', [createFileNode('globals.css', GLOBALS_CSS)]),
    withChildren('scripts', [createFileNode('utils.py', UTILS_PY)]),
    withChildren('public', [createFileNode('index.html', INDEX_HTML)]),
    createFileNode('package.json', PACKAGE_JSON),
    createFileNode('README.md', README_MD),
  ];
}

const HOUR = 60 * 60 * 1000;

export function createSeedProjects(): Project[] {
  const now = Date.now();

  return [
    {
      id: 'proj_my_react_app',
      name: 'My React App',
      language: 'TypeScript',
      colorIndex: 0,
      files: createSampleFiles(),
      createdAt: now - 72 * HOUR,
      updatedAt: now - 2 * 60 * 1000,
    },
    {
      id: 'proj_portfolio',
      name: 'Portfolio Website',
      language: 'CSS',
      colorIndex: 2,
      files: [
        withChildren('src', [
          createFileNode(
            'index.js',
            `const nav = document.querySelector(".nav");

window.addEventListener("scroll", () => {
  nav.classList.toggle("nav--stuck", window.scrollY > 24);
});
`,
          ),
          createFileNode(
            'theme.css',
            `.nav {
  position: sticky;
  top: 0;
  backdrop-filter: blur(12px);
  transition: box-shadow 160ms ease;
}

.nav--stuck {
  box-shadow: 0 1px 0 rgb(0 0 0 / 0.12);
}
`,
          ),
        ]),
        createFileNode(
          'index.html',
          `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Portfolio</title>
    <link rel="stylesheet" href="/src/theme.css" />
  </head>
  <body>
    <nav class="nav">Portfolio</nav>
  </body>
</html>
`,
        ),
      ],
      createdAt: now - 30 * 24 * HOUR,
      updatedAt: now - 26 * HOUR,
    },
  ];
}

export function createDemoUsers(): CollabUser[] {
  const now = Date.now();
  return [
    {
      id: 'user_you',
      name: 'You',
      initials: 'YO',
      colorIndex: 0,
      status: 'online',
      isLocal: true,
      activeFileId: null,
      isTyping: false,
      lastActiveAt: now,
    },
    {
      id: 'user_alex',
      name: 'Alex',
      initials: 'AL',
      colorIndex: 1,
      status: 'online',
      isLocal: false,
      activeFileId: null,
      isTyping: false,
      lastActiveAt: now,
    },
    {
      id: 'user_sarah',
      name: 'Sarah',
      initials: 'SA',
      colorIndex: 2,
      status: 'online',
      isLocal: false,
      activeFileId: null,
      isTyping: false,
      lastActiveAt: now,
    },
    {
      id: 'user_michael',
      name: 'Michael',
      initials: 'MI',
      colorIndex: 3,
      status: 'idle',
      isLocal: false,
      activeFileId: null,
      isTyping: false,
      lastActiveAt: now - 5 * 60 * 1000,
    },
  ];
}

export const EXTRA_USER_NAMES = ['Priya', 'Daniel', 'Mei', 'Omar', 'Lena', 'Tomas'];