import { cn } from '../../src/utils/cn';
import { Check } from 'lucide-react';

// Curated color palette for tags and projects
export const TAG_COLORS = [
  // Row 1: Blues & Purples
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#d946ef', name: 'Fuchsia' },
  // Row 2: Pinks & Reds
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#f59e0b', name: 'Amber' },
  // Row 3: Greens & Teals
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#84cc16', name: 'Lime' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#14b8a6', name: 'Teal' },
  // Row 4: Cyans & Grays
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#64748b', name: 'Slate' },
  { hex: '#78716c', name: 'Stone' },
  { hex: '#737373', name: 'Gray' },
];

interface ColorPaletteProps {
  value: string;
  onChange: (color: string) => void;
  columns?: number;
  className?: string;
}

export function ColorPalette({ value, onChange, columns = 10, className }: ColorPaletteProps) {
  return (
    <div
      className={cn('flex flex-wrap gap-1.5', className)}
      style={{ maxWidth: columns * 28 + (columns - 1) * 6 }} // 24px buttons + 6px gaps
    >
      {TAG_COLORS.map((color) => {
        const isSelected = value.toLowerCase() === color.hex.toLowerCase();
        return (
          <button
            key={color.hex}
            type="button"
            onClick={() => onChange(color.hex)}
            className={cn(
              'w-6 h-6 rounded-md transition-all focus:outline-none flex items-center justify-center',
              'hover:brightness-110',
              isSelected && 'ring-2 ring-foreground/70'
            )}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          >
            {isSelected && (
              <Check className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Get a random color from the palette
export function getRandomTagColor(): string {
  const index = Math.floor(Math.random() * TAG_COLORS.length);
  return TAG_COLORS[index]!.hex;
}

// Get the next color in the palette (for sequential assignment)
export function getNextTagColor(currentColor: string): string {
  const currentIndex = TAG_COLORS.findIndex(c => c.hex === currentColor);
  const nextIndex = (currentIndex + 1) % TAG_COLORS.length;
  return TAG_COLORS[nextIndex]!.hex;
}

// Get the next available color that isn't already used
export function getNextAvailableColor(usedColors: string[]): string {
  const usedSet = new Set(usedColors.map(c => c.toLowerCase()));

  // First, try to find an unused color
  for (const color of TAG_COLORS) {
    if (!usedSet.has(color.hex.toLowerCase())) {
      return color.hex;
    }
  }

  // All colors used - find least used color
  const colorCounts = TAG_COLORS.map(c => ({
    hex: c.hex,
    count: usedColors.filter(u => u.toLowerCase() === c.hex.toLowerCase()).length
  }));
  colorCounts.sort((a, b) => a.count - b.count);
  return colorCounts[0]!.hex;
}
