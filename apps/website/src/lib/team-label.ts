/**
 * Build a dropdown label like "{teamName} ({group})", trimming the longest
 * leading prefix that group shares character-by-character with teamName.
 * If the overlap leaves no remainder, the suffix is omitted.
 */
export function teamLabelWithGroup(
  teamName: string,
  group: string | null | undefined,
): string {
  if (!group) return teamName
  let i = 0
  while (i < teamName.length && i < group.length && teamName[i] === group[i]) i++
  const remainder = group.slice(i).trimStart()
  return remainder ? `${teamName} (${remainder})` : teamName
}
