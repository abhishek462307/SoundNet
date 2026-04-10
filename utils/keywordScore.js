function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function computeKeywordScore(query, capability) {
  const queryTokens = tokenize(query);
  const haystackTokens = [
    ...tokenize(capability.name),
    ...tokenize(capability.description),
    ...capability.tags.flatMap((tag) => tokenize(tag)),
    ...tokenize(capability.provider),
    ...tokenize(capability.category)
  ];

  const haystackSet = new Set(haystackTokens);
  return queryTokens.reduce((score, token) => score + (haystackSet.has(token) ? 1 : 0), 0);
}

function computeCapabilityRank(query, capability, executionStats = {}) {
  const keywordScore = computeKeywordScore(query, capability);
  const ratingScore = Number(capability.rating || 0);
  const trustBoost = capability.source_type === 'mcp' ? Math.min(ratingScore / 5, 1) : 0.5;
  const freshnessBoost = capability.status === 'active' ? 1 : 0;
  const successBoost = executionStats.successRate == null ? 0 : executionStats.successRate * 3;
  const usageBoost = executionStats.totalRuns ? Math.min(executionStats.totalRuns / 5, 2) : 0;
  const latencyBoost = executionStats.averageLatencyMs == null ? 0 : Math.max(0, 2 - executionStats.averageLatencyMs / 1000);
  const totalScore = keywordScore * 10 + ratingScore + trustBoost + freshnessBoost + successBoost + usageBoost + latencyBoost;

  return {
    keywordScore,
    totalScore
  };
}

module.exports = {
  computeKeywordScore,
  computeCapabilityRank
};
