export interface CollabColor {
  name: string;
  hex: string;
  soft: string;
}

export const COLLAB_COLORS: CollabColor[] = [
  { name: 'Blue', hex: '#3b82f6', soft: 'rgba(59, 130, 246, 0.22)' },
  { name: 'Green', hex: '#22c55e', soft: 'rgba(34, 197, 94, 0.22)' },
  { name: 'Purple', hex: '#a855f7', soft: 'rgba(168, 85, 247, 0.22)' },
  { name: 'Orange', hex: '#f97316', soft: 'rgba(249, 115, 22, 0.22)' },
  { name: 'Pink', hex: '#ec4899', soft: 'rgba(236, 72, 153, 0.22)' },
  { name: 'Teal', hex: '#14b8a6', soft: 'rgba(20, 184, 166, 0.22)' },
];

export function colorFor(index: number): CollabColor {
  return COLLAB_COLORS[((index % COLLAB_COLORS.length) + COLLAB_COLORS.length) % COLLAB_COLORS.length];
}

export const PROJECT_GRADIENTS = [
  'linear-gradient(135deg, #3b82f6, #6366f1)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #22c55e, #14b8a6)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #0ea5e9, #22d3ee)',
  'linear-gradient(135deg, #eab308, #f97316)',
];

export function gradientFor(index: number): string {
  return PROJECT_GRADIENTS[
    ((index % PROJECT_GRADIENTS.length) + PROJECT_GRADIENTS.length) % PROJECT_GRADIENTS.length
  ];
}