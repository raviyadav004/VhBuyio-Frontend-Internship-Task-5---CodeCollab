import { create } from 'zustand';

interface CursorState {
  line: number;
  column: number;
  selected: number;
  setPosition: (line: number, column: number, selected: number) => void;
  reset: () => void;
}

export const useCursorStore = create<CursorState>((set) => ({
  line: 1,
  column: 1,
  selected: 0,
  setPosition: (line, column, selected) =>
    set((state) =>
      state.line === line && state.column === column && state.selected === selected ? {} : { line, column, selected },
    ),
  reset: () => set({ line: 1, column: 1, selected: 0 }),
}));