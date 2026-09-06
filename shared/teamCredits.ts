export function teamNameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function pickReusableTeam<T extends { id: number; name: string; archivedAt?: Date | string | null }>(rows: T[], name: string) {
  const key = teamNameKey(name);
  if (!key) return null;
  return rows
    .filter(row => !row.archivedAt && teamNameKey(row.name) === key)
    .sort((left, right) => left.id - right.id)[0] ?? null;
}

export function groupDuplicateTeamIds<T extends { id: number; name: string; archivedAt?: Date | string | null }>(rows: T[]) {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    if (row.archivedAt) continue;
    const key = teamNameKey(row.name);
    if (!key) continue;
    const ids = groups.get(key) || [];
    ids.push(row.id);
    groups.set(key, ids);
  }
  const duplicates: Array<{ keepId: number; absorbIds: number[] }> = [];
  groups.forEach(ids => {
    if (ids.length < 2) return;
    const keepId = Math.min(...ids);
    duplicates.push({ keepId, absorbIds: ids.filter(id => id !== keepId) });
  });
  return duplicates;
}
