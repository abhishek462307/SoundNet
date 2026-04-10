function normalizeToolIdentity(entry) {
  const capability = entry.capability || entry;
  const schemaKeys = Object.keys(capability.input_schema?.properties || {}).sort().join(',');
  const tags = [...(capability.tags || [])].sort().join(',');
  return [
    capability.source_tool_name || capability.name.replace(/^.*__/, ''),
    schemaKeys,
    tags
  ].join('|');
}

function dedupeCapabilities(entries) {
  const bestByIdentity = new Map();

  for (const entry of entries) {
    const identity = normalizeToolIdentity(entry);
    const existing = bestByIdentity.get(identity);
    if (!existing || entry.totalScore > existing.totalScore) {
      bestByIdentity.set(identity, entry);
    }
  }

  return Array.from(bestByIdentity.values()).sort((left, right) => right.totalScore - left.totalScore);
}

module.exports = { dedupeCapabilities };
