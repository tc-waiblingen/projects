export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Generate a URL-friendly slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Remove consecutive hyphens
}

/**
 * Ensure all h2/h3 headings within a container have unique IDs.
 * Injects IDs if missing, handles duplicates by appending numbers.
 */
export function ensureHeadingIds(container: HTMLElement): void {
  const headings = container.querySelectorAll<HTMLHeadingElement>('h2, h3');
  const usedIds = new Set<string>();

  headings.forEach((heading) => {
    if (!heading.id) {
      const baseId = slugify(heading.textContent || 'heading');
      let id = baseId;
      let counter = 1;

      while (usedIds.has(id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }

      heading.id = id;
    }

    usedIds.add(heading.id);
  });
}

/**
 * Extract all h2/h3 headings from a container element.
 * Call ensureHeadingIds first to guarantee all headings have IDs.
 * Excludes headings with data-toc="false".
 */
export function extractHeadings(container: HTMLElement): TocHeading[] {
  const headings = container.querySelectorAll<HTMLHeadingElement>('h2:not([data-toc="false"]), h3:not([data-toc="false"])');
  const result: TocHeading[] = [];

  headings.forEach((heading) => {
    const levelChar = heading.tagName[1]
    if (!levelChar) return
    const level = parseInt(levelChar, 10) as 2 | 3;
    result.push({
      id: heading.id,
      text: heading.textContent?.trim() || '',
      level,
    });
  });

  return result;
}
