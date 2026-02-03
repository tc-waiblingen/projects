'use client';

import { useToc } from './TocProvider';

interface TocLensProps {
  onExpand: (viaKeyboard: boolean) => void;
}

export function TocLens({ onExpand }: TocLensProps) {
  const { headings, activeId } = useToc();

  if (headings.length === 0) return null;

  return (
    <button
      onClick={() => onExpand(true)}
      onMouseEnter={() => onExpand(false)}
      className="flex flex-col items-center gap-1.5 rounded-lg bg-white/90 px-2 py-3 shadow-lg backdrop-blur-sm transition-all hover:bg-white dark:bg-taupe-900/90 dark:hover:bg-taupe-900"
      aria-label="Inhaltsverzeichnis"
    >
      {headings.map((heading) => (
        <span
          key={heading.id}
          className={`block rounded-full transition-all ${heading.level === 2 ? 'h-2 w-2' : 'h-1.5 w-1.5'
            } ${heading.id === activeId
              ? 'bg-tcw-accent-600 scale-125'
              : 'bg-taupe-300 dark:bg-taupe-600'
            }`}
          aria-hidden="true"
        />
      ))}
    </button>
  );
}
