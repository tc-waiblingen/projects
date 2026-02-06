'use client';

import { useEffect, useRef } from 'react';
import { useToc } from './TocProvider';

interface TocMenuProps {
  onCollapse: () => void;
  autoFocus?: boolean;
}

export function TocMenu({ onCollapse, autoFocus }: TocMenuProps) {
  const { headings, activeId, scrollToHeading } = useToc();
  const navRef = useRef<HTMLElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus and scroll active item into view when menu opens
  useEffect(() => {
    if (activeButtonRef.current) {
      activeButtonRef.current.scrollIntoView({ block: 'nearest' });
      if (autoFocus) {
        activeButtonRef.current.focus();
      }
    }
  }, [autoFocus]);

  // Handle Escape key and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCollapse();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        onCollapse();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCollapse]);

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    scrollToHeading(id);
    // Delay collapse to allow smooth scroll to start
    setTimeout(onCollapse, 300);
  };

  return (
    <nav
      ref={navRef}
      className="max-h-[70vh] min-w-48 overflow-y-auto rounded-lg bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:bg-taupe-900/95"
      onMouseLeave={onCollapse}
      aria-label="Inhaltsverzeichnis"
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-taupe-500 dark:text-taupe-400">
        Inhaltsverzeichnis
      </div>
      <ul className="list-none space-y-1">
        {headings.map((heading) => (
          <li key={heading.id}>
            <button
              ref={heading.id === activeId ? activeButtonRef : undefined}
              onClick={() => handleClick(heading.id)}
              className={`block w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm transition-colors ${heading.level === 3 ? 'pl-5' : 'font-semibold'
                } ${heading.id === activeId
                  ? 'bg-tcw-accent-100 font-semibold text-tcw-accent-900 dark:bg-tcw-accent-900/20 dark:text-tcw-accent-400'
                  : 'text-taupe-700 hover:bg-taupe-100 dark:text-taupe-300 dark:hover:bg-taupe-800'
                }`}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
