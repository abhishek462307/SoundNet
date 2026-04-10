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
  const order = [];

  for (const entry of entries) {
    const identity = normalizeToolIdentity(entry);
    const existing = bestByIdentity.get(identity);
    if (!bestByIdentity.has(identity)) {
      order.push(identity);
    }
    if (!existing || entry.totalScore > existing.totalScore) {
      bestByIdentity.set(identity, entry);
    }
  }

  return order.map((identity) => bestByIdentity.get(identity));
}

module.exports = { dedupeCapabilities };
