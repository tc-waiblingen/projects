'use client';

import { useState, useCallback } from 'react';
import { useToc } from './TocProvider';
import { TocLens } from './TocLens';
import { TocMenu } from './TocMenu';
import { TocMobile } from './TocMobile';

export function TableOfContents() {
  const { headings } = useToc();
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoFocusMenu, setAutoFocusMenu] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleExpand = useCallback((viaKeyboard: boolean) => {
    setAutoFocusMenu(viaKeyboard);
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    // Small delay before collapsing to prevent flickering
    setTimeout(() => setIsExpanded(false), 150);
  }, []);

  const handleMobileOpen = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const handleMobileClose = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  // Don't render if no headings
  if (headings.length === 0) return null;

  return (
    <>
      {/* Desktop: Fixed position in right margin, always visible */}
      <div
        className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
      >
        {isExpanded ? (
          <TocMenu onCollapse={handleCollapse} autoFocus={autoFocusMenu} />
        ) : (
          <TocLens onExpand={handleExpand} />
        )}
      </div>

      {/* Mobile: Fixed button in bottom-right corner, always visible */}
      <button
        onClick={handleMobileOpen}
        className="fixed bottom-6 right-4 z-30 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg lg:hidden dark:bg-taupe-900"
        aria-label="Inhaltverzeichnis öffnen"
      >
        <svg
          className="h-5 w-5 text-taupe-700 dark:text-taupe-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      </button>

      {/* Mobile panel */}
      <TocMobile isOpen={isMobileOpen} onClose={handleMobileClose} />
    </>
  );
}
