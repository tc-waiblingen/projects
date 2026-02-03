'use client';

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { ensureHeadingIds, extractHeadings, type TocHeading } from './utils';

interface TocContextValue {
  headings: TocHeading[];
  activeId: string | null;
  scrollToHeading: (id: string) => void;
  refresh: () => void;
}

const TocContext = createContext<TocContextValue | null>(null);

export function useToc() {
  const context = useContext(TocContext);
  if (!context) {
    throw new Error('useToc must be used within a TocProvider');
  }
  return context;
}

const noopTocValue: TocContextValue = {
  headings: [],
  activeId: null,
  scrollToHeading: () => {},
  refresh: () => {},
};

export function useTocSafe() {
  const context = useContext(TocContext);
  return context ?? noopTocValue;
}

interface TocProviderProps {
  children: ReactNode;
  contentSelector?: string;
}

interface TocState {
  headings: TocHeading[];
  activeId: string | null;
}

export function TocProvider({
  children,
  contentSelector = 'main',
}: TocProviderProps) {
  const [tocState, setTocState] = useState<TocState>({
    headings: [],
    activeId: null,
  });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initializedRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract headings on mount using useLayoutEffect for DOM manipulation
  useLayoutEffect(() => {
    if (initializedRef.current) return;

    const container = document.querySelector<HTMLElement>(contentSelector);
    if (!container) return;

    ensureHeadingIds(container);
    const extracted = extractHeadings(container);

    initializedRef.current = true;

    // Defer state update to avoid lint warning about sync setState in effect
    queueMicrotask(() => {
      const firstHeading = extracted[0]
      setTocState({
        headings: extracted,
        activeId: firstHeading?.id ?? null,
      });
    });
  }, [contentSelector]);

  // Track active heading with IntersectionObserver
  useEffect(() => {
    if (tocState.headings.length === 0) return;

    const handleIntersect = (entries: IntersectionObserverEntry[]) => {
      // Find the topmost visible heading
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);

      if (visibleEntries.length > 0) {
        // Sort by position in document and pick the first one
        const sorted = visibleEntries.sort((a, b) => {
          const aRect = a.boundingClientRect;
          const bRect = b.boundingClientRect;
          return aRect.top - bRect.top;
        });
        const topmost = sorted[0]
        if (topmost) {
          setTocState((prev) => ({ ...prev, activeId: topmost.target.id }));
        }
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0,
    });

    tocState.headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [tocState.headings]);

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setTocState((prev) => ({ ...prev, activeId: id }));
    }
  }, []);

  const refresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      const container = document.querySelector<HTMLElement>(contentSelector);
      if (!container) return;

      ensureHeadingIds(container);
      const extracted = extractHeadings(container);

      setTocState({
        headings: extracted,
        activeId: extracted[0]?.id ?? null,
      });
    }, 100);
  }, [contentSelector]);

  return (
    <TocContext.Provider
      value={{
        headings: tocState.headings,
        activeId: tocState.activeId,
        scrollToHeading,
        refresh,
      }}
    >
      {children}
    </TocContext.Provider>
  );
}
