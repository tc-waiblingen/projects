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
