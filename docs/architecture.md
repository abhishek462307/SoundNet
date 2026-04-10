# Sound Net Architecture

Sound Net has three main domains and one cross-cutting analytics layer.

## Capability Domain

Responsible for:

- capability registration
- discovery
- ranking
- execution
- execution logs

Capabilities may come from direct HTTP registration or imported MCP tools.

## MCP Domain

Responsible for:

- MCP server registry
- trust score and sync permissions
- health checks
- tool sync/import
- stale tool handling
- server lifecycle controls

This domain turns external MCP servers into normalized internal capabilities.

## Agent Domain

Responsible for:

- agent registry
- agent discovery
- agent metadata and trust
- inbox-style agent messaging

This is the first step toward an agent-native identity and delegation layer.

## Analytics Domain

Cross-cuts everything and tracks:

- tool usage
- server usage
- success/failure
- latency
- top queries
- top tools
- active vs stale capabilities
