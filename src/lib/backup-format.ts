export type DatabaseSnapshot = {
  version: string;
  tables: Record<string, string>;
  foreignKeys: Array<{ table: string; parent: string }>;
};

export function validateSnapshot(value: unknown): DatabaseSnapshot {
  const data = value as DatabaseSnapshot;
  if (!data || data.version !== "2.0" || !data.tables || typeof data.tables !== "object" || Array.isArray(data.tables) || !Array.isArray(data.foreignKeys)) throw new Error("Only complete version 2.0 snapshots can be restored.");
  for (const [name, json] of Object.entries(data.tables)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || typeof json !== "string" || !Array.isArray(JSON.parse(json))) throw new Error("Invalid table snapshot.");
  }
  for (const edge of data.foreignKeys) if (!Object.hasOwn(data.tables, edge.table) || !Object.hasOwn(data.tables, edge.parent)) throw new Error("Invalid foreign-key metadata.");
  return data;
}

export function restorationOrder(snapshot: DatabaseSnapshot) {
  const pending = new Set(Object.keys(snapshot.tables).filter(name => name !== "_prisma_migrations"));
  const ordered: string[] = [];
  while (pending.size) {
    const ready = [...pending].filter(name => !snapshot.foreignKeys.some(edge => edge.table === name && edge.parent !== name && pending.has(edge.parent)));
    if (!ready.length) throw new Error("Snapshot has circular dependencies; use native PostgreSQL recovery.");
    for (const name of ready) { pending.delete(name); ordered.push(name); }
  }
  return ordered;
}
