function validateCapabilityInput(input) {
  const requiredFields = [
    'name',
    'description',
    'endpoint',
    'method',
    'input_schema',
    'output_schema',
    'auth_type',
    'tags'
  ];

  for (const field of requiredFields) {
    if (typeof input?.[field] === 'undefined' || input[field] === null || input[field] === '') {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }

  if (!['GET', 'POST'].includes(String(input.method).toUpperCase())) {
    const error = new Error('method must be GET or POST');
    error.status = 400;
    throw error;
  }

  if (!['none', 'api_key'].includes(input.auth_type)) {
    const error = new Error('auth_type must be none or api_key');
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(input.tags)) {
    const error = new Error('tags must be an array');
    error.status = 400;
    throw error;
  }

  if (typeof input.cost_class !== 'undefined' && !['free', 'metered', 'paid'].includes(input.cost_class)) {
    const error = new Error('cost_class must be free, metered, or paid');
    error.status = 400;
    throw error;
  }

  if (typeof input.risk_level !== 'undefined' && !['low', 'medium', 'high'].includes(input.risk_level)) {
    const error = new Error('risk_level must be low, medium, or high');
    error.status = 400;
    throw error;
  }

  if (typeof input.execution_mode_default !== 'undefined' && !['full_auto', 'bounded_auto', 'manual'].includes(input.execution_mode_default)) {
    const error = new Error('execution_mode_default must be full_auto, bounded_auto, or manual');
    error.status = 400;
    throw error;
  }
}

function validateExecuteInput(input) {
  if (!input?.capability_id) {
    const error = new Error('capability_id is required');
    error.status = 400;
    throw error;
  }

  if (typeof input.payload === 'undefined') {
    const error = new Error('payload is required');
    error.status = 400;
    throw error;
  }
}

function validateMcpServerInput(input) {
  const requiredFields = ['name', 'description', 'endpoint', 'transport', 'auth_type', 'tags'];
  for (const field of requiredFields) {
    if (typeof input?.[field] === 'undefined' || input[field] === null || input[field] === '') {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }

  if (input.transport !== 'http') {
    const error = new Error('transport must be http');
    error.status = 400;
    throw error;
  }

  if (!['none', 'api_key'].includes(input.auth_type)) {
    const error = new Error('auth_type must be none or api_key');
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(input.tags)) {
    const error = new Error('tags must be an array');
    error.status = 400;
    throw error;
  }
}

function validateTrustUpdateInput(input) {
  if (typeof input !== 'object' || input === null) {
    const error = new Error('request body is required');
    error.status = 400;
    throw error;
  }

  if (
    typeof input.trust_score === 'undefined' &&
    typeof input.is_trusted === 'undefined' &&
    typeof input.allow_sync === 'undefined'
  ) {
    const error = new Error('at least one trust field is required');
    error.status = 400;
    throw error;
  }

  if (typeof input.trust_score !== 'undefined' && (typeof input.trust_score !== 'number' || input.trust_score < 0 || input.trust_score > 1)) {
    const error = new Error('trust_score must be a number between 0 and 1');
    error.status = 400;
    throw error;
  }

  if (typeof input.is_trusted !== 'undefined' && typeof input.is_trusted !== 'boolean') {
    const error = new Error('is_trusted must be boolean');
    error.status = 400;
    throw error;
  }

  if (typeof input.allow_sync !== 'undefined' && typeof input.allow_sync !== 'boolean') {
    const error = new Error('allow_sync must be boolean');
    error.status = 400;
    throw error;
  }
}

module.exports = {
  validateCapabilityInput,
  validateExecuteInput,
  validateMcpServerInput,
  validateTrustUpdateInput
};
